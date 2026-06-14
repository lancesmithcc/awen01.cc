/* UltraBGs pack: Smoky Clouds — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'smoke',
		name: 'Smoky Clouds',

		init: function (state, f) {
			var count = Math.round(14 * f.density);
			var blobs = [];
			for (var i = 0; i < count; i++) {
				blobs.push({
					x: Math.random() * f.w,
					y: Math.random() * f.h,
					vx: 0, vy: 0,
					r: (0.18 + Math.random() * 0.22) * Math.max(f.w, f.h),
					seed: Math.random() * 100,
					ci: i % 3
				});
			}
			state.blobs = blobs;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var blobs = state.blobs;
			ctx.globalCompositeOperation = 'lighter';

			for (var i = 0; i < blobs.length; i++) {
				var b = blobs[i];

				// Lazy noise drift.
				var ax = (U.noise2(b.seed, t * 0.12) - 0.5) * 14;
				var ay = (U.noise2(t * 0.12, b.seed) - 0.5) * 12 - f.scrollVel * 0.06;

				// Cursor wake: pointer velocity pushes nearby smoke.
				if (f.pointer.active) {
					var dx = b.x - f.pointer.x, dy = b.y - f.pointer.y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var infl = U.smoothstep(b.r * 1.2, 0, d);
					ax += (f.pointer.vx * 1.6 + (dx / d) * 16) * infl;
					ay += (f.pointer.vy * 1.6 + (dy / d) * 16) * infl;
				}

				// Taps blow smoke outward from the touch point.
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = b.x - tap.x, tdy = b.y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
					var force = Math.exp(-tap.age * 2.4) * U.smoothstep(b.r * 2, 0, td) * 120;
					ax += (tdx / td) * force;
					ay += (tdy / td) * force;
				}

				b.vx = (b.vx + ax * f.dt) * 0.96;
				b.vy = (b.vy + ay * f.dt) * 0.96;
				b.x += b.vx;
				b.y += b.vy;

				// Wrap softly.
				if (b.x < -b.r) { b.x = f.w + b.r; }
				if (b.x > f.w + b.r) { b.x = -b.r; }
				if (b.y < -b.r) { b.y = f.h + b.r; }
				if (b.y > f.h + b.r) { b.y = -b.r; }

				var col = f.colors[b.ci % f.colors.length];
				var breathe = 0.85 + 0.15 * Math.sin(t * 0.6 + b.seed);
				var rr = b.r * breathe;
				var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
				g.addColorStop(0, U.rgba(col, 0.16));
				g.addColorStop(0.6, U.rgba(col, 0.07));
				g.addColorStop(1, U.rgba(col, 0));
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(b.x, b.y, rr, 0, 6.2832);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
