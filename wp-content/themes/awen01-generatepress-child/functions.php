<?php
/**
 * AWEN01 GeneratePress child theme.
 *
 * Content remains editable in WordPress through normal GeneratePress and
 * GenerateBlocks workflows. The theme supplies reusable visual motifs and
 * brand-standard extensions only.
 */

defined( 'ABSPATH' ) || exit;

const AWEN01_CHILD_VERSION = '0.1.5';

add_action( 'wp_enqueue_scripts', 'awen01_child_enqueue_assets', 20 );
add_action( 'enqueue_block_editor_assets', 'awen01_child_enqueue_assets', 20 );
add_action( 'after_setup_theme', 'awen01_child_setup' );
add_action( 'init', 'awen01_child_register_patterns' );
add_action( 'wp_body_open', 'awen01_child_print_global_motifs', 5 );

function awen01_child_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'custom-logo', array(
		'height'      => 68,
		'width'       => 68,
		'flex-height' => true,
		'flex-width'  => true,
	) );
}

function awen01_child_enqueue_assets() {
	wp_enqueue_style(
		'awen01-jost',
		'https://fonts.googleapis.com/css2?family=Jost:wght@300;700&display=swap',
		array(),
		null
	);

	wp_enqueue_style(
		'awen01-child',
		get_stylesheet_directory_uri() . '/assets/css/awen01.css',
		array( 'generate-style', 'awen01-jost' ),
		AWEN01_CHILD_VERSION
	);

	if ( ! is_admin() && function_exists( 'ultrabgs_enqueue_all_packs' ) ) {
		ultrabgs_enqueue_all_packs();
	}
}

add_filter( 'body_class', function ( $classes ) {
	$classes[] = 'awen01-brand';
	return $classes;
} );

add_filter( 'bsc_export_markdown', 'awen01_child_append_motion_to_brand_md', 10, 2 );
function awen01_child_append_motion_to_brand_md( $md, $brand ) {
	$motion = awen01_child_motion_standards_text();
	return str_replace(
		"\n---\nGenerated",
		"\n" . $motion . "\n---\nGenerated",
		$md
	);
}

add_filter( 'bsc_export_json', 'awen01_child_append_motion_to_brand_json', 10, 2 );
function awen01_child_append_motion_to_brand_json( $out, $brand ) {
	$out['motion'] = awen01_child_motion_standards_data();
	return $out;
}

add_filter( 'the_content', 'awen01_child_append_motion_to_guide' );
function awen01_child_append_motion_to_guide( $content ) {
	if ( ! is_page( 'brand-standards' ) || ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}

	return $content . awen01_child_motion_standards_section();
}

function awen01_child_motion_standards_data() {
	return array(
		'principle' => 'Motion is a brand motif, not decoration. It should feel like old starlore meeting living signal.',
		'implementation' => 'UltraBGs owns animated backgrounds. AWEN01 supplies brand presets, editor classes, and usage standards.',
		'aurora_borealis' => array(
			'class' => 'awen-aurora',
			'ultrabgs_pack' => 'awenaurora',
			'usage' => 'Use on immersive dark and threshold sections. Keep the gradient slow, soft, and text-safe.',
			'tempo' => '18s-34s loops, alternate direction, ease-in-out.',
			'reduced_motion' => 'Freeze at a calm gradient state when prefers-reduced-motion is enabled.',
		),
		'low_poly_node_matrix' => array(
			'class' => 'awen-node-matrix',
			'ultrabgs_pack' => 'awennodes',
			'usage' => 'Use as sparse connective tissue behind hero, music, writing, and portal sections. Never place dense nodes under body copy.',
			'behavior' => 'Nodes pulse, drift, and morph between triangular connections like a star map or mycelial network.',
			'reduced_motion' => 'Render a static, low-opacity node field.',
		),
		'editor_classes' => array(
			'awen-aurora',
			'awen-node-matrix',
			'awen-motif-field',
			'awen-mode-light',
			'awen-mode-transcendent',
		),
	);
}

