<?php
/**
 * Plugin Name: UltraBGs Pack — Luxury
 * Plugin URI:  https://awen01.cc
 * Description: Ten refined luxury animation packs for UltraBGs: Flowing Silk, Liquid Gold, Marble Veins, Diamond Refractions, Velvet Waves, Champagne Bubbles, Brushed Metal, Luxury Smoke, Pearl Reflections, and Crystal Prisms. Requires the UltraBGs plugin.
 * Version:     1.0.0
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-luxury
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_LUX_VERSION', '1.0.0' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'silk'      => __( 'Flowing Silk', 'ubgs-luxury' ),
		'liquidgold'=> __( 'Liquid Gold', 'ubgs-luxury' ),
		'marble'    => __( 'Marble Veins', 'ubgs-luxury' ),
		'diamond'   => __( 'Diamond Refractions', 'ubgs-luxury' ),
		'velvet'    => __( 'Velvet Waves', 'ubgs-luxury' ),
		'champagne' => __( 'Champagne Bubbles', 'ubgs-luxury' ),
		'brushed'   => __( 'Brushed Metal', 'ubgs-luxury' ),
		'luxsmoke'  => __( 'Luxury Smoke', 'ubgs-luxury' ),
		'pearl'     => __( 'Pearl Reflections', 'ubgs-luxury' ),
		'crystal'   => __( 'Crystal Prisms', 'ubgs-luxury' ),
	);
	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_LUX_VERSION,
		);
	}
	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — Luxury requires the UltraBGs plugin to be installed and active.', 'ubgs-luxury' );
		echo '</p></div>';
	}
} );
