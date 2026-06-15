/* UltraBGs pack: Halftone Dots — by AWEN01
 * v1.1: quieter ambient field, sharper reactivity (cursor wake, velocity
 * swell, faster tap rings, scroll-velocity pulse).
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'halftone',
		name: 'Halftone Dots',

		init: function (state, f) {
			state.gap = Math.max(18, 34 / f.density);
			state.energy = 0; // smoothed interaction energy
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var gap = state.gap;
			var maxR = gap * 0.46;
			var c0 = f.colors[0], c1 = f.colors[1], c2 = f.colors[2] || f.colors[1];
			var white = { r: 255, g: 255, b: 255 };
			var scrollPhase = f.scroll * 0.004;

			// Cursor speed feeds a smoothed energy level — fast motion makes
			// the whole field lean in; stillness lets it settle right down.
			var pSpeed = Math.sqrt(f.pointer.vx * f.pointer.vx + f.pointer.vy * f.pointer.vy);
			var target = U.clamp(pSpeed / 30, 0, 1) + U.clamp(Math.abs(f.scrollVel) / 60, 0, 0.6);
			state.energy = U.lerp(state.energy, f.pointer.active || target > 0 ? target : 0, 0.08);
			var energy = state.energy;

			for (var y = gap / 2; y < f.h + gap; y += gap) {
				var rowOff = (Math.floor(y / gap) % 2) * gap * 0.5;
				for (var x = gap / 2 - rowOff; x < f.w + gap; x += gap) {
					// Quieter ambient breathing — small, slow, low-contrast.
					var n = U.noise2(x * 0.005 + t * 0.08, y * 0.005 - scrollPhase);
					var r = maxR * (0.14 + n * 0.2);
					var alpha = 0.45 + n * 0.15;

					// Cursor contact: wider field, swell weighted by motion
					// energy and a directional wake behind the pointer.
					var prox = 0;
					if (f.pointer.active) {
						var dx = x - f.pointer.x, dy = y - f.pointer.y;
						var d = Math.sqrt(dx * dx + dy * dy);
						prox = U.smoothstep(260, 0, d);

						// Wake: dots just behind the velocity vector linger.
						if (pSpeed > 1 && d > 1) {
							var dot = (-dx * f.pointer.vx - dy * f.pointer.vy) / (d * pSpeed);
							prox += U.smoothstep(320, 0, d) * U.clamp(dot, 0, 1) * energy * 0.6;
						}
						prox = U.clamp(prox, 0, 1.4);
						r += maxR * prox * (0.7 + energy * 0.9);
					}

					// Tap ripples: faster, tighter rings with a crisp crest.
					var ripple = 0;
					for (var k = 0; k < f.taps.length; k++) {
						var tap = f.taps[k];
						var tdx = x - tap.x, tdy = y - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 560;
						ripple += Math.exp(-Math.pow((td - ring) / 42, 2)) * Math.pow(1 - tap.age / 3, 1.5);
					}
					ripple = Math.min(1.2, ripple);
					r += maxR * ripple;

					r = Math.min(r, gap * 0.62);
					if (r < 0.35) { continue; }

					var react = U.clamp(prox + ripple, 0, 1);
					var col = n < 0.5 ? U.mix(c0, c1, n * 2) : U.mix(c1, c2, (n - 0.5) * 2);
					if (react > 0.01) {
						col = U.mix(col, white, react * 0.5);
						alpha = U.clamp(alpha + react * 0.5, 0, 1);
					}

					ctx.beginPath();
					ctx.arc(x, y, r, 0, 6.2832);
					ctx.fillStyle = U.rgba(col, alpha);
					ctx.fill();
				}
			}
		}
	});
})();