function awen01_child_motion_standards_text() {
	return <<<'MD'

## Motion Motifs

Motion is a brand motif, not decoration. It should feel like old starlore meeting living signal.

AWEN01 animated backgrounds are implemented with the UltraBGs plugin so editors can control packs, color, density, opacity, and speed from the block editor.

### Aurora Borealis Field

- Class: `awen-aurora`
- UltraBGs pack: `awenaurora`
- Use on immersive dark and threshold sections.
- The gradient moves slowly, with labradorite green, aurora teal, opal violet, and spectral blue.
- Keep text over a dark overlay. Never put small text on high-frequency gradient areas.
- Loop tempo: 18s-34s, alternate direction, ease-in-out.
- Reduced motion: freeze at a calm gradient state.

### Low-Poly Node Matrix

- Class: `awen-node-matrix`
- UltraBGs pack: `awennodes`
- Use as sparse connective tissue behind hero, music, writing, and portal sections.
- Nodes pulse, drift, and morph between triangular connections like a star map or mycelial network.
- Keep opacity low. Never place dense nodes behind body copy.
- Reduced motion: render a static, low-opacity node field.

### WordPress Editing

Editors can use the UltraBGs panel on GenerateBlocks containers. For layered AWEN sections, use `awenaurora` on the main section and `awennodes` on an absolute child overlay. Keep `awen-aurora`, `awen-node-matrix`, and `awen-motif-field` as readable brand classes.

MD;
}

function awen01_child_motion_standards_section() {
	$aurora_config = awen01_child_ultrabgs_config_attr( array(
		'colors'  => array( '#08110f', '#36d6c7', '#a98bff' ),
		'opacity' => 0.86,
		'speed'   => 0.65,
		'density' => 0.74,
		'zIndex'  => 0,
		'fps'     => 18,
		'maxDpr'  => 0.65,
	) );
	$node_config = awen01_child_ultrabgs_config_attr( array(
		'colors'  => array( '#36d6c7', '#a98bff', '#6b9cff' ),
		'opacity' => 0.76,
		'speed'   => 0.5,
		'density' => 0.62,
		'zIndex'  => 1,
		'fps'     => 18,
		'maxDpr'  => 0.65,
	) );
	ob_start();
	?>
	<section class="awen-motion-standard awen-aurora" data-ultrabgs="awenaurora" data-ubgs-config="<?php echo $aurora_config; ?>">
		<div class="awen-ultrabgs-overlay" data-ultrabgs="awennodes" data-ubgs-config="<?php echo $node_config; ?>" aria-hidden="true"></div>
		<div class="awen-ultrabgs-shade" aria-hidden="true"></div>
		<div class="awen-motion-standard__inner">
			<p class="awen-motion-standard__eyebrow">Motion Motifs</p>
			<h2>Aurora fields and living node matrices.</h2>
			<p class="awen-motion-standard__lede">AWEN01 motion should feel like old starlore meeting living signal. Aurora borealis gradients create the atmospheric field; low-poly node matrices pulse and morph like a star map, mycelial intelligence, or a gentle technological omen.</p>
			<div class="awen-motion-standard__grid">
				<article>
					<span>Aurora</span>
					<h3><code>awen-aurora</code></h3>
					<p>Use on immersive dark or threshold sections. Keep the gradient slow, opalescent, and text-safe with a dark overlay.</p>
				</article>
				<article>
					<span>Nodes</span>
					<h3><code>awen-node-matrix</code></h3>
					<p>Use as sparse connective tissue. Fine lines connect circle nodes that pulse and drift. Keep density low behind copy.</p>
				</article>
				<article>
					<span>Editing</span>
					<h3>GenerateBlocks classes</h3>
					<p>Add motif classes to GenerateBlocks containers through Advanced > Additional CSS class(es). The layout remains editable in the normal block editor.</p>
				</article>
			</div>
		</div>
	</section>
	<?php
	return ob_get_clean();
}

