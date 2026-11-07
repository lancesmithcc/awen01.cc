<?php
/**
 * Plugin Name:       Cyclical Dynamic Palettes
 * Plugin URI:        https://awen01.cc/
 * Description:        Swap GeneratePress & GenerateBlocks global color palettes automatically by date, season, holiday, and/or time of day, with priority + layered overlap handling.
 * Version:           1.2.2
 * Author:            AWEN01.cc
 * Author URI:        https://awen01.cc/
 * License:           GPL-2.0-or-later
 * Requires at least: 5.3
 * Requires PHP:      7.2
 * Text Domain:       cyclical-dynamic-palettes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CYDP_OPT', 'cydp_settings' );
define( 'CYDP_VER', '1.2.2' );

add_action(
	'init',
	function () {
		load_plugin_textdomain( 'cyclical-dynamic-palettes', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	}
);

/* =========================================================================
 * Palette sources (GeneratePress + GenerateBlocks) — the "sync" surface
 * ====================================================================== */

/** GeneratePress global colors: generate_settings → global_colors. */
function cydp_get_gp_colors() {
	$settings = get_option( 'generate_settings', array() );
	$out      = array();
	if ( isset( $settings['global_colors'] ) && is_array( $settings['global_colors'] ) ) {
		foreach ( $settings['global_colors'] as $c ) {
			if ( empty( $c['slug'] ) ) {
				continue;
			}
			$slug = preg_replace( '/[^a-z0-9\-_]/i', '', $c['slug'] );
			if ( '' === $slug ) {
				continue;
			}
			$out[] = array(
				'name'   => isset( $c['name'] ) && '' !== $c['name'] ? $c['name'] : $slug,
				'slug'   => $slug,
				'color'  => isset( $c['color'] ) ? $c['color'] : '',
				'source' => 'GeneratePress',
			);
		}
	}
	return $out;
}

/**
 * GenerateBlocks global colors (when GB stores its own, e.g. standalone use).
 * Defensive: GB's schema has shifted across versions, so we probe the likely
 * keys and degrade gracefully. In a GP stack GB reuses GP's variables, so this
 * is usually empty and the GP colors above already cover GB blocks.
 */
function cydp_get_gb_colors() {
	$gb  = get_option( 'generateblocks', array() );
	$out = array();
	if ( ! is_array( $gb ) ) {
		return $out;
	}
	$list = array();
	foreach ( array( 'global_colors', 'globalColors', 'colors' ) as $k ) {
		if ( isset( $gb[ $k ] ) && is_array( $gb[ $k ] ) ) {
			$list = $gb[ $k ];
			break;
		}
	}
	foreach ( $list as $c ) {
		if ( ! is_array( $c ) ) {
			continue;
		}
		$color = isset( $c['color'] ) ? $c['color'] : '';
		if ( '' === $color ) {
			continue;
		}
		$slug = '';
		if ( ! empty( $c['slug'] ) ) {
			$slug = $c['slug'];
		} elseif ( ! empty( $c['name'] ) ) {
			$slug = sanitize_title( $c['name'] );
		}
		$slug = preg_replace( '/[^a-z0-9\-_]/i', '', $slug );
		if ( '' === $slug ) {
			continue;
		}
		$out[] = array(
			'name'   => ! empty( $c['name'] ) ? $c['name'] : $slug,
			'slug'   => $slug,
			'color'  => $color,
			'source' => 'GenerateBlocks',
		);
	}
	return $out;
}

/** Merged, de-duplicated palette (GP first, then GB-only slugs). */
function cydp_get_palette() {
	$seen = array();
	$out  = array();
	foreach ( array_merge( cydp_get_gp_colors(), cydp_get_gb_colors() ) as $c ) {
		if ( isset( $seen[ $c['slug'] ] ) ) {
			continue;
		}
		$seen[ $c['slug'] ] = true;
		$out[]              = $c;
	}
	return $out;
}

/* =========================================================================
 * Settings storage
 * ====================================================================== */

function cydp_get_settings() {
	$defaults = array(
		'enabled'      => true,
		'time_source'  => 'site',  // site | visitor
		'overlap_mode' => 'top',   // top | merge
		'awen_dlt'     => array(
			'enabled'   => true,
			'priority'  => 10,
			'exclusive' => false,
		),
		'rules'        => array(),
	);
	$s = get_option( CYDP_OPT, array() );
	if ( ! is_array( $s ) ) {
		$s = array();
	}
	$s = array_merge( $defaults, $s );
	if ( ! is_array( $s['rules'] ) ) {
		$s['rules'] = array();
	}
	if ( empty( $s['awen_dlt'] ) || ! is_array( $s['awen_dlt'] ) ) {
		$s['awen_dlt'] = array();
	}
	$s['awen_dlt'] = array_merge( $defaults['awen_dlt'], $s['awen_dlt'] );
	$s['awen_dlt']['enabled']   = ! empty( $s['awen_dlt']['enabled'] );
	$s['awen_dlt']['priority']  = cydp_sanitize_priority( isset( $s['awen_dlt']['priority'] ) ? $s['awen_dlt']['priority'] : 10 );
	$s['awen_dlt']['exclusive'] = ! empty( $s['awen_dlt']['exclusive'] );
	return $s;
}

/* =========================================================================
 * Sanitization
 * ====================================================================== */

function cydp_sanitize_hex( $hex ) {
	$hex = is_string( $hex ) ? trim( $hex ) : '';
	if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $hex ) ) {
		return strtolower( $hex );
	}
	if ( preg_match( '/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i', $hex ) ) {
		return $hex;
	}
	return '';
}

function cydp_sanitize_date( $d ) {
	$d = is_string( $d ) ? trim( $d ) : '';
	if ( ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m ) ) {
		return '';
	}
	return checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ? $d : '';
}

function cydp_sanitize_time( $t ) {
	$t = is_string( $t ) ? trim( $t ) : '';
	return preg_match( '/^([01][0-9]|2[0-3]):[0-5][0-9]$/', $t ) ? $t : '';
}

function cydp_sanitize_priority( $priority, $default = 10 ) {
	$priority = is_numeric( $priority ) ? (int) $priority : (int) $default;
	if ( $priority < 0 ) {
		return 0;
	}
	if ( $priority > 9999 ) {
		return 9999;
	}
	return $priority;
}

/** One CSS custom-property value, with injection guards. */
function cydp_sanitize_var_value( $v ) {
	$v = is_string( $v ) ? trim( $v ) : '';
	if ( '' === $v || strlen( $v ) > 120 ) {
		return '';
	}
	if ( preg_match( '/[;{}<>]/', $v ) ) {
		return '';
	}
	if ( false !== strpos( $v, '/*' ) || false !== stripos( $v, 'expression' )
		|| false !== stripos( $v, 'javascript:' ) || false !== stripos( $v, 'url(' ) ) {
		return '';
	}
	// hex, rgb(a), hsl(a), var(), named colors, modern slash syntax.
	if ( preg_match( '~^[#a-z0-9_\-.,()%/ ]+$~i', $v ) ) {
		return $v;
	}
	return '';
}

