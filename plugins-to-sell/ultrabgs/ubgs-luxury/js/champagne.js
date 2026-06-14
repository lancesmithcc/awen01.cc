/* UltraBGs pack: Champagne Bubbles — Luxury pack by AWEN01
 * Effervescence: streams of tiny bubbles rising and wobbling, each a glassy
 * ring with a highlight. Cursor stirs the liquid (bubbles swirl toward the
 * pointer and quicken); taps release a fresh burst of bubbles; scroll tilts
 * the rise. Warm golden glow throughout.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 252, b: 240 };

	window.UltraBGs.registerPack({
		id: 'champagne',
		name: 'Champagne Bubbles',

		init: function (state, f) {
			var n = Math.round(120 * f.density);
			var bubbles = [];
			for (var i = 0; i < n; i++) { bubbles.push(spawn(f, Math.random() * f.h)); }
			state.bubbles = bubbles;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var tilt = f.scroll * 0.0006;

			// Warm glow wash.
			ctx.globalCompositeOperation = 'lighter';
			var glow = ctx.createLinearGradient(0, f.h, 0, 0);
			glow.addColorStop(0, U.rgba(f.colors[0], 0.10));
			glow.addColorStop(1, U.rgba(f.colors[1], 0.02));
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, f.w, f.h);

			var bub = state.bubbles;
			for (var i = 0; i < bub.length; i++) {
				var b = bub[i];
				b.y -= b.speed * f.dt * f.speed * 60;
				b.x += Math.sin(t * b.wobF + b.seed) * b.wobA + tilt * 60 * f.dt * 60;

				if (f.pointer.active) {
					var dx = f.pointer.x - b.x, dy = f.pointer.y - b.y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var stir = U.smoothstep(220, 0, d);
					b.x += (-dy / d) * stir * 1.5; // swirl tangentially
					b.y += (dx / d) * stir * 1.0;
				}

				if (b.y < -b.r) { bub[i] = spawn(f, f.h + b.r); continue; }

				var col = U.mix(f.colors[1], f.colors[2], b.seed % 1);
				// Glassy ring.
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, TAU);
				ctx.strokeStyle = U.rgba(U.mix(col, WHITE, 0.4), 0.35);
				ctx.lineWidth = 1;
				ctx.stroke();
				// Fill sheen.
				ctx.beginPath();
				ctx.arc(b.x, b.y, b.r, 0, TAU);
				ctx.fillStyle = U.rgba(col, 0.06);
				ctx.fill();
				// Highlight dot.
				ctx.beginPath();
				ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, Math.max(0.5, b.r * 0.28), 0, TAU);
				ctx.fillStyle = U.rgba(WHITE, 0.5);
				ctx.fill();
			}

			// Tap bursts spawn a cluster.
			for (var k = 0; k < f.taps.length; k++) {
				if (f.taps[k].age > 0.12) { continue; }
				for (var s = 0; s < 14; s++) {
					var nb = spawn(f, f.taps[k].y);
					nb.x = f.taps[k].x + (Math.random() - 0.5) * 40;
					nb.y = f.taps[k].y + (Math.random() - 0.5) * 20;
					bub[(Math.random() * bub.length) | 0] = nb;
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function spawn(f, y) {
		return {
			x: Math.random() * f.w, y: y,
			r: 1 + Math.random() * 4,
			speed: 0.6 + Math.random() * 1.6,
			wobF: 1 + Math.random() * 2,
			wobA: 0.3 + Math.random() * 0.8,
			seed: Math.random() * 100
		};
	}
})();
