"use client";
import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKGROUND_KIND_HINT,
  BACKGROUND_KIND_LABEL,
  addBackgroundColor,
  backgroundColors,
  convertBackground,
  emphasisWithDefaults,
  removeBackgroundColor,
  setBackgroundColor,
} from "@/lib/theme-edit";
import { backgroundCss } from "@/lib/style";
import type { Theme, ThemeBackground } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  appId: string;
  /** True once this app owns its copy — false means the first edit clones it. */
  owned: boolean;
  onPatch: (patch: Partial<Theme>) => void;
};

const KINDS: ThemeBackground["kind"][] = ["solid", "gradient", "solids"];

export function PaletteDialog({ open, onOpenChange, theme, appId, owned, onPatch }: Props) {
  const background: ThemeBackground = theme.background ?? { kind: "solid", color: theme.bg };
  const colors = backgroundColors(background, theme.bg);
  // Themes without an emphasis block get an inherited one, so the highlight
  // color is editable everywhere rather than only in the editorial styles.
  const emphasis = emphasisWithDefaults(theme);

  function patchBackground(next: ThemeBackground) {
    // Keep `bg` in step so the swatch and any legacy fallback stay truthful.
    onPatch({ background: next, bg: backgroundColors(next, theme.bg)[0] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Palette — {theme.name}</DialogTitle>
          <DialogDescription>
            {owned ? (
              <>
                Saved in{" "}
                <span className="font-mono text-[11px]">projects/{appId}.json</span>. Only{" "}
                this app uses it.
              </>
            ) : (
              <>
                This is a shared starter. Your first edit copies it into{" "}
                <span className="font-mono text-[11px]">projects/{appId}.json</span> so no
                other app changes.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Live preview of the resulting canvas background */}
        <div
          aria-hidden
          className="flex h-20 items-center justify-center rounded-md border text-sm font-semibold"
          style={{
            background: backgroundCss(theme, false, 0),
            color: theme.fg,
          }}
        >
          {background.kind === "solids" ? "screen 1 of the rotation" : "background preview"}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Background</Label>
          <Select
            value={background.kind}
            onValueChange={(k) =>
              patchBackground(convertBackground(background, k as ThemeBackground["kind"], theme.bg))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {BACKGROUND_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {BACKGROUND_KIND_HINT[background.kind]}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              {background.kind === "solids" ? "Screen colors" : "Colors"}
            </Label>
            {background.kind !== "solid" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  patchBackground(addBackgroundColor(background, colors[colors.length - 1]))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            {colors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] text-muted-foreground">
                  {background.kind === "solids" ? `screen ${i + 1}` : `stop ${i + 1}`}
                </span>
                <Input
                  type="color"
                  value={color}
                  className="h-8 w-14 shrink-0 p-1"
                  onChange={(e) => patchBackground(setBackgroundColor(background, i, e.target.value))}
                />
                <Input
                  value={color}
                  className="h-8 flex-1 font-mono text-xs"
                  onChange={(e) => patchBackground(setBackgroundColor(background, i, e.target.value))}
                />
                {background.kind !== "solid" && colors.length > (background.kind === "solids" ? 1 : 2) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => patchBackground(removeBackgroundColor(background, i))}
                    aria-label={`Remove color ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {background.kind === "gradient" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Angle</Label>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {background.angle ?? 180}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={background.angle ?? 180}
              className="w-full"
              onChange={(e) => patchBackground({ ...background, angle: Number(e.target.value) })}
              aria-label="Gradient angle"
            />
          </div>
        )}

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <Label className="text-xs font-semibold">Ink</Label>
          <p className="text-[11px] text-muted-foreground">
            {background.kind === "solids"
              ? "Each screen picks the readable one automatically — light blocks take the dark ink."
              : "“On dark” is used normally; “on light” is used by inverted screens."}
          </p>
          <SwatchRow label="On dark" value={theme.fg} onChange={(v) => onPatch({ fg: v })} />
          <SwatchRow label="On light" value={theme.fgAlt} onChange={(v) => onPatch({ fgAlt: v })} />
          <SwatchRow label="Accent" value={theme.accent} onChange={(v) => onPatch({ accent: v })} />
          <SwatchRow label="Muted" value={theme.muted} onChange={(v) => onPatch({ muted: v })} />
          <SwatchRow
            label="Highlight"
            value={emphasis.color}
            onChange={(v) => onPatch({ emphasis: { ...emphasis, color: v } })}
          />
          <p className="text-[11px] text-muted-foreground">
            Applies to the <span className="font-mono">*wrapped*</span> phrase in a headline —
            write <span className="font-mono">One idea *per slide*</span>. Headline text itself
            takes whichever ink reads better on each screen.
          </p>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SwatchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <Input
        type="color"
        value={value}
        className="h-8 w-14 shrink-0 p-1"
        onChange={(e) => onChange(e.target.value)}
      />
      <Input
        value={value}
        className="h-8 flex-1 font-mono text-xs"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
