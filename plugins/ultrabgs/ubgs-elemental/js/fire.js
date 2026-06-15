/* UltraBGs pack: Fire — Flame — Elemental pack by AWEN01
 * v3: realistic licking flame, no cursor-follow. A high-res heat buffer is
 * seeded only along the base (flickering fuel) and propagated with a wide
 * weighted-neighborhood convection blur + fractional turbulent wind, then
 * mapped through a black-body palette and bilinear-upscaled (no pixelation).
 * The cursor does NOT draw fire — moving through the flame only DISTURBS it:
 * a smooth velocity field, fed by pointer motion, laterally shears the rising
 * heat where you pass (like waving a hand through a candle). Taps puff a gust
 * + embers. Scroll raises the fuel line.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'fire',
		name: 'Fire — Flame',

		init: function (state, f) {
			var gw = Math.round(Math.max(200, Math.min(380, 280 * f.density)));
			var gh = Math.max(130, Math.round(gw * f.h / Math.max(1, f.w)));
			state.gw = gw; state.gh = gh;
			state.heat = new Float32Array(gw * gh);
			state.heat2 = new Float32Array(gw * gh);
			// Disturbance flow (horizontal shear of rising heat), per cell.
			state.flow = new Float32Array(gw * gh);
			state.off = document.createElement('canvas');
			state.off.width = gw; state.off.height = gh;
			state.octx = state.off.getContext('2d');
			state.img = state.octx.createImageData(gw, gh);
			state.embers = [];
			state.pal = buildPalette(f);
			state.plx = 0; state.ply = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var gw = state.gw, gh = state.gh, heat = state.heat, flow = state.flow;

			// --- Seed flickering fuel along the base (scroll raises it) ---
			var fuelRow = gh - 1 - (Math.max(0, Math.round(f.scroll * 0.02)) % ((gh / 2) | 0 || 1));
			for (var x = 0; x < gw; x++) {
				// Layered flicker: broad gusts + fine sputter for a live base.
				var flick = U.noise2(x * 0.12, t * 3) * 0.5 + U.noise2(x * 0.5, t * 9) * 0.3 + 0.3;
				var i0 = fuelRow * gw + x;
				heat[i0] = Math.min(1.2, flick);
				if (fuelRow + 1 < gh) { heat[(fuelRow + 1) * gw + x] = Math.min(1.2, flick * 1.05); }
			}

			// --- Disturbance: pointer motion feeds a horizontal shear flow.
			// NO heat is injected at the cursor — we only perturb existing
			// flame. Hovering through it pushes the rising heat sideways. ---
			if (f.pointer.active) {
				var mvx = f.pointer.x - state.plx;
				var gx = (f.pointer.x / f.w * gw) | 0;
				var gy = (f.pointer.y / f.h * gh) | 0;
				var rad = 5;
				for (var yy = -rad; yy <= rad; yy++) {
					for (var xx = -rad; xx <= rad; xx++) {
						var hx = gx + xx, hy = gy + yy;
						if (hx < 0 || hx >= gw || hy < 0 || hy >= gh) { continue; }
						var fall = Math.exp(-(xx * xx + yy * yy) / (rad * rad));
						// Shear strength from horizontal motion + a vertical
						// "wake" suck so flame bends toward where you passed.
						flow[hy * gw + hx] += (mvx * 0.5) * fall;
					}
				}
				state.plx = f.pointer.x; state.ply = f.pointer.y;
			} else { state.plx = f.pointer.x; state.ply = f.pointer.y; }

			// --- Taps: a gust (disturbance) + embers, still no drawn fire ---
			for (var k = 0; k < f.taps.length; k++) {
				var tap = f.taps[k];
				if (tap.age < 0.08) {
					var tx = (tap.x / f.w * gw) | 0, ty = (tap.y / f.h * gh) | 0;
					for (var yy2 = -6; yy2 <= 6; yy2++) {
						for (var xx2 = -6; xx2 <= 6; xx2++) {
							var fx = tx + xx2, fy = ty + yy2;
							if (fx < 0 || fx >= gw || fy < 0 || fy >= gh) { continue; }
							var d2 = xx2 * xx2 + yy2 * yy2;
							flow[fy * gw + fx] += (xx2 > 0 ? 1 : -1) * Math.exp(-d2 / 18) * 6;
						}
					}
					for (var e = 0; e < 22; e++) {
						state.embers.push({ x: tap.x, y: tap.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 6 - 2, life: 0.8 + Math.random() });
					}
				}
			}

			// Decay the disturbance flow so flame settles back.
			for (var di = 0; di < flow.length; di++) { flow[di] *= 0.9; }

			// --- Propagate heat: rise + wide weighted convection blur +
			// turbulent fractional wind, plus the disturbance shear. Smooth,
			// licking tongues, no blocky columns. ---
			var heat2 = state.heat2;
			for (var y = 0; y < gh - 1; y++) {
				var rowBelow = (y + 1) * gw;
				// Base turbulent wind drifts the whole flame gently.
				var baseWind = (U.noise2(y * 0.05, t * 0.6) - 0.5) * 1.4;
				for (var x2 = 0; x2 < gw; x2++) {
					var shear = flow[y * gw + x2];
					var fxs = x2 + baseWind + shear;
					var xi = Math.floor(fxs);
					var fr = fxs - xi;
					var aa = heat[rowBelow + (((xi % gw) + gw) % gw)];
					var bb = heat[rowBelow + ((((xi + 1) % gw) + gw) % gw)];
					var center = aa + (bb - aa) * fr;
					var l1 = heat[rowBelow + ((x2 - 1 + gw) % gw)];
					var r1 = heat[rowBelow + ((x2 + 1) % gw)];
					var l2 = heat[rowBelow + ((x2 - 2 + gw) % gw)];
					var r2 = heat[rowBelow + ((x2 + 2) % gw)];
					var below = center * 0.5 + (l1 + r1) * 0.17 + (l2 + r2) * 0.08;
					var decay = 0.010 + Math.random() * 0.045;
					heat2[y * gw + x2] = Math.max(0, below - decay);
				}
			}
			// Keep the fuel rows for next frame; copy propagated heat up.
			for (var cy = 0; cy < gh - 1; cy++) {
				for (var cx = 0; cx < gw; cx++) { heat[cy * gw + cx] = heat2[cy * gw + cx]; }
			}

			// --- Map heat -> fire palette ---
			var data = state.img.data, pal = state.pal, idx = 0;
			for (var yp = 0; yp < gh; yp++) {
				for (var xp = 0; xp < gw; xp++) {
					var hh = heat[yp * gw + xp];
					var pi = (U.clamp(hh, 0, 1) * 255) | 0;
					var p = pal[pi];
					data[idx] = p[0]; data[idx + 1] = p[1]; data[idx + 2] = p[2]; data[idx + 3] = p[3];
					idx += 4;
				}
			}
			state.octx.putImageData(state.img, 0, 0);
			ctx.imageSmoothingEnabled = true; // bilinear upscale -> no pixelation
			ctx.drawImage(state.off, 0, 0, gw, gh, 0, 0, f.w, f.h);

			// --- Embers ---
			ctx.globalCompositeOperation = 'lighter';
			for (var i = state.embers.length - 1; i >= 0; i--) {
				var em = state.embers[i];
				em.vy += 6 * f.dt; em.x += em.vx; em.y += em.vy; em.life -= f.dt;
				if (em.life <= 0) { state.embers.splice(i, 1); continue; }
				ctx.fillStyle = U.rgba(U.mix(f.colors[2], { r: 255, g: 230, b: 150 }, 0.5), U.clamp(em.life, 0, 1) * 0.8);
				var s = 1 + em.life * 2;
				ctx.fillRect(em.x, em.y, s, s);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});

	function buildPalette(f) {
		var pal = [];
		var stops = [
			[0.0, { r: 0, g: 0, b: 0 }, 0],
			[0.12, U.mix(f.colors[0], { r: 0, g: 0, b: 0 }, 0.3), 80],
			[0.32, f.colors[0], 180],
			[0.55, f.colors[1], 235],
			[0.8, f.colors[2], 255],
			[1.0, { r: 255, g: 252, b: 225 }, 255]
		];
		for (var i = 0; i <= 255; i++) {
			var v = i / 255;
			var a = stops[0], b = stops[stops.length - 1];
			for (var s = 0; s < stops.length - 1; s++) {
				if (v >= stops[s][0] && v <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
			}
			var span = (b[0] - a[0]) || 1;
			var u = (v - a[0]) / span;
			pal.push([
				Math.round(a[1].r + (b[1].r - a[1].r) * u),
				Math.round(a[1].g + (b[1].g - a[1].g) * u),
				Math.round(a[1].b + (b[1].b - a[1].b) * u),
				Math.round(a[2] + (b[2] - a[2]) * u)
			]);
		}
		return pal;
	}
})();
