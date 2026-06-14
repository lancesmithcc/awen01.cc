=== Awen01 Dark Light Transcendent ===
Contributors: awen01
Tags: generatepress, generateblocks, color modes, dark mode, light mode
Requires at least: 6.2
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

AWEN01 color-mode system for GeneratePress: Light, Dark, and Transcendent.

== Description ==

Awen01 Dark Light Transcendent reads the GeneratePress global palette and emits mode-specific CSS variables for:

* `--wp--preset--color--{slug}`
* `--bsc-color-{slug}`
* `--{slug}`

Light mode follows the GeneratePress source palette. Dark and Transcendent modes can be edited in the Customizer and ship with AWEN01 defaults.

== Features ==

* Three modes: Light, Dark, Transcendent.
* One cycling shortcode/block toggle: `[awen_dlt_toggle]`.
* Customizer sections for Dark and Transcendent color counterparts.
* Optional floating toggle positions.
* Preload script prevents color flash before paint.
* Per-block GenerateBlocks/Core override panel for Dark or Transcendent mode.

== Installation ==

1. Upload to `/wp-content/plugins/awen01-dark-light-transcendent/`.
2. Activate in Plugins.
3. Customize mode colors in Appearance -> Customize -> Awen01 Dark Light Transcendent.

== Changelog ==

= 1.0.0 =
* Renamed from GP darkVSlight.
* Added AWEN01 Light, Dark, and Transcendent color modes.
* Added BSC token output and AWEN01 default palettes.
