<?php
/**
 * Seed AWEN01 brand standards, GeneratePress settings, and starter pages.
 *
 * Usage inside WP-CLI:
 * wp eval-file /var/www/project/scripts/seed-awen01-brand.php -- /var/www/project/brand/awen01-brand.json /var/www/project/brand/home.html /var/www/project/logo.png
 */

defined( 'ABSPATH' ) || exit;

$brand_file = $args[0] ?? '';
$home_file  = $args[1] ?? '';
$logo_file  = $args[2] ?? '';

if ( ! $brand_file || ! file_exists( $brand_file ) ) {
	WP_CLI::error( 'Brand JSON file missing.' );
}

$brand = json_decode( file_get_contents( $brand_file ), true );
if ( ! is_array( $brand ) ) {
	WP_CLI::error( 'Brand JSON could not be decoded.' );
}

update_option( 'blogname', 'AWEN01.cc' );
update_option( 'blogdescription', 'Old wisdom for the coming world.' );
update_option( 'timezone_string', 'America/Vancouver' );
update_option( 'permalink_structure', '/%postname%/' );

if ( wp_get_theme( 'awen01-generatepress-child' )->exists() ) {
	switch_theme( 'awen01-generatepress-child' );
}

$logo_id = 0;
if ( $logo_file && file_exists( $logo_file ) ) {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'title'          => 'AWEN01 Logo',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);

	if ( $existing ) {
		$logo_id = (int) $existing[0];
	} else {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$upload = wp_upload_bits( 'awen01-logo.png', null, file_get_contents( $logo_file ) );
		if ( empty( $upload['error'] ) ) {
			$filetype = wp_check_filetype( $upload['file'], null );
			$logo_id  = wp_insert_attachment(
				array(
					'post_mime_type' => $filetype['type'],
					'post_title'     => 'AWEN01 Logo',
					'post_content'   => '',
					'post_status'    => 'inherit',
				),
				$upload['file']
			);
			$metadata = wp_generate_attachment_metadata( $logo_id, $upload['file'] );
			wp_update_attachment_metadata( $logo_id, $metadata );
		}
	}
}

if ( $logo_id ) {
	$brand['logos'] = array(
		array(
			'id'            => 'awen01-primary',
			'attachment_id' => $logo_id,
			'label'         => 'AWEN01.cc primary sigil',
			'variant'       => 'primary',
			'min_size_px'   => 72,
			'clearspace'    => 'Use the inner glyph height as minimum clearspace on every side.',
			'background'    => 'any',
			'notes'         => 'Use as a ceremonial sigil. Keep the mark crisp, centered, and unaltered.',
		),
	);
	set_theme_mod( 'custom_logo', $logo_id );
}

if ( class_exists( 'BSC_Brand' ) ) {
	$saved = BSC_Brand::save( $brand );
	if ( class_exists( 'BSC_Export' ) ) {
		BSC_Export::write_all( $saved );
		BSC_Export::ensure_guide_page();
	}
	WP_CLI::log( 'Brand Standards Creator seeded.' );
} else {
	update_option( 'bsc_brand', $brand, false );
	WP_CLI::warning( 'Brand Standards Creator classes were unavailable. Stored bsc_brand option only.' );
}

$home_content = file_exists( $home_file ) ? file_get_contents( $home_file ) : '';
if ( $home_content ) {
	$home = get_page_by_path( 'home' );
	$postarr = array(
		'post_title'   => 'Home',
		'post_name'    => 'home',
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_content' => wp_slash( $home_content ),
	);

	if ( $home ) {
		$postarr['ID'] = $home->ID;
		$home_id = wp_update_post( $postarr, true );
	} else {
		$home_id = wp_insert_post( $postarr, true );
	}

	if ( is_wp_error( $home_id ) ) {
		WP_CLI::warning( $home_id->get_error_message() );
	} else {
		update_post_meta( (int) $home_id, '_generate-disable-headline', 'true' );
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', (int) $home_id );
	}
}

$settings = get_option( 'generate_settings', array() );
$settings = is_array( $settings ) ? $settings : array();
$settings['global_colors'] = array_map(
	function ( $color ) {
		return array(
			'name'  => $color['name'] ?? $color['slug'],
			'slug'  => $color['slug'],
			'color' => $color['hex'],
		);
	},
	$brand['colors']
);
$settings['container_width'] = 1180;
$settings['body_font_weight'] = '300';
$settings['heading_font_weight'] = '700';
$settings['nav_font_weight'] = '700';
$settings['font_manager'] = array(
	array(
		'fontFamily' => 'Jost',
		'googleFont' => true,
	),
);
update_option( 'generate_settings', $settings );

$awen_dlt_modes = array(
	'light' => array(
		'labradorite-ink'   => '#30383a',
		'black-opal'        => '#3f4648',
		'deep-green'        => '#5f7f75',
		'aurora-teal'       => '#8fded8',
		'aurora-blue'       => '#aecbff',
		'opal-violet'       => '#d7ccff',
		'moon-white'        => '#ffffff',
		'lavender-opal'     => '#eeeaff',
		'rose-mist'         => '#fde4f1',
		'pastel-moss'       => '#e0f4df',
		'threshold-grey'    => '#d9dcda',
		'mist-slate'        => '#687278',
		'muted-labradorite' => '#6d948b',
		'muted-lavender'    => '#b9b0d2',
		'ink-text'          => '#30383a',
	),
	'dark' => array(
		'labradorite-ink'   => '#050b0a',
		'black-opal'        => '#0d1114',
		'deep-green'        => '#0a211b',
		'aurora-teal'       => '#36d6c7',
		'aurora-blue'       => '#6b9cff',
		'opal-violet'       => '#a98bff',
		'moon-white'        => '#f7f8fb',
		'lavender-opal'     => '#d8ceff',
		'rose-mist'         => '#f2bfd8',
		'pastel-moss'       => '#b9e2bf',
		'threshold-grey'    => '#7c8385',
		'mist-slate'        => '#c2cdd1',
		'muted-labradorite' => '#5fb6a7',
		'muted-lavender'    => '#b5aad2',
		'ink-text'          => '#f7f8fb',
	),
	'transcendent' => array(
		'labradorite-ink'   => '#5d6664',
		'black-opal'        => '#4d5457',
		'deep-green'        => '#647a72',
		'aurora-teal'       => '#86bcb5',
		'aurora-blue'       => '#99acc7',
		'opal-violet'       => '#b3abc9',
		'moon-white'        => '#ecefed',
		'lavender-opal'     => '#d8d5e5',
		'rose-mist'         => '#e2cbd6',
		'pastel-moss'       => '#d3e0d2',
		'threshold-grey'    => '#9da3a2',
		'mist-slate'        => '#687174',
		'muted-labradorite' => '#6f9188',
		'muted-lavender'    => '#aaa3bb',
		'ink-text'          => '#263033',
	),
);
update_option( 'awen_dlt_mode_colors', $awen_dlt_modes, false );
update_option(
	'awen_dlt_settings',
	array(
		'toggle_position' => 'bottom-right',
		'default_mode'    => 'dark',
		'respect_os'      => 1,
		'dark_logo'       => 0,
	),
	false
);

flush_rewrite_rules();

WP_CLI::success( 'AWEN01 local site seeded.' );
