<?php
/**
 * Plugin Name: UltraBGs Pack — AWEN01
 * Plugin URI:  https://awen01.cc
 * Description: AWEN01-specific UltraBGs packs: smooth aurora borealis and linework node constellations.
 * Version:     1.0.6
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-awen01
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_AWEN01_VERSION', '1.0.6' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'awenaurora' => __( 'AWEN01 Smooth Aurora', 'ubgs-awen01' ),
		'awennodes'  => __( 'AWEN01 Circle Node Lines', 'ubgs-awen01' ),
	);

	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_AWEN01_VERSION,
		);
	}

	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — AWEN01 requires the UltraBGs plugin to be installed and active.', 'ubgs-awen01' );
		echo '</p></div>';
	}
} );
