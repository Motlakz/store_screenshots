// Editor chrome theme (the app shell — not the screenshot palettes in
// constants.ts, which are per-app design tokens and stay untouched).
//
// Three modes, stored in localStorage so a choice survives reloads:
//   "system" — follow the OS, which is what the editor did before the toggle
//   "light"  — force light, for working in daylight
//   "dark"   — force dark
//
// Whatever the mode resolves to, an explicit `light`/`dark` class always lands
// on <html>. That matters beyond the CSS variables: tailwind.config.ts uses
// `darkMode: ["class"]`, so `dark:` utilities only fire when the class is
// there. Resolving "system" to a real class keeps the tokens and the `dark:`
// variants telling the same story.

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "editor-theme-mode";

export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

export function isThemeMode(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

/** The mode saved from a previous session, or "system" for a first visit. */
export function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function storeMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* private mode / quota — the class is still applied, just not remembered */
  }
}

export function prefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

/** Put the resolved theme on <html>. Both classes are managed together so the
 *  `:root:not(.light)` media fallback in globals.css can never double-apply. */
export function applyMode(mode: ThemeMode) {
  const resolved = resolveMode(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  // Keeps native UI the browser paints for us (form controls, the scrollbar
  // gutter before our styles apply) on the same side as the rest of the shell.
  root.style.colorScheme = resolved;
}

/**
 * Runs before first paint via a blocking <script> in the document head, so the
 * shell never flashes the wrong theme. Kept dependency-free and inlined — it
 * has to execute before any bundle loads. Mirrors applyMode() above; change
 * both together.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var m=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(m!=="light"&&m!=="dark"&&m!=="system")m="system";
var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;
r.classList.toggle("dark",d);r.classList.toggle("light",!d);
r.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;