/** Parse a textarea of "--name: value;" lines into a name(no --) => value map. */
function cydp_parse_vars( $text ) {
	$out   = array();
	$lines = preg_split( '/[\r\n]+/', (string) $text );
	foreach ( $lines as $line ) {
		$line = trim( rtrim( trim( $line ), ';' ) );
		if ( '' === $line ) {
			continue;
		}
		$parts = explode( ':', $line, 2 );
		if ( count( $parts ) < 2 ) {
			continue;
		}
		$name = trim( $parts[0] );
		$val  = cydp_sanitize_var_value( $parts[1] );
		if ( ! preg_match( '/^--[a-z0-9_-]+$/i', $name ) || '' === $val ) {
			continue;
		}
		$out[ substr( $name, 2 ) ] = $val;
	}
	return $out;
}

function cydp_sanitize_rule( $r ) {
	if ( ! is_array( $r ) ) {
		$r = array();
	}

	$date_mode = isset( $r['date']['mode'] ) ? $r['date']['mode'] : 'none';
	if ( ! in_array( $date_mode, array( 'none', 'single', 'range' ), true ) ) {
		$date_mode = 'none';
	}
	$time_mode = isset( $r['time']['mode'] ) ? $r['time']['mode'] : 'none';
	if ( ! in_array( $time_mode, array( 'none', 'window' ), true ) ) {
		$time_mode = 'none';
	}

	$colors = array();
	if ( isset( $r['colors'] ) && is_array( $r['colors'] ) ) {
		foreach ( $r['colors'] as $slug => $hex ) {
			$slug = preg_replace( '/[^a-z0-9\-_]/i', '', (string) $slug );
			$hex  = cydp_sanitize_hex( $hex );
			if ( '' !== $slug && '' !== $hex ) {
				$colors[ $slug ] = $hex;
			}
		}
	}

	$priority = cydp_sanitize_priority( isset( $r['priority'] ) ? $r['priority'] : 10 );

	return array(
		'name'      => isset( $r['name'] ) ? sanitize_text_field( wp_strip_all_tags( (string) $r['name'] ) ) : '',
		'enabled'   => ! empty( $r['enabled'] ),
		'priority'  => $priority,
		'exclusive' => ! empty( $r['exclusive'] ),
		'date'      => array(
			'mode'   => $date_mode,
			'yearly' => ! empty( $r['date']['yearly'] ),
			'start'  => cydp_sanitize_date( isset( $r['date']['start'] ) ? $r['date']['start'] : '' ),
			'end'    => cydp_sanitize_date( isset( $r['date']['end'] ) ? $r['date']['end'] : '' ),
		),
		'time'      => array(
			'mode'  => $time_mode,
			'start' => cydp_sanitize_time( isset( $r['time']['start'] ) ? $r['time']['start'] : '' ),
			'end'   => cydp_sanitize_time( isset( $r['time']['end'] ) ? $r['time']['end'] : '' ),
		),
		'colors'    => $colors,
		'vars'      => cydp_parse_vars( isset( $r['vars'] ) ? $r['vars'] : '' ),
	);
}

/* =========================================================================
 * Resolution (server-side; mirrored in JS)
 * ====================================================================== */

function cydp_date_match( $rule, $today_full, $today_md ) {
	$d    = isset( $rule['date'] ) ? $rule['date'] : array();
	$mode = isset( $d['mode'] ) ? $d['mode'] : 'none';
	if ( 'none' === $mode || '' === $mode ) {
		return true;
	}
	$yearly = ! empty( $d['yearly'] );
	$start  = isset( $d['start'] ) ? $d['start'] : '';
	$end    = isset( $d['end'] ) ? $d['end'] : '';

	if ( 'single' === $mode ) {
		if ( '' === $start ) {
			return false;
		}
		return $yearly ? ( substr( $start, 5 ) === $today_md ) : ( $start === $today_full );
	}
	if ( 'range' === $mode ) {
		if ( '' === $start || '' === $end ) {
			return false;
		}
		if ( $yearly ) {
			$s = substr( $start, 5 );
			$e = substr( $end, 5 );
			$t = $today_md;
			return ( $s <= $e ) ? ( $t >= $s && $t <= $e ) : ( $t >= $s || $t <= $e );
		}
		return ( $today_full >= $start && $today_full <= $end );
	}
	return true;
}

function cydp_time_match( $rule, $now_hm ) {
	$t    = isset( $rule['time'] ) ? $rule['time'] : array();
	$mode = isset( $t['mode'] ) ? $t['mode'] : 'none';
	if ( 'none' === $mode || '' === $mode ) {
		return true;
	}
	$s = isset( $t['start'] ) ? $t['start'] : '';
	$e = isset( $t['end'] ) ? $t['end'] : '';
	if ( '' === $s || '' === $e ) {
		return true;
	}
	return ( $s <= $e ) ? ( $now_hm >= $s && $now_hm < $e ) : ( $now_hm >= $s || $now_hm < $e );
}

/** A rule's flat variable map: color slugs + custom vars (key has no leading --). */
function cydp_rule_map( $rule ) {
	$map = array();
	if ( ! empty( $rule['colors'] ) && is_array( $rule['colors'] ) ) {
		foreach ( $rule['colors'] as $slug => $hex ) {
			$slug = preg_replace( '/[^a-z0-9\-_]/i', '', (string) $slug );
			$hex  = cydp_sanitize_hex( $hex );
			if ( '' !== $slug && '' !== $hex ) {
				$map[ $slug ] = $hex;
			}
		}
	}
	if ( ! empty( $rule['vars'] ) && is_array( $rule['vars'] ) ) {
		foreach ( $rule['vars'] as $name => $val ) {
			$name = preg_replace( '/[^a-z0-9\-_]/i', '', (string) $name );
			$val  = cydp_sanitize_var_value( $val );
			if ( '' !== $name && '' !== $val ) {
				$map[ $name ] = $val;
			}
		}
	}
	return $map;
}

/**
 * The set of variable names the plugin is permitted to emit:
 * current GeneratePress/GenerateBlocks global-color slugs, PLUS any variable
 * the user explicitly typed into a rule's "extra CSS variables" field.
 * Anything else (e.g. an orphaned slug from a deleted/renamed global color)
 * is dropped, so the plugin can only ever touch real global colors.
 *
 * 'enforce' is false when no global palette can be read, in which case we do
 * not filter (avoids wiping overrides if the palette is momentarily empty).
 */
function cydp_allowed_keys( $settings ) {
	$keys = array();
	foreach ( cydp_get_palette() as $c ) {
		$keys[ $c['slug'] ] = true;
	}
	$enforce = ! empty( $keys );

	foreach ( $settings['rules'] as $r ) {
		if ( empty( $r['enabled'] ) || empty( $r['vars'] ) || ! is_array( $r['vars'] ) ) {
			continue;
		}
		foreach ( array_keys( $r['vars'] ) as $k ) {
			$keys[ $k ] = true; // explicit opt-in always allowed
		}
	}
	return array( 'keys' => $keys, 'enforce' => $enforce );
}

/** Drop any map entry whose variable is not an allowed global color / opted-in var. */
function cydp_filter_map( $map, $allowed ) {
	if ( empty( $allowed['enforce'] ) ) {
		return $map;
	}
	$out = array();
	foreach ( $map as $k => $v ) {
		if ( isset( $allowed['keys'][ $k ] ) ) {
			$out[ $k ] = $v;
		}
	}
	return $out;
}

function cydp_palette_slug_set() {
	$slugs = array();
	foreach ( cydp_get_palette() as $c ) {
		$slugs[ $c['slug'] ] = true;
	}
	return $slugs;
}

