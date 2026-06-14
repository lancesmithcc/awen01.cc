# AWEN01.cc Design System

## Scene

AWEN01 is encountered at night and at dawn: a musician tuning a room before ceremony, a writer opening a luminous manuscript, a technologist stepping away from the machine to remember the forest. The system should support dark-first immersion, light editorial clarity, and a quiet transcendent neutral mode.

## Typography

- Primary family: Jost.
- Weights: 300 for body and atmospheric text, 700 for headings, labels, and calls to action.
- Heading scale uses `clamp()` and tight line height.
- Body copy stays spacious, clear, and human.

## Color Modes

### Dark Mode: Labradorite Opalescence

- Primary ground: deep black-green, tinted away from pure black.
- Secondary ground: black opal and shadowed evergreen.
- Accents: aurora teal, spectral blue, muted violet, pale opal green.
- Use for home hero, music/art launches, immersive manifesto sections.

### Light Mode: Opalescent Dawn

- Ground: tinted moon white, never pure white.
- Accents: opalescent lavender, soft pink, pastel green.
- Use for reading, essays, editorial standards, forms, and guidance.

### Transcendent Mode: Muted Threshold

- Ground: neutral grey, cool but alive.
- Accent versions are muted versions of light and dark tokens.
- Use for system pages, archives, quiet transitions, and liminal content.

## Motion

- Aurora borealis gradients: slow, directional, low-contrast motion.
- Low-poly node matrix: sparse points and connecting lines, suggesting intelligence and old star maps.
- Motion must respect `prefers-reduced-motion`.
- Animate opacity and transform, not layout.

## Composition

- Dark and light sections alternate.
- One primary call to action per view.
- Use generous white space with precise internal rhythm.
- Avoid nested cards. Use bands, thresholds, panels, and editorial plates.

## Voice

Warm, visionary, lucid, initiated, careful. The writing can be mythic, but it must remain legible and concrete.
