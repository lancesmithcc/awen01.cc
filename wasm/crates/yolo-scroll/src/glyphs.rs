//! Text-scramble and type-in glyph stream.
//!
//! A faithful port of the `scramble`/`type-in` text effects from
//! `wp-content/plugins/yolo-scroll/assets/js/yolo-scroll.js`: `hashString`,
//! `randomGlyph`, `renderScrambleText`, and the type-in slice/cursor logic.

/// The exact glyph alphabet used by the JS `scrambleGlyphs` constant (40 chars).
const SCRAMBLE_GLYPHS: &str = "▓▒░<>!@#$%&*+=?/~^アイウエオカサタナXYZ0123456789";

/// Port of `hashString()`: a `31·hash + code unit` fold kept in 32-bit, then
/// `Math.abs`. Iterates UTF-16 code units exactly like JS `charCodeAt`.
pub fn hash_string(value: &str) -> f64 {
    let mut hash: i32 = 0;
    for unit in value.encode_utf16() {
        // JS: `hash = ((hash << 5) - hash) + charCodeAt; hash |= 0;`
        // `(hash << 5) - hash` is `31 * hash` in 32-bit wrapping, then the
        // `+ charCodeAt` happens in the double domain before `| 0` re-coerces.
        let h2 = hash.wrapping_mul(31);
        let h3 = (h2 as i64) + (unit as i64);
        hash = h3 as i32;
    }
    (hash as f64).abs()
}

/// Index into the glyph alphabet for a seed and character offset, matching
/// `Math.abs((seed + offset * 17) % SCRAMBLE_GLYPHS.length)`.
fn glyph_index(seed: f64, offset: usize) -> usize {
    let rem = (seed + (offset as f64 * 17.0)) % (SCRAMBLE_GLYPHS.chars().count() as f64);
    rem.abs().floor() as usize
}

fn glyph_at(index: usize) -> char {
    SCRAMBLE_GLYPHS.chars().nth(index).unwrap_or('\u{FFFD}')
}

/// Port of `randomGlyph(seed, offset)`: the single glyph character at that index.
pub fn random_glyph(seed: f64, offset: usize) -> String {
    glyph_at(glyph_index(seed, offset)).to_string()
}

/// Port of `renderScrambleText(source, visibleCount, tickSeed)`.
///
/// `progress` replaces the JS `visibleCount` (which is `Math.floor(glyphs.length
/// * progress)`), so the caller does not have to split code points first.
pub fn scramble_text(source: &str, progress: f64, tick_seed: f64) -> String {
    let chars: Vec<char> = source.chars().collect();
    let visible = visible_count(chars.len(), progress);
    chars
        .iter()
        .enumerate()
        .map(|(index, &c)| {
            if is_js_space(c) {
                return c;
            }
            if index < visible {
                return c;
            }
            glyph_at(glyph_index(tick_seed, index))
        })
        .collect()
}

/// Port of the type-in branch of `applyTextEffect`: slice to the visible count
/// and append the `▌` cursor while `0 < progress < 1`.
pub fn type_in_text(source: &str, progress: f64) -> String {
    let chars: Vec<char> = source.chars().collect();
    let visible = visible_count(chars.len(), progress);
    let mut out: String = chars.iter().take(visible).collect();
    if progress > 0.0 && progress < 1.0 {
        out.push('▌');
    }
    out
}

/// `Math.floor(glyphs.length * progress)`.
fn visible_count(len: usize, progress: f64) -> usize {
    (len as f64 * progress).floor() as usize
}

/// `/\s/.test(char)` — the exact JS `\s` class. Includes U+FEFF, which Rust's
/// `char::is_whitespace` omits, so the port uses its own table.
fn is_js_space(c: char) -> bool {
    matches!(
        c,
        '\u{0009}'
            | '\u{000A}'
            | '\u{000B}'
            | '\u{000C}'
            | '\u{000D}'
            | '\u{0020}'
            | '\u{00A0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200A}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202F}'
            | '\u{205F}'
            | '\u{3000}'
            | '\u{FEFF}'
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f64, b: f64, eps: f64) -> bool {
        (a - b).abs() <= eps
    }

    #[test]
    fn glyph_alphabet_length_matches_js() {
        assert_eq!(SCRAMBLE_GLYPHS.chars().count(), 40);
    }

    #[test]
    fn hash_string_matches_js() {
        let cases = [
            ("hello", 99162322.0),
            ("Hello world", 832992604.0),
            ("test-0", 877171275.0),
            ("abcdef", 1424385949.0),
            ("", 0.0),
            ("アイウ", 12362916.0),
            ("a💩b", 57839061.0),
        ];
        for (input, expected) in cases {
            assert!(approx(hash_string(input), expected, 1e-9), "hash_string({input:?})");
        }
    }

    #[test]
    fn random_glyph_matches_js() {
        let cases = [
            (0.0, 0usize, "▓"),
            (0.0, 1, "^"),
            (0.0, 40, "▓"),
            (12345.0, 0, "タ"),
            (12345.0, 5, "0"),
            (999999999.0, 41, "~"),
            (2147483648.0, 0, "$"),
        ];
        for (seed, offset, expected) in cases {
            assert_eq!(random_glyph(seed, offset), expected, "random_glyph({seed}, {offset})");
        }
    }

    #[test]
    fn scramble_text_matches_js() {
        let src = "Hello World";
        let cases = [
            (0.0, 12345.0, "タ░イ6= #サ▒ア5"),
            (0.25, 12345.0, "Heイ6= #サ▒ア5"),
            (0.5, 12345.0, "Hello #サ▒ア5"),
            (0.999, 12345.0, "Hello Worl5"),
            (1.0, 12345.0, "Hello World"),
        ];
        for (progress, tick_seed, expected) in cases {
            assert_eq!(scramble_text(src, progress, tick_seed), expected);
        }
        // Multi-byte source: whitespace is preserved, code points split like Array.from.
        assert_eq!(scramble_text("アイウ オ", 0.5, 777.0), "アイ* !");
    }

    #[test]
    fn type_in_text_matches_js() {
        let src = "Hello World";
        let cases = [
            (0.0, ""),
            (0.25, "He▌"),
            (0.5, "Hello▌"),
            (0.999, "Hello Worl▌"),
            (1.0, "Hello World"),
        ];
        for (progress, expected) in cases {
            assert_eq!(type_in_text(src, progress), expected);
        }
        assert_eq!(type_in_text("アイウ オ", 0.5), "アイ▌");
    }
}