function cydp_css_decls( $map ) {
	if ( empty( $map ) || ! is_array( $map ) ) {
		return '';
	}
	$palette_slugs = cydp_palette_slug_set();
	$decls         = '';
	foreach ( $map as $key => $val ) {
		$key = preg_replace( '/[^a-z0-9\-_]/i', '', (string) $key );
		$val = cydp_sanitize_var_value( $val );
		if ( '' === $key || '' === $val ) {
			continue;
		}
		$decls .= '--' . $key . ':' . $val . ';';
		if ( isset( $palette_slugs[ $key ] ) ) {
			$decls .= '--wp--preset--color--' . $key . ':' . $val . ';';
			$decls .= '--bsc-color-' . $key . ':' . $val . ';';
		}
	}
	return $decls;
}

function cydp_awen_dlt_available() {
	return class_exists( 'AWEN_DLT_Colors' )
		&& method_exists( 'AWEN_DLT_Colors', 'get_gp_palette' )
		&& method_exists( 'AWEN_DLT_Colors', 'resolve_mode_color' );
}

function cydp_awen_dlt_modes() {
	if ( cydp_awen_dlt_available() && defined( 'AWEN_DLT_Colors::MODES' ) ) {
		$modes = AWEN_DLT_Colors::MODES;
	} else {
		$modes = array( 'light', 'dark', 'transcendent' );
	}
	$out = array();
	foreach ( $modes as $mode ) {
		$mode = sanitize_key( $mode );
		if ( '' !== $mode ) {
			$out[] = $mode;
		}
	}
	return ! empty( $out ) ? $out : array( 'light', 'dark', 'transcendent' );
}

function cydp_awen_dlt_default_mode() {
	$settings = defined( 'AWEN_DLT_SETTINGS' ) ? get_option( AWEN_DLT_SETTINGS, array() ) : array();
	$default  = is_array( $settings ) && ! empty( $settings['default_mode'] ) ? sanitize_key( $settings['default_mode'] ) : 'dark';
	if ( 'auto' === $default ) {
		return 'dark';
	}
	return in_array( $default, cydp_awen_dlt_modes(), true ) ? $default : 'dark';
}

function cydp_awen_dlt_map( $mode ) {
	if ( ! cydp_awen_dlt_available() ) {
		return array();
	}
	$mode    = method_exists( 'AWEN_DLT_Colors', 'sanitize_mode' ) ? AWEN_DLT_Colors::sanitize_mode( $mode ) : sanitize_key( $mode );
	$palette = AWEN_DLT_Colors::get_gp_palette();
	$map     = array();
	if ( empty( $palette ) || ! is_array( $palette ) ) {
		return $map;
	}
	foreach ( $palette as $slug => $data ) {
		$slug  = preg_replace( '/[^a-z0-9\-_]/i', '', (string) $slug );
		$light = isset( $data['color'] ) ? $data['color'] : '';
		$color = AWEN_DLT_Colors::resolve_mode_color( $mode, $slug, $light );
		$color = cydp_sanitize_hex( $color );
		if ( '' !== $slug && '' !== $color ) {
			$map[ $slug ] = $color;
		}
	}
	return $map;
}

function cydp_awen_dlt_rule( $settings, $mode = null ) {
	if ( empty( $settings['awen_dlt']['enabled'] ) || ! cydp_awen_dlt_available() ) {
		return null;
	}
	$mode = null === $mode ? cydp_awen_dlt_default_mode() : $mode;
	$map  = cydp_awen_dlt_map( $mode );
	if ( empty( $map ) ) {
		return null;
	}
	return array(
		'name'      => sprintf(
			/* translators: %s: active color mode name. */
			__( 'Light/Dark/Transcendent style (%s)', 'cyclical-dynamic-palettes' ),
			$mode
		),
		'enabled'   => true,
		'priority'  => cydp_sanitize_priority( isset( $settings['awen_dlt']['priority'] ) ? $settings['awen_dlt']['priority'] : 10 ),
		'exclusive' => ! empty( $settings['awen_dlt']['exclusive'] ),
		'date'      => array( 'mode' => 'none' ),
		'time'      => array( 'mode' => 'none' ),
		'colors'    => $map,
		'vars'      => array(),
	);
}

function cydp_resolve_result( $settings, $awen_dlt_mode = null ) {
	$today_full = wp_date( 'Y-m-d' );
	$today_md   = wp_date( 'm-d' );
	$now_hm     = wp_date( 'H:i' );

	$matches = array();
	$i       = 0;
	foreach ( $settings['rules'] as $rule ) {
		if ( ! empty( $rule['enabled'] )
			&& cydp_date_match( $rule, $today_full, $today_md )
			&& cydp_time_match( $rule, $now_hm ) ) {
			$matches[] = array( 'i' => $i, 'rule' => $rule );
		}
		$i++;
	}
	$awen_dlt_rule = cydp_awen_dlt_rule( $settings, $awen_dlt_mode );
	if ( $awen_dlt_rule ) {
		$matches[] = array( 'i' => $i, 'rule' => $awen_dlt_rule );
	}
	if ( empty( $matches ) ) {
		return array( 'map' => array(), 'rules' => array() );
	}

	$allowed = cydp_allowed_keys( $settings );

	// Sort by priority desc, then original index asc (stable tiebreak).
	usort(
		$matches,
		function ( $a, $b ) {
			$pa = (int) $a['rule']['priority'];
			$pb = (int) $b['rule']['priority'];
			if ( $pa === $pb ) {
				return $a['i'] - $b['i'];
			}
			return $pb - $pa;
		}
	);

	if ( 'top' === $settings['overlap_mode'] ) {
		$top = $matches[0]['rule'];
		return array(
			'map'   => cydp_filter_map( cydp_rule_map( $top ), $allowed ),
			'rules' => array( $top['name'] ),
		);
	}

	// Merge/layer: apply low→high so highest priority (lowest index) wins.
	$order   = array_reverse( $matches ); // -> priority asc, index desc
	$map     = array();
	$contrib = array();
	foreach ( $order as $m ) {
		if ( ! empty( $m['rule']['exclusive'] ) ) {
			$map     = array(); // opaque: hide everything below
			$contrib = array();
		}
		$map     = array_merge( $map, cydp_rule_map( $m['rule'] ) );
		$contrib[] = $m['rule']['name'];
	}
	return array(
		'map'   => cydp_filter_map( $map, $allowed ),
		'rules' => array_reverse( $contrib ),
	);
}

/* =========================================================================
 * Front end output
 * ====================================================================== */

/**
 * Enqueue the WASM rule-matching glue (a classic no-modules script) in the
 * head so the `wasm_bindgen` global is ready before the inline resolver below.
 * The inline script falls back to its own JS math when this is absent.
 */
add_action( 'wp_enqueue_scripts', 'cydp_enqueue_wasm' );
function cydp_enqueue_wasm() {
	$s = cydp_get_settings();
	if ( empty( $s['enabled'] ) ) {
		return;
	}
	wp_enqueue_script(
		'cydp-wasm',
		plugin_dir_url( __FILE__ ) . 'assets/wasm/cyclical_palettes.js',
		array(),
		CYDP_VER,
		false
	);
}

