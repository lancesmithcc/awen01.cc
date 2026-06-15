/* UltraBGs pack: Brushed Metal — Luxury pack by AWEN01
 * Anisotropic brushed steel with LIVE light: several specular bands sweep the
 * panel at different speeds, a thin bright glint crosses periodically, and the
 * fine horizontal grain sparkles as the highlights pass over it. Cursor adds a
 * tracking hotspot; taps fire a fast sweep; scroll tilts the brush angle.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'brushed',
		name: 'Brushed Metal',

		init: function (state, f) {
			state.lines = Math.round((f.h / 3) * f.density);
			state.grain = [];
			for (var i = 0; i < state.lines; i++) {
				state.grain.push(U.noise2(i * 0.7, 3.1)); // per-line brightness offset
			}
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var angle = 0.12 + f.scroll * 0.0004;

			// --- Base vertical steel gradient ---
			var bg = ctx.createLinearGradient(0, 0, 0, f.h);
			bg.addColorStop(0, U.rgba(U.mix(f.colors[0], f.colors[1], 0.2), 0.62));
			bg.addColorStop(0.5, U.rgba(f.colors[1], 0.6));
			bg.addColorStop(1, U.rgba(U.mix(f.colors[1], f.colors[0], 0.45), 0.62));
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, f.w, f.h);

			// --- Sweeping specular highlights (several, different rates) ---
			var spots = [];
			if (f.pointer.active) { spots.push({ x: f.pointer.x, w: f.w * 0.40, a: 0.26 }); }
			spots.push({ x: f.w * (0.5 + 0.46 * Math.sin(t * 0.5)), w: f.w * 0.52, a: 0.18 });
			spots.push({ x: f.w * (0.5 + 0.52 * Math.sin(t * 0.31 + 2.1)), w: f.w * 0.34, a: 0.15 });
			spots.push({ x: f.w * (0.5 + 0.58 * Math.sin(t * 0.83 + 4.2)), w: f.w * 0.20, a: 0.13 });

			ctx.globalCompositeOperation = 'lighter';
			for (var sp = 0; sp < spots.length; sp++) {
				var hsp = spots[sp];
				var rg = ctx.createLinearGradient(hsp.x - hsp.w, 0, hsp.x + hsp.w, f.h * angle * 4);
				rg.addColorStop(0, U.rgba(WHITE, 0));
				rg.addColorStop(0.5, U.rgba(U.mix(f.colors[2], WHITE, 0.6), hsp.a));
				rg.addColorStop(1, U.rgba(WHITE, 0));
				ctx.fillStyle = rg;
				ctx.fillRect(0, 0, f.w, f.h);
			}
			ctx.globalCompositeOperation = 'source-over';

			// --- Brushed grain: lines sparkle where the highlights cross ---
			var step = f.h / state.lines;
			ctx.lineWidth = 1;
			for (var i = 0; i < state.lines; i++) {
				var y = i * step + (state.grain[i] - 0.5) * step;
				var segs = 8;
				ctx.beginPath();
				for (var s = 0; s <= segs; s++) {
					var x = (s / segs) * f.w;
					var spec = 0;
					for (var q = 0; q < spots.length; q++) {
						var dxh = (x - spots[q].x) / spots[q].w;
						spec += spots[q].a * 2.4 * Math.exp(-dxh * dxh);
					}
					var jitter = (U.noise2(x * 0.05, i + t * 0.5) - 0.5) * 0.14;
					var bright = 0.1 + state.grain[i] * 0.1 + spec + jitter;
					var yy = y + (x * angle * 0.04);
					if (s === 0) { ctx.moveTo(x, yy); } else { ctx.lineTo(x, yy); }
					ctx.strokeStyle = U.rgba(U.mix(f.colors[1], WHITE, U.clamp(bright, 0, 1)), 0.28);
				}
				ctx.stroke();
			}

			// --- Periodic thin glint sweeping across the panel ---
			var period = 5.5;
			var ph = (t % period) / period;
			if (ph < 0.6) {
				var gx = ph / 0.6 * (f.w + 320) - 160;
				var gfade = Math.sin((ph / 0.6) * Math.PI);
				ctx.globalCompositeOperation = 'lighter';
				var gg = ctx.createLinearGradient(gx - 60, 0, gx + 60, f.h);
				gg.addColorStop(0, U.rgba(WHITE, 0));
				gg.addColorStop(0.5, U.rgba(WHITE, 0.34 * gfade));
				gg.addColorStop(1, U.rgba(WHITE, 0));
				ctx.fillStyle = gg;
				ctx.fillRect(gx - 60, 0, 120, f.h);
				ctx.globalCompositeOperation = 'source-over';
			}

			// --- Tap = fast bright sweep ---
			ctx.globalCompositeOperation = 'lighter';
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				var sx = tap.x - 200 + tap.age * 1100;
				var fade = 1 - tap.age / 3;
				if (fade <= 0) { continue; }
				var sgg = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0);
				sgg.addColorStop(0, U.rgba(WHITE, 0));
				sgg.addColorStop(0.5, U.rgba(WHITE, 0.34 * fade));
				sgg.addColorStop(1, U.rgba(WHITE, 0));
				ctx.fillStyle = sgg;
				ctx.fillRect(sx - 80, 0, 160, f.h);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
