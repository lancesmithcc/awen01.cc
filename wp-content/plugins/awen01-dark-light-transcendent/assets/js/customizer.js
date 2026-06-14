(function () {
	if (!window.wp || !wp.customize) { return; }
	var data = window.awenDltLights || {};
	var lights = data.palette || data || {};
	var modes = data.modes || ['light', 'dark', 'transcendent'];

	function decorate(controlId, data) {
		var ctrl = wp.customize.control(controlId);
		if (!ctrl || !ctrl.container) { return; }
		ctrl.container.addClass('awen-dlt-control');
		ctrl.deferred.embedded.done(function () {
			var $desc = ctrl.container.find('.customize-control-description');
			if (!$desc.length) { return; }
			if ($desc.find('.awen-dlt-light-ref').length) { return; }
			var html = '<span class="awen-dlt-light-ref" style="background-color:' + data.color + '"></span>'
				+ '<span class="awen-dlt-light-ref-label">' + data.color + '</span> ';
			$desc.prepend(html);
		});
	}

	wp.customize.bind('ready', function () {
		modes.forEach(function (mode) {
			Object.keys(lights).forEach(function (slug) {
				decorate('awen_dlt_' + mode + '_control_' + slug, lights[slug]);
			});
		});

		var panel = wp.customize.panel('awen_dlt_panel');
		if (panel) {
			panel.expanded.bind(function (expanded) {
				document.body.classList.toggle('awen-dlt-panel-open', expanded);
			});
		}
	});
})();
