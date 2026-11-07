//! Easing helpers, a faithful port of the `window.UltraBGs.utils` functions in
//! `wp-content/plugins/ultrabgs/assets/js/engine.js`.

/// Linear interpolation (`engine.js` `lerp`).
pub fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

/// Clamp `v` into `[a, b]` (`engine.js` `clamp`).
pub fn clamp(v: f64, a: f64, b: f64) -> f64 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}

/// GLSL-style smoothstep over `[e0, e1]` (`engine.js` `smoothstep`).
pub fn smoothstep(e0: f64, e1: f64, x: f64) -> f64 {
    let t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}
