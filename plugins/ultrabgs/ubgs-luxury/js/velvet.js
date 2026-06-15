/* UltraBGs pack: Velvet Waves — Luxury pack by AWEN01
 * Deep plush velvet: broad soft waves with a directional nap sheen that
 * shifts lighter/darker as the "pile" leans — the way velvet catches light.
 * Cursor brushes the nap (a lit trail follows the pointer); taps press a
 * soft dark-then-bright impression; scroll slowly rolls the waves.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'velvet',
		name: 'Velvet Waves',

		init: function (state, f) {
			state.step = Math.max(14, Math.round(22 / f.density));
			state.bands = Math.round(6 * f.density);
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed * 0.4;
			var step = state.step;

			// Base deep fill so velvet reads rich even at rest.
			ctx.fillStyle = U.rgba(U.mix(f.colors[0], { r: 0, g: 0, b: 0 }, 0.35), 0.5);
			ctx.fillRect(0, 0, f.w, f.h);

			var cols = Math.ceil(f.w / step) + 1;
			var rows = Math.ceil(f.h / step) + 1;

			for (var r = 0; r < rows; r++) {
				var py = r * step;
				for (var c = 0; c < cols; c++) {
					var px = c * step;

					// Nap direction = gradient of a slow wave field. The pile
					// lean determines how much light it catches.
					var wave = Math.sin(px * 0.01 + py * 0.006 + t)
						+ Math.sin(px * 0.004 - py * 0.011 - t * 0.7) * 0.7
						+ (U.noise2(px * 0.004, py * 0.004 + t * 0.05) - 0.5);
					var lean = Math.cos(px * 0.01 + py * 0.006 + t); // derivative-ish
					var sheen = (lean * 0.5 + 0.5);

					// Cursor brushes a bright nap trail.
					if (f.pointer.active) {
						var dx = px - f.pointer.x, dy = py - f.pointer.y;
						var d = Math.sqrt(dx * dx + dy * dy);
						sheen += U.smoothstep(160, 0, d) * 0.7;
					}
					// Taps press an impression: ring darker leading edge, bright trail.
					for (var k = 0; k < f.taps.length; k++) {
						var tap = f.taps[k];
						var tdx = px - tap.x, tdy = py - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 420;
						sheen += Math.sin((td - ring) * 0.05) * Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3) * 0.8;
					}

					sheen = U.clamp(sheen, 0, 1.4);
					var depth = U.clamp(wave * 0.3 + 0.5, 0, 1);
					var base = U.mix(f.colors[0], f.colors[1], depth);
					var col = sheen > 0.5
						? U.mix(base, U.mix(f.colors[2], WHITE, 0.3), (sheen - 0.5) * 1.3)
						: U.mix(base, { r: 0, g: 0, b: 0 }, (0.5 - sheen) * 0.8);

					ctx.fillStyle = U.rgba(col, 0.5);
					ctx.fillRect(px, py, step + 1, step + 1);
				}
			}
		}
	});
})();
