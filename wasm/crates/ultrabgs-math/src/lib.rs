//! UltraBGs shared render math, compiled to WebAssembly.
//!
//! Exposes the pure-computation half of UltraBGs and every `ubgs-*` pack — the
//! shared value noise, easing, and color parsing/mixing helpers exposed to packs
//! as `window.UltraBGs.utils` in `wp-content/plugins/ultrabgs/assets/js/engine.js`.
//! The math is a byte-for-byte port of those helpers and is verified against
//! JavaScript reference values in `#[cfg(test)]`.

pub mod color;
pub mod easing;
pub mod noise;

use wasm_bindgen::prelude::*;

/// Deterministic 2D hash (`engine.js` `hash2`).
#[wasm_bindgen]
pub fn hash2(x: f64, y: f64) -> f64 {
    noise::hash2(x, y)
}

/// Smooth 2D value noise in `0..1` (`engine.js` `noise2`).
#[wasm_bindgen]
pub fn noise2(x: f64, y: f64) -> f64 {
    noise::noise2(x, y)
}

/// Linear interpolation (`engine.js` `lerp`).
#[wasm_bindgen]
pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    easing::lerp(a, b, t)
}

/// Clamp `v` into `[a, b]` (`engine.js` `clamp`).
#[wasm_bindgen]
pub fn clamp(v: f64, a: f64, b: f64) -> f64 {
    easing::clamp(v, a, b)
}

/// GLSL-style smoothstep over `[e0, e1]` (`engine.js` `smoothstep`).
#[wasm_bindgen]
pub fn smoothstep(e0: f64, e1: f64, x: f64) -> f64 {
    easing::smoothstep(e0, e1, x)
}

/// Parse `#rgb` / `#rrggbb` into three 8-bit channels (`engine.js` `hexToRgb`).
#[wasm_bindgen]
pub fn hex_to_rgb(hex: &str) -> Vec<u8> {
    color::hex_to_rgb(hex).to_vec()
}

/// Mix two RGB colors (`engine.js` `mix`); channels are rounded, not clamped.
/// Returns `[r, g, b]` so the JS wrapper can rebuild the `{r, g, b}` object.
#[wasm_bindgen]
pub fn mix(r1: f64, g1: f64, b1: f64, r2: f64, g2: f64, b2: f64, t: f64) -> Vec<f64> {
    color::mix([r1, g1, b1], [r2, g2, b2], t).to_vec()
}

/// Format a color + alpha as a CSS `rgba(...)` string (`engine.js` `rgba`).
#[wasm_bindgen]
pub fn rgba(r: f64, g: f64, b: f64, a: f64) -> String {
    color::rgba([r, g, b], a)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn hex_matches_js() {
        assert_eq!(color::hex_to_rgb("#2f6feb"), [47, 111, 235]);
        assert_eq!(color::hex_to_rgb("2f6feb"), [47, 111, 235]);
        assert_eq!(color::hex_to_rgb("#abc"), [0xaa, 0xbb, 0xcc]);
        assert_eq!(color::hex_to_rgb(""), [136, 136, 136]);
    }

    #[test]
    fn mix_matches_js() {
        let a = [47.0, 111.0, 235.0];
        let b = [255.0, 255.0, 255.0];
        assert_eq!(color::mix(a, b, 0.5), [151.0, 183.0, 245.0]);
        // Negative t pushes channels below the source, matching JS Math.round.
        assert_eq!(
            color::mix([0.0, 0.0, 0.0], [255.0, 255.0, 255.0], -0.5),
            [-127.0, -127.0, -127.0]
        );
        // Half toward +Infinity (JS Math.round), not Rust's round-away-from-zero.
        assert_eq!(color::mix_channel(0.0, 255.0, -1.0 / 510.0), 0.0);
    }

    #[test]
    fn rgba_matches_js() {
        assert_eq!(
            color::rgba([47.0, 111.0, 235.0], 0.16),
            "rgba(47,111,235,0.16)"
        );
        assert_eq!(color::rgba([47.0, 111.0, 235.0], 0.0), "rgba(47,111,235,0)");
    }

    #[test]
    fn easing_matches_js() {
        assert_eq!(easing::lerp(10.0, 20.0, 0.3), 13.0);
        assert_eq!(easing::clamp(3.0, 5.0, 10.0), 5.0);
        assert_eq!(easing::clamp(12.0, 5.0, 10.0), 10.0);
        assert_eq!(easing::clamp(7.0, 5.0, 10.0), 7.0);
        assert!(approx(easing::smoothstep(0.0, 1.0, 0.3), 0.216, 1e-15));
        assert_eq!(easing::smoothstep(0.0, 1.0, 1.5), 1.0);
        assert!(approx(
            easing::smoothstep(0.2, 0.8, 0.55),
            0.62384259259259245,
            1e-12
        ));
    }

    #[test]
    fn noise_matches_js() {
        // JavaScript reference values (V8, `node`) from `engine.js`.
        assert!(approx(noise::hash2(1.0, 2.0), 0.48287847430947295, 1e-10));
        assert!(approx(noise::hash2(0.5, 0.5), 0.3565402053136495, 1e-10));
        assert!(approx(noise::noise2(0.5, 0.5), 0.31240139567762526, 1e-10));
        assert!(approx(noise::noise2(1.5, 2.5), 0.5859027870733371, 1e-10));
        assert!(approx(noise::noise2(3.7, 4.2), 0.33652286321481917, 1e-10));
        assert!(approx(noise::noise2(10.3, 20.7), 0.24561563219474458, 1e-10));
        assert!(approx(noise::noise2(-0.5, -0.5), 0.43759860432237474, 1e-10));
    }
}
