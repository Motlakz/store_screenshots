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
import { toTextElementId } from "@/lib/elements";
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
      <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} />
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
            <SlideBackground slide={slide} cW={cW} cH={cH} theme={theme} slideIndex={index} />
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
}: {
  slide: Slide;
  cW: number;
  cH: number;
  theme: Theme;
  slideIndex?: number;
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
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${theme.bgAlt} 0%, ${shade(theme.bgAlt, -10)} 50%, ${theme.accent} 200%)`,
        display: "flex",
        alignItems: "center",
        padding: `0 ${cW * 0.06}px`,
        color: theme.fgAlt,
      }}
    >
      <Blob cW={cW} color={theme.accent} x={70} y={20} size={50} opacity={0.45} />
      <div style={{ display: "flex", alignItems: "center", gap: cW * 0.03, zIndex: 2 }}>
        {appIcon && img(appIcon) ? (
          <img
            src={img(appIcon)}
            alt=""
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
            draggable={false}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: cW * 0.13,
              height: cW * 0.13,
              borderRadius: cW * 0.022,
              background: `linear-gradient(135deg, ${theme.accent}55, ${theme.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.fgAlt,
              fontWeight: 800,
              fontSize: cW * 0.07,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            {(appName || "A").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: cW * 0.06, fontWeight: 800, lineHeight: 1.05 }}>{appName || "App"}</div>
          <EditableText
            value={pickText(slide.headline, locale)}
            editable={editable}
            multiline
            onChange={edit?.onHeadlineChange}
            style={{
              fontSize: cW * 0.028,
              color: "rgba(255,255,255,0.85)",
              marginTop: cW * 0.012,
              lineHeight: 1.25,
            }}
          />
        </div>
      </div>
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
}) {
  const screenshot = resolveScreenshot(slide.screenshot, locale);
  const screenshotSecondary = resolveScreenshot(slide.screenshotSecondary, locale);
  const { cW, cH, Frame, frameAspect, defaults } = getSlideGeometry(slide, device, orientation);
  const inverted = !!slide.inverted;
  // Device chrome overrides (cream bezel, ink outline, drop shadow) come from
  // the active theme rather than being baked into the frame components.
  const themeDevice = resolveStyle(theme).device;
  // Per-screen body finish, if this slide picked one.
  const slideFinish = frameColorById(resolveFrame(slide.frame).color);
  const captionRect = rectFor("caption", slide, defaults);
  const deviceRect = rectFor("device", slide, defaults);
  const secondaryRect = rectFor("deviceSecondary", slide, defaults);

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
    const rotation = saved?.rotation ?? 0;
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
        <Device3D frame={slide.frame} fallbackEdge={themeDevice.bezelStroke}>
          <Frame
            src={src}
            hideEmpty={hideEmpty}
            bezel={slideFinish?.body ?? themeDevice.bezel}
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
