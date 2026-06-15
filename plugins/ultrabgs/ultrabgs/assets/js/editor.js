/* UltraBGs block editor integration — by AWEN01 */
(function (wp) {
	'use strict';
	if (!wp || !wp.hooks) { return; }

	var addFilter = wp.hooks.addFilter;
	var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
	var Fragment = wp.element.Fragment;
	var el = wp.element.createElement;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var PanelBody = wp.components.PanelBody;
	var ToggleControl = wp.components.ToggleControl;
	var SelectControl = wp.components.SelectControl;
	var RangeControl = wp.components.RangeControl;
	var ColorIndicator = wp.components.ColorIndicator;
	var ColorPicker = wp.components.ColorPicker;
	var Dropdown = wp.components.Dropdown;
	var Button = wp.components.Button;
	var __ = wp.i18n.__;

	var data = window.UltraBGsEditor || { packs: [], defaults: {} };
	var d = data.defaults || {};
	var defaultColors = [d.color1 || '#1a6e5a', d.color2 || '#3fb6a8', d.color3 || '#7c4dff'];

	// Skip blocks where a background layer makes no sense.
	var EXCLUDED = ['core/shortcode', 'core/html', 'core/freeform'];

	/* 1) Attributes */
	addFilter('blocks.registerBlockType', 'ultrabgs/attributes', function (settings, name) {
		if (EXCLUDED.indexOf(name) !== -1) { return settings; }
		settings.attributes = Object.assign({}, settings.attributes, {
			ultrabgsEnabled: { type: 'boolean', default: false },
			ultrabgsPack: { type: 'string', default: d.pack || 'aurora' },
			ultrabgsColors: { type: 'array', default: defaultColors },
			ultrabgsOpacity: { type: 'number', default: parseFloat(d.opacity) || 0.85 },
			ultrabgsSpeed: { type: 'number', default: parseFloat(d.speed) || 1 },
			ultrabgsDensity: { type: 'number', default: parseFloat(d.density) || 1 },
			ultrabgsZIndex: { type: 'number', default: -1 }
		});
		return settings;
	});

	/* 2) Inspector panel */
	var withPanel = createHigherOrderComponent(function (BlockEdit) {
		return function (props) {
			if (EXCLUDED.indexOf(props.name) !== -1) {
				return el(BlockEdit, props);
			}
			var attrs = props.attributes;
			var set = props.setAttributes;

			function colorSwatch(i) {
				return el(Dropdown, {
					key: 'c' + i,
					renderToggle: function (toggle) {
						return el(Button, {
							onClick: toggle.onToggle,
							style: { padding: '4px' },
							label: __('Color', 'ultrabgs') + ' ' + (i + 1)
						}, el(ColorIndicator, { colorValue: attrs.ultrabgsColors[i] }));
					},
					renderContent: function () {
						return el(ColorPicker, {
							color: attrs.ultrabgsColors[i],
							enableAlpha: false,
							onChange: function (value) {
								var colors = attrs.ultrabgsColors.slice();
								colors[i] = value;
								set({ ultrabgsColors: colors });
							}
						});
					}
				});
			}

			var controls = [
				el(ToggleControl, {
					key: 'on',
					label: __('Enable animated background', 'ultrabgs'),
					checked: !!attrs.ultrabgsEnabled,
					onChange: function (v) { set({ ultrabgsEnabled: v }); }
				})
			];

			if (attrs.ultrabgsEnabled) {
				controls.push(
					el(SelectControl, {
						key: 'pack',
						label: __('Animation pack', 'ultrabgs'),
						value: attrs.ultrabgsPack,
						options: data.packs,
						onChange: function (v) { set({ ultrabgsPack: v }); }
					}),
					el('div', { key: 'colors', style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
						[colorSwatch(0), colorSwatch(1), colorSwatch(2)]),
					el(RangeControl, {
						key: 'opacity', label: __('Opacity', 'ultrabgs'),
						value: attrs.ultrabgsOpacity, min: 0, max: 1, step: 0.05,
						onChange: function (v) { set({ ultrabgsOpacity: v }); }
					}),
					el(RangeControl, {
						key: 'speed', label: __('Speed', 'ultrabgs'),
						value: attrs.ultrabgsSpeed, min: 0.1, max: 3, step: 0.1,
						onChange: function (v) { set({ ultrabgsSpeed: v }); }
					}),
					el(RangeControl, {
						key: 'density', label: __('Density / detail', 'ultrabgs'),
						value: attrs.ultrabgsDensity, min: 0.3, max: 2, step: 0.1,
						onChange: function (v) { set({ ultrabgsDensity: v }); }
					}),
					el(RangeControl, {
						key: 'zindex', label: __('Z-index', 'ultrabgs'),
						value: attrs.ultrabgsZIndex, min: -10, max: 50, step: 1,
						onChange: function (v) { set({ ultrabgsZIndex: v }); }
					})
				);
			}

			return el(Fragment, null,
				el(BlockEdit, props),
				el(InspectorControls, null,
					el(PanelBody, { title: __('UltraBGs', 'ultrabgs'), initialOpen: false }, controls)
				)
			);
		};
	}, 'ultrabgsWithPanel');
	addFilter('editor.BlockEdit', 'ultrabgs/panel', withPanel);

	/* 3) Save attributes onto the block wrapper */
	function safeHex(c) {
		return (typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c)) ? c : null;
	}
	function clampNum(v, min, max, dflt) {
		v = parseFloat(v);
		if (isNaN(v)) { return dflt; }
		return v < min ? min : (v > max ? max : v);
	}
	function configFor(attrs) {
		var cols = (Array.isArray(attrs.ultrabgsColors) ? attrs.ultrabgsColors : [])
			.slice(0, 8).map(safeHex).filter(Boolean);
		if (!cols.length) { cols = defaultColors.slice(); }
		return JSON.stringify({
			colors: cols,
			opacity: clampNum(attrs.ultrabgsOpacity, 0, 1, 0.85),
			speed: clampNum(attrs.ultrabgsSpeed, 0.1, 3, 1),
			density: clampNum(attrs.ultrabgsDensity, 0.3, 2, 1),
			zIndex: Math.round(clampNum(attrs.ultrabgsZIndex, -100, 100, -1))
		});
	}

	addFilter('blocks.getSaveContent.extraProps', 'ultrabgs/save-props', function (extraProps, blockType, attrs) {
		if (attrs && attrs.ultrabgsEnabled && attrs.ultrabgsPack) {
			extraProps['data-ultrabgs'] = String(attrs.ultrabgsPack).replace(/[^a-z0-9_-]/gi, '');
			extraProps['data-ubgs-config'] = configFor(attrs);
		}
		return extraProps;
	});
})(window.wp);
