/* UltraBGs pack: Guitar Strings — Sonic pack by AWEN01
 * Six horizontal strings. Each can be plucked — a tap, a cursor crossing,
 * or a swipe sets it vibrating in a decaying standing wave (fundamental +
 * a little harmonic content), with motion-blur ghosting and a bright glow
 * at the antinode. Lower strings are thicker and ring longer (bass). Scroll
 * detunes/bends the pitch. Hovering near a string excites it gently.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'guitar',
		name: 'Guitar Strings',

		init: function (state, f) {
			var n = 6;
			var strings = [];
			for (var i = 0; i < n; i++) {
				var lowness = 1 - i / (n - 1); // 1 = bass
				strings.push({
					y: f.h * (0.18 + (i / (n - 1)) * 0.64),
					amp: 0,            // current vibration amplitude (px)
					phase: 0,
					freq: 6 + i * 2.2, // higher strings vibrate faster
					decay: 0.4 + lowness * 0.9,
					thick: 1 + lowness * 2.4,
					pluckX: 0.5,       // normalized antinode position
					ci: i % 3,
					lastSide: 0
				});
			}
			state.strings = strings;
			state.step = Math.max(4, Math.round(7 / f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var step = state.step;
			var bend = f.scroll * 0.0006;
			ctx.lineCap = 'round';
			ctx.globalCompositeOperation = 'lighter';

			for (var i = 0; i < state.strings.length; i++) {
				var s = state.strings[i];

				// --- Excitation ---
				// Cursor crossing / hover plucks the string.
				if (f.pointer.active) {
					var dyc = f.pointer.y - s.y;
					var side = dyc >= 0 ? 1 : -1;
					var near = U.smoothstep(60, 0, Math.abs(dyc));
					if (near > 0.1) {
						// Crossing (side flip) = strong pluck; hovering = gentle.
						if (s.lastSide !== 0 && side !== s.lastSide) {
							pluck(s, f.pointer.x / f.w, 16 + Math.abs(f.pointer.vy) * 0.4);
						} else {
							s.amp = Math.max(s.amp, near * (2 + Math.abs(f.pointer.vx) * 0.2));
							s.pluckX = U.lerp(s.pluckX, f.pointer.x / f.w, 0.2);
						}
					}
					s.lastSide = side;
				}
				// Taps pluck whichever strings the ring crosses.
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var ring = tap.age * 480;
					var dist = Math.abs(s.y - tap.y);
					var hit = Math.exp(-Math.pow((dist - 0) / 40, 2)) * Math.exp(-tap.age * 4);
					if (hit > 0.05 && tap.age < 0.3) { pluck(s, tap.x / f.w, 22 * hit); }
				}

				// --- Decay ---
				s.amp *= Math.exp(-s.decay * f.dt * f.speed);
				s.phase += s.freq * (1 + bend) * f.dt * f.speed * 6.2832;

				// --- Render standing wave with ghosting ---
				var col = f.colors[s.ci];
				var glow = U.clamp(s.amp / 18, 0, 1);
				var litCol = U.mix(col, WHITE, glow * 0.6);

				for (var g = 0; g < 2; g++) {
					// Two slightly offset passes for motion blur.
					var ph = s.phase - g * 0.5;
					var ga = s.amp * (g === 0 ? 1 : 0.5);
					ctx.beginPath();
					for (var x = 0; x <= f.w; x += step) {
						var nx = x / f.w;
						// Standing wave: sin envelope along length * temporal sin.
						var env = Math.sin(Math.PI * nx) * Math.sin(Math.PI * nx * 1); // fundamental
						var harm = Math.sin(Math.PI * nx * 3) * 0.25;
						var y = s.y + (env + harm) * ga * Math.sin(ph)
							* (0.6 + 0.4 * Math.sin(Math.PI * nx)); // antinode emphasis
						if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
					}
					ctx.strokeStyle = U.rgba(litCol, g === 0 ? (0.5 + glow * 0.4) : 0.18);
					ctx.lineWidth = s.thick + (g === 0 ? glow * 1.5 : glow * 4);
					ctx.stroke();
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function pluck(s, xpos, amp) {
		s.amp = Math.min(26, Math.max(s.amp, amp));
		s.pluckX = xpos;
		s.phase = 0;
	}
})();
