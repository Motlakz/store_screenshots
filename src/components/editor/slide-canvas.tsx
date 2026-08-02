"use client";
import * as React from "react";
import { Rnd } from "react-rnd";
import { RotateCw } from "lucide-react";
import type {
  BuiltInElementId,
  Device,
  ElementId,
  ElementTransform,
  Orientation,
  ScreenshotFocusElement,
  SelectedElement,
  Slide,
  TextElement,
  Theme,
  ThemeEmphasis,
  ThemeFont,
  ThemeMotif,
} from "@/lib/types";
import {
  CANVAS,
  IPAD_RATIO,
  MK_RATIO,
  ipadW,
  phoneW,
  phoneWSmall,
  tabletLW,
  tabletPW,
} from "@/lib/constants";
import {
  backgroundCss,
  emphasisColorFor,
  fontById,
  foregroundFor,
  grainCss,
  readableOn,
  resolveStyle,
  shade,
} from "@/lib/style";
import { frameColorById, resolveFrame } from "@/lib/frames";
import { focusElementKey, isFocusElementId, toFocusElementId, toTextElementId } from "@/lib/elements";
import { img } from "@/lib/image-cache";
import { pickText, resolveScreenshot } from "@/lib/locale";
import {
  AndroidPhone,
  AndroidTabletL,
  AndroidTabletP,
  IPad,
  Phone,
} from "./device-frames";
import { Device3D } from "./device-3d";

type FrameComp = React.ComponentType<{
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  hideEmpty?: boolean;
  bezel?: string;
  bezelStroke?: string;
  bezelStrokeWidth?: number;
}>;

export function getCanvas(device: Device, orientation: Orientation) {
  const c = CANVAS[device];
  if ((device === "android-7" || device === "android-10") && orientation === "landscape") {
    return { cW: c.wL!, cH: c.hL! };
  }
  return { cW: c.w, cH: c.h };
}

// Aspect ratio (w/h) of each device frame — must match device-frames.tsx
function getFrameAspect(device: Device, orientation: Orientation) {
  switch (device) {
    case "iphone":      return MK_RATIO;
    case "android":     return 9 / 19.5;
    case "ipad":        return IPAD_RATIO;
    case "android-7":
    case "android-10":  return orientation === "landscape" ? 8 / 5 : 5 / 8;
    default:            return 1;
  }
}

export function getFrameForDevice(device: Device, orientation: Orientation): {
  Comp: FrameComp;
  widthFn: (cW: number, cH: number) => number;
  smallWidthFn: (cW: number, cH: number) => number;
} {
  switch (device) {
    case "iphone":
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "ipad":
      return { Comp: IPad, widthFn: ipadW, smallWidthFn: (cW, cH) => ipadW(cW, cH, 0.6) };
    case "android":
      return { Comp: AndroidPhone, widthFn: phoneW, smallWidthFn: phoneWSmall };
    case "android-7":
    case "android-10":
      if (orientation === "landscape") {
        return { Comp: AndroidTabletL, widthFn: tabletLW, smallWidthFn: (cW, cH) => tabletLW(cW, cH, 0.5) };
      }
      return { Comp: AndroidTabletP, widthFn: tabletPW, smallWidthFn: (cW, cH) => tabletPW(cW, cH, 0.62) };
    default:
      return { Comp: Phone, widthFn: phoneW, smallWidthFn: phoneWSmall };
  }
}

