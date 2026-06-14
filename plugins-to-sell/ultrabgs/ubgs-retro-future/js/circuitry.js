/* UltraBGs pack: Microchip Circuitry — Retro Future pack by AWEN01
 * v4: doubly complex. A fine grid is flood-routed into a dense, non-crossing
 * copper labyrinth from many chip packages of varied size; a SECOND finer
 * detail layer of short rectilinear stubs and via clusters fills the gaps,
 * and chips carry internal sub-blocks. Data pulses run the long nets. Cursor
 * energizes the region it hovers, taps surge power in rings, scroll shifts
 * the clock phase. Trunk-shared nets keep it real-time.
 */
(function () {
	'use strict';
	var U = window.UltraBGs.utils;
	var TAU = 6.2832;
	var WHITE = { r: 255, g: 255, b: 255 };

	window.UltraBGs.registerPack({
		id: 'circuitry',
		name: 'Microchip Circuitry',

		init: function (state, f) {
			var g = Math.max(11, 16 / f.density);          // finer grid
			var cols = Math.floor(f.w / g);
			var rows = Math.floor(f.h / g);
			state.g = g; state.cols = cols; state.rows = rows;

			var occ = new Uint8Array(cols * rows);
			var parent = new Int32Array(cols * rows).fill(-1);
			function id(x, y) { return y * cols + x; }
			function inb(x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; }

			// Many chip packages, varied sizes.
			var chips = [];
			var nChips = 4 + Math.round(f.density * 4);
			var attempts = 0;
			while (chips.length < nChips && attempts++ < 140) {
				var cw = 3 + Math.floor(U.noise2(attempts * 1.3, 7) * 7);
				var chh = 3 + Math.floor(U.noise2(9, attempts * 1.7) * 6);
				var cxp = 2 + Math.floor(Math.random() * (cols - cw - 4));
				var cyp = 2 + Math.floor(Math.random() * (rows - chh - 4));
				var clash = false;
				for (var qy = cyp - 2; qy <= cyp + chh + 2 && !clash; qy++) {
					for (var qx = cxp - 2; qx <= cxp + cw + 2; qx++) {
						if (inb(qx, qy) && occ[id(qx, qy)]) { clash = true; break; }
					}
				}
				if (clash) { continue; }
				for (var yy = cyp; yy < cyp + chh; yy++) {
					for (var xx = cxp; xx < cxp + cw; xx++) { occ[id(xx, yy)] = 2; }
				}
				chips.push({ x: cxp, y: cyp, w: cw, h: chh, seed: Math.random() * TAU });
			}

			// Routing wavefront from chip pins.
			var frontier = [];
			var pinList = [];
			function seed(x, y) {
				if (!inb(x, y) || occ[id(x, y)]) { return; }
				occ[id(x, y)] = 1; parent[id(x, y)] = -2;
				frontier.push([x, y]); pinList.push([x, y]);
			}
			for (var ch = 0; ch < chips.length; ch++) {
				var C = chips[ch];
				for (var pxx = C.x; pxx < C.x + C.w; pxx += 1) { seed(pxx, C.y - 1); seed(pxx, C.y + C.h); }
				for (var pyy = C.y; pyy < C.y + C.h; pyy += 1) { seed(C.x - 1, pyy); seed(C.x + C.w, pyy); }
			}

			// Randomized flood fill with a turn bias for longer straight runs.
			var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
			var guard = cols * rows * 5;
			while (frontier.length && guard-- > 0) {
				var fi = Math.floor(Math.random() * frontier.length);
				var cell = frontier[fi];
				for (var d = dirs.length - 1; d > 0; d--) {
					var rr = Math.floor(Math.random() * (d + 1));
					var tmp = dirs[d]; dirs[d] = dirs[rr]; dirs[rr] = tmp;
				}
				var grew = false;
				for (var di = 0; di < 4; di++) {
					var nx = cell[0] + dirs[di][0], ny = cell[1] + dirs[di][1];
					if (inb(nx, ny) && !occ[id(nx, ny)]) {
						occ[id(nx, ny)] = 1; parent[id(nx, ny)] = id(cell[0], cell[1]);
						frontier.push([nx, ny]); grew = true; break;
					}
				}
				if (!grew) { frontier.splice(fi, 1); }
			}

			// Primary nets: leaves back to trunk, trunk-shared.
			var deg = new Uint8Array(cols * rows);
			for (var i = 0; i < cols * rows; i++) { if (parent[i] >= 0) { deg[parent[i]]++; } }
			var claimed = new Uint8Array(cols * rows);
			var traces = [];
			for (var L = 0; L < cols * rows; L++) {
				if (occ[L] !== 1 || deg[L] !== 0 || parent[L] === -1) { continue; }
				var chain = [];
				var cur = L, hops = 0;
				while (cur >= 0 && hops++ < 600) {
					chain.push(cur);
					if (claimed[cur]) { break; }
					claimed[cur] = 1;
					cur = parent[cur];
				}
				if (chain.length < 3) { continue; }
				var pts = [];
				for (var ci = 0; ci < chain.length; ci++) {
					var cx2 = chain[ci] % cols, cy2 = (chain[ci] / cols) | 0;
					var pv = ci > 0 ? chain[ci - 1] : -1, nv = ci < chain.length - 1 ? chain[ci + 1] : -1;
					var corner = true;
					if (pv >= 0 && nv >= 0) {
						var pxp = pv % cols, pyp = (pv / cols) | 0;
						var nxp = nv % cols, nyp = (nv / cols) | 0;
						corner = (nxp - cx2) !== (cx2 - pxp) || (nyp - cy2) !== (cy2 - pyp);
					}
					if (corner) { pts.push((cx2 + 0.5) * g, (cy2 + 0.5) * g); }
				}
				traces.push({ pts: pts, ci: traces.length % 3, seed: Math.random() * TAU,
					speed: 0.18 + Math.random() * 0.3, long: chain.length > 16 });
			}

			// Detail layer: short stubs + via clusters in remaining empty
			// cells, for that doubly-dense PCB silkscreen feel.
			var details = [];
			var vias = [];
			for (var L2 = 0; L2 < cols * rows; L2++) {
				if (occ[L2] !== 0) { continue; }
				var dx2 = L2 % cols, dy2 = (L2 / cols) | 0;
				var hsh = U.noise2(dx2 * 1.7, dy2 * 2.3);
				if (hsh > 0.82) {
					// short stub
					var horiz = U.noise2(dx2 * 3.1, dy2) > 0.5;
					var len = (1 + Math.floor(hsh * 2));
					details.push({
						x: (dx2 + 0.5) * g, y: (dy2 + 0.5) * g,
						dx: horiz ? len * g : 0, dy: horiz ? 0 : len * g,
						ci: (dx2 + dy2) % 3
					});
				} else if (hsh < 0.06) {
					vias.push([(dx2 + 0.5) * g, (dy2 + 0.5) * g]);
				}
			}

			state.chips = chips;
			state.traces = traces;
			state.details = details;
			state.vias = vias;
			state.pads = pinList.filter(function (_, i) { return i % 4 === 0; })
				.map(function (p) { return [(p[0] + 0.5) * g, (p[1] + 0.5) * g]; });
		},

		render: function (ctx, state, f) {
			var t = f.t * f.speed;
			var g = state.g;
			var phase = f.scroll * 0.0015;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			function energyAt(x, y) {
				var e = 0;
				if (f.pointer.active) {
					var dx = x - f.pointer.x, dy = y - f.pointer.y;
					e = U.smoothstep(240, 0, Math.sqrt(dx * dx + dy * dy));
				}
				for (var k = 0; k < f.taps.length; k++) {
					var tap = f.taps[k];
					var tdx = x - tap.x, tdy = y - tap.y;
					var td = Math.sqrt(tdx * tdx + tdy * tdy);
					var ring = tap.age * 500;
					e += Math.exp(-Math.pow((td - ring) / 120, 2)) * (1 - tap.age / 3);
				}
				return Math.min(1, e);
			}

			// Detail stub layer (batched, faint).
			ctx.lineWidth = 1;
			for (var dCi = 0; dCi < 3; dCi++) {
				ctx.beginPath();
				for (var di = 0; di < state.details.length; di++) {
					var de = state.details[di];
					if (de.ci !== dCi) { continue; }
					ctx.moveTo(de.x, de.y);
					ctx.lineTo(de.x + de.dx, de.y + de.dy);
				}
				ctx.strokeStyle = U.rgba(f.colors[dCi], 0.12);
				ctx.stroke();
			}
			// Via dots (batched).
			ctx.fillStyle = U.rgba(f.colors[2], 0.18);
			for (var vi = 0; vi < state.vias.length; vi++) {
				ctx.fillRect(state.vias[vi][0] - 1, state.vias[vi][1] - 1, 2, 2);
			}

			// Primary copper maze.
			for (var i = 0; i < state.traces.length; i++) {
				var tr = state.traces[i];
				var pts = tr.pts;
				var mi = (pts.length >> 1) & ~1;
				var energy = energyAt(pts[mi], pts[mi + 1]);

				var col = f.colors[tr.ci];
				if (energy > 0.01) { col = U.mix(col, WHITE, energy * 0.55); }

				ctx.beginPath();
				ctx.moveTo(pts[0], pts[1]);
				for (var j = 2; j < pts.length; j += 2) { ctx.lineTo(pts[j], pts[j + 1]); }
				ctx.strokeStyle = U.rgba(col, 0.2 + energy * 0.5);
				ctx.lineWidth = 1.3 + energy * 1.1;
				ctx.stroke();

				if (tr.long) {
					var u = ((t * tr.speed * (1 + energy * 1.5) + tr.seed + phase) % 1 + 1) % 1;
					var pp = pointAt(pts, u);
					ctx.beginPath();
					ctx.arc(pp.x, pp.y, 1.7 + energy * 2, 0, TAU);
					ctx.fillStyle = U.rgba(U.mix(col, WHITE, 0.6), 0.5 + energy * 0.45);
					ctx.fill();
				}
			}

			// Solder pads.
			for (var p = 0; p < state.pads.length; p++) {
				var pad = state.pads[p];
				var e2 = energyAt(pad[0], pad[1]);
				ctx.beginPath();
				ctx.arc(pad[0], pad[1], 2 + e2 * 1.6, 0, TAU);
				ctx.strokeStyle = U.rgba(U.mix(f.colors[2], WHITE, e2 * 0.5), 0.3 + e2 * 0.4);
				ctx.lineWidth = 1.3;
				ctx.stroke();
			}

			// IC packages with internal sub-blocks.
			for (var c = 0; c < state.chips.length; c++) {
				var C = state.chips[c];
				var X = C.x * g, Y = C.y * g, W = C.w * g, H = C.h * g;
				var ce = energyAt(X + W / 2, Y + H / 2);
				var blink = 0.5 + 0.5 * Math.sin(t * 1.2 + C.seed);

				ctx.strokeStyle = U.rgba(f.colors[2], 0.4 + ce * 0.3);
				ctx.lineWidth = 1.6;
				for (var lx = C.x; lx < C.x + C.w; lx += 1) {
					leg(ctx, (lx + 0.5) * g, Y, 0, -g * 0.5);
					leg(ctx, (lx + 0.5) * g, Y + H, 0, g * 0.5);
				}
				for (var ly = C.y; ly < C.y + C.h; ly += 1) {
					leg(ctx, X, (ly + 0.5) * g, -g * 0.5, 0);
					leg(ctx, X + W, (ly + 0.5) * g, g * 0.5, 0);
				}

				ctx.fillStyle = 'rgba(8,10,20,0.95)';
				ctx.fillRect(X, Y, W, H);
				ctx.strokeStyle = U.rgba(U.mix(f.colors[2], WHITE, ce * 0.4), 0.7);
				ctx.lineWidth = 2;
				ctx.strokeRect(X, Y, W, H);

				// Internal sub-blocks (cores / cache lines).
				ctx.strokeStyle = U.rgba(f.colors[1], 0.25 + ce * 0.2);
				ctx.lineWidth = 1;
				var sub = 2 + (C.w > 6 ? 1 : 0);
				for (var si = 1; si < sub; si++) {
					var sx = X + (si / sub) * W;
					ctx.beginPath(); ctx.moveTo(sx, Y + 3); ctx.lineTo(sx, Y + H - 3); ctx.stroke();
				}
				for (var sj = 1; sj < 2; sj++) {
					var sy = Y + (sj / 2) * H;
					ctx.beginPath(); ctx.moveTo(X + 3, sy); ctx.lineTo(X + W - 3, sy); ctx.stroke();
				}

				// Pin-1 notch + active die dot.
				ctx.beginPath();
				ctx.arc(X + g * 0.7, Y + g * 0.7, g * 0.28, 0, TAU);
				ctx.strokeStyle = U.rgba(f.colors[1], 0.6);
				ctx.lineWidth = 1.2;
				ctx.stroke();
				ctx.fillStyle = U.rgba(f.colors[1], 0.2 + blink * 0.4 + ce * 0.2);
				ctx.fillRect(X + W * 0.5 - 2, Y + H * 0.5 - 2, 4, 4);
			}
		}
	});

	function leg(ctx, x, y, dx, dy) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke(); }

	function pointAt(pts, u) {
		var total = 0, lens = [];
		for (var i = 0; i + 3 < pts.length; i += 2) {
			var l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
			lens.push(l); total += l;
		}
		var dgoal = u * total, acc = 0;
		for (var s = 0; s < lens.length; s++) {
			if (acc + lens[s] >= dgoal) {
				var k = lens[s] ? (dgoal - acc) / lens[s] : 0;
				var i2 = s * 2;
				return { x: pts[i2] + (pts[i2 + 2] - pts[i2]) * k, y: pts[i2 + 1] + (pts[i2 + 3] - pts[i2 + 1]) * k };
			}
			acc += lens[s];
		}
		return { x: pts[pts.length - 2], y: pts[pts.length - 1] };
	}
})();
