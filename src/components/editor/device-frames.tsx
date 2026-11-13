"use client";
import * as React from "react";
import { PHONE_SCREEN } from "@/lib/constants";
import { img } from "@/lib/image-cache";
import type { ScreenCrop } from "@/lib/types";

type FrameProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  /** When true, hide EmptySlot placeholder (so it doesn't bake into exports). */
  hideEmpty?: boolean;
  /** Theme overrides for device chrome — see ThemeDevice in lib/types.ts.
   *  `bezel` repaints the body (e.g. cream instead of black) and `bezelStroke`
   *  rings it in an ink outline. The iPhone frame is a fixed PNG mockup and
   *  therefore ignores both. */
  bezel?: string;
  bezelStroke?: string;
  bezelStrokeWidth?: number;
  crop?: ScreenCrop;
  fit?: "cover" | "contain";
  matte?: string;
};

function croppedImageStyle(crop?: ScreenCrop, fit: "cover" | "contain" = "cover"): React.CSSProperties {
  const clamp = (value: number | undefined) => Math.min(0.45, Math.max(0, value ?? 0));
  const top = clamp(crop?.top);
  const right = clamp(crop?.right);
  const bottom = clamp(crop?.bottom);
  const left = clamp(crop?.left);
  const visibleW = Math.max(0.1, 1 - left - right);
  const visibleH = Math.max(0.1, 1 - top - bottom);
  return {
    display: "block",
    position: "absolute",
    width: `${100 / visibleW}%`,
    height: `${100 / visibleH}%`,
    left: `${(-left * 100) / visibleW}%`,
    top: `${(-top * 100) / visibleH}%`,
    objectFit: fit,
    objectPosition: "top",
    maxWidth: "none",
  };
}

/** Body fill + outline for the CSS-drawn frames. */
function bezelStyle(
  bezel: string | undefined,
  stroke: string | undefined,
  width: number | undefined,
  fallbackBg: string,
  fallbackShadow: string,
): React.CSSProperties {
  const background = bezel || fallbackBg;
  if (!stroke) return { background, boxShadow: fallbackShadow };
  const w = width ?? 3;
  return { background, boxShadow: `inset 0 0 0 ${w}px ${stroke}, ${fallbackShadow}` };
}

