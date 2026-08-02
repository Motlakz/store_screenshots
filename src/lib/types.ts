export type Device =
  | "iphone"
  | "ipad"
  | "android"
  | "android-7"
  | "android-10"
  | "feature-graphic";

export type Orientation = "portrait" | "landscape";

/** Flat is the original look; "3d" adds a perspective tilt and a body edge. */
export type DeviceFrameStyle = "flat" | "3d";

export type SlideFrame = {
  style?: DeviceFrameStyle;
  /** Body finish id from FRAME_COLORS; omitted follows the theme. */
  color?: string;
  /** Perspective rotation in degrees, clamped to ±60. */
  rotateX?: number;
  rotateY?: number;
  /** CSS perspective depth — larger is a flatter, longer lens. */
  depth?: number;
  /** Extruded device-body depth in canvas pixels. */
  thickness?: number;
};

// "manual" keeps edits in memory until an explicit Save; "auto" writes on a
// debounce. Defaults to manual so nothing touches disk unless you ask.
export type SaveMode = "manual" | "auto";

export type Platform = "ios" | "android";

// Layouts the editor can render. Vary across slides for visual rhythm.
export type SlideLayout =
  | "hero"             // centered device, headline above
  | "device-bottom"    // headline top, device bottom-center
  | "device-top"       // device top, headline bottom (contrast)
  | "two-devices"      // back + front phones, headline above
  | "no-device"        // big headline + decorative blob, no device
  | "split-landscape"  // landscape tablets only: caption left + device right
  | "feature-graphic"; // 1024×500 banner with icon + name + tagline

// Per-element rect in canvas pixel space. Optional rotation in degrees and zIndex.
export type ElementTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

export type BuiltInElementId = "caption" | "device" | "deviceSecondary";
export type TextElementId = `text:${string}`;
export type FocusElementId = `focus:${string}`;
export type ElementId = BuiltInElementId | TextElementId | FocusElementId;

export type SelectedElement = {
  slideId: string;
  elementId: ElementId;
};

// Per-locale text keyed by locale code (e.g. "en", "de"). A locale is absent
// if the user hasn't typed anything for it; renderers fall back to en (see
// lib/locale.ts). The set of locales a project targets lives on
// ProjectState.locales.
export type LocalizedText = Partial<Record<string, string>>;

