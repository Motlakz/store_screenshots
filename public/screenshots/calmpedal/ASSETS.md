# CalmPedal — screenshot assets

Everything in this folder belongs to **CalmPedal only**. Nothing here is shared with
another app, and nothing another app adds can overwrite it.

| Path | What it is |
| --- | --- |
| `public/screenshots/calmpedal/` | Curated source screenshots referenced by slides |
| `public/screenshots/calmpedal/uploaded/` | Images dropped into the inspector (hashed filenames) |
| `public/screenshots/calmpedal/app-icon.png` | Icon for the feature-graphic layout |
| `projects/calmpedal.json` | This app's deck, copy, transforms and palettes |

## Always needed

- **`app-icon.png`** — 512×512 PNG, no rounded corners (the canvas masks it).
- **Device captures** — 1080×1920 PNG or JPG for the Play phone deck. One per
  screen you want to show; 5–8 is typical. Name them `01-<what-it-shows>.png`
  so the deck stays readable.
- Feature graphic (Play Store) is 1024×500 and is composed in the editor from
  the icon + app name + tagline — no separate artwork required.

## Style: CalmPedal (5 accent variants)

Dark navy `#080C18` / surface `#0F1629`, ink-on-accent `#04101A`.
Transcribed from `calmpedal/design/spec/calmpedal_app_design/app.jsx`
(`ACCENT_OPTIONS`), which lets users swap the accent like PillBird and QuizBud.

| Variant | Accent |
| --- | --- |
| Cyan (default) | `#00D4FF` |
| Periwinkle | `#7B9AFF` |
| Violet | `#A78BFA` |
| Emerald | `#10B981` |
| Pink | `#F472B6` |

The spec also has an **AMOLED** mode (`#000000` / `#080808`) — that's the
`inverted` toggle on a slide.

### Still to generate

- **Ride / cadence ring** render, transparent PNG.
- **Sleep-recovery curve** plate, transparent PNG.
- Optional: **bike silhouette** motif.

### Capture plan — Google Play phone deck

The Android implementation is complete, but Health Connect and return-leg flows
still need physical-device verification. Capture these populated states from the
verified build at 1080×1920:

| # | Filename | App state |
| ---: | --- | --- |
| 01 | `01-home-daily-call.png` | Home recovery ring + exact daily ride call |
| 02 | `02-home-why-changed.png` | Sleep/load factors + confidence + why changed |
| 03 | `03-tonight-plan.png` | Latest finish + wind-down + bedtime plan |
| 04 | `04-evening-scenario.png` | 8pm scenario and recomputed ride |
| 05 | `05-atlas-why.png` | Atlas answering “Why did that change?” |
| 06 | `06-stats-personal-response.png` | Paired days + personal response + confidence |
| 07 | `07-profile-data-privacy.png` | Real Health Connect state + privacy controls |

Slide 08 is a no-device typographic closer composed in the editor. See
`PLAY_STORE_LISTING.md` for the narrative, alt text, metadata, and Play Console
setup.
