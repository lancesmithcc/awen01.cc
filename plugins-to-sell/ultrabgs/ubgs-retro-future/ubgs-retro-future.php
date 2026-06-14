<?php
/**
 * Plugin Name: UltraBGs Pack — Retro Future
 * Plugin URI:  https://awen01.cc
 * Description: Eight retro-future animation packs for UltraBGs: Synthwave Grid, Wireframe Mountains, VHS Noise, Arcade Starfield, Chrome Reflections, Microchip Circuitry, Pixel Aurora, and Holographic Sunset. Requires the UltraBGs plugin.
 * Version:     1.3.0
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-retro-future
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_RF_VERSION', '1.3.0' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'synthgrid'    => __( 'Synthwave Grid', 'ubgs-retro-future' ),
		'wiremountain' => __( 'Wireframe Mountains', 'ubgs-retro-future' ),
		'vhsnoise'     => __( 'VHS Noise', 'ubgs-retro-future' ),
		'arcadestars'  => __( 'Arcade Starfield', 'ubgs-retro-future' ),
		'chrome'       => __( 'Chrome Reflections', 'ubgs-retro-future' ),
		'circuitry'    => __( 'Microchip Circuitry', 'ubgs-retro-future' ),
		'pixelaurora'  => __( 'Pixel Aurora', 'ubgs-retro-future' ),
		'holosunset'   => __( 'Holographic Sunset', 'ubgs-retro-future' ),
	);
	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_RF_VERSION,
		);
	}
	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — Retro Future requires the UltraBGs plugin to be installed and active.', 'ubgs-retro-future' );
		echo '</p></div>';
	}
} );
