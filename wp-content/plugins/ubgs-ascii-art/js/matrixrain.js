/* UltraBGs pack: Matrix Rain — ASCII Art pack by AWEN01
 * Falling glyph columns (katakana + digits + symbols) with bright leading
 * heads and fading trails. Cursor speeds and brightens nearby columns,
 * scroll throttles the global fall speed, taps splash a bright ring of
 * glyphs outward.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 230, g: 255, b: 235 };
	// Mixed glyph set: katakana + half-width katakana + Cyrillic + Greek
	// + digits + math/box-drawing symbols, for a richer polyglot cascade.
	var GLYPHS = [];
	(function () {
		var ranges = [
			[0x30A0, 0x30FF], // katakana
			[0xFF66, 0xFF9D], // half-width katakana
			[0x0410, 0x044F], // Cyrillic
			[0x0391, 0x03A9], // Greek uppercase
			[0x03B1, 0x03C9]  // Greek lowercase
		];
		for (var r = 0; r < ranges.length; r++) {
			for (var ch = ranges[r][0]; ch <= ranges[r][1]; ch++) { GLYPHS.push(String.fromCharCode(ch)); }
		}
		// Digits, math, currency, box-drawing and assorted symbols.
		('0123456789' +
		 '+-*/=<>%#@&$¢£¥€§¶' +
		 '┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║' +
		 '★☆♦◆◇○●□▲▼◢◣∴∵∞≈≠±'
		).split('').forEach(function (c) { GLYPHS.push(c); });
	})();
	function glyph(seed) { return GLYPHS[Math.floor(seed * GLYPHS.length) % GLYPHS.length]; }

	window.UltraBGs.registerPack({
		id: 'matrixrain',
		name: 'Matrix Rain',

		init: function (state, f) {
			var cell = Math.max(12, Math.round(20 / f.density));
			state.cell = cell;
			state.cols = Math.ceil(f.w / cell) + 1;
			state.rows = Math.ceil(f.h / cell) + 1;
			var drops = [];
			for (var c = 0; c < state.cols; c++) {
				drops.push({
					y: Math.random() * state.rows,
					speed: 6 + Math.random() * 12,   // rows per second
					len: 6 + Math.floor(Math.random() * 18),
					jitter: Math.random() * 100
				});
			}
			state.drops = drops;
			state.font = cell + 'px monospace';
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var cell = state.cell;
			var globalSpeed = 1 + Math.abs(f.scrollVel) * 0.02 + f.scrollVel * 0.004;

			ctx.font = state.font;
			ctx.textBaseline = 'top';

			for (var c = 0; c < state.cols; c++) {
				var d = state.drops[c];
				var x = c * cell;

				// Cursor proximity speeds + brightens this column.
				var prox = 0;
				if (f.pointer.active) {
					prox = U.smoothstep(160, 0, Math.abs(f.pointer.x - (x + cell / 2)));
				}
				d.y += (d.speed * (globalSpeed + prox * 1.5)) * f.dt * f.speed;
				if (d.y - d.len > state.rows) {
					d.y = -Math.random() * 6;
					d.len = 6 + Math.floor(Math.random() * 18);
					d.speed = 6 + Math.random() * 12;
				}

				var head = Math.floor(d.y);
				for (var k = 0; k < d.len; k++) {
					var row = head - k;
					if (row < 0 || row > state.rows) { continue; }
					var y = row * cell;

					// Tap splash: bright ring of glyphs.
					var splash = 0;
					for (var tk = 0; tk < f.taps.length; tk++) {
						var tap = f.taps[tk];
						var dx = x - tap.x, dy = y - tap.y;
						var dist = Math.sqrt(dx * dx + dy * dy);
						var ring = tap.age * 460;
						splash += Math.exp(-Math.pow((dist - ring) / 50, 2)) * (1 - tap.age / 3);
					}
					splash = Math.min(1, splash);

					var fade = 1 - k / d.len;
					var g = glyph(U.noise2(c * 3.1 + Math.floor(t * 6 + d.jitter + k), row * 0.7));
					var col, alpha;
					if (k === 0) {
						col = U.mix(WHITE, f.colors[1], 0.2);
						alpha = 0.95;
					} else {
						col = U.mix(f.colors[0], f.colors[1], fade * 0.5);
						alpha = fade * (0.5 + prox * 0.4);
					}
					if (splash > 0.01 || prox > 0.3) {
						col = U.mix(col, WHITE, Math.max(splash, prox * 0.5) * 0.7);
						alpha = Math.max(alpha, splash);
					}
					ctx.fillStyle = U.rgba(col, alpha);
					ctx.fillText(g, x, y);
				}
			}
		}
	});
})();