add_action( 'wp_head', 'cydp_print_ssr', 110 );
function cydp_print_ssr() {
	$s = cydp_get_settings();
	if ( empty( $s['enabled'] ) ) {
		return;
	}
	$css = '';
	if ( ! empty( $s['awen_dlt']['enabled'] ) && cydp_awen_dlt_available() ) {
		$default_result = cydp_resolve_result( $s, cydp_awen_dlt_default_mode() );
		$default_decls  = cydp_css_decls( $default_result['map'] );
		if ( '' !== $default_decls ) {
			$css .= ':root{' . $default_decls . '}';
		}
		foreach ( cydp_awen_dlt_modes() as $mode ) {
			$result = cydp_resolve_result( $s, $mode );
			$decls  = cydp_css_decls( $result['map'] );
			if ( '' !== $decls ) {
				$mode_attr = esc_attr( $mode );
				$css      .= ':root[data-theme="' . $mode_attr . '"],:root[data-awen-color-mode="' . $mode_attr . '"]{' . $decls . '}';
			}
		}
	} else {
		$result = cydp_resolve_result( $s );
		$decls  = cydp_css_decls( $result['map'] );
		if ( '' !== $decls ) {
			$css = ':root{' . $decls . '}:root[data-theme],:root[data-awen-color-mode]{' . $decls . '}';
		}
	}
	// Values are already charset-restricted; strip angle brackets as belt-and-braces.
	$css = str_replace( array( '<', '>' ), '', $css );
	echo "\n<style id=\"cydp-ssr\">" . $css . "</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput
}

add_action( 'wp_head', 'cydp_print_js', 111 );
function cydp_print_js() {
	$s = cydp_get_settings();
	if ( empty( $s['enabled'] ) ) {
		return;
	}

	try {
		$offset = (int) round( ( new DateTime( 'now', wp_timezone() ) )->getOffset() / 60 );
	} catch ( Exception $e ) {
		$offset = (int) round( (float) get_option( 'gmt_offset', 0 ) * 60 );
	}

	$allowed = cydp_allowed_keys( $s );
	$rules   = array();
	$keys    = array();
	$palette_keys = array_keys( cydp_palette_slug_set() );
	foreach ( $s['rules'] as $r ) {
		if ( empty( $r['enabled'] ) ) {
			continue;
		}
		$map = cydp_filter_map( cydp_rule_map( $r ), $allowed );
		foreach ( array_keys( $map ) as $k ) {
			$keys[ $k ] = true;
		}
		$rules[] = array(
			'priority'  => (int) ( isset( $r['priority'] ) ? $r['priority'] : 10 ),
			'exclusive' => ! empty( $r['exclusive'] ),
			'date'      => isset( $r['date'] ) ? $r['date'] : array( 'mode' => 'none' ),
			'time'      => isset( $r['time'] ) ? $r['time'] : array( 'mode' => 'none' ),
			'map'       => $map,
		);
	}

	$awen_dlt = array( 'enabled' => false );
	if ( ! empty( $s['awen_dlt']['enabled'] ) && cydp_awen_dlt_available() ) {
		$maps = array();
		foreach ( cydp_awen_dlt_modes() as $mode ) {
			$map = cydp_filter_map( cydp_awen_dlt_map( $mode ), $allowed );
			if ( ! empty( $map ) ) {
				$maps[ $mode ] = $map;
				foreach ( array_keys( $map ) as $k ) {
					$keys[ $k ] = true;
				}
			}
		}
		if ( ! empty( $maps ) ) {
			$awen_dlt = array(
				'enabled'     => true,
				'priority'    => cydp_sanitize_priority( isset( $s['awen_dlt']['priority'] ) ? $s['awen_dlt']['priority'] : 10 ),
				'exclusive'   => ! empty( $s['awen_dlt']['exclusive'] ),
				'defaultMode' => cydp_awen_dlt_default_mode(),
				'maps'        => $maps,
			);
		}
	}

	$config = array(
		'timeSource'  => $s['time_source'],
		'overlapMode' => $s['overlap_mode'],
		'offset'      => $offset,
		'keys'        => array_keys( $keys ),
		'paletteKeys' => $palette_keys,
		'rules'       => $rules,
		'awenDlt'     => $awen_dlt,
		'wasmUrl'     => plugin_dir_url( __FILE__ ) . 'assets/wasm/cyclical_palettes_bg.wasm',
	);

	$json = wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT );
	?>
<script id="cydp-js">
(function(){
	var cfg = <?php echo $json; // phpcs:ignore WordPress.Security.EscapeOutput ?>;
	var root = document.documentElement;
	var paletteKeys = {}, pi;
	for (pi = 0; pi < (cfg.paletteKeys || []).length; pi++) paletteKeys[cfg.paletteKeys[pi]] = true;
	var wasm = null;
	if (typeof wasm_bindgen_cydp !== 'undefined' && cfg.wasmUrl) {
		wasm_bindgen_cydp({ module_or_path: cfg.wasmUrl }).then(function () {
			wasm = wasm_bindgen_cydp;
			apply();
		}).catch(function () {});
	}
	function has(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
	function pad(n){ return (n < 10 ? '0' : '') + n; }
	function now(){
		var d;
		if (cfg.timeSource === 'site') {
			d = new Date(Date.now() + cfg.offset * 60000);
			return {
				md:   pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()),
				full: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()),
				hm:   pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes())
			};
		}
		d = new Date();
		return {
			md:   pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
			full: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
			hm:   pad(d.getHours()) + ':' + pad(d.getMinutes())
		};
	}
	function dateMatch(r, t){
		var d = r.date || {}, m = d.mode || 'none';
		if (m === 'none') return true;
		var yearly = !!d.yearly, s = d.start || '', e = d.end || '';
		if (m === 'single') return !s ? false : (yearly ? (s.substr(5) === t.md) : (s === t.full));
		if (m === 'range') {
			if (!s || !e) return false;
			if (yearly) {
				var ss = s.substr(5), ee = e.substr(5), x = t.md;
				return ss <= ee ? (x >= ss && x <= ee) : (x >= ss || x <= ee);
			}
			return (t.full >= s && t.full <= e);
		}
		return true;
	}
	function timeMatch(r, t){
		var tm = r.time || {}, m = tm.mode || 'none';
		if (m === 'none') return true;
		var s = tm.start || '', e = tm.end || '';
		if (!s || !e) return true;
		var x = t.hm;
		return s <= e ? (x >= s && x < e) : (x >= s || x < e);
	}
	function awenDltMode(){
		var d = cfg.awenDlt || {}, maps = d.maps || {};
		var m = root.getAttribute('data-awen-color-mode') || root.getAttribute('data-theme') || d.defaultMode || 'dark';
		return has(maps, m) ? m : (has(maps, 'dark') ? 'dark' : Object.keys(maps)[0]);
	}
	function resolve(){
		if (wasm) {
			try {
				var t = now();
				return JSON.parse(wasm.resolve(JSON.stringify(cfg), t.full, t.md, t.hm, awenDltMode()));
			} catch (e) {}
		}
		var t = now(), matches = [], i, k;
		for (i = 0; i < cfg.rules.length; i++) {
			if (dateMatch(cfg.rules[i], t) && timeMatch(cfg.rules[i], t)) matches.push({ i: i, r: cfg.rules[i] });
		}
		if (cfg.awenDlt && cfg.awenDlt.enabled && cfg.awenDlt.maps) {
			var mode = awenDltMode(), map = cfg.awenDlt.maps[mode];
			if (map) {
				matches.push({
					i: cfg.rules.length,
					r: {
						priority: cfg.awenDlt.priority || 10,
						exclusive: !!cfg.awenDlt.exclusive,
						map: map
					}
				});
			}
		}
		if (!matches.length) return {};
		matches.sort(function(a, b){ return (b.r.priority - a.r.priority) || (a.i - b.i); });
		if (cfg.overlapMode === 'top') return matches[0].r.map || {};
		var order = matches.slice().reverse(), map = {};
		for (i = 0; i < order.length; i++) {
			var rr = order[i].r;
			if (rr.exclusive) map = {};
			var mm = rr.map || {};
			for (k in mm) { if (has(mm, k)) map[k] = mm[k]; }
		}
		return map;
	}
	function buildDecls(map){
		var css = '', k, v;
		for (k in map) {
			if (!has(map, k)) continue;
			v = map[k];
			css += '--' + k + ':' + v + ';';
			if (has(paletteKeys, k)) {
				css += '--wp--preset--color--' + k + ':' + v + ';';
				css += '--bsc-color-' + k + ':' + v + ';';
			}
		}
		return css;
	}
	function buildCss(map){
		var decls = buildDecls(map);
		return decls ? (':root{' + decls + '}:root[data-theme],:root[data-awen-color-mode]{' + decls + '}') : '';
	}
	function apply(){
		var css = buildCss(resolve());
		var el = document.getElementById('cydp-ssr');
		if (!el) {
			el = document.createElement('style');
			el.id = 'cydp-ssr';
			(document.head || document.documentElement).appendChild(el);
		}
		if (el.textContent !== css) el.textContent = css;
	}
	apply();
	if (window.MutationObserver) {
		new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-awen-color-mode'] });
	}
	if (window.setInterval) window.setInterval(apply, 60000);
})();
</script>
	<?php
}

