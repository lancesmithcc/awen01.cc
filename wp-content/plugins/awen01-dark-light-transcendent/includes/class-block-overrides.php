<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AWEN_DLT_Block_Overrides {

	const TARGETS = [
		'generateblocks/element',
		'generateblocks/text',
		'generateblocks/media',
		'generateblocks/shape',
		'generateblocks/query',
		'generateblocks/looper',
		'generateblocks/loop-item',
		'core/group',
		'core/cover',
		'core/columns',
		'core/column',
		'core/paragraph',
		'core/heading',
		'core/buttons',
		'core/button',
		'core/list',
		'core/quote',
	];

	public static function init() {
		add_action( 'enqueue_block_editor_assets', [ __CLASS__, 'enqueue_editor' ] );
		add_filter( 'render_block', [ __CLASS__, 'render_block' ], 20, 2 );
	}

	public static function enqueue_editor() {
		$asset_deps = [ 'wp-blocks', 'wp-element', 'wp-hooks', 'wp-i18n', 'wp-components', 'wp-block-editor', 'wp-compose', 'wp-data' ];

		wp_enqueue_script(
			'awen-dlt-editor',
			AWEN_DLT_URL . 'assets/js/editor.js',
			$asset_deps,
			AWEN_DLT_VERSION,
			true
		);

		wp_localize_script( 'awen-dlt-editor', 'awenDltEditor', [
			'targets' => self::TARGETS,
			'palette' => array_values( array_map(
				function ( $slug, $data ) {
					return [
						'slug'  => $slug,
						'name'  => $data['name'],
						'color' => $data['color'],
					];
				},
				array_keys( AWEN_DLT_Colors::get_gp_palette() ),
				AWEN_DLT_Colors::get_gp_palette()
			) ),
		] );

		wp_enqueue_style(
			'awen-dlt-editor',
			AWEN_DLT_URL . 'assets/css/editor.css',
			[],
			AWEN_DLT_VERSION
		);
	}

	public static function render_block( $html, $block ) {
		if ( empty( $block['blockName'] ) || ! in_array( $block['blockName'], self::TARGETS, true ) ) {
			return $html;
		}
		$a = isset( $block['attrs']['awenDlt'] ) && is_array( $block['attrs']['awenDlt'] ) ? $block['attrs']['awenDlt'] : null;
		if ( ! $a || empty( $a['uid'] ) ) {
			return $html;
		}

		$uid = preg_replace( '/[^a-z0-9]/i', '', (string) $a['uid'] );
		if ( '' === $uid ) {
			return $html;
		}
		$class = 'awen-dlt-' . $uid;

		$rules = self::build_rules( $a );
		if ( empty( $rules ) ) {
			return $html;
		}

		$html = self::inject_class( $html, $class );

		$mode = ! empty( $a['mode'] ) ? AWEN_DLT_Colors::sanitize_mode( $a['mode'] ) : 'dark';
		if ( 'light' === $mode ) {
			$mode = 'dark';
		}
		$selector = ':root[data-theme="' . $mode . '"] .' . $class;
		$css      = $selector . '{' . implode( ';', $rules ) . '}';

		if ( ! empty( $a['textInherit'] ) ) {
			$css .= $selector . ' :where(p,h1,h2,h3,h4,h5,h6,li,span,a,strong,em){color:inherit}';
		}

		return $html . '<style>' . $css . '</style>';
	}

	private static function build_rules( $a ) {
		$rules = [];

		if ( ! empty( $a['bgColor'] ) ) {
			$hex = sanitize_hex_color( $a['bgColor'] );
			if ( $hex ) {
				$rules[] = 'background-color:' . $hex;
			}
		}

		if ( ! empty( $a['textColor'] ) ) {
			$hex = sanitize_hex_color( $a['textColor'] );
			if ( $hex ) {
				$rules[] = 'color:' . $hex;
			}
		}

		$bg_layers = [];
		if ( ! empty( $a['gradient'] ) ) {
			$grad = self::sanitize_css_value( $a['gradient'] );
			if ( $grad ) {
				$bg_layers[] = $grad;
			}
		}
		if ( ! empty( $a['bgImage'] ) ) {
			$url = esc_url_raw( $a['bgImage'] );
			if ( $url ) {
				$bg_layers[] = "url('" . $url . "')";
			}
		}
		if ( $bg_layers ) {
			$rules[] = 'background-image:' . implode( ',', $bg_layers );
			$rules[] = 'background-size:cover';
			$rules[] = 'background-position:center';
			$rules[] = 'background-repeat:no-repeat';
		}

		if ( ! empty( $a['bgOverlay'] ) ) {
			$overlay = self::sanitize_css_value( $a['bgOverlay'] );
			if ( $overlay && ! empty( $bg_layers ) ) {
				$rules[ array_search( 'background-image:' . implode( ',', $bg_layers ), $rules, true ) ]
					= 'background-image:' . $overlay . ',' . implode( ',', $bg_layers );
			}
		}

		return $rules;
	}

	private static function sanitize_css_value( $val ) {
		$val = (string) $val;
		if ( preg_match( '/[<>{};\\\\]/', $val ) ) {
			return '';
		}
		$val = str_replace( [ '"', "'" ], '', $val );
		return trim( $val );
	}

	private static function inject_class( $html, $class ) {
		if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
			$p = new WP_HTML_Tag_Processor( $html );
			if ( $p->next_tag() ) {
				$p->add_class( $class );
				return $p->get_updated_html();
			}
		}
		if ( preg_match( '/^(\s*<[a-z][a-z0-9]*\b[^>]*\bclass=")/i', $html ) ) {
			return preg_replace( '/^(\s*<[a-z][a-z0-9]*\b[^>]*\bclass=")/i', '$1' . $class . ' ', $html, 1 );
		}
		return preg_replace( '/^(\s*<[a-z][a-z0-9]*\b)/i', '$1 class="' . $class . '"', $html, 1 );
	}
}

AWEN_DLT_Block_Overrides::init();
