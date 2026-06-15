/* UltraBGs pack: Crystal Prisms — Luxury pack by AWEN01
 * Cut crystal that splits light into spectral fans. Slow triangular prisms
 * drift and rotate, each casting a soft rainbow refraction beam. Cursor is
 * the light source — beams angle away from the pointer and brighten near it;
 * taps flash a full spectral burst; scroll rotates the whole arrangement.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'crystal',
		name: 'Crystal Prisms',

		init: function (state, f) {
			var n = Math.round(10 * f.density);
			var prisms = [];
			for (var i = 0; i < n; i++) {
				prisms.push({
					x: Math.random() * f.w, y: Math.random() * f.h,
					r: 26 + Math.random() * 50,
					rot: Math.random() * TAU,
					seed: Math.random() * TAU,
					spin: (Math.random() - 0.5) * 0.3
				});
			}
			state.prisms = prisms;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var lx = f.pointer.active ? f.pointer.x : f.w * 0.5 + Math.cos(t * 0.2) * f.w * 0.3;
			var ly = f.pointer.active ? f.pointer.y : -100;
			var globalRot = f.scroll * 0.0012;

			ctx.globalCompositeOperation = 'lighter';

			for (var i = 0; i < state.prisms.length; i++) {
				var p = state.prisms[i];
				var x = p.x + Math.sin(t * 0.15 + p.seed) * 12;
				var y = p.y + Math.cos(t * 0.12 + p.seed) * 10;
				var rot = p.rot + t * p.spin + globalRot;

				var prox = 0;
				if (f.pointer.active) {
					var dx = x - f.pointer.x, dy = y - f.pointer.y;
					prox = U.smoothstep(320, 0, Math.sqrt(dx * dx + dy * dy));
				}
				var burst = 0;
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = x - tap.x, tdy = y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * 480;
					burst += Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3);
				}
				burst = Math.min(1, burst);
				var energy = U.clamp(prox + burst, 0, 1);

				// Refraction fan: beam points away from the light source,
				// split into 3 spectral bands fanned slightly apart.
				var toLight = Math.atan2(y - ly, x - lx);
				var beamLen = p.r * (3 + energy * 4);
				for (var band = 0; band < 3; band++) {
					var spread = (band - 1) * (0.12 + energy * 0.1);
					var a = toLight + spread;
					var ex = x + Math.cos(a) * beamLen;
					var ey = y + Math.sin(a) * beamLen;
					var grad = ctx.createLinearGradient(x, y, ex, ey);
					var col = f.colors[band % 3];
					grad.addColorStop(0, U.rgba(U.mix(col, WHITE, 0.4), 0.18 + energy * 0.3));
					grad.addColorStop(1, U.rgba(col, 0));
					ctx.strokeStyle = grad;
					ctx.lineWidth = p.r * 0.5;
					ctx.lineCap = 'round';
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(ex, ey);
					ctx.stroke();
				}

				// The crystal body: a faceted triangle.
				ctx.beginPath();
				for (var v = 0; v <= 3; v++) {
					var va = rot + (v / 3) * TAU;
					var px = x + Math.cos(va) * p.r, py = y + Math.sin(va) * p.r;
					if (v === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
				}
				ctx.closePath();
				ctx.fillStyle = U.rgba(U.mix(f.colors[2], WHITE, 0.3), 0.1 + energy * 0.2);
				ctx.fill();
				ctx.strokeStyle = U.rgba(WHITE, 0.3 + energy * 0.4);
				ctx.lineWidth = 1;
				ctx.stroke();

				// Inner facet lines.
				ctx.beginPath();
				for (var w = 0; w < 3; w++) {
					var wa = rot + (w / 3) * TAU;
					ctx.moveTo(x, y);
					ctx.lineTo(x + Math.cos(wa) * p.r, y + Math.sin(wa) * p.r);
				}
				ctx.strokeStyle = U.rgba(U.mix(f.colors[1], WHITE, 0.5), 0.2 + energy * 0.3);
				ctx.stroke();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
