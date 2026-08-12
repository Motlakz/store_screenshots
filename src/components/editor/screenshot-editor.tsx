"use client";
import * as React from "react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  hasTheme,
  supportsLandscape,
  themeById,
} from "@/lib/constants";
import { nid } from "@/lib/defaults";
import {
  writeElementTransform,
} from "@/lib/elements";
import {
  downloadName,
  planExport,
  type ExportSelection,
  type ExportUnit,
} from "@/lib/export";
import { preloadImages } from "@/lib/image-cache";
import { ownsTheme, patchActiveTheme } from "@/lib/theme-edit";
import { resolveScreenshot, writeLocalized } from "@/lib/locale";
import { useProject } from "@/lib/storage";
import type {
  Device,
  ElementId,
  ElementTransform,
  SelectedElement,
  Slide,
} from "@/lib/types";
import { Inspector } from "./inspector";
import { ExportDialog } from "./export-dialog";
import { PreviewStage } from "./preview-stage";
import { Sidebar } from "./sidebar";
import { DeckCanvas, getCanvas } from "./slide-canvas";
import { Toolbar } from "./toolbar";

const SIDEBAR_STORAGE_KEY = "editor-screens-collapsed";

export function ScreenshotEditor() {
  const {
    state,
    setState,
    apps,
    mode,
    appId,
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
  } = useProject();
  const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
  const [selectedElement, setSelectedElement] = React.useState<SelectedElement | null>(null);
  const [exporting, setExporting] = React.useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportUnit, setExportUnit] = React.useState<ExportUnit | null>(null);
  const [ready, setReady] = React.useState(false);
  const [transformScope, setTransformScope] = React.useState<"locale" | "all">("locale");
  const exportRef = React.useRef<HTMLDivElement | null>(null);

  // Screens rail. Editor-chrome preference, not deck content, so it lives in
  // localStorage next to the theme rather than in the project file. Safe to
  // read during the initial render: that render is the loading spinner on both
  // server and client, so there's nothing to mismatch.
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleSidebar = React.useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* preference is best-effort */
      }
      return next;
    });
  }, []);

  // Leaving an app with unsaved edits routes through a prompt instead of a
  // silent write, so manual mode really means "nothing moves unless I say so".
  type PendingNav = { kind: "switch"; appId: string } | { kind: "create"; name: string };
  const [pendingNav, setPendingNav] = React.useState<PendingNav | null>(null);
  const createResolver = React.useRef<
    ((r: { ok: true; id: string } | { ok: false; error: string }) => void) | null
  >(null);

  const saveNow = React.useCallback(async () => {
    const ok = await save();
    if (ok) toast.success("Saved");
    return ok;
  }, [save]);

  const requestSwitch = React.useCallback(
    (nextAppId: string) => {
      if (dirty) setPendingNav({ kind: "switch", appId: nextAppId });
      else void switchApp(nextAppId);
    },
    [dirty, switchApp],
  );

  const requestCreate = React.useCallback(
    (name: string) => {
      if (!dirty) return createApp(name);
      return new Promise<{ ok: true; id: string } | { ok: false; error: string }>((resolve) => {
        createResolver.current = resolve;
        setPendingNav({ kind: "create", name });
      });
    },
    [dirty, createApp],
  );

  const resolvePendingNav = React.useCallback(
    async (action: "save" | "discard" | "cancel") => {
      const nav = pendingNav;
      setPendingNav(null);
      if (!nav) return;

      if (action === "cancel") {
        createResolver.current?.({ ok: false, error: "Cancelled — you have unsaved changes" });
        createResolver.current = null;
        return;
      }
      if (nav.kind === "switch") {
        await switchApp(nav.appId, { save: action === "save" });
        return;
      }
      if (action === "save" && !(await save())) {
        createResolver.current?.({ ok: false, error: "Couldn't save the current app" });
        createResolver.current = null;
        return;
      }
      const result = await createApp(nav.name);
      createResolver.current?.(result);
      createResolver.current = null;
    },
    [pendingNav, switchApp, save, createApp],
  );

  const currentSlides = state.slidesByDevice[state.device] || [];
  const activeSlide =
    currentSlides.find((s) => s.id === activeSlideId) || currentSlides[0] || null;
  const theme = themeById(state.themeId, state.themes);

  React.useEffect(() => {
    if (selectedElement && selectedElement.slideId !== activeSlide?.id) {
      setSelectedElement(null);
    }
  }, [activeSlide?.id, selectedElement]);

  // Slide ids are per-app, so a selection from the previous app is meaningless.
  React.useEffect(() => {
    setActiveSlideId(null);
    setSelectedElement(null);
  }, [appId]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!activeSlide && currentSlides.length > 0) {
      setActiveSlideId(currentSlides[0].id);
    }
  }, [hydrated, currentSlides, activeSlide]);

  React.useEffect(() => {
    if (!supportsLandscape(state.device) && state.orientation !== "portrait") {
      // A correction the editor makes on your behalf — never an undo step.
      setState((p) => ({ ...p, orientation: "portrait" }), { transient: true });
    }
  }, [state.device, state.orientation, setState]);

  React.useEffect(() => {
    if (hydrated && state.themeId && !hasTheme(state.themeId, state.themes)) {
      toast.warning("Using fallback theme", {
        description: `Theme "${state.themeId}" is not in src/lib/constants.ts or this app's "themes" array.`,
        duration: 8000,
      });
    }
  }, [hydrated, state.themeId, state.themes]);

  const assetPaths = React.useMemo(() => {
    const paths = new Set<string>();
    paths.add("/mockup.png");
    if (state.appIcon) paths.add(state.appIcon);
    // Preload every locale variant so bulk export doesn't race image loads.
    const allSlides: Slide[] = Object.values(state.slidesByDevice).flat();
    for (const s of allSlides) {
      for (const raw of [
        s.screenshot,
        s.screenshotSecondary,
        s.screenshotTertiary,
        ...Object.values(s.screenshotByLocale || {}),
        ...Object.values(s.screenshotSecondaryByLocale || {}),
        ...(s.focusElements || []).map((element) => element.source),
      ]) {
        if (!raw || raw.startsWith("data:")) continue;
        if (raw.includes("{locale}")) {
          for (const loc of state.locales) paths.add(resolveScreenshot(raw, loc));
        } else {
          paths.add(raw);
        }
      }
    }
    return Array.from(paths).sort();
  }, [state.slidesByDevice, state.appIcon, state.locales]);
  const assetSig = assetPaths.join("|");

  React.useEffect(() => {
    if (!hydrated) return;
    preloadImages(assetPaths).finally(() => setReady(true));
    // assetPaths is derived from assetSig; depending on the string keeps the
    // effect from re-firing when slidesByDevice churns without path changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, assetSig]);

  // Surface storage failures (quota exceeded etc.) so the user knows their work isn't safe.
  React.useEffect(() => {
    if (saveError) {
      toast.error(
        mode === "hosted" ? "Couldn't save to this browser" : "Couldn't load or save project file",
        { description: saveError, duration: 8000 },
      );
    }
  }, [saveError, mode]);

  // ---------- Mutations ----------

  const patchSlide = React.useCallback(
    (id: string, patch: Partial<Slide>) => {
      setState(
        (prev) => ({
          ...prev,
          slidesByDevice: {
            ...prev.slidesByDevice,
            [prev.device]: (prev.slidesByDevice[prev.device] || []).map((s) =>
              s.id === id ? { ...s, ...patch } : s,
            ),
          },
        }),
        // Keyed by which fields moved, so holding a slider is one undo step
        // but reaching for the next control starts another.
        { coalesce: `slide:${id}:${Object.keys(patch).sort().join(",")}` },
      );
    },
    [setState],
  );

  const reorderSlides = React.useCallback(
    (next: Slide[]) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: { ...prev.slidesByDevice, [prev.device]: next },
      }));
    },
    [setState],
  );

  const deleteSlide = React.useCallback(
    (id: string) => {
      const dev = state.device;
      const slides = state.slidesByDevice[dev] || [];
      const idx = slides.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const snap = slides[idx];
      const fallback = slides[idx + 1] || slides[idx - 1] || null;

      setState((prev) => {
        const cur = prev.slidesByDevice[dev] || [];
        return {
          ...prev,
          slidesByDevice: { ...prev.slidesByDevice, [dev]: cur.filter((s) => s.id !== id) },
        };
      });
      setActiveSlideId((cur) => (cur === id ? fallback?.id || null : cur));

      // "Restore", not "Undo": this puts *this* screen back at *this* index no
      // matter what you did after deleting it, and it lands as its own history
      // step. ⌘Z is the general-purpose rewind; this is the targeted one.
      toast("Screen deleted", {
        action: {
          label: "Restore",
          onClick: () => {
            setState((prev) => {
              const cur = prev.slidesByDevice[dev] || [];
              if (cur.some((s) => s.id === snap.id)) return prev;
              const restored = [...cur.slice(0, idx), snap, ...cur.slice(idx)];
              return {
                ...prev,
                slidesByDevice: { ...prev.slidesByDevice, [dev]: restored },
              };
            });
            setActiveSlideId(snap.id);
          },
        },
        duration: 6000,
      });
    },
    [setState, state.device, state.slidesByDevice],
  );

  const addSlide = React.useCallback(
    (slide: Slide) => {
      setState((prev) => ({
        ...prev,
        slidesByDevice: {
          ...prev.slidesByDevice,
          [prev.device]: [...(prev.slidesByDevice[prev.device] || []), slide],
        },
      }));
      setActiveSlideId(slide.id);
    },
    [setState],
  );

  const patchLocalized = React.useCallback(
    (slide: Slide, key: "label" | "headline", value: string) => {
      patchSlide(slide.id, {
        [key]: writeLocalized(slide[key], state.locale, value),
      } as Partial<Slide>);
    },
    // patchSlide already keys on the field name, so a run of typing in one
    // field collapses to a single step.
    [patchSlide, state.locale],
  );

  const patchElementTransform = React.useCallback(
    (slideId: string, elementId: ElementId, transform: ElementTransform) => {
      setState(
        (prev) => ({
          ...prev,
          slidesByDevice: {
            ...prev.slidesByDevice,
            [prev.device]: (prev.slidesByDevice[prev.device] || []).map((slide) =>
              slide.id === slideId
                ? {
                    ...slide,
                    ...writeElementTransform(
                      slide,
                      elementId,
                      transform,
                      transformScope === "locale" && prev.locales.length > 1 ? prev.locale : null,
                    ),
                  }
                : slide,
            ),
          },
        }),
        // One drag or resize of one element is one undo step, however many
        // intermediate frames react-rnd emits along the way.
        { coalesce: `transform:${slideId}:${elementId}` },
      );
    },
    [setState, transformScope],
  );

  const patchTextElementText = React.useCallback(
    (slideId: string, textId: string, value: string) => {
      setState(
        (prev) => ({
          ...prev,
          slidesByDevice: {
            ...prev.slidesByDevice,
            [prev.device]: (prev.slidesByDevice[prev.device] || []).map((slide) =>
              slide.id === slideId
                ? {
                    ...slide,
                    textElements: (slide.textElements || []).map((element) =>
                      element.id === textId
                        ? { ...element, text: writeLocalized(element.text, prev.locale, value) }
                        : element,
                    ),
                  }
                : slide,
            ),
          },
        }),
        // Typing straight into the canvas: one step per text box, per pause.
        { coalesce: `text:${slideId}:${textId}` },
      );
    },
    [setState],
  );

  const duplicateSlide = React.useCallback(
    (id: string) => {
      const newId = nid();
      setState((prev) => {
        const slides = prev.slidesByDevice[prev.device] || [];
        const idx = slides.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const src = slides[idx];
        const copy: Slide = {
          ...src,
          id: newId,
          label: { ...src.label },
          headline: { ...src.headline },
          frame: src.frame ? { ...src.frame } : undefined,
          frameSecondary: src.frameSecondary ? { ...src.frameSecondary } : undefined,
          transforms: src.transforms
            ? Object.fromEntries(
                Object.entries(src.transforms).map(([key, value]) => [key, { ...value }]),
              )
            : undefined,
          transformsByLocale: src.transformsByLocale
            ? Object.fromEntries(
                Object.entries(src.transformsByLocale).map(([locale, transforms]) => [
                  locale,
                  transforms
                    ? Object.fromEntries(
                        Object.entries(transforms).map(([key, value]) => [key, value ? { ...value } : value]),
                      )
                    : transforms,
                ]),
              )
            : undefined,
          textElements: src.textElements?.map((element) => ({
            ...element,
            id: nid(),
            text: { ...element.text },
            transform: { ...element.transform },
            transformByLocale: element.transformByLocale
              ? Object.fromEntries(
                  Object.entries(element.transformByLocale).map(([locale, transform]) => [
                    locale,
                    transform ? { ...transform } : transform,
                  ]),
                )
              : undefined,
          })),
          focusElements: src.focusElements?.map((element) => ({
            ...element,
            id: nid(),
            crop: { ...element.crop },
            transform: { ...element.transform },
            transformByLocale: element.transformByLocale
              ? Object.fromEntries(
                  Object.entries(element.transformByLocale).map(([locale, transform]) => [
                    locale,
                    transform ? { ...transform } : transform,
                  ]),
                )
              : undefined,
          })),
        };
        const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
        return {
          ...prev,
          slidesByDevice: { ...prev.slidesByDevice, [prev.device]: next },
        };
      });
      setActiveSlideId(newId);
      setSelectedElement(null);
    },
    [setState],
  );

  // ---------- Keyboard shortcuts ----------

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          (target as HTMLElement).isContentEditable);
      if (exporting) return;

      // Save works even from inside a text field — it's the one shortcut you
      // reach for mid-edit.
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (dirty && !saving) void saveNow();
        return;
      }

      // Intentionally above the inEditable guard, so it works while typing.
      // It also shadows the browser's native bold-in-contenteditable, which is
      // a feature here: canvas text round-trips through innerText, so any <b>
      // the browser inserted would silently vanish on the next render.
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (e.key === "Escape") {
        setSelectedElement(null);
        if (target && "blur" in target && typeof target.blur === "function") target.blur();
        return;
      }

      // Let focused inputs and contenteditable text keep their native undo,
      // redo, selection, and deletion behavior.
      if (inEditable) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      if (!currentSlides.length) return;
      const idx = activeSlide ? currentSlides.findIndex((s) => s.id === activeSlide.id) : -1;
      if (e.key === "ArrowDown" || (e.key === "j" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.min(currentSlides.length - 1, idx + 1)];
        if (next) setActiveSlideId(next.id);
      } else if (e.key === "ArrowUp" || (e.key === "k" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        const next = currentSlides[Math.max(0, idx - 1)];
        if (next) setActiveSlideId(next.id);
      } else if ((e.key === "d" || e.key === "D") && (e.metaKey || e.ctrlKey)) {
        if (activeSlide) {
          e.preventDefault();
          duplicateSlide(activeSlide.id);
        }
      } else if ((e.key === "Backspace" || e.key === "Delete") && (e.metaKey || e.ctrlKey)) {
        if (activeSlide) {
          e.preventDefault();
          deleteSlide(activeSlide.id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeSlide,
    currentSlides,
    duplicateSlide,
    deleteSlide,
    exporting,
    undo,
    redo,
    dirty,
    saving,
    saveNow,
    toggleSidebar,
  ]);

  // ---------- Export ----------

  // Wait two animation frames so React's render → browser layout/paint of the
  // off-screen container settles before html-to-image snapshots it. One frame
  // is occasionally not enough on slower machines.
  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  async function runExport(selection: ExportSelection) {
    const units = planExport(state, selection);
    if (!units.length) {
      toast.error("Nothing selected for export");
      return;
    }
    setExportDialogOpen(false);
    await preloadImages(assetPaths, { retryFailed: true });
    await waitForPaint();

    const uniqueSlides = Array.from(
      new Map(units.map((unit) => [`${unit.device}:${unit.slide.id}`, unit])).values(),
    );
    const missingScreens = uniqueSlides.filter(
      (unit) => slideNeedsScreenshot(unit.device, unit.slide) && !unit.slide.screenshot,
    );
    const reusedBackScreens = uniqueSlides.filter(
      (unit) =>
        unit.device !== "feature-graphic" &&
        unit.slide.layout === "two-devices" &&
        unit.slide.screenshot &&
        !unit.slide.screenshotSecondary,
    );
    if (missingScreens.length > 0 || reusedBackScreens.length > 0) {
      const details = [
        missingScreens.length
          ? `${missingScreens.length} screen${missingScreens.length === 1 ? "" : "s"} will export with an empty device.`
          : null,
        reusedBackScreens.length
          ? `${reusedBackScreens.length} two-device screen${reusedBackScreens.length === 1 ? "" : "s"} will reuse the primary screenshot in back.`
          : null,
      ].filter(Boolean);
      toast.warning("Export includes placeholder screenshots", {
        description: details.join(" "),
        duration: 7000,
      });
    }

    if (typeof document !== "undefined" && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* Fonts have fallbacks; export can continue. */
      }
    }

    const zip = new JSZip();
    const errors: string[] = [];
    let okCount = 0;
    let failed = 0;
    let onlyDataUrl: string | null = null;

    try {
      for (let index = 0; index < units.length; index++) {
        const unit = units[index];
        setExporting(`${index + 1}/${units.length}`);
        setExportUnit(unit);
        await waitForPaint();
        const el = exportRef.current;
        if (!el) {
          failed += 1;
          errors.push(`${unit.locale} ${unit.size.w}×${unit.size.h} screen ${unit.slideIndex + 1}: render target missing`);
          continue;
        }
        const unitOrientation = supportsLandscape(unit.device) ? state.orientation : "portrait";
        const { cW, cH } = getCanvas(unit.device, unitOrientation);
        try {
          const dataUrl = await captureSlide(el, cW, cH, unit.size.w, unit.size.h);
          if (units.length === 1) onlyDataUrl = dataUrl;
          else zip.file(unit.path, dataUrl.split(",")[1] || "", { base64: true });
          okCount += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${unit.locale} ${unit.size.w}×${unit.size.h} screen ${unit.slideIndex + 1}: ${message}`);
          console.error("Export failed", { unit }, error);
        }
      }
    } finally {
      setExportUnit(null);
      setExporting(null);
    }

    if (okCount > 0) {
      try {
        const name = downloadName(state.appId, state.appName, selection, units);
        const anchor = document.createElement("a");
        let objectUrl: string | null = null;
        if (units.length === 1 && onlyDataUrl) {
          anchor.href = onlyDataUrl;
          anchor.download = name;
        } else {
          const blob = await zip.generateAsync({ type: "blob" });
          objectUrl = URL.createObjectURL(blob);
          anchor.href = objectUrl;
          anchor.download = name;
        }
        anchor.click();
        if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      } catch (error) {
        toast.error("Couldn't create the download");
        console.error(error);
        return;
      }
    }

    const summary = `${selection.locales.length} language${selection.locales.length === 1 ? "" : "s"} · ${selection.picks.length} group${selection.picks.length === 1 ? "" : "s"}`;
    if (failed === 0) {
      toast.success(`Exported ${okCount} PNG${okCount === 1 ? "" : "s"} (${summary})`);
    } else if (okCount === 0) {
      toast.error(`All ${failed} renders failed`, { description: errors.slice(0, 3).join("\n") });
    } else {
      toast.error(`${failed} of ${units.length} renders failed`, {
        description: errors.slice(0, 3).join("\n"),
      });
    }
  }

  async function captureSlide(
    el: HTMLElement,
    sourceW: number,
    sourceH: number,
    exportW: number,
    exportH: number,
  ) {
    // html-to-image needs the node at (0,0). Let the library scale the source
    // canvas into the requested output dimensions; CSS transforms leave
    // transparent gutters when export aspect ratios differ by a few pixels.
    const prev = {
      left: el.style.left,
      top: el.style.top,
      position: el.style.position,
      transform: el.style.transform,
      transformOrigin: el.style.transformOrigin,
      zIndex: el.style.zIndex,
    };
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.position = "absolute";
    el.style.transform = "none";
    el.style.transformOrigin = "top left";
    el.style.zIndex = "-1";
    try {
      const dataUrl = await toPng(el, {
        width: sourceW,
        height: sourceH,
        canvasWidth: exportW,
        canvasHeight: exportH,
        pixelRatio: 1,
        cacheBust: false,
        backgroundColor: "#ffffff",
      });
      return dataUrl;
    } finally {
      el.style.left = prev.left || "-99999px";
      el.style.top = prev.top || "0px";
      el.style.position = prev.position || "absolute";
      el.style.transform = prev.transform;
      el.style.transformOrigin = prev.transformOrigin;
      el.style.zIndex = prev.zIndex;
    }
  }

  // ---------- Render ----------

  if (!hydrated || !ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Loading editor…</p>
        </div>
      </div>
    );
  }

  const { cW, cH } = getCanvas(state.device, state.orientation);
  const exportDevice = exportUnit?.device ?? state.device;
  const exportOrientation = supportsLandscape(exportDevice) ? state.orientation : "portrait";
  const exportSlides = state.slidesByDevice[exportDevice] || [];
  const { cW: exportCW, cH: exportCH } = getCanvas(exportDevice, exportOrientation);
  const busy = !!exporting || switching;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toaster position="top-right" richColors closeButton />
      <Toolbar
        apps={apps}
        mode={mode}
        appId={appId}
        onSwitchApp={requestSwitch}
        onCreateApp={requestCreate}
        onDeleteApp={deleteApp}
        switching={switching}
        themeId={state.themeId}
        setThemeId={(v) => setState((p) => ({ ...p, themeId: v }))}
        appThemes={state.themes}
        activeTheme={theme}
        themeOwned={ownsTheme(state, state.themeId)}
        onPatchTheme={(patch) => setState((p) => patchActiveTheme(p, themeById(p.themeId, p.themes), patch))}
        appName={state.appName}
        setAppName={(v) => setState((p) => ({ ...p, appName: v }), { coalesce: "app-name" })}
        connectedCanvas={state.connectedCanvas}
        setConnectedCanvas={(v) => setState((p) => ({ ...p, connectedCanvas: v }))}
        locale={state.locale}
        // Device, orientation, and locale pick what you're looking at rather
        // than changing the deck, so they stay out of the undo stack.
        setLocale={(v) => setState((p) => ({ ...p, locale: v }), { transient: true })}
        locales={state.locales}
        device={state.device}
        setDevice={(v) => setState((p) => ({ ...p, device: v }), { transient: true })}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={() => setExportDialogOpen(true)}
        onResetAll={() => {
          reset();
          setActiveSlideId(null);
          toast.success("Reset all devices to defaults");
        }}
        onResetDevice={() => {
          resetDevice(state.device);
          setActiveSlideId(null);
          toast.success(`Reset ${state.device} to defaults`);
        }}
        exporting={exporting}
        savedAt={savedAt}
        saveError={saveError}
        saveMode={saveMode}
        setSaveMode={setSaveMode}
        onSave={() => void saveNow()}
        saving={saving}
        dirty={dirty}
        busy={busy}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        state={state}
        orientation={state.orientation}
        activeSlide={activeSlide}
        busy={!!exporting}
        onExport={(selection) => void runExport(selection)}
      />

      <div className="flex flex-1 overflow-hidden md:flex-row flex-col">
        <aside
          className={`w-full shrink-0 overflow-hidden border-r bg-card transition-[width,max-height] duration-200 ease-out ${
            sidebarCollapsed ? "max-h-12 md:max-h-none md:w-12" : "max-h-64 md:max-h-none md:w-72"
          }`}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            slides={currentSlides}
            activeId={activeSlide?.id || null}
            device={state.device}
            orientation={state.orientation}
            theme={theme}
            locale={state.locale}
            appName={state.appName}
            appIcon={state.appIcon}
            connectedCanvas={state.connectedCanvas}
            disabled={busy}
            onReorder={reorderSlides}
            onSelect={setActiveSlideId}
            onDelete={deleteSlide}
            onDuplicate={duplicateSlide}
            onAdd={addSlide}
          />
        </aside>

        <main className="flex flex-1 items-stretch overflow-hidden min-h-0">
          {activeSlide && currentSlides.length > 0 ? (
            <PreviewStage
              slides={currentSlides}
              activeSlideId={activeSlide.id}
              device={state.device}
              orientation={state.orientation}
              theme={theme}
              locale={state.locale}
              appName={state.appName}
              appIcon={state.appIcon}
              connectedCanvas={state.connectedCanvas}
              selectedElement={selectedElement}
              onActiveSlideChange={setActiveSlideId}
              onLabelChange={(slide, v) => patchLocalized(slide, "label", v)}
              onHeadlineChange={(slide, v) => patchLocalized(slide, "headline", v)}
              onTextElementTextChange={patchTextElementText}
              onElementChange={patchElementTransform}
              onSelectElement={setSelectedElement}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No screen selected</p>
              <p>Add a screen on the left to get started.</p>
            </div>
          )}
        </main>

        <aside className="md:w-80 w-full shrink-0 border-l bg-card md:max-h-none max-h-96 overflow-hidden">
          {activeSlide ? (
            <Inspector
              slide={activeSlide}
              appId={appId}
              theme={theme}
              slideIndex={Math.max(0, currentSlides.findIndex((s) => s.id === activeSlide.id))}
              device={state.device}
              orientation={state.orientation}
              locale={state.locale}
              locales={state.locales}
              transformScope={transformScope}
              onTransformScopeChange={setTransformScope}
              selectedElementId={
                selectedElement?.slideId === activeSlide.id ? selectedElement.elementId : null
              }
              onChange={(patch) => patchSlide(activeSlide.id, patch)}
              onOrientationChange={(v) =>
                setState((p) => ({ ...p, orientation: v }), { transient: true })
              }
              onSelectElement={(elementId) =>
                setSelectedElement(
                  elementId ? { slideId: activeSlide.id, elementId } : null,
                )
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nothing to inspect</p>
              <p className="text-xs">Screen settings will appear here once you add or select one.</p>
            </div>
          )}
        </aside>
      </div>

      <Dialog
        open={!!pendingNav}
        onOpenChange={(open) => {
          if (!open) void resolvePendingNav("cancel");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save changes to {state.appName}?</DialogTitle>
            <DialogDescription>
              {pendingNav?.kind === "create"
                ? `You have unsaved edits. Creating "${pendingNav.name}" will leave this app.`
                : "You have unsaved edits. Switching apps will leave this app."}{" "}
              {mode === "hosted" ? (
                <>Discarding keeps the copy already saved in this browser.</>
              ) : (
                <>
                  Discarding keeps{" "}
                  <span className="font-mono text-[11px]">projects/{appId}.json</span> exactly as
                  it is on disk.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => void resolvePendingNav("cancel")}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void resolvePendingNav("discard")}>
              Discard changes
            </Button>
            <Button size="sm" onClick={() => void resolvePendingNav("save")}>
              Save and continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Off-screen export container — full-resolution canvases for html-to-image. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          pointerEvents: "none",
        }}
      >
        {exportUnit && exportSlides.length > 0 && exporting && (
          <div
            ref={exportRef}
            style={{
              width: exportCW,
              height: exportCH,
              overflow: "hidden",
              position: "absolute",
              left: -99999,
              top: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -exportUnit.slideIndex * exportCW,
                top: 0,
                width: exportCW * exportSlides.length,
                height: exportCH,
              }}
            >
              <DeckCanvas
                slides={exportSlides}
                device={exportDevice}
                orientation={exportOrientation}
                theme={theme}
                locale={exportUnit.locale}
                appName={state.appName}
                appIcon={state.appIcon}
                connectedCanvas={state.connectedCanvas}
                hideEmpty
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function slideNeedsScreenshot(device: Device, slide: Slide) {
  if (device === "feature-graphic") return false;
  return slide.layout !== "no-device" && slide.layout !== "feature-graphic";
}

