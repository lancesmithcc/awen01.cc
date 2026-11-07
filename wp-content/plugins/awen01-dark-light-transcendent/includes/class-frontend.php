<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AWEN_DLT_Frontend {

	public static function init() {
		add_action( 'wp_head', [ __CLASS__, 'print_inline_css' ], 100 );
		add_action( 'wp_head', [ __CLASS__, 'print_preload_script' ], 1 );
		add_action( 'wp_enqueue_scripts', [ __CLASS__, 'enqueue' ] );
		add_action( 'wp_footer', [ __CLASS__, 'maybe_print_floating_toggle' ] );
		add_filter( 'get_custom_logo', [ __CLASS__, 'inject_mode_logos' ], 20, 2 );
		add_filter( 'generate_logo_output', [ __CLASS__, 'inject_mode_logos' ], 20 );
		add_filter( 'generate_retina_logo_output', [ __CLASS__, 'inject_mode_logos' ], 20 );
		add_filter( 'generate_mobile_header_logo_output', [ __CLASS__, 'inject_mode_logos' ], 20 );
	}

	/**
	 * Add per-mode logo variants (dark, transcendent) alongside the main
	 * (light) logo. Each variant is appended as a sibling <img>; toggle.css
	 * shows the one matching the active data-theme. The wrapper <a> is flagged
	 * with has-dlt-* classes so the light logo is only hidden when a variant
	 * actually exists for that mode.
	 */
	public static function inject_mode_logos( $html ) {
		if ( empty( $html ) || false === stripos( $html, '<img' ) ) {
			return $html;
		}

		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		$variants = [
			'dark'         => isset( $settings['dark_logo'] ) ? (int) $settings['dark_logo'] : 0,
			'transcendent' => isset( $settings['transcendent_logo'] ) ? (int) $settings['transcendent_logo'] : 0,
		];

		$sources = [];
		foreach ( $variants as $mode => $id ) {
			if ( $id ) {
				$src = wp_get_attachment_image_url( $id, 'full' );
				if ( $src ) {
					$sources[ $mode ] = $src;
				}
			}
		}
		if ( empty( $sources ) ) {
			return $html;
		}

		$light_class = 'awen-dlt-logo-light';
		$alt         = esc_attr( get_bloginfo( 'name' ) );

		if ( ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $html;
		}

		$p = new WP_HTML_Tag_Processor( $html );
		if ( ! $p->next_tag( [ 'tag_name' => 'IMG' ] ) ) {
			return $html;
		}
		$p->add_class( $light_class );
		$html = $p->get_updated_html();

		$p2 = new WP_HTML_Tag_Processor( $html );
		$p2->next_tag( [ 'tag_name' => 'IMG' ] );
		$light_w          = $p2->get_attribute( 'width' );
		$light_h          = $p2->get_attribute( 'height' );
		$light_class_attr = (string) $p2->get_attribute( 'class' );

		$variant_html = '';
		foreach ( $sources as $mode => $src ) {
			$variant_class = 'awen-dlt-logo-' . $mode;
			$attrs = [
				'class'    => preg_replace( '/\b' . preg_quote( $light_class, '/' ) . '\b/', $variant_class, $light_class_attr ),
				'src'      => $src,
				'alt'      => $alt,
				'decoding' => 'async',
			];
			if ( $light_w ) { $attrs['width']  = $light_w; }
			if ( $light_h ) { $attrs['height'] = $light_h; }

			$attr_str = '';
			foreach ( $attrs as $k => $v ) {
				$attr_str .= ' ' . $k . '="' . esc_attr( $v ) . '"';
			}
			$variant_html .= '<img' . $attr_str . ' />';
		}

		// Flag the wrapper anchor so light is hidden only where a variant exists.
		$flag = '';
		foreach ( array_keys( $sources ) as $mode ) {
			$flag .= ' has-dlt-' . $mode;
		}
		$pa = new WP_HTML_Tag_Processor( $html );
		if ( $pa->next_tag( [ 'tag_name' => 'A' ] ) ) {
			$pa->add_class( trim( $flag ) );
			$html = $pa->get_updated_html();
		}

		if ( preg_match( '/<\/a>\s*$/i', $html ) ) {
			return preg_replace( '/(<\/a>\s*)$/i', $variant_html . '$1', $html, 1 );
		}
		return $html . $variant_html;
	}

	public static function enqueue() {
		wp_enqueue_style(
			'awen-dlt-toggle',
			AWEN_DLT_URL . 'assets/css/toggle.css',
			[],
			AWEN_DLT_VERSION
		);

		wp_enqueue_script(
			'awen-dlt-wasm',
			AWEN_DLT_URL . 'assets/wasm/dlt_mode.js',
			[],
			AWEN_DLT_VERSION,
			true
		);

		wp_register_script(
			'awen-dlt-toggle',
			AWEN_DLT_URL . 'assets/js/toggle.js',
			[ 'awen-dlt-wasm' ],
			AWEN_DLT_VERSION,
			true
		);

		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		wp_localize_script( 'awen-dlt-toggle', 'awenDltConfig', [
			'defaultMode' => isset( $settings['default_mode'] ) ? $settings['default_mode'] : 'auto',
			'storageKey'  => 'awen-dlt-mode',
			'modes'       => AWEN_DLT_Colors::MODES,
			'wasmUrl'     => AWEN_DLT_URL . 'assets/wasm/dlt_mode_bg.wasm',
		] );

		wp_enqueue_script( 'awen-dlt-toggle' );
	}

	public static function print_preload_script() {
		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		$default  = isset( $settings['default_mode'] ) ? $settings['default_mode'] : 'auto';
		?>
<script id="awen-dlt-preload">(function(){try{var k='awen-dlt-mode',a=['light','dark','transcendent'],s=localStorage.getItem(k),d=<?php echo wp_json_encode( $default ); ?>,m=s||d;if(m==='auto'){m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(a.indexOf(m)===-1){m='dark';}document.documentElement.setAttribute('data-theme',m);document.documentElement.setAttribute('data-awen-color-mode',m);}catch(e){}})();</script>
		<?php
	}

	public static function print_inline_css() {
		$palette = AWEN_DLT_Colors::get_gp_palette();
		if ( empty( $palette ) ) {
			return;
		}

		$mode_vars = [
			'light'        => [],
			'dark'         => [],
			'transcendent' => [],
		];

		foreach ( $palette as $slug => $data ) {
			foreach ( AWEN_DLT_Colors::MODES as $mode ) {
				$color = AWEN_DLT_Colors::resolve_mode_color( $mode, $slug, $data['color'] );

				$mode_vars[ $mode ][] = sprintf( '--wp--preset--color--%s:%s;', $slug, $color );
				$mode_vars[ $mode ][] = sprintf( '--bsc-color-%s:%s;', $slug, $color );
				$mode_vars[ $mode ][] = sprintf( '--%s:%s;', $slug, $color );
			}
		}

		$css  = ':root{' . implode( '', $mode_vars['light'] ) . '}';
		$css .= ':root[data-theme="light"]{' . implode( '', $mode_vars['light'] ) . '}';
		$css .= ':root[data-theme="dark"]{' . implode( '', $mode_vars['dark'] ) . '}';
		$css .= ':root[data-theme="transcendent"]{' . implode( '', $mode_vars['transcendent'] ) . '}';
		$css .= ':root[data-theme="dark"] img,:root[data-theme="dark"] video,:root[data-theme="transcendent"] img,:root[data-theme="transcendent"] video{filter:none}';
		$css .= ':root{color-scheme:light}:root[data-theme="dark"]{color-scheme:dark}:root[data-theme="transcendent"]{color-scheme:light}';

		printf(
			"<style id='awen-dlt-vars'>%s</style>\n",
			wp_strip_all_tags( $css )
		);
	}

	public static function maybe_print_floating_toggle() {
		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		$pos      = isset( $settings['toggle_position'] ) ? $settings['toggle_position'] : 'none';
		if ( 'none' === $pos ) {
			return;
		}
		$html = AWEN_DLT_Plugin::toggle_shortcode( [] );
		printf(
			'<div class="awen-dlt-float awen-dlt-float--%s">%s</div>',
			esc_attr( $pos ),
			$html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		);
	}
}