function awen01_child_ultrabgs_config_attr( $config ) {
	return esc_attr( wp_json_encode( $config ) );
}

function awen01_child_print_global_motifs() {
	if ( is_admin() ) {
		return;
	}
	if ( is_front_page() ) {
		return;
	}

	$aurora_config = awen01_child_ultrabgs_config_attr( array(
		'colors'  => array( '#050b0a', '#36d6c7', '#a98bff' ),
		'opacity' => 0.56,
		'speed'   => 0.82,
		'density' => 0.92,
		'zIndex'  => 0,
		'fps'     => 16,
		'maxDpr'  => 0.6,
	) );
	$node_config = awen01_child_ultrabgs_config_attr( array(
		'colors'  => array( '#36d6c7', '#a98bff', '#6b9cff' ),
		'opacity' => 0.68,
		'speed'   => 0.72,
		'density' => 0.78,
		'zIndex'  => 1,
		'fps'     => 16,
		'maxDpr'  => 0.6,
	) );
	?>
	<div class="awen-global-bg awen-global-bg--aurora" data-ultrabgs="awenaurora" data-ubgs-config="<?php echo $aurora_config; ?>" aria-hidden="true"></div>
	<div class="awen-global-bg awen-global-bg--nodes" data-ultrabgs="awennodes" data-ubgs-config="<?php echo $node_config; ?>" aria-hidden="true"></div>
	<?php
}

