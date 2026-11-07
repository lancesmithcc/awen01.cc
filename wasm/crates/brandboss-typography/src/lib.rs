//! BrandBoss typography math, compiled to WebAssembly.
//!
//! Exposes the pure-computation typography and layout half of BrandBoss — the
//! modular type scale (base 18, ratio 1.25), the 8px spacing scale, and the
//! layout-ratio math — so the admin front end can preview the resolved type,
//! spacing, and grid scales live in the browser without a server round-trip.
//! The math is a faithful port of the PHP functions
//! `BSC_Export::resolved_scale()`, `BSC_Export::resolved_spacing()`, and the
//! token-generation half of `BSC_GeneratePress::write_tokens_css()`, and is
//! verified against PHP reference values in `#[cfg(test)]`.

pub mod layout;
pub mod scale;
pub mod spacing;

use indexmap::IndexMap;
use wasm_bindgen::prelude::*;

fn parse_levels(json: &str) -> IndexMap<String, i32> {
    serde_json::from_str(json).unwrap_or_default()
}

fn parse_scale(json: &str) -> Vec<f64> {
    serde_json::from_str(json).unwrap_or_default()
}

/// Resolve the modular type scale in px (`round(base * ratio^step, 1)`).
/// `levels_json` is an ordered JSON object of `{ name: step }`, e.g.
/// `{"caption":-1,"body":0,"h1":5}`. Returns a JSON object `{ name: px }`.
#[wasm_bindgen]
pub fn type_scale_px(base_px: f64, ratio: f64, levels_json: &str) -> String {
    let levels = parse_levels(levels_json);
    serde_json::to_string(&scale::resolved_scale(base_px, ratio, &levels))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Resolve the type scale in rem (`round((base * ratio^step) / 16, 3)`),
/// matching the `--bsc-font-*` tokens in `tokens.css`. Returns `{ name: rem }`.
#[wasm_bindgen]
pub fn font_rem(base_px: f64, ratio: f64, levels_json: &str) -> String {
    let levels = parse_levels(levels_json);
    serde_json::to_string(&scale::font_rem(base_px, ratio, &levels))
        .unwrap_or_else(|_| "{}".to_string())
}

/// Resolve the spacing scale in px (`round(base * multiplier, 1)`).
/// `scale_json` is a JSON array of multipliers (e.g. `[0.5,1,2,3,4,6,8,12]`).
/// Returns a JSON array of px values.
#[wasm_bindgen]
pub fn spacing_px(base_px: f64, scale_json: &str) -> String {
    let multipliers = parse_scale(scale_json);
    serde_json::to_string(&spacing::resolved_spacing(base_px, &multipliers))
        .unwrap_or_else(|_| "[]".to_string())
}

/// Resolve the spacing scale as CSS token strings (`--bsc-space-*`), matching
/// `tokens.css` (2 decimals with trailing zeros stripped). Returns a JSON array
/// of strings.
#[wasm_bindgen]
pub fn spacing_tokens(base_px: f64, scale_json: &str) -> String {
    let multipliers = parse_scale(scale_json);
    serde_json::to_string(&spacing::spacing_tokens(base_px, &multipliers))
        .unwrap_or_else(|_| "[]".to_string())
}

/// Parse an image aspect-ratio spec (`"16:9"`, `"4:3"`, `"1:1"`, …) into
/// `{ "w": 16, "h": 9, "ratio": 1.7778 }`.
#[wasm_bindgen]
pub fn aspect_ratio(spec: &str) -> String {
    serde_json::to_string(&layout::aspect_ratio(spec)).unwrap_or_else(|_| "{}".to_string())
}

/// Width of one grid column at a given content width:
/// `(content_width - (columns - 1) * gutter) / columns`.
#[wasm_bindgen]
pub fn grid_column_width(content_width_px: f64, columns: u32, gutter_px: f64) -> f64 {
    layout::grid_column_width(content_width_px, columns, gutter_px)
}

/// Width of a span of `span` columns (including intervening gutters).
#[wasm_bindgen]
pub fn grid_span_width(content_width_px: f64, columns: u32, gutter_px: f64, span: u32) -> f64 {
    layout::grid_span_width(content_width_px, columns, gutter_px, span)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn num(v: &Value) -> f64 {
        v.as_f64().unwrap()
    }

    #[test]
    fn type_scale_px_json_roundtrip() {
        let json = type_scale_px(18.0, 1.25, r#"{"caption":-1,"body":0,"h1":5}"#);
        let v: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(num(&v["caption"]), 14.4);
        assert_eq!(num(&v["body"]), 18.0);
        assert_eq!(num(&v["h1"]), 54.9);
    }

    #[test]
    fn font_rem_json_roundtrip() {
        let json = font_rem(18.0, 1.25, r#"{"caption":-1,"body":0,"h1":5}"#);
        let v: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(num(&v["caption"]), 0.9);
        assert_eq!(num(&v["body"]), 1.125);
        assert_eq!(num(&v["h1"]), 3.433);
    }

    #[test]
    fn spacing_px_json_roundtrip() {
        let json = spacing_px(8.0, "[0.5,1,2,3,4,6,8,12]");
        let v: Value = serde_json::from_str(&json).unwrap();
        let arr: Vec<f64> = v.as_array().unwrap().iter().map(num).collect();
        assert_eq!(arr, vec![4.0, 8.0, 16.0, 24.0, 32.0, 48.0, 64.0, 96.0]);
    }

    #[test]
    fn spacing_tokens_json_roundtrip() {
        let json = spacing_tokens(8.0, "[0.5,1,2,3,4,6,8,12]");
        let v: Value = serde_json::from_str(&json).unwrap();
        let arr: Vec<&str> = v.as_array().unwrap().iter().map(|s| s.as_str().unwrap()).collect();
        assert_eq!(arr, vec!["4", "8", "16", "24", "32", "48", "64", "96"]);
    }

    #[test]
    fn aspect_ratio_json_roundtrip() {
        let v: Value = serde_json::from_str(&aspect_ratio("16:9")).unwrap();
        assert_eq!(v["w"].as_u64(), Some(16));
        assert_eq!(v["h"].as_u64(), Some(9));
        assert_eq!(num(&v["ratio"]), 1.7778);
    }

    #[test]
    fn malformed_input_degrades_gracefully() {
        assert_eq!(type_scale_px(18.0, 1.25, "not json"), "{}");
        assert_eq!(spacing_px(8.0, "not json"), "[]");
        assert_eq!(spacing_tokens(8.0, "not json"), "[]");
        assert_eq!(grid_column_width(1200.0, 12, 24.0), 78.0);
        assert_eq!(grid_span_width(1200.0, 12, 24.0, 2), 180.0);
    }
}
