//! BrandBoss deterministic color engine, compiled to WebAssembly.
//!
//! Exposes the pure-computation half of BrandBoss (OKLCH conversions, WCAG
//! contrast, palette composition) so the admin front end can compute palettes
//! and contrast live in the browser without a server round-trip. The math is
//! a byte-for-byte port of the PHP classes `BSC_Color` and `BSC_Contrast` and
//! is verified against PHP reference values in `#[cfg(test)]`.

pub mod color;
pub mod contrast;

use serde::Serialize;
use wasm_bindgen::prelude::*;

/// WCAG relative luminance of a hex color.
#[wasm_bindgen]
pub fn luminance(hex: &str) -> f64 {
    contrast::luminance(hex)
}

/// WCAG contrast ratio between two hex colors, rounded to 2 decimals.
#[wasm_bindgen]
pub fn contrast_ratio(a: &str, b: &str) -> f64 {
    contrast::ratio(a, b)
}

/// Full contrast matrix for a JSON array of `{"slug","hex"}` objects.
/// Returns a JSON array of `{"fg","bg","grade":{...}}`.
#[wasm_bindgen]
pub fn contrast_matrix(colors_json: &str) -> String {
    let colors: Vec<ColorInput> = serde_json::from_str(colors_json).unwrap_or_default();
    let pairs: Vec<(String, String)> = colors
        .into_iter()
        .map(|c| (c.slug, c.hex))
        .collect();
    serde_json::to_string(&contrast::matrix(&pairs)).unwrap_or_else(|_| "[]".to_string())
}

/// Compose the full 12-role palette from a JSON array of 1–3 seed hex strings.
/// Returns a JSON object matching PHP's `BSC_Color::compose()`.
#[wasm_bindgen]
pub fn compose_palette(seeds_json: &str) -> String {
    let seeds: Vec<String> = serde_json::from_str(seeds_json).unwrap_or_default();
    serde_json::to_string(&color::compose(&seeds)).unwrap_or_else(|_| "{}".to_string())
}

/// The plugin's `colors[]` rows (slug/name/hex/role/usage) for a seed array.
/// Returns a JSON array matching PHP's `BSC_Color::to_brand_colors()`.
#[wasm_bindgen]
pub fn brand_colors(seeds_json: &str) -> String {
    let seeds: Vec<String> = serde_json::from_str(seeds_json).unwrap_or_default();
    let palette = color::compose(&seeds);
    serde_json::to_string(&to_brand_colors(&palette)).unwrap_or_else(|_| "[]".to_string())
}

#[derive(serde::Deserialize)]
struct ColorInput {
    slug: String,
    hex: String,
}

#[derive(Serialize)]
pub struct ColorRow {
    pub slug: String,
    pub name: String,
    pub hex: String,
    pub role: String,
    pub usage: String,
}

