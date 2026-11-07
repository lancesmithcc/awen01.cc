//! Layout-ratio math.
//!
//! Pure-computation geometry derived from the BrandBoss `ratios` and `layout`
//! model (`wp-content/plugins/brandboss/includes/class-bsc-brand.php`):
//! image crop aspect ratios (`16:9`, `4:3`, `1:1`, …) and the column geometry
//! of the 12-column grid (columns, gutters, content width).

use serde::Serialize;

fn round4(v: f64) -> f64 {
    (v * 10000.0).round() / 10000.0
}

/// A parsed image aspect ratio (`w:h`), with its numeric width/height ratio.
#[derive(Serialize)]
pub struct Aspect {
    pub w: u32,
    pub h: u32,
    pub ratio: f64,
}

/// Parse an image aspect-ratio spec such as `"16:9"`, `"4:3"` or `"1:1"` into
/// `{ w, h, ratio }` where `ratio = w / h` rounded to 4 decimals. Malformed
/// input yields `{ w: 0, h: 0, ratio: 0 }`.
pub fn aspect_ratio(spec: &str) -> Aspect {
    let mut parts = spec.split(':');
    let w = parts.next().and_then(|s| s.trim().parse::<u32>().ok()).unwrap_or(0);
    let h = parts.next().and_then(|s| s.trim().parse::<u32>().ok()).unwrap_or(0);
    let ratio = if h != 0 { round4(w as f64 / h as f64) } else { 0.0 };
    Aspect { w, h, ratio }
}

/// Width of a single grid column at a given content width:
/// `(content_width - (columns - 1) * gutter) / columns`.
pub fn grid_column_width(content_width_px: f64, columns: u32, gutter_px: f64) -> f64 {
    if columns == 0 {
        return 0.0;
    }
    (content_width_px - (columns as f64 - 1.0) * gutter_px) / columns as f64
}

/// Width of a span of `span` columns, including the intervening gutters:
/// `span * column + (span - 1) * gutter`.
pub fn grid_span_width(content_width_px: f64, columns: u32, gutter_px: f64, span: u32) -> f64 {
    if span == 0 {
        return 0.0;
    }
    let col = grid_column_width(content_width_px, columns, gutter_px);
    span as f64 * col + (span as f64 - 1.0) * gutter_px
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aspect_ratios_match() {
        assert_eq!((aspect_ratio("16:9").w, aspect_ratio("16:9").h), (16, 9));
        assert_eq!(aspect_ratio("16:9").ratio, 1.7778);
        assert_eq!(aspect_ratio("4:3").ratio, 1.3333);
        assert_eq!(aspect_ratio("3:2").ratio, 1.5);
        assert_eq!(aspect_ratio("4:5").ratio, 0.8);
        assert_eq!(aspect_ratio("1:1").ratio, 1.0);
    }

    #[test]
    fn aspect_ratio_trims_whitespace_and_rejects_garbage() {
        assert_eq!(aspect_ratio(" 16 : 9 ").ratio, 1.7778);
        let bad = aspect_ratio("nonsense");
        assert_eq!((bad.w, bad.h, bad.ratio), (0, 0, 0.0));
    }

    #[test]
    fn grid_column_width_matches_php_model() {
        // 1200px content, 12 columns, 24px gutters → (1200 - 11*24)/12 = 78.
        assert_eq!(grid_column_width(1200.0, 12, 24.0), 78.0);
    }

    #[test]
    fn grid_span_width_matches_php_model() {
        // span 2 → 2*78 + 1*24 = 180; full span 12 → 12*78 + 11*24 = 1200.
        assert_eq!(grid_span_width(1200.0, 12, 24.0, 2), 180.0);
        assert_eq!(grid_span_width(1200.0, 12, 24.0, 12), 1200.0);
        assert_eq!(grid_span_width(1200.0, 12, 24.0, 0), 0.0);
    }

    #[test]
    fn grid_guards_zero_columns() {
        assert_eq!(grid_column_width(1200.0, 0, 24.0), 0.0);
    }
}
