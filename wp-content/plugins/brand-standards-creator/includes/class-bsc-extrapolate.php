<?php
/**
 * Extrapolation engine.
 *
 * Input (minimal): logo attachment, 1–3 seed colors, heading/body font,
 * three voice words, industry. Output: a complete brand object.
 *
 * Two layers:
 *  1. DETERMINISTIC — everything math can decide is decided by math, not
 *     a model: full palette composition (BSC_Color), type scale, spacing
 *     scale, ratios, baseline logo rules, contrast gating.
 *  2. AI (one structured JSON pass) — judgment copy only: mission, color
 *     usage nuance, logo dos/don'ts specific to this mark, imagery style
 *     and rules, tone guidelines. Grounded in BSC_Principles::digest().
 *
 * The AI layer degrades gracefully: with no API key, extrapolation still
 * produces a complete, professional baseline from the deterministic layer.
 */

defined( 'ABSPATH' ) || exit;

class BSC_Extrapolate {

	/**
	 * @param array $input {
	 *   logo_attachment_id int, seeds string[], heading_font string,
	 *   body_font string, name string, vibe string[3], industry string,
	 *   strategy string restrained|committed|full|drenched
	 * }
	 */
	public static function run( $input ) {
		$brand = BSC_Brand::get();

		$name     = sanitize_text_field( $input['name'] ?? $brand['identity']['name'] );
		$seeds    = array_slice( array_filter( array_map( 'sanitize_hex_color', (array) ( $input['seeds'] ?? array() ) ) ), 0, 3 );
		$logo_id  = (int) ( $input['logo_attachment_id'] ?? 0 );
		$vibe     = array_slice( array_filter( array_map( 'sanitize_text_field', (array) ( $input['vibe'] ?? array() ) ) ), 0, 3 );
		$industry = sanitize_text_field( $input['industry'] ?? '' );
		$strategy = in_array( $input['strategy'] ?? '', array( 'restrained', 'committed', 'full', 'drenched' ), true ) ? $input['strategy'] : 'committed';

		// Fonts: N roles. Accepts fonts[] of {role, family}; legacy heading/body params still work.
		$fonts_in = array();
		foreach ( (array) ( $input['fonts'] ?? array() ) as $f ) {
			$role   = sanitize_key( $f['role'] ?? '' );
			$family = sanitize_text_field( $f['family'] ?? '' );
			if ( $role && $family ) {
				$fonts_in[] = array( 'role' => $role, 'family' => $family );
			}
		}
		if ( ! $fonts_in ) {
			if ( ! empty( $input['heading_font'] ) ) {
				$fonts_in[] = array( 'role' => 'heading', 'family' => sanitize_text_field( $input['heading_font'] ) );
			}
			if ( ! empty( $input['body_font'] ) ) {
				$fonts_in[] = array( 'role' => 'body', 'family' => sanitize_text_field( $input['body_font'] ) );
			}
		}

		$warnings = array();
		// Core Asset Protocol: the logo is the highest-recognition asset.
		if ( ! $logo_id ) {
			$warnings[] = 'No logo provided. Per the Core Asset Protocol, a brand cannot be defined from colors and fonts alone — upload at least a primary logo and re-run, or attach it before publishing.';
		}

		/* ---------------------------- 1. deterministic layer ---------- */

		$palette = BSC_Color::compose( $seeds );

		$brand['identity']['name'] = $name;
		$brand['colors']           = BSC_Color::to_brand_colors( $palette );

		// Typography: brand register defaults (modular ≥1.25, base 18).
		$role_defaults = array(
			'heading'    => array( 'fallback' => 'Georgia, serif', 'weights' => array( '600', '700' ) ),
			'display'    => array( 'fallback' => 'Georgia, serif', 'weights' => array( '700' ) ),
			'subheading' => array( 'fallback' => 'Georgia, serif', 'weights' => array( '500', '600' ) ),
			'body'       => array( 'fallback' => 'system-ui, sans-serif', 'weights' => array( '400', '500', '700' ) ),
			'caption'    => array( 'fallback' => 'system-ui, sans-serif', 'weights' => array( '400', '500' ) ),
			'mono'       => array( 'fallback' => 'ui-monospace, monospace', 'weights' => array( '400' ) ),
			'accent'     => array( 'fallback' => 'Georgia, serif', 'weights' => array( '400', '700' ) ),
		);
		$brand['typography']['fonts'] = array();
		foreach ( $fonts_in as $f ) {
			$d = $role_defaults[ $f['role'] ] ?? $role_defaults['body'];
			$brand['typography']['fonts'][] = array(
				'role'     => $f['role'],
				'family'   => $f['family'],
				'fallback' => $d['fallback'],
				'source'   => 'google',
				'weights'  => $d['weights'],
			);
		}
		$brand['typography']['scale'] = array(
			'base_px' => 18,
			'ratio'   => 1.25,
			'levels'  => array( 'caption' => -2, 'small' => -1, 'body' => 0, 'h5' => 1, 'h4' => 2, 'h3' => 3, 'h2' => 4, 'h1' => 5 ),
		);
		$brand['typography']['line_height'] = array( 'heading' => 1.15, 'body' => 1.55 );
		$brand['typography']['notes'] =
			"Pairing axis: heading and body faces contrast deliberately (serif/sans or geometric/humanist); never two near-identical sans-serifs.\n" .
			"Tracking: ALL CAPS +0.06–0.1em (required); UI labels +0.02em; headings ≥32px −0.01 to −0.02em; display ≥48px −0.02 to −0.03em (floor −0.04em).\n" .
			"Body line length 45–75ch (target 65ch). Display ceiling 96px. Maximum 3–4 weights with fixed roles. Light-on-dark text adds +0.05–0.1 line-height.";

		// Spacing: 8px base, single multiplicative scale, nothing off-scale.
		$brand['spacing'] = array(
			'base_px' => 8,
			'scale'   => array( 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16 ),
			'notes'   => 'Every margin, padding, and gap uses a value from this scale — nothing off-scale. Vary spacing for rhythm: generous between sections (space-8+), tight within groups (space-1 to space-3).',
		);

		$brand['ratios'] = array(
			'layout'        => array(
				array( 'label' => 'Type scale', 'value' => '1.25 (major third)' ),
				array( 'label' => 'Content / whitespace bias', 'value' => '≈ 1:1.618 (golden) for hero compositions' ),
			),
			'image_aspects' => array( '16:9', '3:2', '4:5', '1:1' ),
		);

		$brand['layout'] = array(
			'grid_columns' => 12,
			'gutter_px'    => 24,
			'margin'       => 'clamp(24px, 5vw, 96px)',
			'max_width_px' => 1200,
			'principles'   => array(
				'Compose every frame as if type is coming — negative space is where the headline lives',
				'Leave a clear third for text overlay on any hero composition',
				'Subjects sit off-centre on the rule of thirds; horizons stay level with generous headroom',
				'Vary spacing for rhythm: generous between sections, tight within groups',
				'Never centre a headline over a busy area — change the crop, not the type size',
			),
		);

		// Logo system baseline (works with or without an upload).
		if ( $logo_id ) {
			$has = false;
			foreach ( (array) $brand['logos'] as $l ) {
				if ( (int) ( $l['attachment_id'] ?? 0 ) === $logo_id ) {
					$has = true;
				}
			}
			if ( ! $has ) {
				$brand['logos'][] = array(
					'attachment_id' => $logo_id,
					'label'         => 'Primary',
					'variant'       => 'primary',
					'min_size_px'   => 24,
					'clearspace'    => 'Equal to the cap-height of the wordmark on all four sides',
					'background'    => 'light',
				);
			}
		}
		$brand['logo_rules']['dos'] = array(
			'Use the supplied master files only — never recreate, retype, or redraw the logo',
			'Maintain the defined clearspace on all sides at every size',
			'Respect minimum sizes: 24px digital, 10mm print (adjust per variation)',
			'Use the inverse/mono variation on dark or photographic backgrounds',
			'Verify ≥3:1 contrast between the logo and its background before placement',
			'Scale proportionally from master vector files',
		);
		$brand['logo_rules']['donts'] = array(
			'Do not stretch, compress, skew, or rotate the logo',
			'Do not recolor it outside the approved palette',
			'Do not add drop shadows, outlines, gradients, or any effects',
			'Do not place it on low-contrast or visually busy backgrounds',
			'Do not crowd it — nothing enters the clearspace',
			'Do not animate the logo outside approved motion treatments',
		);

		$strategy_lines = array(
			'restrained' => 'Color strategy: RESTRAINED — tinted neutrals carry the surface; the accent appears at ≤10%, max 2 visible uses per screen.',
			'committed'  => 'Color strategy: COMMITTED — the primary carries 30–60% of brand surfaces (heroes, covers, key sections); neutrals do the rest of the work.',
			'full'       => 'Color strategy: FULL PALETTE — primary, secondary, and accent each have deliberate named jobs; semantic colors stay functional.',
			'drenched'   => 'Color strategy: DRENCHED — on campaign surfaces the primary IS the surface; ink and surface invert on top of it.',
		);
		$brand['imagery']['treatments'] = $strategy_lines[ $strategy ];

		/* ---------------------------- 2. AI judgment layer ------------ */

		$ai = self::ai_pass( $brand, compact( 'name', 'vibe', 'industry', 'strategy' ), $palette );
		if ( is_wp_error( $ai ) ) {
			$warnings[] = 'AI layer skipped (' . $ai->get_error_message() . ') — deterministic baseline generated. Add an API key and re-run to enrich copy.';
		} elseif ( is_array( $ai ) ) {
			$brand = self::merge_ai( $brand, $ai );
		}

		$brand['sections'] = array( 'identity' => true, 'voice' => true, 'context' => ! empty( $brand['context']['items'] ) );

		$brand['meta']['version'] = (int) $brand['meta']['version'] + 0; // version bump is manual
		$brand = BSC_Brand::save( $brand );
		BSC_Export::write_all( $brand );

		return array( 'brand' => $brand, 'warnings' => $warnings, 'palette' => $palette );
	}

