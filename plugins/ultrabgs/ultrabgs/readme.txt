=== UltraBGs ===
Contributors: awen01
Tags: background, animation, canvas, blocks, interactive
Requires at least: 6.2
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.1.2
License: GPLv2 or later

Motion, hover, scroll and tap responsive animated background layers for single blocks or the whole page — with an extensible animation pack system.

== Description ==

UltraBGs by AWEN01 adds hypnotic, interactive canvas background layers behind any block or the entire page. Animations respond in unison to cursor motion, page scroll, and taps in non-interactive areas.

Ships with five packs:

* Low Poly Node Morph — triangulated mesh that bends around the cursor
* Halftone Dots — a breathing dot screen that swells on contact
* Aurora Borealis — shimmering curtains that sway toward the pointer
* Smoky Clouds — drifting smoke pushed by cursor wake and taps
* Hexagonal Cubes — isometric cube grid that lifts and ripples

Every layer is configurable: three colors, opacity, speed, density/detail, and z-index. Full-page mode lives in Settings → UltraBGs; per-block layers are configured in the block editor sidebar (UltraBGs panel on any block).

Add-on animation packs install as separate plugins via the `ultrabgs_packs` filter — see DEVELOPERS.md.

Respects prefers-reduced-motion (renders a static frame instead of animating).

== Installation ==

1. Upload the `ultrabgs` folder to `/wp-content/plugins/`.
2. Activate UltraBGs.
3. Settings → UltraBGs for the full-page layer, or open any block's sidebar for per-block layers.

== Changelog ==

= 1.1.2 =
* Security hardening: validate per-block and full-page config server-side (hex-only colors, clamped numerics), sanitize pack ids, and add a client-side config sanitizer that only mounts known packs. Defense-in-depth across PHP, editor, and engine layers.

= 1.1.1 =
* Halftone Dots: quieter ambient field, stronger reactivity (cursor wake, motion-energy swell, faster tap rings, scroll-velocity pulse).

= 1.1.0 =
* Contributors tab: downloadable Claude and Codex skills for building animation pack add-ons, plus a Starfield starter pack template.

= 1.0.0 =
* Initial release: engine, five core packs, block editor integration, pack add-on API.
