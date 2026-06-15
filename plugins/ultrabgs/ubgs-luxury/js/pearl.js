/* UltraBGs pack: Pearl Reflections — Luxury pack by AWEN01
 * Lustrous pearls: soft orbs with nacreous iridescence — the highlight and
 * rim glow shift hue with viewing angle (cursor position). Cursor sweeps the
 * lustre across the field and draws pearls subtly toward it; taps send an
 * iridescent ripple; scroll drifts the strand.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'pearl',
		name: 'Pearl Reflections',

		init: function (state, f) {
			var n = Math.round(16 * f.density);
			var pearls = [];
			for (var i = 0; i < n; i++) {
				pearls.push({
					bx: Math.random() * f.w, by: Math.random() * f.h,
					r: 18 + Math.random() * 44,
					seed: Math.random() * TAU
				});
			}
			state.pearls = pearls;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			// Lustre angle from cursor (or slow auto-orbit).
			var lightX = f.pointer.active ? f.pointer.x : f.w * (0.5 + 0.4 * Math.cos(t * 0.2));
			var lightY = f.pointer.active ? f.pointer.y : f.h * (0.4 + 0.3 * Math.sin(t * 0.17));
			var drift = f.scroll * 0.04;

			for (var i = 0; i < state.pearls.length; i++) {
				var p = state.pearls[i];
				var x = p.bx + Math.sin(t * 0.2 + p.seed) * 8;
				var y = (p.by + drift) % (f.h + p.r * 2);
				if (y < -p.r) { y += f.h + p.r * 2; }

				var prox = 0;
				if (f.pointer.active) {
					var ddx = x - f.pointer.x, ddy = y - f.pointer.y;
					var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
					prox = U.smoothstep(260, 0, dd);
					x -= (ddx / dd) * prox * 6; // subtle draw-toward
					y -= (ddy / dd) * prox * 6;
				}
				var ripple = 0;
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = x - tap.x, tdy = y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * 440;
					ripple += Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3);
				}
				ripple = Math.min(1, ripple);

				// Direction to light determines highlight offset + hue phase.
				var ang = Math.atan2(lightY - y, lightX - x);
				var huePhase = (ang / TAU + t * 0.05 + ripple * 0.3) % 1;
				if (huePhase < 0) { huePhase += 1; }
				var pal = [f.colors[0], f.colors[1], f.colors[2], f.colors[0]];
				var seg = (huePhase * 3) | 0;
				var iri = U.mix(pal[seg], pal[seg + 1], huePhase * 3 - seg);

				// Pearl body: soft radial with off-center highlight.
				var hx = x + Math.cos(ang) * p.r * 0.4;
				var hy = y + Math.sin(ang) * p.r * 0.4;
				var g = ctx.createRadialGradient(hx, hy, 0, x, y, p.r);
				g.addColorStop(0, U.rgba(U.mix(WHITE, iri, 0.2), 0.6));
				g.addColorStop(0.55, U.rgba(U.mix(iri, WHITE, 0.3), 0.32));
				g.addColorStop(1, U.rgba(U.mix(iri, { r: 40, g: 40, b: 55 }, 0.4), 0.18));
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(x, y, p.r, 0, TAU);
				ctx.fill();

				// Iridescent rim.
				ctx.beginPath();
				ctx.arc(x, y, p.r, 0, TAU);
				ctx.strokeStyle = U.rgba(U.mix(iri, WHITE, 0.4 + ripple * 0.4), 0.25 + prox * 0.3);
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// Specular pinpoint.
				ctx.beginPath();
				ctx.arc(hx, hy, p.r * 0.14, 0, TAU);
				ctx.fillStyle = U.rgba(WHITE, 0.7);
				ctx.fill();
			}
		}
	});
})();
