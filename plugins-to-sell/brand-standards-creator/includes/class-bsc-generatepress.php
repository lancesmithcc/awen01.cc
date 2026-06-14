<?php
/**
 * GeneratePress / GenerateBlocks integration.
 *
 * 1. Pushes brand colors into GP's Global Colors (generate_settings['global_colors']),
 *    which GenerateBlocks reads natively for its color pickers.
 * 2. Pushes heading/body font families into GP typography (GP 3.x font manager).
 * 3. Always emits a token stylesheet (CSS custom properties) so the system
 *    works on any theme and inside GenerateBlocks via var(--bsc-*).
 */

defined( 'ABSPATH' ) || exit;

class BSC_GeneratePress {

	public static function init() {
		add_action( 'bsc_brand_saved', array( __CLASS__, 'sync' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_tokens' ), 5 );
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'enqueue_tokens' ), 5 );
	}

	public static function is_gp_active() {
		return defined( 'GENERATE_VERSION' ) || 'generatepress' === get_template();
	}

	/** Full sync on every brand save. */
	public static function sync( $brand ) {
		self::write_tokens_css( $brand );

		if ( ! self::is_gp_active() ) {
			return;
		}

		$settings = get_option( 'generate_settings', array() );

		// --- Global colors -------------------------------------------------
		$gp_colors = array();
		foreach ( (array) $brand['colors'] as $c ) {
			if ( empty( $c['hex'] ) || empty( $c['slug'] ) ) {
				continue;
			}
			$gp_colors[] = array(
				'name'  => sanitize_key( $c['slug'] ),
				'color' => $c['hex'],
			);
		}
		if ( $gp_colors ) {
			$settings['global_colors'] = $gp_colors;
		}

		// --- Typography (GP 3.x font manager) ------------------------------
		$fonts   = (array) ( $brand['typography']['fonts'] ?? array() );
		$family  = function ( $role ) use ( $fonts ) {
			foreach ( $fonts as $f ) {
				if ( ( $f['role'] ?? '' ) === $role && ! empty( $f['family'] ) ) {
					return $f;
				}
			}
			return null;
		};

		$body    = $family( 'body' );
		$heading = $family( 'heading' );

		$font_manager = array();
		$typography   = array();

		if ( $body ) {
			$font_manager[] = array( 'fontFamily' => $body['family'], 'googleFont' => ( 'google' === ( $body['source'] ?? '' ) ) );
			$typography[]   = array(
				'selector'        => 'body',
				'fontFamily'      => $body['family'],
				'fontSize'        => (int) ( $brand['typography']['scale']['base_px'] ?? 18 ),
				'fontSizeUnit'    => 'px',
				'lineHeight'      => (float) ( $brand['typography']['line_height']['body'] ?? 1.6 ),
				'module'          => 'core',
				'group'           => 'base',
			);
		}
		if ( $heading ) {
			$font_manager[] = array( 'fontFamily' => $heading['family'], 'googleFont' => ( 'google' === ( $heading['source'] ?? '' ) ) );
			$typography[]   = array(
				'selector'   => 'all-headings',
				'fontFamily' => $heading['family'],
				'lineHeight' => (float) ( $brand['typography']['line_height']['heading'] ?? 1.15 ),
				'module'     => 'core',
				'group'      => 'base',
			);
		}

		if ( $font_manager ) {
			// De-dupe against existing entries.
			$existing = isset( $settings['font_manager'] ) ? (array) $settings['font_manager'] : array();
			$names    = wp_list_pluck( $font_manager, 'fontFamily' );
			foreach ( $existing as $e ) {
				if ( ! in_array( $e['fontFamily'] ?? '', $names, true ) ) {
					$font_manager[] = $e;
				}
			}
			$settings['font_manager'] = $font_manager;
		}
		if ( $typography ) {
			$settings['typography'] = $typography;
		}

		update_option( 'generate_settings', $settings );

		// Bust GP dynamic CSS cache.
		delete_option( 'generate_dynamic_css_output' );
		delete_option( 'generate_dynamic_css_cached_version' );

		do_action( 'bsc_after_gp_sync', $brand, $settings );
	}

	/** Write /uploads/brand-standards/tokens.css */
	public static function write_tokens_css( $brand ) {
		$css   = ":root{\n";

		foreach ( (array) $brand['colors'] as $c ) {
			if ( ! empty( $c['slug'] ) && ! empty( $c['hex'] ) ) {
				$css .= sprintf( "  --bsc-color-%s: %s;\n", sanitize_key( $c['slug'] ), $c['hex'] );
			}
		}

		$base  = (float) ( $brand['spacing']['base_px'] ?? 8 );
		foreach ( (array) ( $brand['spacing']['scale'] ?? array() ) as $i => $mult ) {
			$css .= sprintf( "  --bsc-space-%d: %spx;\n", $i + 1, rtrim( rtrim( number_format( $base * (float) $mult, 2, '.', '' ), '0' ), '.' ) );
		}

		$tbase  = (float) ( $brand['typography']['scale']['base_px'] ?? 18 );
		$tratio = (float) ( $brand['typography']['scale']['ratio'] ?? 1.25 );
		foreach ( (array) ( $brand['typography']['scale']['levels'] ?? array() ) as $name => $step ) {
			$size = $tbase * pow( $tratio, (int) $step );
			$css .= sprintf( "  --bsc-font-%s: %srem;\n", sanitize_key( $name ), round( $size / 16, 3 ) );
		}

		foreach ( (array) ( $brand['typography']['fonts'] ?? array() ) as $f ) {
			if ( ! empty( $f['role'] ) && ! empty( $f['family'] ) ) {
				$fallback = ! empty( $f['fallback'] ) ? ', ' . $f['fallback'] : ', sans-serif';
				$css     .= sprintf( "  --bsc-font-family-%s: \"%s\"%s;\n", sanitize_key( $f['role'] ), $f['family'], $fallback );
			}
		}

		$css .= "}\n";

		$css = apply_filters( 'bsc_tokens_css', $css, $brand );

		BSC_Export::ensure_dir();
		file_put_contents( BSC_Export::dir() . '/tokens.css', $css ); // phpcs:ignore
	}

	public static function enqueue_tokens() {
		$file = BSC_Export::dir() . '/tokens.css';
		if ( file_exists( $file ) ) {
			wp_enqueue_style( 'bsc-tokens', BSC_Export::url() . '/tokens.css', array(), (string) filemtime( $file ) );
		}
	}
}
