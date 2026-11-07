//! Date/time window matching for Cyclical Dynamic Palettes rules.
//!
//! A faithful port of the PHP `cydp_date_match` / `cydp_time_match` functions
//! and their mirrored inline JavaScript `dateMatch` / `timeMatch`. All
//! comparisons are plain string comparisons on the already-sanitized,
//! zero-padded `YYYY-MM-DD`, `MM-DD` and `HH:MM` forms, exactly like PHP/JS.

use serde::Deserialize;

/// A rule's date condition: `{ mode, yearly, start, end }`.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct DateRule {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub yearly: bool,
    #[serde(default)]
    pub start: String,
    #[serde(default)]
    pub end: String,
}

/// A rule's time-of-day condition: `{ mode, start, end }`.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct TimeRule {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub start: String,
    #[serde(default)]
    pub end: String,
}

/// Port of `cydp_date_match($rule, $today_full, $today_md)`.
pub fn date_match(d: &DateRule, today_full: &str, today_md: &str) -> bool {
    let mode = d.mode.as_str();
    if mode.is_empty() || mode == "none" {
        return true;
    }

    if mode == "single" {
        if d.start.is_empty() {
            return false;
        }
        return if d.yearly {
            // substr($start, 5) === $today_md  →  ignore the year
            d.start.get(5..) == Some(today_md)
        } else {
            d.start == today_full
        };
    }

    if mode == "range" {
        if d.start.is_empty() || d.end.is_empty() {
            return false;
        }
        if d.yearly {
            let s = match d.start.get(5..) {
                Some(s) => s,
                None => return false,
            };
            let e = match d.end.get(5..) {
                Some(e) => e,
                None => return false,
            };
            // Year-end wrap: Dec 21 → Mar 19 crosses the new year.
            return if s <= e {
                today_md >= s && today_md <= e
            } else {
                today_md >= s || today_md <= e
            };
        }
        return today_full >= d.start.as_str() && today_full <= d.end.as_str();
    }

    true
}

/// Port of `cydp_time_match($rule, $now_hm)`.
pub fn time_match(t: &TimeRule, now_hm: &str) -> bool {
    let mode = t.mode.as_str();
    if mode.is_empty() || mode == "none" {
        return true;
    }
    let s = t.start.as_str();
    let e = t.end.as_str();
    if s.is_empty() || e.is_empty() {
        return true;
    }
    // Overnight wrap: 20:00 → 06:00 crosses midnight. `end` is exclusive.
    if s <= e {
        now_hm >= s && now_hm < e
    } else {
        now_hm >= s || now_hm < e
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(mode: &str, yearly: bool, start: &str, end: &str) -> DateRule {
        DateRule {
            mode: mode.to_string(),
            yearly,
            start: start.to_string(),
            end: end.to_string(),
        }
    }

    fn time(mode: &str, start: &str, end: &str) -> TimeRule {
        TimeRule {
            mode: mode.to_string(),
            start: start.to_string(),
            end: end.to_string(),
        }
    }

    #[test]
    fn date_none_always_matches() {
        assert!(date_match(
            &date("none", false, "", ""),
            "2026-12-25",
            "12-25"
        ));
        assert!(date_match(&date("", false, "", ""), "2026-12-25", "12-25"));
    }

    #[test]
    fn date_single_exact() {
        let d = date("single", false, "2026-12-25", "");
        assert!(date_match(&d, "2026-12-25", "12-25"));
        assert!(!date_match(&d, "2026-12-24", "12-24"));
        assert!(!date_match(&d, "2025-12-25", "12-25"));
    }

    #[test]
    fn date_single_yearly_ignores_year() {
        let d = date("single", true, "2026-12-25", "");
        assert!(date_match(&d, "2026-12-25", "12-25"));
        assert!(date_match(&d, "2025-12-25", "12-25"));
        assert!(!date_match(&d, "2026-12-24", "12-24"));
    }

    #[test]
    fn date_single_missing_start_fails() {
        assert!(!date_match(
            &date("single", false, "", ""),
            "2026-12-25",
            "12-25"
        ));
    }

    #[test]
    fn date_range_plain() {
        let d = date("range", false, "2026-12-01", "2026-12-31");
        assert!(date_match(&d, "2026-12-15", "12-15"));
        assert!(date_match(&d, "2026-12-01", "12-01"));
        assert!(date_match(&d, "2026-12-31", "12-31"));
        assert!(!date_match(&d, "2026-11-30", "11-30"));
        assert!(!date_match(&d, "2027-01-01", "01-01"));
    }

    #[test]
    fn date_range_yearly_wraps_year_end() {
        let d = date("range", true, "2026-12-21", "2027-03-19");
        // Inside the wrap (after Dec 21)…
        assert!(date_match(&d, "2026-12-25", "12-25"));
        // …and before Mar 19 of the next year.
        assert!(date_match(&d, "2026-01-15", "01-15"));
        assert!(!date_match(&d, "2026-07-01", "07-01"));
    }

    #[test]
    fn date_range_yearly_no_wrap() {
        let d = date("range", true, "2026-03-01", "2026-05-31");
        assert!(date_match(&d, "2026-04-01", "04-01"));
        assert!(!date_match(&d, "2026-06-01", "06-01"));
    }

    #[test]
    fn date_range_missing_endpoint_fails() {
        assert!(!date_match(
            &date("range", false, "2026-12-01", ""),
            "2026-12-15",
            "12-15"
        ));
        assert!(!date_match(
            &date("range", false, "", "2026-12-31"),
            "2026-12-15",
            "12-15"
        ));
    }

    #[test]
    fn time_none_always_matches() {
        assert!(time_match(&time("none", "", ""), "13:31"));
        assert!(time_match(&time("", "", ""), "13:31"));
    }

    #[test]
    fn time_window_plain_exclusive_end() {
        let t = time("window", "09:00", "17:00");
        assert!(time_match(&t, "12:00"));
        assert!(time_match(&t, "09:00"));
        assert!(!time_match(&t, "17:00")); // end exclusive
        assert!(!time_match(&t, "08:59"));
    }

    #[test]
    fn time_window_overnight_wrap() {
        let t = time("window", "20:00", "06:00");
        assert!(time_match(&t, "22:00"));
        assert!(time_match(&t, "03:00"));
        assert!(time_match(&t, "20:00"));
        assert!(!time_match(&t, "06:00")); // end exclusive
        assert!(!time_match(&t, "12:00"));
    }

    #[test]
    fn time_missing_endpoint_matches() {
        assert!(time_match(&time("window", "09:00", ""), "12:00"));
        assert!(time_match(&time("window", "", "17:00"), "12:00"));
    }
}
