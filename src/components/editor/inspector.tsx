"use client";
import * as React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Crop,
  RotateCw,
  Smartphone,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LAYOUT_HINT, LAYOUT_LABEL } from "@/lib/constants";
import { nid } from "@/lib/defaults";
import {
  isBuiltInElementId,
  focusElementKey,
  isFocusElementId,
  isTextElementId,
  textElementKey,
  toTextElementId,
  toFocusElementId,
} from "@/lib/elements";
import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot, writeLocalized } from "@/lib/locale";
import type {
  BuiltInElementId,
  Device,
  ElementId,
  ElementTransform,
  Orientation,
  ScreenshotFocusElement,
  Slide,
  SlideLayout,
  TextElement,
  Theme,
} from "@/lib/types";
import { ScreenshotPicker } from "./screenshot-picker";
import { ScreenStyle } from "./screen-style";
import { FrameControls } from "./frame-controls";
import { getCanvas, getElementTransform } from "./slide-canvas";

type Props = {
  slide: Slide;
  // Routes uploads into public/screenshots/<appId>/uploaded/.
  appId: string;
  theme: Theme;
  /** Position in the deck — drives the theme's per-screen color rotation. */
  slideIndex: number;
  device: Device;
  orientation: Orientation;
  locale: string;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
};

const ELEMENT_LABEL: Record<BuiltInElementId, string> = {
  caption: "Headline",
  device: "Device",
  deviceSecondary: "Back device",
};

