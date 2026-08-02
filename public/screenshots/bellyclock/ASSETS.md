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
  the app identity, editorial headline, signature glow and metabolic phase clock
  — no separate artwork required.

## Primary style: BellyClock Field Notes (`bellyclock-editorial`)

A hand-drawn physiology journal on deep-plum paper. It keeps BellyClock's real
violet/cyan/magenta/green phase palette, but replaces generic blobs, sparkles and
random squiggles with marks that explain the feature being advertised:

- fixed violet, pink and cyan glow orbs that light the canvas behind the phone;
- segmented metabolic rings and 24-hour clock ticks;
- fasting paths and phase keys;
- measured water droplets;
- imperfect trend lines and journal check marks;
- community constellations;
- a crescent/orbit study for the Islamic dashboard.

Every mark is deterministic and tied to its slide. Do not add free-floating
squiggles, generic stars, emoji, or decorations borrowed from GutScribe.

### Type system

- **Montserrat 700** — short, high-confidence screenshot headlines.
- **Instrument Serif Italic** — exactly one emphasized phrase per headline.
- **JetBrains Mono 600** — eyebrows, times and phase notation.
- **Quicksand 600/700** — the BellyClock wordmark and approachable supporting copy.

These faces mirror `bellyclock-mobile/theme/tokens.ts`. The prior gradient-led
**BellyClock Aurora** palette (`bellyclock`) remains available as an alternate.

### Screenshot story and required captures

Capture the Android deck at 1080×1920 using these exact filenames:

| Slide | File | Promise |
| --- | --- | --- |
| 01 | `01-today-ring.png` | Know what the body is doing now |
| 02 | `02-fasting-timer.png` | Follow a fasting plan with context |
| 03 | `03-hydration.png` | Keep hydration in rhythm |
| 04 | `04-analytics.png` | See the patterns behind each fast |
| 05 | `05-journal.png` | Remember how each fast felt |
| 06 | `06-community.png` | Find people on the same path |
| 07 | `07-islamic-dashboard.png` | Support faith-aware fasting |
| 08 | `08-paywall.png` | Hold for paywall experiments; not in the core story deck |

The closer is a device-free phase poster, so it does not need another capture.
The editor draws the semantic field-note artwork itself; no metabolic-ring or
aurora-glow PNG is required. A fasting-streak badge remains optional for future
hero-slide proof, once there is a real claim to support it.

### Feature graphic composition

The Field Notes feature graphic must use the bespoke BellyClock renderer rather
than the shared icon-and-tagline template. It includes a luminous six-phase
metabolic clock, 24-hour ticks, a live `16:08` state, the violet/pink/cyan glow
field, mono phase labels and the Instrument Serif emphasis phrase. Six hand-drawn
phase badges orbit the clock: utensils for digest, a glucose lattice for glycogen,
flame for burn, droplet for keto, cell/spark for renewal and a sprouting bowl for
refed. It must remain fully useful without screenshots or an app-icon file.
