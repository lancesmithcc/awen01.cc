<?php
/**
 * Admin screen. A single-page vanilla-JS app (no build step) reads/writes
 * the whole brand object through the REST API.
 */

defined( 'ABSPATH' ) || exit;

class BSC_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_post_bsc_create_guide_page', array( __CLASS__, 'create_guide_page' ) );
	}

	public static function menu() {
		add_menu_page(
			'Brand Standards',
			'Brand Standards',
			'manage_options',
			'brand-standards',
			array( __CLASS__, 'render' ),
			'dashicons-art',
			59
		);
	}

	public static function assets( $hook ) {
		if ( 'toplevel_page_brand-standards' !== $hook ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_style( 'bsc-admin', BSC_URL . 'assets/admin.css', array(), BSC_VERSION );
		wp_enqueue_script( 'bsc-admin', BSC_URL . 'assets/admin.js', array( 'wp-api-fetch' ), BSC_VERSION, true );

		$guide_page = (int) get_option( 'bsc_guide_page_id' );

		wp_localize_script( 'bsc-admin', 'BSC', array(
			'brand'      => BSC_Brand::get(),
			'keys'       => BSC_Keys::status(),
			'gp_active'  => BSC_GeneratePress::is_gp_active(),
			'exports'    => array(
				'json'   => BSC_Export::url() . '/brand.json',
				'md'     => BSC_Export::url() . '/brand.md',
				'tokens' => BSC_Export::url() . '/tokens.css',
			),
			'guide_url'  => $guide_page ? get_permalink( $guide_page ) : '',
			'create_guide_url' => wp_nonce_url( admin_url( 'admin-post.php?action=bsc_create_guide_page' ), 'bsc_create_guide' ),
		) );
	}

	public static function create_guide_page() {
		check_admin_referer( 'bsc_create_guide' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Nope.' );
		}
		$id = BSC_Export::ensure_guide_page();
		wp_safe_redirect( get_permalink( $id ) );
		exit;
	}

	public static function render() {
		echo '<div id="bsc-app" class="bsc-app"><p>Loading Brand Standards Creator…</p></div>';
	}
}
