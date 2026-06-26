<?php
/**
 * BrandBoss Bridge — the shared brand image-standards contract.
 *
 * This is the single, stable surface that other plugins (e.g. Stockboss) use
 * to read the active brand's image standards and to approve generated assets
 * into the brand library. BrandBoss owns the data; consumers read it live so
 * the two can never drift out of sync.
 *
 * Consumers must treat BrandBoss as optional: guard every call with
 * `class_exists( 'BrandBoss_Bridge' ) && BrandBoss_Bridge::is_active()`.
 * Both plugins remain fully independent.
 *
 * Contract version is bumped only on breaking changes to the shapes below.
 */

defined( 'ABSPATH' ) || exit;

class BrandBoss_Bridge {

	/** Shared contract version. Stockboss ships the same number. */
	const VERSION = 1;

	/** The four brand image categories, shared by both plugins. */
	const CATEGORIES = array(
		'graphics'      => 'Graphical Elements',
		'icons'         => 'Icons',
		'stock'         => 'Stock Imagery',
		'illustrations' => 'Illustrations',
	);

	/** Cap reference images sent to a generation request. */
	const MAX_REFERENCES = 8;

	public static function is_active() {
		return true;
	}

	/** slug => label, filterable so both plugins resolve the same list. */
	public static function categories() {
		return apply_filters( 'brandboss/categories', self::CATEGORIES );
	}

	public static function is_category( $slug ) {
		return array_key_exists( $slug, self::categories() );
	}

	/**
	 * The active brand image standards. This is what a generator should obey.
	 *
	 * @return array{
	 *   version:int, prompt:string, style:string, treatments:string,
	 *   dos:string[], donts:string[], allowed_aspects:string[],
	 *   palette:array<int,array{slug:string,name:string,hex:string,role:string}>,
	 *   reference_image_ids:int[]
	 * }
	 */
	public static function image_standards() {
		$brand   = BSC_Brand::get();
		$imagery = (array) ( $brand['imagery'] ?? array() );

		$palette = array();
		foreach ( (array) ( $brand['colors'] ?? array() ) as $c ) {
			if ( empty( $c['hex'] ) ) {
				continue;
			}
			$palette[] = array(
				'slug' => (string) ( $c['slug'] ?? '' ),
				'name' => (string) ( $c['name'] ?? '' ),
				'hex'  => (string) $c['hex'],
				'role' => (string) ( $c['role'] ?? '' ),
			);
		}

		$aspects = array_values( array_filter( (array) ( $brand['ratios']['image_aspects'] ?? array() ) ) );

		$standards = array(
			'version'             => self::VERSION,
			'prompt'              => self::compose_prompt( $brand, $palette, $aspects ),
			'style'               => (string) ( $imagery['style'] ?? '' ),
			'treatments'          => (string) ( $imagery['treatments'] ?? '' ),
			'dos'                 => array_values( array_filter( (array) ( $imagery['dos'] ?? array() ) ) ),
			'donts'               => array_values( array_filter( (array) ( $imagery['donts'] ?? array() ) ) ),
			'allowed_aspects'     => $aspects,
			'palette'             => $palette,
			'reference_image_ids' => self::reference_image_ids( $brand ),
		);

		return apply_filters( 'brandboss/image_standards', $standards, $brand );
	}

	/**
	 * Approved reference images: curated imagery examples plus approved assets
	 * from every library category. Deduped and capped.
	 */
	public static function reference_image_ids( $brand = null ) {
		$brand = $brand ?: BSC_Brand::get();
		$ids   = array_map( 'absint', (array) ( $brand['imagery']['examples'] ?? array() ) );

		foreach ( self::categories() as $slug => $label ) {
			foreach ( (array) ( $brand['asset_library'][ $slug ] ?? array() ) as $item ) {
				if ( ! empty( $item['approved'] ) && ! empty( $item['attachment_id'] ) ) {
					$ids[] = absint( $item['attachment_id'] );
				}
			}
		}

		$ids = array_values( array_unique( array_filter( $ids ) ) );
		return array_slice( $ids, 0, self::MAX_REFERENCES );
	}