type EditHandlers = {
  onLabelChange?: (v: string) => void;
  onHeadlineChange?: (v: string) => void;
  onTextElementTextChange?: (id: string, v: string) => void;
  onElementChange?: (id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (id: ElementId | null) => void;
};

type Props = {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId?: ElementId | null;
  // Preview scale (1.0 = full size). Used so react-rnd maps drag deltas correctly
  // when the canvas is rendered inside a CSS-transformed container.
  previewScale?: number;
  /** When true, suppress the "Drop a screenshot here" placeholder. Used for export. */
  hideEmpty?: boolean;
  /** Disable live WebGL for compact secondary previews such as sidebar thumbnails. */
  enable3D?: boolean;
};

type DeckEditHandlers = {
  onLabelChange?: (slideId: string, v: string) => void;
  onHeadlineChange?: (slideId: string, v: string) => void;
  onTextElementTextChange?: (slideId: string, id: string, v: string) => void;
  onElementChange?: (slideId: string, id: ElementId, t: ElementTransform) => void;
  onSelectElement?: (element: SelectedElement | null) => void;
  onSelectScreen?: (slideId: string) => void;
};

type DeckCanvasProps = {
  slides: Slide[];
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  connectedCanvas?: boolean;
  editable?: boolean;
  edit?: DeckEditHandlers;
  selectedElement?: SelectedElement | null;
  activeSlideId?: string | null;
  previewScale?: number;
  hideEmpty?: boolean;
  showGuides?: boolean;
  /** Disable live WebGL for compact secondary previews such as sidebar thumbnails. */
  enable3D?: boolean;
};

// ---------- Editable text helpers ----------

function EditableText({
  value,
  editable,
  onChange,
  style,
  multiline = false,
  placeholder,
  onFocus,
}: {
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  onFocus?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = value || "";
    if (el.textContent !== incoming && document.activeElement !== el) {
      el.textContent = incoming;
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    const text = (e.currentTarget.innerText || "").replace(/\u00a0/g, " ");
    onChange(multiline ? text : text.replace(/\n/g, ""));
  };

  return (
    <div
      ref={ref}
      contentEditable={editable}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={handleInput}
      onFocus={() => onFocus?.()}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onMouseDown={(e) => {
        // Allow text editing without starting an Rnd drag.
        if (editable) {
          e.stopPropagation();
          onFocus?.();
        }
      }}
      onPointerDown={(e) => {
        if (editable) e.stopPropagation();
      }}
      style={{
        outline: "none",
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        cursor: editable ? "text" : "default",
        ...style,
      }}
    />
  );
}

// ---------- Caption (label + headline) ----------

function Caption({
  cW,
  cH,
  slide,
  theme,
  locale,
  editable,
  edit,
  align = "center",
  inverted,
  slideIndex = 0,
  onFocus,
}: {
  cW: number;
  cH: number;
  slide: Slide;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  align?: "center" | "left";
  inverted?: boolean;
  /** Drives per-slide solid rotation and its contrast pairing. */
  slideIndex?: number;
  onFocus?: () => void;
}) {
  const style = resolveStyle(theme);
  const fg = foregroundFor(theme, !!inverted, slideIndex, slide.background);
  const accent = readableOn(theme, theme.accent, !!inverted, slideIndex, slide.background);
  // Per-screen font overrides beat the theme's faces.
  const headlineFamily = fontById(slide.headlineFont)?.family ?? style.headline.family;
  const labelFamily = fontById(slide.labelFont)?.family ?? style.label.family;
  const headline = pickText(slide.headline, locale);
  // Scale typography off the *shorter* dimension so landscape layouts don't
  // produce headlines so tall they overlap the device frame.
  const unit = Math.min(cW, cH);
  const headlineSize = unit * 0.092 * (style.headline.scale ?? 1);
  // A theme with an emphasis face renders the headline as styled rich text,
  // which can't round-trip through contentEditable — those decks are edited in
  // the inspector instead. Plain themes stay directly editable on canvas.
  const hasEmphasis = !!style.emphasis && /\*[^*]+\*/.test(headline);

  return (
    <div style={{ textAlign: align, position: "relative", width: "100%" }}>
      <EditableText
        value={pickText(slide.label, locale)}
        editable={editable}
        onChange={edit?.onLabelChange}
        onFocus={onFocus}
        placeholder="LABEL"
        style={{
          fontFamily: labelFamily,
          fontSize: unit * 0.028 * (style.label.scale ?? 1),
          fontWeight: style.label.weight,
          letterSpacing: unit * 0.0015,
          color: accent,
          textTransform: style.label.transform ?? "uppercase",
          marginBottom: unit * 0.018,
          minHeight: unit * 0.03,
        }}
      />
      {hasEmphasis ? (
        <StyledHeadline
          value={headline}
          size={headlineSize}
          color={fg}
          font={{ ...style.headline, family: headlineFamily }}
          emphasis={style.emphasis!}
          emphasisColor={emphasisColorFor(theme, style.emphasis!, !!inverted, slideIndex, slide.background)}
          onFocus={onFocus}
        />
      ) : (
        <EditableText
          value={headline}
          editable={editable}
          multiline
          onChange={edit?.onHeadlineChange}
          onFocus={onFocus}
          placeholder="Headline goes here"
          style={{
            fontFamily: headlineFamily,
            fontSize: headlineSize,
            fontWeight: style.headline.weight,
            fontStyle: style.headline.italic ? "italic" : "normal",
            lineHeight: style.headline.lineHeight,
            letterSpacing: headlineSize * (style.headline.letterSpacing ?? -0.012),
            textTransform: style.headline.transform ?? "none",
            color: fg,
          }}
        />
      )}
    </div>
  );
}

// Renders `*wrapped*` phrases in the theme's emphasis face — the one script or
// italic phrase per headline that every named style is built around.
function StyledHeadline({
  value,
  size,
  color,
  font,
  emphasis,
  emphasisColor,
  onFocus,
}: {
  value: string;
  size: number;
  color: string;
  font: ThemeFont;
  emphasis: ThemeEmphasis;
  emphasisColor: string;
  onFocus?: () => void;
}) {
  const parts = value.split(/(\*[^*]+\*)/g);
  return (
    <div
      onMouseDown={(event) => {
        event.stopPropagation();
        onFocus?.();
      }}
      style={{
        color,
        fontFamily: font.family,
        fontSize: size,
        fontWeight: font.weight,
        fontStyle: font.italic ? "italic" : "normal",
        lineHeight: font.lineHeight,
        letterSpacing: size * (font.letterSpacing ?? -0.012),
        textTransform: font.transform ?? "none",
        whiteSpace: "pre-wrap",
      }}
    >
      {parts.map((part, index) =>
        part.startsWith("*") && part.endsWith("*") ? (
          <span
            key={index}
            style={{
              color: emphasisColor,
              fontFamily: emphasis.family,
              fontSize: `${emphasis.scale ?? 1.1}em`,
              fontWeight: emphasis.weight ?? 400,
              fontStyle: emphasis.italic ? "italic" : "normal",
              lineHeight: emphasis.lineHeight ?? undefined,
              // inline-block so the tilt doesn't disturb the line box
              display: emphasis.rotation ? "inline-block" : undefined,
              transform: emphasis.rotation ? `rotate(${emphasis.rotation}deg)` : undefined,
            }}
          >
            {part.slice(1, -1)}
          </span>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </div>
  );
}

// ---------- Background ----------

// ---------- Decorative blob ----------

function Blob({
  cW,
  color,
  x,
  y,
  size,
  opacity = 0.4,
}: {
  cW: number;
  color: string;
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        background: color,
        borderRadius: "50%",
        filter: `blur(${cW * 0.06}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ---------- Default element rects per layout ----------

type Rect = { x: number; y: number; width: number; height: number };
type LayoutRects = {
  caption?: Rect & { align?: "center" | "left" };
  device?: Rect;
  deviceSecondary?: Rect;
};

function getDefaultRects(
  layout: Slide["layout"],
  cW: number,
  cH: number,
  frameAspect: number,
  fwFrac: number,
  fwSmallFrac: number,
): LayoutRects {
  const deviceW = fwFrac * cW;
  const deviceH = deviceW / frameAspect;
  const smallW = fwSmallFrac * cW;
  const smallH = smallW / frameAspect;
  const capW = cW * 0.84;
  const capH = cH * 0.28;

  switch (layout) {
    case "hero":
      return {
        caption: { x: cW * 0.08, y: cH * 0.09, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH + deviceH * 0.15,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-bottom":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: cH - deviceH - cH * 0.02,
          width: deviceW,
          height: deviceH,
        },
      };
    case "device-top":
      return {
        caption: { x: cW * 0.08, y: cH * 0.65, width: capW, height: capH, align: "center" },
        device: {
          x: (cW - deviceW) / 2,
          y: -cH * 0.1,
          width: deviceW,
          height: deviceH,
        },
      };
    case "two-devices":
      return {
        caption: { x: cW * 0.08, y: cH * 0.08, width: capW, height: capH, align: "center" },
        deviceSecondary: {
          x: -cW * 0.06,
          y: cH - smallH - cH * 0.05,
          width: smallW,
          height: smallH,
        },
        device: {
          x: cW - deviceW * 0.9 + cW * 0.06,
          y: cH - deviceH * 0.9 - cH * 0.02,
          width: deviceW * 0.9,
          height: (deviceW * 0.9) / frameAspect,
        },
      };
    case "no-device":
      return {
        caption: {
          x: cW * 0.1,
          y: cH * 0.35,
          width: cW * 0.8,
          height: cH * 0.3,
          align: "center",
        },
      };
    case "split-landscape":
      return {
        caption: {
          x: cW * 0.05,
          y: cH * 0.25,
          width: cW * 0.38,
          height: cH * 0.5,
          align: "left",
        },
        device: {
          x: cW - deviceW + cW * 0.03,
          y: (cH - deviceH) / 2,
          width: deviceW,
          height: deviceH,
        },
      };
    default:
      return {};
  }
}

function rectFor(
  id: BuiltInElementId,
  slide: Slide,
  defaults: LayoutRects,
): (Rect & { align?: "center" | "left" }) | undefined {
  const saved = slide.transforms?.[id];
  const def = defaults[id];
  if (!def && !saved) return undefined;
  if (!saved) return def;
  return {
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    align: (def as { align?: "center" | "left" } | undefined)?.align,
  };
}

function getSlideGeometry(slide: Slide, device: Device, orientation: Orientation) {
  const { cW, cH } = getCanvas(device, orientation);
  const { Comp: Frame, widthFn, smallWidthFn } = getFrameForDevice(device, orientation);
  const frameAspect = getFrameAspect(device, orientation);
  const fwFrac = widthFn(cW, cH);
  const fwSmallFrac = smallWidthFn(cW, cH);
  const defaults = getDefaultRects(slide.layout, cW, cH, frameAspect, fwFrac, fwSmallFrac);
  return { cW, cH, Frame, frameAspect, defaults };
}

export function getElementTransform(
  slide: Slide,
  device: Device,
  orientation: Orientation,
  id: ElementId,
): ElementTransform | undefined {
  if (id.startsWith("text:")) {
    const textId = id.slice("text:".length);
    const textElement = slide.textElements?.find((element) => element.id === textId);
    return textElement?.transform;
  }
  if (isFocusElementId(id)) {
    return slide.focusElements?.find((element) => element.id === focusElementKey(id))?.transform;
  }
  const { defaults } = getSlideGeometry(slide, device, orientation);
  const rect = rectFor(id as BuiltInElementId, slide, defaults);
  if (!rect) return undefined;
  const saved = slide.transforms?.[id as BuiltInElementId];
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    rotation: saved?.rotation ?? 0,
    zIndex: saved?.zIndex ?? defaultElementZ(id as BuiltInElementId),
  };
}

function defaultElementZ(id: BuiltInElementId): number {
  if (id === "deviceSecondary") return 2;
  if (id === "device") return 3;
  return 4;
}

// ---------- Main single-screen canvas ----------

export function SlideCanvas({
  slide,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
  selectedElementId = null,
  previewScale = 1,
  hideEmpty,
  enable3D = true,
}: Props) {
  const { cW, cH } = getCanvas(device, orientation);

  if (slide.layout === "feature-graphic" || device === "feature-graphic") {
    return (
      <FeatureGraphicCanvas
        slide={slide}
        cW={cW}
        theme={theme}
        locale={locale}
        appName={appName}
        appIcon={appIcon}
        editable={editable}
        edit={edit}
      />
    );
  }

  const handleBackgroundMouseDown = editable
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) edit?.onSelectElement?.(null);
      }
    : undefined;

  return (
    <div
      onMouseDown={handleBackgroundMouseDown}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} appName={appName} />
      <SlideElements
        slide={slide}
        device={device}
        orientation={orientation}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        selectedElementId={selectedElementId}
        previewScale={previewScale}
        hideEmpty={hideEmpty}
        screenX={0}
        slideIndex={0}
        boundsW={cW}
        boundsH={cH}
        allowCrossScreen={false}
        enable3D={enable3D}
      />
      {resolveStyle(theme).decor.dreamy && <DreamyFront slideId={slide.id} cW={cW} cH={cH} />}
    </div>
  );
}

// ---------- Connected deck canvas ----------

export function DeckCanvas({
  slides,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  connectedCanvas = true,
  editable,
  edit,
  selectedElement = null,
  activeSlideId = null,
  previewScale = 1,
  hideEmpty,
  showGuides = false,
  enable3D = true,
}: DeckCanvasProps) {
  const { cW, cH } = getCanvas(device, orientation);
  const totalW = Math.max(1, slides.length) * cW;

  return (
    <div
      style={{
        width: totalW,
        height: cH,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {slides.map((slide, index) => {
        const screenX = index * cW;
        const active = activeSlideId === slide.id;
        if (slide.layout === "feature-graphic" || device === "feature-graphic") {
          return (
            <div
              key={`${slide.id}-feature`}
              onMouseDown={(e) => {
                if (!editable || e.defaultPrevented) return;
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(null);
              }}
              style={{
                position: "absolute",
                left: screenX,
                top: 0,
                width: cW,
                height: cH,
                overflow: "hidden",
              }}
            >
              <FeatureGraphicCanvas
                slide={slide}
                cW={cW}
                theme={theme}
                locale={locale}
                appName={appName}
                appIcon={appIcon}
                editable={editable}
                edit={{
                  onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
                }}
              />
              {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
            </div>
          );
        }
        return (
          <div
            key={`${slide.id}-bg`}
            onMouseDown={(e) => {
              if (!editable || e.defaultPrevented) return;
              edit?.onSelectScreen?.(slide.id);
              edit?.onSelectElement?.(null);
            }}
            style={{
              position: "absolute",
              left: screenX,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            <SlideBackground
              slide={slide}
              cW={cW}
              cH={cH}
              theme={theme}
              slideIndex={index}
              appName={appName}
            />
            {showGuides && <ScreenGuide cW={cW} cH={cH} index={index} active={active} />}
          </div>
        );
      })}

      {slides.map((slide, index) => {
        if (slide.layout === "feature-graphic" || device === "feature-graphic") return null;
        const selectedElementId =
          selectedElement?.slideId === slide.id ? selectedElement.elementId : null;
        const perSlideEdit: EditHandlers | undefined = editable
          ? {
              onLabelChange: (v) => edit?.onLabelChange?.(slide.id, v),
              onHeadlineChange: (v) => edit?.onHeadlineChange?.(slide.id, v),
              onTextElementTextChange: (id, v) => edit?.onTextElementTextChange?.(slide.id, id, v),
              onElementChange: (id, t) => edit?.onElementChange?.(slide.id, id, t),
              onSelectElement: (id) => {
                edit?.onSelectScreen?.(slide.id);
                edit?.onSelectElement?.(id ? { slideId: slide.id, elementId: id } : null);
              },
            }
          : undefined;

        const elements = (
          <SlideElements
            key={`${slide.id}-elements`}
            slide={slide}
            device={device}
            orientation={orientation}
            theme={theme}
            locale={locale}
            editable={editable}
            edit={perSlideEdit}
            selectedElementId={selectedElementId}
            previewScale={previewScale}
            hideEmpty={hideEmpty}
            screenX={connectedCanvas ? index * cW : 0}
            slideIndex={index}
            boundsW={connectedCanvas ? totalW : cW}
            boundsH={cH}
            allowCrossScreen={connectedCanvas}
            enable3D={enable3D}
          />
        );
        if (connectedCanvas) return elements;
        return (
          <div
            key={`${slide.id}-elements-isolated`}
            style={{
              position: "absolute",
              left: index * cW,
              top: 0,
              width: cW,
              height: cH,
              overflow: "hidden",
            }}
          >
            {elements}
          </div>
        );
      })}

      {resolveStyle(theme).decor.dreamy &&
        slides.map((slide, index) => {
          if (slide.layout === "feature-graphic" || device === "feature-graphic") return null;
          return (
            <div
              key={`${slide.id}-front`}
              style={{
                position: "absolute",
                left: index * cW,
                top: 0,
                width: cW,
                height: cH,
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 50,
              }}
            >
              <DreamyFront slideId={slide.id} cW={cW} cH={cH} />
            </div>
          );
        })}
    </div>
  );
}

function SlideBackground({
  slide,
  cW,
  cH,
  theme,
  slideIndex = 0,
  appName,
}: {
  slide: Slide;
  cW: number;
  cH: number;
  theme: Theme;
  slideIndex?: number;
  appName?: string;
}) {
  const inverted = !!slide.inverted;
  const { decor } = resolveStyle(theme);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: backgroundCss(theme, inverted, slideIndex, slide.background),
        color: foregroundFor(theme, inverted, slideIndex, slide.background),
      }}
    >
      {decor.dreamy && <DreamyDecorations slideId={slide.id} cW={cW} cH={cH} />}

      {decor.bellyclock && (
        <BellyClockDecorations
          cW={cW}
          cH={cH}
          slideIndex={slideIndex}
          ink={foregroundFor(theme, inverted, slideIndex, slide.background)}
          appName={appName || "BellyClock"}
        />
      )}

      {decor.blobs && (
        <>
          <Blob cW={cW} color={theme.accent} x={-15} y={-10} size={55} opacity={inverted ? 0.25 : 0.32} />
          <Blob cW={cW} color={theme.accent} x={70} y={75} size={45} opacity={inverted ? 0.18 : 0.25} />
        </>
      )}

      {decor.motifs && decor.motifs.length > 0 && (
        <Motifs
          slideId={slide.id}
          cW={cW}
          cH={cH}
          motifs={decor.motifs}
          color={decor.motifColor || theme.accent}
        />
      )}

      {/* Radial vignette — pulls the eye to the centre of a photo-led slide. */}
      {decor.vignette ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(0,0,0,${decor.vignette}) 100%)`,
          }}
        />
      ) : null}

      {/* Bottom scrim so headlines stay legible over imagery. */}
      {decor.scrim ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.62) 100%)",
          }}
        />
      ) : null}

      {/* Paper grain sits above everything else in the background layer. */}
      {decor.grain ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: grainCss(decor.grain),
            backgroundRepeat: "repeat",
            mixBlendMode: "multiply",
          }}
        />
      ) : null}
    </div>
  );
}

