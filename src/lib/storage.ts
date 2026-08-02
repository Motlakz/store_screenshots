"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIVE_APP_STORAGE_KEY,
  LOCAL_APPS_STORAGE_KEY,
  PROJECT_SCHEMA_VERSION,
  SAVE_MODE_STORAGE_KEY,
  storageKey,
} from "./constants";
import {
  DEFAULT_APP_ID,
  isValidAppId,
  slugifyAppId,
  titleFromAppId,
  type AppSummary,
  type EditorMode,
} from "./apps";
import { DEFAULT_PROJECT, makeDefaultProject } from "./defaults";
import { coerceLocalized } from "./locale";
import type {
  Device,
  ElementTransform,
  ProjectState,
  SaveMode,
  Slide,
  TextElement,
  Theme,
} from "./types";

const HISTORY_LIMIT = 50;
// How long a coalescing key stays open. Two edits sharing a key inside this
// window are the same gesture; past it, the gesture is over.
const COALESCE_MS = 500;
// Debounce file/localStorage writes — frequent enough to feel instant, infrequent enough not to thrash disk.
const SAVE_DEBOUNCE_MS = 600;

function cleanTransform(value: unknown): ElementTransform | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ElementTransform>;
  const required = [raw.x, raw.y, raw.width, raw.height];
  if (!required.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  return {
    x: raw.x!,
    y: raw.y!,
    width: Math.max(1, raw.width!),
    height: Math.max(1, raw.height!),
    ...(typeof raw.rotation === "number" && Number.isFinite(raw.rotation)
      ? { rotation: raw.rotation }
      : {}),
    ...(typeof raw.zIndex === "number" && Number.isFinite(raw.zIndex)
      ? { zIndex: raw.zIndex }
      : {}),
  };
}

function cleanTextElement(value: unknown): TextElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<TextElement>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return undefined;
  const transform = cleanTransform(raw.transform);
  if (!transform) return undefined;
  return {
    id: raw.id,
    text: coerceLocalized(raw.text as unknown),
    transform,
    ...(typeof raw.fontSize === "number" && Number.isFinite(raw.fontSize)
      ? { fontSize: raw.fontSize }
      : {}),
    ...(typeof raw.fontWeight === "number" && Number.isFinite(raw.fontWeight)
      ? { fontWeight: raw.fontWeight }
      : {}),
    ...(typeof raw.color === "string" ? { color: raw.color } : {}),
    ...(raw.align === "left" || raw.align === "center" || raw.align === "right"
      ? { align: raw.align }
      : {}),
  };
}

// Migrate older projects into the current schema while keeping legacy decks
// visually stable until they explicitly opt into connected canvas.
function migrateSlide(slide: Slide): Slide {
  const transforms = slide.transforms
    ? Object.fromEntries(
        Object.entries(slide.transforms)
          .map(([id, transform]) => [id, cleanTransform(transform)])
          .filter((entry): entry is [string, ElementTransform] => !!entry[1]),
      )
    : undefined;
  const textElements = Array.isArray(slide.textElements)
    ? slide.textElements.map(cleanTextElement).filter((t): t is TextElement => !!t)
    : undefined;

  return {
    ...slide,
    label: coerceLocalized(slide.label as unknown),
    headline: coerceLocalized(slide.headline as unknown),
    ...(transforms && Object.keys(transforms).length > 0 ? { transforms } : { transforms: undefined }),
    ...(textElements && textElements.length > 0 ? { textElements } : { textElements: undefined }),
  };
}

// Keep only well-formed palettes so a hand-edited `themes` array can't crash
// theme lookup for the whole app.
function cleanThemes(value: unknown): Theme[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const themes = value.filter((t): t is Theme => {
    if (!t || typeof t !== "object") return false;
    const raw = t as Partial<Theme>;
    return (
      typeof raw.id === "string" &&
      !!raw.id.trim() &&
      typeof raw.bg === "string" &&
      typeof raw.fg === "string"
    );
  });
  return themes.length > 0 ? themes : undefined;
}

