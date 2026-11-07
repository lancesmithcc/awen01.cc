//! Deterministic OKLCH color engine.
//!
//! A faithful port of `BSC_Color` from `wp-content/plugins/brandboss/includes/class-bsc-color.php`.
//! Everything here is pure math and produces byte-identical hex output to the PHP
//! implementation (verified by unit tests against PHP reference values).

use serde::Serialize;

// ------------------------------------------------------------ conversions

/// Parse a `#rgb` or `#rrggbb` hex string into 8-bit channels.
pub fn hex_to_rgb(hex: &str) -> [u8; 3] {
    let h = hex.trim_start_matches('#');
    let expanded: String = if h.len() == 3 {
        let b = h.as_bytes();
        let dup = |i: usize| b[i] as char;
        format!(
            "{0}{0}{1}{1}{2}{2}",
            dup(0),
            dup(1),
            dup(2)
        )
    } else {
        h.to_string()
    };
    if expanded.len() != 6 {
        return [0, 0, 0];
    }
    let mut out = [0u8; 3];
    for i in 0..3 {
        out[i] = u8::from_str_radix(&expanded[i * 2..i * 2 + 2], 16).unwrap_or(0);
    }
    out
}

fn rgb_to_hex(rgb: [f64; 3]) -> String {
    format!(
        "#{:02x}{:02x}{:02x}",
        (rgb[0].round() as i64).clamp(0, 255),
        (rgb[1].round() as i64).clamp(0, 255),
        (rgb[2].round() as i64).clamp(0, 255),
    )
}

fn srgb_to_linear(c: f64) -> f64 {
    let c = c / 255.0;
    if c <= 0.04045 {
        c / 12.92
    } else {
        ((c + 0.055) / 1.055).powf(2.4)
    }
}

fn linear_to_srgb(c: f64) -> f64 {
    let c = c.clamp(0.0, 1.0);
    255.0 * if c <= 0.0031308 {
        12.92 * c
    } else {
        1.055 * c.powf(1.0 / 2.4) - 0.055
    }
}

/// hex → `[L, C, H]` (OKLCH; H in degrees).
pub fn to_oklch(hex: &str) -> [f64; 3] {
    let rgb = hex_to_rgb(hex);
    let r = srgb_to_linear(rgb[0] as f64);
    let g = srgb_to_linear(rgb[1] as f64);
    let b = srgb_to_linear(rgb[2] as f64);

    let l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b).powf(1.0 / 3.0);
    let m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b).powf(1.0 / 3.0);
    let s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b).powf(1.0 / 3.0);

    let l_ = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    let a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    let bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

    let c = (a * a + bb * bb).sqrt();
    let h = (bb.atan2(a).to_degrees() + 360.0) % 360.0;

    [l_, c, h]
}

/// `[L, C, H]` → hex, with chroma clamped into the sRGB gamut.
pub fn from_oklch(l: f64, c: f64, h: f64) -> String {
    let mut c = c;
    for _ in 0..24 {
        let rgb = oklch_to_rgb_raw(l, c, h);
        let ok = rgb.iter().all(|&v| v >= -0.001 && v <= 255.001);
        if ok {
            return rgb_to_hex(rgb);
        }
        c *= 0.92;
    }
    rgb_to_hex(oklch_to_rgb_raw(l, 0.0, h))
}

fn oklch_to_rgb_raw(l: f64, c: f64, h: f64) -> [f64; 3] {
    let a = c * h.to_radians().cos();
    let bb = c * h.to_radians().sin();

    let l_ = (l + 0.3963377774 * a + 0.2158037573 * bb).powf(3.0);
    let m_ = (l - 0.1055613458 * a - 0.0638541728 * bb).powf(3.0);
    let s_ = (l - 0.0894841775 * a - 1.2914855480 * bb).powf(3.0);

    [
        linear_to_srgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
        linear_to_srgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
        linear_to_srgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_),
    ]
}

// ------------------------------------------------------------ contrast gating

/// Darken (or lighten) a color along L until it clears `min` against `bg`.
pub fn gate(hex: &str, bg: &str, min: f64) -> String {
    if crate::contrast::ratio(hex, bg) >= min {
        return hex.to_string();
    }
    let [l, c, h] = to_oklch(hex);
    let darker = crate::contrast::luminance(bg) > 0.5;

    let mut l = l;
    for _ in 0..40 {
        l += if darker { -0.02 } else { 0.02 };
        l = l.clamp(0.05, 0.98);
        let try_hex = from_oklch(l, c, h);
        if crate::contrast::ratio(&try_hex, bg) >= min {
            return try_hex;
        }
    }
    if darker {
        "#1a1a1a".to_string()
    } else {
        "#f4f4f4".to_string()
    }
}

