import { DEFAULT_APP_ID, titleFromAppId } from "./apps";
import { DEFAULT_LOCALE } from "./locale";
import { DEFAULT_THEME_ID, PROJECT_SCHEMA_VERSION } from "./constants";
import type { Device, ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const en = (s: string) => ({ [DEFAULT_LOCALE]: s });

// Ten screens out of the box — easier to delete a couple than to build them
// up. The layout order alternates device placement and flips `inverted` every
// few screens so the deck already reads with rhythm before any editing. Each
// headline carries one *asterisk-wrapped* phrase so themes with an emphasis
// face show their script/italic treatment immediately.
function makeStarterSlides(): Slide[] {
  const plan: Array<{
    layout: Slide["layout"];
    label: string;
    headline: string;
    inverted?: boolean;
    secondary?: boolean;
  }> = [
    { layout: "hero", label: "MEET YOUR APP", headline: "Sell one *idea*\nper screen." },
    { layout: "device-bottom", label: "FEATURE 01", headline: "Your headline\n*lives* here." },
    { layout: "device-top", label: "FEATURE 02", headline: "Flip it for\nvisual *rhythm*.", inverted: true },
    { layout: "two-devices", label: "FEATURE 03", headline: "Show two\n*screens* at once.", secondary: true },
    { layout: "hero", label: "FEATURE 04", headline: "Lead with the\n*outcome*." },
    { layout: "device-bottom", label: "FEATURE 05", headline: "One benefit,\n*one* look." },
    { layout: "no-device", label: "WHY IT WORKS", headline: "Let the words\ncarry *this* one.", inverted: true },
    { layout: "device-top", label: "FEATURE 06", headline: "Close the loop\non the *promise*." },
    { layout: "two-devices", label: "FEATURE 07", headline: "Pair the\n*before* and after.", secondary: true },
    { layout: "no-device", label: "GET STARTED", headline: "And so much\n*more*." },
  ];

  return plan.map((s) => ({
    id: nid(),
    layout: s.layout,
    label: en(s.label),
    headline: en(s.headline),
    screenshot: "",
    ...(s.secondary ? { screenshotSecondary: "" } : {}),
    ...(s.inverted ? { inverted: true } : {}),
  }));
}

function ipadStarter(): Slide[] {
  const plan: Array<{ layout: Slide["layout"]; label: string; headline: string; inverted?: boolean }> = [
    { layout: "hero", label: "MEET YOUR APP", headline: "Made for the\n*big* screen." },
    { layout: "device-bottom", label: "FEATURE 01", headline: "Built for\n*focus*." },
    { layout: "device-top", label: "FEATURE 02", headline: "Always within\n*reach*.", inverted: true },
    { layout: "hero", label: "FEATURE 03", headline: "Room to\n*think*." },
    { layout: "device-bottom", label: "FEATURE 04", headline: "Every detail,\n*bigger*." },
    { layout: "no-device", label: "GET STARTED", headline: "Start on\n*any* device." },
  ];
  return plan.map((s) => ({
    id: nid(),
    layout: s.layout,
    label: en(s.label),
    headline: en(s.headline),
    screenshot: "",
    ...(s.inverted ? { inverted: true } : {}),
  }));
}

function tabletStarter(kind: "7" | "10"): Slide[] {
  const opener = kind === "7" ? "Pocket-sized\n*power*." : "Made for the\n*big* screen.";
  const plan: Array<{ layout: Slide["layout"]; label: string; headline: string; inverted?: boolean }> = [
    { layout: "hero", label: "MEET YOUR APP", headline: opener },
    { layout: "split-landscape", label: "FEATURE 01", headline: "Wide canvas,\nbigger *ideas*." },
    { layout: "device-bottom", label: "FEATURE 02", headline: "See more\nat *once*." },
    { layout: "split-landscape", label: "FEATURE 03", headline: "Built to\n*scale*.", inverted: true },
    { layout: "no-device", label: "GET STARTED", headline: "Ready when\n*you* are." },
  ];
  return plan.map((s) => ({
    id: nid(),
    layout: s.layout,
    label: en(s.label),
    headline: en(s.headline),
    screenshot: "",
    ...(s.inverted ? { inverted: true } : {}),
  }));
}

function fgStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "feature-graphic",
      label: {},
      headline: en("Your tagline goes here."),
      screenshot: "",
    },
  ];
}

// A blank deck for one app. Called with fresh slide ids every time, so
// creating a new app never aliases another app's slides.
export function makeDefaultProject(appId: string, appName?: string): ProjectState {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appId,
    appName: appName || titleFromAppId(appId),
    themeId: DEFAULT_THEME_ID,
    connectedCanvas: true,
    locales: [DEFAULT_LOCALE],
    locale: DEFAULT_LOCALE,
    // This repo generates Play Store assets first; iOS decks are one tab away.
    device: "android",
    orientation: "portrait",
    appIcon: "",
    slidesByDevice: {
      iphone: makeStarterSlides(),
      android: makeStarterSlides(),
      ipad: ipadStarter(),
      "android-7": tabletStarter("7"),
      "android-10": tabletStarter("10"),
      "feature-graphic": fgStarter(),
    },
  };
}

// Template used to backfill missing fields when merging a loaded project.
export const DEFAULT_PROJECT: ProjectState = makeDefaultProject(DEFAULT_APP_ID, "My App");

export function newSlide(layout: Slide["layout"] = "device-bottom"): Slide {
  return {
    id: nid(),
    layout,
    label: en("NEW"),
    headline: en("Edit this\nheadline."),
    screenshot: "",
  };
}

export function detectPlatform(device: Device): "ios" | "android" {
  return device === "iphone" || device === "ipad" ? "ios" : "android";
}
