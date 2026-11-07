//! Yolo Scroll deterministic animation math, compiled to WebAssembly.
//!
//! Exposes the pure-computation half of yolo-scroll — easing/smoothstep,
//! scroll-progress mapping, and the scramble/type-in glyph stream — so the
//! build-free front end can run the per-frame math in WASM. The math is a
//! faithful port of `wp-content/plugins/yolo-scroll/assets/js/yolo-scroll.js`
//! and is verified against JS reference values in `#[cfg(test)]`.

pub mod easing;
pub mod glyphs;
pub mod progress;

use wasm_bindgen::prelude::*;

/// Clamp `value` into the inclusive `[min, max]` range.
#[wasm_bindgen]
pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    easing::clamp(value, min, max)
}

/// Cubic smoothstep easing: `t² · (3 − 2t)`.
#[wasm_bindgen]
pub fn smoothstep(value: f64) -> f64 {
    easing::smoothstep(value)
}

/// Map viewport/scroll geometry to a `[0, 1]` progress value.
#[wasm_bindgen]
pub fn scroll_progress(viewport_height: f64, start: f64, end: f64, rect_top: f64) -> f64 {
    progress::scroll_progress(viewport_height, start, end, rect_top)
}

/// 32-bit string hash (the per-text-target scramble seed).
#[wasm_bindgen]
pub fn hash_string(value: &str) -> f64 {
    glyphs::hash_string(value)
}

/// The scramble glyph at `(seed, offset)`.
#[wasm_bindgen]
pub fn random_glyph(seed: f64, offset: usize) -> String {
    glyphs::random_glyph(seed, offset)
}

/// Rendered scramble text for `progress` and a `tick_seed` (node seed + tick).
#[wasm_bindgen]
pub fn scramble_text(source: &str, progress: f64, tick_seed: f64) -> String {
    glyphs::scramble_text(source, progress, tick_seed)
}

/// Rendered type-in text for `progress`.
#[wasm_bindgen]
pub fn type_in_text(source: &str, progress: f64) -> String {
    glyphs::type_in_text(source, progress)
}
