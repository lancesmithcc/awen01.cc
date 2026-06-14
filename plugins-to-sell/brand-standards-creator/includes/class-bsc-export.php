<?php
/**
 * Exports.
 *
 *  - brand.json  — machine-readable, resolved asset URLs, contrast matrix included.
 *  - brand.md    — Markdown brief written *for AI agents*: tokens, rules, and
 *                  direct asset links so a model can execute the brand flawlessly.
 *  - Guide page  — auto-created WP page with the [brand_standards_guide] shortcode.
 *  - PDF         — the guide page ships a print stylesheet; the "Download PDF"
 *                  button prints to PDF with exact colors. (Zero server deps;
 *                  hook 'bsc_render_pdf' if you want to wire up dompdf later.)
 */

defined( 'ABSPATH' ) || exit;

class BSC_Export {

	public static function init() {
		add_action( 'bsc_brand_saved', array( __CLASS__, 'write_all' ) );
	}

	public static function dir() {
		$up = wp_get_upload_dir();
		return $up['basedir'] . '/brand-standards';
	}

	public static function url() {
		$up = wp_get_upload_dir();
		return $up['baseurl'] . '/brand-standards';
	}

	public static function ensure_dir() {
		wp_mkdir_p( self::dir() );
	}

	public static function write_all( $brand = null ) {
		$brand = $brand ?: BSC_Brand::get();
		self::ensure_dir();
		file_put_contents( self::dir() . '/brand.json', self::json( $brand ) ); // phpcs:ignore
		file_put_contents( self::dir() . '/brand.md', self::markdown( $brand ) ); // phpcs:ignore
	}

	/* ------------------------------------------------------------- JSON */

