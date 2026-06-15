<?php
/**
 * UltraBGs — admin settings page.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function ultrabgs_admin_menu() {
	add_options_page(
		__( 'UltraBGs', 'ultrabgs' ),
		__( 'UltraBGs', 'ultrabgs' ),
		'manage_options',
		'ultrabgs',
		'ultrabgs_render_settings_page'
	);
}
add_action( 'admin_menu', 'ultrabgs_admin_menu' );

function ultrabgs_register_settings() {
	register_setting( 'ultrabgs', 'ultrabgs_settings', array(
		'type'              => 'array',
		'sanitize_callback' => 'ultrabgs_sanitize_settings',
		'default'           => array(),
	) );
}
add_action( 'admin_init', 'ultrabgs_register_settings' );

function ultrabgs_sanitize_settings( $input ) {
	$d   = ultrabgs_default_settings();
	$in  = is_array( $input ) ? $input : array();
	$ids = array_keys( ultrabgs_get_packs() );

	$pack = isset( $in['pack'] ) ? sanitize_key( $in['pack'] ) : $d['pack'];

	return array(
		'enabled' => empty( $in['enabled'] ) ? 0 : 1,
		'pack'    => in_array( $pack, $ids, true ) ? $pack : $d['pack'],
		'color1'  => sanitize_hex_color( $in['color1'] ?? '' ) ?: $d['color1'],
		'color2'  => sanitize_hex_color( $in['color2'] ?? '' ) ?: $d['color2'],
		'color3'  => sanitize_hex_color( $in['color3'] ?? '' ) ?: $d['color3'],
		'opacity' => min( 1, max( 0, (float) ( $in['opacity'] ?? $d['opacity'] ) ) ),
		'speed'   => min( 3, max( 0.1, (float) ( $in['speed'] ?? $d['speed'] ) ) ),
		'density' => min( 2, max( 0.3, (float) ( $in['density'] ?? $d['density'] ) ) ),
		'zindex'  => (int) ( $in['zindex'] ?? $d['zindex'] ),
	);
}

function ultrabgs_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$tab   = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'settings'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$base  = admin_url( 'options-general.php?page=ultrabgs' );
	$s     = ultrabgs_get_settings();
	$packs = ultrabgs_get_packs();
	?>
	<div class="wrap">
		<h1>UltraBGs <small style="font-weight:normal;color:#777;">by AWEN01</small></h1>
		<nav class="nav-tab-wrapper">
			<a href="<?php echo esc_url( $base ); ?>" class="nav-tab <?php echo 'settings' === $tab ? 'nav-tab-active' : ''; ?>"><?php esc_html_e( 'Settings', 'ultrabgs' ); ?></a>
			<a href="<?php echo esc_url( $base . '&tab=showcase' ); ?>" class="nav-tab <?php echo 'showcase' === $tab ? 'nav-tab-active' : ''; ?>"><?php esc_html_e( 'Showcase', 'ultrabgs' ); ?></a>
			<a href="<?php echo esc_url( $base . '&tab=contributors' ); ?>" class="nav-tab <?php echo 'contributors' === $tab ? 'nav-tab-active' : ''; ?>"><?php esc_html_e( 'Contributors', 'ultrabgs' ); ?></a>
		</nav>
		<?php
		if ( 'showcase' === $tab ) {
			ultrabgs_render_showcase_tab();
			echo '</div>';
			return;
		}
		if ( 'contributors' === $tab ) {
			ultrabgs_render_contributors_tab();
			echo '</div>';
			return;
		}
		?>
		<p><?php esc_html_e( 'Full-page animated background layer. Per-block layers are configured in the block editor sidebar (UltraBGs panel on any block).', 'ultrabgs' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'ultrabgs' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Full-page layer', 'ultrabgs' ); ?></th>
					<td><label><input type="checkbox" name="ultrabgs_settings[enabled]" value="1" <?php checked( $s['enabled'], 1 ); ?>> <?php esc_html_e( 'Enable on the whole site', 'ultrabgs' ); ?></label></td>
				</tr>
				<tr>
					<th scope="row"><label for="ubgs-pack"><?php esc_html_e( 'Animation pack', 'ultrabgs' ); ?></label></th>
					<td>
						<select id="ubgs-pack" name="ultrabgs_settings[pack]">
							<?php foreach ( $packs as $id => $pack ) : ?>
								<option value="<?php echo esc_attr( $id ); ?>" <?php selected( $s['pack'], $id ); ?>><?php echo esc_html( $pack['label'] ); ?></option>
							<?php endforeach; ?>
						</select>
						<p class="description"><?php esc_html_e( 'Add-on plugins can register more packs.', 'ultrabgs' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Colors', 'ultrabgs' ); ?></th>
					<td>
						<input type="color" name="ultrabgs_settings[color1]" value="<?php echo esc_attr( $s['color1'] ); ?>">
						<input type="color" name="ultrabgs_settings[color2]" value="<?php echo esc_attr( $s['color2'] ); ?>">
						<input type="color" name="ultrabgs_settings[color3]" value="<?php echo esc_attr( $s['color3'] ); ?>">
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="ubgs-opacity"><?php esc_html_e( 'Opacity', 'ultrabgs' ); ?></label></th>
					<td><input id="ubgs-opacity" type="number" step="0.05" min="0" max="1" name="ultrabgs_settings[opacity]" value="<?php echo esc_attr( $s['opacity'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="ubgs-speed"><?php esc_html_e( 'Speed', 'ultrabgs' ); ?></label></th>
					<td><input id="ubgs-speed" type="number" step="0.1" min="0.1" max="3" name="ultrabgs_settings[speed]" value="<?php echo esc_attr( $s['speed'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="ubgs-density"><?php esc_html_e( 'Density / detail', 'ultrabgs' ); ?></label></th>
					<td><input id="ubgs-density" type="number" step="0.1" min="0.3" max="2" name="ultrabgs_settings[density]" value="<?php echo esc_attr( $s['density'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="ubgs-zindex"><?php esc_html_e( 'Z-index', 'ultrabgs' ); ?></label></th>
					<td>
						<input id="ubgs-zindex" type="number" step="1" name="ultrabgs_settings[zindex]" value="<?php echo esc_attr( $s['zindex'] ); ?>">
						<p class="description"><?php esc_html_e( '-1 sits behind page content; raise it to float above backgrounds set by your theme.', 'ultrabgs' ); ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

function ultrabgs_admin_feature_styles() {
	?>
	<style>
		.ubgs-feature{max-width:1120px}
		.ubgs-hero{background:#101414;border-radius:12px;color:#f7f8f4;margin:20px 0 18px;overflow:hidden;padding:clamp(26px,4vw,48px);position:relative}
		.ubgs-hero::after{background:radial-gradient(circle at 78% 18%,rgba(54,214,199,.26),transparent 32%),linear-gradient(125deg,transparent 58%,rgba(169,139,255,.12) 58.2%);content:"";inset:0;position:absolute}
		.ubgs-hero>*{max-width:760px;position:relative;z-index:1}
		.ubgs-hero h2{color:#f7f8f4;font-size:clamp(30px,4vw,52px);line-height:1.04;margin:0 0 12px}
		.ubgs-hero p{color:rgba(247,248,244,.78);font-size:16px;line-height:1.7;margin:0}
		.ubgs-kicker{color:#36d6c7!important;font-size:11px!important;font-weight:700;letter-spacing:.15em;margin:0 0 10px!important;text-transform:uppercase}
		.ubgs-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:18px}
		.ubgs-pack{background:#fff;border:1px solid #c3c4c7;border-radius:10px;overflow:hidden}
		.ubgs-preview{background:#08110f;height:180px;overflow:hidden;position:relative}
		.ubgs-preview::before,.ubgs-preview::after{content:"";inset:-24%;position:absolute}
		.ubgs-preview--aurora::before{animation:ubgs-drift 10s ease-in-out infinite alternate;background:linear-gradient(110deg,transparent 15%,rgba(54,214,199,.1) 30%,rgba(169,139,255,.38) 48%,rgba(54,214,199,.22) 62%,transparent 82%);filter:blur(18px);transform:skewY(-8deg)}
		.ubgs-preview--aurora::after{animation:ubgs-drift 13s ease-in-out infinite alternate-reverse;background:radial-gradient(circle at 60% 36%,rgba(107,156,255,.34),transparent 34%);filter:blur(22px)}
		.ubgs-preview--nodes::before{background:linear-gradient(28deg,transparent 0 22%,rgba(54,214,199,.24) 22.4% 22.8%,transparent 23%),linear-gradient(145deg,transparent 0 42%,rgba(169,139,255,.26) 42.3% 42.8%,transparent 43%),linear-gradient(90deg,transparent 0 58%,rgba(107,156,255,.22) 58.3% 58.8%,transparent 59%)}
		.ubgs-preview--nodes::after{animation:ubgs-pulse 3.2s ease-in-out infinite;background:radial-gradient(circle at 18% 64%,#36d6c7 0 4px,transparent 5px),radial-gradient(circle at 42% 22%,#a98bff 0 5px,transparent 6px),radial-gradient(circle at 70% 48%,#6b9cff 0 5px,transparent 6px),radial-gradient(circle at 86% 76%,#36d6c7 0 4px,transparent 5px)}
		.ubgs-preview--halftone::before{animation:ubgs-drift 9s linear infinite;background:radial-gradient(circle,rgba(54,214,199,.65) 0 2px,transparent 3px) 0 0/18px 18px}
		.ubgs-preview--smoke::before{animation:ubgs-drift 12s ease-in-out infinite alternate;background:radial-gradient(circle at 30% 50%,rgba(169,139,255,.34),transparent 30%),radial-gradient(circle at 70% 40%,rgba(54,214,199,.22),transparent 34%);filter:blur(24px)}
		.ubgs-preview--hexcubes::before{background:linear-gradient(30deg,rgba(54,214,199,.22) 12%,transparent 12.5% 87%,rgba(54,214,199,.22) 87.5%),linear-gradient(150deg,rgba(169,139,255,.2) 12%,transparent 12.5% 87%,rgba(169,139,255,.2) 87.5%);background-size:48px 84px;animation:ubgs-drift 16s linear infinite}
		.ubgs-preview--lowpoly::before{background:linear-gradient(38deg,transparent 0 32%,rgba(54,214,199,.24) 32.3% 32.8%,transparent 33%),linear-gradient(118deg,transparent 0 47%,rgba(169,139,255,.22) 47.3% 47.8%,transparent 48%),linear-gradient(165deg,transparent 0 68%,rgba(107,156,255,.22) 68.3% 68.8%,transparent 69%)}
		.ubgs-pack-body{padding:18px}
		.ubgs-pack-body h3{font-size:17px;margin:0 0 7px}
		.ubgs-pack-body p{color:#50575e;line-height:1.6;margin:0 0 12px}
		.ubgs-pill{background:#eef8f6;border:1px solid #cce7e1;border-radius:999px;color:#0a584d;display:inline-flex;font-size:11px;font-weight:700;letter-spacing:.08em;padding:5px 9px;text-transform:uppercase}
		@keyframes ubgs-drift{from{transform:translate3d(-4%,-2%,0) scale(1.05)}to{transform:translate3d(5%,3%,0) scale(1.12)}}
		@keyframes ubgs-pulse{0%,100%{opacity:.72;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
		@media(prefers-reduced-motion:reduce){.ubgs-feature *{animation:none!important}}
	</style>
	<?php
}

function ultrabgs_preview_class_for_pack( $id ) {
	if ( false !== strpos( $id, 'aurora' ) ) {
		return 'aurora';
	}
	if ( false !== strpos( $id, 'node' ) || false !== strpos( $id, 'lowpoly' ) ) {
		return 'nodes';
	}
	if ( false !== strpos( $id, 'half' ) ) {
		return 'halftone';
	}
	if ( false !== strpos( $id, 'smoke' ) ) {
		return 'smoke';
	}
	if ( false !== strpos( $id, 'hex' ) ) {
		return 'hexcubes';
	}
	return 'aurora';
}

function ultrabgs_pack_description( $id ) {
	$descriptions = array(
		'awenaurora' => __( 'A smooth AWEN01 aurora field: blurred opalescent ribbons with pointer-reactive lift and shimmer.', 'ultrabgs' ),
		'awennodes' => __( 'A solid-node line matrix for constellations, signal maps, and low-poly connective tissue.', 'ultrabgs' ),
		'lowpoly'   => __( 'Triangulated point fields that suggest networks, maps, and generative structure.', 'ultrabgs' ),
		'aurora'    => __( 'Classic aurora gradients for atmospheric page and block backgrounds.', 'ultrabgs' ),
		'halftone'  => __( 'Animated dot texture for print-inspired energy and campaign surfaces.', 'ultrabgs' ),
		'smoke'     => __( 'Soft drifting cloud forms for moody transitions and depth.', 'ultrabgs' ),
		'hexcubes'  => __( 'Geometric cube fields for modular, technical, or architectural surfaces.', 'ultrabgs' ),
	);
	return $descriptions[ $id ] ?? __( 'Responsive animated background pack registered through the UltraBGs pack architecture.', 'ultrabgs' );
}

function ultrabgs_render_showcase_tab() {
	$packs = ultrabgs_get_packs();
	ultrabgs_admin_feature_styles();
	?>
	<div class="ubgs-feature">
		<section class="ubgs-hero">
			<p class="ubgs-kicker"><?php esc_html_e( 'Animation showcase', 'ultrabgs' ); ?></p>
			<h2><?php esc_html_e( 'Motion packs for living WordPress backgrounds.', 'ultrabgs' ); ?></h2>
			<p><?php esc_html_e( 'UltraBGs turns any block into a reactive canvas layer. Packs respond to hover, scroll, taps, density, speed, opacity, color, and z-index without editors writing event code.', 'ultrabgs' ); ?></p>
		</section>
		<div class="ubgs-grid">
			<?php foreach ( $packs as $id => $pack ) :
				$preview = ultrabgs_preview_class_for_pack( $id );
				?>
				<article class="ubgs-pack">
					<div class="ubgs-preview ubgs-preview--<?php echo esc_attr( $preview ); ?>" aria-hidden="true"></div>
					<div class="ubgs-pack-body">
						<h3><?php echo esc_html( $pack['label'] ); ?></h3>
						<p><?php echo esc_html( ultrabgs_pack_description( $id ) ); ?></p>
						<span class="ubgs-pill"><?php echo esc_html( $id ); ?></span>
					</div>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
}
