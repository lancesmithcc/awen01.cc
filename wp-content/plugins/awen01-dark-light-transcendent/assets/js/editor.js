(function (wp) {
	if (!wp || !wp.hooks || !wp.element || !wp.blockEditor) { return; }

	var cfg = window.awenDltEditor || { targets: [], palette: [] };
	var TARGETS = cfg.targets || [];

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var addFilter = wp.hooks.addFilter;
	var createHOC = wp.compose.createHigherOrderComponent;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var MediaUpload = wp.blockEditor.MediaUpload;
	var MediaUploadCheck = wp.blockEditor.MediaUploadCheck || function (props) { return props.children; };
	var ColorPalette = wp.components.ColorPalette;
	var GradientPicker = wp.components.CustomGradientPicker
		|| wp.components.__experimentalCustomGradientPicker
		|| wp.components.GradientPicker
		|| wp.components.__experimentalGradientPicker;
	var PanelBody = wp.components.PanelBody;
	var BaseControl = wp.components.BaseControl;
	var Button = wp.components.Button;
	var SelectControl = wp.components.SelectControl;
	var ToggleControl = wp.components.ToggleControl;
	var __ = wp.i18n.__;

	var palette = (cfg.palette || []).map(function (p) {
		return { name: p.name, color: p.color, slug: p.slug };
	});

	addFilter('blocks.registerBlockType', 'awen-dlt/attrs', function (settings, name) {
		if (TARGETS.indexOf(name) === -1) { return settings; }
		settings.attributes = Object.assign({}, settings.attributes, {
			awenDlt: { type: 'object', default: {} }
		});
		return settings;
	});

	function genUid() {
		return 'd' + Math.random().toString(36).slice(2, 9);
	}

	var Panel = function (props) {
		var awenDlt = props.attributes.awenDlt || {};

		function update(key, value) {
			var next = Object.assign({}, awenDlt);
			next[key] = value;
			if (!next.uid) { next.uid = genUid(); }
			var hasAny = ['bgColor','textColor','bgImage','gradient','bgOverlay','textInherit'].some(function (k) { return next[k]; })
				|| (next.mode && next.mode !== 'dark');
			if (!hasAny) { next = {}; }
			props.setAttributes({ awenDlt: next });
		}

		var children = [];

		children.push(el(SelectControl, {
			key: 'mode',
			label: __('Target mode', 'awen01-dlt'),
			value: awenDlt.mode || 'dark',
			options: [
				{ label: __('Dark', 'awen01-dlt'), value: 'dark' },
				{ label: __('Transcendent', 'awen01-dlt'), value: 'transcendent' }
			],
			onChange: function (v) { update('mode', v || 'dark'); }
		}));

		children.push(el(BaseControl, { label: __('Mode background color', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'bgc' },
			el(ColorPalette, {
				colors: palette,
				value: awenDlt.bgColor || '',
				onChange: function (v) { update('bgColor', v || ''); },
				clearable: true
			})
		));

		children.push(el(BaseControl, { label: __('Mode text color', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'tc' },
			el(ColorPalette, {
				colors: palette,
				value: awenDlt.textColor || '',
				onChange: function (v) { update('textColor', v || ''); },
				clearable: true
			})
		));

		children.push(el(ToggleControl, {
			key: 'ti',
			label: __('Apply text color to child headings/links', 'awen01-dlt'),
			checked: !!awenDlt.textInherit,
			onChange: function (v) { update('textInherit', v ? 1 : 0); }
		}));

		if (GradientPicker) {
			children.push(el(BaseControl, { label: __('Mode background gradient', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'gr' },
				el(GradientPicker, {
					value: awenDlt.gradient ? awenDlt.gradient : undefined,
					gradients: [],
					onChange: function (v) { update('gradient', v || ''); },
					clearable: true,
					__nextHasNoMargin: true
				})
			));
		}

		children.push(el('div', { className: 'awen-dlt-media-row', key: 'bi' },
			el(BaseControl, { label: __('Mode background image', 'awen01-dlt'), __nextHasNoMarginBottom: true },
				el(MediaUploadCheck, null,
					el(MediaUpload, {
						allowedTypes: ['image'],
						value: awenDlt.bgImageId || 0,
						onSelect: function (m) {
							update('bgImage', m.url);
							var next = Object.assign({}, props.attributes.awenDlt || {}, { bgImage: m.url, bgImageId: m.id });
							if (!next.uid) { next.uid = genUid(); }
							props.setAttributes({ awenDlt: next });
						},
						render: function (obj) {
							return el(Fragment, null,
								awenDlt.bgImage
									? el('img', { src: awenDlt.bgImage, alt: '', style: { maxWidth: '100%', marginBottom: '8px', borderRadius: '4px' } })
									: null,
								el(Button, { variant: 'secondary', onClick: obj.open },
									awenDlt.bgImage ? __('Replace image', 'awen01-dlt') : __('Select image', 'awen01-dlt')
								),
								awenDlt.bgImage
									? el(Button, {
										variant: 'link',
										isDestructive: true,
										style: { marginLeft: '8px' },
										onClick: function () { update('bgImage', ''); }
									}, __('Remove', 'awen01-dlt'))
									: null
							);
						}
					})
				)
			)
		));

		if (GradientPicker) {
			children.push(el(BaseControl, { label: __('Overlay gradient (above image)', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'ov' },
				el(GradientPicker, {
					value: awenDlt.bgOverlay ? awenDlt.bgOverlay : undefined,
					gradients: [],
					onChange: function (v) { update('bgOverlay', v || ''); },
					clearable: true,
					__nextHasNoMargin: true
				})
			));
		}

		return el(PanelBody, {
			title: __('Awen01 Dark Light Transcendent', 'awen01-dlt'),
			initialOpen: false,
			icon: 'art',
			className: 'awen-dlt-panel'
		}, children);
	};

	var withPanel = createHOC(function (BlockEdit) {
		return function (props) {
			if (TARGETS.indexOf(props.name) === -1) {
				return el(BlockEdit, props);
			}
			return el(Fragment, null,
				el(BlockEdit, props),
				el(InspectorControls, null, el(Panel, props))
			);
		};
	}, 'awenDltWithPanel');

	addFilter('editor.BlockEdit', 'awen-dlt/panel', withPanel);

	addFilter('blocks.getSaveContent.extraProps', 'awen-dlt/class-preview', function (extra, blockType, attrs) {
		if (TARGETS.indexOf(blockType.name) === -1) { return extra; }
		var g = attrs && attrs.awenDlt;
		if (!g || !g.uid) { return extra; }
		var cls = 'awen-dlt-' + String(g.uid).replace(/[^a-z0-9]/gi, '');
		extra.className = (extra.className ? extra.className + ' ' : '') + cls;
		return extra;
	});
})(window.wp);
