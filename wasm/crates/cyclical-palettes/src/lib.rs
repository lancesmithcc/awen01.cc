//! Cyclical Dynamic Palettes rule-matching engine, compiled to WebAssembly.
//!
//! Exposes the pure-computation half of `cyclical-dynamic-palettes` — the
//! date/time window matching and palette-rule resolution — so the front end
//! can re-resolve the active palette live in the browser without a server
//! round-trip. The logic is a faithful port of the PHP `cydp_date_match`,
//! `cydp_time_match` and `cydp_resolve_result` functions and their mirrored
//! inline JavaScript, and is verified against reference values in
//! `#[cfg(test)]`. CSS-variable application (and DOM reads) stays in JS.

pub mod matching;
pub mod resolve;

use wasm_bindgen::prelude::*;

/// `cydp_date_match($rule, $today_full, $today_md)` — does this rule's date
/// condition match today? `rule_json` is a rule object `{"date":{...}}`.
#[wasm_bindgen]
pub fn date_match(rule_json: &str, today_full: &str, today_md: &str) -> bool {
    #[derive(serde::Deserialize, Default)]
    struct R {
        #[serde(default)]
        date: matching::DateRule,
    }
    let r: R = serde_json::from_str(rule_json).unwrap_or_default();
    matching::date_match(&r.date, today_full, today_md)
}

/// `cydp_time_match($rule, $now_hm)` — does this rule's time window match?
/// `rule_json` is a rule object `{"time":{...}}`.
#[wasm_bindgen]
pub fn time_match(rule_json: &str, now_hm: &str) -> bool {
    #[derive(serde::Deserialize, Default)]
    struct R {
        #[serde(default)]
        time: matching::TimeRule,
    }
    let r: R = serde_json::from_str(rule_json).unwrap_or_default();
    matching::time_match(&r.time, now_hm)
}

/// Full resolution — the same result as the inline JS `resolve()`.
///
/// `config_json` is the `cfg` object PHP prints inline; `dlt_mode` is the mode
/// already selected by the (DOM-bound) `awenDltMode()` JS helper. Returns a
/// JSON object of resolved `slug → value`.
#[wasm_bindgen]
pub fn resolve(
    config_json: &str,
    today_full: &str,
    today_md: &str,
    now_hm: &str,
    dlt_mode: &str,
) -> String {
    let cfg: resolve::Config = serde_json::from_str(config_json).unwrap_or_default();
    let map = resolve::resolve(&cfg, today_full, today_md, now_hm, dlt_mode);
    serde_json::to_string(&map).unwrap_or_else(|_| "{}".to_string())
}
