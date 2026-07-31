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

Squiggles are drawn by the editor in sage.

### Still to capture

6–8 phone screens at 1080×1920 — log entry, trigger insight, safe-foods,
hydration, report export, paywall.
