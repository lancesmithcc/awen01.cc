<?php
/**
 * Taxonomy Query integration.
 *
 * @package TaxonomyQuery
 */

namespace Taxonomy_Query;

use WP_Block;
use WP_Error;
use WP_HTML_Tag_Processor;
use WP_REST_Request;
use WP_Term;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin integration class.
 */
final class Plugin {
	const QUERY_TYPE = 'Taxonomy_Query';

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance.
	 *
	 * @return self
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		add_action( 'init', [ $this, 'register_dynamic_tags' ], 20 );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_assets' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_inline_background_fallback_styles' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_inline_background_fallback_styles' ] );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
		add_action( 'admin_notices', [ $this, 'admin_notice_missing_generateblocks' ] );

		add_filter( 'block_editor_settings_all', [ $this, 'add_editor_inline_background_fallback_styles' ] );
		add_filter( 'generateblocks_query_data', [ $this, 'get_query_data' ], 10, 5 );
		add_filter( 'generateblocks_looper_render_loop_items', [ $this, 'render_loop_items' ], 10, 5 );
		add_filter( 'render_block_generateblocks/loop-item', [ $this, 'add_loop_item_term_classes' ], 10, 3 );
		add_filter( 'generateblocks_dynamic_tag_replacement', [ $this, 'replace_featured_image_tag_for_terms' ], 10, 2 );
	}

	/**
	 * Enqueue editor script.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets(): void {
		if ( ! $this->has_generateblocks() ) {
			return;
		}

		wp_enqueue_script(
			'taxonomy-query-editor',
			TAXONOMY_QUERY_URL . 'assets/editor.js',
			[
				'wp-api-fetch',
				'wp-blocks',
				'wp-components',
				'wp-dom-ready',
				'wp-element',
				'wp-hooks',
				'wp-i18n',
			],
			TAXONOMY_QUERY_VERSION,
			true
		);

		wp_localize_script(
			'taxonomy-query-editor',
			'taxonomyQuery',
			[
				'queryType'  => self::QUERY_TYPE,
				'restUrl'    => rest_url( 'taxonomy-query/v1/terms' ),
				'taxonomies' => $this->get_taxonomy_options(),
			]
		);
	}

	/**
	 * Enqueue fallback CSS for GenerateBlocks inline background images inside term loops.
	 *
	 * @return void
	 */
	public function enqueue_inline_background_fallback_styles(): void {
		if ( ! $this->has_generateblocks() ) {
			return;
		}

		wp_register_style(
			'taxonomy-query-inline-background',
			false,
			[],
			TAXONOMY_QUERY_VERSION
		);

		$css = ':where(.gb-taxonomy-query-item[style*="--inline-bg-image"]){background-image:var(--inline-bg-image)}';

		if ( is_admin() ) {
			$css .= ':where(.editor-styles-wrapper .gb-loop-item[style*="--inline-bg-image"]){background-image:var(--inline-bg-image)}';
		}

		wp_enqueue_style( 'taxonomy-query-inline-background' );
		wp_add_inline_style(
			'taxonomy-query-inline-background',
			$css
		);
	}

	/**
	 * Add fallback background CSS inside the block editor iframe.
	 *
	 * @param array $editor_settings Editor settings.
	 * @return array
	 */
	public function add_editor_inline_background_fallback_styles( array $editor_settings ): array {
		$editor_settings['styles'][] = [
			'css' => ':where(.editor-styles-wrapper .gb-loop-item[style*="--inline-bg-image"]){background-image:var(--inline-bg-image)}',
		];

		return $editor_settings;
	}

	/**
	 * Register REST routes for editor previews.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		register_rest_route(
			'taxonomy-query/v1',
			'/terms',
			[
				'methods'             => 'POST',
				'callback'            => [ $this, 'rest_get_terms' ],
				'permission_callback' => static function() {
					return current_user_can( 'edit_posts' );
				},
			]
		);
	}

	/**
	 * Register GenerateBlocks dynamic tags for term loops.
	 *
	 * @return void
	 */
	public function register_dynamic_tags(): void {
		if ( ! class_exists( 'GenerateBlocks_Register_Dynamic_Tag' ) ) {
			return;
		}

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Name', 'taxonomy-query' ),
				'tag'         => 'term_name',
				'type'        => 'term',
				'supports'    => [ 'link', 'source' ],
				'description' => __( 'Displays the current taxonomy term name.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_name_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Description', 'taxonomy-query' ),
				'tag'         => 'term_description',
				'type'        => 'term',
				'supports'    => [ 'link', 'source' ],
				'description' => __( 'Displays the current taxonomy term description.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_description_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Archive URL', 'taxonomy-query' ),
				'tag'         => 'term_url',
				'type'        => 'term',
				'supports'    => [ 'source' ],
				'description' => __( 'Displays the current taxonomy term archive URL.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_url_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Count', 'taxonomy-query' ),
				'tag'         => 'term_count',
				'type'        => 'term',
				'supports'    => [ 'source' ],
				'description' => __( 'Displays the current taxonomy term post count.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_count_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Slug', 'taxonomy-query' ),
				'tag'         => 'term_slug',
				'type'        => 'term',
				'supports'    => [ 'source' ],
				'description' => __( 'Displays the current taxonomy term slug.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_slug_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Meta', 'taxonomy-query' ),
				'tag'         => 'term_meta',
				'type'        => 'term',
				'supports'    => [ 'meta', 'source' ],
				'description' => __( 'Displays term meta by key for the current taxonomy term.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_meta_tag' ],
			]
		);

		new \GenerateBlocks_Register_Dynamic_Tag(
			[
				'title'       => __( 'Term Image', 'taxonomy-query' ),
				'tag'         => 'term_image',
				'type'        => 'term',
				'supports'    => [ 'source' ],
				'description' => __( 'Displays the current taxonomy term image URL, ID, alt text, or caption.', 'taxonomy-query' ),
				'return'      => [ $this, 'get_term_image_tag' ],
			]
		);
	}

	/**
	 * Show a dependency notice if GenerateBlocks is not active.
	 *
	 * @return void
	 */
	public function admin_notice_missing_generateblocks(): void {
		if ( $this->has_generateblocks() || ! current_user_can( 'activate_plugins' ) ) {
			return;
		}

		printf(
			'<div class="notice notice-warning"><p>%s</p></div>',
			esc_html__( 'Taxonomy Query needs GenerateBlocks active to add taxonomy queries to the GenerateBlocks Query block.', 'taxonomy-query' )
		);
	}

	/**
	 * REST callback for editor term previews.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return \WP_REST_Response|WP_Error
	 */
	public function rest_get_terms( WP_REST_Request $request ) {
		$query = $request->get_param( 'query' );

		if ( ! is_array( $query ) ) {
			$query = [];
		}

		$terms = $this->get_terms_for_query( $query );

		if ( is_wp_error( $terms ) ) {
			return $terms;
		}

		return rest_ensure_response(
			array_map(
				[ $this, 'prepare_term_for_response' ],
				$terms
			)
		);
	}

	/**
	 * Supply GenerateBlocks query data for taxonomy terms.
	 *
	 * @param array  $query_data Existing query data.
	 * @param string $query_type Query type.
	 * @param array  $attributes Block attributes.
	 * @param object $block Block instance.
	 * @param int    $page Current page.
	 * @return array
	 */
	public function get_query_data( array $query_data, string $query_type, array $attributes, $block, int $page ): array {
		if ( self::QUERY_TYPE !== $query_type ) {
			return $query_data;
		}

		$query = $attributes['query'] ?? [];

		if ( ! is_array( $query ) ) {
			$query = [];
		}

		$terms = $this->get_terms_for_query( $query );

		if ( is_wp_error( $terms ) ) {
			$terms = [];
		}

		$per_page  = $this->get_per_page( $query );
		$offset    = $this->get_offset( $query );
		$total     = max( 0, count( $terms ) - $offset );
		$max_pages = $per_page > 0 ? (int) ceil( $total / $per_page ) : 1;

		if ( ! empty( $query['pages'] ) && is_numeric( $query['pages'] ) ) {
			$max_pages = min( $max_pages, max( 1, (int) $query['pages'] ) );
		}

		$query['posts_per_page'] = $per_page;
		$query['offset']         = $offset;

		return [
			'data'          => $terms,
			'no_results'    => 0 === count( $terms ),
			'args'          => $query,
			'max_num_pages' => $max_pages,
		];
	}

	/**
	 * Render term loop items through the GenerateBlocks Looper.
	 *
	 * @param string  $output Existing output.
	 * @param mixed   $query_type Query type. GenerateBlocks passes null outside query context.
	 * @param mixed   $query_data Query data.
	 * @param WP_Block $block Block instance.
	 * @param array   $attributes Looper attributes.
	 * @return string
	 */
	public function render_loop_items( string $output, $query_type, $query_data, WP_Block $block, array $attributes ): string {
		if ( self::QUERY_TYPE !== $query_type ) {
			return $output;
		}

		$inner_blocks = $block->parsed_block['innerBlocks'] ?? [];

		if ( empty( $inner_blocks ) || ! is_array( $query_data ) ) {
			return '';
		}

		$query_id = $block->context['generateblocks/queryData']['id'] ?? null;
		$page_key = $query_id ? 'query-' . $query_id . '-page' : 'query-page';
		$page = empty( $_GET[ $page_key ] ) ? 1 : max( 1, (int) $_GET[ $page_key ] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$args = $block->context['generateblocks/queryData']['args'] ?? [];
		$per_page = $this->get_per_page( $args );
		$base_offset = $this->get_offset( $args );
		$page_offset = $per_page > 0 ? ( $page - 1 ) * $per_page : 0;
		$terms = $per_page > 0
			? array_slice( $query_data, $base_offset + $page_offset, $per_page )
			: array_slice( $query_data, $base_offset );

		$content = '';

		foreach ( $terms as $index => $term ) {
			if ( ! $term instanceof WP_Term ) {
				continue;
			}

			foreach ( $inner_blocks as $inner_block ) {
				$content .= (
					new WP_Block(
						$inner_block,
						array_merge(
							$block->context,
							[
								'postType'                       => 'term',
								'postId'                         => $term->term_id,
								'generateblocks/queryType'       => self::QUERY_TYPE,
								'generateblocks/loopIndex'       => $base_offset + $page_offset + $index + 1,
								'generateblocks/loopItem'        => $this->prepare_term_for_response( $term ),
								'taxonomy-query/currentTermId'   => $term->term_id,
								'taxonomy-query/currentTaxonomy' => $term->taxonomy,
							]
						)
					)
				)->render();
			}
		}

		return $content;
	}

	/**
	 * Add term classes to loop items.
	 *
	 * @param string   $block_content Rendered block HTML.
	 * @param array    $block Parsed block.
	 * @param WP_Block $instance Block instance.
	 * @return string
	 */
	public function add_loop_item_term_classes( string $block_content, array $block, WP_Block $instance ): string {
		$query_type = $instance->context['generateblocks/queryType'] ?? '';

		if ( self::QUERY_TYPE !== $query_type || ! class_exists( WP_HTML_Tag_Processor::class ) ) {
			return $block_content;
		}

		$term = $this->get_context_term( [], $instance );

		if ( ! $term ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );
		$tag_name = $block['attrs']['tagName'] ?? 'div';

		if ( ! $processor->next_tag( $tag_name ) ) {
			return $block_content;
		}

		$processor = $this->ensure_inline_background_style( $processor, $block, $instance );

		$existing = (string) $processor->get_attribute( 'class' );
		$classes  = [
			$existing,
			'gb-taxonomy-query-item',
			'term',
			'term-' . $term->term_id,
			'term-' . sanitize_html_class( $term->slug ),
			'taxonomy-' . sanitize_html_class( $term->taxonomy ),
		];

		$processor->set_attribute( 'class', trim( implode( ' ', array_filter( $classes ) ) ) );

		return $processor->get_updated_html();
	}

	/**
	 * Ensure GenerateBlocks inline background image custom property survives term loop rendering.
	 *
	 * @param WP_HTML_Tag_Processor $processor Tag processor positioned on the loop item.
	 * @param array                 $block Parsed block.
	 * @param WP_Block              $instance Block instance.
	 * @return WP_HTML_Tag_Processor
	 */
	private function ensure_inline_background_style( WP_HTML_Tag_Processor $processor, array $block, WP_Block $instance ): WP_HTML_Tag_Processor {
		$attribute_style = $block['attrs']['htmlAttributes']['style'] ?? '';

		if ( ! is_string( $attribute_style ) || false === strpos( $attribute_style, '--inline-bg-image' ) ) {
			return $processor;
		}

		if ( false !== strpos( $attribute_style, '{{' ) && class_exists( 'GenerateBlocks_Register_Dynamic_Tag' ) ) {
			$attribute_style = \GenerateBlocks_Register_Dynamic_Tag::replace_tags( $attribute_style, [], $instance );
		}

		$existing_style = (string) $processor->get_attribute( 'style' );
		$style_parts    = array_filter( [ rtrim( $existing_style, ';' ), rtrim( $attribute_style, ';' ) ] );
		$style          = implode( ';', array_unique( $style_parts ) );

		$styles = $block['attrs']['styles'] ?? [];

		$css = isset( $block['attrs']['css'] ) && is_string( $block['attrs']['css'] )
			? $block['attrs']['css']
			: '';

		if (
			is_array( $styles ) &&
			empty( $styles['backgroundImage'] ) &&
			false === strpos( $style, 'background-image:' ) &&
			false === strpos( $style, 'background:' ) &&
			false === strpos( $css, 'background-image:' ) &&
			false === strpos( $css, 'background:' )
		) {
			$style .= ';background-image:var(--inline-bg-image)';
		}

		$processor->set_attribute( 'style', $style );

		return $processor;
	}

	/**
	 * Term name dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_name_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );

		return $this->format_term_tag_output( $term ? $term->name : '', $term, $options, $instance );
	}

	/**
	 * Term description dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_description_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );
		$value = $term ? $term->description : '';

		return $this->format_term_tag_output( $value, $term, $options, $instance );
	}

	/**
	 * Term URL dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_url_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );
		$link = $term ? get_term_link( $term ) : '';

		if ( is_wp_error( $link ) ) {
			$link = '';
		}

		return $this->format_term_tag_output( $link, $term, $options, $instance );
	}

	/**
	 * Term count dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_count_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );

		return $this->format_term_tag_output( $term ? (string) $term->count : '', $term, $options, $instance );
	}

	/**
	 * Term slug dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_slug_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );

		return $this->format_term_tag_output( $term ? $term->slug : '', $term, $options, $instance );
	}

	/**
	 * Term meta dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_meta_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );
		$key  = $options['key'] ?? '';

		if ( ! $term || ! $key || is_protected_meta( $key, 'term' ) ) {
			return $this->format_term_tag_output( '', $term, $options, $instance );
		}

		$value = class_exists( 'GenerateBlocks_Meta_Handler' )
			? \GenerateBlocks_Meta_Handler::get_term_meta( $term->term_id, $key, true )
			: get_term_meta( $term->term_id, $key, true );

		if ( is_array( $value ) || is_object( $value ) ) {
			$value = '';
		}

		return $this->format_term_tag_output( (string) $value, $term, $options, $instance );
	}

	/**
	 * Term image dynamic tag.
	 *
	 * @param array  $options Tag options.
	 * @param array  $block Parsed block.
	 * @param object $instance Block instance.
	 * @return string
	 */
	public function get_term_image_tag( array $options, array $block, $instance ): string {
		$term = $this->get_context_term( $options, $instance );
		$key  = $options['key'] ?? 'url';
		$size = $options['size'] ?? 'full';
		$data = $term ? $this->get_term_image_data( $term, (string) $size ) : [];

		$value = $data[ $key ] ?? $data['url'] ?? '';

		return $this->format_term_tag_output( (string) $value, $term, $options, $instance );
	}

	/**
	 * Map GenerateBlocks' post featured_image tag to term image data inside taxonomy loops.
	 *
	 * GenerateBlocks treats empty required dynamic tags as a reason to drop the entire block.
	 * In taxonomy loops, a post featured image tag can appear when users set a GB background
	 * image dynamically, so we resolve it from term meta instead.
	 *
	 * @param string $replacement Current replacement.
	 * @param array  $args Dynamic tag args.
	 * @return string
	 */
	public function replace_featured_image_tag_for_terms( string $replacement, array $args ): string {
		if ( 'featured_image' !== ( $args['tag'] ?? '' ) || ! empty( $replacement ) ) {
			return $replacement;
		}

		$instance = $args['instance'] ?? null;

		if ( ! $this->is_taxonomy_query_instance( $instance ) ) {
			return $replacement;
		}

		$options = is_array( $args['options'] ?? null ) ? $args['options'] : [];
		$term    = $this->get_context_term( $options, $instance );

		if ( ! $term ) {
			return $replacement;
		}

		$key  = $options['key'] ?? 'url';
		$size = $options['size'] ?? 'full';
		$data = $this->get_term_image_data( $term, (string) $size );

		if ( ! empty( $data[ $key ] ) ) {
			return (string) $data[ $key ];
		}

		if ( ! empty( $data['url'] ) ) {
			return (string) $data['url'];
		}

		return 'about:blank';
	}

	/**
	 * Get terms for query attributes.
	 *
	 * @param array $query Query attributes.
	 * @return WP_Term[]|WP_Error
	 */
	private function get_terms_for_query( array $query ) {
		$taxonomy = sanitize_key( $query['taxonomy'] ?? 'category' );

		if ( ! taxonomy_exists( $taxonomy ) ) {
			return new WP_Error( 'taxonomy_query_invalid_taxonomy', __( 'Invalid taxonomy.', 'taxonomy-query' ) );
		}

		$args = [
			'taxonomy'   => $taxonomy,
			'hide_empty' => ! empty( $query['hide_empty'] ),
			'orderby'    => $this->sanitize_orderby( $query['orderby'] ?? 'name' ),
			'order'      => $this->sanitize_order( $query['order'] ?? 'ASC' ),
		];

		foreach ( [ 'search', 'name', 'slug' ] as $string_key ) {
			if ( isset( $query[ $string_key ] ) && is_scalar( $query[ $string_key ] ) && '' !== $query[ $string_key ] ) {
				$args[ $string_key ] = sanitize_text_field( wp_unslash( (string) $query[ $string_key ] ) );
			}
		}

		foreach ( [ 'include', 'exclude' ] as $list_key ) {
			$list = $this->sanitize_id_list( $query[ $list_key ] ?? [] );

			if ( ! empty( $list ) ) {
				$args[ $list_key ] = $list;
			}
		}

		foreach ( [ 'parent', 'child_of' ] as $int_key ) {
			if ( isset( $query[ $int_key ] ) && '' !== $query[ $int_key ] ) {
				$args[ $int_key ] = (int) $query[ $int_key ];
			}
		}

		if ( isset( $query['pad_counts'] ) ) {
			$args['pad_counts'] = (bool) $query['pad_counts'];
		}

		if ( isset( $query['hierarchical'] ) ) {
			$args['hierarchical'] = (bool) $query['hierarchical'];
		}

		$terms = get_terms( $args );

		return is_wp_error( $terms ) ? $terms : array_values( $terms );
	}

	/**
	 * Prepare a term for block context and REST.
	 *
	 * @param WP_Term $term Term object.
	 * @return array
	 */
	private function prepare_term_for_response( WP_Term $term): array {
		$link       = get_term_link( $term );
		$image_data = $this->get_term_image_data( $term );

		return [
			'id'                 => $term->term_id,
			'ID'                 => $term->term_id,
			'term_id'            => $term->term_id,
			'name'               => $term->name,
			'slug'               => $term->slug,
			'taxonomy'           => $term->taxonomy,
			'description'        => $term->description,
			'count'              => (int) $term->count,
			'parent'             => (int) $term->parent,
			'link'               => is_wp_error( $link ) ? '' : $link,
			'post_type'          => 'term',
			'featured_image_id'  => $image_data['id'] ?? '',
			'featured_image'     => $image_data['url'] ?? '',
			'featured_image_url' => $image_data['url'] ?? '',
			'featured_image_alt' => $image_data['alt'] ?? '',
			'image_id'           => $image_data['id'] ?? '',
			'image'              => $image_data['url'] ?? '',
			'image_url'          => $image_data['url'] ?? '',
			'image_alt'          => $image_data['alt'] ?? '',
		];
	}

	/**
	 * Format dynamic tag output.
	 *
	 * @param string       $value Raw value.
	 * @param WP_Term|null $term Term object.
	 * @param array        $options Tag options.
	 * @param object       $instance Block instance.
	 * @return string
	 */
	private function format_term_tag_output( string $value, ?WP_Term $term, array $options, $instance ): string {
		$link = $options['link'] ?? '';
		unset( $options['link'] );

		$output = class_exists( 'GenerateBlocks_Dynamic_Tag_Callbacks' )
			? \GenerateBlocks_Dynamic_Tag_Callbacks::output( wp_kses_post( $value ), $options, $instance )
			: wp_kses_post( $value );

		if ( 'term' !== $link || ! $term ) {
			return $output;
		}

		$url = get_term_link( $term );

		if ( is_wp_error( $url ) || ! $url ) {
			return $output;
		}

		return sprintf(
			'<a href="%1$s">%2$s</a>',
			esc_url( $url ),
			$output
		);
	}

	/**
	 * Resolve the active term from options or block context.
	 *
	 * @param array  $options Tag options.
	 * @param object $instance Block instance.
	 * @return WP_Term|null
	 */
	private function get_context_term( array $options, $instance ): ?WP_Term {
		$context = is_object( $instance ) && isset( $instance->context ) && is_array( $instance->context )
			? $instance->context
			: [];

		$loop_item = $context['generateblocks/loopItem'] ?? [];
		$term_id   = isset( $options['id'] ) ? (int) $options['id'] : 0;
		$taxonomy  = isset( $options['tax'] ) ? sanitize_key( $options['tax'] ) : '';

		if ( ! $term_id && is_array( $loop_item ) ) {
			$term_id = (int) ( $loop_item['term_id'] ?? $loop_item['id'] ?? $loop_item['ID'] ?? 0 );
		}

		if ( ! $taxonomy && is_array( $loop_item ) ) {
			$taxonomy = sanitize_key( $loop_item['taxonomy'] ?? '' );
		}

		if ( ! $term_id && isset( $context['taxonomy-query/currentTermId'] ) ) {
			$term_id = (int) $context['taxonomy-query/currentTermId'];
		}

		if ( ! $taxonomy && isset( $context['taxonomy-query/currentTaxonomy'] ) ) {
			$taxonomy = sanitize_key( $context['taxonomy-query/currentTaxonomy'] );
		}

		if ( ! $term_id && ( is_tax() || is_category() || is_tag() ) ) {
			$queried = get_queried_object();

			if ( $queried instanceof WP_Term ) {
				return $queried;
			}
		}

		if ( ! $term_id ) {
			return null;
		}

		$term = $taxonomy ? get_term( $term_id, $taxonomy ) : get_term( $term_id );

		return $term instanceof WP_Term && ! is_wp_error( $term ) ? $term : null;
	}

	/**
	 * Check if a block instance is rendering inside a taxonomy query loop.
	 *
	 * @param mixed $instance Block instance.
	 * @return bool
	 */
	private function is_taxonomy_query_instance( $instance ): bool {
		$context = is_object( $instance ) && isset( $instance->context ) && is_array( $instance->context )
			? $instance->context
			: [];
		$loop_item = is_array( $context['generateblocks/loopItem'] ?? null )
			? $context['generateblocks/loopItem']
			: [];

		return self::QUERY_TYPE === ( $context['generateblocks/queryType'] ?? '' )
			|| self::QUERY_TYPE === ( $context['generateblocks/queryData']['type'] ?? '' )
			|| 'term' === ( $context['postType'] ?? '' )
			|| 'term' === ( $loop_item['post_type'] ?? '' )
			|| isset( $context['taxonomy-query/currentTermId'] );
	}

	/**
	 * Get image data from common term image meta fields.
	 *
	 * @param WP_Term $term Term object.
	 * @param string  $size Image size.
	 * @return array
	 */
	private function get_term_image_data( WP_Term $term, string $size = 'full' ): array {
		$keys = [
			$term->taxonomy . '_image',
			$term->taxonomy . '_featured_image',
			'featured_image',
			'term_image',
			'image',
			'image_id',
			'thumbnail_id',
		];

		foreach ( array_unique( $keys ) as $key ) {
			$value = get_term_meta( $term->term_id, $key, true );
			$data  = $this->normalize_term_image_value( $value, $size );

			if ( ! empty( $data['url'] ) ) {
				return $data;
			}
		}

		return [];
	}

	/**
	 * Normalize an ACF/Woo/core-style image meta value.
	 *
	 * @param mixed  $value Raw meta value.
	 * @param string $size Image size.
	 * @return array
	 */
	private function normalize_term_image_value( $value, string $size ): array {
		$value = is_string( $value ) ? maybe_unserialize( $value ) : $value;

		if ( is_array( $value ) ) {
			$id  = (int) ( $value['ID'] ?? $value['id'] ?? 0 );
			$url = '';

			if ( ! empty( $value['sizes'][ $size ] ) && is_string( $value['sizes'][ $size ] ) ) {
				$url = $value['sizes'][ $size ];
			} elseif ( ! empty( $value['url'] ) && is_string( $value['url'] ) ) {
				$url = $value['url'];
			}

			if ( ! $id && $url ) {
				$id = attachment_url_to_postid( $url );
			}

			if ( $id && ! $url ) {
				$url = (string) wp_get_attachment_image_url( $id, $size );
			}

			return $this->build_image_data( $id, $url );
		}

		if ( is_numeric( $value ) ) {
			$id = (int) $value;

			return $this->build_image_data( $id, (string) wp_get_attachment_image_url( $id, $size ) );
		}

		if ( is_string( $value ) && filter_var( $value, FILTER_VALIDATE_URL ) ) {
			$id = attachment_url_to_postid( $value );

			return $this->build_image_data( $id, $value );
		}

		return [];
	}

	/**
	 * Build consistent image data for dynamic tags.
	 *
	 * @param int    $id Attachment ID.
	 * @param string $url Image URL.
	 * @return array
	 */
	private function build_image_data( int $id, string $url ): array {
		if ( ! $url ) {
			return [];
		}

		return [
			'id'      => $id,
			'url'     => $url,
			'alt'     => $id ? (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) : '',
			'caption' => $id ? (string) wp_get_attachment_caption( $id ) : '',
		];
	}

	/**
	 * Get editor taxonomy options.
	 *
	 * @return array
	 */
	private function get_taxonomy_options(): array {
		$taxonomies = get_taxonomies(
			[
				'public' => true,
			],
			'objects'
		);

		$options = [];

		foreach ( $taxonomies as $taxonomy ) {
			if ( empty( $taxonomy->show_ui ) ) {
				continue;
			}

			$options[] = [
				'label'        => $taxonomy->labels->name ?: $taxonomy->label,
				'value'        => $taxonomy->name,
				'hierarchical' => (bool) $taxonomy->hierarchical,
			];
		}

		usort(
			$options,
			static function( array $a, array $b ): int {
				return strcasecmp( $a['label'], $b['label'] );
			}
		);

		return $options;
	}

	/**
	 * Check whether GenerateBlocks is available.
	 *
	 * @return bool
	 */
	private function has_generateblocks(): bool {
		return defined( 'GENERATEBLOCKS_VERSION' ) || class_exists( 'GenerateBlocks_Block_Query' );
	}

	/**
	 * Get terms per page.
	 *
	 * @param array $query Query attributes.
	 * @return int
	 */
	private function get_per_page( array $query ): int {
		$per_page = isset( $query['posts_per_page'] ) ? (int) $query['posts_per_page'] : 10;

		if ( -1 === $per_page ) {
			return -1;
		}

		return max( 1, $per_page );
	}

	/**
	 * Get offset.
	 *
	 * @param array $query Query attributes.
	 * @return int
	 */
	private function get_offset( array $query ): int {
		return isset( $query['offset'] ) ? max( 0, (int) $query['offset'] ) : 0;
	}

	/**
	 * Sanitize order.
	 *
	 * @param string $order Order.
	 * @return string
	 */
	private function sanitize_order( $order): string {
		return 'DESC' === strtoupper( (string) $order ) ? 'DESC' : 'ASC';
	}

	/**
	 * Sanitize orderby.
	 *
	 * @param string $orderby Orderby.
	 * @return string
	 */
	private function sanitize_orderby( $orderby): string {
		$allowed = [
			'count',
			'description',
			'id',
			'include',
			'name',
			'none',
			'parent',
			'slug',
			'term_group',
			'term_id',
		];

		$orderby = (string) $orderby;

		return in_array( $orderby, $allowed, true ) ? $orderby : 'name';
	}

	/**
	 * Sanitize comma-separated or array term IDs.
	 *
	 * @param mixed $value Raw value.
	 * @return int[]
	 */
	private function sanitize_id_list( $value ): array {
		if ( is_string( $value ) ) {
			$value = explode( ',', $value );
		}

		if ( ! is_array( $value ) ) {
			return [];
		}

		return array_values(
			array_filter(
				array_map( 'absint', $value )
			)
		);
	}
}
