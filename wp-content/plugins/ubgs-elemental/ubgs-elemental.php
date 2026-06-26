<?php
/**
 * Plugin Name: UltraBGs Pack — Elemental
 * Plugin URI:  https://awen01.cc
 * Description: Four realistic elemental animation packs for UltraBGs: Earth (disturbed dirt), Clouds (wispy, dissipating), Fire (rising flame), and Water (caustic ripples). Requires the UltraBGs plugin.
 * Version:     1.3.2
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-elemental
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_ELEM_VERSION', '1.3.2' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'earth'  => __( 'Earth — Dirt', 'ubgs-elemental' ),
		'clouds' => __( 'Air — Wispy Clouds', 'ubgs-elemental' ),
		'fire'   => __( 'Fire — Flame', 'ubgs-elemental' ),
		'water'  => __( 'Water — Ripples', 'ubgs-elemental' ),
	);
	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_ELEM_VERSION,
		);
	}
	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — Elemental requires the UltraBGs plugin to be installed and active.', 'ubgs-elemental' );
		echo '</p></div>';
	}
} );
