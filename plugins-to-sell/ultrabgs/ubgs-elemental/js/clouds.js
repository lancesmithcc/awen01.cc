/* UltraBGs pack: Air — Wispy Clouds — Elemental pack by AWEN01
 * v3: smooth, natural disturbance. Soft volumetric clouds from domain-warped
 * fBm. Interaction feeds a low-res VELOCITY field (not a hard mask): the
 * cursor's motion and taps add smooth, diffusing flow that gently advects the
 * cloud sampling coordinates — so clouds drift aside and curl naturally, then
 * the flow diffuses and decays and they ease back. No punched holes. Scroll
 * adds a steady current; lighting gives the billows volume.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'clouds',
		name: 'Air — Wispy Clouds',

		init: function (state, f) {
			var ow = Math.round(Math.max(130, Math.min(220, 165 * f.density)));
			var oh = Math.max(78, Math.round(ow * f.h / Math.max(1, f.w)));
			state.ow = ow; state.oh = oh;
			state.off = document.createElement('canvas');
			state.off.width = ow; state.off.height = oh;
			state.octx = state.off.getContext('2d');
			state.img = state.octx.createImageData(ow, oh);

			// Coarse flow field that advects the cloud coordinates.
			var fw = Math.max(24, Math.round(ow / 5));
			var fh = Math.max(16, Math.round(oh / 5));
			state.fw = fw; state.fh = fh;
			state.vx = new Float32Array(fw * fh);
			state.vy = new Float32Array(fw * fh);
			state.tmp = new Float32Array(fw * fh);
			state.tick = 0;
			state.plx = 0; state.ply = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var ow = state.ow, oh = state.oh, fw = state.fw, fh = state.fh;
			var vx = state.vx, vy = state.vy;

			// --- Feed the flow field smoothly, smoke-style ---
			// Smoke billows up and curls. Injected flow gets an upward
			// buoyancy bias and a turbulent swirl, not a flat radial puff.
			var fsx = fw / f.w, fsy = fh / f.h;
			if (f.pointer.active) {
				var mvx = f.pointer.x - state.plx, mvy = f.pointer.y - state.ply;
				var cx0 = f.pointer.x * fsx, cy0 = f.pointer.y * fsy;
				// Curl: perpendicular component of motion makes it roll.
				addFlow(vx, vy, fw, fh, cx0, cy0, 4.5,
					mvx * 0.35 - mvy * 0.12, mvy * 0.35 + mvx * 0.12 - 1.2 /*buoyancy*/);
				state.plx = f.pointer.x; state.ply = f.pointer.y;
			} else { state.plx = f.pointer.x; state.ply = f.pointer.y; }
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				if (tap.age < 0.3) {
					// A rising, swirling puff (smoke ring that lifts), not a
					// symmetric water ripple.
					var amt = (1 - tap.age / 0.3) * 7;
					var cx = tap.x * fsx, cy = tap.y * fsy;
					for (var a = 0; a < 8; a++) {
						var ang = a / 8 * 6.2832;
						addFlow(vx, vy, fw, fh, cx + Math.cos(ang) * 2.5, cy + Math.sin(ang) * 2.5, 3,
							Math.cos(ang) * amt - Math.sin(ang) * amt * 0.4,
							Math.sin(ang) * amt + Math.cos(ang) * amt * 0.4 - 2 /*lift*/);
					}
				}
			}

			// --- Diffuse + decay the flow. Wider, looser diffusion + a slow
			// global upward drift so disturbances rise and spread like smoke
			// rather than ringing tightly like water. ---
			state.tick++;
			if (state.tick % 2 === 0 || !state.ready || f.reduced) {
				diffuse(vx, state.tmp, fw, fh);
				diffuse(vy, state.tmp, fw, fh);
				diffuse(vx, state.tmp, fw, fh); // second pass = airier spread
				diffuse(vy, state.tmp, fw, fh);
				for (var i = 0; i < vx.length; i++) { vx[i] *= 0.96; vy[i] = vy[i] * 0.96 - Math.abs(vy[i]) * 0.05; }
				compute(state, f, t);
				state.ready = true;
			}

			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(state.off, 0, 0, ow, oh, 0, 0, f.w, f.h);
		}
	});

	function addFlow(vx, vy, fw, fh, gx, gy, rad, ax, ay) {
		var x0 = Math.max(0, (gx - rad) | 0), x1 = Math.min(fw - 1, Math.ceil(gx + rad));
		var y0 = Math.max(0, (gy - rad) | 0), y1 = Math.min(fh - 1, Math.ceil(gy + rad));
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				var dx = x - gx, dy = y - gy;
				var fall = Math.exp(-(dx * dx + dy * dy) / (rad * rad));
				var i = y * fw + x;
				vx[i] += ax * fall; vy[i] += ay * fall;
			}
		}
	}

	function diffuse(field, tmp, fw, fh) {
		for (var y = 0; y < fh; y++) {
			for (var x = 0; x < fw; x++) {
				var i = y * fw + x;
				var l = field[y * fw + Math.max(0, x - 1)];
				var r = field[y * fw + Math.min(fw - 1, x + 1)];
				var u = field[Math.max(0, y - 1) * fw + x];
				var d = field[Math.min(fh - 1, y + 1) * fw + x];
				tmp[i] = field[i] * 0.4 + (l + r + u + d) * 0.15;
			}
		}
		field.set(tmp);
	}

	function sampleFlow(field, fw, fh, gx, gy) {
		if (gx < 0) { gx = 0; } else if (gx > fw - 1) { gx = fw - 1; }
		if (gy < 0) { gy = 0; } else if (gy > fh - 1) { gy = fh - 1; }
		var x0 = gx | 0, y0 = gy | 0;
		var x1 = Math.min(fw - 1, x0 + 1), y1 = Math.min(fh - 1, y0 + 1);
		var fx = gx - x0, fy = gy - y0;
		return field[y0 * fw + x0] * (1 - fx) * (1 - fy) + field[y0 * fw + x1] * fx * (1 - fy)
			+ field[y1 * fw + x0] * (1 - fx) * fy + field[y1 * fw + x1] * fx * fy;
	}

	function compute(state, f, t) {
		var ow = state.ow, oh = state.oh, data = state.img.data;
		var fw = state.fw, fh = state.fh, vx = state.vx, vy = state.vy;
		var drift = t * 0.03 + f.scroll * 0.0008;
		var c0 = f.colors[0], c1 = f.colors[1], c2 = f.colors[2];
		var fsx = fw / ow, fsy = fh / oh;
		var idx = 0;
		for (var y = 0; y < oh; y++) {
			var sky = y / oh;
			for (var x = 0; x < ow; x++) {
				// Advect sampling coords by the smooth flow field (amplified
				// so the smoke-like billowing is clearly visible).
				var flowx = sampleFlow(vx, fw, fh, x * fsx, y * fsy);
				var flowy = sampleFlow(vy, fw, fh, x * fsx, y * fsy);
				var sx = x - flowx * 2.2, sy = y - flowy * 2.2;

				var nx = sx * 0.022, ny = sy * 0.026;
				var warp = U.noise2(nx * 0.5 + drift, ny * 0.5) * 1.2;
				var o1 = U.noise2(nx + drift + warp, ny + warp);
				var dens = o1 * 0.56
					+ U.noise2(nx * 2.0 - drift, ny * 2.0) * 0.28
					+ U.noise2(nx * 4.1 + drift * 1.4, ny * 4.1) * 0.16;
				dens = U.clamp((dens - 0.46) * 2.6, 0, 1);
				dens *= U.clamp(0.45 + warp * 0.7, 0, 1);

				var above = U.noise2(nx + drift, ny - 0.12);
				var light = U.clamp(0.45 + (above - o1) * 1.9, 0, 1);
				var cloudCol = U.mix(U.mix(c1, c2, light), { r: 255, g: 255, b: 255 }, light * light * 0.5);
				var skyCol = U.mix(c0, c1, sky * 0.6);

				data[idx] = skyCol.r + (cloudCol.r - skyCol.r) * dens;
				data[idx + 1] = skyCol.g + (cloudCol.g - skyCol.g) * dens;
				data[idx + 2] = skyCol.b + (cloudCol.b - skyCol.b) * dens;
				data[idx + 3] = (45 + dens * 210) | 0;
				idx += 4;
			}
		}
		state.octx.putImageData(state.img, 0, 0);
	}
})();
