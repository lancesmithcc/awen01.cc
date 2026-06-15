/* UltraBGs pack: Spectrum Bars — Sonic pack by AWEN01
 * A frequency analyzer: a row of bars that bounce to a synthetic spectrum,
 * with falling peak caps. Overall loudness is driven by cursor speed, scroll
 * velocity and taps. The cursor acts like a graphic-EQ finger — bars near it
 * are boosted; taps slam every bar to full then let them fall; scroll shifts
 * the spectral content. Mirrored above and below the baseline.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'spectrum',
		name: 'Spectrum Bars',

		init: function (state, f) {
			state.n = Math.max(16, Math.round(48 * f.density));
			state.vals = new Float32Array(state.n);
			state.peaks = new Float32Array(state.n);
			state.energy = 0.2;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var n = state.n;
			var bw = f.w / n;
			var base = f.h * 0.5;
			var maxH = f.h * 0.46;

			var pSpeed = Math.sqrt(f.pointer.vx * f.pointer.vx + f.pointer.vy * f.pointer.vy);
			var drive = U.clamp(pSpeed / 26, 0, 1) + U.clamp(Math.abs(f.scrollVel) / 50, 0, 0.7);
			state.energy = U.lerp(state.energy, 0.2 + drive, 0.1);
			var energy = state.energy;
			var shift = f.scroll * 0.01;

			var tapHit = 0;
			for (var k = 0; k < f.taps.length; k++) { tapHit += Math.exp(-f.taps[k].age * 4); }
			tapHit = Math.min(1, tapHit);

			for (var i = 0; i < n; i++) {
				var fr = i / n;
				// Synthetic spectrum: bass-heavy, animated, per-bin wobble.
				var target = (
					Math.pow(1 - fr, 1.5) * (0.5 + 0.5 * Math.sin(t * 3 + i * 0.5 + shift))
					+ 0.3 * Math.sin(t * 7 + i * 1.3)
					+ (U.noise2(i * 0.5, t * 2) - 0.3)
				) * energy;

				// Cursor EQ-finger boost.
				if (f.pointer.active) {
					var bx = (i + 0.5) * bw;
					target += U.smoothstep(120, 0, Math.abs(f.pointer.x - bx)) * 0.7;
				}
				target = Math.max(0, target + tapHit);

				// Bar rises fast, falls slow.
				var v = state.vals[i];
				v = target > v ? U.lerp(v, target, 0.5) : U.lerp(v, target, 0.12);
				state.vals[i] = v;
				// Peak cap.
				if (v > state.peaks[i]) { state.peaks[i] = v; }
				else { state.peaks[i] -= 0.012; }

				var h = U.clamp(v, 0, 1.2) * maxH;
				var x = i * bw;
				var col = fr < 0.5 ? U.mix(f.colors[0], f.colors[1], fr * 2) : U.mix(f.colors[1], f.colors[2], (fr - 0.5) * 2);
				var bright = U.clamp(v, 0, 1);
				col = U.mix(col, WHITE, bright * 0.4);

				// Mirrored bars.
				ctx.fillStyle = U.rgba(col, 0.35 + bright * 0.45);
				ctx.fillRect(x + 1, base - h, bw - 2, h);
				ctx.fillRect(x + 1, base, bw - 2, h);

				// Peak caps.
				var ph = U.clamp(state.peaks[i], 0, 1.2) * maxH;
				ctx.fillStyle = U.rgba(U.mix(col, WHITE, 0.5), 0.6);
				ctx.fillRect(x + 1, base - ph - 3, bw - 2, 2);
				ctx.fillRect(x + 1, base + ph + 1, bw - 2, 2);
			}
		}
	});
})();
