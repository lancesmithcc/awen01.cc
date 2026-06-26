/* UltraBGs pack: Ripple Field — ASCII Art pack by AWEN01
 * A pond of ASCII glyphs whose brightness is the height of interfering
 * waves. Ambient swells ripple the field; the cursor is a continuous wave
 * source that pushes circular wavefronts; taps drop expanding rings; scroll
 * shifts the whole interference pattern.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 235, g: 245, b: 255 };
	var RAMP = ' `.-~:=+oxX#%@'.split('');

	window.UltraBGs.registerPack({
		id: 'ripplefield',
		name: 'Ripple Field',

		init: function (state, f) {
			var cell = Math.max(12, Math.round(18 / f.density));
			state.cell = cell;
			state.cols = Math.ceil(f.w / cell) + 1;
			state.rows = Math.ceil(f.h / cell) + 1;
			state.font = cell + 'px monospace';
			state.colX = new Float32Array(state.cols);
			state.rowY = new Float32Array(state.rows);
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var cell = state.cell, cols = state.cols, rows = state.rows;
			ctx.font = state.font;
			ctx.textBaseline = 'top';

			var scrollPhase = f.scroll * 0.01;

			// Precompute the separable wave terms once per frame:
			// colX[c], rowY[r], and the diagonal term per (c+r).
			var colX = state.colX, rowY = state.rowY;
			for (var cc = 0; cc < cols; cc++) {
				colX[cc] = Math.sin(cc * cell * 0.03 + t * 1.5 + scrollPhase) * 0.5;
			}
			for (var rr2 = 0; rr2 < rows; rr2++) {
				rowY[rr2] = Math.sin(rr2 * cell * 0.035 - t * 1.2) * 0.5;
			}

			for (var r = 0; r < rows; r++) {
				var py = r * cell;
				var rterm = rowY[r];
				for (var c = 0; c < cols; c++) {
					var px = c * cell;

					var h = colX[c] + rterm
						+ Math.sin((px + py) * 0.02 + t) * 0.4;

					// Cursor wave source.
					if (f.pointer.active) {
						var dx = px - f.pointer.x, dy = py - f.pointer.y;
						var d = Math.sqrt(dx * dx + dy * dy);
						if (d < 360) {
							h += Math.cos(d * 0.06 - t * 6) * U.smoothstep(360, 0, d) * 1.4;
						}
					}

					// Tap rings.
					for (var tk = 0; tk < f.taps.length; tk++) {
						var tap = f.taps[tk];
						var tdx = px - tap.x, tdy = py - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 460;
						var env = (td - ring);
						if (env > -200 && env < 200) {
							h += Math.cos(env * 0.08) * Math.exp(-Math.pow(env / 80, 2)) * (1 - tap.age / 3) * 2;
						}
					}

					var bright = (h + 2.3) / 4.6;
					if (bright <= 0) { continue; } else if (bright > 1) { bright = 1; }
					var ri = (bright * (RAMP.length - 1)) | 0;
					if (ri <= 0) { continue; }

					var col = bright < 0.5 ? U.mix(f.colors[0], f.colors[1], bright * 2) : U.mix(f.colors[1], f.colors[2], (bright - 0.5) * 2);
					if (bright > 0.85) { col = U.mix(col, WHITE, (bright - 0.85) * 4); }

					ctx.fillStyle = U.rgba(col, 0.2 + bright * 0.6);
					ctx.fillText(RAMP[ri], px, py);
				}
			}
		}
	});
})();
