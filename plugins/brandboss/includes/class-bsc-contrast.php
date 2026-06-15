<?php
/**
 * WCAG 2.x contrast utilities.
 */

defined( 'ABSPATH' ) || exit;

class BSC_Contrast {

	public static function luminance( $hex ) {
		$hex = ltrim( $hex, '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		$rgb = array_map( 'hexdec', str_split( $hex, 2 ) );
		$srgb = array_map( function ( $c ) {
			$c = $c / 255;
			return $c <= 0.04045 ? $c / 12.92 : pow( ( $c + 0.055 ) / 1.055, 2.4 );
		}, $rgb );
		return 0.2126 * $srgb[0] + 0.7152 * $srgb[1] + 0.0722 * $srgb[2];
	}

	public static function ratio( $hex1, $hex2 ) {
		$l1 = self::luminance( $hex1 );
		$l2 = self::luminance( $hex2 );
		$hi = max( $l1, $l2 );
		$lo = min( $l1, $l2 );
		return round( ( $hi + 0.05 ) / ( $lo + 0.05 ), 2 );
	}

	/**
	 * Grade a ratio. Returns array of pass/fail per WCAG level.
	 */
	public static function grade( $ratio ) {
		return array(
			'ratio'            => $ratio,
			'aa_normal'        => $ratio >= 4.5,
			'aa_large'         => $ratio >= 3.0,
			'aaa_normal'       => $ratio >= 7.0,
			'aaa_large'        => $ratio >= 4.5,
			'ui_components'    => $ratio >= 3.0, // WCAG 1.4.11 non-text contrast
		);
	}

	/**
	 * Full matrix for a palette: every pair, graded.
	 */
	public static function matrix( $colors ) {
		$out = array();
		foreach ( $colors as $a ) {
			foreach ( $colors as $b ) {
				if ( $a['slug'] === $b['slug'] ) {
					continue;
				}
				$out[] = array(
					'fg'    => $a['slug'],
					'bg'    => $b['slug'],
					'grade' => self::grade( self::ratio( $a['hex'], $b['hex'] ) ),
				);
			}
		}
		return $out;
	}
}
