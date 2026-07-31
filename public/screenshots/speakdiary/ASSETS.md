# SpeakDiary — screenshot assets

Everything in this folder belongs to **SpeakDiary only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/speakdiary/` | Curated source screenshots referenced by slides |
| `public/screenshots/speakdiary/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/speakdiary/app-icon.png` | Icon for the feature-graphic layout |
| `projects/speakdiary.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: SpeakDiary Dreamy (`speakdiary`)

Cotton-candy gradient, Quicksand headlines, one italic-serif word per headline
in lilac `#B49BE6`.

### Still to generate

- **Kawaii pet mascot** (husky or shiba) — transparent PNG, ~1200px tall, 2–3 poses.
- **3D mint globe** — transparent PNG, ~800px square.
- **Lavender chat bubbles** — transparent PNG set, 3–4 variants.
- **Neon-glow heart** — transparent PNG, ~600px.

Hearts, sparkles and paw prints are drawn by the editor already (`decor.motifs`),
so those don't need artwork.

### Present

`01-voice.png` (web hero, unused by the deck), `02-note` … `08-lock`,
plus `09-prompts`, `10-insights`, `11-achievements` rescued from the old
locale folders. `uploaded/5f1dd7360260f78f.jpg` is the voice screen.
