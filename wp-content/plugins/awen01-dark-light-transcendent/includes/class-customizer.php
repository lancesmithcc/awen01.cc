<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AWEN_DLT_Customizer {

	public static function init() {
		add_action( 'customize_register', [ __CLASS__, 'register' ] );
		add_action( 'customize_controls_enqueue_scripts', [ __CLASS__, 'enqueue' ] );
	}

	public static function register( $wp_customize ) {
		$wp_customize->add_panel( 'awen_dlt_panel', [
			'title'       => __( 'Awen01 Dark Light Transcendent', 'awen01-dlt' ),
			'description' => __( 'Three editable AWEN01 mode palettes for GeneratePress, GenerateBlocks, and Brand Standards Creator tokens.', 'awen01-dlt' ),
			'priority'    => 40,
		] );

		foreach ( [ 'light' => __( 'Light Mode Colors', 'awen01-dlt' ), 'dark' => __( 'Dark Mode Colors', 'awen01-dlt' ), 'transcendent' => __( 'Transcendent Mode Colors', 'awen01-dlt' ) ] as $mode => $title ) {
			$wp_customize->add_section( 'awen_dlt_' . $mode . '_colors_section', [
				'title' => $title,
				'panel' => 'awen_dlt_panel',
			] );
		}

		$wp_customize->add_section( 'awen_dlt_behavior_section', [
			'title' => __( 'Behavior', 'awen01-dlt' ),
			'panel' => 'awen_dlt_panel',
		] );

		$palette = AWEN_DLT_Colors::get_gp_palette();
		$saved   = AWEN_DLT_Colors::get_mode_overrides();

		foreach ( AWEN_DLT_Colors::MODES as $mode ) {
			foreach ( $palette as $slug => $data ) {
				$setting_id = 'awen_dlt_mode_colors[' . $mode . '][' . $slug . ']';
				$control_id = 'awen_dlt_' . $mode . '_control_' . $slug;

				$wp_customize->add_setting( $setting_id, [
					'type'              => 'option',
					'default'           => isset( $saved[ $mode ][ $slug ] ) ? $saved[ $mode ][ $slug ] : '',
					'transport'         => 'refresh',
					'sanitize_callback' => [ __CLASS__, 'sanitize_hex_blank' ],
				] );

				$wp_customize->add_control(
					new WP_Customize_Color_Control( $wp_customize, $control_id, [
						'section'     => 'awen_dlt_' . $mode . '_colors_section',
						'settings'    => $setting_id,
						'label'       => sprintf(
							/* translators: 1: mode label, 2: light color name */
							__( '%1$s · %2$s', 'awen01-dlt' ),
							ucfirst( $mode ),
							$data['name']
						),
						'description' => sprintf(
							/* translators: 1: color name, 2: hex value */
							__( 'Light reference for %1$s: %2$s. Leave blank to use the AWEN fallback.', 'awen01-dlt' ),
							$data['name'],
							$data['color']
						),
					] )
				);
			}
		}

		$wp_customize->add_setting( 'awen_dlt_settings[dark_logo]', [
			'type'              => 'option',
			'default'           => 0,
			'transport'         => 'refresh',
			'sanitize_callback' => 'absint',
		] );
		$wp_customize->add_control(
			new WP_Customize_Media_Control( $wp_customize, 'awen_dlt_dark_logo', [
				'section'     => 'title_tagline',
				'settings'    => 'awen_dlt_settings[dark_logo]',
				'label'       => __( 'Dark mode logo', 'awen01-dlt' ),
				'description' => __( 'Optional. Shown when site is in dark mode. Leave blank to reuse the main logo.', 'awen01-dlt' ),
				'mime_type'   => 'image',
				'priority'    => 9,
			] )
		);

		$wp_customize->add_setting( 'awen_dlt_settings[default_mode]', [
			'type'              => 'option',
			'default'           => 'auto',
			'transport'         => 'refresh',
			'sanitize_callback' => [ __CLASS__, 'sanitize_mode' ],
		] );
		$wp_customize->add_control( 'awen_dlt_settings[default_mode]', [
			'section' => 'awen_dlt_behavior_section',
			'label'   => __( 'Default mode', 'awen01-dlt' ),
			'type'    => 'select',
			'choices' => [
				'auto'  => __( 'Auto (follow OS)', 'awen01-dlt' ),
				'light' => __( 'Light', 'awen01-dlt' ),
				'dark'  => __( 'Dark', 'awen01-dlt' ),
				'transcendent' => __( 'Transcendent', 'awen01-dlt' ),
			],
		] );

		$wp_customize->add_setting( 'awen_dlt_settings[toggle_position]', [
			'type'              => 'option',
			'default'           => 'none',
			'transport'         => 'refresh',
			'sanitize_callback' => [ __CLASS__, 'sanitize_position' ],
		] );
		$wp_customize->add_control( 'awen_dlt_settings[toggle_position]', [
			'section' => 'awen_dlt_behavior_section',
			'label'   => __( 'Floating toggle', 'awen01-dlt' ),
			'type'    => 'select',
			'choices' => [
				'none'         => __( 'None (use shortcode/block)', 'awen01-dlt' ),
				'top-right'    => __( 'Top right', 'awen01-dlt' ),
				'top-left'     => __( 'Top left', 'awen01-dlt' ),
				'bottom-right' => __( 'Bottom right', 'awen01-dlt' ),
				'bottom-left'  => __( 'Bottom left', 'awen01-dlt' ),
			],
		] );
	}

	public static function sanitize_hex_blank( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return '';
		}
		return sanitize_hex_color( $value );
	}

	public static function sanitize_mode( $value ) {
		return in_array( $value, [ 'auto', 'light', 'dark', 'transcendent' ], true ) ? $value : 'dark';
	}

	public static function sanitize_position( $value ) {
		$allowed = [ 'none', 'top-right', 'top-left', 'bottom-right', 'bottom-left' ];
		return in_array( $value, $allowed, true ) ? $value : 'none';
	}

	public static function enqueue() {
		wp_enqueue_script(
			'awen-dlt-customizer',
			AWEN_DLT_URL . 'assets/js/customizer.js',
			[ 'customize-controls', 'jquery' ],
			AWEN_DLT_VERSION,
			true
		);

		wp_enqueue_style(
			'awen-dlt-editor',
			AWEN_DLT_URL . 'assets/css/editor.css',
			[],
			AWEN_DLT_VERSION
		);

		$palette = AWEN_DLT_Colors::get_gp_palette();
		$lights  = [];
		foreach ( $palette as $slug => $data ) {
			$lights[ $slug ] = [
				'name'  => $data['name'],
				'color' => $data['color'],
			];
		}
		wp_localize_script( 'awen-dlt-customizer', 'awenDltLights', [
			'palette' => $lights,
			'modes'   => [ 'dark', 'transcendent' ],
		] );
	}
}
