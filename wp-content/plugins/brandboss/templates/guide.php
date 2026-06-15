<?php
/**
 * Brand guide template — editorial standards-document layout.
 * The guide renders in the brand's own tokens: ink, paper, accent, faces.
 * Sections are optional and numbering is dynamic.
 */

defined( 'ABSPATH' ) || exit;

$b        = $brand;
$colors   = (array) $b['colors'];
$fonts    = (array) $b['typography']['fonts'];
$scale    = BSC_Export::resolved_scale( $b );
$spacing  = BSC_Export::resolved_spacing( $b );
$sections = (array) ( $b['sections'] ?? array( 'identity' => true, 'voice' => true, 'context' => true ) );
$lay      = (array) ( $b['layout'] ?? array() );

$font_for = function ( $role, $fallback_role = null ) use ( $fonts ) {
	foreach ( $fonts as $f ) {
		if ( ( $f['role'] ?? '' ) === $role && ! empty( $f['family'] ) ) {
			return $f;
		}
	}
	if ( $fallback_role ) {
		foreach ( $fonts as $f ) {
			if ( ( $f['role'] ?? '' ) === $fallback_role && ! empty( $f['family'] ) ) {
				return $f;
			}
		}
	}
	return null;
};
$heading_font = $font_for( 'display', 'heading' ) ?: $font_for( 'heading' );
$body_font    = $font_for( 'body' );

$color_by_role = function ( $role, $default ) use ( $colors ) {
	foreach ( $colors as $c ) {
		if ( ( $c['slug'] ?? '' ) === $role && ! empty( $c['hex'] ) ) {
			return $c['hex'];
		}
	}
	foreach ( $colors as $c ) {
		if ( ( $c['role'] ?? '' ) === $role && ! empty( $c['hex'] ) ) {
			return $c['hex'];
		}
	}
	return $default;
};
$ink     = $color_by_role( 'ink', '#1d1b18' );
$paper   = $color_by_role( 'surface', '#faf9f7' );
$accent  = $color_by_role( 'accent', $color_by_role( 'primary', '#8a7340' ) );
$primary = $color_by_role( 'primary', '#1d1b18' );

// Google fonts for true specimens.
$gfonts = array();
foreach ( $fonts as $f ) {
	if ( 'google' === ( $f['source'] ?? '' ) && ! empty( $f['family'] ) ) {
		$w        = ! empty( $f['weights'] ) ? ':wght@' . implode( ';', array_map( 'intval', (array) $f['weights'] ) ) : '';
		$gfonts[] = 'family=' . str_replace( ' ', '+', $f['family'] ) . $w;
	}
}
if ( $gfonts ) {
	printf( '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?%s&display=swap">', esc_attr( implode( '&', array_unique( $gfonts ) ) ) );
}

$exports = array(
	'pdf'    => '#print',
	'json'   => BSC_Export::url() . '/brand.json',
	'md'     => BSC_Export::url() . '/brand.md',
	'tokens' => BSC_Export::url() . '/tokens.css',
);

$num = 0;
$section_head = function ( $eyebrow, $title ) use ( &$num ) {
	$num++;
	printf(
		'<header class="bsc-g-shead bsc-reveal"><p class="bsc-g-eyebrow">%02d — %s</p><h2>%s</h2><div class="bsc-g-rule"><span></span></div></header>',
		$num,
		esc_html( strtoupper( $eyebrow ) ),
		esc_html( $title )
	);
};

$primary_logo_url = '';
foreach ( (array) $b['logos'] as $l ) {
	if ( 'primary' === ( $l['variant'] ?? '' ) ) {
		$primary_logo_url = BSC_Brand::asset_url( $l['attachment_id'] ?? 0 );
		break;
	}
}
if ( ! $primary_logo_url && ! empty( $b['logos'][0]['attachment_id'] ) ) {
	$primary_logo_url = BSC_Brand::asset_url( $b['logos'][0]['attachment_id'] );
}
?>
<div class="bsc-guide" style="
	--g-heading: '<?php echo esc_attr( $heading_font['family'] ?? 'Georgia' ); ?>', <?php echo esc_attr( $heading_font['fallback'] ?? 'serif' ); ?>;
	--g-body: '<?php echo esc_attr( $body_font['family'] ?? 'Helvetica' ); ?>', <?php echo esc_attr( $body_font['fallback'] ?? 'sans-serif' ); ?>;
	--g-ink: <?php echo esc_attr( $ink ); ?>;
	--g-paper: <?php echo esc_attr( $paper ); ?>;
	--g-accent: <?php echo esc_attr( $accent ); ?>;
	--g-primary: <?php echo esc_attr( $primary ); ?>;
