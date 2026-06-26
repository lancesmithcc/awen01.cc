/* UltraBGs pack: Synthwave Grid — Retro Future pack by AWEN01
 * The perspective neon floor. Cursor steers the vanishing point and tilts
 * the plane, scroll throttles the drive speed, taps send a glow pulse
 * racing across the grid.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'synthgrid',
		name: 'Synthwave Grid',

		init: function (state, f) {
			state.vx = 0; state.vy = 0;
			state.lines = Math.round(22 * f.density);
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;

			// Vanishing point follows the cursor, smoothed.
			var txv = f.w / 2, tyv = f.h * 0.42;
			if (f.pointer.active) {
				txv = f.w / 2 + (f.pointer.x - f.w / 2) * 0.3;
				tyv = f.h * 0.42 + (f.pointer.y - f.h / 2) * 0.12;
			}
			state.vx = U.lerp(state.vx || f.w / 2, txv, 0.05);
			state.vy = U.lerp(state.vy || f.h * 0.42, tyv, 0.05);
			var vx = state.vx, vy = state.vy;

			var drive = t * (1.4 + Math.abs(f.scrollVel) * 0.02) + f.scroll * 0.004;
			var glow = f.colors[1];

			ctx.globalCompositeOperation = 'lighter';
			ctx.lineCap = 'round';

			// Horizon line.
			grad(ctx, 0, vy, f.w, vy, f.colors[2], 0.5, 2.5);

			// Radial lines fanning from the vanishing point.
			var n = state.lines;
			for (var i = -n; i <= n; i++) {
				var spread = (i / n);
				var bx = vx + spread * f.w * 1.4;
				var prox = laneProx(f, vx, vy, bx);
				var col = U.mix(f.colors[0], glow, Math.abs(spread));
				if (prox > 0.01) { col = U.mix(col, WHITE, prox * 0.6); }
				line(ctx, vx, vy, bx, f.h + 10, col, 0.16 + prox * 0.5, 1 + prox * 1.4);
			}

			// Horizontal lines accelerating toward the viewer.
			var rows = Math.round(16 * f.density);
			for (var r2 = 0; r2 < rows; r2++) {
				var u = ((r2 / rows) + (drive % 1) / rows) % 1;
				var pu = u * u * u; // perspective easing
				var y = vy + pu * (f.h - vy + 20);

				// Tap pulses race across the floor as bright rows.
				var pulse = 0;
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tapU = U.clamp((tap.y - vy) / (f.h - vy), 0, 1);
					var ring = tapU + (0.0 - tap.age * 0.5);
					pulse += Math.exp(-Math.pow((u - Math.abs(ring)) / 0.08, 2)) * (1 - tap.age / 3);
				}
				pulse = Math.min(1, pulse);

				var col2 = U.mix(f.colors[0], glow, u);
				if (pulse > 0.01) { col2 = U.mix(col2, WHITE, pulse * 0.7); }
				line(ctx, 0, y, f.w, y, col2, (0.1 + u * 0.4) + pulse * 0.5, 1 + u * 1.6 + pulse * 1.5);
			}

			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function laneProx(f, vx, vy, bx) {
		if (!f.pointer.active || f.pointer.y <= vy) { return 0; }
		// Horizontal distance from pointer to this radial line at pointer's y.
		var u = (f.pointer.y - vy) / (f.h - vy);
		var lx = vx + (bx - vx) * u;
		return U.smoothstep(120, 0, Math.abs(f.pointer.x - lx));
	}

	function line(ctx, x0, y0, x1, y1, col, alpha, w) {
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.lineTo(x1, y1);
		ctx.strokeStyle = U.rgba(col, alpha);
		ctx.lineWidth = w;
		ctx.stroke();
	}

	function grad(ctx, x0, y0, x1, y1, col, alpha, w) {
		line(ctx, x0, y0, x1, y1, col, alpha, w);
		line(ctx, x0, y0, x1, y1, col, alpha * 0.4, w * 4);
	}
})();
