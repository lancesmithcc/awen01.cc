<?php
/**
 * Plugin Name:       UltraBGs
 * Plugin URI:        https://awen01.cc
 * Description:       Motion, hover, scroll and tap responsive animated background layers for single blocks or the whole page. Extensible animation pack architecture.
 * Version:           1.1.5
 * Author:      AWEN01
 * Author URI:  https://awen01.cc
 * License:           GPL-2.0-or-later
 * Text Domain:       ultrabgs
 * Requires at least: 6.2
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'ULTRABGS_VERSION', '1.1.5' );
define( 'ULTRABGS_URL', plugin_dir_url( __FILE__ ) );
define( 'ULTRABGS_PATH', plugin_dir_path( __FILE__ ) );

require_once ULTRABGS_PATH . 'includes/admin-settings.php';
require_once ULTRABGS_PATH . 'includes/admin-contributors.php';

/**
 * ------------------------------------------------------------------
 * Pack registry
 * ------------------------------------------------------------------
 * Add-on plugins register packs via the `ultrabgs_packs` filter:
 *
 *   add_filter( 'ultrabgs_packs', function ( $packs ) {
 *       $packs['my-pack'] = array(
 *           'label'  => 'My Pack',
 *           'script' => plugins_url( 'js/my-pack.js', __FILE__ ),
 *           'ver'    => '1.0.0',
 *       );
 *       return $packs;
 *   } );
 *
 * The script must call UltraBGs.registerPack() — see DEVELOPERS.md.
 */
function ultrabgs_get_packs() {
	$base = ULTRABGS_URL . 'assets/js/packs/';
	$core = array(
		'lowpoly'  => array( 'label' => __( 'Low Poly Node Morph', 'ultrabgs' ), 'script' => $base . 'lowpoly.js',  'ver' => ULTRABGS_VERSION ),
		'halftone' => array( 'label' => __( 'Halftone Dots', 'ultrabgs' ),       'script' => $base . 'halftone.js', 'ver' => ULTRABGS_VERSION ),
		'aurora'   => array( 'label' => __( 'Aurora Borealis', 'ultrabgs' ),     'script' => $base . 'aurora.js',   'ver' => ULTRABGS_VERSION ),
		'smoke'    => array( 'label' => __( 'Smoky Clouds', 'ultrabgs' ),        'script' => $base . 'smoke.js',    'ver' => ULTRABGS_VERSION ),
		'hexcubes' => array( 'label' => __( 'Hexagonal Cubes', 'ultrabgs' ),     'script' => $base . 'hexcubes.js', 'ver' => ULTRABGS_VERSION ),
	);
	return apply_filters( 'ultrabgs_packs', $core );
}

function ultrabgs_default_settings() {
	return array(
		'enabled' => 0,
		'pack'    => 'aurora',
		'color1'  => '#1a6e5a',
		'color2'  => '#3fb6a8',
		'color3'  => '#7c4dff',
		'opacity' => 0.85,
		'speed'   => 1.0,
		'density' => 1.0,
		'zindex'  => -1,
	);
}

function ultrabgs_get_settings() {
	$saved = get_option( 'ultrabgs_settings', array() );
	return wp_parse_args( is_array( $saved ) ? $saved : array(), ultrabgs_default_settings() );
}

/**
 * ------------------------------------------------------------------
 * Asset registration
 * ------------------------------------------------------------------
 */
function ultrabgs_register_assets() {
	wp_register_style( 'ultrabgs', ULTRABGS_URL . 'assets/css/ultrabgs.css', array(), ULTRABGS_VERSION );
	wp_register_script( 'ultrabgs-engine', ULTRABGS_URL . 'assets/js/engine.js', array(), ULTRABGS_VERSION, true );

	foreach ( ultrabgs_get_packs() as $id => $pack ) {
		wp_register_script( 'ultrabgs-pack-' . $id, $pack['script'], array( 'ultrabgs-engine' ), $pack['ver'], true );
	}
}
add_action( 'wp_enqueue_scripts', 'ultrabgs_register_assets', 5 );
add_action( 'enqueue_block_editor_assets', 'ultrabgs_register_assets', 5 );

function ultrabgs_enqueue_all_packs() {
	wp_enqueue_style( 'ultrabgs' );
	wp_enqueue_script( 'ultrabgs-engine' );
	foreach ( array_keys( ultrabgs_get_packs() ) as $id ) {
		wp_enqueue_script( 'ultrabgs-pack-' . $id );
	}
}

/**
 * Frontend: enqueue when a block on the page uses UltraBGs, or when
 * the global full-page layer is enabled.
 */
