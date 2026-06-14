/* UltraBGs pack: Hexagonal Cubes — by AWEN01 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;

	window.UltraBGs.registerPack({
		id: 'hexcubes',
		name: 'Hexagonal Cubes',

		init: function (state, f) {
			state.size = Math.max(26, 52 / f.density); // hex "radius"
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var s = state.size;
			var hw = s * 0.8660254; // half hex width (sqrt(3)/2)
			var rowH = s * 1.5;
			var cols = Math.ceil(f.w / (hw * 2)) + 2;
			var rows = Math.ceil(f.h / rowH) + 3;
			var scrollPhase = f.scroll * 0.01;

			var top = f.colors[1], left = f.colors[0], right = f.colors[2] || f.colors[0];
			var white = { r: 255, g: 255, b: 255 };

			// Back-to-front so lifted cubes overlap naturally.
			for (var r = -1; r < rows; r++) {
				for (var c = -1; c < cols; c++) {
					var x = c * hw * 2 + ((r % 2 + 2) % 2) * hw;
					var y = r * rowH;

					// Unison breathing wave across the grid.
					var wave = Math.sin(t * 1.2 - (x + y) * 0.012 + scrollPhase) * 0.5 + 0.5;
					var lift = wave * s * 0.16;

					// Cursor proximity raises cubes toward the pointer.
					var prox = 0;
					if (f.pointer.active) {
						var dx = x - f.pointer.x, dy = y - f.pointer.y;
						prox = U.smoothstep(230, 0, Math.sqrt(dx * dx + dy * dy));
						lift += prox * s * 0.55;
					}

					// Tap ripples roll a lift-ring outward.
					var ripple = 0;
					for (var k = 0; k < f.taps.length; k++) {
						var tap = f.taps[k];
						var tdx = x - tap.x, tdy = y - tap.y;
						var td = Math.sqrt(tdx * tdx + tdy * tdy);
						var ring = tap.age * 400;
						ripple += Math.exp(-Math.pow((td - ring) / 80, 2)) * (1 - tap.age / 3);
					}
					lift += Math.min(1, ripple) * s * 0.5;

					var glow = U.clamp(prox * 0.5 + ripple * 0.4 + wave * 0.12, 0, 0.7);
					drawCube(ctx, x, y - lift, s,
						U.mix(top, white, glow),
						U.mix(left, white, glow * 0.6),
						U.mix(right, white, glow * 0.6));
				}
			}
		}
	});

	function drawCube(ctx, x, y, s, top, left, right) {
		var hw = s * 0.8660254, hh = s * 0.5;

		// Top rhombus.
		ctx.beginPath();
		ctx.moveTo(x, y - s);
		ctx.lineTo(x + hw, y - hh);
		ctx.lineTo(x, y);
		ctx.lineTo(x - hw, y - hh);
		ctx.closePath();
		ctx.fillStyle = U.rgba(top, 1);
		ctx.fill();

		// Left face.
		ctx.beginPath();
		ctx.moveTo(x - hw, y - hh);
		ctx.lineTo(x, y);
		ctx.lineTo(x, y + s);
		ctx.lineTo(x - hw, y + hh);
		ctx.closePath();
		ctx.fillStyle = U.rgba(left, 1);
		ctx.fill();

		// Right face.
		ctx.beginPath();
		ctx.moveTo(x + hw, y - hh);
		ctx.lineTo(x, y);
		ctx.lineTo(x, y + s);
		ctx.lineTo(x + hw, y + hh);
		ctx.closePath();
		ctx.fillStyle = U.rgba(right, 1);
		ctx.fill();
	}
})();
