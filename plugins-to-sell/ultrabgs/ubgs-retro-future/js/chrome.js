/* UltraBGs pack: Chrome Reflections — Retro Future pack by AWEN01
 * Liquid chrome bands with sliding mirror highlights, straight off an '80s
 * logo. Cursor bulges the metal, highlights chase your hand, taps ripple
 * the surface, scroll slides the reflections.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'chrome',
		name: 'Chrome Reflections',

		init: function (state, f) {
			state.bands = Math.round(9 * f.density);
			state.step = 16;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var bands = state.bands;
			var bandH = f.h / bands;
			var slide = t * 60 + f.scroll * 0.5;

			for (var b = 0; b < bands; b++) {
				var yMid = (b + 0.5) * bandH;

				// Band edge paths, warped by waves + cursor + taps.
				var top = edge(f, yMid - bandH * 0.42, t, b, state.step);
				var bot = edge(f, yMid + bandH * 0.42, t, b + 0.5, state.step);

				// Chrome gradient: dark steel -> mirror white -> tinted steel,
				// the highlight position sliding along the band.
				var hi = ((slide * (0.4 + (b % 3) * 0.25)) % (f.w * 1.6)) / (f.w * 1.6);
				var g = ctx.createLinearGradient(0, 0, f.w, 0);
				var c0 = f.colors[b % 3], c1 = f.colors[(b + 1) % 3];
				g.addColorStop(0, U.rgba(U.mix(c0, { r: 10, g: 12, b: 20 }, 0.55), 0.85));
				g.addColorStop(Math.max(0.001, hi - 0.13), U.rgba(c0, 0.85));
				g.addColorStop(hi, U.rgba(U.mix(WHITE, c1, 0.12), 0.95));
				g.addColorStop(Math.min(0.999, hi + 0.13), U.rgba(c1, 0.85));
				g.addColorStop(1, U.rgba(U.mix(c1, { r: 10, g: 12, b: 20 }, 0.55), 0.85));

				ctx.beginPath();
				ctx.moveTo(top[0], top[1]);
				for (var i = 2; i < top.length; i += 2) { ctx.lineTo(top[i], top[i + 1]); }
				for (var j = bot.length - 2; j >= 0; j -= 2) { ctx.lineTo(bot[j], bot[j + 1]); }
				ctx.closePath();
				ctx.fillStyle = g;
				ctx.fill();

				// Mirror seam between bands.
				ctx.beginPath();
				ctx.moveTo(top[0], top[1]);
				for (var i2 = 2; i2 < top.length; i2 += 2) { ctx.lineTo(top[i2], top[i2 + 1]); }
				ctx.strokeStyle = 'rgba(255,255,255,0.25)';
				ctx.lineWidth = 1.2;
				ctx.stroke();
			}
		}
	});

	function edge(f, baseY, t, seed, step) {
		var pts = [];
		for (var x = -step; x <= f.w + step; x += step) {
			var y = baseY
				+ Math.sin(x * 0.006 + t * 0.7 + seed * 2.1) * 7
				+ (U.noise2(x * 0.003 + seed, t * 0.08) - 0.5) * 10;
			if (f.pointer.active) {
				var dx = x - f.pointer.x, dy = y - f.pointer.y;
				var d = Math.sqrt(dx * dx + dy * dy) || 1;
				y += (dy / d) * U.smoothstep(200, 0, d) * 26;
			}
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				var tdx = x - tap.x, tdy = y - tap.y;
				var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
				var ring = tap.age * 460;
				y += (tdy / td) * Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3) * 20;
			}
			pts.push(x, y);
		}
		return pts;
	}
})();
