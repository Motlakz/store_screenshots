// Device frame presentation: flat (the original look) or a CSS-3D perspective
// tilt with a visible body edge, plus selectable body colors.
//
// This is real CSS 3D (perspective + rotateX/rotateY), not a rendered 3D model.
// That keeps it asset-free and themeable — no licensed device meshes — and it
// rasterizes through html-to-image the same way the flat frame does.

import type { Device, SlideFrame } from "./types";

export type FrameColor = {
  id: string;
  label: string;
  /** Body/bezel fill. */
  body: string;
  /** Darker edge used for the extruded side in 3D. */
  edge: string;
  /** Platforms this finish belongs to; omitted means "both". */
  platforms?: Array<"ios" | "android">;
};

export const FRAME_COLORS: FrameColor[] = [
  { id: "graphite", label: "Graphite", body: "#2A2A2E", edge: "#141416" },
  { id: "midnight", label: "Midnight", body: "#1B1B1D", edge: "#0B0B0C" },
  { id: "titanium", label: "Natural Titanium", body: "#C7C3BC", edge: "#8E8A83", platforms: ["ios"] },
  { id: "white-titanium", label: "White Titanium", body: "#F2F1ED", edge: "#C2C0BA", platforms: ["ios"] },
  { id: "desert", label: "Desert Titanium", body: "#BFA48F", edge: "#8A7362", platforms: ["ios"] },
  { id: "porcelain", label: "Porcelain", body: "#EDE9E3", edge: "#BDB8B1", platforms: ["android"] },
  { id: "bay", label: "Bay Blue", body: "#4A6E8A", edge: "#2C4557", platforms: ["android"] },
  { id: "hazel", label: "Hazel", body: "#8A7B6A", edge: "#5B5044", platforms: ["android"] },
  { id: "cream", label: "Cream Ink", body: "#F4E6CC", edge: "#C9B48F" },
];

export function frameColorById(id: string | undefined): FrameColor | null {
  if (!id) return null;
  return FRAME_COLORS.find((c) => c.id === id) ?? null;
}

export function frameColorsFor(device: Device): FrameColor[] {
  const platform: "ios" | "android" =
    device === "iphone" || device === "ipad" ? "ios" : "android";
  return FRAME_COLORS.filter((c) => !c.platforms || c.platforms.includes(platform));
}

/** Figma-style angle presets so a usable tilt is one click away. */
export const ANGLE_PRESETS: Array<{ id: string; label: string; rotateX: number; rotateY: number }> = [
  { id: "front", label: "Front", rotateX: 0, rotateY: 0 },
  { id: "left", label: "Turn left", rotateX: 0, rotateY: -22 },
  { id: "right", label: "Turn right", rotateX: 0, rotateY: 22 },
  { id: "hero", label: "Hero", rotateX: 8, rotateY: -16 },
  { id: "showcase", label: "Showcase", rotateX: -6, rotateY: 18 },
  { id: "lay", label: "Lay back", rotateX: 26, rotateY: -8 },
];

export const DEFAULT_FRAME: Required<Pick<SlideFrame, "style" | "rotateX" | "rotateY" | "depth">> = {
  style: "flat",
  rotateX: 0,
  rotateY: 0,
  depth: 2200,
};

export function resolveFrame(frame: SlideFrame | undefined) {
  return {
    style: frame?.style ?? DEFAULT_FRAME.style,
    color: frame?.color,
    rotateX: clampAngle(frame?.rotateX ?? DEFAULT_FRAME.rotateX),
    rotateY: clampAngle(frame?.rotateY ?? DEFAULT_FRAME.rotateY),
    depth: frame?.depth ?? DEFAULT_FRAME.depth,
  };
}

/** Past ~60° the frame reads as broken rather than tilted. */
export function clampAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return Math.max(-60, Math.min(60, deg));
}

/**
 * Thickness of the extruded side, as a fraction of device width. Scales with
 * how far the phone is turned, so a front-on device shows no edge at all.
 */
export function edgeWidthFor(rotateY: number, width: number): number {
  return Math.min(width * 0.06, (Math.abs(rotateY) / 60) * width * 0.06);
}