	/** One structured JSON call grounded in the principles digest. */
	private static function ai_pass( $brand, $ctx, $palette ) {
		$provider = $brand['ai']['text_provider'];
		$key      = BSC_Keys::get( $provider );
		if ( ! $key ) {
			return new WP_Error( 'bsc_no_key', 'no ' . $provider . ' key' );
		}

		$schema = array(
			'mission'           => 'string, 2-3 sentences',
			'color_strategy'    => 'string, 2-3 sentences applying the chosen strategy to THIS brand',
			'logo_dos_extra'    => 'array of 2-3 strings specific to this brand (beyond universal rules)',
			'logo_donts_extra'  => 'array of 2-3 strings specific to this brand',
			'lockup_recommendations' => 'array of 2-3 strings, each naming a lockup to produce and when to use it',
			'imagery_style'     => 'string, 3-5 sentences. Concrete and physical: subjects, light, color treatment, composition. Usable directly as an image-generation base prompt.',
			'imagery_dos'       => 'array of 4-6 strings',
			'imagery_donts'     => 'array of 4-6 strings',
			'tone_attributes'   => 'array of exactly 3 physical-object words',
			'tone_guidelines'   => 'string, ~150 words',
			'tone_examples'     => 'array of 3 objects {do, dont}',
		);

		$prompt = "Extrapolate full brand standards from this minimal input. Respond with ONLY a JSON object matching this schema (no markdown fences, no commentary):\n" .
			wp_json_encode( $schema, JSON_PRETTY_PRINT ) . "\n\n" .
			"Brand: {$ctx['name']}\nIndustry: {$ctx['industry']}\nVoice words: " . implode( ', ', $ctx['vibe'] ) . "\n" .
			"Chosen color strategy: {$ctx['strategy']}\n" .
			'Composed palette: primary ' . $palette['primary'] . ', secondary ' . $palette['secondary'] . ', accent ' . $palette['accent'] . ', ink ' . $palette['ink'] . ', surface ' . $palette['surface'] . "\n" .
			'Fonts: heading "' . ( $brand['typography']['fonts'][0]['family'] ?? '—' ) . '", body "' . ( $brand['typography']['fonts'][1]['family'] ?? '—' ) . '"' . "\n" .
			'Ground every rule in the fundamentals from your system prompt. Voice words and imagery must be specific to this brand, never generic.';

		$req = new WP_REST_Request( 'POST' );
		$req->set_param( 'provider', $provider );
		$req->set_param( 'model', $brand['ai']['text_model'] );
		$req->set_param( 'system', BSC_Principles::digest() );
		$req->set_param( 'prompt', $prompt );

		$res = BSC_Rest::ai_text( $req );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$text = $res->get_data()['text'] ?? '';
		$text = preg_replace( '/^```(json)?|```$/m', '', trim( $text ) );
		$json = json_decode( trim( $text ), true );

		return is_array( $json ) ? $json : new WP_Error( 'bsc_parse', 'unparseable AI response' );
	}

