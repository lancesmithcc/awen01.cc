---
name: ultrabgs-pack-builder
description: Build animation pack extensions for the UltraBGs WordPress plugin by AWEN01. Use this skill whenever the user wants to create, modify, or debug an UltraBGs animation pack — interactive canvas background animations that respond to cursor motion, scroll, and taps. Covers the pack JS contract, PHP plugin registration, the frame input object, and packaging as an installable WordPress plugin zip.
---

# UltraBGs Pack Builder

UltraBGs renders animated canvas background layers behind WordPress blocks or
the whole page. Packs are plugins-for-the-plugin: a tiny PHP wrapper that
registers the pack, plus one JS file implementing a render contract. Core
handles enqueueing, the Settings dropdown, the block editor selector, canvas
lifecycle, DPR scaling, resize, reduced-motion, and all input tracking.

## Deliverable

Always produce a complete installable plugin folder, zipped:

```
ubgs-{pack-id}/
  ubgs-{pack-id}.php     ← registration wrapper
  js/{pack-id}.js        ← the pack
```

Copy `template/` from this skill as the starting point, then rename and fill in.

## 1. PHP wrapper (rarely needs more than this)

```php
<?php
/**
 * Plugin Name: UltraBGs Pack — {Human Name}
 * Description: {one line}. Requires the UltraBGs plugin.
 * Version: 1.0.0
 * Author: {author}
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

add_filter( 'ultrabgs_packs', function ( $packs ) {
    $packs['{pack-id}'] = array(
        'label'  => '{Human Name}',
        'script' => plugins_url( 'js/{pack-id}.js', __FILE__ ),
        'ver'    => '1.0.0',
    );
    return $packs;
} );
```

`{pack-id}` is lowercase alphanumeric/dashes and MUST match the JS `id`.

## 2. JS pack contract

```js
(function () {
    'use strict';
    var U = window.UltraBGs.utils;

    window.UltraBGs.registerPack({
        id: '{pack-id}',
        name: '{Human Name}',

        // Called once per mounted layer AND again after every resize.
        // Build all layout/particle arrays into `state`. No allocations
        // per frame if you can avoid it.
        init: function (state, frame) { /* ... */ },

        // Called every animation frame. Canvas is pre-cleared and
        // DPR-scaled — draw in CSS pixels. Opacity is applied to the
        // canvas element for you; never multiply frame.opacity yourself.
        render: function (ctx, state, frame) { /* ... */ }
    });
})();
```

### frame object

| Field | Meaning |
| --- | --- |
| `w`, `h` | canvas size, CSS px |
| `t`, `dt` | elapsed seconds, delta seconds |
| `pointer.x/.y` | cursor in element-local coords (can be far off-canvas) |
| `pointer.vx/.vy` | smoothed cursor velocity |
| `pointer.active` | false when cursor left the window |
| `scroll`, `scrollVel` | page scroll position / smoothed velocity |
| `taps` | array of `{x, y, age}` — taps on non-interactive areas, kept 3s; `age` in seconds |
| `colors` | the 3 user colors as `{r,g,b}` objects |
| `hex` | same colors as hex strings |
| `speed`, `density` | user multipliers — see conventions |
| `reduced` | prefers-reduced-motion: engine renders ONE static frame |

### utils (window.UltraBGs.utils)

`hexToRgb(hex)`, `rgba(c, a)`, `mix(c1, c2, t)`, `lerp(a,b,t)`,
`clamp(v,min,max)`, `smoothstep(e0,e1,x)`, `noise2(x,y)` (cheap value noise,
returns 0..1, deterministic).

## 3. Hard conventions — every pack must follow

1. **Time:** first line of render is `var t = frame.t * frame.speed;` — never
   use raw `frame.t` for motion.
2. **Density:** scale particle counts / grid cell sizes by `frame.density`
   (0.3–2.0). Clamp so density 2 stays under ~3000 draw calls per frame.
3. **All three inputs respond.** Cursor proximity/velocity, scroll phase or
   velocity, and taps must each visibly affect the animation. The house style:
   cursor = continuous field (repulsion, lift, swell), tap = expanding ring or
   impulse using `Math.exp(-Math.pow((dist - tap.age*SPEED)/WIDTH, 2)) * (1 - tap.age/3)`,
   scroll = phase drift.
4. **No event listeners.** The engine owns input. Never add your own.
5. **Use all 3 `frame.colors`**, typically via `U.mix` across a noise field,
   and brighten toward white near interaction points (`U.mix(col, {r:255,g:255,b:255}, k)`).
6. **Reduced motion:** the static frame uses whatever `t` is at boot — make
   sure `t = 0` renders something attractive (no blank first frame).
7. **Transparent base.** Never fill the full canvas with an opaque background;
   layers sit over theme backgrounds. If using `globalCompositeOperation`
   ('lighter' etc.), restore `'source-over'` at the end of render.
8. **State rebuilds on resize** — `init` must be idempotent and derive
   everything from `frame.w/h/density`. Use `Math.random()` only inside `init`.

## 4. QA checklist before shipping

- [ ] `node --check js/{pack-id}.js` passes; no ES modules, IIFE only (loads as classic script).
- [ ] Pack id identical in PHP array key and JS `id`.
- [ ] Smooth at 60fps on a 1440px-wide canvas at density 1 (estimate draw calls).
- [ ] Looks good on light AND dark theme backgrounds at the default opacity 0.85.
- [ ] Cursor, scroll, and tap each demonstrably do something.
- [ ] Test standalone: copy the plugin's `demo.html` pattern — load
      `engine.js` + your pack, add `<section data-ultrabgs="{pack-id}" data-ubgs-config='{"colors":[...]}'>`.
- [ ] Zip with the folder as root: `zip -r ubgs-{pack-id}.zip ubgs-{pack-id}/`.

## 5. Reference

Read `template/js/starfield.js` in this skill for a complete worked example
following every convention above.
