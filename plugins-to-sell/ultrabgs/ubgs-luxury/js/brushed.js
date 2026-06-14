/* UltraBGs pack: Brushed Metal — Luxury pack by AWEN01
 * Anisotropic brushed steel: fine horizontal grain lines with a broad
 * specular reflection that sweeps across, the way light travels over a
 * brushed-metal panel. Cursor moves the reflection hotspot; taps send a
 * bright sweep across the panel; scroll tilts the reflection angle.
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

			// Reflection hotspot: cursor x, else a slow auto sweep.
			var hot = f.pointer.active ? f.pointer.x : f.w * (0.5 + 0.42 * Math.sin(t * 0.25));
			var angle = 0.12 + f.scroll * 0.0004; // tilt
			var spanW = f.w * 0.5;

			// Base vertical steel gradient.
			var bg = ctx.createLinearGradient(0, 0, 0, f.h);
			bg.addColorStop(0, U.rgba(U.mix(f.colors[0], f.colors[1], 0.2), 0.6));
			bg.addColorStop(0.5, U.rgba(f.colors[1], 0.6));
			bg.addColorStop(1, U.rgba(U.mix(f.colors[1], f.colors[0], 0.4), 0.6));
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, f.w, f.h);

			// Broad specular reflection band, tilted.
			ctx.globalCompositeOperation = 'lighter';
			var rg = ctx.createLinearGradient(hot - spanW, 0, hot + spanW, f.h * angle * 4);
			rg.addColorStop(0, U.rgba(WHITE, 0));
			rg.addColorStop(0.5, U.rgba(U.mix(f.colors[2], WHITE, 0.6), 0.22));
			rg.addColorStop(1, U.rgba(WHITE, 0));
			ctx.fillStyle = rg;
			ctx.fillRect(0, 0, f.w, f.h);
			ctx.globalCompositeOperation = 'source-over';

			// Brushed grain: fine horizontal lines, brighter near the hotspot.
			var step = f.h / state.lines;
			ctx.lineWidth = 1;
			for (var i = 0; i < state.lines; i++) {
				var y = i * step + (state.grain[i] - 0.5) * step;
				// Sample brightness across width using a few segments for the sheen.
				var segs = 8;
				ctx.beginPath();
				for (var s = 0; s <= segs; s++) {
					var x = (s / segs) * f.w;
					var dxh = (x - hot) / spanW;
					var spec = Math.exp(-dxh * dxh) * 0.5;
					var jitter = (U.noise2(x * 0.05, i + t * 0.1) - 0.5) * 0.1;
					var bright = 0.12 + state.grain[i] * 0.1 + spec + jitter;
					var yy = y + (x * angle * 0.04);
					if (s === 0) { ctx.moveTo(x, yy); } else { ctx.lineTo(x, yy); }
					ctx.strokeStyle = U.rgba(U.mix(f.colors[1], WHITE, U.clamp(bright, 0, 1)), 0.25);
				}
				ctx.stroke();
			}

			// Tap = bright sweep line.
			ctx.globalCompositeOperation = 'lighter';
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				var sx = tap.x - 200 + tap.age * 900;
				var fade = 1 - tap.age / 3;
				if (fade <= 0) { continue; }
				var sg = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0);
				sg.addColorStop(0, U.rgba(WHITE, 0));
				sg.addColorStop(0.5, U.rgba(WHITE, 0.3 * fade));
				sg.addColorStop(1, U.rgba(WHITE, 0));
				ctx.fillStyle = sg;
				ctx.fillRect(sx - 80, 0, 160, f.h);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
