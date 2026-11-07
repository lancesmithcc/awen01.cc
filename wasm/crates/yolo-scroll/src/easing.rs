//! Easing and clamping primitives.
//!
//! A faithful port of the `clamp` and `smoothstep` helpers from
//! `wp-content/plugins/yolo-scroll/assets/js/yolo-scroll.js`.

/// Clamp `value` into the inclusive `[min, max]` range.
pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

/// Cubic smoothstep easing: `t² · (3 − 2t)`.
pub fn smoothstep(value: f64) -> f64 {
    value * value * (3.0 - 2.0 * value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_matches_js() {
        assert_eq!(clamp(0.5, 0.0, 1.0), 0.5);
        assert_eq!(clamp(-0.5, 0.0, 1.0), 0.0);
        assert_eq!(clamp(1.5, 0.0, 1.0), 1.0);
    }

    #[test]
    fn smoothstep_matches_js() {
        let cases = [(0.0, 0.0), (0.25, 0.15625), (0.5, 0.5), (0.75, 0.84375), (1.0, 1.0)];
        for (input, expected) in cases {
            assert_eq!(smoothstep(input), expected, "smoothstep({input})");
        }
    }
}