function mergeWithDefaults(parsed: Partial<ProjectState>, appId: string): ProjectState {
  const connectedCanvas =
    typeof parsed.connectedCanvas === "boolean"
      ? parsed.connectedCanvas
      : false;
  const themeId =
    typeof parsed.themeId === "string" && parsed.themeId.trim()
      ? parsed.themeId
      : DEFAULT_PROJECT.themeId;
  const slidesByDevice = parsed.slidesByDevice
    ? Object.fromEntries(
        Object.entries(parsed.slidesByDevice).map(([device, slides]) => [
          device,
          Array.isArray(slides) ? slides.map((slide) => migrateSlide(slide as Slide)) : [],
        ]),
      )
    : {};
  const themes = cleanThemes(parsed.themes);
  const merged: ProjectState = {
    ...DEFAULT_PROJECT,
    ...parsed,
    // Identity always comes from the caller (the filename), never the payload.
    appId,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    themeId,
    connectedCanvas,
    ...(themes ? { themes } : { themes: undefined }),
    slidesByDevice: {
      ...DEFAULT_PROJECT.slidesByDevice,
      ...slidesByDevice,
    } as ProjectState["slidesByDevice"],
  };
  // Clamp the active locale into the project's locale list so a stale
  // `locale` (e.g. from a project that dropped languages) doesn't show blank.
  if (!merged.locales || merged.locales.length === 0) {
    merged.locales = [...DEFAULT_PROJECT.locales];
  }
  if (!merged.locales.includes(merged.locale)) {
    merged.locale = merged.locales[0];
  }
  return merged;
}

function loadFromLocalStorage(appId: string): ProjectState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(appId));
    if (!raw) return null;
    return mergeWithDefaults(JSON.parse(raw) as Partial<ProjectState>, appId);
  } catch {
    return null;
  }
}

async function loadFromFile(
  appId: string,
): Promise<{ ok: true; state: ProjectState | null } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: false, error: "Window is not available" };
  try {
    const resp = await fetch(`/api/project?app=${encodeURIComponent(appId)}`, {
      cache: "no-store",
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const json = (await resp.json()) as { ok: boolean; state: Partial<ProjectState> | null };
    if (!json.ok) return { ok: false, error: "Project response was not ok" };
    if (!json.state) return { ok: true, state: null };
    return { ok: true, state: mergeWithDefaults(json.state, appId) };
  } catch {
    return { ok: false, error: "Project file could not be loaded" };
  }
}

/**
 * Discovers both the app list and which persistence model this instance uses.
 * A server that can't tell us falls back to hosted: refusing to reach for
 * endpoints that may not work beats erroring on every save.
 */
async function fetchAppIndex(): Promise<{ mode: EditorMode; apps: AppSummary[] }> {
  try {
    const resp = await fetch("/api/apps", { cache: "no-store" });
    if (!resp.ok) return { mode: "hosted", apps: [] };
    const json = (await resp.json()) as {
      ok: boolean;
      mode?: EditorMode;
      apps?: AppSummary[];
    };
    const mode: EditorMode = json.mode === "local" ? "local" : "hosted";
    return { mode, apps: json.ok && Array.isArray(json.apps) ? json.apps : [] };
  } catch {
    return { mode: "hosted", apps: [] };
  }
}

// ---------- Hosted-mode app registry ----------
// In local mode the apps are whatever files sit in projects/. With no server
// writing files, the browser has to keep the list itself.

function readLocalApps(): AppSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_APPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a): a is AppSummary => {
        if (!a || typeof a !== "object") return false;
        const raw = a as Partial<AppSummary>;
        return isValidAppId(raw.id) && typeof raw.appName === "string";
      })
      .map((a) => ({ id: a.id, appName: a.appName }));
  } catch {
    return [];
  }
}

function writeLocalApps(apps: AppSummary[]) {
  try {
    window.localStorage.setItem(LOCAL_APPS_STORAGE_KEY, JSON.stringify(apps));
  } catch {
    /* the deck itself matters more than the index; it can be rebuilt */
  }
}

// A hosted visitor with no apps yet gets one blank deck rather than an editor
// with nothing to render and no obvious way forward.
const STARTER_APP: AppSummary = { id: "my-app", appName: "My App" };

