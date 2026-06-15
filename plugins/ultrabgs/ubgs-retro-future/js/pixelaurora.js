/* UltraBGs pack: Pixel Aurora — Retro Future pack by AWEN01
 * Aurora curtains rendered in chunky posterized pixels — 8-bit skies.
 * Cursor sways the curtains and brightens the air, taps flare pixel
 * pulses through the bands, scroll drifts the sky.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'pixelaurora',
		name: 'Pixel Aurora',

		init: function (state, f) {
			state.px = Math.max(8, Math.round(18 / f.density)); // pixel size
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var px = state.px;
			var cols = Math.ceil(f.w / px);
			var rows = Math.ceil(f.h / px);

			var sway = f.pointer.active ? (f.pointer.x / f.w - 0.5) : 0;
			var lift = f.pointer.active ? (0.5 - f.pointer.y / f.h) * 0.3 : 0;
			var drift = f.scroll * 0.0008;

			for (var c = 0; c < cols; c++) {
				var nx = c / cols;
				// Two curtain center lines per column.
				for (var band = 0; band < 2; band++) {
					var n1 = U.noise2(nx * 2.4 + t * 0.18 + band * 7.7, band * 3.1 + drift);
					var center = (0.3 + band * 0.28 + (n1 - 0.5) * 0.4 + sway * (nx - 0.5) * 0.5 - lift) * rows;
					var len = (0.1 + U.noise2(nx * 5 + band, t * 0.12) * 0.22) * rows;

					var y0 = Math.max(0, Math.floor(center - len));
					var y1 = Math.min(rows, Math.ceil(center + len * 0.4));
					for (var r = y0; r < y1; r++) {
						var v = 1 - Math.abs(r - center) / (len || 1);
						if (v <= 0.05) { continue; }

						// Tap flares in pixel space.
						var X = c * px + px / 2, Y = r * px + px / 2;
						var flare = 0;
						for (var k = 0; k < f.taps.length; k++) {
							var tap = f.taps[k];
							var tdx = X - tap.x, tdy = Y - tap.y;
							var td = Math.sqrt(tdx * tdx + tdy * tdy);
							var ring = tap.age * 460;
							flare += Math.exp(-Math.pow((td - ring) / 80, 2)) * (1 - tap.age / 3);
						}
						flare = Math.min(1, flare);

						var prox = 0;
						if (f.pointer.active) {
							var dx = X - f.pointer.x, dy = Y - f.pointer.y;
							prox = U.smoothstep(180, 0, Math.sqrt(dx * dx + dy * dy));
						}

						// Posterize: 4 brightness steps — keep it 8-bit.
						var lvl = Math.min(3, Math.floor((v + flare * 0.6 + prox * 0.4) * 4));
						var mixv = band === 0 ? lvl / 3 : 0.4 + (lvl / 3) * 0.6;
						var col = mixv < 0.5 ? U.mix(f.colors[0], f.colors[1], mixv * 2) : U.mix(f.colors[1], f.colors[2], (mixv - 0.5) * 2);
						if (lvl === 3 && (flare > 0.3 || prox > 0.4)) { col = U.mix(col, WHITE, 0.5); }

						ctx.fillStyle = U.rgba(col, 0.16 + lvl * 0.16);
						ctx.fillRect(c * px, r * px, px - 1, px - 1);
					}
				}
			}
		}
	});
})();