function awen01_child_register_patterns() {
	if ( ! function_exists( 'register_block_pattern_category' ) || ! function_exists( 'register_block_pattern' ) ) {
		return;
	}

	register_block_pattern_category( 'awen01', array( 'label' => __( 'AWEN01', 'awen01' ) ) );

	$pattern = <<<'HTML'
<!-- wp:generateblocks/element {"uniqueId":"motf001","className":"gb-element-motf001 gb-element alignfull awen-motif-field awen-aurora awen-node-matrix","tagName":"section","align":"full","ultrabgsEnabled":true,"ultrabgsPack":"awenaurora","ultrabgsColors":["#08110f","#36d6c7","#a98bff"],"ultrabgsOpacity":0.86,"ultrabgsSpeed":0.65,"ultrabgsDensity":1.15,"ultrabgsZIndex":0,"htmlAttributes":{"data-ultrabgs":"awenaurora","data-ubgs-config":"{\"colors\":[\"#08110f\",\"#36d6c7\",\"#a98bff\"],\"opacity\":0.86,\"speed\":0.65,\"density\":1.15,\"zIndex\":0}"},"styles":{"backgroundColor":"var(--bsc-color-labradorite-ink)","overflow":"hidden","padding":"6rem 1.5rem","position":"relative"},"css":".gb-element-motf001{background-color:var(--bsc-color-labradorite-ink);overflow:hidden;padding:6rem 1.5rem;position:relative}@media(max-width:768px){.gb-element-motf001{padding:4rem 1.25rem}}"} -->
<section class="gb-element-motf001 gb-element alignfull awen-motif-field awen-aurora awen-node-matrix" data-ultrabgs="awenaurora" data-ubgs-config='{"colors":["#08110f","#36d6c7","#a98bff"],"opacity":0.86,"speed":0.65,"density":1.15,"zIndex":0}'>
<!-- wp:generateblocks/element {"uniqueId":"motf006","className":"gb-element-motf006 gb-element awen-ultrabgs-overlay","tagName":"div","ultrabgsEnabled":true,"ultrabgsPack":"awennodes","ultrabgsColors":["#36d6c7","#a98bff","#6b9cff"],"ultrabgsOpacity":0.76,"ultrabgsSpeed":0.5,"ultrabgsDensity":1.05,"ultrabgsZIndex":1,"htmlAttributes":{"aria-hidden":"true","data-ultrabgs":"awennodes","data-ubgs-config":"{\"colors\":[\"#36d6c7\",\"#a98bff\",\"#6b9cff\"],\"opacity\":0.76,\"speed\":0.5,\"density\":1.05,\"zIndex\":1}"},"styles":{"inset":"0","overflow":"hidden","pointerEvents":"none","position":"absolute","zIndex":"1"},"css":".gb-element-motf006{inset:0;overflow:hidden;pointer-events:none;position:absolute;z-index:1}"} -->
<div class="gb-element-motf006 gb-element awen-ultrabgs-overlay" aria-hidden="true" data-ultrabgs="awennodes" data-ubgs-config='{"colors":["#36d6c7","#a98bff","#6b9cff"],"opacity":0.76,"speed":0.5,"density":1.05,"zIndex":1}'></div>
<!-- /wp:generateblocks/element -->
<!-- wp:generateblocks/element {"uniqueId":"motf007","className":"gb-element-motf007 gb-element awen-ultrabgs-shade","tagName":"div","htmlAttributes":{"aria-hidden":"true"},"styles":{"inset":"0","pointerEvents":"none","position":"absolute","zIndex":"2"},"css":".gb-element-motf007{inset:0;pointer-events:none;position:absolute;z-index:2}"} -->
<div class="gb-element-motf007 gb-element awen-ultrabgs-shade" aria-hidden="true"></div>
<!-- /wp:generateblocks/element -->
<!-- wp:generateblocks/element {"uniqueId":"motf002","className":"gb-element-motf002 gb-element","tagName":"div","styles":{"margin":"0 auto","maxWidth":"760px","position":"relative","zIndex":"3"},"css":".gb-element-motf002{margin:0 auto;max-width:760px;position:relative;z-index:3}"} -->
<div class="gb-element-motf002 gb-element"><!-- wp:generateblocks/text {"uniqueId":"motf003","tagName":"p","styles":{"color":"var(--bsc-color-aurora-teal)","fontSize":"0.8125rem","fontWeight":"700","letterSpacing":"0.14em","marginBottom":"0.875rem","textTransform":"uppercase"},"css":".gb-text-motf003{color:var(--bsc-color-aurora-teal);font-size:0.8125rem;font-weight:700;letter-spacing:0.14em;margin-bottom:0.875rem;text-transform:uppercase}"} -->
<p class="gb-text gb-text-motf003">Motion Motif</p>
<!-- /wp:generateblocks/text -->
<!-- wp:generateblocks/text {"uniqueId":"motf004","tagName":"h2","styles":{"color":"var(--bsc-color-moon-white)","fontSize":"clamp(2rem,4vw,3.5rem)","fontWeight":"700","letterSpacing":"-0.02em","lineHeight":"1.08","marginBottom":"1rem"},"css":".gb-text-motf004{color:var(--bsc-color-moon-white);font-size:clamp(2rem,4vw,3.5rem);font-weight:700;letter-spacing:-0.02em;line-height:1.08;margin-bottom:1rem}"} -->
<h2 class="gb-text gb-text-motf004">A living field for threshold work.</h2>
<!-- /wp:generateblocks/text -->
<!-- wp:generateblocks/text {"uniqueId":"motf005","tagName":"p","styles":{"color":"rgba(247,248,251,0.76)","fontSize":"1.0625rem","fontWeight":"300","lineHeight":"1.75"},"css":".gb-text-motf005{color:rgba(247,248,251,.76);font-size:1.0625rem;font-weight:300;line-height:1.75}"} -->
<p class="gb-text gb-text-motf005">Use this pattern when a page needs AWEN01 smooth aurora motion and circle-node linework while staying fully editable as GenerateBlocks content.</p>
<!-- /wp:generateblocks/text --></div>
<!-- /wp:generateblocks/element --></section>
<!-- /wp:generateblocks/element -->
HTML;

	register_block_pattern( 'awen01/aurora-node-section', array(
		'title'       => __( 'AWEN01 Aurora + Node Section', 'awen01' ),
		'description' => __( 'Editable GenerateBlocks section with layered AWEN01 UltraBGs aurora and circle-node motifs.', 'awen01' ),
		'categories'  => array( 'awen01' ),
		'content'     => $pattern,
	) );
}