	/**
	 * Approve an asset into the brand library. Saving the brand regenerates
	 * brand.json / brand.md so the asset immediately becomes a referenced
	 * brand standard for downstream AI.
	 *
	 * @return array|WP_Error The stored item on success.
	 */
	public static function add_asset( $category, $attachment_id, $args = array() ) {
		$category      = sanitize_key( (string) $category );
		$attachment_id = absint( $attachment_id );

		if ( ! self::is_category( $category ) ) {
			return new WP_Error( 'brandboss_bad_category', 'Unknown brand asset category.', array( 'status' => 400 ) );
		}
		if ( $attachment_id <= 0 || 'attachment' !== get_post_type( $attachment_id ) ) {
			return new WP_Error( 'brandboss_bad_attachment', 'Invalid attachment.', array( 'status' => 400 ) );
		}

		$brand = BSC_Brand::get();
		if ( ! isset( $brand['asset_library'] ) || ! is_array( $brand['asset_library'] ) ) {
			$brand['asset_library'] = array();
		}
		if ( ! isset( $brand['asset_library'][ $category ] ) || ! is_array( $brand['asset_library'][ $category ] ) ) {
			$brand['asset_library'][ $category ] = array();
		}

		// Skip duplicates: same attachment already approved in this category.
		foreach ( $brand['asset_library'][ $category ] as $existing ) {
			if ( (int) ( $existing['attachment_id'] ?? 0 ) === $attachment_id ) {
				return $existing;
			}
		}

		$label = isset( $args['label'] ) ? sanitize_text_field( (string) $args['label'] ) : '';
		if ( '' === $label ) {
			$label = get_the_title( $attachment_id ) ?: 'Brand asset';
		}

		$item = array(
			'attachment_id' => $attachment_id,
			'label'         => $label,
			'prompt'        => isset( $args['prompt'] ) ? sanitize_textarea_field( (string) $args['prompt'] ) : '',
			'model'         => isset( $args['model'] ) ? sanitize_text_field( (string) $args['model'] ) : '',
			'source'        => isset( $args['source'] ) ? sanitize_key( (string) $args['source'] ) : 'brandboss',
			'approved'      => true,
			'added'         => current_time( 'mysql' ),
		);

		$brand['asset_library'][ $category ][] = $item;

		BSC_Brand::save( $brand ); // Triggers bsc_brand_saved → export rewrite.

		/**
		 * Fires after an asset is approved into the brand library.
		 *
		 * @param int    $attachment_id
		 * @param string $category
		 * @param array  $item
		 */
		do_action( 'brandboss/asset_approved', $attachment_id, $category, $item );

		return $item;
	}

	/* ----------------------------------------------------------------- */

	private static function compose_prompt( $brand, $palette, $aspects ) {
		$imagery = (array) ( $brand['imagery'] ?? array() );
		$parts   = array();

		$name = trim( (string) ( $brand['identity']['name'] ?? '' ) );
		if ( '' !== $name ) {
			$parts[] = 'Brand: ' . $name . '.';
		}
		if ( ! empty( $imagery['style'] ) ) {
			$parts[] = 'Image style: ' . $imagery['style'];
		}
		if ( ! empty( $imagery['treatments'] ) ) {
			$parts[] = 'Treatments: ' . $imagery['treatments'];
		}
		if ( ! empty( $imagery['dos'] ) ) {
			$parts[] = 'Always: ' . implode( '; ', (array) $imagery['dos'] ) . '.';
		}
		if ( ! empty( $imagery['donts'] ) ) {
			$parts[] = 'Never: ' . implode( '; ', (array) $imagery['donts'] ) . '.';
		}
		if ( $palette ) {
			$swatches = array();
			foreach ( $palette as $c ) {
				$swatches[] = trim( ( $c['name'] ? $c['name'] . ' ' : '' ) . $c['hex'] . ( $c['role'] ? ' (' . $c['role'] . ')' : '' ) );
			}
			$parts[] = 'Use the brand palette: ' . implode( ', ', $swatches ) . '.';
		}
		if ( $aspects ) {
			$parts[] = 'Allowed aspect ratios: ' . implode( ', ', $aspects ) . '.';
		}

		return trim( implode( "\n", $parts ) );
	}
}
