//! Palette-rule resolution for Cyclical Dynamic Palettes.
//!
//! A faithful port of the inline JavaScript `resolve()` (itself a mirror of the
//! PHP `cydp_resolve_result()`): collect the rules whose date AND time both
//! match, add the visitor's current AWEN light/dark/transcendent style as one
//! more candidate when enabled, sort by priority, then apply the "top" or
//! "merge" overlap mode. CSS-variable application stays in JS.

use super::matching::{date_match, time_match, DateRule, TimeRule};
use indexmap::IndexMap;
use serde::Deserialize;

/// One rule as printed into the front-end `cfg.rules` array by PHP:
/// `{ priority, exclusive, date, time, map }` where `map` is slug → value.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct Rule {
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub exclusive: bool,
    #[serde(default)]
    pub date: DateRule,
    #[serde(default)]
    pub time: TimeRule,
    #[serde(default)]
    pub map: IndexMap<String, String>,
}

/// The AWEN light/dark/transcendent style source, as PHP prints it under
/// `cfg.awenDlt`. The mode is selected in JS (`awenDltMode`, DOM-bound) and
/// passed into `resolve` as `dlt_mode`.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct AwenDlt {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub exclusive: bool,
    #[serde(default)]
    #[serde(rename = "defaultMode")]
    pub default_mode: String,
    #[serde(default)]
    pub maps: IndexMap<String, IndexMap<String, String>>,
}

/// The whole `cfg` object PHP prints inline.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    #[serde(rename = "overlapMode")]
    pub overlap_mode: String,
    #[serde(default)]
    pub rules: Vec<Rule>,
    #[serde(default)]
    #[serde(rename = "awenDlt")]
    pub awen_dlt: Option<AwenDlt>,
}

/// A resolved candidate: the rule's original index (for the stable tiebreak),
/// its priority/exclusive flag and its flat variable map.
struct Match {
    index: usize,
    priority: i32,
    exclusive: bool,
    map: IndexMap<String, String>,
}

