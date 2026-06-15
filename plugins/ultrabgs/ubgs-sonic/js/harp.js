/* UltraBGs pack: Harp Strings — Sonic pack by AWEN01
 * Many vertical strings spanning the height, lengths following a graceful
 * harp curve (short on one side, long on the other). Plucking — a tap, a
 * cursor sweep across them (glissando!), or a swipe — sets strings ringing
 * in a decaying standing wave with a bright shimmer. Scroll bends the pitch;
 * hovering excites nearby strings. Warmer, more delicate than the guitar.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'harp',
		name: 'Harp Strings',

		init: function (state, f) {
			var n = Math.max(18, Math.round(44 * f.density));
			var strings = [];
			for (var i = 0; i < n; i++) {
				var u = i / (n - 1);
				// Full-bleed: strings span the entire height, edge to edge.
				// A subtle top-stagger keeps the harp soundboard feel without
				// leaving empty margins.
				strings.push({
					x: f.w * (u * 1.0),
					top: -2,
					bot: f.h + 2,
					amp: 0, phase: 0,
					freq: 11 - u * 7,       // short visual pitch gradient
					decay: 0.5 + u * 0.8,
					ci: i % 3,
					lastSide: 0
				});
			}
			state.strings = strings;
			state.step = Math.max(4, Math.round(8 / f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var step = state.step;
			var bend = f.scroll * 0.0006;
			ctx.lineCap = 'round';
			ctx.globalCompositeOperation = 'lighter';

			for (var i = 0; i < state.strings.length; i++) {
				var s = state.strings[i];
				var len = s.bot - s.top;

				// Cursor sweep across strings = glissando.
				if (f.pointer.active && f.pointer.y > s.top && f.pointer.y < s.bot) {
					var dxc = f.pointer.x - s.x;
					var side = dxc >= 0 ? 1 : -1;
					var near = U.smoothstep(46, 0, Math.abs(dxc));
					if (near > 0.1) {
						if (s.lastSide !== 0 && side !== s.lastSide) {
							pluck(s, (f.pointer.y - s.top) / len, 12 + Math.abs(f.pointer.vx) * 0.35);
						} else {
							s.amp = Math.max(s.amp, near * (1.5 + Math.abs(f.pointer.vx) * 0.15));
						}
					}
					s.lastSide = side;
				}
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					if (tap.age > 0.3) { continue; }
					var ring = tap.age * 480;
					var dist = Math.abs(s.x - tap.x);
					var hit = Math.exp(-Math.pow((dist - ring) / 40, 2)) * Math.exp(-tap.age * 3);
					if (hit > 0.05) { pluck(s, (tap.y - s.top) / len, 18 * hit); }
				}

				s.amp *= Math.exp(-s.decay * f.dt * f.speed);
				s.phase += s.freq * (1 + bend) * f.dt * f.speed * 6.2832;

				var col = f.colors[s.ci];
				var glow = U.clamp(s.amp / 14, 0, 1);
				var litCol = U.mix(col, WHITE, glow * 0.6);

				for (var g = 0; g < 2; g++) {
					var ph = s.phase - g * 0.5;
					var ga = s.amp * (g === 0 ? 1 : 0.5);
					ctx.beginPath();
					for (var y = s.top; y <= s.bot; y += step) {
						var ny = (y - s.top) / len;
						var env = Math.sin(Math.PI * ny);
						var harm = Math.sin(Math.PI * ny * 2) * 0.2;
						var x = s.x + (env + harm) * ga * Math.sin(ph);
						if (y === s.top) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
					}
					ctx.strokeStyle = U.rgba(litCol, g === 0 ? (0.4 + glow * 0.45) : 0.16);
					ctx.lineWidth = (g === 0 ? 1 + glow * 1.2 : glow * 3.5);
					ctx.stroke();
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function pluck(s, ypos, amp) {
		s.amp = Math.min(18, Math.max(s.amp, amp));
		s.phase = 0;
	}
})();
