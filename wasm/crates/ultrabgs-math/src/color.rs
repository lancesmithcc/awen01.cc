//! Color parsing and mixing, a faithful port of the `window.UltraBGs.utils`
//! color helpers in `wp-content/plugins/ultrabgs/assets/js/engine.js`.

/// JavaScript `Math.round` semantics: round a half toward `+Infinity`, which is
/// `floor(x + 0.5)` for every finite `x` (Rust's `f64::round` rounds a half away
/// from zero instead, so the two disagree on negative halves).
fn js_round(x: f64) -> f64 {
    (x + 0.5).floor()
}

/// Parse a `#rgb` or `#rrggbb` hex string into 8-bit channels.
///
/// An empty input falls back to `#888888`, matching `engine.js` `hexToRgb`.
/// Invalid hex yields `[0, 0, 0]`, matching JavaScript's `parseInt`/bit-mask
/// coercion of a non-hex string.
pub fn hex_to_rgb(hex: &str) -> [u8; 3] {
    let h = if hex.is_empty() { "#888888" } else { hex };
    // JS `.replace('#', '')` strips only the first leading `#`.
    let h = h.replacen('#', "", 1);
    let expanded: String = if h.len() == 3 {
        let b = h.as_bytes();
        format!("{0}{0}{1}{1}{2}{2}", b[0] as char, b[1] as char, b[2] as char)
    } else {
        h.to_string()
    };
    let mut out = [0u8; 3];
    if expanded.len() == 6 {
        for i in 0..3 {
            out[i] = u8::from_str_radix(&expanded[i * 2..i * 2 + 2], 16).unwrap_or(0);
        }
    }
    out
}

/// Mix a single channel: `a + (b - a) * t`, rounded like JS `Math.round`.
pub fn mix_channel(a: f64, b: f64, t: f64) -> f64 {
    js_round(a + (b - a) * t)
}

/// Mix two RGB colors (`engine.js` `mix`). Channels are rounded but **not**
/// clamped, matching the JavaScript helper exactly — the browser clamps the
/// resulting `rgba(...)` value when it draws it.
pub fn mix(a: [f64; 3], b: [f64; 3], t: f64) -> [f64; 3] {
    [
        mix_channel(a[0], b[0], t),
        mix_channel(a[1], b[1], t),
        mix_channel(a[2], b[2], t),
    ]
}

/// Format a color + alpha as a CSS `rgba(...)` string (`engine.js` `rgba`).
pub fn rgba(c: [f64; 3], a: f64) -> String {
    format!("rgba({},{},{},{})", c[0], c[1], c[2], a)
}
