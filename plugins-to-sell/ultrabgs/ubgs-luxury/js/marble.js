/* UltraBGs pack: Marble Veins — Luxury pack by AWEN01
 * Polished stone: a slowly swirling marble field (domain-warped noise) with
 * fine metallic veins picked out along the turbulence ridges. Rendered to a
 * low-res buffer and upscaled (cheap, painterly). Cursor warps the swirl
 * locally; taps bloom a vein-burst; scroll drifts the slab.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'marble',
		name: 'Marble Veins',

		init: function (state, f) {
			var ow = Math.round(Math.max(120, Math.min(220, 150 * f.density)));
			var oh = Math.max(70, Math.round(ow * f.h / Math.max(1, f.w)));
			state.ow = ow; state.oh = oh;
			state.off = document.createElement('canvas');
			state.off.width = ow; state.off.height = oh;
			state.octx = state.off.getContext('2d');
			state.img = state.octx.createImageData(ow, oh);
			state.tick = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			state.tick++;
			// Recompute at ~30fps; cache covers gaps.
			if (state.tick % 2 === 0 || !state.ready || f.reduced) {
				compute(state, f, t);
				state.ready = true;
			}
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(state.off, 0, 0, state.ow, state.oh, 0, 0, f.w, f.h);
		}
	});

	function compute(state, f, t) {
		var ow = state.ow, oh = state.oh, data = state.img.data;
		var drift = t * 0.04 + f.scroll * 0.0006;
		var c0 = f.colors[0], c1 = f.colors[1], c2 = f.colors[2];
		var px0 = f.pointer.active ? f.pointer.x / f.w * ow : -999;
		var py0 = f.pointer.active ? f.pointer.y / f.h * oh : -999;

		var idx = 0;
		for (var y = 0; y < oh; y++) {
			for (var x = 0; x < ow; x++) {
				var nx = x * 0.03, ny = y * 0.03;
				// Domain warp for the swirl.
				var wx = U.noise2(nx + drift, ny) * 3;
				var wy = U.noise2(nx + 5.2, ny - drift) * 3;

				// Cursor warps locally.
				if (px0 > -900) {
					var dx = x - px0, dy = y - py0;
					var infl = Math.exp(-(dx * dx + dy * dy) / 900);
					wx += dx * 0.02 * infl; wy += dy * 0.02 * infl;
				}

				var turb = U.noise2(nx + wx, ny + wy);
				turb += U.noise2(nx * 2.3 + wx, ny * 2.3 + wy) * 0.5;
				var marbleVal = Math.sin((nx + turb) * 2.2);

				// Tap vein-bursts.
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tx = tap.x / f.w * ow, ty = tap.y / f.h * oh;
					var tdx = x - tx, tdy = y - ty;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * (Math.max(ow, oh) * 0.5);
					marbleVal += Math.exp(-Math.pow((td - ring) / 12, 2)) * (1 - tap.age / 3) * 2;
				}

				var base = marbleVal * 0.5 + 0.5; // 0..1 stone tone
				var col = base < 0.5 ? U.mix(c0, c1, base * 2) : U.mix(c1, c2, (base - 0.5) * 2);

				// Veins: bright thin ridges where the marble value crosses zero.
				var vein = 1 - U.smoothstep(0, 0.06, Math.abs(marbleVal));
				col = U.mix(col, U.mix(c2, { r: 255, g: 255, b: 255 }, 0.35), vein * 0.7);

				data[idx] = col.r; data[idx + 1] = col.g; data[idx + 2] = col.b; data[idx + 3] = 255;
				idx += 4;
			}
		}
		state.octx.putImageData(state.img, 0, 0);
	}
})();
