//! AWEN01 Dark/Light/Transcendent theme-mode resolution, compiled to WebAssembly.
//!
//! Exposes the pure-computation half of the mode toggle (`toggle.js`) so the
//! front end can resolve and cycle the theme mode without the build-free site
//! needing to keep that logic in JavaScript. The DOM, `localStorage` and
//! `matchMedia` stay in JS; only the resulting mode string is computed here.
//! Behavior is verified against the JS logic in `#[cfg(test)]`.

pub mod mode;

use wasm_bindgen::prelude::*;

/// Parse a JSON array of mode strings, defaulting to the plugin's canonical
/// `['light','dark','transcendent']` order when the input is missing or invalid.
fn parse_modes(modes_json: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(modes_json)
        .unwrap_or_else(|_| mode::DEFAULT_MODES.iter().map(|s| s.to_string()).collect())
}

/// Resolve the active theme mode. Port of `toggle.js` `resolve()`.
///
/// * `stored` — the persisted mode (`null`/`undefined` when none).
/// * `default_mode` — the configured default; `'auto'` follows the OS.
/// * `prefers_dark` — `matchMedia('(prefers-color-scheme: dark)').matches`.
/// * `modes_json` — JSON array of allowed modes.
#[wasm_bindgen]
pub fn resolve_mode(
    stored: Option<String>,
    default_mode: &str,
    prefers_dark: bool,
    modes_json: &str,
) -> String {
    let modes = parse_modes(modes_json);
    mode::resolve(stored.as_deref(), default_mode, prefers_dark, &modes)
}

/// Compute the next mode in the cycle. Port of the index math in `toggle.js`.
#[wasm_bindgen]
pub fn next_mode(current: &str, modes_json: &str) -> String {
    let modes = parse_modes(modes_json);
    mode::next(current, &modes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_mode_defaults_modes_list() {
        // `modes_json` garbage should fall back to the canonical list, so an
        // 'auto' default with a light OS resolves to 'light' (allowed there).
        assert_eq!(resolve_mode(None, "auto", false, "not json"), "light");
        assert_eq!(resolve_mode(None, "auto", true, "not json"), "dark");
    }

    #[test]
    fn resolve_mode_parses_custom_list() {
        let json = r#"["dark","transcendent"]"#;
        // 'light' is not allowed, so the OS-derived 'light' falls back to 'dark'.
        assert_eq!(resolve_mode(None, "auto", false, json), "dark");
    }

    #[test]
    fn next_mode_parses_custom_list() {
        let json = r#"["dark","transcendent"]"#;
        assert_eq!(next_mode("dark", json), "transcendent");
        assert_eq!(next_mode("transcendent", json), "dark");
    }
}
