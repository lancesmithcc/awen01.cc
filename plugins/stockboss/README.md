# Stockboss WordPress Plugin

Stockboss adds a Gutenberg block that generates images with the **most cutting-edge image models available through OpenRouter** and saves them into your WordPress Media Library.

## Features

- Cutting-edge OpenRouter image models:
  - `openai/gpt-5.4-image-2` — **GPT-5.4 Image 2, the top pick** (default)
  - `google/gemini-3-pro-image-preview` — Gemini 3 Pro Image (alternative high-end)
  - `bytedance-seed/seedream-4.5` — Seedream 4.5 (budget)
- Optional fallback: any model retries on the budget Seedream model when rate-limited
- Provider key storage for OpenRouter, OpenAI, MiniMax, and Google Gemini
- API keys are encrypted before being saved in WordPress options
- Global system prompt and global reference images (Settings > Stockboss)
- Per-block prompt + optional custom system prompt override
- Per-block reference images
- Per-block **system prompt reference images** (available in free mode too)
- Animated editor UI with live preview

## BrandBoss sync (optional)

Stockboss and BrandBoss share the **same brand image standards** through a small,
stable bridge (`BrandBoss_Bridge`). The two plugins are independent — each works
on its own — but when both are installed they stay perfectly in sync:

- **Generate on-brand.** With *BrandBoss Sync* enabled (Settings > Stockboss),
  standardized generations automatically obey the active brand's image standards:
  style, treatments, do/don't rules, palette, and approved reference images.
- **Approve into the brand library.** On any generated image, the block inspector
  shows **Add to Brand Library** with the four shared categories — Graphical
  Elements, Icons, Stock Imagery, Illustrations. Approved assets become brand
  standards and are written into BrandBoss's machine-readable `brand.json` /
  `brand.md` so every downstream AI references them.

If BrandBoss is not installed, these controls are hidden and Stockboss falls back
to its own Global System Prompt and reference images.

## Install

1. Copy this plugin folder into `wp-content/plugins/stockboss`.
2. Activate **Stockboss** in WordPress Plugins.
3. Open **Settings > Stockboss**, add the provider API keys you want to use, and save.
4. In the block editor, insert **Stockboss Image** and generate images.

## Notes

- Generated images are imported into the Media Library with prompt-based titles.
- The plugin sends generation requests server-side; API keys are never exposed to the editor client.
- Leaving a key field blank keeps the saved key. Use **Clear saved key** to remove one.