// iPhone — uses pre-measured mockup.png overlay
export function Phone({ src, alt = "", style, hideEmpty, crop, fit, matte }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: "1022 / 2082", ...style }}>
      <img
        src={img("/mockup.png")}
        alt=""
        style={{ display: "block", width: "100%", height: "100%" }}
        draggable={false}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          overflow: "hidden",
          left: `${PHONE_SCREEN.L}%`,
          top: `${PHONE_SCREEN.T}%`,
          width: `${PHONE_SCREEN.W}%`,
          height: `${PHONE_SCREEN.H}%`,
          borderRadius: `${PHONE_SCREEN.RX}% / ${PHONE_SCREEN.RY}%`,
          background: matte || "#111",
        }}
      >
        {resolved ? (
          <img
            src={resolved}
            alt={alt}
            style={croppedImageStyle(crop, fit)}
            draggable={false}
          />
        ) : hideEmpty ? null : (
          <EmptySlot />
        )}
      </div>
      {/* Dynamic Island. mockup.png draws one, but the screen layer above
          covers it — invisible on iOS captures (black there anyway), missing
          on Android captures ported to the iPhone deck. Geometry is the real
          iPhone Pro island (126×37pt, 11pt from the top of a 393pt screen). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          zIndex: 11,
          left: "50%",
          top: `${(72 / 2082) * 100}%`,
          width: `${(294 / 1022) * 100}%`,
          height: `${(86 / 2082) * 100}%`,
          transform: "translateX(-50%)",
          borderRadius: 999,
          background: "#000",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "11%",
            top: "50%",
            width: "13%",
            aspectRatio: "1",
            transform: "translateY(-50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 34%, #3a4a6e 0 14%, #141a2a 42%, #07080c 72%)",
          }}
        />
      </div>
    </div>
  );
}

function DuoFrame({ src, alt = "", style, hideEmpty, crop, fit, matte, bezel, bezelStroke, bezelStrokeWidth, inner = false, landscape = false }: FrameProps & { inner?: boolean; landscape?: boolean }) {
  const resolved = img(src);
  const ratio = inner ? (landscape ? "2853 / 2007" : "2007 / 2853") : (landscape ? "2034 / 1398" : "1398 / 2034");
  return (
    <div style={{ position: "relative", aspectRatio: ratio, ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: inner ? "6% / 4.5%" : "8% / 5.5%", ...bezelStyle(bezel, bezelStroke, bezelStrokeWidth, "linear-gradient(135deg, #454748, #17191a)", "0 18px 55px rgba(0,0,0,.3), inset 0 0 0 2px #9a9d9b"), overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: inner ? "1.65% 1.25%" : "1.9% 1.5%", borderRadius: inner ? "5% / 3.8%" : "7% / 4.5%", overflow: "hidden", background: matte || "#121413" }}>
          {resolved ? <img src={resolved} alt={alt} style={croppedImageStyle(crop, fit)} draggable={false} /> : hideEmpty ? null : <EmptySlot />}
          {inner && <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: "49.82%", width: "0.36%", background: "linear-gradient(90deg, rgba(0,0,0,.23), rgba(255,255,255,.13), rgba(0,0,0,.2))", pointerEvents: "none" }} />}
        </div>
        <div aria-hidden style={{ position: "absolute", top: inner ? "2.4%" : "2.5%", left: "50%", transform: "translateX(-50%)", width: inner ? "0.75%" : "7%", height: inner ? "0.52%" : "1.05%", borderRadius: 99, background: "#101112", boxShadow: "0 0 0 1px rgba(255,255,255,.1)" }} />
      </div>
    </div>
  );
}

export const DuoOuter = (props: FrameProps) => <DuoFrame {...props} />;
export const DuoInner = (props: FrameProps) => <DuoFrame {...props} inner />;
export const DuoOuterLandscape = (props: FrameProps) => <DuoFrame {...props} landscape />;
export const DuoInnerLandscape = (props: FrameProps) => <DuoFrame {...props} inner landscape />;

export function AndroidPhone({ src, alt = "", style, hideEmpty, bezel, bezelStroke, bezelStrokeWidth, crop, fit, matte }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: "9 / 19.5", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "8% / 4%",
          ...bezelStyle(bezel, bezelStroke, bezelStrokeWidth,
            "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.55)"),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "3%",
            height: "1.4%",
            borderRadius: "50%",
            background: "#0d0d0f",
            border: "1px solid rgba(255,255,255,0.06)",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2%",
            width: "93%",
            height: "96%",
            borderRadius: "5.5% / 2.6%",
            overflow: "hidden",
            background: matte || "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt={alt}
              style={croppedImageStyle(crop, fit)}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

export function AndroidTabletP({ src, alt = "", style, hideEmpty, bezel, bezelStroke, bezelStrokeWidth, crop }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: "5 / 8", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "4.5% / 2.8%",
          ...bezelStyle(bezel, bezelStroke, bezelStrokeWidth,
            "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)"),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1.4%",
            height: "0.88%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "3.5%",
            top: "2.2%",
            width: "93%",
            height: "95.6%",
            borderRadius: "2.5% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt={alt}
              style={croppedImageStyle(crop)}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

export function AndroidTabletL({ src, alt = "", style, hideEmpty, bezel, bezelStroke, bezelStrokeWidth, crop }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: "8 / 5", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "2.8% / 4.5%",
          ...bezelStyle(bezel, bezelStroke, bezelStrokeWidth,
            "linear-gradient(160deg, #2a2a2e 0%, #18181b 100%)",
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)"),
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "1.2%",
            top: "50%",
            transform: "translateY(-50%)",
            width: "0.88%",
            height: "1.4%",
            borderRadius: "50%",
            background: "#0d0d0f",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "2.2%",
            top: "3.5%",
            width: "95.6%",
            height: "93%",
            borderRadius: "1.6% / 2.5%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt={alt}
              style={croppedImageStyle(crop)}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

export function IPad({ src, alt = "", style, hideEmpty, bezel, bezelStroke, bezelStrokeWidth, crop }: FrameProps) {
  const resolved = img(src);
  return (
    <div style={{ position: "relative", aspectRatio: "770 / 1000", ...style }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "5% / 3.6%",
          position: "relative",
          overflow: "hidden",
          ...bezelStyle(bezel, bezelStroke, bezelStrokeWidth,
            "linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%)",
            "inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.6)"),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "1.2%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "0.9%",
            height: "0.65%",
            borderRadius: "50%",
            background: "#111113",
            zIndex: 20,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "4%",
            top: "2.8%",
            width: "92%",
            height: "94.4%",
            borderRadius: "2.2% / 1.6%",
            overflow: "hidden",
            background: "#000",
          }}
        >
          {resolved ? (
            <img
              src={resolved}
              alt={alt}
              style={croppedImageStyle(crop)}
              draggable={false}
            />
          ) : hideEmpty ? null : (
            <EmptySlot />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.4)",
        fontSize: "min(2vw, 14px)",
        background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
        textAlign: "center",
        padding: "4%",
      }}
    >
      Drop a screenshot here
    </div>
  );
}
