/* UltraBGs pack: Water — Ripples — Elemental pack by AWEN01
 * Looking up through water: a shifting caustic light texture (the bright
 * web of refracted light on a pool floor) with interfering surface ripples.
 * The cursor drags a wake that distorts the caustics and pushes a bow wave;
 * taps drop a stone — concentric ripples expand and refract the light; scroll
 * shifts the current. Rendered to a low-res buffer for smooth, cheap caustics,
 * with crisp ripple rings drawn on top.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'water',
		name: 'Water — Ripples',

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
			if (state.tick % 2 === 0 || !state.ready || f.reduced) {
				computeCaustics(state, f, t);
				state.ready = true;
			}
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(state.off, 0, 0, state.ow, state.oh, 0, 0, f.w, f.h);

			// Crisp ripple rings on top (cursor bow wave + tap drops).
			ctx.globalCompositeOperation = 'lighter';
			ctx.lineCap = 'round';
			// Tap drops.
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				var fade = 1 - tap.age / 3;
				if (fade <= 0) { continue; }
				for (var w = 0; w < 3; w++) {
					var r = tap.age * 360 - w * 22;
					if (r < 0) { continue; }
					ctx.beginPath();
					ctx.arc(tap.x, tap.y, r, 0, 6.2832);
					ctx.strokeStyle = U.rgba(U.mix(f.colors[2], WHITE, 0.5), fade * (0.3 - w * 0.08));
					ctx.lineWidth = 2 - w * 0.5;
					ctx.stroke();
				}
			}
			// Cursor bow wave.
			if (f.pointer.active) {
				var sp = Math.sqrt(f.pointer.vx * f.pointer.vx + f.pointer.vy * f.pointer.vy);
				if (sp > 2) {
					ctx.beginPath();
					ctx.arc(f.pointer.x, f.pointer.y, 14 + sp * 0.6, 0, 6.2832);
					ctx.strokeStyle = U.rgba(WHITE, U.clamp(sp * 0.02, 0, 0.4));
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function computeCaustics(state, f, t) {
		var ow = state.ow, oh = state.oh, data = state.img.data;
		var c0 = f.colors[0], c1 = f.colors[1], c2 = f.colors[2];
		var current = f.scroll * 0.004;
		var px = f.pointer.active ? f.pointer.x / f.w * ow : -999;
		var py = f.pointer.active ? f.pointer.y / f.h * oh : -999;

		var idx = 0;
		for (var y = 0; y < oh; y++) {
			for (var x = 0; x < ow; x++) {
				var nx = x * 0.06, ny = y * 0.06;

				// Cursor wake warps the sample position (caustics bend).
				var wxo = 0, wyo = 0;
				if (px > -900) {
					var dx = x - px, dy = y - py;
					var infl = Math.exp(-(dx * dx + dy * dy) / 400);
					wxo = dx * 0.04 * infl; wyo = dy * 0.04 * infl;
				}

				// Two interfering wave systems => caustic web.
				var w1 = Math.sin(nx + t * 1.2 + wxo) * Math.cos(ny - t * 0.9 + wyo);
				var w2 = Math.sin((nx + ny) * 0.7 - t + current) * Math.cos((nx - ny) * 0.6 + t * 0.7);
				var w3 = Math.sin(nx * 1.8 + t * 1.6 + wxo * 2) + Math.cos(ny * 1.8 - t * 1.3 + wyo * 2);

				// Tap ripples refract the light (add concentric phase).
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tx = tap.x / f.w * ow, ty = tap.y / f.h * oh;
					var d = Math.hypot(x - tx, y - ty);
					var ring = tap.age * (Math.max(ow, oh) * 0.55);
					w3 += Math.cos((d - ring) * 0.5) * Math.exp(-Math.pow((d - ring) / 14, 2)) * (1 - tap.age / 3) * 2;
				}

				var inter = (w1 + w2 + w3 * 0.6);
				// Caustics: sharp bright filaments where waves constructively peak.
				var caustic = Math.pow(U.clamp(inter * 0.4 + 0.5, 0, 1), 3);
				var depth = y / oh; // deeper = darker/bluer
				var base = U.mix(U.mix(c0, c1, 0.5), { r: 4, g: 10, b: 20 }, depth * 0.4);
				var lit = U.mix(base, U.mix(c2, WHITE, 0.4), caustic);

				data[idx] = lit.r; data[idx + 1] = lit.g; data[idx + 2] = lit.b; data[idx + 3] = 255;
				idx += 4;
			}
		}
		state.octx.putImageData(state.img, 0, 0);
	}
})();
