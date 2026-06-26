/* UltraBGs pack: Arcade Starfield — Retro Future pack by AWEN01
 * Chunky pixel stars warping past. Cursor steers the flight vector,
 * scroll throttles warp speed, taps punch a hyperspace burst.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'arcadestars',
		name: 'Arcade Starfield',

		init: function (state, f) {
			var count = Math.round(200 * f.density);
			var stars = [];
			for (var i = 0; i < count; i++) {
				stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
			}
			state.stars = stars;
			state.burst = 0;
		},

		render: function (ctx, state, f) {
			var cx = f.w / 2, cy = f.h / 2;

			// Hyperspace burst decays.
			var burst = 0;
			for (var k = 0; k < f.taps.length; k++) {
				burst += Math.exp(-f.taps[k].age * 2.2);
			}
			state.burst = U.lerp(state.burst, Math.min(1.5, burst), 0.1);

			var speed = (0.22 + Math.abs(f.scrollVel) * 0.004 + state.burst * 1.1) * f.speed * f.dt;

			// Steering: cursor offsets the flight vector.
			var stx = 0, sty = 0;
			if (f.pointer.active) {
				stx = (f.pointer.x / f.w - 0.5) * 0.5 * f.dt;
				sty = (f.pointer.y / f.h - 0.5) * 0.5 * f.dt;
			}

			var px = Math.max(2, Math.round(3 * f.density)); // pixel size
			for (var i = 0; i < state.stars.length; i++) {
				var s = state.stars[i];
				s.z -= speed * (0.3 + s.z);
				s.x -= stx * (1 - s.z);
				s.y -= sty * (1 - s.z);
				if (s.z <= 0.02 || Math.abs(s.x) > 1.4 || Math.abs(s.y) > 1.4) {
					s.x = Math.random() * 2 - 1;
					s.y = Math.random() * 2 - 1;
					s.z = 1;
				}

				var k2 = 1 / (s.z * 2.2 + 0.12);
				var sx2 = cx + s.x * cx * k2 * 0.8;
				var sy2 = cy + s.y * cy * k2 * 0.8;
				if (sx2 < -8 || sx2 > f.w + 8 || sy2 < -8 || sy2 > f.h + 8) { continue; }

				var near = U.clamp(1 - s.z, 0, 1);
				var size = px * (0.6 + near * 1.8) * (1 + state.burst * 0.4);
				var ci = i % 3;
				var col = near > 0.85 ? U.mix(f.colors[ci], WHITE, (near - 0.85) * 5) : f.colors[ci];

				// Pixel snap — keep it arcade.
				var qx = Math.round(sx2 / px) * px;
				var qy = Math.round(sy2 / px) * px;
				ctx.fillStyle = U.rgba(col, 0.35 + near * 0.6);
				ctx.fillRect(qx, qy, size, size);

				// Warp streaks when bursting.
				if (state.burst > 0.25 && near > 0.3) {
					ctx.strokeStyle = U.rgba(col, state.burst * 0.4);
					ctx.lineWidth = Math.max(1, size * 0.5);
					ctx.beginPath();
					ctx.moveTo(qx, qy);
					ctx.lineTo(cx + (qx - cx) * (1 - state.burst * 0.12), cy + (qy - cy) * (1 - state.burst * 0.12));
					ctx.stroke();
				}
			}
		}
	});
})();
