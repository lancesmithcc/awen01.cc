//! Deterministic 2D value noise, a faithful port of `engine.js` `hash2` /
//! `noise2`. The hash is cheap and deterministic; it matches the JavaScript
//! values up to floating-point rounding, which is invisible to the renderer.

/// Cheap deterministic 2D hash (`engine.js` `hash2`).
pub fn hash2(x: f64, y: f64) -> f64 {
    let s = (x * 127.1 + y * 311.7).sin() * 43758.5453;
    s - s.floor()
}

/// Smooth 2D value noise in `0..1` (`engine.js` `noise2`).
pub fn noise2(x: f64, y: f64) -> f64 {
    let xi = x.floor();
    let yi = y.floor();
    let xf = x - xi;
    let yf = y - yi;
    let u = xf * xf * (3.0 - 2.0 * xf);
    let v = yf * yf * (3.0 - 2.0 * yf);
    let a = hash2(xi, yi);
    let b = hash2(xi + 1.0, yi);
    let c = hash2(xi, yi + 1.0);
    let d = hash2(xi + 1.0, yi + 1.0);
    crate::easing::lerp(
        crate::easing::lerp(a, b, u),
        crate::easing::lerp(c, d, u),
        v,
    )
}