// BellyClock uses hand-drawn editorial diagrams, not the shared grab-bag of
// squiggles. Every mark explains the screen's subject: time, metabolic phase,
// hydration, trends, journaling, community, or spiritual rhythm.
function BellyClockDecorations({
  cW,
  cH,
  slideIndex,
  ink,
  appName,
}: {
  cW: number;
  cH: number;
  slideIndex: number;
  ink: string;
  appName: string;
}) {
  const phase = ["#60A5FA", "#818CF8", "#A78BFA", "#E879F9", "#FB7185", "#86EFAC"];
  const scene = slideIndex % 8;
  const stroke = Math.max(3, cW * 0.0035);
  const faint = `${ink}2E`;
  const quiet = `${ink}66`;
  const glowLayouts = [
    [[-8, 10, 48], [72, 34, 44], [28, 78, 52]],
    [[66, -5, 48], [-14, 48, 50], [58, 76, 46]],
    [[-12, 64, 50], [70, 8, 42], [52, 48, 50]],
    [[62, 60, 52], [-10, 16, 46], [58, -8, 44]],
    [[68, 46, 46], [-12, 70, 54], [18, 4, 42]],
    [[-10, 42, 48], [70, 68, 50], [62, 2, 44]],
    [[64, -6, 46], [-12, 58, 52], [52, 70, 48]],
    [[-12, 0, 50], [66, 28, 52], [28, 72, 54]],
  ] as const;
  const glowColors = ["#7C3AED", "#E879F9", "#22D3EE"] as const;
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
    fontSize: Math.max(13, cW * 0.018),
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fill: ink,
  };

  const diagram = (() => {
    if (scene === 0) {
      return (
        <>
          <g transform={`translate(${cW * 0.73} ${cH * 0.55}) rotate(-12)`} opacity="0.72">
            {phase.map((color, index) => (
              <circle
                key={color}
                r={cW * (0.28 - index * 0.012)}
                fill="none"
                stroke={color}
                strokeWidth={stroke * 2.1}
                strokeLinecap="round"
                strokeDasharray={`${cW * 0.19} ${cW * 1.7}`}
                strokeDashoffset={-index * cW * 0.205}
              />
            ))}
            <circle r={cW * 0.205} fill="none" stroke={faint} strokeWidth={stroke} strokeDasharray={`${stroke} ${stroke * 3}`} />
            <path d={`M 0 ${-cW * 0.31} L ${cW * 0.025} ${-cW * 0.26} L ${-cW * 0.018} ${-cW * 0.265} Z`} fill={phase[3]} />
          </g>
          <text x={cW * 0.67} y={cH * 0.84} style={labelStyle}>digest · burn · renew</text>
        </>
      );
    }
    if (scene === 1) {
      return (
        <g transform={`translate(${cW * 0.82} ${cH * 0.2}) rotate(7)`} opacity="0.72">
          <circle r={cW * 0.17} fill="none" stroke={quiet} strokeWidth={stroke} />
          {Array.from({ length: 24 }, (_, index) => {
            const a = (index / 24) * Math.PI * 2;
            const inner = cW * (index % 6 === 0 ? 0.135 : 0.145);
            const outer = cW * 0.165;
            return <line key={index} x1={Math.cos(a) * inner} y1={Math.sin(a) * inner} x2={Math.cos(a) * outer} y2={Math.sin(a) * outer} stroke={index < 16 ? phase[2] : quiet} strokeWidth={index % 6 === 0 ? stroke * 1.4 : stroke * 0.7} strokeLinecap="round" />;
          })}
          <path d={`M0 0 C ${cW * 0.02} ${-cW * 0.07}, ${cW * 0.08} ${-cW * 0.08}, ${cW * 0.11} ${-cW * 0.045}`} fill="none" stroke={phase[4]} strokeWidth={stroke * 1.7} strokeLinecap="round" />
          <text x={-cW * 0.055} y={cW * 0.015} style={labelStyle}>16:8</text>
        </g>
      );
    }
    if (scene === 2) {
      return (
        <g opacity="0.66" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[0, 1, 2].map((index) => (
            <g key={index} transform={`translate(${cW * (0.1 + index * 0.11)} ${cH * (0.69 + index * 0.045)}) rotate(${index * 5 - 7})`}>
              <path d={`M0 ${-cW * 0.065} C ${-cW * 0.07} ${cW * 0.02}, ${-cW * 0.055} ${cW * 0.09}, 0 ${cW * 0.1} C ${cW * 0.058} ${cW * 0.087}, ${cW * 0.07} ${cW * 0.02}, 0 ${-cW * 0.065} Z`} stroke={phase[0]} strokeWidth={stroke * 1.35} />
              <path d={`M${-cW * 0.022} ${cW * 0.055} Q0 ${cW * 0.073} ${cW * 0.025} ${cW * 0.048}`} stroke={phase[0]} strokeWidth={stroke * 0.8} opacity="0.65" />
            </g>
          ))}
          <path d={`M${cW * 0.08} ${cH * 0.88} C${cW * 0.22} ${cH * 0.84}, ${cW * 0.31} ${cH * 0.91}, ${cW * 0.43} ${cH * 0.86}`} stroke={quiet} strokeWidth={stroke} strokeDasharray={`${stroke * 2} ${stroke * 3}`} />
        </g>
      );
    }
    if (scene === 3) {
      return (
        <g transform={`translate(${cW * 0.06} ${cH * 0.67})`} opacity="0.63" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[0, 1, 2, 3].map((index) => <line key={index} x1="0" y1={index * cH * 0.065} x2={cW * 0.52} y2={index * cH * 0.065} stroke={faint} strokeWidth={stroke * 0.55} strokeDasharray={`${stroke} ${stroke * 3}`} />)}
          <path d={`M0 ${cH * 0.17} C${cW * 0.08} ${cH * 0.12}, ${cW * 0.11} ${cH * 0.16}, ${cW * 0.18} ${cH * 0.09} S${cW * 0.31} ${cH * 0.13}, ${cW * 0.39} ${cH * 0.045} S${cW * 0.47} ${cH * 0.055}, ${cW * 0.52} 0`} stroke={phase[3]} strokeWidth={stroke * 1.8} />
          {[0.18, 0.39, 0.52].map((x, index) => <circle key={x} cx={cW * x} cy={[0.09, 0.045, 0][index] * cH} r={stroke * 1.8} fill={phase[4]} stroke="none" />)}
        </g>
      );
    }
    if (scene === 4) {
      return (
        <g transform={`translate(${cW * 0.68} ${cH * 0.72}) rotate(-4)`} opacity="0.62" fill="none" strokeLinecap="round">
          <path d={`M0 0 Q${cW * 0.12} ${-cH * 0.035} ${cW * 0.25} 0 T${cW * 0.49} 0`} stroke={phase[4]} strokeWidth={stroke * 1.45} />
          {[0, 1, 2].map((index) => (
            <g key={index} transform={`translate(0 ${cH * (0.055 + index * 0.075)})`}>
              <rect width={cW * 0.035} height={cW * 0.035} rx={stroke * 1.4} stroke={phase[2]} strokeWidth={stroke} />
              <path d={`M${cW * 0.008} ${cW * 0.018} l${cW * 0.008} ${cW * 0.009} l${cW * 0.016} ${-cW * 0.021}`} stroke={phase[5]} strokeWidth={stroke} />
              <path d={`M${cW * 0.055} ${cW * 0.018} C${cW * 0.15} ${cW * 0.006}, ${cW * 0.3} ${cW * 0.03}, ${cW * 0.45} ${cW * 0.012}`} stroke={quiet} strokeWidth={stroke * 0.8} />
            </g>
          ))}
        </g>
      );
    }
    if (scene === 5) {
      const nodes = [[0.12, 0.76], [0.28, 0.68], [0.42, 0.79], [0.22, 0.88], [0.49, 0.91]];
      return (
        <g opacity="0.62">
          <path d={`M${cW * 0.12} ${cH * 0.76} C${cW * 0.22} ${cH * 0.64}, ${cW * 0.34} ${cH * 0.7}, ${cW * 0.42} ${cH * 0.79} S${cW * 0.38} ${cH * 0.91}, ${cW * 0.49} ${cH * 0.91}`} fill="none" stroke={quiet} strokeWidth={stroke} strokeDasharray={`${stroke * 2} ${stroke * 3}`} />
          {nodes.map(([x, y], index) => <circle key={index} cx={cW * x} cy={cH * y} r={cW * (index === 1 ? 0.027 : 0.018)} fill={phase[index % phase.length]} stroke={ink} strokeWidth={stroke * 0.55} />)}
        </g>
      );
    }
    if (scene === 6) {
      return (
        <g transform={`translate(${cW * 0.78} ${cH * 0.18})`} opacity="0.7">
          <path d={`M0 ${-cW * 0.13} A${cW * 0.14} ${cW * 0.14} 0 1 0 ${cW * 0.105} ${cW * 0.11} A${cW * 0.115} ${cW * 0.115} 0 1 1 0 ${-cW * 0.13}`} fill="none" stroke={phase[5]} strokeWidth={stroke * 1.7} strokeLinecap="round" />
          {[0, 1, 2, 3, 4].map((index) => <line key={index} x1={-cW * 0.2 + index * cW * 0.1} y1={cW * 0.18} x2={-cW * 0.18 + index * cW * 0.1} y2={cW * (0.19 + (index % 2) * 0.025)} stroke={quiet} strokeWidth={stroke} strokeLinecap="round" />)}
        </g>
      );
    }
    return (
      <g transform={`translate(${cW * 0.08} ${cH * 0.72})`} opacity="0.72">
        {phase.map((color, index) => (
          <g key={color} transform={`translate(0 ${index * cH * 0.038})`}>
            <circle cx={stroke * 2} cy="0" r={stroke * 1.55} fill={color} />
            <line x1={stroke * 6} y1="0" x2={cW * (0.2 + index * 0.035)} y2={index % 2 ? stroke : -stroke} stroke={color} strokeWidth={stroke * 1.1} strokeLinecap="round" />
          </g>
        ))}
      </g>
    );
  })();

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {glowLayouts[scene].map(([left, top, size], index) => (
        <div
          key={glowColors[index]}
          style={{
            position: "absolute",
            left: `${left}%`,
            top: `${top}%`,
            width: `${size}%`,
            aspectRatio: "1 / 1",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColors[index]} 0%, ${glowColors[index]}99 18%, ${glowColors[index]}33 48%, transparent 72%)`,
            filter: `blur(${Math.max(24, cW * 0.035)}px)`,
            mixBlendMode: "screen",
            opacity: index === 1 ? 0.34 : 0.3,
            transform: `rotate(${scene * 7 + index * 19}deg) scale(${index === 2 ? 1.12 : 1})`,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: cW * 0.055,
          top: cH * 0.035,
          color: ink,
          fontFamily: "var(--font-quicksand), Quicksand, sans-serif",
          fontSize: Math.max(18, cW * 0.028),
          fontWeight: 700,
          letterSpacing: "-0.02em",
          opacity: 0.82,
        }}
      >
        {appName.toLowerCase()}
      </div>
      <svg width="100%" height="100%" viewBox={`0 0 ${cW} ${cH}`} preserveAspectRatio="none">
        {diagram}
      </svg>
    </div>
  );
}

// Sparse hand-drawn marks. Placement is derived from the slide id so a given
// screen always draws the same arrangement instead of reshuffling on rerender.
function Motifs({
  slideId,
  cW,
  cH,
  motifs,
  color,
}: {
  slideId: string;
  cW: number;
  cH: number;
  motifs: ThemeMotif[];
  color: string;
}) {
  let seed = 0;
  for (let i = 0; i < slideId.length; i++) seed = (seed * 31 + slideId.charCodeAt(i)) >>> 0;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 8) % n;
  };
  const unit = Math.min(cW, cH);
  const count = 4;
  const nodes = Array.from({ length: count }, (_, i) => {
    const motif = motifs[rand(motifs.length)];
    const size = unit * (0.05 + rand(4) / 100);
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${6 + rand(84)}%`,
          top: `${8 + rand(80)}%`,
          width: size,
          height: size,
          transform: `rotate(${rand(60) - 30}deg)`,
          opacity: 0.75,
        }}
      >
        <MotifGlyph motif={motif} color={color} />
      </div>
    );
  });
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {nodes}
    </div>
  );
}

