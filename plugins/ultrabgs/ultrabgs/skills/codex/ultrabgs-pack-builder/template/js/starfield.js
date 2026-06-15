/* UltraBGs pack: Starfield — worked example for pack authors.
 * Demonstrates every house convention: speed/density scaling, cursor field,
 * tap ring impulse, scroll parallax, 3-color palette, reduced-motion safety.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'starfield',
		name: 'Starfield',

		// Idempotent: everything derives from frame.w/h/density.
		init: function (state, f) {
			var count = Math.round(180 * f.density); // density convention
			var stars = [];
			for (var i = 0; i < count; i++) {
				stars.push({
					x: Math.random() * f.w,
					y: Math.random() * f.h,
					z: 0.25 + Math.random() * 0.75,  // depth for parallax
					seed: Math.random() * 100,
					ci: i % 3                          // palette index
				});
			}
			state.stars = stars;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed; // speed convention — never raw f.t
			var white = { r: 255, g: 255, b: 255 };

			for (var i = 0; i < state.stars.length; i++) {
				var s = state.stars[i];

				// Ambient drift + scroll parallax (deeper stars move less).
				var x = s.x + Math.sin(t * 0.2 + s.seed) * 12 * s.z;
				var y = (s.y - f.scroll * 0.15 * s.z) % f.h;
				if (y < 0) { y += f.h; }

				// Cursor gravity: stars lean toward the pointer.
				var glow = 0;
				if (f.pointer.active) {
					var dx = f.pointer.x - x, dy = f.pointer.y - y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var pull = U.smoothstep(260, 0, d);
					x += (dx / d) * pull * 26 * s.z;
					y += (dy / d) * pull * 26 * s.z;
					glow = pull;
				}

				// Tap supernova: an expanding bright ring (house tap formula).
				var nova = 0;
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = x - tap.x, tdy = y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * 450;
					nova += Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3);
				}

				var twinkle = 0.55 + 0.45 * Math.sin(t * (1.5 + s.z) + s.seed * 7);
				var r = (0.8 + s.z * 1.6) * (1 + glow * 1.2 + Math.min(1, nova) * 2);

				// All 3 user colors, brightened toward white near interactions.
				var col = U.mix(f.colors[s.ci], white, U.clamp(glow * 0.7 + nova, 0, 0.9));

				ctx.beginPath();
				ctx.arc(x, y, r, 0, 6.2832);
				ctx.fillStyle = U.rgba(col, U.clamp(0.35 + twinkle * 0.5 + nova * 0.5, 0, 1));
				ctx.fill();
			}
			// No composite mode used, so nothing to restore.
		}
	});
})();
