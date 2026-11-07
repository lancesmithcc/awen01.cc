# AWEN01 — Custom plugins → Rust WebAssembly

This directory holds Rust crates that rebuild the pure-computation, client-side
logic of the custom WordPress plugins as WebAssembly modules. Each crate is a
standalone `wasm-bindgen` library compiled to `wasm32-unknown-unknown` and loaded
by the plugin's existing no-build-step front end.

> Why WASM for these plugins: the WordPress front end is deliberately
> build-free (plain `<script>` tags, no bundler). `wasm-bindgen --target
> no-modules` emits a classic script plus a `.wasm` payload, so the module drops
> in with a normal `wp_enqueue_script` — no Node toolchain on the site.

---

## 1. Survey & classification

Every custom plugin was read and split into **client-side (WASM-appropriate)**
versus **server-side (stays in PHP/API)**. The rule is the same one the issue
states: *pure computation* moves to WASM; anything touching the DOM/canvas stays
in JS; *AI calls, database, auth, and API keys never leave PHP*.

### BrandBoss (`wp-content/plugins/brandboss/`)

| Layer | Functions | Target |
|---|---|---|
| Client — color engine | OKLCH ↔ sRGB conversions, gamut clamping, palette composition (`BSC_Color::compose`), contrast gating (`gate`), WCAG luminance/ratio/grade/matrix (`BSC_Contrast`) | **WASM** (this PR) |
| Client — type/space math | modular type scale (base 18, ratio 1.25), 8px spacing scale, layout ratios | WASM (later, `brandboss-typography`) |
| Client — seed extraction | canvas dominant-color bucketing (`extractColors`) | stays JS (canvas-bound); can pass `ImageData` to WASM later |
| Server | AI text/image (OpenRouter/DeepSeek/MiniMax/fal.ai), key encryption (libsodium), GeneratePress sync, exports (brand.json/md/tokens.css/guide/PDF), asset library | **PHP** |

### StockBoss (`wp-content/plugins/stockboss/`)

| Layer | Functions | Target |
|---|---|---|
| Server | OpenRouter image generation, key encryption (AES+HMAC), SSRF guard, rate limiting, media sideloading | **PHP** (entirely; per issue, AI stays server-side) |
| Client | block editor UI (`editor.js`) | stays JS (thin; no pure-computation core) |

### UltraBGs + `ubgs-*` packs (`ultrabgs/`, `ubgs-ascii-art`, `ubgs-awen01`, `ubgs-elemental`, `ubgs-luxury`, `ubgs-retro-future`, `ubgs-sonic`)

| Layer | Functions | Target |
|---|---|---|
| Client — render math | value noise, particle/fluid/geometry simulation, easing, color mixing inside every pack's `render(ctx, state, frame)` | **WASM** (later, `ultrabgs-math`) |
| Client — canvas drawing | `ctx.fillRect`/`putImageData`/paths | stays JS (WASM writes into an `ImageData`/`Float32Array` buffer) |
| Server | block registration, pack registry, settings | **PHP** |

### awen01-dark-light-transcendent

| Layer | Functions | Target |
|---|---|---|
| Client — mode logic | mode resolution (stored / default / `prefers-color-scheme` / fallback), cycling | WASM (tiny, `dlt-mode`) — DOM/localStorage stays JS |
| Server | color classes, customizer, block overrides, CSS output | **PHP** |

### yolo-scroll (`yolo-scroll.php`)

| Layer | Functions | Target |
|---|---|---|
| Client — animation math | easing/smoothstep, scroll progress mapping, `scramble`/`type-in` glyph stream | WASM (later, `yolo-scroll`) — DOM/GSAP stays JS |
| Server | block registration, settings, shortcodes | **PHP** |

### cyclical-dynamic-palettes

| Layer | Functions | Target |
|---|---|---|
| Client — rule matching | date/time window matching, palette rule resolution, DLT mode map | WASM (later, `cyclical-palettes`) — CSS-var application stays JS |
| Server | rule parsing/sanitizing, SSR, GP/GB color reading | **PHP** |

### taxonomy-query

| Layer | Functions | Target |
|---|---|---|
| Server | REST term queries, loop rendering, dynamic tags, block registration | **PHP** (query/DB-bound; nothing to port) |
| Client | block editor controls (`editor.js`) | stays JS |

### Note on the duplicate tree

`plugins/` and `wp-content/plugins/` both contain BrandBoss, StockBoss and the
`ubgs-*` packs, and those copies are byte-identical. `docker-compose.yml` mounts
**`./wp-content`** into WordPress, so `wp-content/plugins/` is the live path and
`plugins/` is a stale mirror that is not loaded. This work integrates into
`wp-content/plugins/`; de-duplicating `plugins/` is tracked separately and is out
of scope for the WASM port.

---

## 2. Module plan

One crate per plugin subsystem, implemented and merged one PR at a time. Build
order follows value (purest, most-shared math first):

| # | Crate | Contents | Status |
|---|---|---|---|
| 1 | `brandboss-color` | OKLCH engine + WCAG contrast + palette composition | this PR |
| 2 | `brandboss-typography` | type scale / spacing scale / ratio math | planned |
| 3 | `ultrabgs-math` | shared noise, easing, color mix used by all packs | planned |
| 4 | `dlt-mode` | theme-mode resolution | planned |
| 5 | `yolo-scroll` | easing + text-scramble glyph stream | planned |
| 6 | `cyclical-palettes` | date/time rule matching | planned |

### Crate layout

```
wasm/
  Cargo.toml                # workspace (members = ["crates/*"])
  README.md                 # this document
  build.sh                  # cargo build + wasm-bindgen glue for all crates
  crates/
    brandboss-color/
      Cargo.toml            # crate-type = ["cdylib", "rlib"]
      src/
        lib.rs              # wasm-bindgen exports
        color.rs            # hex/rgb/OKLCH conversions, compose, gate
        contrast.rs         # luminance/ratio/grade/matrix
```

The `rlib` crate-type keeps the same code runnable under `cargo test` on the
host, so the math is verified against the PHP implementation without a browser.

### Build path (no `wasm-pack` required)

`wasm-pack` is not installed here; the two-command path is used instead:

```sh
cargo build --release --target wasm32-unknown-unknown -p brandboss-color
wasm-bindgen --target no-modules --no-typescript \
  --out-dir wp-content/plugins/brandboss/assets/wasm \
  target/wasm32-unknown-unknown/release/brandboss_color.wasm
```

`wasm/build.sh` wraps this. The emitted files are committed (the site has no build
step): `brandboss_color.js` (glue) and `brandboss_color_bg.wasm` (payload).

### Front-end loading

The glue is enqueued as a normal classic script; `admin.js` initializes it
asynchronously and falls back to its existing JavaScript math if the module is
missing or unsupported, so nothing breaks when WASM is unavailable.