function MotifGlyph({ motif, color }: { motif: ThemeMotif; color: string }) {
  const stroke = { fill: "none", stroke: color, strokeWidth: 6, strokeLinecap: "round" as const };
  switch (motif) {
    case "squiggle":
      return (
        <svg viewBox="0 0 100 40" width="100%" height="100%">
          <path d="M4 26 Q 18 4, 32 22 T 62 22 T 94 16" {...stroke} />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M50 8 L58 40 L92 42 L64 60 L74 92 L50 72 L26 92 L36 60 L8 42 L42 40 Z" fill={color} />
        </svg>
      );
    case "arrow":
      return (
        <svg viewBox="0 0 100 60" width="100%" height="100%">
          <path d="M6 44 Q 40 -2, 88 20" {...stroke} />
          <path d="M70 10 L90 20 L74 34" {...stroke} />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path
            d="M50 86 C 12 58, 6 32, 24 20 C 38 11, 50 24, 50 32 C 50 24, 62 11, 76 20 C 94 32, 88 58, 50 86 Z"
            fill={color}
          />
        </svg>
      );
    case "paw":
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <ellipse cx="50" cy="66" rx="26" ry="22" fill={color} />
          <circle cx="24" cy="38" r="10" fill={color} />
          <circle cx="42" cy="24" r="10" fill={color} />
          <circle cx="62" cy="24" r="10" fill={color} />
          <circle cx="78" cy="38" r="10" fill={color} />
        </svg>
      );
    case "sparkle":
    default:
      return (
        <svg viewBox="0 0 100 100" width="100%" height="100%">
          <path d="M50 6 C 54 38, 62 46, 94 50 C 62 54, 54 62, 50 94 C 46 62, 38 54, 6 50 C 38 46, 46 38, 50 6 Z" fill={color} />
        </svg>
      );
  }
}

