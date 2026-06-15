/* UltraBGs pack: Flowing Silk — Luxury pack by AWEN01
 * Draping satin sheets with travelling specular sheen. Folds undulate on
 * slow noise currents; the cursor draws the fabric toward it and the sheen
 * follows the pointer; taps send a soft ripple across the cloth; scroll
 * drifts the drape.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'silk',
		name: 'Flowing Silk',

		init: function (state, f) {
			state.sheets = Math.max(3, Math.round(5 * f.density));
			state.step = Math.max(10, Math.round(16 / f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed * 0.5;
			var step = state.step;
			var sheets = state.sheets;
			var sheenX = f.pointer.active ? f.pointer.x : f.w * (0.5 + 0.4 * Math.sin(t * 0.3));

			for (var s = 0; s < sheets; s++) {
				var sv = s / (sheets - 1 || 1);
				var baseY = f.h * (0.12 + sv * 0.76);
				var amp = f.h * (0.08 + sv * 0.06);
				var phase = s * 1.7 + t;

				// Build the fold profile.
				var top = [];
				for (var x = -step; x <= f.w + step; x += step) {
					var fold = Math.sin(x * 0.006 + phase) * amp
						+ Math.sin(x * 0.013 - phase * 0.7) * amp * 0.4
						+ (U.noise2(x * 0.002 + s, t * 0.1) - 0.5) * amp * 0.8;
					var y = baseY + fold;
					if (f.pointer.active) {
						var dx = x - f.pointer.x, dy = y - f.pointer.y;
						var d = Math.sqrt(dx * dx + dy * dy) || 1;
						y += (dy / d) * U.smoothstep(280, 0, d) * 30;
					}
					for (var k = 0; k < f.taps.length; k++) {
						var tap = f.taps[k];
						var tdx = x - tap.x, tdy = y - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
						var ring = tap.age * 440;
						y += (tdy / td) * Math.exp(-Math.pow((td - ring) / 80, 2)) * (1 - tap.age / 3) * 22;
					}
					top.push(x, y);
				}

				// Vertical gradient sheet with a moving specular band.
				var hue = sv;
				var c0 = U.mix(f.colors[0], f.colors[1], hue);
				var c1 = U.mix(f.colors[1], f.colors[2], hue);
				var g = ctx.createLinearGradient(0, baseY - amp, 0, baseY + amp + f.h / sheets);
				g.addColorStop(0, U.rgba(c0, 0.5));
				g.addColorStop(1, U.rgba(c1, 0.5));

				ctx.beginPath();
				ctx.moveTo(top[0], top[1]);
				for (var i = 2; i < top.length; i += 2) { ctx.lineTo(top[i], top[i + 1]); }
				ctx.lineTo(f.w + step, f.h + 40);
				ctx.lineTo(-step, f.h + 40);
				ctx.closePath();
				ctx.fillStyle = g;
				ctx.fill();

				// Specular sheen following the sheen source.
				var sg = ctx.createLinearGradient(sheenX - 220, 0, sheenX + 220, 0);
				sg.addColorStop(0, U.rgba(WHITE, 0));
				sg.addColorStop(0.5, U.rgba(WHITE, 0.16 + sv * 0.08));
				sg.addColorStop(1, U.rgba(WHITE, 0));
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = sg;
				ctx.beginPath();
				ctx.moveTo(top[0], top[1]);
				for (var j = 2; j < top.length; j += 2) { ctx.lineTo(top[j], top[j + 1]); }
				ctx.lineTo(f.w + step, f.h + 40);
				ctx.lineTo(-step, f.h + 40);
				ctx.closePath();
				ctx.fill();
				ctx.globalCompositeOperation = 'source-over';

				// Highlight thread along the crest.
				ctx.beginPath();
				ctx.moveTo(top[0], top[1]);
				for (var m = 2; m < top.length; m += 2) { ctx.lineTo(top[m], top[m + 1]); }
				ctx.strokeStyle = U.rgba(U.mix(c1, WHITE, 0.4), 0.25);
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
	});
})();
