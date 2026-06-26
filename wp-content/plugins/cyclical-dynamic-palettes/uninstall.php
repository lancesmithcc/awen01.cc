<?php
/**
 * Uninstall handler for GP Dynamic Palettes.
 * Runs only when the user deletes the plugin from the WordPress admin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'cydp_settings' );

// Multisite: clean the option on every site too.
if ( is_multisite() ) {
	global $wpdb;
	$blog_ids = $wpdb->get_col( "SELECT blog_id FROM {$wpdb->blogs}" ); // phpcs:ignore WordPress.DB
	foreach ( (array) $blog_ids as $blog_id ) {
		switch_to_blog( (int) $blog_id );
		delete_option( 'cydp_settings' );
		restore_current_blog();
	}
}