">

	<!-- ============================================== Cover -->
	<header class="bsc-g-cover">
		<div class="bsc-g-cover-bar"></div>
		<p class="bsc-g-eyebrow bsc-g-eyebrow--light">BrandBoss Standards · Edition <?php echo esc_html( $b['meta']['version'] ); ?>.0</p>
		<?php if ( $primary_logo_url ) : ?>
			<img class="bsc-g-cover-logo" src="<?php echo esc_url( $primary_logo_url ); ?>" alt="<?php echo esc_attr( $b['identity']['name'] ); ?>">
		<?php endif; ?>
		<h1><?php echo esc_html( $b['identity']['name'] ); ?></h1>
		<?php if ( $b['identity']['tagline'] && ! empty( $sections['identity'] ) ) : ?>
			<p class="bsc-g-tagline"><?php echo esc_html( $b['identity']['tagline'] ); ?></p>
		<?php endif; ?>
		<div class="bsc-g-downloads">
			<button class="bsc-g-btn" onclick="window.print()">↓ PDF</button>
			<a class="bsc-g-btn" href="<?php echo esc_url( $exports['md'] ); ?>" download>↓ Markdown</a>
			<a class="bsc-g-btn" href="<?php echo esc_url( $exports['json'] ); ?>" download>↓ JSON</a>
			<a class="bsc-g-btn bsc-g-btn--ghost" href="<?php echo esc_url( $exports['tokens'] ); ?>" download>tokens.css</a>
		</div>
		<p class="bsc-g-cover-foot"><?php echo esc_html( mysql2date( 'Y', $b['meta']['updated'] ?: current_time( 'mysql' ) ) ); ?> · The single source of truth for the <?php echo esc_html( $b['identity']['name'] ); ?> identity.</p>
	</header>

	<?php if ( ! empty( $sections['identity'] ) && $b['identity']['mission'] ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'The Brand', 'Mission' ); ?>
		<p class="bsc-g-lede bsc-reveal"><?php echo nl2br( esc_html( $b['identity']['mission'] ) ); ?></p>
	</section>
	<?php endif; ?>

	<?php if ( $b['logos'] ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'The Logo', 'The Primary System' ); ?>
		<div class="bsc-g-logos">
			<?php foreach ( $b['logos'] as $l ) :
				$url = BSC_Brand::asset_url( $l['attachment_id'] ?? 0 );
				if ( ! $url ) { continue; } ?>
				<figure class="bsc-g-logo bsc-g-logo--<?php echo esc_attr( $l['background'] ?? 'any' ); ?> bsc-reveal">
					<img src="<?php echo esc_url( $url ); ?>" alt="<?php echo esc_attr( $l['label'] ?? '' ); ?>">
					<figcaption>
						<strong><?php echo esc_html( $l['label'] ?? '' ); ?></strong> · <?php echo esc_html( $l['variant'] ?? '' ); ?><br>
						Min <?php echo esc_html( $l['min_size_px'] ?? '—' ); ?>px · Clearspace: <?php echo esc_html( $l['clearspace'] ?? '—' ); ?>
					</figcaption>
				</figure>
			<?php endforeach; ?>
		</div>

		<?php if ( $b['lockups'] ) : ?>
		<h3 class="bsc-g-sub bsc-reveal">Approved lockups</h3>
		<div class="bsc-g-logos">
			<?php foreach ( $b['lockups'] as $l ) :
				$url = BSC_Brand::asset_url( $l['attachment_id'] ?? 0 ); ?>
				<figure class="bsc-g-logo bsc-reveal">
					<?php if ( $url ) : ?><img src="<?php echo esc_url( $url ); ?>" alt=""><?php endif; ?>
					<figcaption><strong><?php echo esc_html( $l['label'] ?? '' ); ?></strong><br><?php echo esc_html( $l['usage'] ?? '' ); ?></figcaption>
				</figure>
			<?php endforeach; ?>
		</div>
		<?php endif; ?>

		<div class="bsc-g-rules-grid">
			<div class="bsc-g-do bsc-reveal">
				<h3>Do</h3>
				<ul><?php foreach ( (array) $b['logo_rules']['dos'] as $d ) : ?><li><?php echo esc_html( $d ); ?></li><?php endforeach; ?></ul>
			</div>
			<div class="bsc-g-dont bsc-reveal">
				<h3>Never</h3>
				<ul><?php foreach ( (array) $b['logo_rules']['donts'] as $d ) : ?><li><?php echo esc_html( $d ); ?></li><?php endforeach; ?></ul>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $colors ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'Colour', 'Full Colour System' ); ?>
		<div class="bsc-g-swatches">
			<?php foreach ( $colors as $c ) : ?>
				<div class="bsc-g-swatch bsc-reveal">
					<div class="bsc-g-chip" style="background:<?php echo esc_attr( $c['hex'] ); ?>"></div>
					<strong><?php echo esc_html( $c['name'] ); ?></strong>
					<code><?php echo esc_html( strtoupper( $c['hex'] ) ); ?> · <?php echo esc_html( implode( ' ', BSC_Color::hex_to_rgb( $c['hex'] ) ) ); ?></code>
					<span class="bsc-g-role"><?php echo esc_html( $c['role'] ?? '' ); ?></span>
					<?php if ( ! empty( $c['usage'] ) ) : ?><p><?php echo esc_html( $c['usage'] ); ?></p><?php endif; ?>
				</div>
			<?php endforeach; ?>
		</div>

		<h3 class="bsc-g-sub bsc-reveal">Ratios &amp; accessibility — approved text pairings</h3>
		<div class="bsc-g-tablewrap bsc-reveal">
		<table class="bsc-g-table">
			<tr><th>Pairing</th><th>Ratio</th><th>AA text</th><th>AAA text</th><th>UI 3:1</th></tr>
			<?php
			$fg_set = array( 'ink', 'muted', 'primary', 'primary-text', 'accent', 'surface', 'success', 'warning', 'danger' );
			$bg_set = array( 'surface', 'bg', 'primary', 'secondary', 'ink' );
			foreach ( BSC_Contrast::matrix( $colors ) as $m ) :
				$g = $m['grade'];
				if ( ! $g['aa_large'] ) { continue; } // doc shows approved pairings; sub-3:1 noise omitted
				if ( ! in_array( $m['fg'], $fg_set, true ) || ! in_array( $m['bg'], $bg_set, true ) ) { continue; }
				$fg = $bg = null;
				foreach ( $colors as $c ) {
					if ( $c['slug'] === $m['fg'] ) { $fg = $c; }
					if ( $c['slug'] === $m['bg'] ) { $bg = $c; }
				}
				if ( ! $fg || ! $bg ) { continue; } ?>
				<tr>
					<td><span class="bsc-g-pair" style="color:<?php echo esc_attr( $fg['hex'] ); ?>;background:<?php echo esc_attr( $bg['hex'] ); ?>">Aa</span> <?php echo esc_html( $fg['name'] . ' on ' . $bg['name'] ); ?></td>
					<td><?php echo esc_html( $g['ratio'] ); ?>:1</td>
					<td class="<?php echo $g['aa_normal'] ? 'pass' : 'fail'; ?>"><?php echo $g['aa_normal'] ? 'Pass' : 'Large only'; ?></td>
					<td class="<?php echo $g['aaa_normal'] ? 'pass' : 'fail'; ?>"><?php echo $g['aaa_normal'] ? 'Pass' : '—'; ?></td>
					<td class="<?php echo $g['ui_components'] ? 'pass' : 'fail'; ?>"><?php echo $g['ui_components'] ? 'Pass' : '—'; ?></td>
				</tr>
			<?php endforeach; ?>
		</table>
		</div>
	</section>
	<?php endif; ?>

	<?php if ( $fonts ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'Typography', 'The Type System' ); ?>
		<?php foreach ( $fonts as $f ) :
			if ( empty( $f['family'] ) ) { continue; } ?>
			<div class="bsc-g-specimen bsc-reveal" style="font-family:'<?php echo esc_attr( $f['family'] ); ?>', <?php echo esc_attr( $f['fallback'] ?: 'sans-serif' ); ?>">
				<p class="bsc-g-specimen-big">Aa</p>
				<div>
					<span class="bsc-g-role"><?php echo esc_html( $f['role'] ); ?></span>
					<strong class="bsc-g-specimen-name"><?php echo esc_html( $f['family'] ); ?></strong>
					<p>ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</p>
					<small>Weights: <?php echo esc_html( implode( ', ', (array) ( $f['weights'] ?? array() ) ) ?: '—' ); ?> · Source: <?php echo esc_html( $f['source'] ?? '' ); ?> · Fallback: <?php echo esc_html( $f['fallback'] ?: '—' ); ?></small>
				</div>
			</div>
		<?php endforeach; ?>

		<h3 class="bsc-g-sub bsc-reveal">Hierarchy &amp; usage — base <?php echo esc_html( $b['typography']['scale']['base_px'] ); ?>px · ratio <?php echo esc_html( $b['typography']['scale']['ratio'] ); ?></h3>
		<div class="bsc-g-scale bsc-reveal">
			<?php arsort( $scale );
			foreach ( $scale as $name => $px ) : ?>
				<div class="bsc-g-scale-row">
					<code><?php echo esc_html( $name ); ?> · <?php echo esc_html( $px ); ?>px</code>
					<p style="font-size:<?php echo esc_attr( min( $px, 88 ) ); ?>px; line-height:<?php echo esc_attr( $px >= 32 ? $b['typography']['line_height']['heading'] : $b['typography']['line_height']['body'] ); ?>">The quiet authority of a well-set page</p>
				</div>
			<?php endforeach; ?>
		</div>
		<?php if ( $b['typography']['notes'] ) : ?><p class="bsc-g-note bsc-reveal"><?php echo nl2br( esc_html( $b['typography']['notes'] ) ); ?></p><?php endif; ?>
	</section>
	<?php endif; ?>

	<section class="bsc-g-section">
		<?php $section_head( 'Layout', 'Spacing, Grid & Layout' ); ?>

		<div class="bsc-g-cols bsc-reveal">
			<div>
				<h3 class="bsc-g-sub">The grid</h3>
				<div class="bsc-g-gridviz" style="--cols:<?php echo (int) ( $lay['grid_columns'] ?? 12 ); ?>; --gut:<?php echo (int) ( $lay['gutter_px'] ?? 24 ); ?>px">
					<?php for ( $i = 0; $i < (int) ( $lay['grid_columns'] ?? 12 ); $i++ ) : ?><span></span><?php endfor; ?>
				</div>
				<ul class="bsc-g-specs">
					<li><strong><?php echo (int) ( $lay['grid_columns'] ?? 12 ); ?> columns</strong> · <?php echo (int) ( $lay['gutter_px'] ?? 24 ); ?>px gutters</li>
					<li>Page margins: <strong><?php echo esc_html( $lay['margin'] ?? '—' ); ?></strong></li>
					<li>Max content width: <strong><?php echo (int) ( $lay['max_width_px'] ?? 1200 ); ?>px</strong></li>
				</ul>
			</div>
			<div>
				<h3 class="bsc-g-sub">The spacing scale — base <?php echo esc_html( $b['spacing']['base_px'] ); ?>px</h3>
				<div class="bsc-g-spacing">
					<?php foreach ( $spacing as $i => $px ) : ?>
						<div class="bsc-g-space-row">
							<code>space-<?php echo (int) $i + 1; ?></code>
							<span class="bsc-g-space-bar" style="width:<?php echo esc_attr( min( $px, 320 ) ); ?>px"></span>
							<small><?php echo esc_html( $px ); ?>px</small>
						</div>
					<?php endforeach; ?>
				</div>
				<?php if ( $b['spacing']['notes'] ) : ?><p class="bsc-g-note"><?php echo esc_html( $b['spacing']['notes'] ); ?></p><?php endif; ?>
			</div>
		</div>

		<?php if ( ! empty( $lay['principles'] ) ) : ?>
		<h3 class="bsc-g-sub bsc-reveal">Composition rules</h3>
		<ul class="bsc-g-principles bsc-reveal">
			<?php foreach ( (array) $lay['principles'] as $p ) : ?><li><?php echo esc_html( $p ); ?></li><?php endforeach; ?>
		</ul>
		<?php endif; ?>

		<?php if ( $b['ratios']['layout'] || $b['ratios']['image_aspects'] ) : ?>
		<div class="bsc-g-cols bsc-reveal">
			<?php if ( $b['ratios']['layout'] ) : ?>
			<div>
				<h3 class="bsc-g-sub">Ratios</h3>
				<ul class="bsc-g-specs"><?php foreach ( (array) $b['ratios']['layout'] as $r ) : ?><li><strong><?php echo esc_html( $r['label'] ?? '' ); ?>:</strong> <?php echo esc_html( $r['value'] ?? '' ); ?></li><?php endforeach; ?></ul>
			</div>
			<?php endif; ?>
			<?php if ( $b['ratios']['image_aspects'] ) : ?>
			<div>
				<h3 class="bsc-g-sub">Crop ratios</h3>
				<div class="bsc-g-crops"><?php foreach ( (array) $b['ratios']['image_aspects'] as $a ) : ?><span class="bsc-g-crop"><?php echo esc_html( $a ); ?></span><?php endforeach; ?></div>
			</div>
			<?php endif; ?>
		</div>
		<?php endif; ?>
	</section>

	<?php if ( $b['imagery']['style'] || $b['imagery']['dos'] || $b['imagery']['donts'] ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'Imagery', 'Photography & Imagery' ); ?>
		<?php if ( $b['imagery']['style'] ) : ?><p class="bsc-g-lede bsc-reveal"><?php echo nl2br( esc_html( $b['imagery']['style'] ) ); ?></p><?php endif; ?>
		<?php if ( $b['imagery']['treatments'] ) : ?><p class="bsc-g-note bsc-reveal"><strong>Treatment:</strong> <?php echo nl2br( esc_html( $b['imagery']['treatments'] ) ); ?></p><?php endif; ?>
		<div class="bsc-g-rules-grid">
			<?php if ( $b['imagery']['dos'] ) : ?><div class="bsc-g-do bsc-reveal"><h3>Shoot for</h3><ul><?php foreach ( (array) $b['imagery']['dos'] as $d ) : ?><li><?php echo esc_html( $d ); ?></li><?php endforeach; ?></ul></div><?php endif; ?>
			<?php if ( $b['imagery']['donts'] ) : ?><div class="bsc-g-dont bsc-reveal"><h3>Avoid</h3><ul><?php foreach ( (array) $b['imagery']['donts'] as $d ) : ?><li><?php echo esc_html( $d ); ?></li><?php endforeach; ?></ul></div><?php endif; ?>
		</div>
		<?php if ( $b['imagery']['examples'] ) : ?>
		<div class="bsc-g-img-grid">
			<?php foreach ( (array) $b['imagery']['examples'] as $id ) :
				$u = BSC_Brand::asset_url( $id, 'large' );
				if ( $u ) : ?><img class="bsc-reveal" src="<?php echo esc_url( $u ); ?>" alt=""><?php endif;
			endforeach; ?>
		</div>
		<?php endif; ?>
	</section>
	<?php endif; ?>

	<?php if ( ! empty( $sections['voice'] ) && ( $b['tone']['guidelines'] || $b['tone']['attributes'] ) ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'Voice', 'Voice & Tone' ); ?>
		<?php if ( $b['tone']['attributes'] ) : ?>
			<p class="bsc-g-attrs bsc-reveal"><?php echo esc_html( implode( '  ·  ', (array) $b['tone']['attributes'] ) ); ?></p>
		<?php endif; ?>
		<?php if ( $b['tone']['guidelines'] ) : ?><p class="bsc-reveal"><?php echo nl2br( esc_html( $b['tone']['guidelines'] ) ); ?></p><?php endif; ?>
		<?php if ( $b['tone']['examples'] ) : ?>
		<div class="bsc-g-tablewrap bsc-reveal">
		<table class="bsc-g-table">
			<tr><th>Say</th><th>Not</th></tr>
			<?php foreach ( (array) $b['tone']['examples'] as $ex ) : ?>
				<tr><td class="pass">“<?php echo esc_html( $ex['do'] ?? '' ); ?>”</td><td class="fail">“<?php echo esc_html( $ex['dont'] ?? '' ); ?>”</td></tr>
			<?php endforeach; ?>
		</table>
		</div>
		<?php endif; ?>
	</section>
	<?php endif; ?>

	<?php if ( ! empty( $sections['context'] ) && ! empty( $b['context']['items'] ) ) : ?>
	<section class="bsc-g-section">
		<?php $section_head( 'In Context', 'Brand In Application' ); ?>
		<?php if ( ! empty( $b['context']['intro'] ) ) : ?><p class="bsc-g-lede bsc-reveal"><?php echo esc_html( $b['context']['intro'] ); ?></p><?php endif; ?>
		<div class="bsc-g-apps">
			<?php foreach ( (array) $b['context']['items'] as $item ) :
				$u = BSC_Brand::asset_url( $item['attachment_id'] ?? 0, 'large' );
				if ( ! $u ) { continue; } ?>
				<figure class="bsc-g-app bsc-reveal">
					<img src="<?php echo esc_url( $u ); ?>" alt="">
					<?php if ( ! empty( $item['caption'] ) ) : ?><figcaption><?php echo esc_html( $item['caption'] ); ?></figcaption><?php endif; ?>
				</figure>
			<?php endforeach; ?>
		</div>
	</section>
	<?php endif; ?>

	<!-- ============================================== Back cover / downloads -->
	<footer class="bsc-g-back">
		<div class="bsc-g-back-inner">
			<?php if ( $primary_logo_url ) : ?><img class="bsc-g-back-logo" src="<?php echo esc_url( $primary_logo_url ); ?>" alt=""><?php endif; ?>
			<p class="bsc-g-eyebrow bsc-g-eyebrow--light">Take the standard with you</p>
			<div class="bsc-g-downloads">
				<button class="bsc-g-btn" onclick="window.print()">↓ PDF — full document</button>
				<a class="bsc-g-btn" href="<?php echo esc_url( $exports['md'] ); ?>" download>↓ brand.md — AI execution brief</a>
				<a class="bsc-g-btn" href="<?php echo esc_url( $exports['json'] ); ?>" download>↓ brand.json — machine readable</a>
				<a class="bsc-g-btn bsc-g-btn--ghost" href="<?php echo esc_url( $exports['tokens'] ); ?>" download>tokens.css</a>
			</div>
			<p class="bsc-g-cover-foot"><?php echo esc_html( $b['identity']['name'] ); ?> · BrandBoss Standards · Updated <?php echo esc_html( mysql2date( 'F j, Y', $b['meta']['updated'] ?: current_time( 'mysql' ) ) ); ?></p>
		</div>
	</footer>
</div>
<script>
( function () {
	var root = document.querySelector( '.bsc-guide' );
	if ( ! root ) { return; }
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches || ! ( 'IntersectionObserver' in window ) ) {
		return; // no .bsc-js class → content fully visible, no motion
	}
	root.classList.add( 'bsc-js' );
	var io = new IntersectionObserver( function ( entries ) {
		entries.forEach( function ( e ) {
			if ( e.isIntersecting ) { e.target.classList.add( 'is-in' ); io.unobserve( e.target ); }
		} );
	}, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 } );
	root.querySelectorAll( '.bsc-reveal' ).forEach( function ( n ) { io.observe( n ); } );
	window.addEventListener( 'beforeprint', function () {
		root.querySelectorAll( '.bsc-reveal' ).forEach( function ( n ) { n.classList.add( 'is-in' ); } );
	} );
}() );
</script>
