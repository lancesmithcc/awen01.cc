/* UltraBGs pack: ASCII Tunnel — ASCII Art pack by AWEN01
 * A classic demoscene tunnel rendered as ASCII: per-cell depth + angle map
 * textured with a glyph ramp, flying toward the viewer. Cursor steers the
 * tunnel center, scroll throttles + twists the fly-through, taps send a
 * bright ring of glyphs rushing outward.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 240, g: 245, b: 255 };
	var RAMP = ' .,:;irsXA253hMHGS#9B&@'.split(''); // dark -> bright

	window.UltraBGs.registerPack({
		id: 'asciitunnel',
		name: 'ASCII Tunnel',

		init: function (state, f) {
			var cell = Math.max(11, Math.round(18 / f.density));
			state.cell = cell;
			state.cols = Math.ceil(f.w / cell) + 1;
			state.rows = Math.ceil(f.h / cell) + 1;
			state.cx = 0; state.cy = 0;
			state.font = cell + 'px monospace';
			state.maxDim = Math.max(f.w, f.h) * 0.6;
		},

		// Recompute the static per-cell geometry when the center moves
		// (cursor steer) — but only the cheap parts run every frame.
		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var cell = state.cell, cols = state.cols, rows = state.rows;

			var tcx = f.w / 2, tcy = f.h / 2;
			if (f.pointer.active) {
				tcx = f.w / 2 + (f.pointer.x - f.w / 2) * 0.45;
				tcy = f.h / 2 + (f.pointer.y - f.h / 2) * 0.45;
			}
			state.cx = U.lerp(state.cx || tcx, tcx, 0.06);
			state.cy = U.lerp(state.cy || tcy, tcy, 0.06);

			var fly = t * 0.5 + f.scroll * 0.002;
			var twist = t * 0.2 + f.scroll * 0.0015;
			var cxp = state.cx, cyp = state.cy, maxDim = state.maxDim;

			ctx.font = state.font;
			ctx.textBaseline = 'top';

			for (var r = 0; r < rows; r++) {
				var py = r * cell + cell / 2;
				var dy = py - cyp;
				for (var c = 0; c < cols; c++) {
					var px = c * cell + cell / 2;
					var dx = px - cxp;
					var dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
					var angle = Math.atan2(dy, dx);

					var depth = 8000 / dist;
					var u = (depth + fly * 60) * 0.02;
					var v = (angle / Math.PI) * 6 + twist;
					var tex = (Math.sin(u) * 0.5 + 0.5) * (Math.sin(v * Math.PI) * 0.5 + 0.5);

					var fog = dist < maxDim ? dist / maxDim : 1;
					var bright = tex * fog;

					var splash = 0;
					for (var tk = 0; tk < f.taps.length; tk++) {
						var tap = f.taps[tk];
						var rr = tap.age * 500;
						splash += Math.exp(-Math.pow((dist - rr) / 60, 2)) * (1 - tap.age / 3);
					}
					if (splash > 0.01) { bright = bright + splash; if (bright > 1) { bright = 1; } }

					var ri = (bright * (RAMP.length - 1)) | 0;
					if (ri <= 0) { continue; }

					var col = U.mix(f.colors[0], f.colors[1], fog);
					col = U.mix(col, f.colors[2], (Math.sin(v) * 0.5 + 0.5) * 0.4);
					if (splash > 0.2) { col = U.mix(col, WHITE, splash * 0.6); }

					ctx.fillStyle = U.rgba(col, 0.25 + bright * 0.6);
					ctx.fillText(RAMP[ri], c * cell, r * cell);
				}
			}
		}
	});
})();
