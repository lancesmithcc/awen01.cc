/* UltraBGs pack: Liquid Gold — Luxury pack by AWEN01
 * Molten metal: metaball-style pools of liquid gold with a bright caustic
 * skin and slow churn. Cursor heats and draws the metal toward it; taps
 * send a molten ripple; scroll tilts the flow so it pools downhill.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 250, b: 230 };

	window.UltraBGs.registerPack({
		id: 'liquidgold',
		name: 'Liquid Gold',

		init: function (state, f) {
			var n = Math.round(9 * f.density);
			var blobs = [];
			for (var i = 0; i < n; i++) {
				blobs.push({
					x: Math.random() * f.w, y: Math.random() * f.h,
					vx: 0, vy: 0,
					r: (0.1 + Math.random() * 0.16) * Math.min(f.w, f.h),
					seed: Math.random() * 100, ci: i % 3
				});
			}
			state.blobs = blobs;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var blobs = state.blobs;
			var tilt = f.scroll * 0.0008;

			ctx.globalCompositeOperation = 'lighter';
			for (var i = 0; i < blobs.length; i++) {
				var b = blobs[i];
				var ax = Math.sin(t * 0.3 + b.seed) * 8;
				var ay = Math.cos(t * 0.26 + b.seed * 1.3) * 6 + tilt * 200;

				if (f.pointer.active) {
					var dx = f.pointer.x - b.x, dy = f.pointer.y - b.y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var pull = U.smoothstep(b.r * 2.2, 0, d);
					ax += (dx / d) * pull * 30;
					ay += (dy / d) * pull * 30;
				}
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = b.x - tap.x, tdy = b.y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
					var force = Math.exp(-tap.age * 2.2) * U.smoothstep(b.r * 2.5, 0, td) * 90;
					ax += (tdx / td) * force; ay += (tdy / td) * force;
				}

				b.vx = (b.vx + ax * f.dt) * 0.93;
				b.vy = (b.vy + ay * f.dt) * 0.93;
				b.x += b.vx; b.y += b.vy;
				if (b.x < -b.r) { b.x = f.w + b.r; } if (b.x > f.w + b.r) { b.x = -b.r; }
				if (b.y < -b.r) { b.y = f.h + b.r; } if (b.y > f.h + b.r) { b.y = -b.r; }

				var breathe = 0.9 + 0.1 * Math.sin(t * 0.7 + b.seed);
				var rr = b.r * breathe;
				var base = f.colors[b.ci % f.colors.length];
				var g = ctx.createRadialGradient(b.x - rr * 0.3, b.y - rr * 0.3, 0, b.x, b.y, rr);
				g.addColorStop(0, U.rgba(U.mix(base, WHITE, 0.5), 0.4));
				g.addColorStop(0.5, U.rgba(base, 0.22));
				g.addColorStop(1, U.rgba(base, 0));
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(b.x, b.y, rr, 0, 6.2832);
				ctx.fill();
			}

			// Caustic shimmer skin: bright moving streaks.
			for (var c = 0; c < blobs.length; c++) {
				var bb = blobs[c];
				var sx = bb.x + Math.sin(t * 1.4 + bb.seed) * bb.r * 0.4;
				var sy = bb.y + Math.cos(t * 1.1 + bb.seed) * bb.r * 0.4;
				ctx.beginPath();
				ctx.arc(sx, sy, bb.r * 0.12 * (0.6 + 0.4 * Math.sin(t * 2 + bb.seed)), 0, 6.2832);
				ctx.fillStyle = U.rgba(WHITE, 0.18);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