/// Resolve the active palette map, matching the inline JS `resolve()`.
pub fn resolve(
    cfg: &Config,
    today_full: &str,
    today_md: &str,
    now_hm: &str,
    dlt_mode: &str,
) -> IndexMap<String, String> {
    let mut matches: Vec<Match> = Vec::new();

    for (i, rule) in cfg.rules.iter().enumerate() {
        if date_match(&rule.date, today_full, today_md) && time_match(&rule.time, now_hm) {
            matches.push(Match {
                index: i,
                priority: rule.priority,
                exclusive: rule.exclusive,
                map: rule.map.clone(),
            });
        }
    }

    if let Some(dlt) = &cfg.awen_dlt {
        if dlt.enabled {
            if let Some(map) = dlt.maps.get(dlt_mode) {
                matches.push(Match {
                    index: cfg.rules.len(),
                    // Mirror the JS `cfg.awenDlt.priority || 10` fallback:
                    // a stored priority of 0 is falsy in JS and becomes 10.
                    priority: if dlt.priority == 0 { 10 } else { dlt.priority },
                    exclusive: dlt.exclusive,
                    map: map.clone(),
                });
            }
        }
    }

    if matches.is_empty() {
        return IndexMap::new();
    }

    // Sort by priority desc, then original index asc (stable tiebreak).
    matches.sort_by(|a, b| b.priority.cmp(&a.priority).then(a.index.cmp(&b.index)));

    if cfg.overlap_mode == "top" {
        return matches[0].map.clone();
    }

    // Merge/layer: apply low → high so the highest priority (lowest index)
    // wins per variable. An `exclusive` rule hides everything below it.
    let mut map: IndexMap<String, String> = IndexMap::new();
    for m in matches.iter().rev() {
        if m.exclusive {
            map.clear();
        }
        for (k, v) in &m.map {
            map.insert(k.clone(), v.clone());
        }
    }
    map
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rule(priority: i32, exclusive: bool, mode: &str, map: &[(&str, &str)]) -> Rule {
        Rule {
            priority,
            exclusive,
            date: DateRule {
                mode: mode.to_string(),
                ..Default::default()
            },
            time: TimeRule::default(),
            map: map
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        }
    }

    fn cfg(overlap: &str, rules: Vec<Rule>) -> Config {
        Config {
            overlap_mode: overlap.to_string(),
            rules,
            awen_dlt: None,
        }
    }

    #[test]
    fn no_matches_returns_empty() {
        let c = cfg(
            "top",
            vec![rule(10, false, "single", &[("accent", "#f00")])],
        );
        // date "single" with empty start never matches
        assert!(resolve(&c, "2026-12-25", "12-25", "13:00", "dark").is_empty());
    }

    #[test]
    fn single_match_returns_its_map() {
        let c = cfg(
            "top",
            vec![rule(
                10,
                false,
                "none",
                &[("accent", "#f00"), ("base", "#000")],
            )],
        );
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        assert_eq!(m.get("accent").map(String::as_str), Some("#f00"));
        assert_eq!(m.get("base").map(String::as_str), Some("#000"));
        assert_eq!(m.len(), 2);
    }

    #[test]
    fn top_mode_highest_priority_wins() {
        let c = cfg(
            "top",
            vec![
                rule(10, false, "none", &[("accent", "#f00")]),
                rule(20, false, "none", &[("accent", "#0f0")]),
            ],
        );
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        assert_eq!(m.get("accent").map(String::as_str), Some("#0f0"));
        assert_eq!(m.len(), 1);
    }

    #[test]
    fn top_mode_priority_tie_uses_original_order() {
        let c = cfg(
            "top",
            vec![
                rule(10, false, "none", &[("accent", "#f00")]),
                rule(10, false, "none", &[("accent", "#0f0")]),
            ],
        );
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        // Equal priority: the first rule (index 0) wins.
        assert_eq!(m.get("accent").map(String::as_str), Some("#f00"));
    }

    #[test]
    fn merge_mode_layers_low_to_high() {
        let c = cfg(
            "merge",
            vec![
                rule(10, false, "none", &[("accent", "#f00"), ("base", "#000")]),
                rule(20, false, "none", &[("base", "#fff"), ("extra", "#123")]),
            ],
        );
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        assert_eq!(m.get("accent").map(String::as_str), Some("#f00")); // only in low rule
        assert_eq!(m.get("base").map(String::as_str), Some("#fff")); // higher wins
        assert_eq!(m.get("extra").map(String::as_str), Some("#123"));
        assert_eq!(m.len(), 3);
    }

    #[test]
    fn merge_mode_exclusive_hides_lower() {
        let c = cfg(
            "merge",
            vec![
                rule(10, false, "none", &[("accent", "#f00"), ("base", "#000")]),
                rule(20, true, "none", &[("accent", "#0f0")]),
            ],
        );
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        // The high, opaque rule wipes `base` (and `accent` is overridden).
        assert_eq!(m.get("accent").map(String::as_str), Some("#0f0"));
        assert_eq!(m.len(), 1);
    }

    #[test]
    fn awen_dlt_rule_joins_priority_order() {
        let mut c = cfg("top", vec![rule(10, false, "none", &[("accent", "#f00")])]);
        let mut maps = IndexMap::new();
        maps.insert(
            "dark".to_string(),
            [("accent", "#222")]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        );
        c.awen_dlt = Some(AwenDlt {
            enabled: true,
            priority: 20,
            exclusive: false,
            default_mode: "dark".to_string(),
            maps,
        });
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        assert_eq!(m.get("accent").map(String::as_str), Some("#222"));
    }

    #[test]
    fn awen_dlt_priority_zero_mirrors_js_or_fallback() {
        let mut c = cfg("top", vec![rule(10, false, "none", &[("accent", "#f00")])]);
        let mut maps = IndexMap::new();
        maps.insert(
            "dark".to_string(),
            [("accent", "#222")]
                .iter()
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect(),
        );
        c.awen_dlt = Some(AwenDlt {
            enabled: true,
            priority: 0, // JS `0 || 10` → 10, which still loses to the rule's 10? tie → rule wins (index 0 < rules.len)
            exclusive: false,
            default_mode: "dark".to_string(),
            maps,
        });
        let m = resolve(&c, "2026-12-25", "12-25", "13:00", "dark");
        // Both end up priority 10; the regular rule has the lower index and wins.
        assert_eq!(m.get("accent").map(String::as_str), Some("#f00"));
    }
}
