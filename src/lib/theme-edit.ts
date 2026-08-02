// Editing a palette from the UI writes into the ACTIVE APP's own `themes`
// array. Shared starters in constants.ts are copied on first edit, so tweaking
// a color for one app can never change how another app renders.

import { resolveStyle } from "./style";
import type { ProjectState, Theme, ThemeBackground, ThemeEmphasis } from "./types";

/**
 * The emphasis block to edit for a theme that doesn't define one.
 *
 * Emphasis styles the `*asterisk-wrapped*` phrase in a headline, and a theme
 * that ships one (the editorial styles) uses it for a whole look — script
 * face, larger size, a tilt. A theme that doesn't should not acquire all of
 * that just because someone opened the color picker, so every field here is
 * inherited from the headline. The only thing that ends up differing is the
 * color, which is the point.
 */
export function emphasisWithDefaults(theme: Theme): ThemeEmphasis {
  if (theme.emphasis) return theme.emphasis;
  const headline = resolveStyle(theme).headline;
  return {
    family: headline.family,
    weight: headline.weight,
    scale: 1,
    color: theme.accent,
  };
}

/**
 * Apply `patch` to the app's copy of `base`, cloning it out of the shared
 * starters if the app doesn't own it yet. The id is kept, so the app's entry
 * simply shadows the shared one (app themes win on id collision).
 */
export function patchActiveTheme(
  state: ProjectState,
  base: Theme,
  patch: Partial<Theme>,
): ProjectState {
  const next: Theme = { ...base, ...patch };
  const owned = (state.themes || []).some((t) => t.id === base.id);
  const themes = owned
    ? (state.themes || []).map((t) => (t.id === base.id ? next : t))
    : [...(state.themes || []), next];
  return { ...state, themes, themeId: next.id };
}

/** True once the app owns its copy and edits stay local to it. */
export function ownsTheme(state: ProjectState, themeId: string): boolean {
  return (state.themes || []).some((t) => t.id === themeId);
}

// ---------- Background helpers ----------
// Gradient stops are stored as "#RRGGBB 45%" so authors keep control of
// positions; the editor rewrites only the color half.

export function stopColor(stop: string): string {
  const m = /#[0-9a-fA-F]{3,8}/.exec(stop);
  return m ? m[0] : "#ffffff";
}

export function stopPosition(stop: string): string {
  return stop.replace(/#[0-9a-fA-F]{3,8}\s*/, "").trim();
}

export function withStopColor(stop: string, color: string): string {
  const pos = stopPosition(stop);
  return pos ? `${color} ${pos}` : color;
}

/** The colors a background exposes for editing, whatever its kind. */
export function backgroundColors(bg: ThemeBackground | undefined, fallback: string): string[] {
  if (!bg) return [fallback];
  if (bg.kind === "solid") return [bg.color];
  if (bg.kind === "solids") return bg.colors;
  return bg.stops.map(stopColor);
}

/** Replace the color at `index`, preserving gradient stop positions. */
export function setBackgroundColor(
  bg: ThemeBackground,
  index: number,
  color: string,
): ThemeBackground {
  if (bg.kind === "solid") return { ...bg, color };
  if (bg.kind === "solids") {
    const colors = [...bg.colors];
    colors[index] = color;
    return { ...bg, colors };
  }
  const stops = [...bg.stops];
  stops[index] = withStopColor(stops[index], color);
  return { ...bg, stops };
}

export function addBackgroundColor(bg: ThemeBackground, color: string): ThemeBackground {
  if (bg.kind === "solid") return { kind: "gradient", stops: [bg.color, color], angle: 180 };
  if (bg.kind === "solids") return { ...bg, colors: [...bg.colors, color] };
  return { ...bg, stops: [...bg.stops, color] };
}

export function removeBackgroundColor(bg: ThemeBackground, index: number): ThemeBackground {
  if (bg.kind === "solid") return bg;
  if (bg.kind === "solids") {
    if (bg.colors.length <= 1) return bg;
    return { ...bg, colors: bg.colors.filter((_, i) => i !== index) };
  }
  if (bg.stops.length <= 2) return bg;
  return { ...bg, stops: bg.stops.filter((_, i) => i !== index) };
}

/**
 * Switch background kind, carrying the current colors across so the slide
 * doesn't flash to an unrelated palette mid-edit.
 */
export function convertBackground(
  bg: ThemeBackground | undefined,
  kind: ThemeBackground["kind"],
  fallback: string,
): ThemeBackground {
  const colors = backgroundColors(bg, fallback);
  if (kind === "solid") return { kind: "solid", color: colors[0] };
  if (kind === "solids") return { kind: "solids", colors };
  const angle = bg?.kind === "gradient" ? bg.angle ?? 180 : 180;
  const stops = colors.length >= 2 ? colors : [colors[0], colors[0]];
  return { kind: "gradient", stops, angle };
}

export const BACKGROUND_KIND_LABEL: Record<ThemeBackground["kind"], string> = {
  solid: "Solid",
  gradient: "Gradient",
  solids: "Block per screen",
};

export const BACKGROUND_KIND_HINT: Record<ThemeBackground["kind"], string> = {
  solid: "One flat color across every screen.",
  gradient: "Blended stops. Drag the angle to re-aim it.",
  solids: "Each screen takes the next color in the list, then wraps.",
};
