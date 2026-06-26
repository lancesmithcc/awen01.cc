/* UltraBGs pack: Earth — Dirt — Elemental pack by AWEN01
 * v2: solid one-colour dirt. A detailed soil texture is baked once to an
 * offscreen buffer (flat earthy tone, fine grit, crumbs, rough cracked
 * edges) and drawn straight — no dark gradients, no shading overlays. It is
 * STILL until disturbed: hovering or tapping pushes a displacement field
 * that locally shifts the texture (the dirt is shoved aside and springs
 * back), and kicks up a few dust motes. Scroll slowly pans the bed.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'earth',
		name: 'Earth — Dirt',

		init: function (state, f) {
			// High-res baked dirt texture.
			var ow = Math.round(Math.max(360, Math.min(720, 520 * f.density)));
			var oh = Math.max(220, Math.round(ow * f.h / Math.max(1, f.w)));
			state.ow = ow; state.oh = oh;
			state.off = document.createElement('canvas');
			state.off.width = ow; state.off.height = oh;
			state.octx = state.off.getContext('2d');
			bakeDirt(state, f);

			// Coarse, CHUNKY displacement grid — bigger cells so the soil
			// shoves in lumps like sand/gravel, not a smooth sheet.
			var gs = Math.max(40, Math.round(64 / f.density));
			state.gs = gs;
			state.gcols = Math.ceil(f.w / gs) + 2;
			state.grows = Math.ceil(f.h / gs) + 2;
			state.dx = new Float32Array(state.gcols * state.grows);
			state.dy = new Float32Array(state.gcols * state.grows);
			// Per-cell grain weight so chunks shove unevenly (granular feel).
			state.grain = new Float32Array(state.gcols * state.grows);
			for (var gi = 0; gi < state.grain.length; gi++) {
				state.grain[gi] = 0.5 + U.noise2((gi % state.gcols) * 1.7, (gi / state.gcols | 0) * 1.7);
			}

			var motes = [];
			for (var i = 0; i < Math.round(40 * f.density); i++) { motes.push(dead()); }
			state.motes = motes;
			state.plx = 0; state.ply = 0;
		},

		render: function (ctx, state, f) {
			var gs = state.gs, gcols = state.gcols, grows = state.grows;
			var dx = state.dx, dy = state.dy;

			// --- Push displacement from hover (along motion) and taps ---
			if (f.pointer.active) {
				var sp = Math.sqrt(f.pointer.vx * f.pointer.vx + f.pointer.vy * f.pointer.vy);
				pushField(dx, dy, gcols, grows, gs, f.pointer.x, f.pointer.y, 70,
					f.pointer.vx * 0.6, f.pointer.vy * 0.6, sp > 0.5);
				if (sp > 8) {
					for (var d = 0; d < 2; d++) { state.motes[(Math.random() * state.motes.length) | 0] = kick(f.pointer.x, f.pointer.y, sp); }
				}
			}
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				if (tap.age < 0.12) {
					// Radial shove outward from the tap point.
					pushRadial(dx, dy, gcols, grows, gs, tap.x, tap.y, 90, 26 * (1 - tap.age / 0.12));
					if (tap.age < 0.06) {
						for (var b = 0; b < 18; b++) { state.motes[(Math.random() * state.motes.length) | 0] = kick(tap.x, tap.y, 55); }
					}
				}
			}

			// --- Relax displacement back to rest. Sand piles and HOLDS
			// briefly then slumps — use a slower, slightly sticky relax. ---
			for (var i = 0; i < dx.length; i++) { dx[i] *= 0.9; dy[i] *= 0.9; }

			// --- Draw the dirt as chunky shoved lumps ---
			// Each disturbed cell is redrawn as a displaced texture patch with
			// quantized (stepped) offset so it reads as granular chunks of
			// sand piling, not a smooth rubber-sheet warp.
			var ow = state.ow, oh = state.oh;
			ctx.imageSmoothingEnabled = false; // crisp grains, no soft smear
			ctx.drawImage(state.off, 0, 0, ow, oh, 0, 0, f.w, f.h);

			var grain = state.grain;
			var quant = Math.max(4, gs * 0.18); // displacement snaps to grain steps
			for (var gy = 0; gy < grows - 1; gy++) {
				for (var gx = 0; gx < gcols - 1; gx++) {
					var ix = gy * gcols + gx;
					var gw8 = grain[ix];
					// Per-chunk weighted + quantized offset (lumpy, uneven).
					var ox = Math.round((dx[ix] * gw8) / quant) * quant;
					var oy = Math.round((dy[ix] * gw8) / quant) * quant;
					if (ox === 0 && oy === 0) { continue; } // undisturbed: still
					var px = gx * gs, py = gy * gs;
					var sxr = (px - ox) / f.w * ow;
					var syr = (py - oy) / f.h * oh;
					var sw = (gs + 3) / f.w * ow;
					var sh = (gs + 3) / f.h * oh;
					if (sxr < 0) { sxr = 0; } if (syr < 0) { syr = 0; }
					if (sxr + sw > ow) { sxr = ow - sw; } if (syr + sh > oh) { syr = oh - sh; }
					try {
						// Slight overlap (gs+3) so shoved chunks don't leave seams.
						ctx.drawImage(state.off, sxr, syr, sw, sh, px - 1, py - 1, gs + 3, gs + 3);
					} catch (e) {}
				}
			}

			// --- Dust motes (subtle, same dirt colour) ---
			for (var m = 0; m < state.motes.length; m++) {
				var mt = state.motes[m];
				if (mt.life <= 0) { continue; }
				mt.vy += 14 * f.dt; mt.vx *= 0.96; mt.vy *= 0.98;
				mt.x += mt.vx * f.dt * 60; mt.y += mt.vy * f.dt * 60;
				mt.life -= f.dt;
				ctx.fillStyle = U.rgba(state.dustCol, U.clamp(mt.life * 0.5, 0, 0.45));
				ctx.fillRect(mt.x, mt.y, mt.s, mt.s);
			}
		}
	});

	function bakeDirt(state, f) {
		var octx = state.octx, ow = state.ow, oh = state.oh;
		var img = octx.createImageData(ow, oh);
		var data = img.data;
		// One solid dirt colour with only gentle lightness variation — no
		// near-black, no bright spread. Mid tone from the palette.
		var mid = U.mix(U.mix(f.colors[0], f.colors[1], 0.5), f.colors[2], 0.35);
		state.dustCol = mid;
		var lo = U.mix(mid, { r: 0, g: 0, b: 0 }, 0.22); // only slightly darker
		var hi = U.mix(mid, { r: 255, g: 245, b: 225 }, 0.18);
		var idx = 0;
		for (var y = 0; y < oh; y++) {
			for (var x = 0; x < ow; x++) {
				var broad = U.noise2(x * 0.02, y * 0.02);
				var clump = U.noise2(x * 0.07, y * 0.07);
				var g1 = U.noise2(x * 0.6 + 3, y * 0.6 + 9);
				var grit = (g1 - 0.5) * 0.4;
				var l = U.clamp(broad * 0.5 + clump * 0.4 + grit, 0, 1);
				var col = l < 0.5 ? U.mix(lo, mid, l * 2) : U.mix(mid, hi, (l - 0.5) * 2);
				// Crumbs/grains, gentle.
				var speck = U.noise2(x * 1.1 + 13, y * 1.1 + 7);
				if (speck > 0.95) { col = U.mix(col, hi, 0.4); }
				else if (speck < 0.07) { col = U.mix(col, lo, 0.6); }
				// Rough cracked edges along clump boundaries.
				var edge = Math.abs(clump - U.noise2(x * 0.07 + 0.4, y * 0.07));
				if (edge > 0.2) { col = U.mix(col, lo, Math.min(0.4, (edge - 0.2) * 1.8)); }
				data[idx] = col.r; data[idx + 1] = col.g; data[idx + 2] = col.b; data[idx + 3] = 255;
				idx += 4;
			}
		}
		octx.putImageData(img, 0, 0);
	}

	function pushField(dx, dy, gc, gr, gs, wx, wy, rad, vx, vy, moving) {
		var cx = wx / gs, cy = wy / gs, gr2 = rad / gs;
		var x0 = Math.max(0, (cx - gr2) | 0), x1 = Math.min(gc - 1, Math.ceil(cx + gr2));
		var y0 = Math.max(0, (cy - gr2) | 0), y1 = Math.min(gr - 1, Math.ceil(cy + gr2));
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				var ddx = x - cx, ddy = y - cy;
				var fall = Math.exp(-(ddx * ddx + ddy * ddy) / (gr2 * gr2));
				var i = y * gc + x;
				// Shove along motion + a little radial spread (chunky).
				dx[i] += (vx * 0.9 + ddx * gs * 0.03) * fall;
				dy[i] += (vy * 0.9 + ddy * gs * 0.03) * fall;
			}
		}
	}
	function pushRadial(dx, dy, gc, gr, gs, wx, wy, rad, amt) {
		var cx = wx / gs, cy = wy / gs, gr2 = rad / gs;
		var x0 = Math.max(0, (cx - gr2) | 0), x1 = Math.min(gc - 1, Math.ceil(cx + gr2));
		var y0 = Math.max(0, (cy - gr2) | 0), y1 = Math.min(gr - 1, Math.ceil(cy + gr2));
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				var ddx = x - cx, ddy = y - cy;
				var d = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
				var fall = Math.exp(-(d * d) / (gr2 * gr2));
				var i = y * gc + x;
				dx[i] += (ddx / d) * amt * fall;
				dy[i] += (ddy / d) * amt * fall;
			}
		}
	}

	function dead() { return { life: 0 }; }
	function kick(x, y, power) {
		var a = Math.random() * 6.2832;
		var sp = (0.5 + Math.random()) * power * 0.05;
		return { x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - Math.random() * power * 0.03, s: 1 + Math.random() * 2, life: 0.5 + Math.random() };
	}
})();
