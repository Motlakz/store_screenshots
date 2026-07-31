# PillBird — screenshot assets

Everything in this folder belongs to **PillBird only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/pillbird/` | Curated source screenshots referenced by slides |
| `public/screenshots/pillbird/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/pillbird/app-icon.png` | Icon for the feature-graphic layout |
| `projects/pillbird.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: PillBird Blossom (`pillbird`)

Warm cream `#FBF3E9`, blush and rose `#F26A8D`, soft and comforting.
Transcribed from `pillbird/constants/themes.ts` (the free Blossom theme).

### Still to generate

- **PillBird mascot** — transparent PNG, 2–3 poses. Keep its fixed brand pink;
  the app never recolors the mascot from the palette, so the screenshots
  shouldn't either.
- Optional: **pill / blister-pack stickers**, transparent PNGs.

Hearts and sparkles are drawn by the editor.

### Still to capture

6–8 phone screens at 1080×1920 — schedule, reminder, adherence streak,
refill tracker, caregiver share, paywall.

### Note

PillBird ships 5 in-app themes (Blossom, Rosewood, Violet, Ocean, Amber). Only
Blossom is authored here; add the others to `projects/pillbird.json` →
`themes` if you want to shoot alternates.