/// Port of `BSC_Color::to_brand_colors()`.
fn to_brand_colors(palette: &color::Palette) -> Vec<ColorRow> {
    let row = |slug: &str, name: &str, hex: &str, role: &str, usage: &str| ColorRow {
        slug: slug.to_string(),
        name: name.to_string(),
        hex: hex.to_string(),
        role: role.to_string(),
        usage: usage.to_string(),
    };
    vec![
        row("primary", "Primary", &palette.primary, "primary",
            "The brand anchor. Committed use: hero surfaces, key CTAs, brand moments. For text on light surfaces use Primary Text instead."),
        row("primary-text", "Primary Text", &palette.primary_text, "primary",
            "Contrast-gated variant of Primary (≥4.5:1 on Surface). Use for links and colored text; never use raw Primary for body-size text on light backgrounds."),
        row("secondary", "Secondary", &palette.secondary, "secondary",
            "Depth and hierarchy: section backgrounds, footers, secondary buttons."),
        row("accent", "Accent", &palette.accent, "accent",
            "Maximum 5–10% of any composition and at most 2 visible uses per screen (one highlight + one CTA). Links count toward the budget."),
        row("ink", "Ink", &palette.ink, "text",
            "Default text color. Tinted toward the brand hue; never use pure #000."),
        row("muted", "Muted", &palette.muted, "text",
            "Secondary text and captions only — verify 4.5:1 on its actual background before use."),
        row("surface", "Surface", &palette.surface, "surface",
            "Cards and raised elements. Off-white with brand-hue tint; never pure #fff."),
        row("bg", "Background", &palette.bg, "neutral",
            "Page background. Neutrals (bg/surface/ink/muted/border) should carry 70–90% of every composition."),
        row("border", "Border", &palette.border, "neutral",
            "Hairlines and dividers. 1px at this value; on dark surfaces prefer rgba(255,255,255,.08)."),
        row("success", "Success", &palette.success, "accent",
            "Semantic only — confirmation states. Never decorative."),
        row("warning", "Warning", &palette.warning, "accent",
            "Semantic only — caution states. Never decorative."),
        row("danger", "Danger", &palette.danger, "accent",
            "Semantic only — errors and destructive actions. Never decorative."),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn hex_roundtrip() {
        assert_eq!(color::hex_to_rgb("#2f6feb"), [47, 111, 235]);
        assert_eq!(color::hex_to_rgb("#2f6feb"), color::hex_to_rgb("2f6feb"));
        assert_eq!(color::hex_to_rgb("#abc"), [0xaa, 0xbb, 0xcc]);
    }

    #[test]
    fn oklch_matches_php() {
        let [l, c, h] = color::to_oklch("#2f6feb");
        assert!(approx(l, 0.5725902333362116, 1e-12), "L = {l}");
        assert!(approx(c, 0.19894878197496874, 1e-12), "C = {c}");
        assert!(approx(h, 261.8366937990222, 1e-12), "H = {h}");
        assert_eq!(color::from_oklch(0.60, 0.12, 260.0), "#5480c7");
    }

    #[test]
    fn contrast_matches_php() {
        assert!(approx(contrast::luminance("#2f6feb"), 0.17971375033731, 1e-12));
        assert_eq!(contrast::ratio("#2f6feb", "#ffffff"), 4.57);
        assert_eq!(contrast::ratio("#2f6feb", "#f7f8fa"), 4.3);
        let g = contrast::grade(4.6);
        assert!(g.aa_normal && g.aa_large && !g.aaa_normal && g.aaa_large && g.ui_components);
    }

    #[test]
    fn compose_single_seed_matches_php() {
        let p = color::compose(&["#2f6feb".to_string()]);
        assert_eq!(p.primary, "#2f6feb");
        assert_eq!(p.secondary, "#063b9e");
        assert_eq!(p.accent, "#b17cf7");
        assert_eq!(p.ink, "#151b24");
        assert_eq!(p.surface, "#f7faff");
        assert_eq!(p.bg, "#ecf0f8");
        assert_eq!(p.muted, "#6c727c");
        assert_eq!(p.border, "#d3d8e0");
        assert_eq!(p.primary_text, "#2969e4");
        assert_eq!(p.ramp.get("50").unwrap(), "#e3f6ff");
        assert_eq!(p.ramp.get("100").unwrap(), "#b7dcff");
        assert_eq!(p.ramp.get("200").unwrap(), "#9ec2ff");
        assert_eq!(p.ramp.get("300").unwrap(), "#6ba5ff");
        assert_eq!(p.ramp.get("400").unwrap(), "#538cf6");
        assert_eq!(p.ramp.get("500").unwrap(), "#2f6feb");
        assert_eq!(p.ramp.get("600").unwrap(), "#265ac0");
        assert_eq!(p.ramp.get("700").unwrap(), "#0e42a6");
        assert_eq!(p.ramp.get("800").unwrap(), "#00298c");
        assert_eq!(p.ramp.get("900").unwrap(), "#000b73");
        assert_eq!(p.success, "#009342");
        assert_eq!(p.warning, "#b88100");
        assert_eq!(p.danger, "#bd423a");
        assert_eq!(p.dark.bg, "#0f1217");
        assert_eq!(p.dark.surface, "#1a1d23");
        assert_eq!(p.dark.ink, "#e6e8ec");
        assert_eq!(p.dark.muted, "#9498a0");
        assert_eq!(p.dark.primary, "#3b7cf9");
    }

    #[test]
    fn compose_three_seeds_matches_php() {
        let p = color::compose(&[
            "#2f6feb".to_string(),
            "#f04e98".to_string(),
            "#14c9a8".to_string(),
        ]);
        assert_eq!(p.primary, "#2f6feb");
        assert_eq!(p.secondary, "#f04e98");
        assert_eq!(p.accent, "#14c9a8");
        // Neutrals derive from seed 1, so they match the single-seed case.
        assert_eq!(p.ink, "#151b24");
        assert_eq!(p.surface, "#f7faff");
        assert_eq!(p.dark.primary, "#3b7cf9");
    }

    #[test]
    fn brand_colors_rows() {
        let rows = to_brand_colors(&color::compose(&["#2f6feb".to_string()]));
        assert_eq!(rows.len(), 12);
        assert_eq!(rows[0].slug, "primary");
        assert_eq!(rows[0].hex, "#2f6feb");
        assert_eq!(rows[1].slug, "primary-text");
        assert_eq!(rows[1].hex, "#2969e4");
        assert_eq!(rows[11].slug, "danger");
        assert_eq!(rows[11].hex, "#bd423a");
    }
}
