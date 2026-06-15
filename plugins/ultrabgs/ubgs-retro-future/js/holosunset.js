/* UltraBGs pack: Holographic Sunset — Retro Future pack by AWEN01
 * An iridescent sun sinking through interference bands, with drifting
 * holo-glints. Cursor parallaxes the scene and shifts the iridescence,
 * taps send rainbow shockwaves, scroll sinks and raises the sun.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'holosunset',
		name: 'Holographic Sunset',

		init: function (state, f) {
			var glints = [];
			for (var i = 0; i < Math.round(26 * f.density); i++) {
				glints.push({ x: Math.random(), y: Math.random(), seed: Math.random() * TAU });
			}
			state.glints = glints;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var parX = f.pointer.active ? (f.pointer.x / f.w - 0.5) : 0;
			var parY = f.pointer.active ? (f.pointer.y / f.h - 0.5) : 0;
			var hueShift = parX * 0.8 + t * 0.12;

			// Iridescent sky bands: horizontal strips cycling the palette.
			var bands = Math.round(26 * f.density);
			var bandH = f.h / bands;
			for (var b = 0; b < bands; b++) {
				var u = b / bands;
				var pos = (u * 2.4 + hueShift + Math.sin(u * 9 + t * 0.5) * 0.12) % 3;
				if (pos < 0) { pos += 3; }
				var seg = pos | 0;
				var frac = pos - seg;
				var pal = [f.colors[0], f.colors[1], f.colors[2], f.colors[0]];
				var col = U.mix(pal[seg], pal[seg + 1], frac);
				ctx.fillStyle = U.rgba(col, 0.1 + Math.sin(u * Math.PI) * 0.1);
				ctx.fillRect(0, b * bandH - 1, f.w, bandH + 2);
			}

			// The sun: layered iridescent rings.
			var sx = f.w / 2 + parX * 60;
			var sy = f.h * 0.5 + parY * 40 + Math.sin(f.scroll * 0.0015) * f.h * 0.18;
			var R = Math.min(f.w, f.h) * 0.24;

			ctx.globalCompositeOperation = 'lighter';
			for (var ring = 7; ring >= 0; ring--) {
				var rr = R * (0.35 + ring * 0.12) * (1 + Math.sin(t * 0.7 + ring) * 0.02);
				var pos2 = (ring * 0.45 - hueShift * 1.4) % 3;
				if (pos2 < 0) { pos2 += 3; }
				var s2 = pos2 | 0;
				var col2 = U.mix([f.colors[0], f.colors[1], f.colors[2], f.colors[0]][s2],
					[f.colors[0], f.colors[1], f.colors[2], f.colors[0]][s2 + 1], pos2 - s2);
				ctx.beginPath();
				ctx.arc(sx, sy, rr, 0, TAU);
				ctx.strokeStyle = U.rgba(ring === 0 ? U.mix(col2, WHITE, 0.5) : col2, 0.25 + (ring === 0 ? 0.4 : 0));
				ctx.lineWidth = ring === 0 ? 6 : 2.5;
				ctx.stroke();
			}

			// Interference scanlines through the sun.
			for (var sl = -6; sl <= 6; sl++) {
				var y2 = sy + sl * R * 0.16 + Math.sin(t * 1.3 + sl) * 3;
				var hw = Math.sqrt(Math.max(0, R * R - Math.pow(y2 - sy, 2))) * 1.05;
				if (hw <= 0) { continue; }
				ctx.beginPath();
				ctx.moveTo(sx - hw, y2);
				ctx.lineTo(sx + hw, y2);
				ctx.strokeStyle = 'rgba(8,8,16,0.5)';
				ctx.lineWidth = 2.5;
				ctx.stroke();
			}

			// Tap rainbow shockwaves.
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				var fade = 1 - tap.age / 3;
				if (fade <= 0) { continue; }
				for (var w2 = 0; w2 < 3; w2++) {
					ctx.beginPath();
					ctx.arc(tap.x, tap.y, tap.age * 430 + w2 * 14, 0, TAU);
					ctx.strokeStyle = U.rgba(f.colors[w2], fade * 0.4);
					ctx.lineWidth = 4;
					ctx.stroke();
				}
			}

			// Holo-glints: little drifting plus-sparkles.
			for (var gI = 0; gI < state.glints.length; gI++) {
				var gl = state.glints[gI];
				var gx = (gl.x + Math.sin(t * 0.1 + gl.seed) * 0.02 + parX * 0.04 * (gI % 3)) * f.w;
				var gy = ((gl.y + t * 0.012 + f.scroll * 0.00005) % 1) * f.h;
				var tw = 0.5 + 0.5 * Math.sin(t * 2 + gl.seed * 5);
				var sz = 2 + tw * 4;
				ctx.strokeStyle = U.rgba(U.mix(f.colors[gI % 3], WHITE, tw * 0.6), 0.25 + tw * 0.45);
				ctx.lineWidth = 1.2;
				ctx.beginPath();
				ctx.moveTo(gx - sz, gy); ctx.lineTo(gx + sz, gy);
				ctx.moveTo(gx, gy - sz); ctx.lineTo(gx, gy + sz);
				ctx.stroke();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
