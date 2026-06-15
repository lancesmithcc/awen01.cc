/* UltraBGs pack: Low Poly Node Morph — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'lowpoly',
		name: 'Low Poly Node Morph',

		init: function (state, f) {
			var cell = Math.max(48, 110 / f.density);
			var cols = Math.ceil(f.w / cell) + 2;
			var rows = Math.ceil(f.h / cell) + 2;
			var pts = [];
			for (var r = 0; r < rows; r++) {
				for (var c = 0; c < cols; c++) {
					pts.push({
						bx: (c - 0.5) * cell,
						by: (r - 0.5) * cell,
						seed: U.noise2(c * 3.7, r * 5.1) * 100
					});
				}
			}
			state.cell = cell; state.cols = cols; state.rows = rows; state.pts = pts;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var pts = state.pts, cell = state.cell, cols = state.cols, rows = state.rows;
			var i, p;

			// Move points: ambient drift + cursor repulsion + tap shockwaves.
			for (i = 0; i < pts.length; i++) {
				p = pts[i];
				var ox = Math.sin(t * 0.7 + p.seed) * cell * 0.28;
				var oy = Math.cos(t * 0.55 + p.seed * 1.3) * cell * 0.28;

				if (f.pointer.active) {
					var dx = p.bx - f.pointer.x, dy = p.by - f.pointer.y;
					var d = Math.sqrt(dx * dx + dy * dy) || 1;
					var force = U.smoothstep(220, 0, d) * 46;
					ox += (dx / d) * force;
					oy += (dy / d) * force;
				}
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = p.bx - tap.x, tdy = p.by - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
					var ring = tap.age * 380;
					var w = Math.exp(-Math.pow((td - ring) / 70, 2)) * (1 - tap.age / 3) * 38;
					ox += (tdx / td) * w;
					oy += (tdy / td) * w;
				}
				p.x = p.bx + ox;
				p.y = p.by + oy;
				p.lift = Math.sqrt(ox * ox + oy * oy) / cell;
			}

			// Triangles, colored by palette noise + displacement light.
			var c0 = f.colors[0], c1 = f.colors[1], c2 = f.colors[2] || f.colors[1];
			for (var r = 0; r < rows - 1; r++) {
				for (var c = 0; c < cols - 1; c++) {
					var a = pts[r * cols + c], b = pts[r * cols + c + 1];
					var d2 = pts[(r + 1) * cols + c], e = pts[(r + 1) * cols + c + 1];
					tri(ctx, a, b, d2, f, c0, c1, c2, t, f.scroll);
					tri(ctx, b, e, d2, f, c0, c1, c2, t + 11, f.scroll);
				}
			}
		}
	});

	function tri(ctx, a, b, c, f, c0, c1, c2, t, scroll) {
		var cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3;
		var n = U.noise2(cx * 0.004 + t * 0.05, cy * 0.004 + scroll * 0.0008);
		var base = n < 0.5 ? U.mix(c0, c1, n * 2) : U.mix(c1, c2, (n - 0.5) * 2);
		var lift = U.clamp((a.lift + b.lift + c.lift) / 3, 0, 1);
		var lit = U.mix(base, { r: 255, g: 255, b: 255 }, lift * 0.45);
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.lineTo(c.x, c.y);
		ctx.closePath();
		ctx.fillStyle = U.rgba(lit, 0.95);
		ctx.fill();
		ctx.strokeStyle = U.rgba(lit, 1);
		ctx.lineWidth = 0.5;
		ctx.stroke();
	}
})();
