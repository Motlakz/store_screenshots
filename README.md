# App Screenshots

A Next.js + ShadCN editor for generating **Apple App Store and Google Play** screenshots for many apps out of one checkout.

> **Built on [ParthJadhav/app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots)** by [Parth Jadhav](https://github.com/ParthJadhav) — *"end to end app store screenshot creation using AI"*, MIT licensed. The connected-canvas editor, device frames, export pipeline, and the `app-store-screenshots` skill that scaffolds this project are all their work. The named visual styles (Hand-Drawn Editorial, Retro Rubberhose, Moody Curated, Dreamy Pastel) come from their published style presets. See [Credits](#credits).

## Quick start

```bash
bun install   # or pnpm / yarn / npm
bun dev       # http://localhost:3000
```

Only one dev server can run per checkout. If `bun dev` reports *"Another next dev server is already running"*, stop the existing one rather than starting a second.

### Cloned before the rename?

This repo was renamed from **`play_store_screenshots`** to **`store_screenshots`**. GitHub redirects the old URL, so existing clones keep working — but redirects are best-effort and stop working if another repo ever takes the old name. Point your remote at the current URL:

```bash
git remote set-url origin https://github.com/Motlakz/store_screenshots.git
git remote -v    # should show store_screenshots
```

You'll know you're on the old URL if a push prints `remote: This repository moved.`

## One editor, many apps

Each app is fully self-contained. Nothing is shared between apps except the code, so building a deck for one app can never overwrite another's screenshots, copy, or palette.

```bash
projects/<app-id>.json               # that app's deck, locales, theme, palettes
public/screenshots/<app-id>/         # that app's curated screenshots + app-icon.png
public/screenshots/<app-id>/uploaded # images dropped into the inspector
```

Switch apps with the leftmost toolbar dropdown; **+ New app…** in that same dropdown creates the project file and asset folders for you. The editor remembers the last app you had open.

Current apps: `speakdiary` (populated), plus empty decks for `bellyclock`, `calmpedal`, `gutscribe`, `lovetestai`, `pillbird`, `quizbud`.

### Per-app styles

A theme is more than six colors. Alongside the flat palette it can carry background treatment, typography, device chrome, and decoration — so two apps can look genuinely different, not just differently tinted:

```jsonc
// projects/speakdiary.json
"themeId": "speakdiary",
"themes": [{
  "id": "speakdiary", "name": "SpeakDiary Dreamy",
  "bg": "#DDEBFA", "fg": "#1B2240", "accent": "#5B3FC8", "muted": "#8A8FA3",
  "background": { "kind": "gradient", "stops": ["#DDEBFA 0%", "#F5E0F0 45%", "#FCEFD6 100%"] },
  "headline":   { "family": "var(--font-quicksand), Quicksand, sans-serif", "weight": 650 },
  "emphasis":   { "family": "var(--font-instrument-serif), serif", "color": "#B49BE6", "italic": true },
  "decor":      { "dreamy": true, "motifs": ["heart", "sparkle"], "motifColor": "#F39A9A" }
}]
```

| Field | Does |
| --- | --- |
| `background` / `backgroundAlt` | `solid`, `gradient` (multi-stop), or `solids` (one flat color per slide, cycled by index) |
| `headline` / `label` | family, weight, scale, tracking, line-height, case |
| `emphasis` | styles the ONE `*asterisk-wrapped*` phrase per headline — family, color, scale, tilt |
| `device` | bezel fill, ink outline, drop shadow |
| `decor` | `grain`, `vignette`, `scrim`, `blobs`, `motifs`, `wordmark` |

App themes win on id collision, so an app can override a shared theme without touching `constants.ts`. Every field is optional — a theme with only the six colors renders exactly as it did before the style layer existed.

**Emphasis syntax:** wrap one phrase per headline in asterisks — `The journal that\n*listens*.` When a theme defines `emphasis`, headlines containing `*…*` render as styled rich text and are edited in the **inspector** rather than directly on canvas (rich spans can't round-trip through `contentEditable`).

### Built-in styles

Four named styles ship in `src/lib/constants.ts` and are selectable for any app:

| Style | Look |
| --- | --- |
| `hand-drawn-editorial` | One solid block per slide (navy / cream / coral / purple), Inter Medium, brush-script coral emphasis at a slight tilt, hand-drawn squiggles and arrows |
| `retro-rubberhose` | Cream + mustard + mint, slab display face, **cream** phone bezels ringed in 3px black ink, hard-offset shadows, 7% paper grain |
| `moody-curated` | Photography-led — warm tungsten gradient, thin serif headlines with one italic phrase, vignette, grain, bottom scrim |
| `dreamy-pastel` | Cotton-candy gradient, rounded sans, italic-serif emphasis in lilac |

Plus per-app brand palettes transcribed from each app's own token files: `speakdiary`, `bellyclock`, `lovetestai`, `pillbird`, `gutscribe`, `quizbud-*` (5 palettes), `calmpedal-*` (5 accents). Each app opens on its own brand palette; the named styles are always one dropdown away.

**Font substitutions:** Cooper Black and Tiempos/GT Sectra are commercial, so the built-ins use Alfa Slab One and Instrument Serif. Swap them in `src/app/layout.tsx` + `FONTS` in `src/lib/style.ts` if you license the originals.

**Tilt** is per-slide, not per-theme — use the Inspector's rotation slider on the device element (the editorial and rubberhose styles expect 10–25°).

**Assets:** each `public/screenshots/<app>/ASSETS.md` lists the mascots, photography, and illustrations that app still needs, plus what's already there.

## What's inside

- **Connected canvas editor** (`src/components/editor/`) — every screen sits on one horizontal canvas, so phones, captions, and other elements can be dragged across screen boundaries and exported as split crops when Connected mode is enabled.
- **Screen controls** — drag-to-reorder screens, click-to-edit text, screenshot drop targets, per-screen layout switcher, dark/light toggle.
- **Device frames** (`src/components/editor/device-frames.tsx`) — iPhone (PNG mockup), iPad, Android phone, Android tablet (portrait + landscape), feature graphic.
- **Save on your terms (git-trackable)** — **manual by default**: edits stay in memory behind an "unsaved changes" indicator until you hit **Save** (⌘/Ctrl+S), so opening the editor and clicking around never rewrites a file. Flip the toolbar toggle to **Auto** for the old ~600ms debounce. Either way the deck lands in **`projects/<app-id>.json`** (via `/api/project?app=<id>`) and is mirrored to `localStorage` under a per-app key. Commit `projects/` and you can `git clone` to another machine and resume where you left off. Leaving an app with unsaved edits prompts first, and every deck carries its own `appId`, so a save that lands late still writes to the file it came from.
- **Multi-device decks** — iOS and Android slide decks live side by side; switching the platform tab preserves both.
- **One-click export** — bulk PNG export at any required App Store / Play Store resolution using `html-to-image`; each PNG is rendered from the current connected or isolated deck mode.
- **Project migration** — older `app-store-screenshots.json` files are migrated on load. Existing per-slide transforms remain valid, and connected crops become available without rewriting the deck by hand.
- **Legacy-safe mode** — pre-v2 projects opened directly in the editor start in isolated-screen mode first, then can opt into connected crops with the toolbar's Connected/Isolated control. Skill-run in-place migrations keep legacy decks isolated unless the project had already explicitly opted into connected canvas.

## Adding screenshots

Two ways:

1. **Drop a file in the inspector** — drag-and-drop or click Pick. In local mode the file is sent to `/api/upload` with the active app id, hashed, and written to `public/screenshots/<app-id>/uploaded/<hash>.png`. In hosted mode that endpoint refuses and the image goes to IndexedDB instead, with the slide storing a short `idb:<key>`. Either way the key is a content hash, so re-dropping the same image reuses the existing entry rather than duplicating it.
2. **Reference a static file** — drop PNG/JPGs into `public/screenshots/<app-id>/` and point the slide's `screenshot` field at `/screenshots/<app-id>/<file>`.

Paths may contain `{locale}` (e.g. `/screenshots/myapp/{locale}/01.png`) to serve a different capture per language; it's substituted at render and export time.

## Local vs hosted mode

The editor runs in one of two persistence models, decided per instance:

| | `local` | `hosted` |
| --- | --- | --- |
| Apps come from | `projects/*.json` on disk | this browser's storage |
| Deck saves to | the project file | localStorage |
| Screenshots go to | `public/screenshots/<app>/uploaded/` | IndexedDB, referenced as `idb:<key>` |
| Your committed decks | opened normally | **never listed or served** |

Mode follows the actual filesystem: if `projects/` is writable it's `local`, otherwise `hosted`. That means `npm run dev` and a self-hosted box with a real disk behave exactly as before, while any immutable deployment (Vercel, Netlify, a read-only container) flips to hosted on its own. The failure direction is deliberate — a deploy nobody remembered to configure hides your decks instead of publishing them.

Override with `SCREENSHOTS_MODE=local|hosted` when the probe guesses wrong.

**Hosted mode is the shareable one.** A visitor lands on an empty editor, creates their own app, drops their own screenshots, and exports a zip — all client-side, nothing written to the server, and none of the decks in this repo visible to them. `/api/project`, `/api/upload`, and `POST /api/apps` all return 503; `/api/apps` reports an empty list without reading `projects/` at all.

Two things worth knowing before deploying:

- **There is no auth anywhere.** That's harmless on a read-only host because every write is refused. Do not point `SCREENSHOTS_MODE=local` at a public URL with a writable disk — any visitor could create and overwrite decks.
- **Hosted storage is per-browser.** Clearing site data deletes a visitor's apps. There's no account, no sync, and no server-side copy.

### Screenshots are not committed

`public/screenshots/**` images are gitignored — only `ASSETS.md` and `app-icon.png` are tracked. This is a public repo, and app captures are large, frequently re-shot, and usually show unreleased UI.

They still have to *live* under `public/` because the canvas renders them with a plain `<img src="/screenshots/…">`, and `html-to-image` can only snapshot same-origin images — a remote URL taints the canvas and the export comes out blank. Serving location and version control are separate concerns here.

The consequence: a fresh clone opens decks whose device screens are empty, with the picker showing *"uploaded image (not on disk)"*. Each app's `ASSETS.md` records what that deck expects. If you keep your captures elsewhere, point the folder at them instead of copying:

```powershell
mklink /J public\screenshots\myapp\uploaded D:\path\to\real\shots   # Windows
ln -s /path/to/real/shots public/screenshots/myapp/uploaded         # macOS/Linux
```

## Exporting

The toolbar dropdown lists every Apple/Google-required size for the current device. Click **Export bundle** to download a zip. In Connected mode, each PNG is clipped from the connected canvas, so an element that straddles two screens appears split exactly where you placed it. In Isolated mode, each screen clips its own elements and legacy offscreen content cannot leak into neighboring exports.

## Customizing

| Where | What |
| ------- | ------ |
| `src/lib/constants.ts` | Canvas dimensions, export sizes, frame ratios, **shared** themes, locales |
| `projects/<app-id>.json` | One app's project: name, device, connected-canvas mode, slide copy, screenshots, transforms, and app-only palettes |
| `src/lib/apps.ts` | App id rules, project/asset path helpers |
| `src/lib/defaults.ts` | Blank deck used for new apps and for resets |
| `src/components/editor/slide-canvas.tsx` | Add new layouts and connected-canvas element rendering |
| `src/components/editor/device-frames.tsx` | Tweak device chrome (bezel radii, camera dots) |
| `src/app/layout.tsx` | Swap the font (`next/font/google`) |

## Notes

- `mockup.png` is the iPhone bezel overlay; replacing it requires re-measuring the `PHONE_SCREEN` constants.
- Image preloading converts every static path to a base64 data URI before exports run, and export retries paths that were previously missing — this prevents the html-to-image race where some slide screenshots come out black.
- Reset via the toolbar's eraser icon clears the **current app's** screens only — its name, palette, locales, and the files on disk are kept, and other apps are untouched.
- **Removing an app** — hover a row in the app dropdown and click the ✕. It deletes `projects/<app-id>.json` (or the browser copy, hosted) after a confirm, and deliberately **keeps** `public/screenshots/<app-id>/`: the deck is a few KB the editor can rebuild, the screenshots are often the only copy. Delete that folder by hand if you want the app gone completely. The ✕ is hidden when only one app is left, since there'd be nowhere to land.
- **Portrait/landscape** lives in the inspector's **Device frame** panel, alongside the other controls for how the device is presented. It only appears for devices with a landscape export size, and unlike the rest of that panel it applies to the whole device deck, not one screen.
- **Undo** — ⌘/Ctrl+Z and the toolbar's undo/redo buttons. Steps follow actions, not the clock: one drag, or one run of typing in one field, is one step, but moving to a different control starts a new one. Switching device tab, orientation, or locale is view state and never lands on the stack. History is per-app and clears on switch.
- **Persistence model** — the canonical state lives in `projects/<app-id>.json` (git-tracked). On load, the editor reads that app's localStorage cache first for instant paint, then overwrites with the file contents if present; if the file endpoint is unavailable, saving is blocked so stale cache cannot overwrite disk. On save, both are written. If you ever see a conflict, the file always wins.
- **App identity** — the filename is the source of truth. `/api/project` validates `?app=` against a strict slug charset before touching the filesystem and stamps the id onto whatever it writes, so a stale or crafted `appId` in a payload can't redirect a save into another app's file.
- **Migration model** — schema v1 projects do not need a manual conversion. On first load, the editor upgrades localized text and transform records, writes `schemaVersion: 2`, preserves all existing screens, and keeps `connectedCanvas: false` so old offscreen/clipped elements export exactly as isolated screens. Turn on **Connected** in the toolbar when you want elements to cross screen edges. Explicit skill migrations preserve an existing `connectedCanvas` choice, otherwise they keep legacy decks isolated too.
- **Custom themes** — if a project references a theme id that is in neither `src/lib/constants.ts` nor that app's own `themes` array, the editor falls back to `clean-light` and shows a warning.

## Credits

This project is built on **[app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots)** by **[Parth Jadhav](https://github.com/ParthJadhav)** — *"end to end app store screenshot creation using AI"* — released under the **MIT License**.

Everything that makes the editor work came from upstream:

| From upstream | What it is |
| --- | --- |
| Connected-canvas editor | One horizontal canvas so elements cross screen boundaries and export as split crops |
| Device frames | iPhone PNG mockup, Android phone, 7"/10" tablets, iPad, feature graphic |
| Export pipeline | `html-to-image` capture at every required Apple/Google size, bundled with JSZip |
| Layout system | `hero`, `device-bottom`, `device-top`, `two-devices`, `no-device`, `split-landscape` |
| Persistence + migration | Project-file/localStorage model and the v1 → v2 schema upgrade |
| The scaffolding skill | `app-store-screenshots`, which generated this project |

The four named visual styles — **Hand-Drawn Editorial**, **Retro Rubberhose**, **Moody Curated**, **Dreamy Pastel** — are Parth's published style presets. This repo implements them against the style engine described above; the aesthetic direction (palettes, typography pairings, decoration rules) is theirs.

## What this fork changes

Upstream hosts **one app per checkout**: a single `app-store-screenshots.json` at the repo root, one shared `public/screenshots/uploaded/` bucket, autosave straight to disk, and a six-color theme with the visual style hardcoded in the canvas component. This fork changes those four things.

### 1. Many apps in one checkout

The original design meant scaffolding a fresh Next.js project per app. Now every app is self-contained and nothing crosses between them.

| Change | Detail |
| --- | --- |
| Per-app project files | `projects/<app>.json` replaces the single root `app-store-screenshots.json` |
| Per-app asset folders | `public/screenshots/<app>/` with its own `uploaded/` bucket and `app-icon.png` — identical images uploaded to two apps no longer collide in one shared folder |
| App switcher | Toolbar dropdown, plus **+ New app…** which writes the project file and asset dirs |
| `GET/POST /api/apps` | New route: list apps, create one from a name |
| `/api/project?app=<id>` | Now app-scoped. The id is validated against a strict slug charset before touching the filesystem, and stamped onto whatever it writes — a stale or crafted `appId` in a payload can't redirect a save into another app's file |
| `/api/upload` | Requires an app id; files land in that app's `uploaded/` folder |
| Per-app cache | `localStorage` key is namespaced per app; the editor reopens the last app you used |
| `src/lib/apps.ts` | New — id rules, path helpers, app summary type |
| Legacy migration | A pre-fork root `app-store-screenshots.json` is seeded into `projects/speakdiary.json` on first load, so an old checkout doesn't open empty |
| Scoped resets | Reset clears the current app's screens only, preserving its name, palette, locales, and files on disk |

### 2. Save when you choose

Upstream autosaves every edit ~600ms after you stop typing. That means simply opening the editor and clicking through screens rewrites files.

- **Manual is now the default.** Edits stay in memory behind an "unsaved changes" indicator until you press **Save** or ⌘/Ctrl+S.
- **Auto is still one toggle away**, with the original debounce.
- Your choice persists per browser.
- Leaving an app with unsaved edits prompts **Save / Discard / Cancel** instead of silently writing; closing the tab warns.
- Saves are reference-compared against the last persisted deck, so an edit made *during* a save correctly stays dirty.

### 3. Styles live in themes, not in the canvas

Previously the Dreamy Pastel look was hardcoded across five `theme.id === "dreamy-pastel"` branches in `slide-canvas.tsx`, so **every app rendered Quicksand headlines with purple Georgia emphasis regardless of its theme**. All five branches are gone, replaced by a declarative layer in `src/lib/style.ts`.

`Theme` gained optional `background`, `backgroundAlt`, `headline`, `label`, `emphasis`, `device` and `decor` fields — every one optional, so a six-color theme renders exactly as before. New capabilities:

- **Backgrounds** — `solid`, multi-stop `gradient` with an angle, or `solids` (one flat block per screen, cycled by index)
- **Typography** — per-theme family, weight, scale, tracking, line-height and case for headlines and labels
- **Emphasis** — the one `*asterisk-wrapped*` phrase per headline gets its own face, color, scale and tilt
- **Automatic contrast** — with a block-per-screen rotation, headline, label and emphasis each swap to readable ink when they'd otherwise land on their own color
- **Device chrome** — themable bezel fill and ink outline (cream bezels for the rubberhose look), drop shadow
- **Decoration** — paper grain, vignette, bottom scrim, blurred orbs, and hand-drawn motifs (squiggle, star, arrow, heart, paw, sparkle) placed deterministically from the slide id so they don't reshuffle on every render
- **Fonts** — Inter, Quicksand, Caveat, Instrument Serif and Alfa Slab One self-hosted via `next/font/google` and exposed as CSS variables that themes reference by name

### 4. Palettes are editable, and per-app

- **Palette editor** (🎨 in the toolbar) — background kind, per-stop colors, gradient angle, and ink/accent/muted/emphasis swatches with a live preview.
- **Clone-on-write** (`src/lib/theme-edit.ts`) — editing a shared starter copies it into the app's own `themes` array first, so tweaking a color for one app can never change another. App themes win on id collision.
- **Brand palettes** transcribed from each app's real design tokens: `bellyclock` (violet → cyan → magenta), `lovetestai` (rose → gold), `pillbird` (Blossom cream/blush), `gutscribe` (terracotta/sage/ocean), `quizbud` (all five rotator palettes), `calmpedal` (all five accents), `speakdiary` (dreamy pastel). Each app opens on its own.

### 5. Reusable colors and fonts across apps

Picking colors per screen meant copying hex values between views, and font choices weren't reachable from the UI at all. **Screen style** in the inspector fixes both:

- **Per-screen background override** — any screen can take its own color without forking the app's palette. Ink is re-derived automatically, so a background you pick stays readable.
- **Recent colors and recent fonts** — stored in `localStorage`, **not** in any project file, so a color used on PillBird is one click away while editing QuizBud. Shift-click a swatch to blend it into a gradient with the current color.
- **Font pickers** for headline and label, exposing every loaded face (Inter, Quicksand, Instrument Serif, Alfa Slab One, Caveat) plus system, Georgia and monospace — previously only reachable by hand-editing JSON.
- **Contrast-based ink** (`inkFor`) replaces the old light/dark assumption: the theme's two inks are compared against the actual surface and the better-contrasting one wins. That's what makes arbitrary user-picked backgrounds safe.

### 6. Flat or 3D device frames

**Device frame** in the inspector switches per screen between the original flat mockup and a CSS-3D perspective tilt:

- **Angle presets** (Front, Turn left/right, Hero, Showcase, Lay back) plus Y-turn, X-tilt and lens-depth sliders, clamped to ±60° so the frame can't break.
- **Body finishes** — Graphite, Midnight, Natural / White / Desert Titanium (iOS), Porcelain, Bay Blue, Hazel (Android), Cream Ink, or "Follow theme".
- **Real Three.js device model** with a continuous metal shell, curved glass, side controls and adjustable physical depth. The Android silhouette uses softer Honor/Huawei-inspired flagship proportions instead of a generic square slab.

The renderer uses an original procedural mesh rather than a licensed manufacturer asset. WebGL preserves its drawing buffer so the static frame remains compatible with image export. Flat mode still renders its children untouched, so existing flat decks are unaffected.

### 7. Smaller changes

- Starter decks are **10 phone screens** (was 5), iPad 6 (was 3), tablets 5 (was 2) — alternating layouts with `inverted` flips for rhythm, each headline seeded with an `*emphasis*` phrase. Note Google Play caps phone screenshots at 8; Apple allows 10.
- New apps default to the **Android** device, since Play assets are the common case here.
- `public/screenshots/<app>/ASSETS.md` per app documents the mascots, photography and illustrations that app still needs.

### Licensing

Upstream is MIT, which permits this use and requires the copyright and permission notices be retained. See [`LICENSE`](./LICENSE) — Parth's original notice is kept, with a second notice covering the modifications above.

### Font substitutions

Cooper Black and Tiempos / GT Sectra are commercial faces. The built-in styles substitute [Alfa Slab One](https://fonts.google.com/specimen/Alfa+Slab+One) and [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), with [Caveat](https://fonts.google.com/specimen/Caveat), [Quicksand](https://fonts.google.com/specimen/Quicksand), and [Inter](https://fonts.google.com/specimen/Inter) — all SIL Open Font License.
