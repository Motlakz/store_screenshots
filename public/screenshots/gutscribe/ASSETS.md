# GutScribe — screenshot assets

Everything in this folder belongs to **GutScribe only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/gutscribe/` | Curated source screenshots referenced by slides |
| `public/screenshots/gutscribe/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/gutscribe/app-icon.png` | Icon for the feature-graphic layout |
| `projects/gutscribe.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: GutScribe Calm (`gutscribe`)

Warm cream `#FAF7F2`, terracotta `#E89070` for caution/energy, sage
`#7FB8A8` for safe/calm, ocean `#8FB4CE` for trust. Ink `#2C2A28`.
Transcribed from `gutscribe/src/theme/tokens.ts`.

### Still to generate

- **Symptom / trigger iconography** — transparent PNG set in terracotta + sage.
- **Gut-calm illustration** — soft organic shape, transparent PNG, for the
  hero screen.
- Optional: **SOS comfort-mode plate** in the dark `#15130F` treatment.

## Axle mascot

Axle is GutScribe's axolotl companion. The source of truth is the vector
component in the sister app at
`../gutscribe/src/components/axle-mascot.tsx`; do not redraw Axle from the
unrelated full-scene `../gutscribe/axolotl.png` artwork.

Available expressions in the app source are `happy`, `cheer`, `wink`,
`worried`, and `sleepy`, with light and dark tones. Before using Axle in store
screenshots, export transparent, tightly cropped assets at roughly 1200px:

- `mascot/axle-happy.png` — calm smile / reassuring presence.
- `mascot/axle-point.png` — one arm clearly pointing toward a nearby UI
  outcome; this pose still needs to be authored from the same character model.
- `mascot/axle-comfort.png` — sleepy or gently smiling pose for Comfort Mode.

Keep Axle occasional: no more than two cameos in an eight-screen Play deck,
never over app UI or headline copy, and never as a substitute for showing the
product outcome. Size and position Axle as an independent canvas artwork
element so each pose can be moved, resized, hidden, or reused by another deck.

### Axle screenshot experiment

- **Control A:** current GutScribe deck with no mascot.
- **Variant B:** keep copy, screenshot order, frames, crops, and colors exactly
  the same; add only Axle.
- **Screen 1:** small pointing pose beside the trigger-summary focus crop. This
  tests whether a character improves attention and comprehension at the main
  conversion moment.
- **Screen 2:** smaller calm/smiling pose near Comfort Mode. This tests warmth
  without turning every screenshot into mascot-led creative.
- **Do not add Axle elsewhere in this first test.** If the variant wins, test a
  closing cameo separately rather than expanding all at once.
- **Primary measure:** store-listing install conversion rate. Treat Axle as the
  winner only after the experiment reaches the platform's confidence guidance;
  do not call an early directional swing a result.

Squiggles are drawn by the editor in sage.

### Still to capture

6–8 phone screens at 1080×1920 — log entry, trigger insight, safe-foods,
hydration, report export, paywall.
