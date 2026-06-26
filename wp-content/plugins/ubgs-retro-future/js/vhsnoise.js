/* UltraBGs pack: VHS Noise — Retro Future pack by AWEN01
 * v2: simple analog TV static. A field of fine luminance noise with faint
 * scanlines and one slow rolling brightness bar — the classic untuned-
 * channel look. Cursor brightens the static around it, taps briefly snow
 * up the whole frame, scroll rolls the bar.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'vhsnoise',
		name: 'VHS Noise',

		init: function (state, f) {
			// Offscreen low-res static buffer, upscaled (cheap + authentic).
			var ow = Math.round(Math.max(160, Math.min(320, 220 * f.density)));
			var oh = Math.max(90, Math.round(ow * f.h / Math.max(1, f.w)));
			state.ow = ow; state.oh = oh;
			state.off = document.createElement('canvas');
			state.off.width = ow; state.off.height = oh;
			state.octx = state.off.getContext('2d');
			state.img = state.octx.createImageData(ow, oh);
			state.tick = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var ow = state.ow, oh = state.oh, data = state.img.data;

			// Tap burst raises overall snow briefly.
			var burst = 0;
			for (var k = 0; k < f.taps.length; k++) { burst += Math.exp(-f.taps[k].age * 3) * 0.5; }
			burst = Math.min(0.6, burst);

			// Rolling bright bar position (scroll nudges it).
			var bar = ((t * 0.12 + f.scroll * 0.0006) % 1);

			// Cursor glow center in offscreen space.
			var pgx = f.pointer.active ? f.pointer.x / f.w * ow : -999;
			var pgy = f.pointer.active ? f.pointer.y / f.h * oh : -999;

			var idx = 0;
			for (var y = 0; y < oh; y++) {
				var vy = y / oh;
				// Soft rolling bar (a wide raised-luminance band).
				var barLift = Math.exp(-Math.pow((vy - bar) / 0.08, 2)) * 40;
				for (var x = 0; x < ow; x++) {
					// White noise, reseeded each frame.
					var n = U.noise2(x * 12.9898 + state.tick * 7.1, y * 78.233 + state.tick * 3.7);
					n = (n * 43758.5453) % 1; if (n < 0) { n += 1; }
					var lum = 40 + n * 150 + barLift + burst * 180;

					// Cursor brightens local snow.
					if (pgx > -900) {
						var dx = x - pgx, dy = y - pgy;
						lum += Math.exp(-(dx * dx + dy * dy) / 900) * 90;
					}
					lum = lum > 255 ? 255 : lum;
					data[idx] = data[idx + 1] = data[idx + 2] = lum;
					data[idx + 3] = 255;
					idx += 4;
				}
			}
			state.octx.putImageData(state.img, 0, 0);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(state.off, 0, 0, ow, oh, 0, 0, f.w, f.h);
			state.tick++;

			// Faint scanlines over the upscaled static.
			ctx.fillStyle = 'rgba(0,0,0,0.12)';
			for (var sy = 0; sy < f.h; sy += 3) { ctx.fillRect(0, sy, f.w, 1); }

			// Subtle palette tint so it isn't pure grey (very light).
			ctx.globalCompositeOperation = 'overlay';
			ctx.fillStyle = U.rgba(f.colors[1], 0.06);
			ctx.fillRect(0, 0, f.w, f.h);
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
