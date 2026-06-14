<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class AWEN_DLT_Plugin {

	public static function boot() {
		load_plugin_textdomain( 'awen01-dlt', false, dirname( plugin_basename( AWEN_DLT_FILE ) ) . '/languages' );

		AWEN_DLT_Customizer::init();
		AWEN_DLT_Frontend::init();

		add_shortcode( 'awen_dlt_toggle', [ __CLASS__, 'toggle_shortcode' ] );
		add_action( 'init', [ __CLASS__, 'register_block' ] );
	}

	public static function on_activate() {
		if ( false === get_option( AWEN_DLT_OPTION ) ) {
			add_option( AWEN_DLT_OPTION, AWEN_DLT_Colors::default_schemes() );
		}
		if ( false === get_option( AWEN_DLT_SETTINGS ) ) {
			add_option( AWEN_DLT_SETTINGS, [
				'toggle_position' => 'none',
				'default_mode'    => 'dark',
				'respect_os'      => 1,
				'dark_logo'       => 0,
			] );
		}
	}

	public static function toggle_shortcode( $atts ) {
		$atts = shortcode_atts( [
			'label_light'        => __( 'Light', 'awen01-dlt' ),
			'label_dark'         => __( 'Dark', 'awen01-dlt' ),
			'label_transcendent' => __( 'Transcendent', 'awen01-dlt' ),
		], $atts, 'awen_dlt_toggle' );

		ob_start();
		?>
		<button type="button" class="awen-dlt-toggle" aria-label="<?php esc_attr_e( 'Cycle color mode', 'awen01-dlt' ); ?>" data-awen-dlt-toggle>
			<span class="awen-dlt-toggle__icon" aria-hidden="true">
				<svg class="awen-dlt-toggle__sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
				<svg class="awen-dlt-toggle__moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
				<svg class="awen-dlt-toggle__portal" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 2.6 3 13.4 0 16M12 4c-3 2.6-3 13.4 0 16"/></svg>
			</span>
			<span class="awen-dlt-toggle__label awen-dlt-toggle__label--light"><?php echo esc_html( $atts['label_light'] ); ?></span>
			<span class="awen-dlt-toggle__label awen-dlt-toggle__label--dark"><?php echo esc_html( $atts['label_dark'] ); ?></span>
			<span class="awen-dlt-toggle__label awen-dlt-toggle__label--transcendent"><?php echo esc_html( $atts['label_transcendent'] ); ?></span>
		</button>
		<?php
		return trim( ob_get_clean() );
	}

	public static function register_block() {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}
		register_block_type( 'awen01-dlt/toggle', [
			'api_version'     => 2,
			'title'           => __( 'Awen01 Dark Light Transcendent Toggle', 'awen01-dlt' ),
			'category'        => 'widgets',
			'icon'            => 'art',
			'render_callback' => [ __CLASS__, 'toggle_shortcode' ],
		] );
	}
}
