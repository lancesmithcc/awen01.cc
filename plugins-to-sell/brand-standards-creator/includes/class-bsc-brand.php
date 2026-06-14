<?php
/**
 * Brand data model. Single brand per site, stored in one option.
 * Structure is intentionally mirrored 1:1 by the JSON export so the
 * option *is* the machine-readable source of truth.
 */

defined( 'ABSPATH' ) || exit;

class BSC_Brand {

	const OPTION = 'bsc_brand';

	public static function defaults() {
		return array(
			'meta'       => array(
				'version'  => 1,
				'updated'  => '',
				'site'     => home_url(),
			),
			'sections'   => array(
				// Optional sections — toggle off to omit from page/PDF/exports.
				'identity' => true,
				'voice'    => true,
				'context'  => true,
			),
			'identity'   => array(
				'name'    => get_bloginfo( 'name' ),
				'tagline' => get_bloginfo( 'description' ),
				'mission' => '',
			),
			'logos'      => array(
				// { id, attachment_id, label, variant: primary|inverse|mark|wordmark|mono,
				//   min_size_px, clearspace, background: light|dark|any, notes }
			),
			'logo_rules' => array(
				'dos'   => array(), // strings
				'donts' => array(),
			),
			'lockups'    => array(
				// { id, attachment_id, label, usage }
			),
			'colors'     => array(
				// { slug, name, hex, role: primary|secondary|accent|neutral|surface|text, usage }
			),
			'typography' => array(
				'fonts' => array(
					// { role: heading|body|mono|accent, family, fallback, source: google|adobe|self|system, weights:[], url }
				),
				'scale' => array(
					'base_px' => 18,
					'ratio'   => 1.25,
					'levels'  => array( 'caption' => -1, 'body' => 0, 'h6' => 1, 'h5' => 1, 'h4' => 2, 'h3' => 3, 'h2' => 4, 'h1' => 5 ),
				),
				'line_height' => array( 'heading' => 1.15, 'body' => 1.6 ),
				'notes'       => '',
			),
			'spacing'    => array(
				'base_px' => 8,
				'scale'   => array( 0.5, 1, 2, 3, 4, 6, 8, 12 ), // multipliers of base
				'notes'   => '',
			),
			'layout'     => array(
				'grid_columns' => 12,
				'gutter_px'    => 24,
				'margin'       => 'clamp(24px, 5vw, 96px)',
				'max_width_px' => 1200,
				'principles'   => array(), // strings — composition rules
			),
			'context'    => array(
				// In Application — stationery, signage, mockups.
				'intro' => '',
				'items' => array(), // { attachment_id, caption }
			),
			'ratios'     => array(
				'layout' => array(), // { label, value } e.g. Golden 1.618
				'image_aspects' => array( '16:9', '4:3', '1:1' ),
			),
			'imagery'    => array(
				'style'   => '',
				'dos'     => array(),
				'donts'   => array(),
				'treatments' => '',
				'examples'   => array(), // attachment IDs
			),
			'tone'       => array(
				'enabled'    => false,
				'attributes' => array(), // e.g. "warm", "direct"
				'guidelines' => '',
				'examples'   => array(), // { do, dont }
			),
			'ai'         => array(
				'text_provider' => 'openrouter',
				'text_model'    => 'deepseek/deepseek-chat-v3',
				'fal_vector_model' => 'fal-ai/recraft/v3/text-to-image',
				'fal_raster_model' => 'fal-ai/gpt-image-1/text-to-image', // swap to gpt-image-2 endpoint when on fal
			),
		);
	}

	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return self::merge( self::defaults(), is_array( $saved ) ? $saved : array() );
	}

	public static function save( $data ) {
		$clean            = self::sanitize( $data );
		$clean['meta']['updated'] = current_time( 'mysql' );
		$clean['meta']['site']    = home_url();
		update_option( self::OPTION, $clean, false );

		do_action( 'bsc_brand_saved', $clean );
		return $clean;
	}

	private static function merge( $defaults, $saved ) {
		foreach ( $defaults as $k => $v ) {
			if ( array_key_exists( $k, $saved ) ) {
				$defaults[ $k ] = ( is_array( $v ) && self::is_assoc( $v ) && is_array( $saved[ $k ] ) )
					? self::merge( $v, $saved[ $k ] )
					: $saved[ $k ];
			}
		}
		return $defaults;
	}

	private static function is_assoc( $arr ) {
		return array() !== $arr && array_keys( $arr ) !== range( 0, count( $arr ) - 1 );
	}

	/**
	 * Recursive sanitize: ints stay ints, floats stay floats, hex colors
	 * validated, everything else through sanitize_text_field / kses for
	 * multiline notes fields.
	 */
	public static function sanitize( $value, $key = '' ) {
		if ( is_array( $value ) ) {
			$out = array();
			foreach ( $value as $k => $v ) {
				$out[ is_string( $k ) ? sanitize_key( $k ) : $k ] = self::sanitize( $v, is_string( $k ) ? $k : $key );
			}
			return $out;
		}
		if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		$value = (string) $value;

		if ( 'hex' === $key ) {
			$hex = sanitize_hex_color( $value );
			return $hex ? $hex : '#000000';
		}
		if ( in_array( $key, array( 'mission', 'notes', 'style', 'guidelines', 'treatments', 'usage' ), true ) ) {
			return sanitize_textarea_field( $value );
		}
		if ( 'url' === $key ) {
			return esc_url_raw( $value );
		}
		return sanitize_text_field( $value );
	}

	/** Resolve attachment IDs to URLs for exports/templates. */
	public static function asset_url( $attachment_id, $size = 'full' ) {
		$url = wp_get_attachment_image_url( (int) $attachment_id, $size );
		return $url ? $url : '';
	}
}
