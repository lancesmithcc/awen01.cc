//! Theme-mode resolution and cycling for AWEN01 Dark/Light/Transcendent.
//!
//! A faithful port of the two pure-computation functions in the plugin's
//! `assets/js/toggle.js` — `resolve()` (stored / default / `prefers-color-scheme`
//! / fallback) and the mode-cycle index math in `toggle()`. Everything touching
//! the DOM, `localStorage` and `matchMedia` stays in JavaScript; this crate only
//! computes the resulting mode string.

/// The plugin's canonical mode order (`AWEN_DLT_Colors::MODES`).
pub const DEFAULT_MODES: [&str; 3] = ["light", "dark", "transcendent"];

/// Resolve the active theme mode, porting `toggle.js` `resolve()`.
///
/// * `stored` — the persisted mode from `localStorage` (`None` when absent).
/// * `default_mode` — the configured default (`'auto'` means follow the OS).
/// * `prefers_dark` — `matchMedia('(prefers-color-scheme: dark)').matches`.
/// * `modes` — the allowed mode list (fallback to [`DEFAULT_MODES`]).
pub fn resolve(
    stored: Option<&str>,
    default_mode: &str,
    prefers_dark: bool,
    modes: &[String],
) -> String {
    let mut m = stored
        .filter(|s| !s.is_empty())
        .unwrap_or(default_mode)
        .to_string();

    if m == "auto" {
        m = if prefers_dark { "dark" } else { "light" }.to_string();
    }

    if !modes.contains(&m) {
        m = "dark".to_string();
    }

    m
}

/// Cycle to the next mode, porting the index math in `toggle.js` `toggle()`.
///
/// Mirrors `modes[(modes.indexOf(current) + 1) % modes.length] || 'dark'`, which
/// for an unknown `current` resolves to `modes[0]` (the same `-1` + 1 = 0 wrap),
/// and falls back to `"dark"` only when the list is empty or the entry is blank.
pub fn next(current: &str, modes: &[String]) -> String {
    if modes.is_empty() {
        return "dark".to_string();
    }

    // JS `indexOf` returns -1 for a miss; `( -1 + 1 ) % len === 0`, i.e. `modes[0]`.
    let next_index = modes
        .iter()
        .position(|m| m == current)
        .map(|i| (i + 1) % modes.len())
        .unwrap_or(0);
    let candidate = &modes[next_index];

    if candidate.is_empty() {
        "dark".to_string()
    } else {
        candidate.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn modes() -> Vec<String> {
        DEFAULT_MODES.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn resolve_uses_stored_value() {
        assert_eq!(
            resolve(Some("transcendent"), "dark", false, &modes()),
            "transcendent"
        );
    }

    #[test]
    fn resolve_falls_back_to_default() {
        assert_eq!(resolve(None, "dark", false, &modes()), "dark");
        assert_eq!(
            resolve(None, "transcendent", false, &modes()),
            "transcendent"
        );
    }

    #[test]
    fn resolve_empty_stored_is_a_miss() {
        // `s || defaultMode` in JS: an empty string is falsy, so the default wins.
        assert_eq!(resolve(Some(""), "dark", false, &modes()), "dark");
    }

    #[test]
    fn resolve_auto_follows_os_preference() {
        assert_eq!(resolve(None, "auto", true, &modes()), "dark");
        assert_eq!(resolve(None, "auto", false, &modes()), "light");
    }

    #[test]
    fn resolve_rejects_unknown_modes() {
        assert_eq!(resolve(Some("neon"), "dark", false, &modes()), "dark");
        assert_eq!(resolve(Some("auto"), "auto", false, &modes()), "light");
    }

    #[test]
    fn resolve_restricts_to_allowed_list() {
        let reduced = vec!["dark".to_string(), "transcendent".to_string()];
        // 'light' is not allowed, so the OS-derived 'light' falls back to 'dark'.
        assert_eq!(resolve(None, "auto", false, &reduced), "dark");
    }

    #[test]
    fn next_cycles_in_order() {
        assert_eq!(next("light", &modes()), "dark");
        assert_eq!(next("dark", &modes()), "transcendent");
        assert_eq!(next("transcendent", &modes()), "light");
    }

    #[test]
    fn next_unknown_wraps_to_first() {
        // indexOf === -1 → ( -1 + 1 ) % len === 0 → modes[0] === 'light'.
        assert_eq!(next("neon", &modes()), "light");
    }

    #[test]
    fn next_empty_list_falls_back_to_dark() {
        assert_eq!(next("light", &[]), "dark");
    }
}