/* =========================================================================
 * Admin
 * ====================================================================== */

add_action( 'admin_menu', 'cydp_admin_menu' );
function cydp_admin_menu() {
	add_theme_page(
		__( 'Cyclical Dynamic Palettes', 'cyclical-dynamic-palettes' ),
		__( 'Cyclical Palettes', 'cyclical-dynamic-palettes' ),
		'manage_options',
		'cydp',
		'cydp_render_admin'
	);
}

add_action( 'admin_enqueue_scripts', 'cydp_admin_assets' );
function cydp_admin_assets( $hook ) {
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	if ( 'appearance_page_cydp' !== $hook && 'themes_page_cydp' !== $hook && 'cydp' !== $page ) {
		return;
	}
	wp_enqueue_style( 'wp-color-picker' );
	wp_enqueue_script( 'iris' );
	wp_enqueue_script( 'wp-color-picker' );
	wp_enqueue_script( 'jquery' );
}

function cydp_native_color_value( $value ) {
	$value = is_string( $value ) ? trim( $value ) : '';
	if ( preg_match( '/^#([0-9a-f]{6})$/i', $value ) ) {
		return strtolower( $value );
	}
	if ( preg_match( '/^#([0-9a-f]{3})$/i', $value, $m ) ) {
		return strtolower( '#' . $m[1][0] . $m[1][0] . $m[1][1] . $m[1][1] . $m[1][2] . $m[1][2] );
	}
	return '#000000';
}

function cydp_vars_to_text( $vars ) {
	if ( empty( $vars ) || ! is_array( $vars ) ) {
		return '';
	}
	$lines = array();
	foreach ( $vars as $name => $val ) {
		$lines[] = '--' . $name . ': ' . $val . ';';
	}
	return implode( "\n", $lines );
}

