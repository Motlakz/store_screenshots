import { DEFAULT_APP_ID, titleFromAppId } from "./apps";
import { DEFAULT_LOCALE } from "./locale";
import { DEFAULT_THEME_ID, PROJECT_SCHEMA_VERSION } from "./constants";
import type { Device, ProjectState, Slide } from "./types";

let _id = 0;
export const nid = () => `s_${Date.now().toString(36)}_${(_id++).toString(36)}`;

const en = (s: string) => ({ [DEFAULT_LOCALE]: s });

function makeStarterSlides(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Sell one\nidea per slide."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Your headline\nlives here."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "two-devices",
      label: en("FEATURE 02"),
      headline: en("Show two\nscreens at once."),
      screenshot: "",
      screenshotSecondary: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 03"),
      headline: en("Flip the contrast\nfor visual rhythm."),
      screenshot: "",
      inverted: true,
    },
    {
      id: nid(),
      layout: "no-device",
      label: en("MORE"),
      headline: en("And so\nmuch more."),
      screenshot: "",
    },
  ];
}

function ipadStarter(): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en("Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-bottom",
      label: en("FEATURE 01"),
      headline: en("Built for\nfocus."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "device-top",
      label: en("FEATURE 02"),
      headline: en("Always within reach."),
      screenshot: "",
      inverted: true,
    },
  ];
}

function tabletStarter(kind: "7" | "10"): Slide[] {
  return [
    {
      id: nid(),
      layout: "hero",
      label: en("MEET YOUR APP"),
      headline: en(kind === "7" ? "Pocket-sized\npower." : "Made for\nthe big screen."),
      screenshot: "",
    },
    {
      id: nid(),
      layout: "split-landscape",
      label: en("FEATURE 01"),
      headline: en("Wide canvas,\nbigger ideas."),
      screenshot: "",
    },
  ];
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
