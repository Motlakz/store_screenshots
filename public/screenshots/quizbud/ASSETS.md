# QuizBud — screenshot assets

Everything in this folder belongs to **QuizBud only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/quizbud/` | Curated source screenshots referenced by slides |
| `public/screenshots/quizbud/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/quizbud/app-icon.png` | Icon for the feature-graphic layout |
| `projects/quizbud.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: QuizBud (5 rotating palettes)

Mango, Coral, Purple, Teal and Mint — transcribed 1:1 from
`quizbud-web/app/globals.css`, where `ThemeRotator` cycles them every 9s.
Mango is the default; switch palettes in the toolbar to shoot alternates.

| Palette | from → to | primary |
| --- | --- | --- |
| Mango | `#fb923c` → `#f472b6` | `#d6316e` |
| Coral | `#ff6b6b` → `#ff9f43` | `#e84d4d` |
| Purple | `#8b5cf6` → `#d946ef` | `#7c3aed` |
| Teal | `#14b8a6` → `#38bdf8` | `#0f8f86` |
| Mint | `#22c55e` → `#2dd4bf` | `#168a4b` |

### Still to generate

- **Themed logo lockups** — the app already ships
  `quizbud_logo_theme2..5.png`; copy the matching one in per palette.
- Optional: **quiz-card stickers** and a **friendship-badge** set, transparent PNGs.

Stars are drawn by the editor.

### Still to capture

6–8 phone screens at 1080×1920 — quiz start, question, result, friend compare,
streak, paywall. Shoot one set per palette if you want all five to feel native.
