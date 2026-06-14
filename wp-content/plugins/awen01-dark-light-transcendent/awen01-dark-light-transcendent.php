<?php
/**
 * Plugin Name: Awen01 Dark Light Transcendent
 * Plugin URI: https://awen01.cc
 * Description: GeneratePress extension adding AWEN01 light, dark, and transcendent color modes with editable palettes, mode switcher, and BSC/WordPress token overrides.
 * Version: 1.0.1
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Author: Lance Smith
 * License: GPL-2.0-or-later
 * Text Domain: awen01-dlt
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AWEN_DLT_VERSION', '1.0.1' );
define( 'AWEN_DLT_FILE', __FILE__ );
define( 'AWEN_DLT_DIR', plugin_dir_path( __FILE__ ) );
define( 'AWEN_DLT_URL', plugin_dir_url( __FILE__ ) );
define( 'AWEN_DLT_OPTION', 'awen_dlt_mode_colors' );
define( 'AWEN_DLT_SETTINGS', 'awen_dlt_settings' );

require_once AWEN_DLT_DIR . 'includes/class-colors.php';
require_once AWEN_DLT_DIR . 'includes/class-customizer.php';
require_once AWEN_DLT_DIR . 'includes/class-frontend.php';
require_once AWEN_DLT_DIR . 'includes/class-block-overrides.php';
require_once AWEN_DLT_DIR . 'includes/class-plugin.php';

add_action( 'plugins_loaded', [ 'AWEN_DLT_Plugin', 'boot' ] );

register_activation_hook( __FILE__, [ 'AWEN_DLT_Plugin', 'on_activate' ] );
