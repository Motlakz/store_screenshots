"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ANGLE_PRESETS, clampAngle, clampThickness, frameColorsFor, resolveFrame } from "@/lib/frames";
import type { Device, DeviceFrameStyle, Slide, SlideFrame } from "@/lib/types";

const THEME_FINISH = "__theme__";

type Props = {
  slide: Slide;
  device: Device;
  target?: "primary" | "secondary";
  onChange: (patch: Partial<Slide>) => void;
};

/** Flat vs 3D frame, body finish, and Figma-style angle control. */
export function FrameControls({ slide, device, target = "primary", onChange }: Props) {
  const sourceFrame = target === "secondary" ? slide.frameSecondary ?? slide.frame : slide.frame;
  const f = resolveFrame(sourceFrame);
  const colors = frameColorsFor(device);
  const is3d = f.style === "3d";

  function patch(next: Partial<SlideFrame>) {
    if (target === "secondary") {
      onChange({ frameSecondary: { ...sourceFrame, ...next } });
      return;
    }
    onChange({ frame: { ...slide.frame, ...next } });
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <Label className="text-xs font-semibold">
          {target === "secondary" ? "Second device frame" : "Device frame"}
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Flat uses the original mockup. 3D renders a real WebGL device model.
        </p>
      </div>

      <Tabs
        value={f.style}
        onValueChange={(v) => {
          const style = v as DeviceFrameStyle;
          patch(
            style === "3d" && f.rotateX === 0 && f.rotateY === 0
              ? { style, rotateX: 8, rotateY: -18 }
              : { style },
          );
        }}
      >
        <TabsList className="h-8 w-full p-0.5">
          <TabsTrigger value="flat" className="h-7 flex-1 text-xs">
            Flat
          </TabsTrigger>
          <TabsTrigger value="3d" className="h-7 flex-1 text-xs">
            3D
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Finish</Label>
        <Select
          value={f.color ?? THEME_FINISH}
          onValueChange={(v) => patch({ color: v === THEME_FINISH ? undefined : v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={THEME_FINISH}>Follow theme</SelectItem>
            {colors.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{ background: c.body, borderColor: c.edge }}
                  />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {is3d && (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Angle presets</Label>
            <div className="grid grid-cols-3 gap-1">
              {ANGLE_PRESETS.map((p) => {
                const active = f.rotateX === p.rotateX && f.rotateY === p.rotateY;
                return (
                  <Button
                    key={p.id}
                    type="button"
                    variant={active ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 px-1 text-[10px]"
                    onClick={() => patch({ rotateX: p.rotateX, rotateY: p.rotateY })}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <AngleSlider
            label="Turn (Y)"
            value={f.rotateY}
            onChange={(v) => patch({ rotateY: clampAngle(v) })}
          />
          <AngleSlider
            label="Tilt (X)"
            value={f.rotateX}
            onChange={(v) => patch({ rotateX: clampAngle(v) })}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Body thickness</Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">{f.thickness}px</span>
            </div>
            <input
              type="range"
              min={12}
              max={72}
              step={2}
              value={f.thickness}
              className="w-full"
              onChange={(e) => patch({ thickness: clampThickness(Number(e.target.value)) })}
              aria-label="Device body thickness"
            />
            <p className="text-[10px] text-muted-foreground">
              Controls the physical depth of the metal body.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Lens depth</Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">{f.depth}</span>
            </div>
            <input
              type="range"
              min={800}
              max={4000}
              step={100}
              value={f.depth}
              className="w-full"
              onChange={(e) => patch({ depth: Number(e.target.value) })}
              aria-label="Perspective depth"
            />
            <p className="text-[10px] text-muted-foreground">
              Lower is a wider lens with stronger perspective.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-[11px]"
            onClick={() => patch({ rotateX: 0, rotateY: 0 })}
          >
            Reset angle
          </Button>
        </>
      )}
    </div>
  );
}

function AngleSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[11px] tabular-nums text-muted-foreground">{value}°</span>
      </div>
      <input
        type="range"
        min={-60}
        max={60}
        step={1}
        value={value}
        className="w-full"
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}