function ultrabgs_maybe_enqueue_frontend() {
	$settings = ultrabgs_get_settings();
	$global_on = ! empty( $settings['enabled'] );

	$post = get_post();
	$block_use = $post && has_blocks( $post )
		&& false !== strpos( (string) $post->post_content, 'data-ultrabgs' );

	if ( $global_on || $block_use ) {
		ultrabgs_enqueue_all_packs();
		wp_localize_script( 'ultrabgs-engine', 'UltraBGsGlobal', array(
			'enabled' => $global_on ? 1 : 0,
			'pack'    => $settings['pack'],
			'config'  => array(
				'colors'  => array( $settings['color1'], $settings['color2'], $settings['color3'] ),
				'opacity' => (float) $settings['opacity'],
				'speed'   => (float) $settings['speed'],
				'density' => (float) $settings['density'],
				'zIndex'  => (int) $settings['zindex'],
			),
		) );
	}
}
add_action( 'wp_enqueue_scripts', 'ultrabgs_maybe_enqueue_frontend', 20 );

/**
 * ------------------------------------------------------------------
 * Block editor integration
 * ------------------------------------------------------------------
 */
function ultrabgs_enqueue_editor() {
	ultrabgs_enqueue_all_packs();

	wp_enqueue_script(
		'ultrabgs-editor',
		ULTRABGS_URL . 'assets/js/editor.js',
		array( 'wp-hooks', 'wp-compose', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n', 'ultrabgs-engine' ),
		ULTRABGS_VERSION,
		true
	);

	$packs = array();
	foreach ( ultrabgs_get_packs() as $id => $pack ) {
		$packs[] = array( 'value' => $id, 'label' => $pack['label'] );
	}
	wp_localize_script( 'ultrabgs-editor', 'UltraBGsEditor', array(
		'packs'    => $packs,
		'defaults' => ultrabgs_default_settings(),
	) );
}
add_action( 'enqueue_block_editor_assets', 'ultrabgs_enqueue_editor', 20 );

/**
 * Dynamic blocks don't keep saved extraProps, so mirror the attributes
 * onto the rendered wrapper here as a safety net.
 */
function ultrabgs_render_block( $content, $block ) {
	if ( empty( $block['attrs']['ultrabgsEnabled'] ) || empty( $block['attrs']['ultrabgsPack'] ) ) {
		return $content;
	}
	if ( false !== strpos( $content, 'data-ultrabgs=' ) ) {
		return $content; // Static save already added it.
	}
	$attrs  = $block['attrs'];

	$colors = array();
	if ( ! empty( $attrs['ultrabgsColors'] ) && is_array( $attrs['ultrabgsColors'] ) ) {
		foreach ( array_slice( $attrs['ultrabgsColors'], 0, 8 ) as $c ) {
			$hex = sanitize_hex_color( is_string( $c ) ? $c : '' );
			if ( $hex ) {
				$colors[] = $hex;
			}
		}
	}

	$config = wp_json_encode( array(
		'colors'  => $colors,
		'opacity' => isset( $attrs['ultrabgsOpacity'] ) ? min( 1, max( 0, (float) $attrs['ultrabgsOpacity'] ) ) : 0.85,
		'speed'   => isset( $attrs['ultrabgsSpeed'] ) ? min( 3, max( 0.1, (float) $attrs['ultrabgsSpeed'] ) ) : 1.0,
		'density' => isset( $attrs['ultrabgsDensity'] ) ? min( 2, max( 0.3, (float) $attrs['ultrabgsDensity'] ) ) : 1.0,
		'zIndex'  => isset( $attrs['ultrabgsZIndex'] ) ? max( -100, min( 100, (int) $attrs['ultrabgsZIndex'] ) ) : -1,
	) );

	$tags = new WP_HTML_Tag_Processor( $content );
	if ( $tags->next_tag() ) {
		$tags->set_attribute( 'data-ultrabgs', sanitize_key( $attrs['ultrabgsPack'] ) );
		$tags->set_attribute( 'data-ubgs-config', $config );
		return $tags->get_updated_html();
	}
	return $content;
}
add_filter( 'render_block', 'ultrabgs_render_block', 10, 2 );

/**
 * Full-page layer container.
 */
function ultrabgs_body_open() {
	$settings = ultrabgs_get_settings();
	if ( empty( $settings['enabled'] ) ) {
		return;
	}
	echo '<div id="ultrabgs-page-layer" aria-hidden="true"></div>';
}
add_action( 'wp_body_open', 'ultrabgs_body_open' );
