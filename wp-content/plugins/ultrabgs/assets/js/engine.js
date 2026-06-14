/**
 * UltraBGs engine — by AWEN01
 * Pack registry + canvas lifecycle + unified input (pointer / scroll / tap).
 *
 * Pack contract:
 *   UltraBGs.registerPack({
 *     id: 'my-pack',
 *     init(state, frame)   // optional, called once and on resize
 *     render(ctx, state, frame)  // called every animation frame
 *   });
 *
 * frame = { w, h, t, dt, pointer:{x,y,active,vx,vy}, scroll, scrollVel,
 *           taps:[{x,y,age}], colors:[rgb...], hex:[..], opacity, speed, density }
 */
(function () {
	'use strict';
	if (window.UltraBGs) { return; }

	/* ---------- utils ---------- */
	function hexToRgb(hex) {
		var h = (hex || '#888888').replace('#', '');
		if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
		var n = parseInt(h, 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
	}
	function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }
	function mix(a, b, t) {
		return { r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) };
	}
	function lerp(a, b, t) { return a + (b - a) * t; }
	function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
	function smoothstep(e0, e1, x) {
		var t = clamp((x - e0) / (e1 - e0), 0, 1);
		return t * t * (3 - 2 * t);
	}
	// Cheap deterministic 2D value noise.
	function hash2(x, y) {
		var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return s - Math.floor(s);
	}
	function noise2(x, y) {
		var xi = Math.floor(x), yi = Math.floor(y);
		var xf = x - xi, yf = y - yi;
		var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
		var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
		return lerp(lerp(a, b, u), lerp(c, d, u), v);
	}

	/* ---------- shared input ---------- */
	var input = {
		px: -9999, py: -9999, pvx: 0, pvy: 0, active: false,
		scrollY: 0, scrollVel: 0, taps: []
	};
	var lastPX = -9999, lastPY = -9999, lastScroll = 0;

	window.addEventListener('pointermove', function (e) {
		input.px = e.clientX; input.py = e.clientY; input.active = true;
	}, { passive: true });
	window.addEventListener('pointerleave', function () { input.active = false; });
	window.addEventListener('blur', function () { input.active = false; });

	// "Tap in undefined areas" — pointerdown anywhere that isn't an interactive element.
	window.addEventListener('pointerdown', function (e) {
		var t = e.target;
		if (t && t.closest && t.closest('a,button,input,textarea,select,label,summary,[role="button"],[contenteditable]')) { return; }
		input.taps.push({ cx: e.clientX, cy: e.clientY, t: performance.now() });
		if (input.taps.length > 8) { input.taps.shift(); }
	}, { passive: true });

	window.addEventListener('scroll', function () {
		input.scrollY = window.scrollY || 0;
	}, { passive: true });

	var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- instance ---------- */
	var instances = [];

	function Instance(host, packId, config) {
		this.host = host;
		this.packId = packId;
		this.cfg = config || {};
		this.state = {};
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'ultrabgs-canvas';
		this.canvas.setAttribute('aria-hidden', 'true');
		this.ctx = this.canvas.getContext('2d');
		this.rect = { left: 0, top: 0, width: 0, height: 0 };
		this.dpr = Math.min(window.devicePixelRatio || 1, this.cfg.maxDpr || 1);
		this.inited = false;
		this.lastRender = 0;
		this.frameInterval = 1 / (this.cfg.fps || 24);

		var fixed = host === document.body || host.id === 'ultrabgs-page-layer';
		this.fixed = fixed;
		if (fixed && host !== document.body && typeof this.cfg.zIndex === 'number') {
			host.style.zIndex = String(this.cfg.zIndex);
		}
		this.canvas.style.position = fixed ? 'fixed' : 'absolute';
		this.canvas.style.zIndex = String(typeof this.cfg.zIndex === 'number' ? this.cfg.zIndex : -1);
		this.canvas.style.opacity = String(clamp(this.cfg.opacity != null ? this.cfg.opacity : 0.85, 0, 1));

		if (!fixed) {
			var pos = getComputedStyle(host).position;
			if (pos === 'static') { host.classList.add('ultrabgs-host'); }
		}
		host.appendChild(this.canvas);

		var hexes = (this.cfg.colors && this.cfg.colors.length ? this.cfg.colors : ['#1a6e5a', '#3fb6a8', '#7c4dff']);
		this.hex = hexes;
		this.colors = hexes.map(hexToRgb);

		var self = this;
		if (window.ResizeObserver && !fixed) {
			this.ro = new ResizeObserver(function () { self.resize(); });
			this.ro.observe(host);
		}
		this.resize();
	}

	Instance.prototype.resize = function () {
		var w, h;
		if (this.fixed) {
			w = window.innerWidth; h = window.innerHeight;
			this.rect = { left: 0, top: 0, width: w, height: h };
		} else {
			var r = this.host.getBoundingClientRect();
			this.rect = r;
			w = Math.max(1, r.width); h = Math.max(1, r.height);
		}
		this.canvas.width = Math.round(w * this.dpr);
		this.canvas.height = Math.round(h * this.dpr);
		this.canvas.style.width = w + 'px';
		this.canvas.style.height = h + 'px';
		this.w = w; this.h = h;
		this.inited = false; // re-init pack layout on resize
	};

	Instance.prototype.updateRect = function () {
		if (!this.fixed) { this.rect = this.host.getBoundingClientRect(); }
	};

	Instance.prototype.frame = function (t, dt) {
		var pack = registry[this.packId];
		if (!pack) { return; }
		if (!this.fixed && (this.rect.bottom < -120 || this.rect.top > window.innerHeight + 120)) { return; }
		if (this.inited && this.lastRender && t - this.lastRender < this.frameInterval) { return; }
		var renderDt = this.lastRender ? Math.min(0.1, t - this.lastRender) : dt;
		this.lastRender = t;

		var now = performance.now();
		var taps = [];
		for (var i = 0; i < input.taps.length; i++) {
			var tap = input.taps[i];
			var age = (now - tap.t) / 1000;
			if (age < 3) {
				taps.push({ x: tap.cx - this.rect.left, y: tap.cy - this.rect.top, age: age });
			}
		}

		var frame = {
			w: this.w, h: this.h, t: t, dt: renderDt,
			pointer: {
				x: input.px - this.rect.left,
				y: input.py - this.rect.top,
				vx: input.pvx, vy: input.pvy,
				active: input.active
			},
			scroll: input.scrollY,
			scrollVel: input.scrollVel,
			taps: taps,
			colors: this.colors,
			hex: this.hex,
			opacity: this.cfg.opacity != null ? this.cfg.opacity : 0.85,
			speed: this.cfg.speed != null ? this.cfg.speed : 1,
			density: this.cfg.density != null ? this.cfg.density : 1,
			reduced: reducedMotion
		};

		var ctx = this.ctx;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.w, this.h);

		if (!this.inited) {
			this.state = {};
			if (pack.init) { pack.init(this.state, frame); }
			this.inited = true;
		}
		pack.render(ctx, this.state, frame);
	};

	Instance.prototype.destroy = function () {
		if (this.ro) { this.ro.disconnect(); }
		if (this.canvas.parentNode) { this.canvas.parentNode.removeChild(this.canvas); }
	};

	/* ---------- registry + loop ---------- */
	var registry = {};
	var rafId = null;
	var startT = performance.now();
	var prevT = startT;
	var rectTick = 0;

	function loop(now) {
		var dt = Math.min(0.05, (now - prevT) / 1000);
		prevT = now;
		var t = (now - startT) / 1000;

		// Pointer velocity (smoothed) + scroll velocity.
		input.pvx = lerp(input.pvx, lastPX > -9000 ? (input.px - lastPX) : 0, 0.3);
		input.pvy = lerp(input.pvy, lastPY > -9000 ? (input.py - lastPY) : 0, 0.3);
		lastPX = input.px; lastPY = input.py;
		input.scrollVel = lerp(input.scrollVel, input.scrollY - lastScroll, 0.25);
		lastScroll = input.scrollY;

		// Refresh element rects ~10x/s (scroll moves block-level layers).
		rectTick += dt;
		if (rectTick > 0.1) {
			rectTick = 0;
			for (var j = 0; j < instances.length; j++) { instances[j].updateRect(); }
		}

		for (var i = 0; i < instances.length; i++) { instances[i].frame(t, dt); }

		if (!reducedMotion) { rafId = requestAnimationFrame(loop); }
	}

	function ensureLoop() {
		if (rafId === null && instances.length) {
			prevT = performance.now();
			rafId = requestAnimationFrame(loop);
			if (reducedMotion) {
				// Render a single static frame.
				setTimeout(function () { loop(performance.now()); }, 50);
			}
		}
	}

	window.addEventListener('resize', function () {
		for (var i = 0; i < instances.length; i++) { instances[i].resize(); }
	});

	var UltraBGs = {
		utils: { hexToRgb: hexToRgb, rgba: rgba, mix: mix, lerp: lerp, clamp: clamp, smoothstep: smoothstep, noise2: noise2 },
		packs: registry,
		registerPack: function (def) {
			if (def && def.id && typeof def.render === 'function') { registry[def.id] = def; }
		},
		mount: function (host, packId, config) {
			var inst = new Instance(host, packId, config);
			instances.push(inst);
			ensureLoop();
			return inst;
		},
		unmount: function (inst) {
			var i = instances.indexOf(inst);
			if (i > -1) { instances.splice(i, 1); inst.destroy(); }
		},
		sanitizeConfig: function (cfg) {
			cfg = (cfg && typeof cfg === 'object') ? cfg : {};
			var out = {};
			if (Array.isArray(cfg.colors)) {
				out.colors = cfg.colors
					.filter(function (c) { return typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c); })
					.slice(0, 8);
			}
			if (cfg.opacity != null) { out.opacity = clamp(+cfg.opacity || 0, 0, 1); }
			if (cfg.speed != null) { out.speed = clamp(+cfg.speed || 1, 0.1, 3); }
			if (cfg.density != null) { out.density = clamp(+cfg.density || 1, 0.3, 2); }
			if (cfg.zIndex != null) { out.zIndex = Math.round(clamp(+cfg.zIndex || 0, -100, 100)); }
			if (cfg.fps != null) { out.fps = Math.round(clamp(+cfg.fps || 30, 12, 60)); }
			if (cfg.maxDpr != null) { out.maxDpr = clamp(+cfg.maxDpr || 1, 0.75, 2); }
			return out;
		},
		scan: function (root) {
			var scope = root || document;
			var nodes = scope.querySelectorAll('[data-ultrabgs]:not([data-ubgs-mounted])');
			for (var i = 0; i < nodes.length; i++) {
				var el = nodes[i];
				var pack = (el.getAttribute('data-ultrabgs') || '').replace(/[^a-z0-9_-]/gi, '');
				el.setAttribute('data-ubgs-mounted', '1');
				if (!pack || !registry[pack]) { continue; } // only mount known packs
				var cfg = {};
				try { cfg = JSON.parse(el.getAttribute('data-ubgs-config') || '{}'); } catch (e) { cfg = {}; }
				UltraBGs.mount(el, pack, UltraBGs.sanitizeConfig(cfg));
			}
		}
	};
	window.UltraBGs = UltraBGs;

	function boot() {
		// Full-page layer.
		var g = window.UltraBGsGlobal;
		var layer = document.getElementById('ultrabgs-page-layer');
		if (g && g.enabled && layer && !layer.getAttribute('data-ubgs-mounted')) {
			var gpack = (g.pack || '').replace(/[^a-z0-9_-]/gi, '');
			layer.setAttribute('data-ubgs-mounted', '1');
			if (gpack && registry[gpack]) {
				UltraBGs.mount(layer, gpack, UltraBGs.sanitizeConfig(g.config || {}));
			}
		}
		UltraBGs.scan();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
