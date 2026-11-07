//! Scroll-progress mapping.
//!
//! A faithful port of `computeProgress()` from
//! `wp-content/plugins/yolo-scroll/assets/js/yolo-scroll.js`. The DOM-dependent
//! bottom-of-page clamp stays in JS; only the pure `(startPx − rectTop) / range`
//! math moves here.

use crate::easing::clamp;

/// Map viewport/scroll geometry to a `[0, 1]` progress value.
///
/// `start` and `end` are percentages of the viewport height (e.g. `90` and
/// `50`); `rect_top` is the element's top edge in viewport coordinates (CSS px).
/// Mirrors the JS `const startPx = vh * (start / 100)` … `clamp(...)` chain.
pub fn scroll_progress(viewport_height: f64, start: f64, end: f64, rect_top: f64) -> f64 {
    let start_px = viewport_height * (start / 100.0);
    let end_px = viewport_height * (end / 100.0);
    // JS: `const range = (startPx - endPx) || 1;` — 0/-0/NaN become 1.
    let mut range = start_px - end_px;
    if range == 0.0 || range.is_nan() {
        range = 1.0;
    }
    clamp((start_px - rect_top) / range, 0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn scroll_progress_matches_js() {
        assert_eq!(scroll_progress(800.0, 90.0, 50.0, 300.0), 1.0);
        assert_eq!(scroll_progress(800.0, 90.0, 50.0, 1000.0), 0.0);
        assert_eq!(scroll_progress(800.0, 90.0, 50.0, -100.0), 1.0);
        assert!(approx(scroll_progress(1080.0, 85.0, 15.0, 500.0), 0.5529100529100529, 1e-12));
        assert_eq!(scroll_progress(1080.0, 85.0, 15.0, 1080.0), 0.0);
    }

    #[test]
    fn zero_range_falls_back_to_one() {
        // start == end → JS `(startPx - endPx) || 1` yields range 1, so progress
        // is `startPx - rectTop` (400 = 800·0.5) clamped to [0, 1].
        assert_eq!(scroll_progress(800.0, 50.0, 50.0, 399.5), 0.5);
        assert_eq!(scroll_progress(800.0, 50.0, 50.0, 300.0), 1.0);
    }
}
