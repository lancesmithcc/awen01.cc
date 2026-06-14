<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'awen_dlt_mode_colors' );
delete_option( 'awen_dlt_settings' );
