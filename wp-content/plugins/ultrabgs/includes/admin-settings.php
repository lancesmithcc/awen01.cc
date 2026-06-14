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
			<a href="<?php echo esc_url( $base . '&tab=contributors' ); ?>" class="nav-tab <?php echo 'contributors' === $tab ? 'nav-tab-active' : ''; ?>"><?php esc_html_e( 'Contributors', 'ultrabgs' ); ?></a>
		</nav>
		<?php
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
