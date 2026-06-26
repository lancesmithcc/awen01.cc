/* UltraBGs pack: Cymatic Rings — Sonic pack by AWEN01
 * v2: ordered mandala. A circular vibrating plate's standing wave =
 * radial mode (concentric nodal rings) x integer angular mode (petals).
 * Both modes are integers, so every state is a crisp, perfectly symmetric
 * rosette. Nodal contours are drawn where the field crosses zero, plus
 * petal spokes, antinode dots and concentric rings — a true cymatic mandala.
 * Cursor sets the modes & drive center; scroll sweeps frequency; taps
 * pulse a bright ring through the figure.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'cymaticrings',
		name: 'Cymatic Rings',

		init: function (state, f) {
			state.cx = f.w / 2; state.cy = f.h / 2;
			state.radial = 5; state.angular = 6;
			state.aStep = Math.max(1, Math.round(2 / f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var maxR = Math.min(f.w, f.h) * 0.46;

			var tcx = f.pointer.active ? U.lerp(f.w / 2, f.pointer.x, 0.5) : f.w / 2;
			var tcy = f.pointer.active ? U.lerp(f.h / 2, f.pointer.y, 0.5) : f.h / 2;
			state.cx = U.lerp(state.cx, tcx, 0.05);
			state.cy = U.lerp(state.cy, tcy, 0.05);
			var cx = state.cx, cy = state.cy;

			// INTEGER modes -> clean symmetry.
			var tRad = 3 + (f.pointer.active ? Math.round(f.pointer.y / f.h * 6) : 4 + Math.round(Math.sin(t * 0.05) * 2));
			var tAng = 3 + (f.pointer.active ? Math.round(f.pointer.x / f.w * 9) : 6 + Math.round(Math.cos(t * 0.06) * 3));
			tRad = Math.max(2, Math.round(tRad + f.scroll * 0.004));
			tAng = Math.max(2, tAng);
			state.radial = U.lerp(state.radial, tRad, 0.04);
			state.angular = U.lerp(state.angular, tAng, 0.08);
			var nodes = Math.max(2, Math.round(state.radial));
			var ang = Math.max(2, Math.round(state.angular));
			var breathe = Math.sin(t * 1.5) * 0.5 + 0.5;

			var pulse = 0, pulseR = 0;
			for (var k = 0; k < f.taps.length; k++) {
				pulse += Math.exp(-f.taps[k].age * 2.5);
				pulseR = Math.max(pulseR, f.taps[k].age * 460);
			}
			pulse = Math.min(1, pulse);

			ctx.globalCompositeOperation = 'lighter';
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';

			// Nodal contour rings with petal modulation (the rosette lobes).
			for (var ni = 1; ni <= nodes; ni++) {
				var nodeR = (ni / (nodes + 0.5)) * maxR;
				var lobe = (maxR / nodes) * 0.32 * (0.5 + breathe * 0.5);
				ctx.beginPath();
				for (var a = 0; a <= TAU + 0.001; a += state.aStep * 0.01) {
					var rr = nodeR + Math.cos(ang * a + (ni % 2) * Math.PI) * lobe;
					var x = cx + Math.cos(a) * rr;
					var y = cy + Math.sin(a) * rr;
					if (a === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
				}
				ctx.closePath();
				var u = ni / nodes;
				var col = u < 0.5 ? U.mix(f.colors[0], f.colors[1], u * 2) : U.mix(f.colors[1], f.colors[2], (u - 0.5) * 2);
				var ringPulse = pulseR > 0 ? Math.exp(-Math.pow((nodeR - pulseR) / 60, 2)) : 0;
				col = U.mix(col, WHITE, (pulse * 0.3 + ringPulse * 0.7));
				ctx.strokeStyle = U.rgba(col, 0.22 + breathe * 0.12 + ringPulse * 0.5);
				ctx.lineWidth = 1.2 + breathe * 0.8 + ringPulse * 2;
				ctx.stroke();
			}

			// Radial petal spokes — 2*ang, perfectly even.
			var spokes = ang * 2;
			for (var sp = 0; sp < spokes; sp++) {
				var sa = (sp / spokes) * TAU;
				var bright = 0.5 + 0.5 * Math.cos(ang * sa);
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(sa) * maxR * 0.12, cy + Math.sin(sa) * maxR * 0.12);
				ctx.lineTo(cx + Math.cos(sa) * maxR, cy + Math.sin(sa) * maxR);
				ctx.strokeStyle = U.rgba(U.mix(f.colors[2], WHITE, bright * 0.4 + pulse * 0.3), 0.06 + bright * 0.14 + pulse * 0.15);
				ctx.lineWidth = 1 + bright;
				ctx.stroke();
			}

			// Antinode dots at petal intersections.
			for (var ri = 1; ri <= nodes; ri++) {
				var rr2 = (ri / (nodes + 0.5)) * maxR;
				for (var pj = 0; pj < ang; pj++) {
					var pa = (pj / ang) * TAU + (ri % 2) * (Math.PI / ang);
					var px = cx + Math.cos(pa) * rr2, py = cy + Math.sin(pa) * rr2;
					var dotB = 0.5 + 0.5 * breathe;
					ctx.beginPath();
					ctx.arc(px, py, 1.4 + dotB * 1.6 + pulse * 2, 0, TAU);
					ctx.fillStyle = U.rgba(U.mix(f.colors[1], WHITE, dotB * 0.5 + pulse * 0.4), 0.3 + dotB * 0.3);
					ctx.fill();
				}
			}

			var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.18);
			core.addColorStop(0, U.rgba(WHITE, 0.28 + pulse * 0.3));
			core.addColorStop(1, U.rgba(f.colors[1], 0));
			ctx.fillStyle = core;
			ctx.beginPath();
			ctx.arc(cx, cy, maxR * 0.18, 0, TAU);
			ctx.fill();

			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
