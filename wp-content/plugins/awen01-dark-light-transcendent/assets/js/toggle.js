(function () {
	var cfg = window.awenDltConfig || { defaultMode: 'dark', storageKey: 'awen-dlt-mode', modes: ['light', 'dark', 'transcendent'] };
	var root = document.documentElement;
	var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	var modes = Array.isArray(cfg.modes) && cfg.modes.length ? cfg.modes : ['light', 'dark', 'transcendent'];

	function stored() {
		try { return localStorage.getItem(cfg.storageKey); } catch (e) { return null; }
	}

	function resolve() {
		var s = stored();
		var m = s || cfg.defaultMode;
		if (m === 'auto') {
			m = mql && mql.matches ? 'dark' : 'light';
		}
		if (modes.indexOf(m) === -1) {
			m = 'dark';
		}
		return m;
	}

	function apply(mode) {
		if (modes.indexOf(mode) === -1) {
			mode = 'dark';
		}
		root.setAttribute('data-theme', mode);
		root.setAttribute('data-awen-color-mode', mode);
		document.querySelectorAll('[data-awen-dlt-toggle]').forEach(function (btn) {
			btn.setAttribute('data-current-mode', mode);
			btn.setAttribute('aria-label', 'Current color mode: ' + mode + '. Activate to switch mode.');
		});
	}

	function setMode(mode) {
		try { localStorage.setItem(cfg.storageKey, mode); } catch (e) {}
		apply(mode);
	}

	function toggle() {
		var current = root.getAttribute('data-theme') || resolve();
		var index = modes.indexOf(current);
		var next = modes[(index + 1) % modes.length] || 'dark';
		setMode(next);
	}

	document.addEventListener('click', function (e) {
		var btn = e.target.closest && e.target.closest('[data-awen-dlt-toggle]');
		if (btn) {
			e.preventDefault();
			toggle();
		}
	});

	if (mql && mql.addEventListener) {
		mql.addEventListener('change', function () {
			if (!stored()) { apply(resolve()); }
		});
	}

	apply(resolve());
})();
