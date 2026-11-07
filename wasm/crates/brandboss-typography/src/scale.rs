//! Modular type scale.
//!
//! A faithful port of `BSC_Export::resolved_scale()` and the font-size half of
//! `BSC_GeneratePress::write_tokens_css()` from
//! `wp-content/plugins/brandboss/includes/`. Everything here is pure math and
//! produces the same resolved values as the PHP implementation (verified by
//! unit tests against PHP reference values).

use indexmap::IndexMap;

/// Round to 1 decimal place (matches PHP's `round($v, 1)` for the non-negative
/// sizes this scale produces — round half away from zero).
pub fn round1(v: f64) -> f64 {
    (v * 10.0).round() / 10.0
}

/// Round to 3 decimal places (matches PHP's `round($v, 3)`).
pub fn round3(v: f64) -> f64 {
    (v * 1000.0).round() / 1000.0
}

/// Resolve the modular type scale in pixels (port of `resolved_scale`).
///
/// Each level name maps to `round(base_px * ratio^step, 1)`. The default brand
/// register is base 18, ratio 1.25.
pub fn resolved_scale(base_px: f64, ratio: f64, levels: &IndexMap<String, i32>) -> IndexMap<String, f64> {
    let mut out = IndexMap::new();
    for (name, step) in levels {
        out.insert(name.clone(), round1(base_px * ratio.powi(*step)));
    }
    out
}

/// Resolve the type scale in rem (port of the `--bsc-font-*` tokens emitted by
/// `write_tokens_css`): `round((base_px * ratio^step) / 16, 3)`.
pub fn font_rem(base_px: f64, ratio: f64, levels: &IndexMap<String, i32>) -> IndexMap<String, f64> {
    let mut out = IndexMap::new();
    for (name, step) in levels {
        let size = base_px * ratio.powi(*step);
        out.insert(name.clone(), round3(size / 16.0));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn levels(extrapolate: bool) -> IndexMap<String, i32> {
        let pairs: &[(&str, i32)] = if extrapolate {
            &[
                ("caption", -2),
                ("small", -1),
                ("body", 0),
                ("h5", 1),
                ("h4", 2),
                ("h3", 3),
                ("h2", 4),
                ("h1", 5),
            ]
        } else {
            // Brand defaults (class-bsc-brand.php).
            &[
                ("caption", -1),
                ("body", 0),
                ("h6", 1),
                ("h5", 1),
                ("h4", 2),
                ("h3", 3),
                ("h2", 4),
                ("h1", 5),
            ]
        };
        pairs.iter().map(|(n, s)| (n.to_string(), *s)).collect()
    }

    #[test]
    fn resolved_scale_matches_php_extrapolate_levels() {
        let s = resolved_scale(18.0, 1.25, &levels(true));
        assert_eq!(s["caption"], 11.5);
        assert_eq!(s["small"], 14.4);
        assert_eq!(s["body"], 18.0);
        assert_eq!(s["h5"], 22.5);
        assert_eq!(s["h4"], 28.1);
        assert_eq!(s["h3"], 35.2);
        assert_eq!(s["h2"], 43.9);
        assert_eq!(s["h1"], 54.9);
    }

    #[test]
    fn resolved_scale_matches_php_brand_defaults() {
        let s = resolved_scale(18.0, 1.25, &levels(false));
        assert_eq!(s["caption"], 14.4);
        assert_eq!(s["body"], 18.0);
        assert_eq!(s["h6"], 22.5);
        assert_eq!(s["h5"], 22.5);
        assert_eq!(s["h4"], 28.1);
        assert_eq!(s["h3"], 35.2);
        assert_eq!(s["h2"], 43.9);
        assert_eq!(s["h1"], 54.9);
    }

    #[test]
    fn font_rem_matches_php_extrapolate_levels() {
        let s = font_rem(18.0, 1.25, &levels(true));
        assert_eq!(s["caption"], 0.72);
        assert_eq!(s["small"], 0.9);
        assert_eq!(s["body"], 1.125);
        assert_eq!(s["h5"], 1.406);
        assert_eq!(s["h4"], 1.758);
        assert_eq!(s["h3"], 2.197);
        assert_eq!(s["h2"], 2.747);
        assert_eq!(s["h1"], 3.433);
    }

    #[test]
    fn font_rem_matches_php_brand_defaults() {
        let s = font_rem(18.0, 1.25, &levels(false));
        assert_eq!(s["caption"], 0.9);
        assert_eq!(s["body"], 1.125);
        assert_eq!(s["h6"], 1.406);
        assert_eq!(s["h5"], 1.406);
        assert_eq!(s["h4"], 1.758);
        assert_eq!(s["h3"], 2.197);
        assert_eq!(s["h2"], 2.747);
        assert_eq!(s["h1"], 3.433);
    }

    #[test]
    fn golden_ratio_matches_php() {
        // 18 * 1.618^step, rounded to 1 decimal (non-dyadic ratio check).
        let s = resolved_scale(18.0, 1.618, &levels(false));
        assert_eq!(s["caption"], 11.1);
        assert_eq!(s["body"], 18.0);
        assert_eq!(s["h1"], 199.6);
    }
}
