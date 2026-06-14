<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AWEN_DLT_Colors {

	const MODES = [ 'light', 'dark', 'transcendent' ];

	public static function get_gp_palette() {
		$palette = [];

		if ( function_exists( 'generate_get_option' ) ) {
			$global = generate_get_option( 'global_colors' );
			if ( is_array( $global ) ) {
				foreach ( $global as $c ) {
					if ( empty( $c['slug'] ) || empty( $c['color'] ) ) {
						continue;
					}
					$palette[ sanitize_key( $c['slug'] ) ] = [
						'name'  => isset( $c['name'] ) ? $c['name'] : $c['slug'],
						'color' => $c['color'],
					];
				}
			}
		}

		if ( empty( $palette ) ) {
			$theme_json = wp_get_global_settings( [ 'color', 'palette' ] );
			$candidates = [];
			if ( is_array( $theme_json ) ) {
				foreach ( [ 'theme', 'custom', 'default' ] as $origin ) {
					if ( ! empty( $theme_json[ $origin ] ) && is_array( $theme_json[ $origin ] ) ) {
						$candidates = array_merge( $candidates, $theme_json[ $origin ] );
					}
				}
			}
			foreach ( $candidates as $c ) {
				if ( empty( $c['slug'] ) || empty( $c['color'] ) ) {
					continue;
				}
				$slug = sanitize_key( $c['slug'] );
				if ( isset( $palette[ $slug ] ) ) {
					continue;
				}
				$palette[ $slug ] = [
					'name'  => isset( $c['name'] ) ? $c['name'] : $slug,
					'color' => $c['color'],
				];
			}
		}

		return apply_filters( 'awen_dlt_palette', $palette );
	}

	public static function get_mode_overrides() {
		$saved = get_option( AWEN_DLT_OPTION, [] );
		return is_array( $saved ) ? $saved : [];
	}

	public static function get_mode_palette( $mode ) {
		$mode = self::sanitize_mode( $mode );
		$saved = self::get_mode_overrides();
		return isset( $saved[ $mode ] ) && is_array( $saved[ $mode ] ) ? $saved[ $mode ] : [];
	}

	public static function resolve_mode_color( $mode, $slug, $light_hex ) {
		$mode = self::sanitize_mode( $mode );

		$overrides = self::get_mode_palette( $mode );
		if ( ! empty( $overrides[ $slug ] ) ) {
			return $overrides[ $slug ];
		}

		$defaults = self::default_schemes();
		if ( ! empty( $defaults[ $mode ][ $slug ] ) ) {
			return $defaults[ $mode ][ $slug ];
		}

		if ( 'light' === $mode ) {
			return $light_hex;
		}

		if ( 'transcendent' === $mode ) {
			return self::transcend_hex( $light_hex );
		}

		return self::invert_hex( $light_hex );
	}

	public static function sanitize_mode( $mode ) {
		$mode = sanitize_key( (string) $mode );
		return in_array( $mode, self::MODES, true ) ? $mode : 'light';
	}

	public static function default_schemes() {
		return [
			'light' => [
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
			],
			'dark' => [
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
			],
			'transcendent' => [
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
			],
		];
	}

	public static function transcend_hex( $hex ) {
		$rgb = self::hex_to_rgb( $hex );
		if ( ! $rgb ) {
			return $hex;
		}

		$grey = [ 143, 148, 150 ];
		return self::rgb_to_hex(
			( $rgb[0] * 0.42 ) + ( $grey[0] * 0.58 ),
			( $rgb[1] * 0.42 ) + ( $grey[1] * 0.58 ),
			( $rgb[2] * 0.42 ) + ( $grey[2] * 0.58 )
		);
	}

	public static function invert_hex( $hex ) {
		$rgb = self::hex_to_rgb( $hex );
		if ( ! $rgb ) {
			return $hex;
		}
		$hsl    = self::rgb_to_hsl( $rgb[0], $rgb[1], $rgb[2] );
		$hsl[2] = max( 0, min( 1, 1 - $hsl[2] ) );
		$rgb    = self::hsl_to_rgb( $hsl[0], $hsl[1], $hsl[2] );
		return self::rgb_to_hex( $rgb[0], $rgb[1], $rgb[2] );
	}

	public static function hex_to_rgb( $hex ) {
		$hex = ltrim( trim( $hex ), '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		if ( 6 !== strlen( $hex ) || ! ctype_xdigit( $hex ) ) {
			return null;
		}
		return [
			hexdec( substr( $hex, 0, 2 ) ),
			hexdec( substr( $hex, 2, 2 ) ),
			hexdec( substr( $hex, 4, 2 ) ),
		];
	}

	public static function rgb_to_hex( $r, $g, $b ) {
		return sprintf( '#%02x%02x%02x', (int) round( $r ), (int) round( $g ), (int) round( $b ) );
	}

	public static function rgb_to_hsl( $r, $g, $b ) {
		$r /= 255; $g /= 255; $b /= 255;
		$max = max( $r, $g, $b );
		$min = min( $r, $g, $b );
		$l   = ( $max + $min ) / 2;
		$h   = 0; $s = 0;
		if ( $max !== $min ) {
			$d = $max - $min;
			$s = $l > 0.5 ? $d / ( 2 - $max - $min ) : $d / ( $max + $min );
			switch ( $max ) {
				case $r: $h = ( $g - $b ) / $d + ( $g < $b ? 6 : 0 ); break;
				case $g: $h = ( $b - $r ) / $d + 2; break;
				case $b: $h = ( $r - $g ) / $d + 4; break;
			}
			$h /= 6;
		}
		return [ $h, $s, $l ];
	}

	public static function hsl_to_rgb( $h, $s, $l ) {
		if ( 0 === $s ) {
			$v = $l * 255;
			return [ $v, $v, $v ];
		}
		$q = $l < 0.5 ? $l * ( 1 + $s ) : $l + $s - $l * $s;
		$p = 2 * $l - $q;
		return [
			self::hue_to_rgb( $p, $q, $h + 1 / 3 ) * 255,
			self::hue_to_rgb( $p, $q, $h ) * 255,
			self::hue_to_rgb( $p, $q, $h - 1 / 3 ) * 255,
		];
	}

	private static function hue_to_rgb( $p, $q, $t ) {
		if ( $t < 0 ) { $t += 1; }
		if ( $t > 1 ) { $t -= 1; }
		if ( $t < 1 / 6 ) { return $p + ( $q - $p ) * 6 * $t; }
		if ( $t < 1 / 2 ) { return $q; }
		if ( $t < 2 / 3 ) { return $p + ( $q - $p ) * ( 2 / 3 - $t ) * 6; }
		return $p;
	}
}
