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
		add_filter( 'get_custom_logo', [ __CLASS__, 'inject_dark_logo' ], 20, 2 );
		add_filter( 'generate_logo_output', [ __CLASS__, 'inject_dark_logo' ], 20 );
		add_filter( 'generate_retina_logo_output', [ __CLASS__, 'inject_dark_logo' ], 20 );
		add_filter( 'generate_mobile_header_logo_output', [ __CLASS__, 'inject_dark_logo' ], 20 );
	}

	public static function inject_dark_logo( $html ) {
		if ( empty( $html ) || false === stripos( $html, '<img' ) ) {
			return $html;
		}

		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		$dark_id  = isset( $settings['dark_logo'] ) ? (int) $settings['dark_logo'] : 0;
		if ( ! $dark_id ) {
			return $html;
		}

		$dark_src = wp_get_attachment_image_url( $dark_id, 'full' );
		if ( ! $dark_src ) {
			return $html;
		}

		$light_class = 'awen-dlt-logo-light';
		$dark_class  = 'awen-dlt-logo-dark';
		$alt         = esc_attr( get_bloginfo( 'name' ) );

		$dark_img_html = '';
		$light_img_html = '';

		if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$p = new WP_HTML_Tag_Processor( $html );
			if ( $p->next_tag( [ 'tag_name' => 'IMG' ] ) ) {
				$p->add_class( $light_class );
				$html = $p->get_updated_html();

				$p2 = new WP_HTML_Tag_Processor( $html );
				$p2->next_tag( [ 'tag_name' => 'IMG' ] );
				$light_src    = $p2->get_attribute( 'src' );
				$light_srcset = $p2->get_attribute( 'srcset' );
				$light_sizes  = $p2->get_attribute( 'sizes' );
				$light_w      = $p2->get_attribute( 'width' );
				$light_h      = $p2->get_attribute( 'height' );
				$light_class_attr = $p2->get_attribute( 'class' );

				$dark_attrs = [
					'class'    => preg_replace( '/\b' . preg_quote( $light_class, '/' ) . '\b/', $dark_class, (string) $light_class_attr ),
					'src'      => $dark_src,
					'alt'      => $alt,
					'decoding' => 'async',
				];
				if ( $light_w ) { $dark_attrs['width']  = $light_w; }
				if ( $light_h ) { $dark_attrs['height'] = $light_h; }

				$attr_str = '';
				foreach ( $dark_attrs as $k => $v ) {
					$attr_str .= ' ' . $k . '="' . esc_attr( $v ) . '"';
				}
				$dark_img_html = '<img' . $attr_str . ' />';
			}
		} else {
			$html = preg_replace( '/(<img\b[^>]*\bclass=")/i', '$1' . $light_class . ' ', $html, 1 );
			$dark_img_html = sprintf(
				'<img class="custom-logo %s" src="%s" alt="%s" decoding="async" />',
				esc_attr( $dark_class ),
				esc_url( $dark_src ),
				$alt
			);
		}

		if ( ! $dark_img_html ) {
			return $html;
		}

		if ( preg_match( '/<\/a>\s*$/i', $html ) ) {
			return preg_replace( '/(<\/a>\s*)$/i', $dark_img_html . '$1', $html, 1 );
		}
		return $html . $dark_img_html;
	}

	public static function enqueue() {
		wp_enqueue_style(
			'awen-dlt-toggle',
			AWEN_DLT_URL . 'assets/css/toggle.css',
			[],
			AWEN_DLT_VERSION
		);

		wp_register_script(
			'awen-dlt-toggle',
			AWEN_DLT_URL . 'assets/js/toggle.js',
			[],
			AWEN_DLT_VERSION,
			true
		);

		$settings = get_option( AWEN_DLT_SETTINGS, [] );
		wp_localize_script( 'awen-dlt-toggle', 'awenDltConfig', [
			'defaultMode' => isset( $settings['default_mode'] ) ? $settings['default_mode'] : 'auto',
			'storageKey'  => 'awen-dlt-mode',
			'modes'       => AWEN_DLT_Colors::MODES,
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
