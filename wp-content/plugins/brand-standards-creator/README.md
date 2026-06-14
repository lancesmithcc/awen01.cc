# Brand Standards Creator

A WordPress plugin that builds a complete, living brand standards system and keeps it in sync with GeneratePress / GenerateBlocks — with AI assistance for copy (OpenRouter / DeepSeek / MiniMax) and asset generation (fal.ai: Recraft for vector, GPT Image for raster).

## What it produces

Every save regenerates four synchronized outputs in `/wp-content/uploads/brand-standards/`:

| Output | Audience | Contents |
|---|---|---|
| **Guide page** | Humans | Auto-created `/brand-standards/` page rendered *in the brand's own tokens* — logo grid with backgrounds/clearspace/min sizes, dos & don'ts, lockups, swatches, full WCAG contrast matrix, type specimens + modular scale, spacing scale visualization, ratios, imagery rules, optional voice & tone |
| **PDF** | Humans | "Download PDF" button on the guide page; dedicated print stylesheet with exact colors and per-section page breaks |
| **brand.json** | Machines | Full schema + computed data: resolved type scale (px), spacing (px), complete WCAG contrast matrix, resolved asset URLs |
| **brand.md** | AI agents | An execution brief: every token, rule, and a direct URL to every asset so a model can apply the brand without guessing |
| **tokens.css** | The site itself | `--bsc-color-*`, `--bsc-space-*`, `--bsc-font-*` custom properties, auto-enqueued front-end + block editor |


## Document structure (v0.9.1)

The guide page and PDF follow an editorial standards-document layout: dark cover with accent edge bar, eyebrow + double-rule numbered section headers, and a back cover with the download bar (PDF / brand.md / brand.json / tokens.css — also repeated on the cover). **Identity/Mission, Voice & Tone, and Brand In Application are optional sections** — toggle them per-brand and section numbering re-sequences automatically. Typography supports any number of faces with roles (display, heading, subheading, body, caption, mono, accent). The Spacing section is now **Spacing, Grid & Layout**: column count, gutters, page margins, max content width, a live grid visualization, and composition principles. Scroll reveals and hover micro-interactions run on both admin and guide, with no-JS fallbacks and full prefers-reduced-motion support.

## Extrapolation engine (minimal input → full standard)

**Quick Start tab**: give it a logo, 1–3 seed colors, a heading/body type combo, three voice words, and an industry line — it generates the complete standard. Seed colors are auto-extracted from the uploaded logo (client-side canvas analysis), because per the Core Asset Protocol the palette derives from the logo, not the other way around.

Two layers, deliberately separated:

**1. Deterministic (math, no AI)** — `BSC_Color`, a true OKLCH engine (validated round-trip, gamut-clamped):
- 12-role palette composed around the seed: primary, contrast-gated primary-text, secondary, accent, hue-tinted neutrals (ink/surface/bg/muted/border — never pure #000/#fff, never default-cream), semantic success/warning/danger
- Monotonic 50–900 primary ramp interpolated around the seed's own lightness
- Dark-theme counterpart set with its own contrast gating
- Modular type scale (1.25, base 18), 8px spacing scale, layout ratios, baseline logo treatment rules

**2. AI judgment pass (one structured JSON call)** — mission, color-strategy application, brand-specific logo dos/don'ts, lockup recommendations, imagery style (written to double as the image-gen base prompt), tone attributes/guidelines/examples. Grounded in the built-in principles digest. Degrades gracefully: with no API key you still get the complete deterministic baseline.

## Built-in design fundamentals

`BSC_Principles` distills three open-source design-for-AI systems and uses the digest as the system prompt for every generation, then appends the rule tables to brand.md so downstream AI executes with the same discipline:

- **pbakaus/impeccable** (Apache 2.0) — seed→palette composition in OKLCH, hue-tinted neutrals, font pairing on contrast axes, modular scale ≥1.25, tracking floors/ceilings, color-strategy commitment axis (restrained/committed/full/drenched), anti-slop bans
- **nexu-io/open-design** — palette layer budgets (neutrals 70–90%, ONE accent 5–10%, max 2 visible uses/screen), contrast gates as hard minimums, WCAG 2.2 AA working ceiling, no-pure-black dark themes, letter-spacing and line-height tables
- **alchaincyf/huashu-design** — the Core Asset Protocol: assets > specs; logo is the highest-recognition asset (mandatory), colors are only medium-strength identity carriers, fonts low — never define a brand from colors + fonts alone

The digest is filterable (`bsc_principles_digest`) if you want to inject your own house rules into all generations.

## GeneratePress / GenerateBlocks integration

On save (when GP is active):

- Brand colors → **GP Global Colors** (`generate_settings['global_colors']`), which surface in every GenerateBlocks color picker and as `--{slug}` CSS variables.
- Heading/body fonts → **GP Font Manager + Typography** (GP 3.x), including Google Font flagging.
- GP's dynamic CSS cache is busted automatically.

The tokens.css layer works on **any** theme, so GB elements can also use `var(--bsc-space-3)` etc. directly.

## Security model for API keys

- Encrypted at rest with libsodium `secretbox` (XSalsa20-Poly1305).
- Encryption key derived from `wp_salt('auth')` — DB dumps alone can't recover keys.
- Stored with `autoload=false`; **never** localized to JS or returned by REST.
- All provider calls are server-side proxies behind `manage_options` + REST nonces.
- Admin UI only ever sees a saved/not-saved boolean.

## AI endpoints

- `POST /wp-json/bsc/v1/ai/text` — `{provider, model, prompt}` → OpenAI-compatible chat completions against OpenRouter, DeepSeek, or MiniMax. Used by the "Draft with AI" buttons (mission, logo dos/don'ts, tone guidelines) and available for your own tooling.
- `POST /wp-json/bsc/v1/ai/image` — `{kind: vector|raster, prompt}` → fal.ai synchronous run. Vector defaults to `fal-ai/recraft/v3/text-to-image`; raster defaults to the GPT Image endpoint (model strings are editable in **AI & API Keys**, so point the raster model at GPT Image 2 the moment fal exposes it). Results are sideloaded into the Media Library.

## Install

1. Zip/upload the `brand-standards-creator` folder to `/wp-content/plugins/` and activate.
2. **Brand Standards → AI & API Keys**: paste keys, save.
3. Fill the tabs, hit **Save brand**.
4. **Export & Sync → Create guide page**.

Requires PHP 7.4+ with libsodium (bundled in PHP 7.2+), WP 6.0+.

## Extension hooks

- `bsc_brand_saved( $brand )` — fire your own sync (e.g. push to a design-token service).
- `bsc_tokens_css( $css, $brand )` — append custom properties.
- `bsc_export_json( $data, $brand )` / `bsc_export_markdown( $md, $brand )` — extend exports.
- `bsc_text_endpoints( $array )` — add more OpenAI-compatible providers.
- `bsc_fal_input( $input, $model, $request )` — tune fal payloads (image_size, style, etc.).
- `bsc_after_gp_sync( $brand, $settings )` — chain GenerateBlocks global-style writes or anything else.

## Roadmap ideas

- Server-side PDF via dompdf (hook `bsc_brand_saved`).
- Multi-brand support (convert option to CPT) for agency use.
- GenerateBlocks Global Styles writer (GB 2.x styles API).
- `/wp-json/bsc/v1/brand.json` public read endpoint with token auth for cross-site AI agents.
