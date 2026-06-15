(function (wp) {
	if (!wp || !wp.hooks || !wp.element || !wp.blockEditor) { return; }

	var cfg = window.awenDltEditor || { targets: [], palette: [] };
	var TARGETS = cfg.targets || [];

	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var useState = wp.element.useState;
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
	var ButtonGroup = wp.components.ButtonGroup;
	var ToggleControl = wp.components.ToggleControl;
	var __ = wp.i18n.__;

	var EDIT_MODES = ['dark', 'transcendent'];
	var FLAT_KEYS = ['bgColor', 'textColor', 'borderColor', 'bgImage', 'bgImageId', 'gradient', 'bgOverlay', 'textInherit'];

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

	// Return per-mode buckets, migrating the legacy flat schema if present.
	function normalizeModes(awenDlt) {
		if (awenDlt && awenDlt.modes && typeof awenDlt.modes === 'object') {
			return Object.assign({}, awenDlt.modes);
		}
		var modes = {};
		if (awenDlt) {
			var bucket = {};
			FLAT_KEYS.forEach(function (k) {
				if (awenDlt[k] !== undefined && awenDlt[k] !== '' && awenDlt[k] !== 0) {
					bucket[k] = awenDlt[k];
				}
			});
			if (Object.keys(bucket).length) {
				var m = (awenDlt.mode && awenDlt.mode !== 'light') ? awenDlt.mode : 'dark';
				modes[m] = bucket;
			}
		}
		return modes;
	}

	function bucketHasContent(bucket) {
		return bucket && Object.keys(bucket).some(function (k) {
			return k !== 'bgImageId' && bucket[k] !== undefined && bucket[k] !== '' && bucket[k] !== 0 && bucket[k] !== false;
		});
	}

	var Panel = function (props) {
		var modeState = useState('dark');
		var editMode = modeState[0];
		var setEditMode = modeState[1];

		var awenDlt = props.attributes.awenDlt || {};
		var modes = normalizeModes(awenDlt);
		var bucket = modes[editMode] || {};

		function commit(nextModes) {
			Object.keys(nextModes).forEach(function (m) {
				if (!bucketHasContent(nextModes[m])) { delete nextModes[m]; }
			});
			if (Object.keys(nextModes).length === 0) {
				props.setAttributes({ awenDlt: {} });
				return;
			}
			props.setAttributes({ awenDlt: { uid: awenDlt.uid || genUid(), modes: nextModes } });
		}

		function update(key, value) {
			var nextModes = normalizeModes(props.attributes.awenDlt || {});
			var b = Object.assign({}, nextModes[editMode] || {});
			if (value === '' || value === 0 || value === false || value === null || value === undefined) {
				delete b[key];
			} else {
				b[key] = value;
			}
			nextModes[editMode] = b;
			commit(nextModes);
		}

		function updateImage(url, id) {
			var nextModes = normalizeModes(props.attributes.awenDlt || {});
			var b = Object.assign({}, nextModes[editMode] || {});
			if (url) {
				b.bgImage = url;
				b.bgImageId = id || 0;
			} else {
				delete b.bgImage;
				delete b.bgImageId;
			}
			nextModes[editMode] = b;
			commit(nextModes);
		}

		var children = [];

		children.push(el(BaseControl, {
			label: __('Editing mode', 'awen01-dlt'),
			help: __('Light mode uses the block native GenerateBlocks colors. Set dark and transcendent overrides independently here.', 'awen01-dlt'),
			__nextHasNoMarginBottom: true,
			key: 'editmode'
		},
			el(ButtonGroup, null, EDIT_MODES.map(function (m) {
				var has = bucketHasContent(modes[m]);
				return el(Button, {
					key: m,
					variant: editMode === m ? 'primary' : 'secondary',
					onClick: function () { setEditMode(m); }
				}, (m === 'dark' ? __('Dark', 'awen01-dlt') : __('Transcendent', 'awen01-dlt')) + (has ? ' ●' : ''));
			}))
		));

		children.push(el(BaseControl, { label: __('Mode background color', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'bgc' },
			el(ColorPalette, {
				colors: palette,
				value: bucket.bgColor || '',
				onChange: function (v) { update('bgColor', v || ''); },
				clearable: true
			})
		));

		children.push(el(BaseControl, { label: __('Mode text color', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'tc' },
			el(ColorPalette, {
				colors: palette,
				value: bucket.textColor || '',
				onChange: function (v) { update('textColor', v || ''); },
				clearable: true
			})
		));

		children.push(el(BaseControl, { label: __('Mode border color', 'awen01-dlt'), help: __('Recolors the block existing border for this mode.', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'bdc' },
			el(ColorPalette, {
				colors: palette,
				value: bucket.borderColor || '',
				onChange: function (v) { update('borderColor', v || ''); },
				clearable: true
			})
		));

		children.push(el(ToggleControl, {
			key: 'ti',
			label: __('Apply text color to child headings/links', 'awen01-dlt'),
			checked: !!bucket.textInherit,
			onChange: function (v) { update('textInherit', v ? 1 : 0); }
		}));

		if (GradientPicker) {
			children.push(el(BaseControl, { label: __('Mode background gradient', 'awen01-dlt'), __nextHasNoMarginBottom: true, key: 'gr' },
				el(GradientPicker, {
					value: bucket.gradient ? bucket.gradient : undefined,
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
						value: bucket.bgImageId || 0,
						onSelect: function (m) { updateImage(m.url, m.id); },
						render: function (obj) {
							return el(Fragment, null,
								bucket.bgImage
									? el('img', { src: bucket.bgImage, alt: '', style: { maxWidth: '100%', marginBottom: '8px', borderRadius: '4px' } })
									: null,
								el(Button, { variant: 'secondary', onClick: obj.open },
									bucket.bgImage ? __('Replace image', 'awen01-dlt') : __('Select image', 'awen01-dlt')
								),
								bucket.bgImage
									? el(Button, {
										variant: 'link',
										isDestructive: true,
										style: { marginLeft: '8px' },
										onClick: function () { updateImage('', 0); }
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
					value: bucket.bgOverlay ? bucket.bgOverlay : undefined,
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
