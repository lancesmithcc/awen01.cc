/* UltraBGs pack: Cymatic Plate — Sonic pack by AWEN01
 * A Chladni plate: particles collect along the nodal lines of a square
 * plate's standing wave. The driving frequency (the mode numbers m,n) shifts
 * with cursor position and scroll, so the pattern morphs between classic
 * cymatic figures. Taps "strike" the plate — a flash and a momentary mode
 * jump. Hovering pulls the mode toward the pointer's mapped frequency.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	// Chladni amplitude for a square plate (superposed symmetric modes).
	function chladni(x, y, m, n) {
		return Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
			- Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y);
	}

	window.UltraBGs.registerPack({
		id: 'cymaticplate',
		name: 'Cymatic Plate',

		init: function (state, f) {
			var count = Math.round(2600 * f.density);
			var pts = [];
			for (var i = 0; i < count; i++) {
				pts.push({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, ci: i % 3 });
			}
			state.pts = pts;
			state.mf = 3; state.nf = 2; state.tm = 3; state.tn = 2; state.flash = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;

			// Mode numbers are INTEGERS in real Chladni figures — fractional
			// values smear the pattern. Steer a target with cursor/scroll,
			// then snap to integers so every state is a clean symmetric figure.
			var tm = 2 + (f.pointer.active ? Math.round(f.pointer.x / f.w * 6) : 3 + Math.round(Math.sin(t * 0.06) * 2));
			var tn = 2 + (f.pointer.active ? Math.round(f.pointer.y / f.h * 6) : 3 + Math.round(Math.cos(t * 0.05) * 2));
			tm = Math.round(tm + f.scroll * 0.004);
			state.tm = tm; state.tn = tn;
			// Ease the rendered mode toward the integer target, then snap when close.
			state.mf = U.lerp(state.mf == null ? tm : state.mf, tm, 0.04);
			state.nf = U.lerp(state.nf == null ? tn : state.nf, tn, 0.04);
			var m = Math.abs(state.mf - tm) < 0.08 ? tm : state.mf;
			var n = Math.abs(state.nf - tn) < 0.08 ? tn : state.nf;

			// Tap strike: flash + a clean integer mode bump.
			for (var k = 0; k < f.taps.length; k++) {
				if (f.taps[k].age < 0.1) { state.flash = 1; }
			}
			state.flash *= 0.9;

			var size = Math.min(f.w, f.h);
			var ox = (f.w - size) / 2, oy = (f.h - size) / 2;

			// Plate backing wash.
			if (state.flash > 0.02) {
				ctx.fillStyle = U.rgba(WHITE, state.flash * 0.12);
				ctx.fillRect(ox, oy, size, size);
			}

			var pts = state.pts;
			for (var i = 0; i < pts.length; i++) {
				var p = pts[i];
				// Move toward nearest node: descend the |amplitude| gradient.
				var a = chladni(p.x, p.y, m, n);
				var eps = 0.004;
				var gx = (Math.abs(chladni(p.x + eps, p.y, m, n)) - Math.abs(a)) / eps;
				var gy = (Math.abs(chladni(p.x, p.y + eps, m, n)) - Math.abs(a)) / eps;
				// Vibration jitter scales with local amplitude (antinodes shake).
				var jit = Math.abs(a) * 0.004;
				p.vx = (p.vx - gx * 0.0006) * 0.8 + (Math.random() - 0.5) * jit;
				p.vy = (p.vy - gy * 0.0006) * 0.8 + (Math.random() - 0.5) * jit;
				p.x += p.vx; p.y += p.vy;
				if (p.x < 0) { p.x = 0; p.vx = -p.vx; } if (p.x > 1) { p.x = 1; p.vx = -p.vx; }
				if (p.y < 0) { p.y = 0; p.vy = -p.vy; } if (p.y > 1) { p.y = 1; p.vy = -p.vy; }

				var sx = ox + p.x * size, sy = oy + p.y * size;
				var settle = 1 - U.clamp(Math.abs(a), 0, 1); // bright on nodes
				var col = U.mix(f.colors[p.ci % 3], WHITE, settle * 0.5 + state.flash * 0.4);
				ctx.fillStyle = U.rgba(col, 0.25 + settle * 0.55);
				var r = 0.8 + settle * 1.4;
				ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
			}
		}
	});
})();