	public static function json( $brand ) {
		$out = $brand;

		// Resolve assets to URLs.
		foreach ( array( 'logos', 'lockups' ) as $group ) {
			foreach ( (array) $out[ $group ] as $i => $item ) {
				$out[ $group ][ $i ]['url'] = BSC_Brand::asset_url( $item['attachment_id'] ?? 0 );
			}
		}
		$out['imagery']['example_urls'] = array_values( array_filter( array_map(
			array( 'BSC_Brand', 'asset_url' ),
			(array) ( $brand['imagery']['examples'] ?? array() )
		) ) );

		// Computed: contrast matrix + resolved type scale.
		$out['computed'] = array(
			'contrast_matrix' => BSC_Contrast::matrix( (array) $brand['colors'] ),
			'type_scale_px'   => self::resolved_scale( $brand ),
			'spacing_px'      => self::resolved_spacing( $brand ),
			'tokens_css_url'  => self::url() . '/tokens.css',
		);

		$out = apply_filters( 'bsc_export_json', $out, $brand );
		return wp_json_encode( $out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
	}

	public static function resolved_scale( $brand ) {
		$base  = (float) ( $brand['typography']['scale']['base_px'] ?? 18 );
		$ratio = (float) ( $brand['typography']['scale']['ratio'] ?? 1.25 );
		$out   = array();
		foreach ( (array) ( $brand['typography']['scale']['levels'] ?? array() ) as $name => $step ) {
			$out[ $name ] = round( $base * pow( $ratio, (int) $step ), 1 );
		}
		return $out;
	}

	public static function resolved_spacing( $brand ) {
		$base = (float) ( $brand['spacing']['base_px'] ?? 8 );
		return array_map( function ( $m ) use ( $base ) {
			return round( $base * (float) $m, 1 );
		}, (array) ( $brand['spacing']['scale'] ?? array() ) );
	}

	/* --------------------------------------------------------- Markdown */

	public static function markdown( $brand ) {
		$b  = $brand;
		$nl = "\n";
		$md = '# ' . $b['identity']['name'] . ' — Brand Standards (AI Execution File)' . $nl . $nl;
		$md .= '> Machine-oriented brief. Follow every rule literally. Canonical JSON: ' . self::url() . '/brand.json' . $nl . $nl;

		if ( $b['identity']['tagline'] && ! empty( $b['sections']['identity'] ) ) {
			$md .= '**Tagline:** ' . $b['identity']['tagline'] . $nl . $nl;
		}
		if ( $b['identity']['mission'] && ! empty( $b['sections']['identity'] ) ) {
			$md .= '## Mission' . $nl . $b['identity']['mission'] . $nl . $nl;
		}

		// Colors.
		$md .= '## Color Palette' . $nl . $nl . '| Token | Name | Hex | Role | Usage |' . $nl . '|---|---|---|---|---|' . $nl;
		foreach ( (array) $b['colors'] as $c ) {
			$md .= sprintf( '| `--bsc-color-%s` | %s | `%s` | %s | %s |%s', $c['slug'], $c['name'], $c['hex'], $c['role'] ?? '', str_replace( "\n", ' ', $c['usage'] ?? '' ), $nl );
		}
		$md .= $nl . '### WCAG Contrast (use only passing pairs for text)' . $nl . $nl;
		$md .= '| FG on BG | Ratio | AA text | AAA text | UI (3:1) |' . $nl . '|---|---|---|---|---|' . $nl;
		foreach ( BSC_Contrast::matrix( (array) $b['colors'] ) as $m ) {
			$g  = $m['grade'];
			$md .= sprintf( '| %s on %s | %s:1 | %s | %s | %s |%s', $m['fg'], $m['bg'], $g['ratio'], $g['aa_normal'] ? '✅' : '❌', $g['aaa_normal'] ? '✅' : '❌', $g['ui_components'] ? '✅' : '❌', $nl );
		}

		// Typography.
		$md .= $nl . '## Typography' . $nl . $nl;
		foreach ( (array) $b['typography']['fonts'] as $f ) {
			$md .= sprintf( '- **%s:** %s (fallback: %s) — weights: %s — source: %s%s', ucfirst( $f['role'] ?? '' ), $f['family'] ?? '', $f['fallback'] ?? 'sans-serif', implode( ', ', (array) ( $f['weights'] ?? array() ) ), $f['source'] ?? '', $nl );
		}
		$md .= $nl . sprintf( 'Scale: base %spx, ratio %s. Resolved sizes:%s', $b['typography']['scale']['base_px'], $b['typography']['scale']['ratio'], $nl );
		foreach ( self::resolved_scale( $b ) as $name => $px ) {
			$md .= sprintf( '- %s: %spx (`--bsc-font-%s`)%s', $name, $px, $name, $nl );
		}
		$md .= sprintf( '%sLine heights — headings: %s, body: %s.%s', $nl, $b['typography']['line_height']['heading'], $b['typography']['line_height']['body'], $nl );
		if ( ! empty( $b['typography']['notes'] ) ) {
			$md .= $nl . $b['typography']['notes'] . $nl;
		}

		// Spacing & ratios.
		$md .= $nl . '## Spacing' . $nl . $nl . sprintf( 'Base unit: %spx. Scale (px): %s. Tokens: `--bsc-space-1` … `--bsc-space-%d`. Use ONLY these values for margins, padding, and gaps.%s', $b['spacing']['base_px'], implode( ', ', self::resolved_spacing( $b ) ), count( (array) $b['spacing']['scale'] ), $nl );

		// Grid & layout.
		$lay = (array) ( $b['layout'] ?? array() );
		if ( $lay ) {
			$md .= $nl . '## Grid & Layout' . $nl . $nl;
			$md .= sprintf( '- Grid: %d columns, %dpx gutters%s', (int) ( $lay['grid_columns'] ?? 12 ), (int) ( $lay['gutter_px'] ?? 24 ), $nl );
			$md .= sprintf( '- Page margins: %s — max content width: %dpx%s', $lay['margin'] ?? '', (int) ( $lay['max_width_px'] ?? 1200 ), $nl );
			foreach ( (array) ( $lay['principles'] ?? array() ) as $p ) {
				$md .= '- ' . $p . $nl;
			}
		}
		if ( ! empty( $b['ratios']['layout'] ) ) {
			$md .= $nl . '## Ratios' . $nl . $nl;
			foreach ( (array) $b['ratios']['layout'] as $r ) {
				$md .= sprintf( '- %s: %s%s', $r['label'] ?? '', $r['value'] ?? '', $nl );
			}
		}
		if ( ! empty( $b['ratios']['image_aspects'] ) ) {
			$md .= $nl . 'Allowed image aspect ratios: ' . implode( ', ', (array) $b['ratios']['image_aspects'] ) . $nl;
		}

		// Logos.
		$md .= $nl . '## Logo System' . $nl . $nl;
		foreach ( (array) $b['logos'] as $l ) {
			$url = BSC_Brand::asset_url( $l['attachment_id'] ?? 0 );
			$md .= sprintf( '- **%s** (%s): %s — min size: %spx — clearspace: %s — background: %s%s', $l['label'] ?? '', $l['variant'] ?? '', $url, $l['min_size_px'] ?? '?', $l['clearspace'] ?? '—', $l['background'] ?? 'any', $nl );
		}
		if ( ! empty( $b['lockups'] ) ) {
			$md .= $nl . '### Approved Lockups' . $nl;
			foreach ( (array) $b['lockups'] as $l ) {
				$md .= sprintf( '- **%s**: %s — %s%s', $l['label'] ?? '', BSC_Brand::asset_url( $l['attachment_id'] ?? 0 ), str_replace( "\n", ' ', $l['usage'] ?? '' ), $nl );
			}
		}
		$md .= $nl . '### Logo — DO' . $nl;
		foreach ( (array) $b['logo_rules']['dos'] as $d ) {
			$md .= '- ' . $d . $nl;
		}
		$md .= $nl . '### Logo — DO NOT' . $nl;
		foreach ( (array) $b['logo_rules']['donts'] as $d ) {
			$md .= '- ' . $d . $nl;
		}

		// Imagery.
		$md .= $nl . '## Imagery' . $nl . $nl . ( $b['imagery']['style'] ?: '' ) . $nl;
		if ( ! empty( $b['imagery']['treatments'] ) ) {
			$md .= $nl . 'Treatments: ' . $b['imagery']['treatments'] . $nl;
		}
		if ( ! empty( $b['imagery']['dos'] ) ) {
			$md .= $nl . '**Imagery — DO**' . $nl;
			foreach ( (array) $b['imagery']['dos'] as $d ) {
				$md .= '- ' . $d . $nl;
			}
		}
		if ( ! empty( $b['imagery']['donts'] ) ) {
			$md .= $nl . '**Imagery — DO NOT**' . $nl;
			foreach ( (array) $b['imagery']['donts'] as $d ) {
				$md .= '- ' . $d . $nl;
			}
		}
		foreach ( (array) ( $b['imagery']['examples'] ?? array() ) as $id ) {
			$u = BSC_Brand::asset_url( $id );
			if ( $u ) {
				$md .= '- Reference image: ' . $u . $nl;
			}
		}

		// Tone.
		if ( ! empty( $b['tone']['enabled'] ) && ! empty( $b['sections']['voice'] ) ) {
			$md .= $nl . '## Voice & Tone' . $nl . $nl;
			if ( ! empty( $b['tone']['attributes'] ) ) {
				$md .= 'Voice attributes: ' . implode( ', ', (array) $b['tone']['attributes'] ) . $nl . $nl;
			}
			$md .= ( $b['tone']['guidelines'] ?: '' ) . $nl;
			foreach ( (array) $b['tone']['examples'] as $ex ) {
				$md .= sprintf( '%s- ✅ Say: "%s"%s- ❌ Not: "%s"%s', $nl, $ex['do'] ?? '', $nl, $ex['dont'] ?? '', $nl );
			}
		}

		$md .= $nl . BSC_Principles::application_rules_md() . $nl;

		$md .= $nl . '---' . $nl . sprintf( 'Generated %s by Brand Standards Creator. Tokens stylesheet: %s/tokens.css%s', current_time( 'mysql' ), self::url(), $nl );

		return apply_filters( 'bsc_export_markdown', $md, $brand );
	}

	/* ------------------------------------------------------- Guide page */

	public static function ensure_guide_page() {
		$page_id = (int) get_option( 'bsc_guide_page_id' );
		if ( $page_id && 'publish' === get_post_status( $page_id ) ) {
			return $page_id;
		}
		$page_id = wp_insert_post( array(
			'post_title'   => 'Brand Standards',
			'post_name'    => 'brand-standards',
			'post_status'  => 'publish',
			'post_type'    => 'page',
			'post_content' => '<!-- wp:shortcode -->[brand_standards_guide]<!-- /wp:shortcode -->',
		) );
		update_option( 'bsc_guide_page_id', $page_id );
		return $page_id;
	}
}
