<?php
/**
 * REST endpoints. All routes require manage_options + nonce.
 * API keys never leave the server; AI providers are called via proxy.
 */

defined( 'ABSPATH' ) || exit;

class BSC_Rest {

	const NS = 'bsc/v1';

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function can() {
		return current_user_can( 'manage_options' );
	}

	public static function routes() {
		register_rest_route( self::NS, '/brand', array(
			array(
				'methods'             => 'GET',
				'permission_callback' => array( __CLASS__, 'can' ),
				'callback'            => function () {
					return rest_ensure_response( array(
						'brand' => BSC_Brand::get(),
						'keys'  => BSC_Keys::status(),
					) );
				},
			),
			array(
				'methods'             => 'POST',
				'permission_callback' => array( __CLASS__, 'can' ),
				'callback'            => function ( WP_REST_Request $req ) {
					$brand = BSC_Brand::save( (array) $req->get_param( 'brand' ) );
					BSC_Export::write_all( $brand );
					return rest_ensure_response( array( 'ok' => true, 'brand' => $brand ) );
				},
			),
		) );

		register_rest_route( self::NS, '/keys', array(
			'methods'             => 'POST',
			'permission_callback' => array( __CLASS__, 'can' ),
			'callback'            => function ( WP_REST_Request $req ) {
				foreach ( (array) $req->get_param( 'keys' ) as $service => $value ) {
					BSC_Keys::set( sanitize_key( $service ), (string) $value );
				}
				return rest_ensure_response( array( 'ok' => true, 'status' => BSC_Keys::status() ) );
			},
		) );

		register_rest_route( self::NS, '/extrapolate', array(
			'methods'             => 'POST',
			'permission_callback' => array( __CLASS__, 'can' ),
			'callback'            => function ( WP_REST_Request $req ) {
				return rest_ensure_response( BSC_Extrapolate::run( (array) $req->get_params() ) );
			},
		) );

		register_rest_route( self::NS, '/ai/text', array(
			'methods'             => 'POST',
			'permission_callback' => array( __CLASS__, 'can' ),
			'callback'            => array( __CLASS__, 'ai_text' ),
		) );

		register_rest_route( self::NS, '/ai/image', array(
			'methods'             => 'POST',
			'permission_callback' => array( __CLASS__, 'can' ),
			'callback'            => array( __CLASS__, 'ai_image' ),
		) );
	}

	/* ---------------------------------------------------------------------
	 * Text generation proxy — OpenAI-compatible chat completions for all
	 * three providers; only base URL + model differ.
	 * ------------------------------------------------------------------- */

	private static function text_endpoints() {
		return apply_filters( 'bsc_text_endpoints', array(
			'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
			'deepseek'   => 'https://api.deepseek.com/chat/completions',
			'minimax'    => 'https://api.minimax.io/v1/text/chatcompletion_v2',
		) );
	}

	public static function ai_text( WP_REST_Request $req ) {
		$provider = sanitize_key( $req->get_param( 'provider' ) ?: 'openrouter' );
		$model    = sanitize_text_field( $req->get_param( 'model' ) ?: '' );
		$prompt   = (string) $req->get_param( 'prompt' );
		$system   = (string) ( $req->get_param( 'system' ) ?: 'You are a senior brand strategist. Respond with concise, production-ready brand guideline copy. No preamble.' );

		$endpoints = self::text_endpoints();
		if ( empty( $endpoints[ $provider ] ) ) {
			return new WP_Error( 'bsc_provider', 'Unknown provider.', array( 'status' => 400 ) );
		}
		$key = BSC_Keys::get( $provider );
		if ( ! $key ) {
			return new WP_Error( 'bsc_no_key', sprintf( 'No API key saved for %s.', $provider ), array( 'status' => 400 ) );
		}

		$body = array(
			'model'    => $model,
			'messages' => array(
				array( 'role' => 'system', 'content' => $system ),
				array( 'role' => 'user', 'content' => $prompt ),
			),
			'max_tokens' => 2000,
		);

		$headers = array(
			'Authorization' => 'Bearer ' . $key,
			'Content-Type'  => 'application/json',
		);
		if ( 'openrouter' === $provider ) {
			$headers['HTTP-Referer'] = home_url();
			$headers['X-Title']      = get_bloginfo( 'name' ) . ' — BrandBoss';
		}

		$res = wp_remote_post( $endpoints[ $provider ], array(
			'timeout' => 90,
			'headers' => $headers,
			'body'    => wp_json_encode( $body ),
		) );

		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$json = json_decode( wp_remote_retrieve_body( $res ), true );
		$text = $json['choices'][0]['message']['content'] ?? null;

		if ( null === $text ) {
			return new WP_Error( 'bsc_ai', 'Provider returned no content.', array( 'status' => 502, 'detail' => $json ) );
		}
		return rest_ensure_response( array( 'text' => $text ) );
	}

	/* ---------------------------------------------------------------------
	 * Image generation via fal.ai (Recraft for vector/SVG, GPT-Image for
	 * raster). Result is sideloaded into the Media Library and returned as
	 * an attachment so it can be attached to logos/lockups/imagery directly.
	 * ------------------------------------------------------------------- */

	public static function ai_image( WP_REST_Request $req ) {
		$key = BSC_Keys::get( 'fal' );
		if ( ! $key ) {
			return new WP_Error( 'bsc_no_key', 'No fal.ai API key saved.', array( 'status' => 400 ) );
		}

		$brand  = BSC_Brand::get();
		$kind   = 'vector' === $req->get_param( 'kind' ) ? 'vector' : 'raster';
		$model  = sanitize_text_field( $req->get_param( 'model' ) ?: (
			'vector' === $kind ? $brand['ai']['fal_vector_model'] : $brand['ai']['fal_raster_model']
		) );
		$prompt = (string) $req->get_param( 'prompt' );

		$input = array( 'prompt' => $prompt );
		if ( 'vector' === $kind ) {
			$input['style'] = sanitize_text_field( $req->get_param( 'style' ) ?: 'vector_illustration' );
		}
		$size = sanitize_text_field( $req->get_param( 'image_size' ) ?: '' );
		if ( $size ) {
			$input['image_size'] = $size;
		}
		$input = apply_filters( 'bsc_fal_input', $input, $model, $req );

		// fal synchronous run endpoint.
		$res = wp_remote_post( 'https://fal.run/' . ltrim( $model, '/' ), array(
			'timeout' => 180,
			'headers' => array(
				'Authorization' => 'Key ' . $key,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( $input ),
		) );

		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$json = json_decode( wp_remote_retrieve_body( $res ), true );
		$url  = $json['images'][0]['url'] ?? ( $json['image']['url'] ?? null );

		if ( ! $url ) {
			return new WP_Error( 'bsc_fal', 'fal.ai returned no image.', array( 'status' => 502, 'detail' => $json ) );
		}

		// Sideload into Media Library.
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$attachment_id = media_sideload_image( $url, 0, 'BSC AI asset: ' . wp_trim_words( $prompt, 8, '' ), 'id' );
		if ( is_wp_error( $attachment_id ) ) {
			// Still return the remote URL so nothing is lost.
			return rest_ensure_response( array( 'url' => $url, 'attachment_id' => 0 ) );
		}

		return rest_ensure_response( array(
			'url'           => wp_get_attachment_url( $attachment_id ),
			'attachment_id' => $attachment_id,
		) );
	}
}
