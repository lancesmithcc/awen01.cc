<?php
/**
 * Plugin Name:       BrandBoss
 * Plugin URI:        https://awen01.cc/brandboss/
 * Description:       Build a complete machine-readable brand system — colors, typography, spacing, logo treatment, imagery and tone — with GeneratePress/GenerateBlocks sync, AI-assisted generation (OpenRouter / DeepSeek / MiniMax / fal.ai), a live guide page, and JSON / Markdown / PDF exports for both humans and AI agents.
 * Version:           0.9.3
 * Author:            AWEN01
 * Author URI:        https://awen01.cc/
 * License:           GPL-2.0-or-later
 * Text Domain:       bsc
 * Requires PHP:      7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'BSC_VERSION', '0.9.3' );
define( 'BSC_FILE', __FILE__ );
define( 'BSC_DIR', plugin_dir_path( __FILE__ ) );
define( 'BSC_URL', plugin_dir_url( __FILE__ ) );

require_once BSC_DIR . 'includes/class-bsc-keys.php';
require_once BSC_DIR . 'includes/class-bsc-brand.php';
require_once BSC_DIR . 'includes/class-bsc-contrast.php';
require_once BSC_DIR . 'includes/class-bsc-color.php';
require_once BSC_DIR . 'includes/class-bsc-principles.php';
require_once BSC_DIR . 'includes/class-bsc-extrapolate.php';
require_once BSC_DIR . 'includes/class-bsc-generatepress.php';
require_once BSC_DIR . 'includes/class-bsc-rest.php';
require_once BSC_DIR . 'includes/class-bsc-export.php';
require_once BSC_DIR . 'includes/class-bsc-admin.php';

add_action( 'plugins_loaded', function () {
	BSC_Rest::init();
	BSC_Export::init();
	BSC_Admin::init();
	BSC_GeneratePress::init();
} );

/**
 * Front-end guide shortcode: [brand_standards_guide]
 */
$bsc_guide_shortcode = function () {
	$brand = BSC_Brand::get();

	wp_enqueue_style( 'bsc-guide', BSC_URL . 'assets/guide.css', array(), BSC_VERSION );
	wp_enqueue_style( 'bsc-guide-print', BSC_URL . 'assets/guide-print.css', array(), BSC_VERSION, 'print' );

	ob_start();
	include BSC_DIR . 'templates/guide.php';
	return ob_get_clean();
};

add_shortcode( 'brandboss_guide', $bsc_guide_shortcode );
add_shortcode( 'brand_standards_guide', $bsc_guide_shortcode );

register_activation_hook( __FILE__, function () {
	// Ensure the export directory exists.
	BSC_Export::ensure_dir();
} );
