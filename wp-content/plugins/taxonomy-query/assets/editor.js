( function( wp ) {
	const { addFilter } = wp.hooks;
	const { createElement: el, useEffect, useState } = wp.element;
	const {
		BaseControl,
		Flex,
		FlexItem,
		Notice,
		SelectControl,
		TextControl,
		ToggleControl,
	} = wp.components;
	const { __ } = wp.i18n;
	const apiFetch = wp.apiFetch;
	const { registerBlockVariation } = wp.blocks;
	const domReady = wp.domReady;

	const QUERY_TYPE = taxonomyQuery.queryType || 'Taxonomy_Query';
	const TAXONOMIES = taxonomyQuery.taxonomies || [];

	const DEFAULT_QUERY = {
		taxonomy: TAXONOMIES[ 0 ]?.value || 'category',
		posts_per_page: 10,
		hide_empty: true,
		orderby: 'name',
		order: 'ASC',
		offset: 0,
	};

	const ORDER_BY_OPTIONS = [
		{ label: __( 'Name', 'taxonomy-query' ), value: 'name' },
		{ label: __( 'Slug', 'taxonomy-query' ), value: 'slug' },
		{ label: __( 'Term ID', 'taxonomy-query' ), value: 'term_id' },
		{ label: __( 'Count', 'taxonomy-query' ), value: 'count' },
		{ label: __( 'Description', 'taxonomy-query' ), value: 'description' },
		{ label: __( 'Parent', 'taxonomy-query' ), value: 'parent' },
		{ label: __( 'Include order', 'taxonomy-query' ), value: 'include' },
		{ label: __( 'None', 'taxonomy-query' ), value: 'none' },
	];

	function cleanQuery( query ) {
		return query && ! Array.isArray( query ) && 'object' === typeof query ? query : {};
	}

	function numberValue( value ) {
		if ( '' === value || undefined === value || null === value ) {
			return '';
		}

		const parsed = parseInt( value, 10 );
		return Number.isNaN( parsed ) ? '' : parsed;
	}

	function getTermLoopItem( context = {} ) {
		const loopItem = context?.[ 'generateblocks/loopItem' ] || {};

		if ( 'term' === context?.postType || 'term' === loopItem.post_type ) {
			return loopItem;
		}

		return null;
	}

	function getTagOption( tag, optionName ) {
		const pattern = new RegExp( `${ optionName }:([^\\s|}]+)` );
		const match = tag.match( pattern );

		return match?.[ 1 ] || '';
	}

	function getTermImageReplacement( tag, loopItem ) {
		const key = getTagOption( tag, 'key' ) || 'url';

		if ( 'id' === key ) {
			return loopItem.featured_image_id || loopItem.image_id || '';
		}

		if ( 'alt' === key ) {
			return loopItem.featured_image_alt || loopItem.image_alt || '';
		}

		return loopItem.featured_image_url || loopItem.featured_image || loopItem.image_url || loopItem.image || 'about:blank';
	}

	function TaxonomyQueryControls( props ) {
		const { attributes, setAttributes } = props;
		const query = {
			...DEFAULT_QUERY,
			...cleanQuery( attributes.query ),
		};

		useEffect( () => {
			if ( QUERY_TYPE !== attributes.queryType ) {
				return;
			}

			if ( Array.isArray( attributes.query ) || ! attributes.query?.taxonomy ) {
				setAttributes( { query } );
			}
		}, [ attributes.queryType ] );

		function updateQuery( next ) {
			setAttributes( {
				query: {
					...query,
					...next,
				},
			} );
		}

		if ( ! TAXONOMIES.length ) {
			return el(
				Notice,
				{
					status: 'warning',
					isDismissible: false,
				},
				__( 'No public taxonomies are available for taxonomy queries.', 'taxonomy-query' )
			);
		}

		const selectedTaxonomy = TAXONOMIES.find( ( taxonomy ) => taxonomy.value === query.taxonomy );

		return el(
			'div',
			{ className: 'taxonomy-query-controls' },
			el( SelectControl, {
				label: __( 'Taxonomy', 'taxonomy-query' ),
				value: query.taxonomy,
				options: TAXONOMIES,
				onChange: ( taxonomy ) => updateQuery( { taxonomy } ),
			} ),
			el( TextControl, {
				label: __( 'Terms per page', 'taxonomy-query' ),
				type: 'number',
				value: query.posts_per_page,
				help: __( 'Use -1 to show all terms.', 'taxonomy-query' ),
				onChange: ( posts_per_page ) => updateQuery( { posts_per_page: numberValue( posts_per_page ) } ),
			} ),
			el( ToggleControl, {
				label: __( 'Hide empty terms', 'taxonomy-query' ),
				checked: !! query.hide_empty,
				onChange: ( hide_empty ) => updateQuery( { hide_empty } ),
			} ),
			el( TextControl, {
				label: __( 'Search', 'taxonomy-query' ),
				value: query.search || '',
				onChange: ( search ) => updateQuery( { search } ),
			} ),
			el(
				Flex,
				{ gap: 3 },
				el(
					FlexItem,
					{ style: { flex: 1 } },
					el( SelectControl, {
						label: __( 'Order by', 'taxonomy-query' ),
						value: query.orderby,
						options: ORDER_BY_OPTIONS,
						onChange: ( orderby ) => updateQuery( { orderby } ),
					} )
				),
				el(
					FlexItem,
					{ style: { flex: 1 } },
					el( SelectControl, {
						label: __( 'Order', 'taxonomy-query' ),
						value: query.order,
						options: [
							{ label: 'ASC', value: 'ASC' },
							{ label: 'DESC', value: 'DESC' },
						],
						onChange: ( order ) => updateQuery( { order } ),
					} )
				)
			),
			!! selectedTaxonomy?.hierarchical && el(
				Flex,
				{ gap: 3 },
				el(
					FlexItem,
					{ style: { flex: 1 } },
					el( TextControl, {
						label: __( 'Parent ID', 'taxonomy-query' ),
						type: 'number',
						value: query.parent ?? '',
						help: __( 'Use 0 for top-level terms only. Leave blank for any parent.', 'taxonomy-query' ),
						onChange: ( parent ) => updateQuery( { parent: numberValue( parent ) } ),
					} )
				),
				el(
					FlexItem,
					{ style: { flex: 1 } },
					el( TextControl, {
						label: __( 'Child of ID', 'taxonomy-query' ),
						type: 'number',
						value: query.child_of ?? '',
						onChange: ( child_of ) => updateQuery( { child_of: numberValue( child_of ) } ),
					} )
				)
			),
			el( TextControl, {
				label: __( 'Include term IDs', 'taxonomy-query' ),
				value: query.include || '',
				help: __( 'Comma-separated term IDs.', 'taxonomy-query' ),
				onChange: ( include ) => updateQuery( { include } ),
			} ),
			el( TextControl, {
				label: __( 'Exclude term IDs', 'taxonomy-query' ),
				value: query.exclude || '',
				help: __( 'Comma-separated term IDs.', 'taxonomy-query' ),
				onChange: ( exclude ) => updateQuery( { exclude } ),
			} ),
			el( TextControl, {
				label: __( 'Offset', 'taxonomy-query' ),
				type: 'number',
				value: query.offset ?? 0,
				onChange: ( offset ) => updateQuery( { offset: numberValue( offset ) } ),
			} ),
			el( BaseControl, {
				help: __( 'Use GenerateBlocks dynamic tags inside the loop: {{term_name link:term}}, {{term_description}}, {{term_count}}, {{term_url}}, {{term_slug}}, {{term_image key:url}}, and {{term_meta key:your_key}}.', 'taxonomy-query' ),
			} )
		);
	}

	function useTaxonomyQuery( enabled, query ) {
		const [ data, setData ] = useState( [] );
		const [ isResolvingData, setIsResolvingData ] = useState( !! enabled );
		const queryKey = JSON.stringify( cleanQuery( query ) );

		useEffect( () => {
			let isMounted = true;

			if ( ! enabled ) {
				setData( [] );
				setIsResolvingData( false );
				return () => {
					isMounted = false;
				};
			}

			setIsResolvingData( true );

			apiFetch( {
				path: '/taxonomy-query/v1/terms',
				method: 'POST',
				data: {
					query: {
						...DEFAULT_QUERY,
						...cleanQuery( query ),
					},
				},
			} )
				.then( ( terms ) => {
					if ( isMounted ) {
						setData( Array.isArray( terms ) ? terms : [] );
					}
				} )
				.catch( () => {
					if ( isMounted ) {
						setData( [] );
					}
				} )
				.finally( () => {
					if ( isMounted ) {
						setIsResolvingData( false );
					}
				} );

			return () => {
				isMounted = false;
			};
		}, [ enabled, queryKey ] );

		return {
			data,
			isResolvingData,
			hasResolvedData: true,
		};
	}

	addFilter(
		'generateblocks.editor.query.queryTypes',
		'taxonomy-query/query-type',
		function( queryTypes ) {
			if ( queryTypes.some( ( queryType ) => QUERY_TYPE === queryType.value ) ) {
				return queryTypes;
			}

			return [
				...queryTypes,
				{
					label: __( 'Taxonomy Query', 'taxonomy-query' ),
					value: QUERY_TYPE,
					help: __( 'Query taxonomy terms and link them to their archive pages.', 'taxonomy-query' ),
				},
			];
		}
	);

	addFilter(
		'generateblocks.editor.query.inspectorControls',
		'taxonomy-query/inspector-controls',
		function( current, props ) {
			if ( QUERY_TYPE !== props.queryType ) {
				return current;
			}

			return el( TaxonomyQueryControls, props );
		}
	);

	addFilter(
		'generateblocks.editor.looper.query',
		'taxonomy-query/looper-query',
		function( current, args ) {
			const state = useTaxonomyQuery( QUERY_TYPE === args.queryType, args.query );

			if ( QUERY_TYPE !== args.queryType ) {
				return current;
			}

			return state;
		}
	);

	addFilter(
		'generateblocks.editor.looper.fallback.postType',
		'taxonomy-query/fallback-post-type',
		function( postType, props ) {
			return QUERY_TYPE === props?.context?.[ 'generateblocks/queryType' ] ? 'term' : postType;
		}
	);

	addFilter(
		'generateblocks.editor.looper.fallback.postId',
		'taxonomy-query/fallback-post-id',
		function( postId, props ) {
			return QUERY_TYPE === props?.context?.[ 'generateblocks/queryType' ] ? 0 : postId;
		}
	);

	addFilter(
		'generateblocks.editor.htmlAttributes.style',
		'taxonomy-query/term-image-style',
		function( style, props ) {
			const loopItem = getTermLoopItem( props?.context );

			if ( ! loopItem || 'string' !== typeof style || ! style.includes( '{{' ) ) {
				return style;
			}

			return style.replace(
				/\{\{(?:featured_image|term_image)(?:\s+[^}]*)?\}\}/g,
				( tag ) => getTermImageReplacement( tag, loopItem )
			);
		},
		5
	);

	addFilter(
		'generateblocks.editor.preview.context',
		'taxonomy-query/preview-context',
		function( context ) {
			const loopItem = getTermLoopItem( context );

			if ( ! loopItem ) {
				return context;
			}

			return {
				...context,
				postId: 0,
				'taxonomy-query/currentTermId': loopItem.term_id || loopItem.id || loopItem.ID || 0,
				'taxonomy-query/currentTaxonomy': loopItem.taxonomy || '',
			};
		}
	);

	const termCardTemplate = [
		[
			'generateblocks/looper',
			{
				tagName: 'div',
				styles: {
					display: 'grid',
					gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
					gap: '1.5rem',
					'@media (max-width:768px)': {
						gridTemplateColumns: '1fr',
					},
				},
			},
			[
				[
					'generateblocks/loop-item',
					{
						tagName: 'article',
						styles: {
							backgroundColor: '#ffffff',
							borderRadius: '8px',
							display: 'flex',
							flexDirection: 'column',
							padding: '2rem',
						},
					},
					[
						[
							'generateblocks/text',
							{
								tagName: 'h3',
								content: '{{term_name link:term}}',
								styles: {
									fontSize: 'clamp(1.25rem,2vw,1.5rem)',
									fontWeight: '700',
									lineHeight: '1.2',
									marginBottom: '0.75rem',
								},
							},
						],
						[
							'generateblocks/text',
							{
								tagName: 'p',
								content: '{{term_description required:false}}',
								styles: {
									lineHeight: '1.7',
									marginBottom: '1.5rem',
								},
							},
						],
						[
							'generateblocks/text',
							{
								tagName: 'a',
								content: 'View archive',
								htmlAttributes: {
									href: '{{term_url}}',
								},
								styles: {
									fontWeight: '700',
									marginTop: 'auto',
									textDecoration: 'none',
								},
							},
						],
					],
				],
			],
		],
		[
			'generateblocks/query-no-results',
			{},
			[
				[
					'generateblocks/text',
					{
						tagName: 'p',
						content: __( 'No terms found.', 'taxonomy-query' ),
					},
				],
			],
		],
	];

	domReady( function() {
		registerBlockVariation( 'generateblocks/query', {
			name: 'taxonomy-query',
			title: __( 'Taxonomy Query', 'taxonomy-query' ),
			description: __( 'Query taxonomy terms with GenerateBlocks layout controls.', 'taxonomy-query' ),
			category: 'generateblocks',
			keywords: [ 'taxonomy', 'terms', 'categories', 'tags' ],
			attributes: {
				queryType: QUERY_TYPE,
				showTemplateSelector: false,
				query: DEFAULT_QUERY,
			},
			innerBlocks: termCardTemplate,
			scope: [ 'inserter', 'transform' ],
			isActive: ( blockAttributes ) => QUERY_TYPE === blockAttributes.queryType,
		} );
	} );
} )( window.wp );
