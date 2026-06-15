# AWEN01 — Security Audit & Hardening Plan

_Scan date: 2026-06-15 · Scope: all custom plugins (BrandBoss, StockBoss, UltraBGs + ubgs-* packs, awen01-dark-light-transcendent, gx-scroll-motion) and the child theme._

## Overall posture: GOOD

No high-severity issues found. The codebase already does the important things right:

- **API keys encrypted at rest** — BrandBoss uses libsodium secretbox; StockBoss uses AES-256-CBC + HMAC. Both derive the key from `wp_salt('auth')`. Keys are **never sent to the browser** (status booleans only) and all provider calls are proxied server-side.
- **Authorization** — every REST route has a `permission_callback` (`manage_options` for BrandBoss, `upload_files`+`edit_posts` for StockBoss). Admin settings check `current_user_can` + `check_admin_referer`.
- **CSRF** — settings use the WP Settings API (`register_setting`/`settings_fields`); the custom admin-post action uses a nonce; REST relies on WP core's cookie nonce.
- **Input sanitization** — recursive sanitize on brand data, `sanitize_hex_color`/`absint`/`sanitize_text_field` throughout; model names validated against an allowlist (StockBoss).
- **No dangerous sinks** — no `eval`, `system`, `unserialize`, `extract`, direct `$wpdb`, or echoed superglobals. Guide template output is escaped (remaining raw echoes are `(int)` casts / boolean literals).

The items below are **defense-in-depth**, not active exploits. All require an authenticated, already-privileged user.

---

## Findings & plan

### 1. [MEDIUM] BrandBoss `ai_image` — user `model` concatenated into request URL
`includes/class-bsc-rest.php` → `wp_remote_post( 'https://fal.run/' . ltrim($model,'/') )`.
`$model` is `sanitize_text_field`, which still permits `@`, `:`, `/`. A value like `@evil.tld/x` turns `fal.run` into URL *userinfo* and sends the request — **with the fal.ai API key in the Authorization header** — to an attacker host (SSRF + key exfiltration). Admin-only (`manage_options`), so low likelihood, but it leaks a secret.
- [x] **DONE** — `ai_image` now rejects any `model` not matching `^[a-z0-9][a-z0-9._/-]*$` or containing `..`, returns `WP_Error 400` before the URL is built.

### 2. [LOW] StockBoss — encryption silently falls back to plaintext
`includes/class-stockboss-options.php` → `encrypt_secret()` returns the raw secret if `openssl_*` is unavailable, storing the API key **unencrypted** in `wp_options`.
- [x] **DONE** — `encrypt_secret` now returns `''` (never plaintext) on any openssl failure; `sanitize_options` refuses the save, keeps the prior value, and raises an admin `settings_error`.

### 3. [LOW] StockBoss generate endpoint = author-level → AI cost abuse
`can_generate_images()` = `upload_files` + `edit_posts` (Author/Contributor). Any such user can trigger unlimited paid OpenRouter generations.
- [x] **DONE** — per-user transient throttle (`stockboss_rl_{user}`), default 60/hour, filterable via `stockboss_generations_per_hour`; returns `429` when exceeded.

### 4. [LOW] StockBoss — SSRF via AI-response image URL
`class-stockboss-openrouter.php` → when the model returns a URL, `download_url()` fetches it (also regex-extracts URLs from assistant text). Bounded to OpenRouter responses (trusted), but unvalidated.
- [x] **DONE** — `is_safe_remote_url()` requires `https`, resolves the host, and rejects any private/reserved/loopback/link-local IP (and unresolvable hosts) before `download_url()`.

### 5. [LOW] StockBoss reference images — any attachment ID is readable
`attachment_to_data_url()` base64-encodes **any** image attachment by ID (only an `image/*` mime check) and sends it to the external API — no per-user ownership check. Minor info disclosure (media library is shared anyway).
- [x] **DONE** — `attachment_to_data_url()` now checks `get_post_type()==='attachment'` + `current_user_can('read_post', $id)`; returns null otherwise.

### 6. [INFO] Provider error detail returned to client
BrandBoss `ai_text`/`ai_image` include the raw provider JSON in error responses (`detail => $json`). Admin-only; could leak provider internals.
- [x] **DONE** — provider `detail` payload now only attached to the `WP_Error` when `WP_DEBUG` is on.

### 7. [INFO] gx-scroll-motion / ubgs-* packs / DLT
No input handling beyond block attributes; CSS/color output is `sanitize_hex_color` / `sanitize_css_value` (blocks `<>{};\`). DLT customizer uses sanitize callbacks. No action needed.

---

## Status — all items resolved 2026-06-15

- [x] #1 BrandBoss model allowlist
- [x] #2 StockBoss fail-closed encryption
- [x] #3 StockBoss generation rate limit
- [x] #4 StockBoss SSRF URL guard
- [x] #5 StockBoss reference-image read check
- [x] #6 BrandBoss error detail behind `WP_DEBUG`
- [x] #7 no action needed (verified clean)

All edited files pass `php -l`. No behavioral change for normal use; hardening only.