// Per-slide floating decorations. Every frame shares a couple of soft ambient
// wisps + a sparkle for visual cohesion, then layers on a motif that echoes the
// feature that screen shows (waveform for voice, mood emoji for the check-in,
// a mini chart for insights, a lock for privacy, and so on).
//
// Decorations render in two passes so text badges stay readable: soft/ambient
// pieces (orbs, wisps, sparkles, emoji, mini-charts) draw in the BACK layer
// behind the device where partial occlusion reads as depth, while the text
// chips draw in a FRONT overlay above the device so their words are never
// clipped. Neither layer intercepts pointer events.
function DreamyDecorations({
  slideId,
  cW,
  cH,
  layer = "back",
}: {
  slideId: string;
  cW: number;
  cH: number;
  layer?: "back" | "front";
}) {
  type S = React.CSSProperties;
  const wisp = (key: string, style: S) => (
    <div key={key} style={{ position: "absolute", borderRadius: 999, filter: `blur(${cW * 0.015}px)`, ...style }} />
  );
  const spark = (key: string, left: string, top: string, size: number, color = "rgba(255,255,255,.78)") => (
    <div key={key} style={{ position: "absolute", left, top, color, fontSize: cW * size, lineHeight: 1 }}>✦</div>
  );
  const glyph = (
    key: string,
    char: string,
    pos: S,
    size: number,
    rotate = 0,
    shadow = "rgba(27,34,64,.20)",
  ) => (
    <div key={key} style={{ position: "absolute", ...pos, fontSize: cW * size, transform: `rotate(${rotate}deg)`, filter: `drop-shadow(0 ${cW * 0.006}px ${cW * 0.012}px ${shadow})`, lineHeight: 1 }}>{char}</div>
  );
  const chip = (key: string, text: string, pos: S, bg: string, rotate = 0, color = "#fff") => (
    <div
      key={key}
      style={{
        position: "absolute",
        ...pos,
        transform: `rotate(${rotate}deg)`,
        background: bg,
        color,
        fontFamily: "Quicksand, sans-serif",
        fontWeight: 600,
        fontSize: cW * 0.026,
        padding: `${cW * 0.013}px ${cW * 0.026}px`,
        borderRadius: cW * 0.032,
        boxShadow: "0 10px 22px rgba(126,102,181,.24)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
  const pillRow = (
    key: string,
    pos: S,
    heights: number[],
    color: string,
    rotate = 0,
  ) => (
    <div key={key} style={{ position: "absolute", ...pos, display: "flex", alignItems: "flex-end", gap: cW * 0.012, height: cW * 0.16, transform: `rotate(${rotate}deg)` }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: cW * 0.016, height: `${h * 100}%`, borderRadius: 999, background: color }} />
      ))}
    </div>
  );

  // Shared ambient base (BACK layer) — soft wisps + one sparkle on every slide.
  const ambient: React.ReactNode[] = [
    wisp("w1", { left: "8%", top: "6.5%", width: "27%", height: cH * 0.024, background: "rgba(255,255,255,.40)" }),
    wisp("w2", { right: "-8%", top: "20%", width: "34%", height: cH * 0.03, background: "rgba(255,255,255,.30)" }),
    spark("s1", "9%", "84%", 0.05),
  ];

  type Motif = { back: React.ReactNode[]; front: React.ReactNode[] };

  const motif: Motif = (() => {
    switch (slideId) {
      // Voice journaling — sound waves, a soft orb, a "listening" pulse.
      case "01-voice":
        return {
          back: [
            glyph("o", "", { right: "5%", top: "3%", width: cW * 0.2, height: cW * 0.2, borderRadius: "50%", background: "radial-gradient(circle at 28% 21%, rgba(255,255,255,.72) 0 8%, transparent 24%), radial-gradient(circle at 75% 78%, rgba(80,132,120,.24), transparent 42%), #BAD4F2", boxShadow: "inset -14px -18px 28px rgba(156,205,177,.6), 0 22px 38px rgba(27,34,64,.18)" }, 0),
            pillRow("wave", { left: "7%", top: "40%" }, [0.35, 0.7, 1, 0.55, 0.85, 0.45, 0.75], "rgba(91,63,200,.45)"),
            spark("s2", "86%", "12%", 0.036),
          ],
          front: [chip("mic", "🎙 Just speak", { right: "6%", bottom: "12%" }, "#B49BE6", 5)],
        };
      // Quick notes + prompts — lightbulb, a prompt chip, quote marks.
      case "02-note":
        return {
          back: [
            glyph("bulb", "💡", { left: "7%", top: "34%" }, 0.075, -8),
            glyph("quote", "“", { left: "12%", bottom: "16%", color: "rgba(91,63,200,.35)" }, 0.14, 0),
            spark("s2", "84%", "13%", 0.034),
          ],
          front: [chip("prompt", "What's on your mind?", { right: "6%", top: "44%" }, "#F6A64B", 6)],
        };
      // Daily mood check-in — floating faces + an energy pill.
      case "03-mood-picker":
        return {
          back: [
            glyph("f1", "😊", { left: "8%", top: "9%" }, 0.07, -10),
            glyph("f2", "🥰", { right: "8%", top: "6%" }, 0.058, 8),
            glyph("f3", "😌", { left: "11%", top: "40%" }, 0.05, -6),
            spark("s2", "88%", "44%", 0.034),
          ],
          front: [chip("energy", "⚡ Energy: Medium", { right: "6%", top: "33%" }, "#F5C451", 5, "#5A3D00")],
        };
      // Insights — a mini bar chart + an upward-trend chip.
      case "04-mood-trends":
        return {
          back: [
            pillRow("bars", { right: "7%", top: "9%" }, [0.55, 1, 0.35], "rgba(245,196,81,.75)"),
            glyph("pct", "", { left: "8%", top: "9%", width: cW * 0.11, height: cW * 0.11, borderRadius: "50%", background: "conic-gradient(#5B3FC8 0 56%, rgba(180,155,230,.35) 56%)" }, 0),
            spark("s2", "84%", "44%", 0.036),
          ],
          front: [chip("trend", "↗ Trending up", { left: "6%", top: "33%" }, "#7FBF9B", -5)],
        };
      // Mood calendar — colored day squares peeking out.
      case "05-calendar": {
        const days = ["#F5C451", "#FF6FA3", "#7FBF9B", "#B49BE6", "#5B9BF5", "#F6A64B"];
        return {
          back: [
            <div key="grid" style={{ position: "absolute", left: "6%", top: "34%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: cW * 0.014, transform: "rotate(-6deg)" }}>
              {days.map((c, i) => (
                <div key={i} style={{ width: cW * 0.05, height: cW * 0.05, borderRadius: cW * 0.012, background: c, boxShadow: "0 6px 12px rgba(27,34,64,.14)" }} />
              ))}
            </div>,
            spark("s2", "86%", "44%", 0.034),
          ],
          front: [chip("month", "🗓 March · 13 entries", { right: "6%", top: "10%" }, "#B49BE6", 6)],
        };
      }
      // Gentle goals — target, checkmark, a soft deadline chip.
      case "06-goals":
        return {
          back: [
            glyph("target", "🎯", { left: "8%", top: "8%" }, 0.072, -8),
            glyph("check", "✓", { right: "12%", top: "40%", color: "#7FBF9B", fontWeight: 800 } as S, 0.07, 6, "rgba(127,191,155,.4)"),
            spark("s2", "10%", "42%", 0.036),
          ],
          front: [chip("deadline", "🗓 Gentle deadline", { right: "5%", top: "10%" }, "#B49BE6", 5)],
        };
      // Progress & streaks — flame, trophy, a level badge, a progress ring.
      case "07-progress":
        return {
          back: [
            glyph("flame", "🔥", { left: "8%", top: "9%" }, 0.07, -6),
            glyph("trophy", "🏆", { right: "7%", top: "7%" }, 0.06, 8),
            glyph("ring", "", { right: "8%", top: "35%", width: cW * 0.12, height: cW * 0.12, borderRadius: "50%", background: "conic-gradient(#7FBF9B 0 54%, rgba(180,155,230,.35) 54%)" }, 0),
            spark("s2", "86%", "46%", 0.034),
          ],
          front: [chip("level", "Level 4 · Goal Master", { left: "6%", top: "33%" }, "#F5C451", -5, "#5A3D00")],
        };
      // Privacy — lock, shield, an encrypted chip, biometric dots.
      case "08-lock":
        return {
          back: [
            glyph("lock", "🔒", { left: "8%", top: "34%" }, 0.075, -8),
            glyph("shield", "🛡", { right: "8%", top: "9%" }, 0.058, 8),
            spark("s2", "86%", "12%", 0.036),
          ],
          front: [chip("enc", "🔑 End-to-end encrypted", { right: "6%", top: "44%" }, "#5B3FC8", 6)],
        };
      default:
        return {
          back: [glyph("h", "♥", { left: "8%", top: "39%", color: "#FF6FA3" } as S, 0.052, -10, "rgba(255,111,163,.28)")],
          front: [],
        };
    }
  })();

  const nodes = layer === "front" ? motif.front : [...ambient, ...motif.back];
  return <>{nodes}</>;
}

// Front decoration overlay — draws the readable text chips above the device so
// their words are never clipped. Non-interactive so editing/selection still
// works through it. Only used by the dreamy-pastel theme.
function DreamyFront({ slideId, cW, cH }: { slideId: string; cW: number; cH: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 50 }}>
      <DreamyDecorations slideId={slideId} cW={cW} cH={cH} layer="front" />
    </div>
  );
}

