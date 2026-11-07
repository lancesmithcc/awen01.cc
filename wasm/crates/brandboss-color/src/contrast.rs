//! WCAG 2.x contrast utilities.
//!
//! A faithful port of `BSC_Contrast` from `wp-content/plugins/brandboss/includes/class-bsc-contrast.php`.

use serde::Serialize;

/// Relative luminance of a hex color per WCAG 2.x.
pub fn luminance(hex: &str) -> f64 {
    let [r, g, b] = super::color::hex_to_rgb(hex);
    let lin = |c: u8| {
        let c = c as f64 / 255.0;
        if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    };
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/// Contrast ratio between two hex colors, rounded to 2 decimals.
pub fn ratio(hex1: &str, hex2: &str) -> f64 {
    let l1 = luminance(hex1);
    let l2 = luminance(hex2);
    let hi = l1.max(l2);
    let lo = l1.min(l2);
    (((hi + 0.05) / (lo + 0.05)) * 100.0).round() / 100.0
}

#[derive(Serialize)]
pub struct Grade {
    pub ratio: f64,
    pub aa_normal: bool,
    pub aa_large: bool,
    pub aaa_normal: bool,
    pub aaa_large: bool,
    pub ui_components: bool,
}

/// Grade a ratio against WCAG pass thresholds.
pub fn grade(ratio: f64) -> Grade {
    Grade {
        ratio,
        aa_normal: ratio >= 4.5,
        aa_large: ratio >= 3.0,
        aaa_normal: ratio >= 7.0,
        aaa_large: ratio >= 4.5,
        ui_components: ratio >= 3.0,
    }
}

#[derive(Serialize)]
pub struct PairGrade {
    pub fg: String,
    pub bg: String,
    pub grade: Grade,
}

/// Full matrix for a list of `(slug, hex)` colors: every pair, graded.
pub fn matrix(colors: &[(String, String)]) -> Vec<PairGrade> {
    let mut out = Vec::new();
    for (a_slug, a_hex) in colors {
        for (b_slug, b_hex) in colors {
            if a_slug == b_slug {
                continue;
            }
            out.push(PairGrade {
                fg: a_slug.clone(),
                bg: b_slug.clone(),
                grade: grade(ratio(a_hex, b_hex)),
            });
        }
    }
    out
}