function cydp_rule_card_html( $rule, $palette ) {
	$rule      = is_array( $rule ) ? $rule : array();
	$name      = isset( $rule['name'] ) ? $rule['name'] : '';
	$enabled   = isset( $rule['enabled'] ) ? ! empty( $rule['enabled'] ) : true;
	$priority  = isset( $rule['priority'] ) ? (int) $rule['priority'] : 10;
	$exclusive = ! empty( $rule['exclusive'] );

	$dmode   = isset( $rule['date']['mode'] ) ? $rule['date']['mode'] : 'none';
	$dyearly = ! empty( $rule['date']['yearly'] );
	$dstart  = isset( $rule['date']['start'] ) ? $rule['date']['start'] : '';
	$dend    = isset( $rule['date']['end'] ) ? $rule['date']['end'] : '';

	$tmode  = isset( $rule['time']['mode'] ) ? $rule['time']['mode'] : 'none';
	$tstart = isset( $rule['time']['start'] ) ? $rule['time']['start'] : '';
	$tend   = isset( $rule['time']['end'] ) ? $rule['time']['end'] : '';

	$colors   = isset( $rule['colors'] ) && is_array( $rule['colors'] ) ? $rule['colors'] : array();
	$vars_txt = cydp_vars_to_text( isset( $rule['vars'] ) ? $rule['vars'] : array() );

	ob_start();
	?>
	<div class="cydp-rule postbox">
		<div class="cydp-rule-head">
			<span class="cydp-grip dashicons dashicons-menu" title="<?php esc_attr_e( 'Position breaks ties between equal priorities.', 'cyclical-dynamic-palettes' ); ?>"></span>
			<label class="cydp-enabled-wrap"><input type="checkbox" class="cydp-enabled" <?php checked( $enabled ); ?>> <?php esc_html_e( 'On', 'cyclical-dynamic-palettes' ); ?></label>
			<input type="text" class="cydp-name regular-text" placeholder="<?php esc_attr_e( 'Rule name (e.g. Christmas, Winter, Night mode)', 'cyclical-dynamic-palettes' ); ?>" value="<?php echo esc_attr( $name ); ?>">
			<label class="cydp-priority-wrap" title="<?php esc_attr_e( 'Higher number wins when rules overlap.', 'cyclical-dynamic-palettes' ); ?>"><?php esc_html_e( 'Priority', 'cyclical-dynamic-palettes' ); ?> <input type="number" class="cydp-priority small-text" value="<?php echo esc_attr( $priority ); ?>" min="0" max="9999" step="1"></label>
			<span class="cydp-actions">
				<button type="button" class="button cydp-up" title="<?php esc_attr_e( 'Move up', 'cyclical-dynamic-palettes' ); ?>">&#9650;</button>
				<button type="button" class="button cydp-down" title="<?php esc_attr_e( 'Move down', 'cyclical-dynamic-palettes' ); ?>">&#9660;</button>
				<button type="button" class="button cydp-del"><?php esc_html_e( 'Delete', 'cyclical-dynamic-palettes' ); ?></button>
			</span>
		</div>
		<div class="cydp-rule-body">
			<div class="cydp-conds">
				<div class="cydp-cond">
					<label class="cydp-cond-label"><?php esc_html_e( 'When (date)', 'cyclical-dynamic-palettes' ); ?></label>
					<select class="cydp-date-mode">
						<option value="none" <?php selected( $dmode, 'none' ); ?>><?php esc_html_e( 'Any date', 'cyclical-dynamic-palettes' ); ?></option>
						<option value="single" <?php selected( $dmode, 'single' ); ?>><?php esc_html_e( 'Specific day', 'cyclical-dynamic-palettes' ); ?></option>
						<option value="range" <?php selected( $dmode, 'range' ); ?>><?php esc_html_e( 'Date range (season)', 'cyclical-dynamic-palettes' ); ?></option>
					</select>
					<span class="cydp-date-fields">
						<input type="date" class="cydp-date-start" value="<?php echo esc_attr( $dstart ); ?>">
						<span class="cydp-date-to"><?php esc_html_e( 'to', 'cyclical-dynamic-palettes' ); ?></span>
						<input type="date" class="cydp-date-end" value="<?php echo esc_attr( $dend ); ?>">
						<label class="cydp-yearly-wrap"><input type="checkbox" class="cydp-yearly" <?php checked( $dyearly ); ?>> <?php esc_html_e( 'Repeat yearly', 'cyclical-dynamic-palettes' ); ?></label>
					</span>
				</div>
				<div class="cydp-cond">
					<label class="cydp-cond-label"><?php esc_html_e( 'And (time of day)', 'cyclical-dynamic-palettes' ); ?></label>
					<select class="cydp-time-mode">
						<option value="none" <?php selected( $tmode, 'none' ); ?>><?php esc_html_e( 'Any time', 'cyclical-dynamic-palettes' ); ?></option>
						<option value="window" <?php selected( $tmode, 'window' ); ?>><?php esc_html_e( 'Time window', 'cyclical-dynamic-palettes' ); ?></option>
					</select>
					<span class="cydp-time-fields">
						<input type="time" class="cydp-time-start" value="<?php echo esc_attr( $tstart ); ?>">
						<span><?php esc_html_e( 'to', 'cyclical-dynamic-palettes' ); ?></span>
						<input type="time" class="cydp-time-end" value="<?php echo esc_attr( $tend ); ?>">
					</span>
				</div>
				<div class="cydp-cond cydp-exclusive-cond">
					<label class="cydp-cond-label"><?php esc_html_e( 'Overlap', 'cyclical-dynamic-palettes' ); ?></label>
					<label><input type="checkbox" class="cydp-exclusive" <?php checked( $exclusive ); ?>> <?php esc_html_e( 'Opaque — ignore lower-priority rules (merge mode)', 'cyclical-dynamic-palettes' ); ?></label>
				</div>
			</div>

			<div class="cydp-colors">
				<label class="cydp-cond-label"><?php esc_html_e( 'Palette overrides', 'cyclical-dynamic-palettes' ); ?></label>
				<p class="description"><?php esc_html_e( 'Tick only the colors this rule changes. Unticked colors keep their defaults (and, in merge mode, fall through to lower-priority rules).', 'cyclical-dynamic-palettes' ); ?></p>
				<div class="cydp-color-grid">
					<?php foreach ( $palette as $c ) :
						$slug = $c['slug'];
						$has  = isset( $colors[ $slug ] );
						$val  = $has ? $colors[ $slug ] : $c['color'];
						?>
						<div class="cydp-color-row" data-slug="<?php echo esc_attr( $slug ); ?>">
							<label class="cydp-color-on-wrap"><input type="checkbox" class="cydp-color-on" <?php checked( $has ); ?>> <span class="cydp-color-name"><?php echo esc_html( $c['name'] ); ?></span> <code>--<?php echo esc_html( $slug ); ?></code> <span class="cydp-src cydp-src-<?php echo esc_attr( 'GenerateBlocks' === $c['source'] ? 'gb' : 'gp' ); ?>"><?php echo esc_html( 'GenerateBlocks' === $c['source'] ? 'GB' : 'GP' ); ?></span></label>
							<div class="cydp-color-controls">
								<div class="cydp-current-color">
									<span class="cydp-current-swatch" style="background:<?php echo esc_attr( $c['color'] ); ?>"></span>
									<span class="cydp-current-label"><?php esc_html_e( 'Current WordPress color:', 'cyclical-dynamic-palettes' ); ?> <code><?php echo esc_html( $c['color'] ); ?></code></span>
								</div>
								<div class="cydp-picker-line">
									<input type="text" class="cydp-color" value="<?php echo esc_attr( $val ); ?>" data-default-color="<?php echo esc_attr( $c['color'] ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Override color for %s', 'cyclical-dynamic-palettes' ), $c['name'] ) ); ?>">
									<input type="color" class="cydp-native-color" value="<?php echo esc_attr( cydp_native_color_value( $val ) ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Pick override color for %s', 'cyclical-dynamic-palettes' ), $c['name'] ) ); ?>">
									<button type="button" class="button button-small cydp-use-current"><?php esc_html_e( 'Use current', 'cyclical-dynamic-palettes' ); ?></button>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
				<details class="cydp-advanced">
					<summary><?php esc_html_e( 'Advanced: extra CSS variables', 'cyclical-dynamic-palettes' ); ?></summary>
					<p class="description"><?php esc_html_e( 'One declaration per line, e.g. --gb-accent: #ffffff;  or  --my-overlay: rgba(0,0,0,.4);  — use for GenerateBlocks Pro or any non-listed variable.', 'cyclical-dynamic-palettes' ); ?></p>
					<textarea class="cydp-vars large-text code" rows="3" placeholder="--gb-accent: #ffffff;"><?php echo esc_textarea( $vars_txt ); ?></textarea>
				</details>
			</div>
		</div>
	</div>
	<?php
	return ob_get_clean();
}