	private static function merge_ai( $brand, $ai ) {
		$str  = function ( $v ) { return sanitize_textarea_field( (string) $v ); };
		$list = function ( $v ) use ( $str ) { return array_values( array_filter( array_map( $str, (array) $v ) ) ); };

		if ( ! empty( $ai['mission'] ) ) {
			$brand['identity']['mission'] = $str( $ai['mission'] );
		}
		if ( ! empty( $ai['color_strategy'] ) ) {
			$brand['imagery']['treatments'] = trim( $brand['imagery']['treatments'] . "\n" . $str( $ai['color_strategy'] ) );
		}
		if ( ! empty( $ai['logo_dos_extra'] ) ) {
			$brand['logo_rules']['dos'] = array_merge( $brand['logo_rules']['dos'], $list( $ai['logo_dos_extra'] ) );
		}
		if ( ! empty( $ai['logo_donts_extra'] ) ) {
			$brand['logo_rules']['donts'] = array_merge( $brand['logo_rules']['donts'], $list( $ai['logo_donts_extra'] ) );
		}
		if ( ! empty( $ai['lockup_recommendations'] ) ) {
			foreach ( $list( $ai['lockup_recommendations'] ) as $rec ) {
				$brand['lockups'][] = array( 'attachment_id' => 0, 'label' => wp_trim_words( $rec, 6, '…' ), 'usage' => $rec );
			}
		}
		if ( ! empty( $ai['imagery_style'] ) ) {
			$brand['imagery']['style'] = $str( $ai['imagery_style'] );
		}
		if ( ! empty( $ai['imagery_dos'] ) ) {
			$brand['imagery']['dos'] = $list( $ai['imagery_dos'] );
		}
		if ( ! empty( $ai['imagery_donts'] ) ) {
			$brand['imagery']['donts'] = $list( $ai['imagery_donts'] );
		}
		if ( ! empty( $ai['tone_attributes'] ) ) {
			$brand['tone']['enabled']    = true;
			$brand['tone']['attributes'] = array_slice( $list( $ai['tone_attributes'] ), 0, 3 );
		}
		if ( ! empty( $ai['tone_guidelines'] ) ) {
			$brand['tone']['enabled']    = true;
			$brand['tone']['guidelines'] = $str( $ai['tone_guidelines'] );
		}
		if ( ! empty( $ai['tone_examples'] ) && is_array( $ai['tone_examples'] ) ) {
			$brand['tone']['examples'] = array();
			foreach ( array_slice( $ai['tone_examples'], 0, 5 ) as $ex ) {
				$brand['tone']['examples'][] = array( 'do' => $str( $ex['do'] ?? '' ), 'dont' => $str( $ex['dont'] ?? '' ) );
			}
		}
		return $brand;
	}
}
