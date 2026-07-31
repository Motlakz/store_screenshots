"use client";
import * as React from "react";
import { edgeWidthFor, frameColorById, resolveFrame } from "@/lib/frames";
import type { SlideFrame } from "@/lib/types";

type Props = {
  frame: SlideFrame | undefined;
  /** Falls back to this when the slide picks no finish. */
  fallbackEdge?: string;
  children: React.ReactNode;
};

/**
 * Wraps a device frame in a CSS 3D perspective and draws an extruded side so a
 * turned phone reads as a solid object rather than a skewed rectangle.
 *
 * In "flat" mode this renders nothing but its children, so existing decks are
 * byte-for-byte unaffected.
 */
export function Device3D({ frame, fallbackEdge, children }: Props) {
  const f = resolveFrame(frame);
  if (f.style !== "3d" || (f.rotateX === 0 && f.rotateY === 0)) {
    // No tilt to apply — skip the extra layers entirely.
    return <>{children}</>;
  }

  const finish = frameColorById(f.color);
  const edgeColor = finish?.edge ?? fallbackEdge ?? "#141416";
  // Percent of width; the edge grows as the phone turns away from front-on.
  const edgePct = edgeWidthFor(f.rotateY, 100);
  const turningRight = f.rotateY > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        perspective: `${f.depth}px`,
        // Let the edge and face share a 3D space rather than flattening.
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${f.rotateX}deg) rotateY(${f.rotateY}deg)`,
        }}
      >
        {/* Body edge — sits behind the face on whichever side is turning away. */}
        {edgePct > 0.2 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "1.5%",
              height: "97%",
              width: `${edgePct}%`,
              [turningRight ? "left" : "right"]: 0,
              background: `linear-gradient(${turningRight ? 90 : 270}deg, ${edgeColor} 0%, ${edgeColor}CC 100%)`,
              borderRadius: "12%/2%",
              transform: `translateZ(-1px) translateX(${turningRight ? "-" : ""}${edgePct * 0.5}%)`,
              filter: "brightness(0.85)",
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
