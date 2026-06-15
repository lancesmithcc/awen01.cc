# UltraBGs — Animation Pack Developer Guide

UltraBGs by AWEN01 is built so animation packs ship as ordinary WordPress
plugins. A pack add-on is two pieces: a PHP registration filter and a JS file
that implements the render contract.

## 1. Register the pack (PHP)

Create a small plugin:

```php
<?php
/**
 * Plugin Name: UltraBGs Pack — Starfield
 * Requires Plugins: ultrabgs
 */

add_filter( 'ultrabgs_packs', function ( $packs ) {
    $packs['starfield'] = array(
        'label'  => __( 'Starfield', 'ubgs-starfield' ),
        'script' => plugins_url( 'js/starfield.js', __FILE__ ),
        'ver'    => '1.0.0',
    );
    return $packs;
} );
```

That's it on the PHP side. UltraBGs core registers and enqueues the script
(with `ultrabgs-engine` as a dependency), lists the pack in the Settings page
dropdown, and adds it to the block editor's pack selector automatically.

## 2. Implement the pack (JS)

```js
(function () {
    var U = window.UltraBGs.utils; // hexToRgb, rgba, mix, lerp, clamp, smoothstep, noise2

    window.UltraBGs.registerPack({
        id: 'starfield',           // must match the PHP array key
        name: 'Starfield',

        // Called once per instance, and again after any resize.
        // Build your layout / particle arrays into `state`.
        init: function (state, frame) {
            state.stars = [];
            var n = Math.round(200 * frame.density);
            for (var i = 0; i < n; i++) {
                state.stars.push({ x: Math.random() * frame.w, y: Math.random() * frame.h });
            }
        },

        // Called every animation frame. Canvas is already cleared and
        // DPR-scaled; draw in CSS pixels.
        render: function (ctx, state, frame) {
            // ... draw using frame inputs (below)
        }
    });
})();
```

## 3. The `frame` object

| Property | Meaning |
| --- | --- |
| `w`, `h` | Canvas size in CSS pixels |
| `t`, `dt` | Elapsed seconds, delta seconds |
| `pointer.x/y` | Cursor position in element-local coordinates |
| `pointer.vx/vy` | Smoothed cursor velocity |
| `pointer.active` | False when the cursor leaves the window |
| `scroll`, `scrollVel` | Page scroll position and smoothed velocity |
| `taps` | Array of `{x, y, age}` — taps in non-interactive areas, `age` in seconds (kept for 3s, great for ripples) |
| `colors` | The 3 user-chosen colors as `{r,g,b}` objects |
| `hex` | Same colors as hex strings |
| `opacity`, `speed`, `density` | User settings (opacity is applied to the canvas for you; speed/density are for your math) |
| `reduced` | True when `prefers-reduced-motion` is on — the engine renders a single static frame, so design `t = 0` to look good |

## 4. Conventions

- Respect `speed` by multiplying your time values: `var t = frame.t * frame.speed;`
- Respect `density` for particle counts / grid sizes.
- Never attach your own pointer/scroll listeners — the engine provides unified
  input so every pack responds to cursor, scroll, and taps consistently.
- Keep per-frame allocations low; reuse arrays built in `init`.
- The same pack instance can run on a block-level layer or the full-page
  fixed layer; coordinates are always element-local, so no special-casing.

## 5. Manual mounting (optional)

Themes and other plugins can mount layers directly:

```js
UltraBGs.mount(document.querySelector('.hero'), 'starfield', {
    colors: ['#0b1d3a', '#3fb6a8', '#ffffff'],
    opacity: 0.9,
    speed: 1.2,
    density: 1,
    zIndex: -1
});
```

Or declaratively in markup — the engine scans on load:

```html
<section data-ultrabgs="starfield"
         data-ubgs-config='{"colors":["#0b1d3a","#3fb6a8","#ffffff"],"zIndex":-1}'>
```