export function Inspector({
  slide,
  appId,
  theme,
  slideIndex,
  device,
  orientation,
  locale,
  selectedElementId,
  onChange,
  onSelectElement,
}: Props) {
  const isFeatureGraphic = device === "feature-graphic" || slide.layout === "feature-graphic";
  const isNoDevice = slide.layout === "no-device";
  const layoutValue = device === "feature-graphic" ? "feature-graphic" : slide.layout;
  const layoutOptions = Object.entries(LAYOUT_LABEL).filter(([layout]) =>
    device === "feature-graphic" ? layout === "feature-graphic" : layout !== "feature-graphic",
  );
  const localeLabel = slide.label?.[locale] ?? "";
  const localeHeadline = slide.headline?.[locale] ?? "";
  // When the active locale is empty, surface the fallback (typically en) as
  // the placeholder so the user sees what they're translating from.
  const headlineDefault = isFeatureGraphic ? "Your tagline." : "One idea\nper slide.";
  const labelPlaceholder = isFeatureGraphic
    ? "Your gut health companion"
    : localeLabel
      ? "FEATURE 01"
      : pickText(slide.label, locale) || "FEATURE 01";
  const headlinePlaceholder = localeHeadline
    ? headlineDefault
    : pickText(slide.headline, locale) || headlineDefault;

  function setLocaleField(key: "label" | "headline", value: string) {
    onChange({ [key]: writeLocalized(slide[key], locale, value) } as Partial<Slide>);
  }

  React.useEffect(() => {
    if (device === "feature-graphic" && slide.layout !== "feature-graphic") {
      onChange({ layout: "feature-graphic", transforms: undefined });
    }
  }, [device, onChange, slide.layout]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Screen settings</h2>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            editing · {locale.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{LAYOUT_HINT[layoutValue]}</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Layout</Label>
          <Select
            value={layoutValue}
            onValueChange={(layout) => {
              const next = layout as SlideLayout;
              onChange({
                layout: next,
                transforms: undefined,
                screenshotSecondary:
                  next === "two-devices" ? slide.screenshotSecondary || slide.screenshot : undefined,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layoutOptions.map(([layout, label]) => (
                <SelectItem key={layout} value={layout}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{isFeatureGraphic ? "Companion line" : "Label"}</Label>
          <Input
            value={localeLabel}
            onChange={(e) => setLocaleField("label", e.target.value)}
            placeholder={labelPlaceholder}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs">{isFeatureGraphic ? "Tagline" : "Headline"}</Label>
            <span className="text-[10px] text-muted-foreground">newline = break</span>
          </div>
          <Textarea
            value={localeHeadline}
            onChange={(e) => setLocaleField("headline", e.target.value)}
            rows={3}
            placeholder={headlinePlaceholder}
          />
        </div>

        {!isFeatureGraphic && !isNoDevice && (
          <div className="space-y-1.5">
            <Label className="text-xs">
              {slide.layout === "two-devices" ? "Front device screenshot" : "Screenshot"}
            </Label>
            <ScreenshotPicker
              label="Primary"
              appId={appId}
              value={slide.screenshot}
              locale={locale}
              onChange={(v) => onChange({ screenshot: v })}
            />
          </div>
        )}

        {slide.layout === "two-devices" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Back device screenshot</Label>
            <ScreenshotPicker
              label="Secondary (back layer)"
              appId={appId}
              value={slide.screenshotSecondary || ""}
              locale={locale}
              onChange={(v) => onChange({ screenshotSecondary: v })}
            />
          </div>
        )}

        {isFeatureGraphic && (
          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <Label className="text-xs font-semibold">Screenshot charm</Label>
            <ScreenshotPicker label="Left screen" appId={appId} value={slide.screenshot} locale={locale} onChange={(v) => onChange({ screenshot: v })} />
            <ScreenshotPicker label="Middle screen" appId={appId} value={slide.screenshotSecondary || ""} locale={locale} onChange={(v) => onChange({ screenshotSecondary: v })} />
            <ScreenshotPicker label="Right screen" appId={appId} value={slide.screenshotTertiary || ""} locale={locale} onChange={(v) => onChange({ screenshotTertiary: v })} />
          </div>
        )}

        {!isFeatureGraphic && !isNoDevice && (
          <FrameControls
            slide={slide}
            device={device}
            target={selectedElementId === "deviceSecondary" ? "secondary" : "primary"}
            onChange={onChange}
          />
        )}

        {!isFeatureGraphic && (
          <ScreenStyle
            slide={slide}
            theme={theme}
            slideIndex={slideIndex}
            onChange={onChange}
          />
        )}

        {!isFeatureGraphic && (
          <ElementTransformControls
            slide={slide}
            appId={appId}
            device={device}
            orientation={orientation}
            locale={locale}
            selectedElementId={selectedElementId}
            onChange={onChange}
            onSelectElement={onSelectElement}
          />
        )}

        {isFeatureGraphic && (
          <p className="rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Shows app icon + name + tagline. Drop an icon at <span className="rounded bg-background px-1 py-0.5 font-mono text-[10px] text-foreground">public/screenshots/{appId}/app-icon.png</span> and point <span className="font-mono text-[10px]">appIcon</span> at it in <span className="font-mono text-[10px]">projects/{appId}.json</span> (or leave blank — the app initial will be used). Name is set in the toolbar.
          </p>
        )}
      </div>
    </div>
  );
}

function ElementTransformControls({
  slide,
  appId,
  device,
  orientation,
  locale,
  selectedElementId,
  onChange,
  onSelectElement,
}: {
  slide: Slide;
  appId: string;
  device: Device;
  orientation: Orientation;
  locale: string;
  selectedElementId: ElementId | null;
  onChange: (patch: Partial<Slide>) => void;
  onSelectElement: (id: ElementId | null) => void;
}) {
  const present: ElementId[] = ["caption"];
  if (slide.layout !== "no-device") present.push("device");
  if (slide.layout === "two-devices") present.push("deviceSecondary");
  for (const element of slide.textElements || []) present.push(toTextElementId(element.id));
  for (const element of slide.focusElements || []) present.push(toFocusElementId(element.id));

  const transforms = slide.transforms || {};
  const activeId =
    selectedElementId && present.includes(selectedElementId) ? selectedElementId : null;
  const activeTransform = activeId
    ? getElementTransform(slide, device, orientation, activeId)
    : undefined;
  const activeTextElement =
    activeId && isTextElementId(activeId)
      ? slide.textElements?.find((element) => element.id === textElementKey(activeId))
      : null;
  const activeFocusElement =
    activeId && isFocusElementId(activeId)
      ? slide.focusElements?.find((element) => element.id === focusElementKey(activeId))
      : null;

  function getTransform(id: ElementId) {
    return getElementTransform(slide, device, orientation, id);
  }

  function patchElement(id: ElementId, patch: Partial<ElementTransform>) {
    const cur = getTransform(id);
    if (!cur) return;
    if (isTextElementId(id)) {
      const textId = textElementKey(id);
      onChange({
        textElements: (slide.textElements || []).map((element) =>
          element.id === textId
            ? { ...element, transform: { ...element.transform, ...patch } }
            : element,
        ),
      });
      return;
    }
    if (isFocusElementId(id)) {
      const focusId = focusElementKey(id);
      onChange({
        focusElements: (slide.focusElements || []).map((element) =>
          element.id === focusId ? { ...element, transform: { ...element.transform, ...patch } } : element,
        ),
      });
      return;
    }
    if (!isBuiltInElementId(id)) return;
    onChange({
      transforms: { ...transforms, [id]: { ...cur, ...patch } },
    });
  }

  function patchTextElement(id: string, patch: Partial<TextElement>) {
    onChange({
      textElements: (slide.textElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  function setTextElementValue(element: TextElement, value: string) {
    patchTextElement(element.id, { text: writeLocalized(element.text, locale, value) });
  }

  function deleteTextElement(element: TextElement) {
    const nextTextElements = (slide.textElements || []).filter((item) => item.id !== element.id);
    onChange({
      textElements: nextTextElements.length > 0 ? nextTextElements : undefined,
    });
    onSelectElement(null);
  }

  function addTextElement() {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const zIndex =
      Math.max(
        5,
        ...present.map((elementId) => getTransform(elementId)?.zIndex ?? defaultZ(elementId)),
      ) + 1;
    const element: TextElement = {
      id,
      text: writeLocalized({}, locale, "New text"),
      transform: {
        x: cW * 0.18,
        y: cH * 0.42,
        width: cW * 0.64,
        height: cH * 0.12,
        rotation: 0,
        zIndex,
      },
      fontSize: Math.round(Math.min(cW, cH) * 0.065),
      fontWeight: 800,
      align: "center",
    };
    onChange({ textElements: [...(slide.textElements || []), element] });
    onSelectElement(toTextElementId(id));
  }

  function patchFocusElement(id: string, patch: Partial<ScreenshotFocusElement>) {
    onChange({
      focusElements: (slide.focusElements || []).map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    });
  }

  // A second phone is the `two-devices` layout — the deck models it as the
  // built-in `deviceSecondary` element rather than an arbitrary list, so
  // adding one is a layout switch that seeds the back screenshot.
  const canAddDevice = slide.layout !== "two-devices" && slide.layout !== "no-device";

  function addSecondDevice() {
    onChange({
      layout: "two-devices",
      // Start it on the same capture so it's visible immediately; the back
      // slot can be pointed elsewhere from the screenshot picker.
      screenshotSecondary: slide.screenshotSecondary || slide.screenshot,
      frameSecondary: slide.frame ? { ...slide.frame } : undefined,
      transforms: undefined,
    });
    onSelectElement("deviceSecondary");
  }

  function removeSecondDevice() {
    onChange({
      layout: "device-bottom",
      screenshotSecondary: undefined,
      frameSecondary: undefined,
      transforms: undefined,
    });
    onSelectElement(null);
  }

  function addFocusElement() {
    const { cW, cH } = getCanvas(device, orientation);
    const id = nid();
    const width = cW * 0.7;
    const element: ScreenshotFocusElement = {
      id,
      crop: { x: 8, y: 12, width: 84, height: 24 },
      transform: {
        x: cW * 0.15,
        y: cH * 0.55,
        width,
        height: width * (24 / 84),
        rotation: 0,
        zIndex: 9,
      },
      borderRadius: 34,
      borderWidth: 0,
    };
    onChange({ focusElements: [...(slide.focusElements || []), element] });
    onSelectElement(toFocusElementId(id));
  }

  function deleteFocusElement(element: ScreenshotFocusElement) {
    const next = (slide.focusElements || []).filter((item) => item.id !== element.id);
    onChange({ focusElements: next.length ? next : undefined });
    onSelectElement(null);
  }

  // Z-order: re-rank zIndex among present elements so they remain contiguous.
  function reorder(id: ElementId, dir: "front" | "back" | "up" | "down") {
    const ranked = [...present].sort((a, b) => {
      const za = getTransform(a)?.zIndex ?? defaultZ(a);
      const zb = getTransform(b)?.zIndex ?? defaultZ(b);
      return za - zb;
    });
    const idx = ranked.indexOf(id);
    if (idx === -1) return;
    let target = idx;
    if (dir === "front") target = ranked.length - 1;
    else if (dir === "back") target = 0;
    else if (dir === "up") target = Math.min(ranked.length - 1, idx + 1);
    else if (dir === "down") target = Math.max(0, idx - 1);
    if (target === idx) return;
    ranked.splice(idx, 1);
    ranked.splice(target, 0, id);
    const nextTransforms = { ...transforms };
    const nextTextElements = (slide.textElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    const nextFocusElements = (slide.focusElements || []).map((element) => ({
      ...element,
      transform: { ...element.transform },
    }));
    ranked.forEach((eid, i) => {
      const cur = getTransform(eid);
      if (!cur) return;
      if (isTextElementId(eid)) {
        const textId = textElementKey(eid);
        const textElement = nextTextElements.find((element) => element.id === textId);
        if (textElement) textElement.transform = { ...textElement.transform, zIndex: i + 1 };
      } else if (isFocusElementId(eid)) {
        const focusId = focusElementKey(eid);
        const focusElement = nextFocusElements.find((element) => element.id === focusId);
        if (focusElement) focusElement.transform = { ...focusElement.transform, zIndex: i + 1 };
      } else if (isBuiltInElementId(eid)) {
        nextTransforms[eid] = { ...cur, zIndex: i + 1 };
      }
    });
    onChange({ transforms: nextTransforms, textElements: nextTextElements, focusElements: nextFocusElements });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-2">
        <div>
          <Label className="text-xs font-semibold">Elements</Label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {activeId
              ? "Move or resize it on the canvas. Adjust the details below."
              : "Add a layer, or select an element on the canvas."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {canAddDevice && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="col-span-2 h-8 w-full justify-center gap-1.5 px-2 text-xs"
              onClick={addSecondDevice}
              title="Put a second phone on this screen"
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" /> Add device
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-center gap-1.5 whitespace-nowrap px-2 text-xs" onClick={addFocusElement}>
            <Crop className="h-3.5 w-3.5 shrink-0" /> Crop layer
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-center gap-1.5 whitespace-nowrap px-2 text-xs" onClick={addTextElement}>
            <Type className="h-3.5 w-3.5 shrink-0" /> Text
          </Button>
        </div>
      </div>

      {activeId ? (
        <ActiveElementPanel
          activeId={activeId}
          appId={appId}
          fallbackSource={slide.screenshot}
          transform={activeTransform}
          textElement={activeTextElement || undefined}
          focusElement={activeFocusElement || undefined}
          locale={locale}
          onRotate={(rotation) => patchElement(activeId, { rotation })}
          onReorder={(dir) => reorder(activeId, dir)}
          onTextChange={(value) => {
            if (activeTextElement) setTextElementValue(activeTextElement, value);
          }}
          onTextPatch={(patch) => {
            if (activeTextElement) patchTextElement(activeTextElement.id, patch);
          }}
          onDeleteText={() => {
            if (activeTextElement) deleteTextElement(activeTextElement);
          }}
          onFocusPatch={(patch) => {
            if (activeFocusElement) patchFocusElement(activeFocusElement.id, patch);
          }}
          onDeleteFocus={() => {
            if (activeFocusElement) deleteFocusElement(activeFocusElement);
          }}
          onRemoveDevice={activeId === "deviceSecondary" ? removeSecondDevice : undefined}
        />
      ) : (
        <div className="rounded border border-dashed bg-background/40 p-4 text-center text-[11px] text-muted-foreground">
          Select an element to edit it.
        </div>
      )}
    </div>
  );
}

function ActiveElementPanel({
  activeId,
  appId,
  fallbackSource,
  transform,
  textElement,
  focusElement,
  locale,
  onRotate,
  onReorder,
  onTextChange,
  onTextPatch,
  onDeleteText,
  onFocusPatch,
  onDeleteFocus,
  onRemoveDevice,
}: {
  activeId: ElementId;
  appId: string;
  fallbackSource: string;
  transform: ElementTransform | undefined;
  textElement?: TextElement;
  focusElement?: ScreenshotFocusElement;
  locale: string;
  onRotate: (rotation: number) => void;
  onReorder: (dir: "front" | "back" | "up" | "down") => void;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
  onDeleteText: () => void;
  onFocusPatch: (patch: Partial<ScreenshotFocusElement>) => void;
  onDeleteFocus: () => void;
  /** Present only for the back device, which can be removed. */
  onRemoveDevice?: () => void;
}) {
  const engaged = !!transform;
  const rotation = transform?.rotation ?? 0;
  const label = elementLabel(activeId);
  return (
    <div className="space-y-2 rounded border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium">
          {textElement && <Type className="h-3.5 w-3.5" />}
          {focusElement && <Crop className="h-3.5 w-3.5" />}
          {label}
        </span>
        {textElement || focusElement || onRemoveDevice ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={onRemoveDevice ? onRemoveDevice : focusElement ? onDeleteFocus : onDeleteText}
            title={
              onRemoveDevice
                ? "Remove the second device"
                : `Delete ${focusElement ? "crop layer" : "text element"}`
            }
            aria-label={`Delete ${focusElement ? "crop layer" : "text element"}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : !engaged ? (
          <span className="text-[10px] text-muted-foreground">drag to enable</span>
        ) : null}
      </div>

      {textElement && (
        <TextElementPanel
          element={textElement}
          locale={locale}
          onTextChange={onTextChange}
          onTextPatch={onTextPatch}
        />
      )}

      {focusElement && (
        <FocusElementPanel
          element={focusElement}
          appId={appId}
          locale={locale}
          fallbackSource={fallbackSource}
          onPatch={onFocusPatch}
        />
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <RotateCw className="h-3 w-3" /> Rotation
          </Label>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {rotation}°
          </span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          disabled={!engaged}
          onChange={(e) => onRotate(Number(e.target.value))}
          className="w-full disabled:opacity-50"
          aria-label={`${label} rotation`}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Layer</Label>
        <div className="grid grid-cols-4 gap-1">
          <LayerButton disabled={!engaged} onClick={() => onReorder("back")} label="Send to back">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("down")} label="Send backward">
            <ChevronDown className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("up")} label="Bring forward">
            <ChevronUp className="h-3.5 w-3.5" />
          </LayerButton>
          <LayerButton disabled={!engaged} onClick={() => onReorder("front")} label="Bring to front">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </LayerButton>
        </div>
      </div>
    </div>
  );
}

/**
 * How many source pixels the crop actually has, versus how many it's being
 * displayed across. Anything above ~1.3x is visibly soft, and no amount of
 * sharpening recovers detail that was never captured — the fix is a
 * higher-resolution source screenshot.
 */
function useCropResolution(
  src: string,
  cropWidthPct: number,
  displayedWidthPx: number,
): { sourcePx: number; displayedPx: number; upscale: number } | null {
  const [naturalWidth, setNaturalWidth] = React.useState(0);

  React.useEffect(() => {
    if (!src) {
      setNaturalWidth(0);
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setNaturalWidth(image.naturalWidth);
    };
    image.onerror = () => {
      if (!cancelled) setNaturalWidth(0);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!naturalWidth) return null;
  const sourcePx = Math.round((naturalWidth * cropWidthPct) / 100);
  const displayedPx = Math.round(displayedWidthPx);
  if (sourcePx <= 0 || displayedPx <= 0) return null;
  return { sourcePx, displayedPx, upscale: displayedPx / sourcePx };
}

function FocusElementPanel({
  element,
  appId,
  locale,
  fallbackSource,
  onPatch,
}: {
  element: ScreenshotFocusElement;
  appId: string;
  locale: string;
  /** The slide's primary screenshot, used when the layer has no own source. */
  fallbackSource: string;
  onPatch: (patch: Partial<ScreenshotFocusElement>) => void;
}) {
  const crop = element.crop;
  const resolvedSource = resolveScreenshot(element.source || fallbackSource, locale);
  const resolution = useCropResolution(
    img(resolvedSource) || resolvedSource,
    crop.width,
    element.transform.width,
  );
  function patchCrop(patch: Partial<ScreenshotFocusElement["crop"]>) {
    const next = { ...crop, ...patch };
    next.width = Math.max(2, Math.min(next.width, 100 - next.x));
    next.height = Math.max(2, Math.min(next.height, 100 - next.y));
    next.x = Math.max(0, Math.min(next.x, 100 - next.width));
    next.y = Math.max(0, Math.min(next.y, 100 - next.height));
    onPatch({ crop: next });
  }
  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Choose part of a screenshot, then move or resize it on the canvas.
      </p>
      <ScreenshotPicker
        label="Image source"
        appId={appId}
        value={element.source || ""}
        locale={locale}
        onChange={(value) =>
          onPatch({
            source: value || undefined,
            crop: value ? { x: 0, y: 0, width: 100, height: 100 } : element.crop,
          })
        }
      />
      <p className="text-[10px] text-muted-foreground">
        Leave empty to use this screen&apos;s main screenshot.
      </p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        <CropSlider label="Crop X" value={crop.x} max={98} step={0.1} onChange={(value) => patchCrop({ x: value })} />
        <CropSlider label="Crop Y" value={crop.y} max={98} step={0.1} onChange={(value) => patchCrop({ y: value })} />
        <CropSlider label="Width" value={crop.width} min={2} max={100 - crop.x} step={0.1} onChange={(value) => patchCrop({ width: value })} />
        <CropSlider label="Height" value={crop.height} min={2} max={100 - crop.y} step={0.1} onChange={(value) => patchCrop({ height: value })} />
      </div>

      {resolution && (
        <CropResolution
          {...resolution}
          onFitNative={() =>
            onPatch({ transform: { ...element.transform, width: resolution.sourcePx } })
          }
        />
      )}
      <div className="grid grid-cols-[1fr_76px] gap-2">
        <div className="space-y-1.5">
          <CropSlider label="Corner radius" suffix="px" value={element.borderRadius ?? 34} min={0} max={120} onChange={(value) => onPatch({ borderRadius: value })} />
          <CropSlider label="Border" suffix="px" value={element.borderWidth ?? 0} min={0} max={16} onChange={(value) => onPatch({ borderWidth: value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Accent</Label>
          <Input type="color" value={element.accentColor || "#E89070"} className="h-8 p-1" onChange={(event) => onPatch({ accentColor: event.target.value })} />
        </div>
      </div>
    </div>
  );
}

function CropResolution({
  sourcePx,
  displayedPx,
  upscale,
  onFitNative,
}: {
  sourcePx: number;
  displayedPx: number;
  upscale: number;
  onFitNative: () => void;
}) {
  // 1.0x is pixel-for-pixel. Past ~1.3x softness starts showing on an export,
  // which renders at full canvas size with none of the preview's downscaling.
  const tone =
    upscale <= 1.05
      ? "text-muted-foreground"
      : upscale <= 1.3
        ? "text-amber-600 dark:text-amber-500"
        : "text-destructive";
  const verdict =
    upscale <= 1.05 ? "sharp" : upscale <= 1.3 ? "slightly soft" : "will look soft";

  return (
    <div className="space-y-1 rounded border border-dashed bg-background/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">Image quality</span>
        <span className={`text-[11px] font-medium tabular-nums ${tone}`}>
          {upscale.toFixed(2)}× · {verdict}
        </span>
      </div>
      <p className="text-[10px] tabular-nums text-muted-foreground">
        {sourcePx}px available for a {displayedPx}px layer
      </p>
      {upscale > 1.05 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full text-[10px]"
            onClick={onFitNative}
            title={`Resize the layer to ${sourcePx}px so every source pixel maps 1:1`}
          >
            Use original size ({sourcePx}px)
          </Button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Larger layers may look soft. A higher-resolution upload will stay clearer.
          </p>
        </>
      )}
    </div>
  );
}

function CropSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>{label}</span><span>{step < 1 ? value.toFixed(1) : Math.round(value)}{suffix}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
    </div>
  );
}

function TextElementPanel({
  element,
  locale,
  onTextChange,
  onTextPatch,
}: {
  element: TextElement;
  locale: string;
  onTextChange: (value: string) => void;
  onTextPatch: (patch: Partial<TextElement>) => void;
}) {
  const text = element.text?.[locale] ?? pickText(element.text, locale);
  return (
    <div className="space-y-2 rounded border bg-muted/30 p-2">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Text</Label>
        <Textarea
          value={text}
          rows={2}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Type your text"
        />
      </div>
      <div className="grid grid-cols-[1fr_76px] gap-2">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Size</Label>
          <Input
            type="number"
            min={12}
            max={400}
            value={Math.round(element.fontSize || 72)}
            onChange={(event) => onTextPatch({ fontSize: Number(event.target.value) || 72 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Color</Label>
          <Input
            type="color"
            value={element.color || "#171717"}
            className="h-9 p-1"
            onChange={(event) => onTextPatch({ color: event.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <LayerButton
          disabled={false}
          onClick={() => onTextPatch({ align: "left" })}
          label="Align left"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </LayerButton>
        <LayerButton
          disabled={false}
          onClick={() => onTextPatch({ align: "center" })}
          label="Align center"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </LayerButton>
        <LayerButton
          disabled={false}
          onClick={() => onTextPatch({ align: "right" })}
          label="Align right"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </LayerButton>
      </div>
    </div>
  );
}

function LayerButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-0"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function elementLabel(id: ElementId): string {
  if (isBuiltInElementId(id)) return ELEMENT_LABEL[id];
  if (isFocusElementId(id)) return "Crop layer";
  return "Text";
}

function defaultZ(id: ElementId): number {
  if (isFocusElementId(id)) return 8;
  if (isTextElementId(id)) return 5;
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  return 4; // caption on top
}
