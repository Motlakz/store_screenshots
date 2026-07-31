# BellyClock — screenshot assets

Everything in this folder belongs to **BellyClock only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/bellyclock/` | Curated source screenshots referenced by slides |
| `public/screenshots/bellyclock/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/bellyclock/app-icon.png` | Icon for the feature-graphic layout |
| `projects/bellyclock.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: BellyClock Aurora (`bellyclock`)

Deep-plum canvas, violet → cyan → magenta. Quicksand headline with a cyan
italic-serif emphasis word. Transcribed from `bellyclock-mobile/theme/tokens.ts`.

### Still to generate

- **Metabolic ring** render — transparent PNG showing the digest → glycogen →
  burn → keto → auto → refed phases (`#60A5FA`, `#818CF8`, `#A78BFA`,
  `#E879F9`, `#FB7185`, `#86EFAC`).
- **Aurora glow plate** — soft violet/cyan gradient bloom, transparent PNG, for
  layering behind the phone.
- Optional: **fasting-streak badge** artwork.

### Still to capture

8 phone screens at 1080×1920 — today/ring, fasting timer, hydration, analytics,
journal, community, Islamic dashboard, paywall.
