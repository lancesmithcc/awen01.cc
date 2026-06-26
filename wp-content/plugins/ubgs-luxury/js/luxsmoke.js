/* UltraBGs pack: Luxury Smoke — Luxury pack by AWEN01
 * Refined incense smoke: slow, sculptural plumes with a soft golden rim
 * light, far calmer and more elegant than the core Smoky Clouds pack.
 * Cursor's motion carves and pushes the smoke; taps bloom a soft swell;
 * scroll lifts the plume. Layered radial puffs with additive glow.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 250, b: 235 };

	window.UltraBGs.registerPack({
		id: 'luxsmoke',
		name: 'Luxury Smoke',

		init: function (state, f) {
			var M = Math.max(f.w, f.h);
			var puffs = [];
			// Large sculptural plumes.
			var big = Math.round(16 * f.density);
			for (var i = 0; i < big; i++) {
				puffs.push({
					x: Math.random() * f.w, y: Math.random() * f.h, vx: 0, vy: 0,
					r: (0.13 + Math.random() * 0.18) * M,
					seed: Math.random() * 100, ci: i % 3, fine: 0.1, op: 1
				});
			}
			// Fine detail wisps — smaller, more numerous, faster turbulence.
			var small = Math.round(42 * f.density);
			for (var j = 0; j < small; j++) {
				puffs.push({
					x: Math.random() * f.w, y: Math.random() * f.h, vx: 0, vy: 0,
					r: (0.035 + Math.random() * 0.065) * M,
					seed: Math.random() * 100, ci: j % 3, fine: 0.4, op: 0.72
				});
			}
			state.puffs = puffs;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed * 0.6;
			var puffs = state.puffs;
			var lift = -f.scroll * 0.0004 - 4; // gentle upward drift

			ctx.globalCompositeOperation = 'lighter';
			for (var i = 0; i < puffs.length; i++) {
				var p = puffs[i];
				var ff = p.fine || 0.1;
				var ax = (U.noise2(p.seed, t * ff) - 0.5) * 8;
				var ay = (U.noise2(t * ff, p.seed) - 0.5) * 6 + lift;

				if (f.pointer.active) {
					var dx = p.x - f.pointer.x, dy = p.y - f.pointer.y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var infl = U.smoothstep(p.r * 1.3, 0, d);
					ax += (f.pointer.vx * 1.2 + (dx / d) * 12) * infl;
					ay += (f.pointer.vy * 1.2 + (dy / d) * 12) * infl;
				}
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = p.x - tap.x, tdy = p.y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
					var force = Math.exp(-tap.age * 2) * U.smoothstep(p.r * 2, 0, td) * 70;
					ax += (tdx / td) * force; ay += (tdy / td) * force;
				}

				p.vx = (p.vx + ax * f.dt) * 0.95;
				p.vy = (p.vy + ay * f.dt) * 0.95;
				p.x += p.vx; p.y += p.vy;
				if (p.x < -p.r) { p.x = f.w + p.r; } if (p.x > f.w + p.r) { p.x = -p.r; }
				if (p.y < -p.r) { p.y = f.h + p.r; } if (p.y > f.h + p.r) { p.y = -p.r; }

				var col = f.colors[p.ci % f.colors.length];
				var breathe = 0.85 + 0.15 * Math.sin(t * 0.5 + p.seed);
				var rr = p.r * breathe;
				var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
				var op = p.op || 1;
				g.addColorStop(0, U.rgba(col, 0.11 * op));
				g.addColorStop(0.5, U.rgba(col, 0.05 * op));
				g.addColorStop(1, U.rgba(col, 0));
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, rr, 0, 6.2832);
				ctx.fill();

				// Golden rim light on the leading edge of motion.
				var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
				if (sp > 0.3) {
					var rx = p.x + (p.vx / sp) * rr * 0.5;
					var ry = p.y + (p.vy / sp) * rr * 0.5;
					var rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr * 0.5);
					rg.addColorStop(0, U.rgba(U.mix(col, WHITE, 0.6), 0.08));
					rg.addColorStop(1, U.rgba(col, 0));
					ctx.fillStyle = rg;
					ctx.beginPath();
					ctx.arc(rx, ry, rr * 0.5, 0, 6.2832);
					ctx.fill();
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
