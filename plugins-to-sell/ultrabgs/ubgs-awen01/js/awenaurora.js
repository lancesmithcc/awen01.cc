/* UltraBGs pack: AWEN01 Smooth Aurora — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'awenaurora',
		name: 'AWEN01 Smooth Aurora',

		init: function (state, f) {
			state.ribbonCount = Math.max(4, Math.round(5 * f.density));
			state.samples = Math.max(64, Math.round(96 * f.density));
			state.loopSeconds = 36;
			state.react = 0;
			state.sway = 0;
			state.lift = 0;
			state.ribbons = [];
			for (var i = 0; i < state.ribbonCount; i++) {
				var seed = i * 19.37 + U.noise2(i * 2.1, i * 4.7) * 30;
				state.ribbons.push({
					seed: seed,
					offset: U.noise2(seed, i + 5.1) * Math.PI * 2,
					spread: 0.78 + U.noise2(seed, 11.3) * 0.55,
					tilt: -0.08 + U.noise2(seed, 21.9) * 0.16,
					waves: [
						{ amp: 0.52, freq: 1 + (i % 3), phase: U.noise2(seed, 31.7) * Math.PI * 2 },
						{ amp: 0.34, freq: 2 + (i % 4), phase: U.noise2(seed, 41.7) * Math.PI * 2 },
						{ amp: 0.22, freq: 3 + (i % 5), phase: U.noise2(seed, 51.7) * Math.PI * 2 }
					]
				});
			}
		},

		render: function (ctx, state, f) {
			var loop = state.loopSeconds || 36;
			var phase = ((f.t * f.speed) % loop) / loop;
			var theta = phase * Math.PI * 2;
			var ease = 1 - Math.pow(0.0008, Math.max(0.001, f.dt));
			var colors = f.colors.length ? f.colors : [
				{ r: 54, g: 214, b: 199 },
				{ r: 169, g: 139, b: 255 },
				{ r: 107, g: 156, b: 255 }
			];
			var pointerX = U.clamp(f.pointer.x / Math.max(1, f.w), 0, 1);
			var pointerY = U.clamp(f.pointer.y / Math.max(1, f.h), 0, 1);
			var targetReact = f.pointer.active ? 1 : 0;
			var targetSway = f.pointer.active ? (pointerX - 0.5) * 0.36 : 0;
			var targetLift = f.pointer.active ? (1 - pointerY) * 0.32 : 0;
			state.react = U.lerp(state.react || 0, targetReact, ease * 0.55);
			state.sway = U.lerp(state.sway || 0, targetSway, ease * 0.5);
			state.lift = U.lerp(state.lift || 0, targetLift, ease * 0.45);
			var hover = 1 + state.react * 0.42;
			var sky = ctx.createLinearGradient(0, 0, 0, f.h);
			sky.addColorStop(0, U.rgba(colors[1 % colors.length], 0.045 * hover));
			sky.addColorStop(0.38, U.rgba(colors[0], 0.025 * hover));
			sky.addColorStop(1, 'rgba(2,6,7,0.12)');
			ctx.fillStyle = sky;
			ctx.fillRect(0, 0, f.w, f.h);

			ctx.save();
			ctx.globalCompositeOperation = 'screen';
			ctx.filter = 'blur(13px)';

			for (var r = 0; r < state.ribbonCount; r++) {
				var ribbon = state.ribbons[r];
				var color = colors[r % colors.length];
				var yBase = f.h * (0.14 + r * 0.11 + Math.sin(theta * (1 + (r % 2)) + ribbon.offset) * 0.018);
				var amp = f.h * (0.105 + r * 0.014) * ribbon.spread;
				var depth = f.h * (0.24 + r * 0.03 + state.lift * 0.16);
				var alpha = (0.075 + r * 0.016 + state.lift * 0.1) * (f.opacity || 0.85);

				var grad = ctx.createLinearGradient(0, yBase - depth * 0.4, 0, yBase + depth);
				grad.addColorStop(0, U.rgba(color, 0));
				grad.addColorStop(0.28, U.rgba(color, alpha * 0.68 * hover));
				grad.addColorStop(0.5, U.rgba(color, alpha * 2.1 * hover));
				grad.addColorStop(0.68, U.rgba(color, alpha * 0.9 * hover));
				grad.addColorStop(1, U.rgba(color, 0));
				ctx.fillStyle = grad;

				ctx.beginPath();
				for (var i = 0; i <= state.samples; i++) {
					var x = (i / state.samples) * f.w;
					var nx = i / state.samples;
					var wave = 0;
					for (var wi = 0; wi < ribbon.waves.length; wi++) {
						var w = ribbon.waves[wi];
						wave += Math.sin(nx * Math.PI * 2 * w.freq + theta * (wi + 1) + w.phase) * w.amp;
					}
					var y = yBase
						+ wave * amp * 0.54
						+ Math.sin(nx * Math.PI * 2 + theta * 2 + ribbon.offset) * amp * 0.14
						+ state.sway * (nx - 0.5) * f.h
						+ ribbon.tilt * (nx - 0.5) * f.h;
					if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
				}
				for (var j = state.samples; j >= 0; j--) {
					var bx = (j / state.samples) * f.w;
					var bnx = j / state.samples;
					var lower = 0.5 + Math.sin(bnx * Math.PI * 4 + theta * 2 + ribbon.offset) * 0.08;
					var by = yBase + depth * lower
						+ Math.sin(bnx * Math.PI * 2 + theta + r) * amp * 0.12
						+ state.sway * (bnx - 0.5) * f.h
						+ ribbon.tilt * (bnx - 0.5) * f.h;
					ctx.lineTo(bx, by);
				}
				ctx.closePath();
				ctx.fill();
			}

			ctx.filter = 'blur(30px)';
			for (var g = 0; g < 3; g++) {
				var c = colors[(g + 1) % colors.length];
				var gx = f.w * (0.18 + g * 0.29 + Math.sin(theta * (g + 1) + g) * 0.025);
				var gy = f.h * (0.17 + Math.cos(theta * (g + 2) + g) * 0.045);
				var glow = ctx.createRadialGradient(gx, gy, 0, gx, gy + f.h * 0.04, f.w * 0.34);
				glow.addColorStop(0, U.rgba(c, 0.095 * hover));
				glow.addColorStop(1, U.rgba(c, 0));
				ctx.fillStyle = glow;
				ctx.fillRect(0, 0, f.w, f.h);
			}

			ctx.restore();
		}
	});
})();
