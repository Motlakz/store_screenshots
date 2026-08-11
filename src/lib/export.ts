import { getExportSizes, type ExportSize } from "./constants";
import { detectPlatform } from "./defaults";
import type { Device, Orientation, ProjectState, Slide } from "./types";

// What one Export run covers: some decks, at some sizes, in some languages.
// Everything the zip is named and foldered by comes from here, so the dialog
// can preview the exact same paths the export will write.

export type ExportPick = {
  device: Device;
  sizes: ExportSize[];
  /** Omitted means every slide in the deck. */
  slideIds?: string[];
};

export type ExportSelection = {
  /** Locale codes, in project order. Never empty. */
  locales: string[];
  /** Decks to render, in project order. Never empty. */
  picks: ExportPick[];
};

/** One rendered PNG. */
export type ExportUnit = {
  device: Device;
  locale: string;
  size: ExportSize;
  slide: Slide;
  slideIndex: number;
  /** Path inside the zip, root folder included. */
  path: string;
};

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "screenshots"
  );
}

/**
 * Base name for the zip and for the single folder inside it, e.g.
 * `speakdiary-android-fr-screenshots`. Anything you picked exactly one of gets
 * named here instead of becoming a folder — that's what keeps the tree flat.
 */
export function exportBundleName(
  appId: string,
  appName: string,
  selection: ExportSelection,
): string {
  const slug = appId || slugify(appName);
  const devices = selection.picks.map((pick) => pick.device);
  const platforms = new Set(devices.map(detectPlatform));
  // One deck reads best as the device itself ("feature-graphic"); several decks
  // that share a platform collapse to "android".
  const scope =
    devices.length === 1 ? devices[0] : platforms.size === 1 ? [...platforms][0] : null;
  const locale = selection.locales.length === 1 ? selection.locales[0] : null;
  return [slug, scope, locale, "screenshots"].filter(Boolean).join("-");
}

/**
 * Every PNG this selection produces, in render order — grouped by locale first
 * so the export loop switches language (the expensive re-render) as rarely as
 * possible.
 */
export function planExport(state: ProjectState, selection: ExportSelection): ExportUnit[] {
  const root = exportBundleName(state.appId, state.appName, selection);
  const manyDecks = selection.picks.length > 1;
  const manyLocales = selection.locales.length > 1;
  const units: ExportUnit[] = [];

  for (const locale of selection.locales) {
    for (const pick of selection.picks) {
      const deck = state.slidesByDevice[pick.device] || [];
      const selectedIds = pick.slideIds?.length ? new Set(pick.slideIds) : null;
      const slides = selectedIds ? deck.filter((slide) => selectedIds.has(slide.id)) : deck;
      const manySizes = pick.sizes.length > 1;
      for (const size of pick.sizes) {
        slides.forEach((slide) => {
          const slideIndex = deck.findIndex((entry) => entry.id === slide.id);
          const segments = [
            manyLocales ? locale : null,
            manyDecks ? pick.device : null,
            manySizes ? `${size.w}x${size.h}` : null,
          ].filter(Boolean) as string[];
          const filename = `${String(slideIndex + 1).padStart(2, "0")}-${slide.layout}.png`;
          units.push({
            device: pick.device,
            locale,
            size,
            slide,
            slideIndex,
            path: [root, ...segments, filename].join("/"),
          });
        });
      }
    }
  }
  return units;
}

/** Decks that have at least one screen, in a stable order for the dialog. */
export function availableDecks(state: ProjectState): { device: Device; count: number }[] {
  const order: Device[] = ["iphone", "ipad", "android", "android-7", "android-10", "feature-graphic"];
  return order
    .map((device) => ({ device, count: (state.slidesByDevice[device] || []).length }))
    .filter((deck) => deck.count > 0);
}

/**
 * Default selection for the dialog: the deck you're looking at, every size it
 * offers, every language the project targets.
 */
export function defaultSelection(
  state: ProjectState,
  orientation: Orientation,
  activeSlideId?: string | null,
): ExportSelection {
  return {
    locales: [state.locale],
    picks: [{
      device: state.device,
      sizes: getExportSizes(state.device, orientation),
      ...(activeSlideId ? { slideIds: [activeSlideId] } : {}),
    }],
  };
}

/** Landscape only exists for tablets; everything else renders portrait. */
export function sizesFor(device: Device, orientation: Orientation): ExportSize[] {
  return getExportSizes(device, orientation);
}
