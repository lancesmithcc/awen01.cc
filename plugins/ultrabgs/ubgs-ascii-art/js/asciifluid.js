/* UltraBGs pack: ASCII Fluid — ASCII Art pack by AWEN01
 * A lightweight fluid: a coarse velocity + density grid where the cursor
 * injects flow and dye, density advects and diffuses, and the field is
 * rendered as glyphs (dense -> bright). Taps inject radial bursts; scroll
 * adds a steady current; the dye drifts and dissipates organically.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 240, g: 248, b: 255 };
	var RAMP = ' .:-=+*oe%#@'.split('');

	window.UltraBGs.registerPack({
		id: 'asciifluid',
		name: 'ASCII Fluid',

		init: function (state, f) {
			var cell = Math.max(12, Math.round(18 / f.density));
			state.cell = cell;
			var gw = Math.ceil(f.w / cell) + 1;
			var gh = Math.ceil(f.h / cell) + 1;
			state.gw = gw; state.gh = gh;
			state.dens = new Float32Array(gw * gh);
			state.vx = new Float32Array(gw * gh);
			state.vy = new Float32Array(gw * gh);
			state.tmp = new Float32Array(gw * gh);
			state.font = cell + 'px monospace';
			state.plx = 0; state.ply = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var cell = state.cell, gw = state.gw, gh = state.gh;
			var dens = state.dens, vx = state.vx, vy = state.vy, tmp = state.tmp;

			// --- Inject from cursor: dye + velocity along motion ---
			if (f.pointer.active) {
				var gx = f.pointer.x / cell, gy = f.pointer.y / cell;
				var mvx = (f.pointer.x - state.plx), mvy = (f.pointer.y - state.ply);
				stamp(dens, vx, vy, gw, gh, gx, gy, 2.2, mvx * 0.6, mvy * 0.6, 1.1);
				state.plx = f.pointer.x; state.ply = f.pointer.y;
			} else {
				state.plx = f.pointer.x; state.ply = f.pointer.y;
			}

			// --- Tap bursts: radial velocity + dye ---
			for (var tk = 0; tk < f.taps.length; tk++) {
				var tap = f.taps[tk];
				if (tap.age > 0.2) { continue; } // inject only at birth
				var bx = tap.x / cell, by = tap.y / cell;
				for (var a = 0; a < 12; a++) {
					var ang = (a / 12) * 6.2832;
					stamp(dens, vx, vy, gw, gh, bx + Math.cos(ang) * 1.5, by + Math.sin(ang) * 1.5,
						1.4, Math.cos(ang) * 60, Math.sin(ang) * 60, 0.9);
				}
			}

			// --- Scroll current: steady push ---
			var current = f.scrollVel * 0.05;

			// --- Advect density along velocity (semi-Lagrangian) ---
			var dt = Math.min(0.05, f.dt) * 8 * f.speed;
			for (var y = 0; y < gh; y++) {
				for (var x = 0; x < gw; x++) {
					var i = y * gw + x;
					var sx = x - (vx[i]) * dt * 0.06;
					var sy = y - (vy[i] + current) * dt * 0.06;
					tmp[i] = sample(dens, gw, gh, sx, sy) * 0.985; // dissipate
				}
			}
			dens.set(tmp);

			// --- Diffuse velocity a touch + damp ---
			for (var i2 = 0; i2 < vx.length; i2++) {
				vx[i2] *= 0.94;
				vy[i2] *= 0.94;
			}

			// --- Ambient drift so an idle field still breathes ---
			var amb = 0.04;

			// --- Render glyphs ---
			ctx.font = state.font;
			ctx.textBaseline = 'top';
			for (var ry = 0; ry < gh; ry++) {
				for (var rx = 0; rx < gw; rx++) {
					var idx = ry * gw + rx;
					var d = dens[idx] + amb * (U.noise2(rx * 0.3 + t * 0.2, ry * 0.3) - 0.3);
					var bright = U.clamp(d, 0, 1);
					var ri = Math.floor(bright * (RAMP.length - 1));
					if (ri <= 0) { continue; }
					var ch = RAMP[ri];

					// Color by speed: faster flow shifts toward the hot color.
					var spd = Math.min(1, (Math.abs(vx[idx]) + Math.abs(vy[idx])) * 0.02);
					var col = U.mix(f.colors[0], f.colors[1], bright);
					col = U.mix(col, f.colors[2], spd * 0.6);
					if (bright > 0.8) { col = U.mix(col, WHITE, (bright - 0.8) * 3); }

					ctx.fillStyle = U.rgba(col, 0.25 + bright * 0.6);
					ctx.fillText(ch, rx * cell, ry * cell);
				}
			}
		}
	});

	function stamp(dens, vx, vy, gw, gh, gx, gy, rad, ivx, ivy, amt) {
		var x0 = Math.max(0, Math.floor(gx - rad)), x1 = Math.min(gw - 1, Math.ceil(gx + rad));
		var y0 = Math.max(0, Math.floor(gy - rad)), y1 = Math.min(gh - 1, Math.ceil(gy + rad));
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				var dx = x - gx, dy = y - gy;
				var falloff = Math.exp(-(dx * dx + dy * dy) / (rad * rad));
				var i = y * gw + x;
				dens[i] = Math.min(1.4, dens[i] + falloff * amt);
				vx[i] += ivx * falloff;
				vy[i] += ivy * falloff;
			}
		}
	}

	function sample(field, gw, gh, x, y) {
		if (x < 0) { x = 0; } else if (x > gw - 1) { x = gw - 1; }
		if (y < 0) { y = 0; } else if (y > gh - 1) { y = gh - 1; }
		var x0 = x | 0, y0 = y | 0;
		var x1 = Math.min(gw - 1, x0 + 1), y1 = Math.min(gh - 1, y0 + 1);
		var fx = x - x0, fy = y - y0;
		var a = field[y0 * gw + x0], b = field[y0 * gw + x1];
		var c = field[y1 * gw + x0], d = field[y1 * gw + x1];
		return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
	}
})();
