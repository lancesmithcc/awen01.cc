/* UltraBGs pack: AWEN01 Circle Node Lines — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'awennodes',
		name: 'AWEN01 Circle Node Lines',

		init: function (state, f) {
			var density = Math.min(f.density, 0.8);
			var count = Math.max(14, Math.round(24 * density));
			state.loopSeconds = 28;
			state.react = 0;
			state.pointerX = f.w * 0.5;
			state.pointerY = f.h * 0.5;
			state.points = [];
			for (var i = 0; i < count; i++) {
				var sx = U.noise2(i * 4.11, 2.2);
				var sy = U.noise2(i * 5.77, 8.4);
				var seed = U.noise2(i * 1.9, i * 3.7);
				state.points.push({
					x: sx * f.w,
					y: sy * f.h,
					phase: seed * Math.PI * 2,
					freqA: 1 + (i % 4),
					freqB: 2 + (i % 5),
					freqC: 3 + (i % 3),
					r: 3.4 + U.noise2(i * 6.3, 1.8) * 3.8,
					span: 12 + U.noise2(i * 8.7, 4.2) * 28
				});
			}
		},

		render: function (ctx, state, f) {
			var loop = state.loopSeconds || 28;
			var phase = ((f.t * f.speed) % loop) / loop;
			var theta = phase * Math.PI * 2;
			var ease = 1 - Math.pow(0.0007, Math.max(0.001, f.dt));
			var colors = f.colors.length ? f.colors : [
				{ r: 54, g: 214, b: 199 },
				{ r: 169, g: 139, b: 255 },
				{ r: 107, g: 156, b: 255 }
			];
			var pts = state.points;
			var maxDist = Math.max(130, 185 * Math.min(f.density, 0.9));
			var targetReact = f.pointer.active ? 1 : 0;
			state.react = U.lerp(state.react || 0, targetReact, ease * 0.52);
			state.pointerX = U.lerp(state.pointerX || f.w * 0.5, f.pointer.active ? f.pointer.x : f.w * 0.5, ease * 0.48);
			state.pointerY = U.lerp(state.pointerY || f.h * 0.5, f.pointer.active ? f.pointer.y : f.h * 0.5, ease * 0.48);
			var hover = 1 + state.react * 0.48;

			ctx.save();
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			ctx.globalCompositeOperation = 'screen';
			ctx.shadowBlur = 0;

			for (var i = 0; i < pts.length; i++) {
				var p = pts[i];
				p.px = p.x
					+ Math.sin(theta * p.freqA + p.phase) * p.span
					+ Math.cos(theta * p.freqB + p.phase * 0.7) * p.span * 0.42;
				p.py = p.y
					+ Math.cos(theta * p.freqB + p.phase) * p.span * 0.8
					+ Math.sin(theta * p.freqC + p.phase * 1.3) * p.span * 0.36;

				if (state.react > 0.01) {
					var dx = p.px - state.pointerX;
					var dy = p.py - state.pointerY;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var force = U.smoothstep(280, 0, d) * 58 * state.react;
					p.px += (dx / d) * force;
					p.py += (dy / d) * force;
				}
			}

			for (var a = 0; a < pts.length; a++) {
				for (var b = a + 1; b < pts.length; b++) {
					var pa = pts[a], pb = pts[b];
					var lx = pa.px - pb.px;
					var ly = pa.py - pb.py;
					var dist = Math.sqrt(lx * lx + ly * ly);
					if (dist > maxDist) { continue; }
					var strength = Math.pow(1 - dist / maxDist, 1.52);
					var col = colors[(a + b) % colors.length];
					ctx.strokeStyle = U.rgba(col, Math.min(0.92, strength * 0.9 * (f.opacity || 0.85) * hover));
					ctx.lineWidth = 1.15 + strength * 2.1;
					ctx.beginPath();
					ctx.moveTo(pa.px, pa.py);
					ctx.lineTo(pb.px, pb.py);
					ctx.stroke();
				}
			}

			for (var n = 0; n < pts.length; n++) {
				var node = pts[n];
				var c = colors[n % colors.length];
				var pulse = 0.5 + 0.5 * Math.sin(theta * 2 + node.phase);
				var radius = node.r + pulse * 1.7 + state.react * 0.6;
				ctx.fillStyle = U.rgba(c, 0.26 * (f.opacity || 0.85) * hover);
				ctx.strokeStyle = U.rgba(c, Math.min(1, (0.78 + pulse * 0.38) * (f.opacity || 0.85) * hover));
				ctx.lineWidth = 1.7;
				ctx.beginPath();
				ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();

				ctx.shadowBlur = 0;
				ctx.fillStyle = U.rgba(c, 0.86 * (f.opacity || 0.85) * hover);
				ctx.beginPath();
				ctx.arc(node.px, node.py, Math.max(1.15, radius * 0.24), 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}

			ctx.restore();
		}
	});
})();