function readActiveApp(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_APP_STORAGE_KEY);
    return isValidAppId(raw) ? raw : null;
  } catch {
    return null;
  }
}

function rememberActiveApp(appId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_APP_STORAGE_KEY, appId);
  } catch {
    /* a full quota shouldn't break app switching */
  }
}

function readSaveMode(): SaveMode {
  if (typeof window === "undefined") return "manual";
  try {
    return window.localStorage.getItem(SAVE_MODE_STORAGE_KEY) === "auto" ? "auto" : "manual";
  } catch {
    return "manual";
  }
}

function rememberSaveMode(mode: SaveMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_MODE_STORAGE_KEY, mode);
  } catch {
    /* preference is best-effort */
  }
}

function dropFromLocalStorage(appId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(appId));
  } catch {
    /* a stale cache entry is harmless — the app is gone from the list */
  }
}

function saveToLocalStorage(state: ProjectState): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    window.localStorage.setItem(storageKey(state.appId), JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

async function saveToFile(state: ProjectState): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof window === "undefined") return { ok: true };
  try {
    // The deck carries its own appId, so a save that lands after an app switch
    // still writes to the file it came from.
    const resp = await fetch(`/api/project?app=${encodeURIComponent(state.appId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!resp.ok) {
      return { ok: false, error: `HTTP ${resp.status}` };
    }
    const json = (await resp.json()) as { ok: boolean; error?: string };
    if (!json.ok) return { ok: false, error: json.error || "Unknown error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

type Updater = ProjectState | ((prev: ProjectState) => ProjectState);

function applyUpdater(updater: Updater, prev: ProjectState): ProjectState {
  return typeof updater === "function" ? updater(prev) : updater;
}

export type EditOptions = {
  /**
   * Groups a gesture into one undo step. Consecutive edits that share a key
   * within COALESCE_MS collapse together, so a slider drag or a burst of
   * typing is a single ⌘Z — but moving to a *different* control starts a new
   * step immediately, even mid-flow. Omit it for discrete actions (add,
   * delete, reorder, reset): those always get their own step.
   */
  coalesce?: string;
  /**
   * View state — which device tab, orientation, and locale you're looking at.
   * It's persisted with the deck, but it isn't an edit: undo should rewind
   * your content, not the tab you were on. See withView() below for the other
   * half of this rule.
   */
  transient?: boolean;
};

// Fields that describe what you're looking at rather than what you made.
const VIEW_KEYS = ["device", "orientation", "locale"] as const;

/**
 * Re-point a history snapshot at the view you're on now. Without this, undoing
 * an edit made on the iPhone tab while you're on the iPad tab would silently
 * yank you back to iPhone.
 *
 * Returns the snapshot itself when the view already matches, which keeps
 * reference equality intact — that's what lets undoing back to the last saved
 * state clear the dirty flag instead of leaving a phantom "unsaved changes".
 */
function withView(snapshot: ProjectState, view: ProjectState): ProjectState {
  if (VIEW_KEYS.every((k) => snapshot[k] === view[k])) return snapshot;
  return { ...snapshot, device: view.device, orientation: view.orientation, locale: view.locale };
}

export function useProject() {
  const [state, _setState] = useState<ProjectState>(DEFAULT_PROJECT);
  const [apps, setApps] = useState<AppSummary[]>([]);
  // Assume hosted until the server says otherwise: the wrong guess in that
  // direction costs a file write, the other way round throws errors.
  const [mode, setMode] = useState<EditorMode>("hosted");
  const modeRef = useRef<EditorMode>("hosted");
  const [hydrated, setHydrated] = useState(false);
  const [fileReady, setFileReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMode, _setSaveMode] = useState<SaveMode>("manual");
  const [saving, setSaving] = useState(false);
  // The exact deck object last written to disk. Reference-compared against
  // `state` to decide whether there is anything to save.
  const [lastSaved, setLastSaved] = useState<ProjectState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // History stacks live in refs so pushing to them doesn't re-render on every
  // keystroke; only their emptiness is mirrored into state, because that's the
  // part the Undo/Redo buttons actually need.
  const pastRef = useRef<ProjectState[]>([]);
  const futureRef = useRef<ProjectState[]>([]);
  const lastEditAt = useRef(0);
  const lastCoalesceKey = useRef<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistory = useCallback(() => {
    // Same-value setState is a no-op in React, so this is cheap to over-call.
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  // Mirrors of state read by callbacks that must not re-subscribe on every edit.
  const stateRef = useRef(state);
  stateRef.current = state;
  const fileReadyRef = useRef(fileReady);
  fileReadyRef.current = fileReady;
  // Guards against a slow load for app A landing after the user picked app B.
  const loadToken = useRef(0);

  // Unsaved work exists only once the file has loaded — before that, `state`
  // is a placeholder and must never be treated as an edit worth persisting.
  const dirty = hydrated && fileReady && lastSaved !== state;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const setSaveMode = useCallback((mode: SaveMode) => {
    _setSaveMode(mode);
    rememberSaveMode(mode);
  }, []);

  // Write the current deck to its project file (and the localStorage mirror).
  // Resolves true only when the file write succeeded.
  const save = useCallback(async (): Promise<boolean> => {
    if (!fileReadyRef.current) return false;
    const snapshot = stateRef.current;
    setSaving(true);
    const local = saveToLocalStorage(snapshot);

    // Hosted: localStorage is the only copy, so its result is the verdict.
    if (modeRef.current === "hosted") {
      setSaving(false);
      if (local.ok) {
        setLastSaved(snapshot);
        setSavedAt(Date.now());
        setSaveError(null);
        return true;
      }
      setSaveError(
        `Browser storage rejected the save (${local.error}). Export what you have — a deck this ` +
          `large may be over the localStorage quota.`,
      );
      return false;
    }

    const file = await saveToFile(snapshot);
    setSaving(false);
    if (file.ok) {
      // Compared by reference: if the user edited during the await, `state` has
      // already moved on and the deck correctly stays dirty.
      setLastSaved(snapshot);
      setSavedAt(Date.now());
      setSaveError(local.ok ? null : `Local cache failed: ${local.error}`);
      return true;
    }
    setSaveError(file.error);
    return false;
  }, []);

  // Load one app's deck: localStorage first for instant paint, then the file,
  // which always wins. Returns once the file result has been applied.
  const loadApp = useCallback(async (appId: string) => {
    const token = ++loadToken.current;
    setFileReady(false);
    // stateRef is kept in step by hand here: setState() below reads it as
    // "previous state" and can fire before React has re-rendered this load.
    const stored = loadFromLocalStorage(appId);
    const cached = stored ?? makeDefaultProject(appId);
    stateRef.current = cached;
    _setState(cached);

    // Every load ends the same way, whichever store it came from.
    const finish = () => {
      // History is per-app: undoing across an app switch would write one app's
      // screens into another's file.
      pastRef.current = [];
      futureRef.current = [];
      lastEditAt.current = 0;
      lastCoalesceKey.current = null;
      syncHistory();
      setSavedAt(null);
      rememberActiveApp(appId);
    };

    // Hosted: what we just read *is* the canonical copy. There's no file to
    // wait for, and no second render that could overwrite it. A deck that
    // wasn't in storage yet stays `lastSaved: null`, so it reads as unsaved
    // until the first write — same rule as a missing file locally.
    if (modeRef.current === "hosted") {
      setFileReady(true);
      setLastSaved(stored ? cached : null);
      setSaveError(null);
      finish();
      return;
    }

    const fromFile = await loadFromFile(appId);
    if (token !== loadToken.current) return;

    if (fromFile.ok) {
      const next = fromFile.state ?? makeDefaultProject(appId);
      stateRef.current = next;
      _setState(next);
      // A deck read from disk starts clean. A missing file leaves lastSaved
      // null, so the blank starter shows as unsaved until you save it once.
      setLastSaved(fromFile.state ? next : null);
      setFileReady(true);
      setSaveError(null);
    } else {
      setLastSaved(null);
      setFileReady(false);
      setSaveError(fromFile.error);
    }
    finish();
  }, [syncHistory]);

  // Hydrate: discover the apps on disk, then open the last one used.
  useEffect(() => {
    void (async () => {
      _setSaveMode(readSaveMode());
      const index = await fetchAppIndex();
      // modeRef before any load: loadApp branches on it.
      modeRef.current = index.mode;
      setMode(index.mode);

      let list = index.apps;
      if (index.mode === "hosted") {
        list = readLocalApps();
        if (list.length === 0) {
          list = [STARTER_APP];
          writeLocalApps(list);
        }
      }
      setApps(list);

      const remembered = readActiveApp();
      const fallback = index.mode === "hosted" ? STARTER_APP.id : DEFAULT_APP_ID;
      const initial =
        remembered && list.some((a) => a.id === remembered)
          ? remembered
          : list[0]?.id || fallback;
      await loadApp(initial);
      setHydrated(true);
    })();
  }, [loadApp]);

  // Keep the switcher's label in step with the toolbar's app-name field.
  // Returns `prev` untouched when nothing moved, so typing a name doesn't
  // re-render the switcher on every keystroke.
  useEffect(() => {
    setApps((prev) => {
      const current = prev.find((a) => a.id === state.appId);
      if (!current || current.appName === state.appName) return prev;
      const next = prev.map((a) =>
        a.id === state.appId ? { ...a, appName: state.appName } : a,
      );
      // Locally the name is re-derived from the file on next load; hosted, this
      // registry is the only record of it.
      if (modeRef.current === "hosted") writeLocalApps(next);
      return next;
    });
  }, [state.appId, state.appName]);

  // `save: true` writes the outgoing deck before leaving; `false` discards it.
  // In manual mode the editor asks first, so this is never an implicit write.
  const switchApp = useCallback(
    async (appId: string, opts: { save?: boolean } = {}) => {
      if (!isValidAppId(appId) || appId === stateRef.current.appId) return;
      setSwitching(true);
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (opts.save && fileReadyRef.current && dirtyRef.current) {
        saveToLocalStorage(stateRef.current);
        if (modeRef.current === "local") await saveToFile(stateRef.current);
      }
      await loadApp(appId);
      setSwitching(false);
    },
    [loadApp],
  );

  const createApp = useCallback(
    async (appName: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      // Hosted: no endpoint to ask, so the browser mints the app itself. The
      // deck is written immediately rather than on first edit, so the app
      // survives a reload even if you never touch it.
      if (modeRef.current === "hosted") {
        const id = slugifyAppId(appName);
        if (!isValidAppId(id)) {
          return { ok: false, error: "Name must contain at least one letter or number" };
        }
        const existing = readLocalApps();
        if (existing.some((a) => a.id === id)) {
          return { ok: false, error: `App "${id}" already exists in this browser` };
        }
        const created: AppSummary = { id, appName: appName.trim() || titleFromAppId(id) };
        const written = saveToLocalStorage(makeDefaultProject(created.id, created.appName));
        if (!written.ok) return { ok: false, error: `Browser storage is full (${written.error})` };
        const next = [...existing, created].sort((a, b) => a.appName.localeCompare(b.appName));
        writeLocalApps(next);
        setApps(next);
        await switchApp(created.id);
        return { ok: true, id: created.id };
      }

      try {
        const resp = await fetch("/api/apps", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ appName }),
        });
        const json = (await resp.json()) as { ok: boolean; app?: AppSummary; error?: string };
        if (!json.ok || !json.app) {
          return { ok: false, error: json.error || `HTTP ${resp.status}` };
        }
        const created = json.app;
        setApps((prev) =>
          [...prev.filter((a) => a.id !== created.id), created].sort((a, b) =>
            a.appName.localeCompare(b.appName),
          ),
        );
        await switchApp(created.id);
        return { ok: true, id: created.id };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    [switchApp],
  );

  // Debounced write to BOTH localStorage and the project file — only in auto
  // mode. In manual mode nothing reaches disk until `save()` is called, so
  // simply opening the editor and clicking around never rewrites a file.
  useEffect(() => {
    if (saveMode !== "auto") return;
    if (!hydrated || !fileReady || switching) return;
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, hydrated, fileReady, switching, saveMode, dirty, save]);

  // Last line of defence against closing the tab on unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /**
   * The single entry point for every edit. Resolves the update against
   * `stateRef` rather than inside a React updater callback, because the
   * history bookkeeping here has to touch refs and setCanUndo/setCanRedo —
   * side effects that are not allowed inside an updater. stateRef is written
   * synchronously, so two setState calls in the same tick still compose.
   */
  const setState = useCallback(
    (updater: Updater, opts: EditOptions = {}) => {
      const prev = stateRef.current;
      const next = applyUpdater(updater, prev);
      if (next === prev) return;

      if (!opts.transient) {
        const now = Date.now();
        // A new step unless this is the same gesture, still in progress.
        const sameGesture =
          !!opts.coalesce &&
          opts.coalesce === lastCoalesceKey.current &&
          now - lastEditAt.current <= COALESCE_MS;
        if (!sameGesture) {
          pastRef.current.push(prev);
          if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
          // Any fresh edit invalidates the redo branch.
          futureRef.current.length = 0;
          syncHistory();
        }
        lastCoalesceKey.current = opts.coalesce ?? null;
        lastEditAt.current = now;
      }

      stateRef.current = next;
      _setState(next);
    },
    [syncHistory],
  );

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (prev === undefined) return;
    const cur = stateRef.current;
    futureRef.current.push(cur);
    const restored = withView(prev, cur);
    // Close the open gesture, so the next edit can never merge into the step
    // we just rewound past.
    lastCoalesceKey.current = null;
    lastEditAt.current = 0;
    stateRef.current = restored;
    _setState(restored);
    syncHistory();
  }, [syncHistory]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (next === undefined) return;
    const cur = stateRef.current;
    pastRef.current.push(cur);
    const restored = withView(next, cur);
    lastCoalesceKey.current = null;
    lastEditAt.current = 0;
    stateRef.current = restored;
    _setState(restored);
    syncHistory();
  }, [syncHistory]);

  /**
   * Remove an app entirely. Screenshots on disk (or in IndexedDB) are kept —
   * see the DELETE handler in /api/apps for why.
   *
   * Deleting the app you're looking at moves you to the next one. The caller
   * blocks deleting the last app, so there is always somewhere to land.
   */
  const deleteApp = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!isValidAppId(id)) return { ok: false, error: "Invalid app id" };
      const remaining = apps.filter((a) => a.id !== id);
      if (remaining.length === 0) {
        return { ok: false, error: "Can't remove the only app" };
      }

      if (modeRef.current === "local") {
        try {
          const resp = await fetch(`/api/apps?app=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          const json = (await resp.json()) as { ok: boolean; error?: string };
          if (!json.ok) return { ok: false, error: json.error || `HTTP ${resp.status}` };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      } else {
        writeLocalApps(remaining);
      }

      dropFromLocalStorage(id);
      setApps(remaining);
      // Only move if we were standing on it. Deleting a background app must not
      // disturb the deck you're editing — or its undo history.
      if (id === stateRef.current.appId) {
        await switchApp(remaining[0].id);
      }
      return { ok: true };
    },
    [apps, switchApp],
  );

  // Resets clear the deck but keep the app's identity, name, and palettes —
  // resetting SpeakDiary must never hand you another app's starter content.
  const reset = useCallback(() => {
    setState((prev) => ({
      ...makeDefaultProject(prev.appId, prev.appName),
      themeId: prev.themeId,
      themes: prev.themes,
      appIcon: prev.appIcon,
      locales: prev.locales,
      locale: prev.locale,
    }));
  }, [setState]);

  const resetDevice = useCallback((device: Device) => {
    setState((prev) => ({
      ...prev,
      slidesByDevice: {
        ...prev.slidesByDevice,
        [device]: makeDefaultProject(prev.appId, prev.appName).slidesByDevice[device],
      },
    }));
  }, [setState]);

  return {
    state,
    setState,
    apps,
    mode,
    appId: state.appId,
    switchApp,
    createApp,
    deleteApp,
    switching,
    hydrated,
    savedAt,
    saveError,
    saveMode,
    setSaveMode,
    save,
    saving,
    dirty,
    reset,
    resetDevice,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
