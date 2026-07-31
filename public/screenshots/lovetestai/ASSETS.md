# LoveTestAI — screenshot assets

Everything in this folder belongs to **LoveTestAI only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/lovetestai/` | Curated source screenshots referenced by slides |
| `public/screenshots/lovetestai/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/lovetestai/app-icon.png` | Icon for the feature-graphic layout |
| `projects/lovetestai.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: LoveTest Noir (`lovetestai`)

Near-black canvas, rose → violet → gold, Instrument Serif headlines with a gold
italic emphasis phrase, vignette + film grain. Transcribed from
`lovetestai-mobile/constants/theme.ts`.

### Still to generate

- **Warm tungsten lifestyle photography** — this style is photography-led, so
  these matter most. 3–5 full-bleed shots, 1080×1920, teal-orange graded
  (amber highlights `#C99566`, teal shadows `#1A2026`).
- **Gold hairline avatar rings** — transparent PNG overlays.
- Optional: **neon heart / spark** motif, transparent PNG.

### Still to capture

6–8 phone screens at 1080×1920 on the app's true-dark UI (`#0D0610`).
