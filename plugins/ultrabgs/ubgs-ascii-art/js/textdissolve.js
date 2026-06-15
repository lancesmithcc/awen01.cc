/* UltraBGs pack: Text Dissolve — ASCII Art pack by AWEN01
 * Rows of words drift across the field; where the cursor passes, taps land,
 * or a scroll-driven glitch bar sweeps, the characters dissolve into random
 * noise glyphs and scatter, then settle back. A decay/heal model gives the
 * classic data-corruption look.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 235, g: 245, b: 255 };
	var NOISE = '!<>-_\\/[]{}=+*^?#01'.split('');
	var WORDS = ['SIGNAL', 'GHOST', 'ECHO', 'NULL', 'DREAM', 'STATIC', 'PULSE', 'VOID', 'NEON', 'TRACE', 'FLUX', 'CHROME', 'DRIFT', 'CIPHER'];

	function noiseGlyph(seed) { return NOISE[Math.floor(seed * NOISE.length) % NOISE.length]; }

	window.UltraBGs.registerPack({
		id: 'textdissolve',
		name: 'Text Dissolve',

		init: function (state, f) {
			var cell = Math.max(12, Math.round(20 / f.density));
			state.cell = cell;
			state.cols = Math.ceil(f.w / cell) + 2;
			state.rows = Math.ceil(f.h / cell) + 1;
			state.font = cell + 'px monospace';

			// Build each row as a repeating stream of words with gaps.
			var lines = [];
			for (var r = 0; r < state.rows; r++) {
				var chars = [];
				while (chars.length < state.cols + 12) {
					var w = WORDS[Math.floor(Math.random() * WORDS.length)];
					for (var i = 0; i < w.length; i++) { chars.push(w[i]); }
					var gap = 2 + Math.floor(Math.random() * 5);
					for (var g = 0; g < gap; g++) { chars.push(' '); }
				}
				lines.push({
					chars: chars,
					offset: Math.random() * chars.length,
					speed: (0.4 + Math.random() * 0.8) * (r % 2 ? 1 : -1),
					ci: r % 3
				});
			}
			state.lines = lines;
			// Per-cell corruption level, healed over time.
			state.corrupt = new Float32Array(state.cols * state.rows);
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var cell = state.cell, cols = state.cols, rows = state.rows;
			ctx.font = state.font;
			ctx.textBaseline = 'top';

			// Scroll-driven glitch bar.
			var barY = ((f.scroll * 0.5) % (f.h + 80)) - 40;
			var barActive = Math.abs(f.scrollVel) > 1.5;

			var corrupt = state.corrupt;

			for (var r = 0; r < rows; r++) {
				var line = state.lines[r];
				line.offset += line.speed * f.dt * f.speed * 6;
				var py = r * cell;

				for (var c = 0; c < cols; c++) {
					var px = c * cell;
					var idx = r * cols + c;

					// Decay corruption toward 0 (healing).
					corrupt[idx] *= 0.92;

					// Cursor corrupts what it touches.
					if (f.pointer.active) {
						var dx = px - f.pointer.x, dy = py - f.pointer.y;
						var prox = U.smoothstep(150, 0, Math.sqrt(dx * dx + dy * dy));
						if (prox > corrupt[idx]) { corrupt[idx] = prox; }
					}
					// Tap bursts.
					for (var tk = 0; tk < f.taps.length; tk++) {
						var tap = f.taps[tk];
						var tdx = px - tap.x, tdy = py - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 440;
						var burst = Math.exp(-Math.pow((td - ring) / 60, 2)) * (1 - tap.age / 3);
						if (burst > corrupt[idx]) { corrupt[idx] = burst; }
					}
					// Glitch bar.
					if (barActive && Math.abs(py - barY) < cell * 1.5) { corrupt[idx] = Math.max(corrupt[idx], 0.8); }

					var srcIdx = (Math.floor(line.offset) + c) % line.chars.length;
					if (srcIdx < 0) { srcIdx += line.chars.length; }
					var ch = line.chars[srcIdx];
					var cor = corrupt[idx];

					if (cor > 0.05) {
						// Dissolve: swap to noise glyphs, scatter, brighten.
						ch = noiseGlyph(U.noise2(c * 1.7 + Math.floor(t * 20), r * 2.3));
					}
					if (ch === ' ' && cor < 0.2) { continue; }

					var col = U.mix(f.colors[line.ci], f.colors[(line.ci + 1) % 3], cor);
					if (cor > 0.5) { col = U.mix(col, WHITE, (cor - 0.5) * 1.4); }
					var jx = cor > 0.1 ? (U.noise2(idx, Math.floor(t * 30)) - 0.5) * cor * cell : 0;
					var jy = cor > 0.1 ? (U.noise2(Math.floor(t * 30), idx) - 0.5) * cor * cell : 0;

					ctx.fillStyle = U.rgba(col, 0.3 + cor * 0.6 + (ch !== ' ' ? 0.15 : 0));
					ctx.fillText(ch, px + jx, py + jy);
				}
			}
		}
	});
})();