function ScreenGuide({
  cW,
  cH,
  index,
  active,
}: {
  cW: number;
  cH: number;
  index: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        outline: `${active ? Math.max(4, cW * 0.003) : Math.max(2, cW * 0.0015)}px solid ${
          active ? "rgba(91, 124, 250, 0.95)" : "rgba(15, 23, 42, 0.22)"
        }`,
        outlineOffset: active ? -Math.max(4, cW * 0.003) : -Math.max(2, cW * 0.0015),
        boxShadow: active
          ? "inset 0 0 0 9999px rgba(91, 124, 250, 0.03)"
          : "inset 0 0 0 1px rgba(255, 255, 255, 0.22)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cW * 0.035,
          top: cH * 0.024,
          borderRadius: cW * 0.018,
          padding: `${cH * 0.006}px ${cW * 0.018}px`,
          background: active ? "rgba(91, 124, 250, 0.92)" : "rgba(15, 23, 42, 0.72)",
          color: "white",
          fontSize: Math.max(24, cW * 0.022),
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: 0,
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

function FeatureGraphicCanvas({
  slide,
  cW,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
}: {
  slide: Slide;
  cW: number;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
}) {
  // Every BellyClock palette gets the branded store banner. The regular slide
  // decor can differ by palette, but the product's feature graphic should never
  // fall back to the shared generic collage.
  if (theme.id.startsWith("bellyclock")) {
    return (
      <BellyClockFeatureGraphic
        slide={slide}
        cW={cW}
        theme={theme}
        locale={locale}
        appName={appName}
        appIcon={appIcon}
        editable={editable}
        edit={edit}
      />
    );
  }

  const screenshots = [slide.screenshot, slide.screenshotSecondary, slide.screenshotTertiary]
    .map((src) => resolveScreenshot(src, locale))
    .filter((src): src is string => !!src && !!img(src));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(145deg, ${theme.bgAlt} 0%, ${shade(theme.bgAlt, -8)} 62%, ${theme.accent} 185%)`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${cW * 0.06}px`,
        color: theme.fgAlt,
      }}
    >
      <Blob cW={cW} color={theme.accent} x={72} y={4} size={52} opacity={0.34} />
      <Blob cW={cW} color="#7FB8A8" x={44} y={72} size={42} opacity={0.2} />

      <div style={{ position: "relative", zIndex: 4, width: "42%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: cW * 0.016 }}>
          {appIcon && img(appIcon) ? (
            <img src={img(appIcon)} alt="" style={{ width: cW * 0.075, height: cW * 0.075, borderRadius: cW * 0.017 }} draggable={false} />
          ) : (
            <div
              aria-hidden
              style={{
                width: cW * 0.065,
                height: cW * 0.065,
                borderRadius: cW * 0.016,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(145deg, ${theme.accent}, #7FB8A8)`,
                color: "white",
                fontSize: cW * 0.032,
                fontWeight: 800,
                boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
              }}
            >
              {(appName || "A").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: cW * 0.04, fontWeight: 760, letterSpacing: "-0.03em" }}>{appName || "App"}</div>
        </div>
        <EditableText
          value={pickText(slide.headline, locale)}
          editable={editable}
          multiline
          onChange={edit?.onHeadlineChange}
          style={{
            maxWidth: cW * 0.37,
            fontFamily: "var(--font-instrument-serif), Georgia, serif",
            fontSize: cW * 0.047,
            color: theme.fgAlt,
            marginTop: cW * 0.022,
            lineHeight: 0.98,
            letterSpacing: "-0.025em",
          }}
        />
        <div style={{ marginTop: cW * 0.018, color: "rgba(255,255,255,0.56)", fontSize: cW * 0.014, fontWeight: 650, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {pickText(slide.label, locale) || "Your gut health companion"}
        </div>
      </div>

      {screenshots.length > 0 ? (
        <div style={{ position: "absolute", right: cW * 0.025, top: 0, width: cW * 0.54, height: "100%", zIndex: 3 }}>
          {screenshots.slice(0, 3).map((src, index) => {
            const positions = [
              { left: 0, top: cW * 0.09, rotate: 0, z: 1 },
              { left: cW * 0.145, top: cW * 0.025, rotate: 0, z: 3 },
              { left: cW * 0.29, top: cW * 0.085, rotate: 0, z: 2 },
            ];
            const position = positions[index];
            return (
              <div
                key={`${src}-${index}`}
                style={{
                  position: "absolute",
                  left: position.left,
                  top: position.top,
                  width: cW * 0.205,
                  height: cW * 0.44,
                  overflow: "hidden",
                  borderRadius: cW * 0.027,
                  border: `${Math.max(3, cW * 0.005)}px solid rgba(255,255,255,0.2)`,
                  background: "#FAF7F2",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.48)",
                  transform: position.rotate ? `rotate(${position.rotate}deg)` : undefined,
                  zIndex: position.z,
                }}
              >
                <img src={img(src)} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "top" }} />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function BellyClockFeatureGraphic({
  slide,
  cW,
  theme,
  locale,
  appName,
  appIcon,
  editable,
  edit,
}: {
  slide: Slide;
  cW: number;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  editable?: boolean;
  edit?: EditHandlers;
}) {
  const cH = CANVAS["feature-graphic"].h;
  const style = resolveStyle(theme);
  const headline = pickText(slide.headline, locale);
  const hasEmphasis = !!style.emphasis && /\*[^*]+\*/.test(headline);
  const phases = [
    ["digest", "#60A5FA"],
    ["glycogen", "#818CF8"],
    ["burn", "#A78BFA"],
    ["keto", "#E879F9"],
    ["renew", "#FB7185"],
    ["refed", "#86EFAC"],
  ] as const;
  const iconSrc = appIcon && img(appIcon) ? img(appIcon) : "";
  // Pull the clock into the copy column's orbit. The phase badges occupy the
  // former dead zone and make the diagram read as BellyClock physiology.
  const ringCenterX = cW * 0.705;
  const ringCenterY = cH * 0.51;
  const ringRadius = cH * 0.31;
  const circumference = 2 * Math.PI * ringRadius;
  const segment = circumference * 0.135;
  const gap = circumference - segment;

  function phaseGlyph(label: (typeof phases)[number][0], color: string) {
    const iconStroke = {
      fill: "none",
      stroke: color,
      strokeWidth: 2.2,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
    };
    switch (label) {
      case "digest":
        return (
          <>
            <path d="M-7 -10 V10 M-11 -10 V-3 Q-11 1 -7 1 Q-3 1 -3 -3 V-10 M7 -10 V10 M7 -10 Q14 -4 7 2" {...iconStroke} />
          </>
        );
      case "glycogen":
        return (
          <>
            <path d="M-11 -7 L0 -13 L11 -7 V7 L0 13 L-11 7 Z M0 -13 V13 M-11 -7 L0 0 L11 -7" {...iconStroke} />
          </>
        );
      case "burn":
        return <path d="M1 -14 C8 -6 11 -1 9 6 C7 13 -1 16 -7 11 C-14 5 -9 -5 -3 -10 C-4 -3 0 0 3 2 C5 -4 4 -8 1 -14 Z" {...iconStroke} />;
      case "keto":
        return <path d="M0 -14 C-8 -3 -12 2 -12 8 C-12 15 -6 20 0 20 C6 20 12 15 12 8 C12 2 8 -3 0 -14 Z M-5 9 Q0 13 6 8" {...iconStroke} />;
      case "renew":
        return (
          <>
            <circle cx="0" cy="0" r="11" {...iconStroke} />
            <path d="M0 -16 V-10 M0 10 V16 M-16 0 H-10 M10 0 H16 M-11 -11 L-7 -7 M7 7 L11 11 M11 -11 L7 -7 M-7 7 L-11 11 M-4 1 Q0 -4 5 0 Q1 6 -5 5" {...iconStroke} />
          </>
        );
      case "refed":
      default:
        return (
          <>
            <path d="M-13 3 Q0 16 13 3 M-11 4 H11 M0 3 V-8" {...iconStroke} />
            <path d="M0 -8 C2 -16 11 -17 14 -14 C12 -7 7 -4 0 -8 Z M0 -8 C-3 -15 -10 -15 -13 -12 C-10 -6 -6 -4 0 -8 Z" {...iconStroke} />
          </>
        );
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#0A0612",
        color: "#F7F0E5",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 17% 8%, rgba(124,58,237,.58) 0%, rgba(124,58,237,.18) 24%, transparent 48%), radial-gradient(circle at 75% 30%, rgba(232,121,249,.48) 0%, rgba(232,121,249,.14) 25%, transparent 52%), radial-gradient(circle at 90% 90%, rgba(34,211,238,.48) 0%, rgba(34,211,238,.12) 27%, transparent 54%)",
          filter: `blur(${cW * 0.018}px)`,
          transform: "scale(1.08)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: grainCss(0.045),
          backgroundRepeat: "repeat",
          mixBlendMode: "soft-light",
          opacity: 0.72,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: cW * 0.055,
          top: cH * 0.085,
          width: cW * 0.51,
          zIndex: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: cW * 0.012 }}>
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              draggable={false}
              style={{
                width: cW * 0.052,
                height: cW * 0.052,
                borderRadius: cW * 0.013,
                boxShadow: "0 10px 30px rgba(34,211,238,.22)",
              }}
            />
          ) : (
            <svg width={cW * 0.052} height={cW * 0.052} viewBox="0 0 54 54" aria-hidden>
              <circle cx="27" cy="27" r="21" fill="rgba(10,6,18,.66)" stroke="#67E8F9" strokeWidth="2.5" />
              <path d="M27 10 A17 17 0 0 1 43 27" fill="none" stroke="#E879F9" strokeWidth="4" strokeLinecap="round" />
              <path d="M27 44 A17 17 0 0 1 11 27" fill="none" stroke="#86EFAC" strokeWidth="4" strokeLinecap="round" />
              <path d="M27 27 L27 16 M27 27 L36 30" stroke="#F7F0E5" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="27" cy="27" r="2.7" fill="#F7F0E5" />
            </svg>
          )}
          <div
            style={{
              fontFamily: "var(--font-quicksand), Quicksand, sans-serif",
              fontSize: cW * 0.031,
              fontWeight: 700,
              letterSpacing: "-0.025em",
            }}
          >
            {appName || "BellyClock"}
          </div>
          <div style={{ width: cW * 0.055, height: 1, marginLeft: cW * 0.008, background: "rgba(247,240,229,.34)" }} />
          <div
            style={{
              color: "#86EFAC",
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: cW * 0.0095,
              fontWeight: 600,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
            }}
          >
            fasting, in context
          </div>
        </div>

        <div style={{ marginTop: cH * 0.095, maxWidth: cW * 0.48 }}>
          {hasEmphasis ? (
            <StyledHeadline
              value={headline}
              size={cW * 0.057}
              color="#F7F0E5"
              font={{ ...style.headline, family: style.headline.family }}
              emphasis={style.emphasis!}
              emphasisColor="#67E8F9"
            />
          ) : (
            <EditableText
              value={headline}
              editable={editable}
              multiline
              onChange={edit?.onHeadlineChange}
              style={{
                color: "#F7F0E5",
                fontFamily: style.headline.family,
                fontSize: cW * 0.057,
                fontWeight: style.headline.weight,
                lineHeight: 0.94,
                letterSpacing: "-0.035em",
              }}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: cW * 0.015,
            marginTop: cH * 0.105,
            color: "rgba(247,240,229,.72)",
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            fontSize: cW * 0.009,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {phases.map(([label, color]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: cW * 0.0045 }}>
              <span style={{ width: cW * 0.0065, height: cW * 0.0065, borderRadius: "50%", background: color, boxShadow: `0 0 12px ${color}` }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <svg
        aria-hidden
        width="100%"
        height="100%"
        viewBox={`0 0 ${cW} ${cH}`}
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
      >
        <g transform={`translate(${ringCenterX} ${ringCenterY}) rotate(-96)`}>
          <circle r={ringRadius + 29} fill="rgba(10,6,18,.48)" stroke="rgba(247,240,229,.12)" strokeWidth="1.5" strokeDasharray="3 8" />
          <circle r={ringRadius + 12} fill="none" stroke="rgba(247,240,229,.16)" strokeWidth="1.5" />
          {phases.map(([, color], index) => (
            <circle
              key={color}
              r={ringRadius}
              fill="none"
              stroke={color}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={`${segment} ${gap}`}
              strokeDashoffset={-(circumference / phases.length) * index}
              style={{ filter: `drop-shadow(0 0 11px ${color}88)` }}
            />
          ))}
          {Array.from({ length: 24 }, (_, index) => {
            const angle = (index / 24) * Math.PI * 2;
            const inner = ringRadius - (index % 6 === 0 ? 37 : 31);
            const outer = ringRadius - 22;
            return (
              <line
                key={index}
                x1={Math.cos(angle) * inner}
                y1={Math.sin(angle) * inner}
                x2={Math.cos(angle) * outer}
                y2={Math.sin(angle) * outer}
                stroke={index % 6 === 0 ? "#F7F0E5" : "rgba(247,240,229,.46)"}
                strokeWidth={index % 6 === 0 ? 2.5 : 1.2}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g transform={`translate(${ringCenterX} ${ringCenterY})`}>
          <circle r={ringRadius * 0.68} fill="rgba(18,10,30,.78)" stroke="rgba(103,232,249,.22)" strokeWidth="1.5" />
          <text x="0" y={-cH * 0.067} textAnchor="middle" fill="#86EFAC" fontFamily="var(--font-jetbrains-mono), 'JetBrains Mono', monospace" fontSize={cW * 0.0105} fontWeight="600" letterSpacing="2.4">CURRENT PHASE</text>
          <text x="0" y={cH * 0.026} textAnchor="middle" fill="#F7F0E5" fontFamily="var(--font-jetbrains-mono), 'JetBrains Mono', monospace" fontSize={cW * 0.052} fontWeight="600" letterSpacing="-2">16:08</text>
          <text x="0" y={cH * 0.09} textAnchor="middle" fill="#E879F9" fontFamily="var(--font-instrument-serif), Georgia, serif" fontSize={cW * 0.026} fontStyle="italic">fat burn</text>
          <path d={`M${-cW * 0.055} ${cH * 0.11} C${-cW * 0.018} ${cH * 0.125}, ${cW * 0.02} ${cH * 0.095}, ${cW * 0.062} ${cH * 0.112}`} fill="none" stroke="#E879F9" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        {phases.map(([label, color], index) => {
          const angle = ((-68 + index * 60) * Math.PI) / 180;
          const orbit = ringRadius + cH * 0.105;
          const x = ringCenterX + Math.cos(angle) * orbit;
          const y = ringCenterY + Math.sin(angle) * orbit;
          return (
            <g key={`${label}-badge`} transform={`translate(${x} ${y})`}>
              <circle r={cH * 0.049} fill="rgba(10,6,18,.86)" stroke={color} strokeWidth="1.7" style={{ filter: `drop-shadow(0 0 9px ${color}77)` }} />
              <g transform="scale(.72)">{phaseGlyph(label, color)}</g>
              <text
                x="0"
                y={cH * 0.078}
                textAnchor="middle"
                fill="rgba(247,240,229,.78)"
                fontFamily="var(--font-jetbrains-mono), 'JetBrains Mono', monospace"
                fontSize={cW * 0.0074}
                fontWeight="600"
                letterSpacing="1.1"
              >
                {label.toUpperCase()}
              </text>
            </g>
          );
        })}
        <path d={`M${cW * 0.548} ${cH * 0.13} C${cW * 0.59} ${cH * 0.09}, ${cW * 0.64} ${cH * 0.115}, ${cW * 0.67} ${cH * 0.17}`} fill="none" stroke="rgba(103,232,249,.62)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 7" />
        <text x={cW * 0.535} y={cH * 0.102} fill="rgba(247,240,229,.7)" fontFamily="var(--font-jetbrains-mono), 'JetBrains Mono', monospace" fontSize={cW * 0.0085} letterSpacing="1.6">YOUR BODY KEEPS TIME</text>
      </svg>
    </div>
  );
}

function SlideElements({
  slide,
  device,
  orientation,
  theme,
  locale,
  editable,
  edit,
  selectedElementId,
  previewScale,
  hideEmpty,
  screenX,
  slideIndex = 0,
  boundsW,
  boundsH,
  allowCrossScreen,
  enable3D,
}: {
  slide: Slide;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  editable?: boolean;
  edit?: EditHandlers;
  selectedElementId: ElementId | null;
  previewScale: number;
  hideEmpty?: boolean;
  screenX: number;
  /** Position in the deck — drives per-slide solid rotation. */
  slideIndex?: number;
  boundsW: number;
  boundsH: number;
  allowCrossScreen: boolean;
  enable3D: boolean;
}) {
  const screenshot = resolveScreenshot(slide.screenshot, locale);
  const screenshotSecondary = resolveScreenshot(slide.screenshotSecondary, locale);
  const { cW, cH, Frame, frameAspect, defaults } = getSlideGeometry(slide, device, orientation);
  const inverted = !!slide.inverted;
  // Device chrome overrides (cream bezel, ink outline, drop shadow) come from
  // the active theme rather than being baked into the frame components.
  const themeDevice = resolveStyle(theme).device;
  // Per-screen body finish, if this slide picked one.
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);
  const focusSources = (slide.focusElements || []).map((element) =>
    resolveScreenshot(element.source || slide.screenshot, locale),
  );
  const focusSourceKey = focusSources.join("\u0000");
  const [focusSourceAspects, setFocusSourceAspects] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let active = true;
    for (const source of focusSources) {
      if (!source || focusSourceAspects[source]) continue;
      const image = new window.Image();
      image.onload = () => {
        if (!active || !image.naturalWidth || !image.naturalHeight) return;
        setFocusSourceAspects((current) => ({
          ...current,
          [source]: image.naturalWidth / image.naturalHeight,
        }));
      };
      image.src = img(source);
    }
    return () => {
      active = false;
    };
    // The serialized source list is stable across unrelated canvas edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSourceKey]);

  function toGlobal(rect: Rect): Rect {
    return { ...rect, x: rect.x + screenX };
  }

  function toLocal(t: ElementTransform): ElementTransform {
    return { ...t, x: t.x - screenX };
  }

  function renderCaption() {
    if (!captionRect) return null;
    const saved = slide.transforms?.caption;
    const rotation = saved?.rotation ?? 0;
    const zIndex = saved?.zIndex ?? 4;
    const inner = (
      <Caption
        cW={cW}
        cH={cH}
        slide={slide}
        theme={theme}
        locale={locale}
        editable={editable}
        edit={edit}
        align={captionRect.align || "center"}
        inverted={inverted}
        slideIndex={slideIndex}
        onFocus={() => edit?.onSelectElement?.("caption")}
      />
    );
    return (
      <Movable
        rect={toGlobal(captionRect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            "caption",
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === "caption"}
        onSelect={() => edit?.onSelectElement?.("caption")}
        allowOverflow={allowCrossScreen}
      >
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
          {inner}
        </div>
      </Movable>
    );
  }

  function renderDevice(id: "device" | "deviceSecondary", rect: Rect, src: string, extraStyle?: React.CSSProperties) {
    const saved = slide.transforms?.[id];
    const deviceFrame = id === "deviceSecondary" ? slide.frameSecondary ?? slide.frame : slide.frame;
    const deviceFinish = frameColorById(resolveFrame(deviceFrame).color);
    const rotation = saved?.rotation ?? themeDevice.tilt ?? 0;
    const zIndex = saved?.zIndex ?? (id === "deviceSecondary" ? 2 : 3);
    return (
      <Movable
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            id,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        lockAspectRatio={frameAspect}
        zIndex={zIndex}
        allowOverflow
        selected={selectedElementId === id}
        onSelect={() => edit?.onSelectElement?.(id)}
      >
        <Device3D
          frame={deviceFrame}
          device={device}
          orientation={orientation}
          src={src}
          enable3D={enable3D}
          hideEmpty={hideEmpty}
          fallbackBody={themeDevice.bezel}
          fallbackEdge={themeDevice.bezelStroke}
        >
          <Frame
            src={src}
            hideEmpty={hideEmpty}
            bezel={deviceFinish?.body ?? themeDevice.bezel}
            bezelStroke={themeDevice.bezelStroke}
            bezelStrokeWidth={themeDevice.bezelStrokeWidth}
            style={{
              width: "100%",
              height: "100%",
              ...(themeDevice.shadow ? { filter: `drop-shadow(${themeDevice.shadow.split(",")[0]})` } : {}),
              ...extraStyle,
            }}
          />
        </Device3D>
      </Movable>
    );
  }

  function renderTextElement(textElement: TextElement, index: number) {
    const elementId = toTextElementId(textElement.id);
    const rect = textElement.transform;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 5 + index;
    const textColor = textElement.color || (inverted ? theme.fgAlt : theme.fg);
    return (
      <Movable
        key={textElement.id}
        rect={toGlobal(rect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({
              ...t,
              rotation: t.rotation ?? rotation,
              zIndex: t.zIndex ?? zIndex,
            }),
          )
        }
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              textElement.align === "right"
                ? "flex-end"
                : textElement.align === "left"
                  ? "flex-start"
                  : "center",
            padding: `${Math.min(cW, cH) * 0.012}px`,
          }}
        >
          <EditableText
            value={pickText(textElement.text, locale)}
            editable={editable}
            multiline
            onChange={(value) => edit?.onTextElementTextChange?.(textElement.id, value)}
            onFocus={() => edit?.onSelectElement?.(elementId)}
            placeholder="Text"
            style={{
              width: "100%",
              color: textColor,
              fontSize: textElement.fontSize ?? Math.min(cW, cH) * 0.06,
              fontWeight: textElement.fontWeight ?? 700,
              lineHeight: 1.05,
              textAlign: textElement.align ?? "center",
              textShadow: inverted ? "0 2px 18px rgba(0,0,0,0.22)" : "0 2px 18px rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </Movable>
    );
  }

  function renderFocusElement(element: ScreenshotFocusElement, index: number) {
    const elementId = toFocusElementId(element.id);
    const source = resolveScreenshot(element.source || slide.screenshot, locale);
    const rect = element.transform;
    const crop = element.crop;
    const rotation = rect.rotation ?? 0;
    const zIndex = rect.zIndex ?? 8 + index;
    const sourceAspect = focusSourceAspects[source] || frameAspect;
    const cropAspect = sourceAspect * (crop.width / Math.max(1, crop.height));
    const clipRadius = element.borderRadius ?? 34;
    const displayRect = {
      ...rect,
      height: rect.width / Math.max(0.01, cropAspect),
    };
    return (
      <Movable
        key={element.id}
        rect={toGlobal(displayRect)}
        boundsW={boundsW}
        boundsH={boundsH}
        editable={editable}
        previewScale={previewScale}
        rotation={rotation}
        onChange={(t) =>
          edit?.onElementChange?.(
            elementId,
            toLocal({ ...t, rotation: t.rotation ?? rotation, zIndex: t.zIndex ?? zIndex }),
          )
        }
        lockAspectRatio={cropAspect}
        zIndex={zIndex}
        selected={selectedElementId === elementId}
        onSelect={() => edit?.onSelectElement?.(elementId)}
        allowOverflow={allowCrossScreen}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: clipRadius,
            // Clip the backing to the same curve as the image. Without this the
            // wrapper stays a square box, so its corners (and the shadow's lit
            // edge) peek out past the rounded crop.
            overflow: "hidden",
            boxShadow: "0 18px 50px rgba(0,0,0,0.24)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              boxSizing: "border-box",
              borderRadius: clipRadius,
              border: `${element.borderWidth ?? 0}px solid ${element.accentColor || theme.accent}`,
              // Any fill must stop at the padding box, or it bleeds under the
              // border and squares off the corners.
              background: "transparent",
              backgroundClip: "padding-box",
              isolation: "isolate",
              // Chromium can skip rounded-corner clipping for a descendant that
              // lands on its own compositing layer — and this deck sits inside
              // transforms. An alpha-opaque mask costs nothing visually and
              // forces the corners to be cut in every case.
              WebkitMaskImage: "radial-gradient(#fff, #000)",
              maskImage: "radial-gradient(#fff, #000)",
            }}
          >
            {source && img(source) ? (
              <img
                src={img(source)}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  width: `${10000 / Math.max(1, crop.width)}%`,
                  height: "auto",
                  left: `${(-crop.x * 100) / Math.max(1, crop.width)}%`,
                  top: `${(-crop.y * 100) / Math.max(1, crop.height)}%`,
                  maxWidth: "none",
                  display: "block",
                }}
              />
            ) : null}
          </div>
        </div>
      </Movable>
    );
  }

  return (
    <>
      {secondaryRect &&
        renderDevice(
          "deviceSecondary",
          secondaryRect,
          screenshotSecondary || screenshot,
          { opacity: 0.85 },
        )}
      {deviceRect && renderDevice("device", deviceRect, screenshot)}
      {renderCaption()}
      {(slide.textElements || []).map(renderTextElement)}
      {(slide.focusElements || []).map(renderFocusElement)}
    </>
  );
}

// ---------- Movable wrapper ----------

// Fraction of an element's width/height that must remain inside the canvas
// when overflow is allowed. Keeps a graspable handle visible so the user can
// always drag the element back onto the canvas.
const MIN_VISIBLE_FRAC = 0.1;

function clampRect(
  r: { x: number; y: number; width: number; height: number },
  boundsW: number,
  boundsH: number,
  allowOverflow = false,
) {
  if (allowOverflow) {
    const width = r.width;
    const height = r.height;
    const minVisX = Math.max(8, width * MIN_VISIBLE_FRAC);
    const minVisY = Math.max(8, height * MIN_VISIBLE_FRAC);
    const x = Math.max(-(width - minVisX), Math.min(r.x, boundsW - minVisX));
    const y = Math.max(-(height - minVisY), Math.min(r.y, boundsH - minVisY));
    return { x, y, width, height };
  }
  const width = Math.min(r.width, boundsW);
  const height = Math.min(r.height, boundsH);
  const x = Math.max(0, Math.min(r.x, boundsW - width));
  const y = Math.max(0, Math.min(r.y, boundsH - height));
  return { x, y, width, height };
}

function Movable({
  rect,
  boundsW,
  boundsH,
  editable,
  previewScale,
  onChange,
  children,
  lockAspectRatio,
  zIndex,
  rotation = 0,
  allowOverflow = false,
  selected = false,
  onSelect,
}: {
  rect: Rect;
  boundsW: number;
  boundsH: number;
  editable?: boolean;
  previewScale: number;
  onChange: (t: ElementTransform) => void;
  children: React.ReactNode;
  lockAspectRatio?: number | boolean;
  zIndex?: number;
  rotation?: number;
  allowOverflow?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const rotationRef = React.useRef(rotation);
  React.useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  function startRotate(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();

    const root = e.currentTarget.closest(".rnd-editable") as HTMLElement | null;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = pointerAngle(e.clientX, e.clientY, centerX, centerY);
    const startRotation = rotationRef.current;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const nextRotation = normalizeRotation(
        startRotation + pointerAngle(event.clientX, event.clientY, centerX, centerY) - startAngle,
      );
      rotationRef.current = nextRotation;
      onChange({
        x: display.x,
        y: display.y,
        width: display.width,
        height: display.height,
        rotation: nextRotation,
        zIndex,
      });
    };
    const stopRotate = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopRotate);
      window.removeEventListener("pointercancel", stopRotate);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", stopRotate, { once: true });
    window.addEventListener("pointercancel", stopRotate, { once: true });
  }

  // Rotation lives on the inner wrapper so the Rnd's axis-aligned rect remains
  // the authoritative bounding box for drag/resize math. A bare mousedown
  // listener (no stopPropagation — that would prevent react-rnd from starting
  // a drag) marks the element as the current selection.
  const rotated = (
    <div
      onMouseDown={() => {
        if (editable) onSelect?.();
      }}
      style={{
        width: "100%",
        height: "100%",
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );

  // Non-editable (export/thumb) path: plain absolute-positioned div, no Rnd.
  if (!editable) {
    return (
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex,
        }}
      >
        {rotated}
      </div>
    );
  }

  const display = clampRect(rect, boundsW, boundsH, allowOverflow);
  const controlScale = Math.max(0.05, previewScale);

  return (
    <Rnd
      bounds={allowOverflow ? undefined : "parent"}
      scale={previewScale}
      lockAspectRatio={lockAspectRatio}
      position={{ x: display.x, y: display.y }}
      size={{ width: display.width, height: display.height }}
      onDragStart={() => onSelect?.()}
      onResizeStart={() => onSelect?.()}
      onDragStop={(_e, d) => {
        const next = clampRect(
          { x: d.x, y: d.y, width: display.width, height: display.height },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        const next = clampRect(
          {
            x: position.x,
            y: position.y,
            width: parseFloat(ref.style.width),
            height: parseFloat(ref.style.height),
          },
          boundsW,
          boundsH,
          allowOverflow,
        );
        onChange({ ...next, rotation, zIndex });
      }}
      style={{ zIndex }}
      resizeHandleStyles={handleStyle}
      className={selected ? "rnd-editable rnd-selected" : "rnd-editable"}
    >
      {rotated}
      <button
        type="button"
        className="rnd-rotate-handle"
        style={{
          right: -14 / controlScale,
          top: -14 / controlScale,
          width: 28 / controlScale,
          height: 28 / controlScale,
        }}
        onPointerDown={startRotate}
        title="Rotate"
        aria-label="Rotate element"
      >
        <RotateCw style={{ width: 14 / controlScale, height: 14 / controlScale }} />
      </button>
    </Rnd>
  );
}

function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
}

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next);
}

// Subtle resize handles (visible only on hover via globals.css).
const handleSize = 14;
const handleStyle: Record<string, React.CSSProperties> = {
  top: { height: handleSize },
  right: { width: handleSize },
  bottom: { height: handleSize },
  left: { width: handleSize },
  topRight: { width: handleSize, height: handleSize },
  bottomRight: { width: handleSize, height: handleSize },
  bottomLeft: { width: handleSize, height: handleSize },
  topLeft: { width: handleSize, height: handleSize },
};
