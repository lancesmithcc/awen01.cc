<?php
/**
 * Plugin Name: UltraBGs Pack — Starfield
 * Description: Drifting parallax starfield with cursor gravity, scroll parallax and tap supernovas. Requires the UltraBGs plugin.
 * Version: 1.0.0
 * Author: AWEN01
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'ultrabgs_packs', function ( $packs ) {
	$packs['starfield'] = array(
		'label'  => __( 'Starfield', 'ubgs-starfield' ),
		'script' => plugins_url( 'js/starfield.js', __FILE__ ),
		'ver'    => '1.0.0',
	);
	return $packs;
} );
