<?php
/**
 * Plugin Name: UltraBGs Pack — Sonic
 * Plugin URI:  https://awen01.cc
 * Description: Six sound-reactive animation packs for UltraBGs: Waveform, Spectrum Bars, Guitar Strings, Harp Strings, Cymatic Plate, and Cymatic Rings. Requires the UltraBGs plugin.
 * Version:     1.1.0
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:     GPL-2.0-or-later
 * Text Domain: ubgs-sonic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'UBGS_SONIC_VERSION', '1.1.0' );

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$base = plugins_url( 'js/', __FILE__ );
	$defs = array(
		'waveform'   => __( 'Waveform', 'ubgs-sonic' ),
		'spectrum'   => __( 'Spectrum Bars', 'ubgs-sonic' ),
		'guitar'     => __( 'Guitar Strings', 'ubgs-sonic' ),
		'harp'       => __( 'Harp Strings', 'ubgs-sonic' ),
		'cymaticplate'=> __( 'Cymatic Plate', 'ubgs-sonic' ),
		'cymaticrings'=> __( 'Cymatic Rings', 'ubgs-sonic' ),
	);
	foreach ( $defs as $id => $label ) {
		$packs[ $id ] = array(
			'label'  => $label,
			'script' => $base . $id . '.js',
			'ver'    => UBGS_SONIC_VERSION,
		);
	}
	return $packs;
} );

add_action( 'admin_notices', function () {
	if ( ! function_exists( 'ultrabgs_get_packs' ) ) {
		echo '<div class="notice notice-warning"><p>';
		esc_html_e( 'UltraBGs Pack — Sonic requires the UltraBGs plugin to be installed and active.', 'ubgs-sonic' );
		echo '</p></div>';
	}
} );