function cydp_render_admin() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s       = cydp_get_settings();
	$palette = cydp_get_palette();
	$result  = ! empty( $s['enabled'] ) ? cydp_resolve_result( $s ) : array( 'map' => array(), 'rules' => array() );
	$dlt_available = cydp_awen_dlt_available();
	?>
	<div class="wrap cydp-wrap">
		<h1><?php esc_html_e( 'Cyclical Dynamic Palettes', 'cyclical-dynamic-palettes' ); ?></h1>

		<?php if ( isset( $_GET['updated'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification ?>
			<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Saved.', 'cyclical-dynamic-palettes' ); ?></p></div>
		<?php endif; ?>

		<?php if ( empty( $palette ) ) : ?>
			<div class="notice notice-warning"><p>
				<?php esc_html_e( 'No GeneratePress/GenerateBlocks global colors were found. Define your palette in Appearance → Customize → Colors → Global Colors, then return here.', 'cyclical-dynamic-palettes' ); ?>
			</p></div>
		<?php endif; ?>

		<div class="cydp-active-now notice notice-info inline"><p>
			<strong><?php esc_html_e( 'Active right now (site time):', 'cyclical-dynamic-palettes' ); ?></strong>
			<?php
			if ( ! empty( $result['rules'] ) ) {
				$names = array_map(
					function ( $n ) {
						return '' !== $n ? $n : __( '(unnamed)', 'cyclical-dynamic-palettes' );
					},
					$result['rules']
				);
				echo esc_html( implode( ' + ', $names ) );
				if ( ! empty( $result['map'] ) ) {
					echo ' &nbsp;';
					foreach ( $result['map'] as $key => $val ) {
						printf( '<span class="cydp-swatch" style="background:%1$s" title="--%2$s: %1$s"></span>', esc_attr( $val ), esc_attr( $key ) );
					}
				}
			} else {
				esc_html_e( 'None — default palette is showing.', 'cyclical-dynamic-palettes' );
			}
			echo ' &nbsp;<em>' . esc_html( wp_date( 'D, M j Y · H:i' ) ) . '</em>';
			?>
		</p></div>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="cydp-form">
			<input type="hidden" name="action" value="cydp_save">
			<?php wp_nonce_field( 'cydp_save' ); ?>
			<input type="hidden" name="cydp_payload" id="cydp_payload" value="">

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Enable', 'cyclical-dynamic-palettes' ); ?></th>
					<td><label><input type="checkbox" name="cydp_enabled" value="1" <?php checked( ! empty( $s['enabled'] ) ); ?>> <?php esc_html_e( 'Apply dynamic palettes on the front end', 'cyclical-dynamic-palettes' ); ?></label></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'When rules overlap', 'cyclical-dynamic-palettes' ); ?></th>
					<td>
						<label><input type="radio" name="cydp_overlap" value="top" <?php checked( $s['overlap_mode'], 'top' ); ?>> <?php esc_html_e( 'Highest priority wins (one palette only)', 'cyclical-dynamic-palettes' ); ?></label><br>
						<label><input type="radio" name="cydp_overlap" value="merge" <?php checked( $s['overlap_mode'], 'merge' ); ?>> <?php esc_html_e( 'Layer / merge — stack matching palettes; higher priority overrides per color', 'cyclical-dynamic-palettes' ); ?></label>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Time source', 'cyclical-dynamic-palettes' ); ?></th>
					<td>
						<label><input type="radio" name="cydp_time_source" value="site" <?php checked( $s['time_source'], 'site' ); ?>> <?php esc_html_e( 'Site time (same for everyone — best for holidays/seasons)', 'cyclical-dynamic-palettes' ); ?></label><br>
						<label><input type="radio" name="cydp_time_source" value="visitor" <?php checked( $s['time_source'], 'visitor' ); ?>> <?php esc_html_e( "Visitor's local time", 'cyclical-dynamic-palettes' ); ?></label>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Light/Dark/Transcendent style', 'cyclical-dynamic-palettes' ); ?></th>
					<td>
						<?php if ( $dlt_available ) : ?>
							<label><input type="checkbox" name="cydp_awen_dlt_enabled" value="1" <?php checked( ! empty( $s['awen_dlt']['enabled'] ) ); ?>> <?php esc_html_e( 'Put the visitor’s current light/dark/transcendent style into the same priority order as these rules', 'cyclical-dynamic-palettes' ); ?></label>
							<p class="description"><?php esc_html_e( 'Set its priority higher when the selected style should win. Set it lower when a season, holiday, or time rule should take over.', 'cyclical-dynamic-palettes' ); ?></p>
							<label class="cydp-priority-wrap"><?php esc_html_e( 'Priority', 'cyclical-dynamic-palettes' ); ?> <input type="number" name="cydp_awen_dlt_priority" class="small-text" value="<?php echo esc_attr( $s['awen_dlt']['priority'] ); ?>" min="0" max="9999" step="1"></label>
							<br>
							<label><input type="checkbox" name="cydp_awen_dlt_exclusive" value="1" <?php checked( ! empty( $s['awen_dlt']['exclusive'] ) ); ?>> <?php esc_html_e( 'When merge mode is used, ignore lower-priority palette values beneath this style', 'cyclical-dynamic-palettes' ); ?></label>
						<?php else : ?>
							<p class="description"><?php esc_html_e( 'Install and activate the AWEN01 Light/Dark/Transcendent plugin to include its current style in this priority order.', 'cyclical-dynamic-palettes' ); ?></p>
						<?php endif; ?>
					</td>
				</tr>
			</table>

			<h2><?php esc_html_e( 'Rules', 'cyclical-dynamic-palettes' ); ?></h2>
			<p class="description"><?php esc_html_e( 'Each rule matches when its date AND time conditions are both true. Priority decides overlaps; position breaks ties. In “highest priority wins” mode only the top match applies; in “layer/merge” mode palettes stack with higher priority on top.', 'cyclical-dynamic-palettes' ); ?></p>

			<div id="cydp-rules">
				<?php
				if ( ! empty( $s['rules'] ) ) {
					foreach ( $s['rules'] as $rule ) {
						echo cydp_rule_card_html( $rule, $palette ); // phpcs:ignore WordPress.Security.EscapeOutput
					}
				}
				?>
			</div>

			<p><button type="button" class="button button-secondary" id="cydp-add"><?php esc_html_e( '+ Add rule', 'cyclical-dynamic-palettes' ); ?></button></p>
			<p class="submit"><button type="submit" class="button button-primary"><?php esc_html_e( 'Save changes', 'cyclical-dynamic-palettes' ); ?></button></p>

			<p class="description cydp-foot"><?php esc_html_e( 'In a GeneratePress + GenerateBlocks stack the two share the same colour variables, so overriding a GeneratePress global colour also recolours GenerateBlocks blocks that use it. Use “extra CSS variables” for any GenerateBlocks Pro or custom variables that are not in the list above.', 'cyclical-dynamic-palettes' ); ?></p>
		</form>
	</div>

	<style>
		.cydp-wrap .cydp-rule{ padding:0; margin:0 0 16px; }
		.cydp-rule-head{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid #dcdcde; flex-wrap:wrap; }
		.cydp-rule-head .cydp-name{ flex:1; min-width:200px; }
		.cydp-grip{ color:#a7aaad; }
		.cydp-priority-wrap{ white-space:nowrap; }
		.cydp-priority{ width:64px; }
		.cydp-actions{ display:flex; gap:4px; }
		.cydp-rule-body{ padding:12px; }
		.cydp-conds{ display:flex; flex-wrap:wrap; gap:24px; margin-bottom:14px; }
		.cydp-cond{ display:flex; flex-direction:column; gap:6px; }
		.cydp-cond-label{ font-weight:600; }
		.cydp-date-fields, .cydp-time-fields{ display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; }
		.cydp-color-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px 24px; margin-top:10px; }
		.cydp-color-row{ align-items:flex-start; border:1px solid #dcdcde; border-radius:6px; display:flex; flex-direction:column; gap:10px; padding:10px; }
		.cydp-color-controls{ display:flex; flex-direction:column; gap:8px; width:100%; }
		.cydp-current-color{ align-items:center; color:#646970; display:flex; font-size:12px; gap:8px; }
		.cydp-current-swatch{ border:1px solid rgba(0,0,0,.22); border-radius:4px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.35); display:inline-block; flex:0 0 auto; height:24px; width:24px; }
		.cydp-picker-line{ align-items:center; display:flex; flex-wrap:wrap; gap:8px; }
		.cydp-native-color{ cursor:pointer; height:30px; padding:0; width:42px; }
		.cydp-color-row code{ color:#787c82; font-size:11px; }
		.cydp-color-name{ font-weight:500; }
		.cydp-src{ font-size:10px; padding:1px 5px; border-radius:8px; vertical-align:middle; }
		.cydp-src-gp{ background:#e7f0ff; color:#2247a8; }
		.cydp-src-gb{ background:#e9f7ee; color:#1a7a3f; }
		.cydp-advanced{ margin-top:12px; }
		.cydp-advanced summary{ cursor:pointer; font-weight:600; }
		.cydp-swatch{ display:inline-block; width:16px; height:16px; border-radius:3px; border:1px solid rgba(0,0,0,.2); vertical-align:middle; margin-left:2px; }
		.cydp-active-now.inline{ margin:12px 0; }
		.cydp-foot{ max-width:820px; margin-top:18px; }
		.cydp-hide{ display:none !important; }
	</style>

	<script>
	(function($){
		var TEMPLATE = <?php echo wp_json_encode( cydp_rule_card_html( array(), $palette ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ); ?>;

		function isNativeHex(value){
			return /^#[0-9a-f]{6}$/i.test(value || '');
		}
		function expandHex(value){
			value = (value || '').trim();
			if (/^#[0-9a-f]{3}$/i.test(value)) {
				return '#' + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2) + value.charAt(3) + value.charAt(3);
			}
			return value;
		}
		function syncNative($scope){
			$scope.find('.cydp-color-row').each(function(){
				var $row = $(this);
				var value = expandHex($row.find('.cydp-color').val());
				if (isNativeHex(value)) {
					$row.find('.cydp-native-color').val(value.toLowerCase());
				}
			});
		}
		function initPickers($scope){
			$scope.find('.cydp-color').each(function(){
				if ($(this).closest('.wp-picker-container').length) return;
				if ($.fn.wpColorPicker) {
					$(this).wpColorPicker({
						change: function(event, ui) {
							var color = ui.color && ui.color.toString ? ui.color.toString() : $(this).val();
							$(this).val(color).trigger('cydp:color-change');
						},
						clear: function() {
							$(this).trigger('cydp:color-change');
						}
					});
				}
			});
			syncNative($scope);
		}
		function syncCard(card){
			var $c = $(card);
			var dmode = $c.find('.cydp-date-mode').val();
			$c.find('.cydp-date-fields').toggleClass('cydp-hide', dmode === 'none');
			$c.find('.cydp-date-end').toggleClass('cydp-hide', dmode !== 'range');
			$c.find('.cydp-date-to').toggleClass('cydp-hide', dmode !== 'range');
			$c.find('.cydp-time-fields').toggleClass('cydp-hide', $c.find('.cydp-time-mode').val() !== 'window');
		}
		function syncAll(){ $('#cydp-rules .cydp-rule').each(function(){ syncCard(this); }); }

		$('#cydp-add').on('click', function(){
			var $node = $(TEMPLATE);
			$('#cydp-rules').append($node);
			initPickers($node);
			syncCard($node[0]);
			$node.find('.cydp-name').focus();
		});
		$('#cydp-rules').on('click', '.cydp-del', function(){
			if (confirm('<?php echo esc_js( __( 'Delete this rule?', 'cyclical-dynamic-palettes' ) ); ?>')) $(this).closest('.cydp-rule').remove();
		});
		$('#cydp-rules').on('click', '.cydp-up', function(){
			var $r = $(this).closest('.cydp-rule'), $p = $r.prev('.cydp-rule'); if ($p.length) $r.insertBefore($p);
		});
		$('#cydp-rules').on('click', '.cydp-down', function(){
			var $r = $(this).closest('.cydp-rule'), $n = $r.next('.cydp-rule'); if ($n.length) $r.insertAfter($n);
		});
		$('#cydp-rules').on('change', '.cydp-date-mode, .cydp-time-mode', function(){
			syncCard($(this).closest('.cydp-rule')[0]);
		});
		$('#cydp-rules').on('input change cydp:color-change', '.cydp-color', function(){
			syncNative($(this).closest('.cydp-color-row'));
		});
		$('#cydp-rules').on('input change', '.cydp-native-color', function(){
			var $row = $(this).closest('.cydp-color-row');
			var value = $(this).val();
			$row.find('.cydp-color').val(value).trigger('change').trigger('cydp:color-change');
			$row.find('.cydp-color-on').prop('checked', true);
		});
		$('#cydp-rules').on('click', '.cydp-use-current', function(){
			var $row = $(this).closest('.cydp-color-row');
			var current = $row.find('.cydp-color').attr('data-default-color') || '';
			$row.find('.cydp-color').val(current).trigger('change').trigger('cydp:color-change');
			$row.find('.cydp-color-on').prop('checked', true);
		});

		$('#cydp-form').on('submit', function(){
			var rules = [];
			$('#cydp-rules .cydp-rule').each(function(){
				var $c = $(this);
				var rule = {
					name: $c.find('.cydp-name').val() || '',
					enabled: $c.find('.cydp-enabled').is(':checked'),
					priority: parseInt($c.find('.cydp-priority').val(), 10) || 0,
					exclusive: $c.find('.cydp-exclusive').is(':checked'),
					date: {
						mode: $c.find('.cydp-date-mode').val(),
						yearly: $c.find('.cydp-yearly').is(':checked'),
						start: $c.find('.cydp-date-start').val() || '',
						end: $c.find('.cydp-date-end').val() || ''
					},
					time: {
						mode: $c.find('.cydp-time-mode').val(),
						start: $c.find('.cydp-time-start').val() || '',
						end: $c.find('.cydp-time-end').val() || ''
					},
					colors: {},
					vars: $c.find('.cydp-vars').val() || ''
				};
				$c.find('.cydp-color-row').each(function(){
					var $row = $(this);
					if ($row.find('.cydp-color-on').is(':checked')) {
						var slug = $row.attr('data-slug');
						var val = ($row.find('.cydp-color').val() || '').trim();
						if (slug && val) rule.colors[slug] = val;
					}
				});
				rules.push(rule);
			});
			$('#cydp_payload').val(JSON.stringify(rules));
		});

		initPickers($('#cydp-rules'));
		syncAll();
	})(jQuery);
	</script>
	<?php
}

/* =========================================================================
 * Save
 * ====================================================================== */

add_action( 'admin_post_cydp_save', 'cydp_save' );
function cydp_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Insufficient permissions.', 'cyclical-dynamic-palettes' ) );
	}
	check_admin_referer( 'cydp_save' );

	$enabled     = ! empty( $_POST['cydp_enabled'] );
	$time_source = isset( $_POST['cydp_time_source'] ) ? sanitize_key( wp_unslash( $_POST['cydp_time_source'] ) ) : 'site';
	$time_source = ( 'visitor' === $time_source ) ? 'visitor' : 'site';
	$overlap     = isset( $_POST['cydp_overlap'] ) ? sanitize_key( wp_unslash( $_POST['cydp_overlap'] ) ) : 'top';
	$overlap     = ( 'merge' === $overlap ) ? 'merge' : 'top';
	$awen_dlt    = array(
		'enabled'   => ! empty( $_POST['cydp_awen_dlt_enabled'] ),
		'priority'  => cydp_sanitize_priority( isset( $_POST['cydp_awen_dlt_priority'] ) ? wp_unslash( $_POST['cydp_awen_dlt_priority'] ) : 10 ),
		'exclusive' => ! empty( $_POST['cydp_awen_dlt_exclusive'] ),
	);

	$payload   = isset( $_POST['cydp_payload'] ) ? wp_unslash( $_POST['cydp_payload'] ) : '[]'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	$rules_raw = json_decode( $payload, true );
	if ( ! is_array( $rules_raw ) ) {
		$rules_raw = array();
	}
	$rules_raw = array_slice( $rules_raw, 0, 200 ); // sanity cap
	$rules     = array();
	foreach ( $rules_raw as $r ) {
		$rules[] = cydp_sanitize_rule( $r );
	}

	update_option(
		CYDP_OPT,
		array(
			'enabled'      => $enabled,
			'time_source'  => $time_source,
			'overlap_mode' => $overlap,
			'awen_dlt'     => $awen_dlt,
			'rules'        => $rules,
		)
	);

	wp_safe_redirect( add_query_arg( array( 'page' => 'cydp', 'updated' => '1' ), admin_url( 'themes.php' ) ) );
	exit;
}
