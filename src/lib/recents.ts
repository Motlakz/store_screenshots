"use client";
// Recently used colors and fonts, shared across EVERY app.
//
// This is deliberately not part of any project file: the whole point is that a
// color you liked on PillBird is one click away while you're editing QuizBud.
// It lives in localStorage, so it follows the browser rather than the repo.

const COLORS_KEY = "app-screenshots:recents:colors";
const FONTS_KEY = "app-screenshots:recents:fonts";

const MAX_COLORS = 18;
const MAX_FONTS = 8;

function read(key: string, max: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && !!v).slice(0, max);
  } catch {
    return [];
  }
}

function write(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* a full quota shouldn't break editing */
  }
}

function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return null;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

/** Most-recent-first, de-duplicated. */
function push(list: string[], value: string, max: number): string[] {
  const without = list.filter((v) => v !== value);
  return [value, ...without].slice(0, max);
}

export function getRecentColors(): string[] {
  return read(COLORS_KEY, MAX_COLORS);
}

export function rememberColor(value: string): string[] {
  const hex = normalizeHex(value);
  if (!hex) return getRecentColors();
  const next = push(getRecentColors(), hex, MAX_COLORS);
  write(COLORS_KEY, next);
  return next;
}

export function getRecentFonts(): string[] {
  return read(FONTS_KEY, MAX_FONTS);
}

export function rememberFont(fontId: string): string[] {
  if (!fontId) return getRecentFonts();
  const next = push(getRecentFonts(), fontId, MAX_FONTS);
  write(FONTS_KEY, next);
  return next;
}

export function clearRecentColors() {
  write(COLORS_KEY, []);
}
