# Cyclical Dynamic Palettes

*by [AWEN01.cc](https://awen01.cc/)*

Swap **GeneratePress & GenerateBlocks global color palettes** automatically by date, season, holiday, and/or time of day — with priority and layered overlap handling. Reads your existing global colors and overrides the matching `--{slug}` and WordPress preset CSS variables at runtime, so everything stays in sync with the colors you defined in the Customizer.

## What's new in 1.2.2

- **Palette editor polish:** each color row now shows the current WordPress color swatch/value, keeps the WordPress color picker, and adds a native color picker fallback beside the hex field.

## What's new in 1.2.1

- **Light/Dark/Transcendent priority:** when the AWEN01 Light/Dark/Transcendent plugin is active, its current visitor-selected style can sit in the same priority order as seasonal, holiday, and time-based palette rules.
- **Better variable coverage:** palette rules now write the short variable, WordPress preset variable, and BSC token for each registered global color, so GeneratePress, GenerateBlocks, and AWEN ecosystem styles resolve consistently.

## What's new in 1.2.0

- Renamed to **Cyclical Dynamic Palettes**, authored by **AWEN01.cc**. Internal prefix, option key, text domain, and file names updated to match (no migration — fresh install).

## What's new in 1.1.2

- **Scope guarantee:** the plugin now only ever emits variables that are *currently registered* GeneratePress/GenerateBlocks global colors, plus any variable you explicitly type into a rule's extra-vars field. Orphaned slugs (from a deleted/renamed global color) are dropped before output. Colors set as literal values on individual blocks were never affected — the plugin only redefines global-color CSS variables, it never paints elements directly.

## What's new in 1.1.1

- **Hardening pass:** real calendar/clock validation, sanitized mode inputs, JSON hex-encoding on inline scripts, defensive CSS angle-bracket stripping, a 200-rule cap, i18n loader, and an `uninstall.php` that removes the option (single + multisite) on delete.

## What's new in 1.1

- **GenerateBlocks colors** — the palette editor now lists GeneratePress *and* GenerateBlocks global colors (deduped by slug, tagged GP/GB). In a GP+GB stack both share the same `--{slug}` variables, so overriding a GP color already recolours GB blocks that use it; GB-only colors and custom variables are covered too.
- **Priority** — every rule has a priority number; higher wins when rules overlap. Position breaks ties.
- **Overlap mode** — choose how overlapping palettes combine:
  - **Highest priority wins** — only the top matching rule applies.
  - **Layer / merge** — matching palettes stack; higher priority overrides per colour, lower rules fill the gaps. Mark a rule **Opaque** to hide everything below it.
- **Extra CSS variables** — per-rule advanced field to target any variable (e.g. `--gb-accent: #fff;`) for GenerateBlocks Pro or third-party output not in the colour list.

## How it works

- **Sync:** the rule editor lists your live GP/GB global colors. Each rule overrides only the slugs you tick; everything else keeps its default (and, in merge mode, falls through to lower-priority rules).
- **Matching:** a rule fires when its **date AND time** conditions are both true.
  - Date: Any · Specific day · Date range (season). "Repeat yearly" ignores the year; ranges wrap year-end (Dec 21 → Mar 19).
  - Time: Any · Time window. Windows wrap past midnight (20:00 → 06:00).
- **Overlap:** resolved by priority, then overlap mode (above).
- **AWEN style source:** if the Light/Dark/Transcendent plugin is active, enable its setting to let the visitor's current mode compete with rules. Set its priority higher when the selected mode should win, or lower when a holiday/season/time rule should take over.
- **No flash, cache-safe:** the active palette renders server-side into `<style id="cydp-ssr">` *after* GeneratePress's own variables, then re-resolves in the browser before paint and rewrites that node — keeping full-page caches and precise time-of-day correct, and flipping live on long-open tabs (re-checks each minute).
- **Time source:** Site time (same for everyone — best for holidays/seasons) or Visitor's local time.

## Install

1. Upload the `cyclical-dynamic-palettes` folder to `wp-content/plugins/`, **or** install the zip via *Plugins → Add New → Upload Plugin*.
2. Activate.
3. Go to **Appearance → Dynamic Palettes**. Define your global colors first if needed (Customize → Colors → Global Colors).

## Example (layer / merge mode)

| Priority | Name      | Date                        | Time        | Overrides        | Opaque |
|---------:|-----------|-----------------------------|-------------|------------------|:------:|
| 10       | Winter    | Range Dec 21–Mar 19, yearly | Any         | base, accent     |        |
| 20       | Night     | Any                         | 20:00–06:00 | base             |        |
| 50       | Christmas | Specific day Dec 25, yearly | Any         | accent           |        |

On Christmas night you get **Winter's palette + Night's dark base + Christmas's accent** layered by priority. Tick *Opaque* on Christmas to make it a full takeover instead.

## Notes / limits

- Site-time uses a single current UTC offset; right at midnight across a DST change a date boundary could be off by up to an hour.
- The GenerateBlocks reader probes the `generateblocks` option defensively across versions. If GB Pro emits a variable name that isn't auto-detected, add it via a rule's **extra CSS variables** field.