export type TextElement = {
  id: string;
  text: LocalizedText;
  transform: ElementTransform;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export type ScreenshotFocusElement = {
  id: string;
  /** Optional alternate source; omitted uses the slide's primary screenshot. */
  source?: string;
  /** Percent crop within the source screenshot. */
  crop: { x: number; y: number; width: number; height: number };
  /** Independent position and size on the marketing canvas. */
  transform: ElementTransform;
  borderRadius?: number;
  borderWidth?: number;
  accentColor?: string;
};

export type Slide = {
  id: string;
  layout: SlideLayout;
  label: LocalizedText;       // tiny uppercase caption above headline, per locale
  headline: LocalizedText;    // multi-line; newlines are intentional, per locale
  screenshot: string;         // path under /screenshots/ — may contain {locale}
  screenshotSecondary?: string; // for two-devices layout — may contain {locale}
  screenshotTertiary?: string; // third image used by feature-graphic collages
  focusElements?: ScreenshotFocusElement[];
  inverted?: boolean;         // dark background variant
  // Per-screen background override. Wins over the theme's background so one
  // screen can differ without forking the whole palette. Ink is re-derived
  // from it automatically.
  background?: ThemeBackground;
  // Per-screen typography overrides — a font stack from FONT_CHOICES.
  headlineFont?: string;
  labelFont?: string;
  // Per-screen device frame presentation. See lib/frames.ts.
  frame?: SlideFrame;
  // Independent presentation for the back/second phone in two-device layouts.
  frameSecondary?: SlideFrame;
  // Per-element overrides; when present, replaces layout default placement.
  transforms?: Partial<Record<BuiltInElementId, ElementTransform>>;
  textElements?: TextElement[];
};

export type ThemeId =
  | "clean-light"
  | "dark-bold"
  | "warm-editorial"
  | "ocean-fresh"
  | "bloom-roast";

// ---------- Style system ----------
// A theme is more than six colors: the named styles differ in typography,
// background treatment, device chrome, and decoration. Everything below is
// optional — a theme that sets only the flat colors renders exactly as before.

export type ThemeBackground =
  | { kind: "solid"; color: string }
  // Multi-stop gradient, e.g. the cotton-candy sky.
  | { kind: "gradient"; stops: string[]; angle?: number }
  // One flat color per slide, cycled by slide index — the editorial look.
  | { kind: "solids"; colors: string[] };

export type ThemeFont = {
  /** CSS font-family stack. Use the var(--font-*) names loaded in layout.tsx. */
  family: string;
  weight?: number;
  /** Multiplier on the layout's computed size. */
  scale?: number;
  /** Tracking in em. */
  letterSpacing?: number;
  lineHeight?: number;
  italic?: boolean;
  transform?: "none" | "uppercase" | "lowercase";
};

/** Styling for the ONE *asterisk-wrapped* phrase per headline. */
export type ThemeEmphasis = ThemeFont & {
  color: string;
  /** Degrees of tilt, for the brush-script look. */
  rotation?: number;
};

export type ThemeDevice = {
  /** Bezel fill — cream instead of black for the rubberhose style. */
  bezel?: string;
  bezelStroke?: string;
  bezelStrokeWidth?: number;
  /** Default tilt in degrees applied to device frames. */
  tilt?: number;
  shadow?: string;
  /** Forces the screenshot's own UI to read as dark (moody style). */
  screenTint?: string;
};

export type ThemeMotif = "squiggle" | "star" | "arrow" | "heart" | "paw" | "sparkle";

export type ThemeDecor = {
  /** Paper-grain overlay opacity, 0–1. */
  grain?: number;
  /** Radial vignette strength, 0–1. */
  vignette?: number;
  /** Bottom gradient scrim that anchors headlines over photography. */
  scrim?: boolean;
  /** Soft blurred colour orbs (the default decoration). */
  blobs?: boolean;
  /** Hand-drawn marks scattered sparsely across the slide. */
  motifs?: ThemeMotif[];
  motifColor?: string;
  /** SpeakDiary's bespoke per-slide illustration set. */
  dreamy?: boolean;
  /** BellyClock's purposeful physiology field-note diagrams (never random doodles). */
  bellyclock?: boolean;
  /** Lowercase corner wordmark, editorial style. */
  wordmark?: boolean;
};

export type Theme = {
  id: string;
  name: string;
  bg: string;          // primary background
  bgAlt: string;       // inverted background
  fg: string;          // text on bg
  fgAlt: string;       // text on bgAlt
  accent: string;
  muted: string;
  // Optional style layer — see resolveStyle() in lib/style.ts for defaults.
  background?: ThemeBackground;
  backgroundAlt?: ThemeBackground;
  headline?: ThemeFont;
  label?: ThemeFont;
  emphasis?: ThemeEmphasis;
  device?: ThemeDevice;
  decor?: ThemeDecor;
};

export type ProjectState = {
  schemaVersion?: number;
  // Slug identifying which app this deck belongs to. Also the project
  // filename (projects/<appId>.json) and the screenshot folder
  // (public/screenshots/<appId>/). See lib/apps.ts.
  appId: string;
  appName: string;
  themeId: string;
  // Palettes that belong to this app only. Merged over the shared THEMES map
  // at render time, so one app's brand colors never leak into another's.
  themes?: Theme[];
  // v1 projects render as isolated screens until the user opts into connected crops.
  connectedCanvas: boolean;
  // Locales this project targets. Drives the toolbar dropdown and bulk export.
  // Single-locale projects ship as ["en"] and hide the locale UI.
  locales: string[];
  locale: string;
  device: Device;
  orientation: Orientation;
  // Per-device slide decks so platform switching preserves work
  slidesByDevice: Record<Device, Slide[]>;
  appIcon?: string;    // path under /public (e.g. /app-icon.png)
};
