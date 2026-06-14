<?php
/**
 * Deterministic color engine (OKLCH).
 *
 * Implements the palette-composition approach distilled from
 * pbakaus/impeccable (seed → composed 5-role palette, tinted neutrals
 * toward the brand hue, contrast as a gate) and nexu-io/open-design
 * (neutral/accent/semantic layer budgets, no pure black/white, accent
 * darkened to a "600" shade for text use).
 *
 * Everything here is math — no AI. Given 1–3 seed colors it composes:
 *  - roles: primary, accent, ink, surface, bg, muted, border
 *  - a 50–900 ramp for the primary
 *  - contrast-gated "text-safe" variants
 *  - semantic colors (success / warning / danger) harmonized to the seed
 *  - a dark-theme counterpart set
 */

defined( 'ABSPATH' ) || exit;

class BSC_Color {

	/* ----------------------------------------------------- conversions */

	public static function hex_to_rgb( $hex ) {
		$hex = ltrim( $hex, '#' );
		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}
		return array_map( 'hexdec', str_split( $hex, 2 ) );
	}

	public static function rgb_to_hex( $rgb ) {
		return sprintf( '#%02x%02x%02x',
			max( 0, min( 255, round( $rgb[0] ) ) ),
			max( 0, min( 255, round( $rgb[1] ) ) ),
			max( 0, min( 255, round( $rgb[2] ) ) )
		);
	}

	private static function srgb_to_linear( $c ) {
		$c = $c / 255;
		return $c <= 0.04045 ? $c / 12.92 : pow( ( $c + 0.055 ) / 1.055, 2.4 );
	}

	private static function linear_to_srgb( $c ) {
		$c = max( 0, min( 1, $c ) );
		return 255 * ( $c <= 0.0031308 ? 12.92 * $c : 1.055 * pow( $c, 1 / 2.4 ) - 0.055 );
	}

	/** hex → [L, C, H] (OKLCH; H in degrees). */
	public static function to_oklch( $hex ) {
		list( $r, $g, $b ) = array_map( array( __CLASS__, 'srgb_to_linear' ), self::hex_to_rgb( $hex ) );

		$l = pow( 0.4122214708 * $r + 0.5363325363 * $g + 0.0514459929 * $b, 1 / 3 );
		$m = pow( 0.2119034982 * $r + 0.6806995451 * $g + 0.1073969566 * $b, 1 / 3 );
		$s = pow( 0.0883024619 * $r + 0.2817188376 * $g + 0.6299787005 * $b, 1 / 3 );

		$L = 0.2104542553 * $l + 0.7936177850 * $m - 0.0040720468 * $s;
		$a = 1.9779984951 * $l - 2.4285922050 * $m + 0.4505937099 * $s;
		$bb = 0.0259040371 * $l + 0.7827717662 * $m - 0.8086757660 * $s;

		$C = sqrt( $a * $a + $bb * $bb );
		$H = fmod( rad2deg( atan2( $bb, $a ) ) + 360, 360 );

		return array( $L, $C, $H );
	}

	/** [L, C, H] → hex, with chroma clamped into sRGB gamut. */
	public static function from_oklch( $L, $C, $H ) {
		// Reduce chroma until the color fits in sRGB.
		for ( $i = 0; $i < 24; $i++ ) {
			$rgb = self::oklch_to_rgb_raw( $L, $C, $H );
			$ok  = true;
			foreach ( $rgb as $v ) {
				if ( $v < -0.001 || $v > 255.001 ) {
					$ok = false;
					break;
				}
			}
			if ( $ok ) {
				return self::rgb_to_hex( $rgb );
			}
			$C *= 0.92;
		}
		return self::rgb_to_hex( self::oklch_to_rgb_raw( $L, 0, $H ) );
	}

	private static function oklch_to_rgb_raw( $L, $C, $H ) {
		$a  = $C * cos( deg2rad( $H ) );
		$bb = $C * sin( deg2rad( $H ) );

		$l = pow( $L + 0.3963377774 * $a + 0.2158037573 * $bb, 3 );
		$m = pow( $L - 0.1055613458 * $a - 0.0638541728 * $bb, 3 );
		$s = pow( $L - 0.0894841775 * $a - 1.2914855480 * $bb, 3 );

		return array(
			self::linear_to_srgb( +4.0767416621 * $l - 3.3077115913 * $m + 0.2309699292 * $s ),
			self::linear_to_srgb( -1.2684380046 * $l + 2.6097574011 * $m - 0.3413193965 * $s ),
			self::linear_to_srgb( -0.0041960863 * $l - 0.7034186147 * $m + 1.7076147010 * $s ),
		);
	}

	/* ------------------------------------------------- contrast gating */

	/** Darken (or lighten) a color along L until it clears $min against $bg. */
	public static function gate( $hex, $bg, $min = 4.5 ) {
		if ( BSC_Contrast::ratio( $hex, $bg ) >= $min ) {
			return $hex;
		}
		list( $L, $C, $H ) = self::to_oklch( $hex );
		$darker = BSC_Contrast::luminance( $bg ) > 0.5;

		for ( $i = 0; $i < 40; $i++ ) {
			$L += $darker ? -0.02 : 0.02;
			$L  = max( 0.05, min( 0.98, $L ) );
			$try = self::from_oklch( $L, $C, $H );
			if ( BSC_Contrast::ratio( $try, $bg ) >= $min ) {
				return $try;
			}
		}
		return $darker ? '#1a1a1a' : '#f4f4f4';
	}

	/* --------------------------------------------- palette composition */

	/**
	 * Compose a full palette from 1–3 seeds.
	 *
	 * @param array $seeds Array of hex strings (1–3). seeds[0] = primary.
	 * @return array Structured palette.
	 */
	public static function compose( $seeds ) {
		$seeds = array_values( array_filter( (array) $seeds ) );
		if ( ! $seeds ) {
			$seeds = array( '#2f6feb' );
		}

		list( $pL, $pC, $pH ) = self::to_oklch( $seeds[0] );

		// Tinted-neutral chroma toward the brand hue (impeccable: 0.005–0.015).
		$tint = max( 0.004, min( 0.012, $pC * 0.08 ) );

		$palette = array();

		// Primary — the seed itself.
		$palette['primary'] = strtolower( $seeds[0] );

		// Secondary — second seed, or a deepened primary.
		$palette['secondary'] = isset( $seeds[1] )
			? strtolower( $seeds[1] )
			: self::from_oklch( max( 0.25, $pL - 0.18 ), $pC * 0.85, $pH );

		// Accent — third seed, or a hue rotation that keeps the family.
		$palette['accent'] = isset( $seeds[2] )
			? strtolower( $seeds[2] )
			: self::from_oklch( min( 0.78, $pL + 0.12 ), max( 0.09, $pC * 0.9 ), fmod( $pH + 40, 360 ) );

		// Neutrals — composed around the seed hue, never pure black/white
		// (open-design) and never default-warm cream (impeccable anti-cream).
		$palette['ink']     = self::from_oklch( 0.22, min( 0.02, $tint * 2 ), $pH );
		$palette['surface'] = self::from_oklch( 0.985, $tint * 0.6, $pH );
		$palette['bg']      = self::from_oklch( 0.955, $tint, $pH );
		$palette['muted']   = self::from_oklch( 0.55, max( 0.012, $tint * 1.5 ), $pH );
		$palette['border']  = self::from_oklch( 0.88, $tint, $pH );

		// Text-safe primary (open-design: darken accent to a "600" for text).
		$palette['primary_text'] = self::gate( $palette['primary'], $palette['surface'], 4.5 );

		// 50–900 ramp on the primary — interpolated around the seed's own
		// lightness so the ramp stays monotonic for dark or light seeds.
		$ramp = array();
		foreach ( array( 50, 100, 200, 300, 400 ) as $i => $step ) {
			$t = $i / 5; // 0 … 0.8
			$L = 0.97 + ( $pL - 0.97 ) * $t;
			$c = $pC * ( $L > 0.9 ? 0.25 : ( $L > 0.8 ? 0.5 : 0.85 ) );
			$ramp[ $step ] = self::from_oklch( $L, $c, $pH );
		}
		$ramp[500] = $palette['primary'];
		$dark_end  = max( 0.18, min( 0.26, $pL - 0.2 ) );
		foreach ( array( 600, 700, 800, 900 ) as $i => $step ) {
			$t = ( $i + 1 ) / 4; // 0.25 … 1
			$L = $pL + ( $dark_end - $pL ) * $t;
			$ramp[ $step ] = self::from_oklch( $L, $pC * 0.85, $pH );
		}
		$palette['ramp'] = $ramp;

		// Semantic colors, hue-fixed but chroma/lightness harmonized + gated.
		$semC = max( 0.10, min( 0.16, $pC ) );
		$palette['success'] = self::gate( self::from_oklch( 0.58, $semC, 150 ), $palette['surface'], 3.0 );
		$palette['warning'] = self::gate( self::from_oklch( 0.70, $semC, 85 ), $palette['surface'], 3.0 );
		$palette['danger']  = self::gate( self::from_oklch( 0.55, $semC, 27 ), $palette['surface'], 3.0 );

		// Dark theme counterparts (open-design: #0f0f0f-class, not #000).
		$palette['dark'] = array(
			'bg'      => self::from_oklch( 0.18, $tint, $pH ),
			'surface' => self::from_oklch( 0.23, $tint, $pH ),
			'ink'     => self::from_oklch( 0.93, $tint * 0.5, $pH ),
			'muted'   => self::from_oklch( 0.68, $tint, $pH ),
			'primary' => self::gate( $palette['primary'], self::from_oklch( 0.18, $tint, $pH ), 4.5 ),
		);

		return $palette;
	}

	/**
	 * Convert a composed palette into the plugin's colors[] rows with
	 * role + usage strings carrying the application budgets.
	 */
	public static function to_brand_colors( $palette ) {
		$rows = array(
			array( 'slug' => 'primary', 'name' => 'Primary', 'hex' => $palette['primary'], 'role' => 'primary',
				'usage' => 'The brand anchor. Committed use: hero surfaces, key CTAs, brand moments. For text on light surfaces use Primary Text instead.' ),
			array( 'slug' => 'primary-text', 'name' => 'Primary Text', 'hex' => $palette['primary_text'], 'role' => 'primary',
				'usage' => 'Contrast-gated variant of Primary (≥4.5:1 on Surface). Use for links and colored text; never use raw Primary for body-size text on light backgrounds.' ),
			array( 'slug' => 'secondary', 'name' => 'Secondary', 'hex' => $palette['secondary'], 'role' => 'secondary',
				'usage' => 'Depth and hierarchy: section backgrounds, footers, secondary buttons.' ),
			array( 'slug' => 'accent', 'name' => 'Accent', 'hex' => $palette['accent'], 'role' => 'accent',
				'usage' => 'Maximum 5–10% of any composition and at most 2 visible uses per screen (one highlight + one CTA). Links count toward the budget.' ),
			array( 'slug' => 'ink', 'name' => 'Ink', 'hex' => $palette['ink'], 'role' => 'text',
				'usage' => 'Default text color. Tinted toward the brand hue; never use pure #000.' ),
			array( 'slug' => 'muted', 'name' => 'Muted', 'hex' => $palette['muted'], 'role' => 'text',
				'usage' => 'Secondary text and captions only — verify 4.5:1 on its actual background before use.' ),
			array( 'slug' => 'surface', 'name' => 'Surface', 'hex' => $palette['surface'], 'role' => 'surface',
				'usage' => 'Cards and raised elements. Off-white with brand-hue tint; never pure #fff.' ),
			array( 'slug' => 'bg', 'name' => 'Background', 'hex' => $palette['bg'], 'role' => 'neutral',
				'usage' => 'Page background. Neutrals (bg/surface/ink/muted/border) should carry 70–90% of every composition.' ),
			array( 'slug' => 'border', 'name' => 'Border', 'hex' => $palette['border'], 'role' => 'neutral',
				'usage' => 'Hairlines and dividers. 1px at this value; on dark surfaces prefer rgba(255,255,255,.08).' ),
			array( 'slug' => 'success', 'name' => 'Success', 'hex' => $palette['success'], 'role' => 'accent',
				'usage' => 'Semantic only — confirmation states. Never decorative.' ),
			array( 'slug' => 'warning', 'name' => 'Warning', 'hex' => $palette['warning'], 'role' => 'accent',
				'usage' => 'Semantic only — caution states. Never decorative.' ),
			array( 'slug' => 'danger', 'name' => 'Danger', 'hex' => $palette['danger'], 'role' => 'accent',
				'usage' => 'Semantic only — errors and destructive actions. Never decorative.' ),
		);
		return $rows;
	}
}
