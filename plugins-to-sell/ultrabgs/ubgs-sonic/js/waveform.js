/* UltraBGs pack: Waveform — Sonic pack by AWEN01
 * Layered oscilloscope traces. A synthetic signal (summed sines + noise)
 * scrolls horizontally; its amplitude is driven by an "audio energy" value
 * fed by cursor speed, scroll velocity and taps — so the trace is calm when
 * idle and roars when you move. Cursor height biases the waveform; taps fire
 * transient spikes that travel outward; scroll shifts the signal phase.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'waveform',
		name: 'Waveform',

		init: function (state, f) {
			state.energy = 0.12;
			state.traces = Math.max(2, Math.round(3 * f.density));
			state.step = Math.max(3, Math.round(5 / f.density));
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var step = state.step;
			var mid = f.h * 0.5;

			// Audio energy from interaction, smoothed (attack/decay).
			var pSpeed = Math.sqrt(f.pointer.vx * f.pointer.vx + f.pointer.vy * f.pointer.vy);
			var drive = U.clamp(pSpeed / 24, 0, 1) + U.clamp(Math.abs(f.scrollVel) / 50, 0, 0.7);
			for (var k = 0; k < f.taps.length; k++) { drive += Math.exp(-f.taps[k].age * 3) * 0.8; }
			state.energy = U.lerp(state.energy, 0.12 + drive, drive > state.energy ? 0.4 : 0.05);
			var energy = state.energy;

			var bias = f.pointer.active ? (f.pointer.y / f.h - 0.5) * f.h * 0.3 : 0;
			var phase = t * 4 + f.scroll * 0.01;

			ctx.globalCompositeOperation = 'lighter';
			ctx.lineJoin = 'round';

			for (var tr = 0; tr < state.traces; tr++) {
				var tv = tr / (state.traces - 1 || 1);
				var col = U.mix(f.colors[0], f.colors[1], tv);
				var amp = f.h * (0.06 + 0.22 * energy) * (1 - tv * 0.4);
				var freq = 0.008 + tv * 0.006;
				var off = tr * 1.7;

				ctx.beginPath();
				for (var x = 0; x <= f.w; x += step) {
					var s = Math.sin(x * freq + phase + off) * 0.6
						+ Math.sin(x * freq * 2.3 - phase * 1.4 + off) * 0.3
						+ (U.noise2(x * 0.01 + tr, t * 0.5) - 0.5) * 0.5 * energy;

					// Tap transients: sharp local spikes riding outward.
					for (var ti = 0; ti < f.taps.length; ti++) {
						var tap = f.taps[ti];
						var ring = tap.age * 700;
						var d = Math.abs(x - tap.x);
						s += Math.exp(-Math.pow((d - ring) / 30, 2)) * (1 - tap.age / 3) * 1.6 * Math.sin(x * 0.4 + t * 30);
					}

					var y = mid + bias + s * amp;
					if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
				}
				ctx.strokeStyle = U.rgba(col, 0.3 + energy * 0.4);
				ctx.lineWidth = 1.2 + (1 - tv) * 1.4 + energy * 1.2;
				ctx.stroke();

				// Soft glow underlay on the loudest trace.
				if (tr === 0) {
					ctx.strokeStyle = U.rgba(U.mix(col, WHITE, 0.3), 0.12 + energy * 0.2);
					ctx.lineWidth = 6 + energy * 8;
					ctx.stroke();
				}
			}

			// Center reference line.
			ctx.strokeStyle = U.rgba(f.colors[2], 0.12);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, mid + bias);
			ctx.lineTo(f.w, mid + bias);
			ctx.stroke();

			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
