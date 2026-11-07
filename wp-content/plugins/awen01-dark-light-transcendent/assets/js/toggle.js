(function () {
	var cfg = window.awenDltConfig || { defaultMode: 'dark', storageKey: 'awen-dlt-mode', modes: ['light', 'dark', 'transcendent'] };
	var root = document.documentElement;
	var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
	var modes = Array.isArray(cfg.modes) && cfg.modes.length ? cfg.modes : ['light', 'dark', 'transcendent'];

	/* WASM mode logic — optional. Loaded async; when present it powers mode
	   resolution and cycling. Falls back to the JS logic below. */
	var wasm = null;
	if (typeof wasm_bindgen !== 'undefined' && cfg.wasmUrl) {
		wasm_bindgen({ module_or_path: cfg.wasmUrl }).then(function () {
			wasm = wasm_bindgen;
		}).catch(function () {});
	}

	function stored() {
		try { return localStorage.getItem(cfg.storageKey); } catch (e) { return null; }
	}

	function resolve() {
		var s = stored();
		var prefersDark = !!(mql && mql.matches);
		if (wasm) {
			try {
				return wasm.resolve_mode(s, cfg.defaultMode, prefersDark, JSON.stringify(modes));
			} catch (e) { /* fall through to the JS fallback */ }
		}
		var m = s || cfg.defaultMode;
		if (m === 'auto') {
			m = prefersDark ? 'dark' : 'light';
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
		var next;
		if (wasm) {
			try { next = wasm.next_mode(current, JSON.stringify(modes)); } catch (e) { next = null; }
		}
		if (!next) {
			var index = modes.indexOf(current);
			next = modes[(index + 1) % modes.length] || 'dark';
		}
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