// ------------------------------------------------------------ palette composition

#[derive(Serialize)]
pub struct Palette {
    pub primary: String,
    pub secondary: String,
    pub accent: String,
    pub ink: String,
    pub surface: String,
    pub bg: String,
    pub muted: String,
    pub border: String,
    pub primary_text: String,
    pub ramp: indexmap::IndexMap<String, String>,
    pub success: String,
    pub warning: String,
    pub danger: String,
    pub dark: DarkPalette,
}

#[derive(Serialize)]
pub struct DarkPalette {
    pub bg: String,
    pub surface: String,
    pub ink: String,
    pub muted: String,
    pub primary: String,
}

/// Compose a full palette from 1–3 seeds. `seeds[0]` = primary.
pub fn compose(seeds: &[String]) -> Palette {
    let mut seeds: Vec<String> = seeds
        .iter()
        .filter(|s| !s.trim().is_empty())
        .cloned()
        .collect();
    if seeds.is_empty() {
        seeds = vec!["#2f6feb".to_string()];
    }

    let [pl, pc, ph] = to_oklch(&seeds[0]);

    // Tinted-neutral chroma toward the brand hue (0.005–0.015).
    let tint = (pc * 0.08).clamp(0.004, 0.012);

    let primary = seeds[0].to_ascii_lowercase();

    let secondary = if seeds.len() > 1 {
        seeds[1].to_ascii_lowercase()
    } else {
        from_oklch((pl - 0.18).max(0.25), pc * 0.85, ph)
    };

    let accent = if seeds.len() > 2 {
        seeds[2].to_ascii_lowercase()
    } else {
        from_oklch((pl + 0.12).min(0.78), (pc * 0.9).max(0.09), (ph + 40.0) % 360.0)
    };

    let ink = from_oklch(0.22, (tint * 2.0).min(0.02), ph);
    let surface = from_oklch(0.985, tint * 0.6, ph);
    let bg = from_oklch(0.955, tint, ph);
    let muted = from_oklch(0.55, (tint * 1.5).max(0.012), ph);
    let border = from_oklch(0.88, tint, ph);

    let primary_text = gate(&primary, &surface, 4.5);

    // 50–900 ramp interpolated around the seed's own lightness.
    let mut ramp: indexmap::IndexMap<String, String> = indexmap::IndexMap::new();
    for (i, step) in [50u32, 100, 200, 300, 400].iter().enumerate() {
        let t = i as f64 / 5.0; // 0 … 0.8
        let l = 0.97 + (pl - 0.97) * t;
        let c = pc * if l > 0.9 {
            0.25
        } else if l > 0.8 {
            0.5
        } else {
            0.85
        };
        ramp.insert(step.to_string(), from_oklch(l, c, ph));
    }
    ramp.insert("500".to_string(), primary.clone());
    let dark_end = (pl - 0.2).clamp(0.18, 0.26);
    for (i, step) in [600u32, 700, 800, 900].iter().enumerate() {
        let t = (i as f64 + 1.0) / 4.0; // 0.25 … 1
        let l = pl + (dark_end - pl) * t;
        ramp.insert(step.to_string(), from_oklch(l, pc * 0.85, ph));
    }

    // Semantic colors, hue-fixed but chroma/lightness harmonized + gated.
    let sem_c = pc.clamp(0.10, 0.16);
    let success = gate(&from_oklch(0.58, sem_c, 150.0), &surface, 3.0);
    let warning = gate(&from_oklch(0.70, sem_c, 85.0), &surface, 3.0);
    let danger = gate(&from_oklch(0.55, sem_c, 27.0), &surface, 3.0);

    // Dark theme counterparts (#0f0f0f-class, not #000).
    let dark_bg = from_oklch(0.18, tint, ph);
    let dark = DarkPalette {
        bg: dark_bg.clone(),
        surface: from_oklch(0.23, tint, ph),
        ink: from_oklch(0.93, tint * 0.5, ph),
        muted: from_oklch(0.68, tint, ph),
        primary: gate(&primary, &dark_bg, 4.5),
    };

    Palette {
        primary,
        secondary,
        accent,
        ink,
        surface,
        bg,
        muted,
        border,
        primary_text,
        ramp,
        success,
        warning,
        danger,
        dark,
    }
}
