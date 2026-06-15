<?php
/**
 * Plugin Name: UltraBGs Pack — ASCII Art
 * Plugin URI:  https://awen01.cc
 * Description: Five character-grid ASCII animation packs for UltraBGs: Matrix Rain, ASCII Tunnel, Ripple Field, Text Dissolve, and ASCII Fluid. Requires the UltraBGs plugin.
 * Version:     1.1.0
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-ascii-art
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_ASCII_VERSION', '1.1.0' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'matrixrain'  => __( 'Matrix Rain', 'ubgs-ascii-art' ),
		'asciitunnel' => __( 'ASCII Tunnel', 'ubgs-ascii-art' ),
		'ripplefield' => __( 'Ripple Field', 'ubgs-ascii-art' ),
		'textdissolve'=> __( 'Text Dissolve', 'ubgs-ascii-art' ),
		'asciifluid'  => __( 'ASCII Fluid', 'ubgs-ascii-art' ),
	);
	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_ASCII_VERSION,
		);
	}
	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — ASCII Art requires the UltraBGs plugin to be installed and active.', 'ubgs-ascii-art' );
		echo '</p></div>';
	}
} );
