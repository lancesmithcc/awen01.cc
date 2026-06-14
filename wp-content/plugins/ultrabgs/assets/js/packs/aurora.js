/* UltraBGs pack: Aurora Borealis — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'aurora',
		name: 'Aurora Borealis',

		init: function (state, f) {
			state.bands = Math.max(2, Math.round(3 * f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed * 0.4;
			var sway = f.pointer.active ? (f.pointer.x / f.w - 0.5) : 0;
			var intensity = f.pointer.active ? 1 - U.clamp(f.pointer.y / f.h, 0, 1) * 0.5 : 0.75;
			var scrollDrift = f.scroll * 0.0006;

			// Tap pulses brighten the sky briefly.
			var pulse = 0;
			for (var k = 0; k < f.taps.length; k++) {
				pulse += Math.exp(-f.taps[k].age * 2.2) * 0.5;
			}
			intensity = Math.min(1.6, intensity + pulse);

			ctx.globalCompositeOperation = 'lighter';
			var step = Math.max(6, Math.round(14 / f.density));

			for (var b = 0; b < state.bands; b++) {
				var col = f.colors[b % f.colors.length];
				var phase = b * 2.3;

				for (var x = -step; x <= f.w + step; x += step) {
					var nx = x / f.w;
					// Curtain center line undulates with layered noise.
					var n1 = U.noise2(nx * 2.2 + t * 0.5 + phase, b * 7.7 + scrollDrift);
					var n2 = U.noise2(nx * 5.0 - t * 0.3 + phase, b * 3.1);
					var cy = f.h * (0.28 + b * 0.16) + (n1 - 0.5) * f.h * 0.34
						+ Math.sin(nx * 4 + t + phase) * f.h * 0.05
						+ sway * (nx - 0.5) * f.h * 0.3;

					var len = f.h * (0.22 + n2 * 0.3) * intensity;
					var shimmer = 0.5 + 0.5 * Math.sin(nx * 30 + t * 5 + phase);

					// Tap pulses also flare the curtain locally.
					var local = 0;
					for (var j = 0; j < f.taps.length; j++) {
						var tap = f.taps[j];
						var d = Math.abs(x - tap.x);
						local += Math.exp(-(d * d) / 40000) * Math.exp(-tap.age * 2.5);
					}

					var alpha = (0.05 + shimmer * 0.06 + local * 0.18) * intensity;
					var grad = ctx.createLinearGradient(0, cy - len, 0, cy + len * 0.4);
					grad.addColorStop(0, U.rgba(col, 0));
					grad.addColorStop(0.55, U.rgba(col, alpha));
					grad.addColorStop(1, U.rgba(col, 0));

					ctx.fillStyle = grad;
					ctx.fillRect(x - step * 0.7, cy - len, step * 1.4, len * 1.4);
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
