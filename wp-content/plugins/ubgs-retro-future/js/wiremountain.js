/* UltraBGs pack: Wireframe Mountains — Retro Future pack by AWEN01
 * v2: highly reactive neon terrain. Flying over ridgelines that rush toward
 * you; the whole range banks and parallaxes with the cursor, a glowing
 * cursor spotlight lifts and brightens peaks beneath your hand, swipes shear
 * the range sideways, taps blast quakes that ripple through every ridge,
 * and scroll throttles the flight speed (with velocity kick).
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'wiremountain',
		name: 'Wireframe Mountains',

		init: function (state, f) {
			state.cols = Math.round(40 * f.density);
			state.rows = 20;
			state.drive = 0;
			state.bank = 0;
			state.shear = 0;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var rows = state.rows, cols = state.cols;

			// Cursor banks the camera: horizontal tilts the horizon, vertical
			// raises/lowers it. Smoothed for a flowing camera feel.
			var targetBank = f.pointer.active ? (f.pointer.x / f.w - 0.5) : 0;
			var targetHoriz = 0.32 + (f.pointer.active ? (f.pointer.y / f.h - 0.5) * 0.16 : 0);
			state.bank = U.lerp(state.bank, targetBank, 0.05);
			var horizon = f.h * targetHoriz;

			// Swipe shear: pointer velocity slides the range; eases back.
			state.shear = U.lerp(state.shear, f.pointer.active ? f.pointer.vx * 0.6 : 0, 0.08);

			// Scroll throttles flight, with a velocity kick.
			state.drive += (0.6 + Math.abs(f.scrollVel) * 0.05) * f.dt * f.speed;
			var drive = state.drive;

			// Cursor spotlight radius for peak lift / glow.
			ctx.lineCap = 'round';

			for (var r = rows - 1; r >= 0; r--) {
				var u = (r + (drive % 1)) / rows;     // 0 far ... 1 near
				var pu = u * u;
				var y0 = horizon + pu * (f.h - horizon + 50);
				var worldRow = Math.floor(drive) + r;
				var bankShift = state.bank * (1 - u) * f.w * 0.5; // distant banks more

				// Build the ridge polyline. Sample from well past the left
				// edge to well past the right so the line always exits
				// off-screen — never a visible drop at the sides.
				var pts = [];
				var peakProx = 0;
				var overscan = 0.25; // 25% past each edge
				for (var c = 0; c <= cols; c++) {
					var nx = -overscan + (c / cols) * (1 + overscan * 2);
					var x = nx * f.w + bankShift + state.shear * (1 - u);

					var ridge = U.noise2(c * 0.35, worldRow * 0.7) * (f.h * 0.24) * (0.3 + u);
					ridge += U.noise2(c * 0.9, worldRow * 0.5) * (f.h * 0.08) * u; // fine detail
					var y = y0 - ridge;

					// Cursor spotlight: lift peaks under the hand.
					if (f.pointer.active) {
						var dx = x - f.pointer.x, dy = y - f.pointer.y;
						var lift = U.smoothstep(220, 0, Math.sqrt(dx * dx + dy * dy));
						y -= lift * 70 * u;
						peakProx = Math.max(peakProx, lift);
					}
					// Tap quakes ripple through ridges.
					for (var k = 0; k < f.taps.length; k++) {
						var tap = f.taps[k];
						var tdx = x - tap.x, tdy = y - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 520;
						y -= Math.exp(-Math.pow((td - ring) / 64, 2)) * (1 - tap.age / 3) * 52 * u;
					}
					pts.push(x, y);
				}

				// Occlusion fill: down a bounded band so ridgelines behind
				// (drawn earlier, higher up) stay visible above each fill.
				// The frontmost row fills all the way to the screen bottom so
				// everything beneath the nearest mountain is solid dark.
				var fillDepth = (f.h - horizon) / rows * 3.0 + 40;
				var bottomY = (r === 0) ? f.h + 40 : Math.min(f.h + 40,
					Math.max.apply(null, [pts[1], pts[pts.length - 1]]) + fillDepth);
				ctx.beginPath();
				ctx.moveTo(pts[0] - 40, pts[1]);
				for (var pi = 0; pi < pts.length; pi += 2) { ctx.lineTo(pts[pi], pts[pi + 1]); }
				ctx.lineTo(pts[pts.length - 2] + 40, pts[pts.length - 1]);
				ctx.lineTo(pts[pts.length - 2] + 40, bottomY);
				ctx.lineTo(pts[0] - 40, bottomY);
				ctx.closePath();
				ctx.fillStyle = 'rgba(5,6,14,' + (0.62 + u * 0.32) + ')';
				ctx.fill();

				// Neon ridgeline.
				ctx.beginPath();
				ctx.moveTo(pts[0] - 40, pts[1]);
				for (var pj = 0; pj < pts.length; pj += 2) { ctx.lineTo(pts[pj], pts[pj + 1]); }
				ctx.lineTo(pts[pts.length - 2] + 40, pts[pts.length - 1]);

				var col = U.mix(f.colors[0], f.colors[1], u);
				if (peakProx > 0.01) { col = U.mix(col, WHITE, peakProx * 0.6); }
				// Tap flash brightens whole ridgelines momentarily.
				var flash = 0;
				for (var k2 = 0; k2 < f.taps.length; k2++) { flash += Math.exp(-f.taps[k2].age * 4) * 0.4; }
				if (flash > 0.01) { col = U.mix(col, f.colors[2], Math.min(0.5, flash)); }

				ctx.strokeStyle = U.rgba(col, 0.22 + u * 0.7 + peakProx * 0.2);
				ctx.lineWidth = 1 + u * 2 + peakProx * 1.5;
				ctx.stroke();
			}

			// Neon horizon glow band, banking with the camera.
			ctx.globalCompositeOperation = 'lighter';
			var hg = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 30);
			hg.addColorStop(0, U.rgba(f.colors[1], 0));
			hg.addColorStop(0.5, U.rgba(f.colors[1], 0.18));
			hg.addColorStop(1, U.rgba(f.colors[1], 0));
			ctx.fillStyle = hg;
			ctx.fillRect(0, horizon - 30, f.w, 60);
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
