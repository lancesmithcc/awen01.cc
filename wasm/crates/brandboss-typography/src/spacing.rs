//! 8px spacing scale.
//!
//! A faithful port of `BSC_Export::resolved_spacing()` and the spacing half of
//! `BSC_GeneratePress::write_tokens_css()` from
//! `wp-content/plugins/brandboss/includes/`. The default brand register is a
//! base unit of 8px with a single multiplicative scale and nothing off-scale.

/// Resolve the spacing scale in pixels (port of `resolved_spacing`):
/// `round(base_px * multiplier, 1)` for each multiplier.
pub fn resolved_spacing(base_px: f64, scale: &[f64]) -> Vec<f64> {
    scale
        .iter()
        .map(|m| (base_px * m * 10.0).round() / 10.0)
        .collect()
}

/// CSS token strings for the spacing scale (port of the `--bsc-space-*` tokens
/// emitted by `write_tokens_css`): `number_format(v, 2)` with trailing zeros and
/// a trailing decimal point stripped (e.g. `12.00` → `12`, `2.50` → `2.5`).
pub fn spacing_tokens(base_px: f64, scale: &[f64]) -> Vec<String> {
    scale.iter().map(|m| format_css(base_px * m)).collect()
}

/// `number_format($v, 2, '.', '')` then `rtrim(..., '0')` then `rtrim(..., '.')`.
fn format_css(v: f64) -> String {
    // Round half away from zero to 2 decimals (matches PHP number_format).
    let r = (v * 100.0).round() / 100.0;
    let s = format!("{:.2}", r);
    s.trim_end_matches('0').trim_end_matches('.').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolved_spacing_matches_php_extrapolate_scale() {
        // Extrapolate register: [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16].
        let scale = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0, 16.0];
        assert_eq!(
            resolved_spacing(8.0, &scale),
            vec![4.0, 8.0, 12.0, 16.0, 24.0, 32.0, 48.0, 64.0, 96.0, 128.0]
        );
    }

    #[test]
    fn resolved_spacing_matches_php_brand_defaults() {
        // Brand defaults: [0.5, 1, 2, 3, 4, 6, 8, 12].
        let scale = [0.5, 1.0, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0];
        assert_eq!(
            resolved_spacing(8.0, &scale),
            vec![4.0, 8.0, 16.0, 24.0, 32.0, 48.0, 64.0, 96.0]
        );
    }

    #[test]
    fn spacing_tokens_matches_php_css() {
        let scale = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0, 16.0];
        assert_eq!(
            spacing_tokens(8.0, &scale),
            vec!["4", "8", "12", "16", "24", "32", "48", "64", "96", "128"]
        );
    }

    #[test]
    fn spacing_tokens_preserve_fractional_values() {
        // 8 * 0.125 = 1 → "1"; 8 * 0.3125 = 2.5 → "2.5".
        let scale = [0.125, 0.3125];
        assert_eq!(spacing_tokens(8.0, &scale), vec!["1", "2.5"]);
    }
}
