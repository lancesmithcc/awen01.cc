/* UltraBGs pack: Diamond Refractions — Luxury pack by AWEN01
 * Faceted gemstones scattered across the field, each refracting a slowly
 * rotating star of light with chromatic sparkle. Cursor makes nearby gems
 * blaze and rotate faster; taps fire a sparkle burst; scroll slowly turns
 * every facet.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'diamond',
		name: 'Diamond Refractions',

		init: function (state, f) {
			var n = Math.round(18 * f.density);
			var gems = [];
			for (var i = 0; i < n; i++) {
				gems.push({
					x: Math.random() * f.w, y: Math.random() * f.h,
					r: 8 + Math.random() * 26,
					seed: Math.random() * TAU,
					rot: Math.random() * TAU,
					facets: 5 + Math.floor(Math.random() * 3),
					ci: i % 3
				});
			}
			state.gems = gems;
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			ctx.globalCompositeOperation = 'lighter';

			for (var i = 0; i < state.gems.length; i++) {
				var gm = state.gems[i];

				var prox = 0;
				if (f.pointer.active) {
					var dx = gm.x - f.pointer.x, dy = gm.y - f.pointer.y;
					prox = U.smoothstep(220, 0, Math.sqrt(dx * dx + dy * dy));
				}
				var burst = 0;
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = gm.x - tap.x, tdy = gm.y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * 460;
					burst += Math.exp(-Math.pow((td - ring) / 60, 2)) * (1 - tap.age / 3);
				}
				burst = Math.min(1, burst);
				var blaze = U.clamp(prox + burst, 0, 1);

				var rot = gm.rot + (t * 0.3 + f.scroll * 0.002) * (1 + prox * 3) + gm.seed;
				var twinkle = 0.5 + 0.5 * Math.sin(t * 2 + gm.seed * 4);
				var R = gm.r * (1 + blaze * 0.3);

				// Faceted gem body.
				var col = f.colors[gm.ci];
				ctx.beginPath();
				for (var fct = 0; fct <= gm.facets; fct++) {
					var a = rot + (fct / gm.facets) * TAU;
					var rr = R * (fct % 2 ? 0.6 : 1);
					var px = gm.x + Math.cos(a) * rr, py = gm.y + Math.sin(a) * rr;
					if (fct === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
				}
				ctx.closePath();
				ctx.fillStyle = U.rgba(U.mix(col, WHITE, 0.2 + blaze * 0.3), 0.12 + blaze * 0.2);
				ctx.fill();
				ctx.strokeStyle = U.rgba(U.mix(col, WHITE, 0.5), 0.2 + blaze * 0.4);
				ctx.lineWidth = 1;
				ctx.stroke();

				// Refraction star: rotating light spikes with chroma.
				var spikes = 4;
				var len = R * (1.6 + twinkle * 0.8 + blaze * 2);
                ctx.lineWidth = 1 + blaze;
				for (var sp = 0; sp < spikes; sp++) {
					var sa = rot * 1.5 + (sp / spikes) * TAU;
					var sCol = U.mix(f.colors[sp % 3], WHITE, 0.5);
					ctx.beginPath();
					ctx.moveTo(gm.x, gm.y);
					ctx.lineTo(gm.x + Math.cos(sa) * len, gm.y + Math.sin(sa) * len);
					ctx.strokeStyle = U.rgba(sCol, (0.1 + twinkle * 0.15 + blaze * 0.4));
					ctx.stroke();
				}

				// Core sparkle.
				ctx.beginPath();
				ctx.arc(gm.x, gm.y, 1.5 + blaze * 3 + twinkle * 1.5, 0, TAU);
				ctx.fillStyle = U.rgba(WHITE, 0.4 + blaze * 0.5);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
	});
})();
