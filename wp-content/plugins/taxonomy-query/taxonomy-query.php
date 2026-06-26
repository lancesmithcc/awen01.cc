<?php
/**
 * Plugin Name: Taxonomy Query
 * Description: Adds taxonomy term queries to the GenerateBlocks Query block, including term archive links and term dynamic tags.
 * Version: 0.1.2
 * Author: Genex Marketing Agency Ltd.
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * Text Domain: taxonomy-query
 *
 * @package TaxonomyQuery
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TAXONOMY_QUERY_VERSION', '0.1.2' );
define( 'TAXONOMY_QUERY_FILE', __FILE__ );
define( 'TAXONOMY_QUERY_DIR', plugin_dir_path( __FILE__ ) );
define( 'TAXONOMY_QUERY_URL', plugin_dir_url( __FILE__ ) );

require_once TAXONOMY_QUERY_DIR . 'includes/class-taxonomy-query.php';

add_action(
	'plugins_loaded',
	static function() {
		Taxonomy_Query\Plugin::instance();
	}
);
