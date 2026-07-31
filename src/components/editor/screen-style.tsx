"use client";
import * as React from "react";
import { Check, RotateCcw } from "lucide-react";
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
import { FONT_CHOICES, backgroundCss, fontById, fontIdForFamily } from "@/lib/style";
import { getRecentColors, getRecentFonts, rememberColor, rememberFont } from "@/lib/recents";
import type { Slide, Theme, ThemeBackground } from "@/lib/types";

type Props = {
  slide: Slide;
  theme: Theme;
  slideIndex: number;
  onChange: (patch: Partial<Slide>) => void;
};

const THEME_FONT = "__theme__";

/**
 * Per-screen background and typography, with cross-app recents.
 *
 * Recents are the point: they live in localStorage rather than any project
 * file, so a color or face used on one app is one click away while editing
 * another — no copying hexes between views.
 */
export function ScreenStyle({ slide, theme, slideIndex, onChange }: Props) {
  const [recentColors, setRecentColors] = React.useState<string[]>([]);
  const [recentFonts, setRecentFonts] = React.useState<string[]>([]);

  // localStorage is client-only, so read after mount.
  React.useEffect(() => {
    setRecentColors(getRecentColors());
    setRecentFonts(getRecentFonts());
  }, []);

  const override = slide.background;
  const usingTheme = !override;
  const currentColor =
    override?.kind === "solid"
      ? override.color
      : override?.kind === "solids"
        ? override.colors[0]
        : override?.kind === "gradient"
          ? firstStopColor(override.stops[0])
          : themeSurface(theme);

  function applyColor(color: string) {
    onChange({ background: { kind: "solid", color } });
    setRecentColors(rememberColor(color));
  }

  function applyGradient(from: string, to: string) {
    onChange({ background: { kind: "gradient", stops: [`${from} 0%`, `${to} 100%`], angle: 165 } });
    setRecentColors(rememberColor(from));
  }

  function applyFont(slot: "headlineFont" | "labelFont", id: string) {
    if (id === THEME_FONT) {
      onChange({ [slot]: undefined } as Partial<Slide>);
      return;
    }
    onChange({ [slot]: id } as Partial<Slide>);
    setRecentFonts(rememberFont(id));
  }

  const themeHeadlineFont = fontIdForFamily(theme.headline?.family);
  const themeLabelFont = fontIdForFamily(theme.label?.family);

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <Label className="text-xs font-semibold">Screen style</Label>
        <p className="text-[11px] text-muted-foreground">
          Overrides this screen only. Recents are shared across every app.
        </p>
      </div>

      {/* ---- Background ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Background</Label>
          {!usingTheme && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px]"
              onClick={() => onChange({ background: undefined })}
              title="Fall back to the app's theme background"
            >
              <RotateCcw className="h-3 w-3" />
              Use theme
            </Button>
          )}
        </div>

        <div
          aria-hidden
          className="flex h-10 items-center justify-center rounded border text-[10px] font-medium"
          style={{
            background: backgroundCss(theme, !!slide.inverted, slideIndex, override),
            color: theme.fg,
          }}
        >
          {usingTheme ? "following theme" : "custom"}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={currentColor}
            className="h-8 w-12 shrink-0 p-1"
            onChange={(e) => applyColor(e.target.value)}
            aria-label="Screen background color"
          />
          <Input
            value={currentColor}
            className="h-8 flex-1 font-mono text-xs"
            onChange={(e) => applyColor(e.target.value)}
            aria-label="Screen background hex"
          />
        </div>
      </div>

      {/* ---- Recent colors ---- */}
      {recentColors.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Recent colors</Label>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((color) => {
              const active = color.toLowerCase() === currentColor.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  title={`${color} — click to apply, shift-click to blend into a gradient`}
                  aria-label={`Apply ${color}`}
                  onClick={(e) => {
                    if (e.shiftKey) applyGradient(currentColor, color);
                    else applyColor(color);
                  }}
                  className="relative h-6 w-6 rounded border transition-transform hover:scale-110"
                  style={{ background: color }}
                >
                  {active && (
                    <Check
                      className="absolute inset-0 m-auto h-3.5 w-3.5"
                      style={{ color: isDarkish(color) ? "#fff" : "#111" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Shift-click a swatch to blend it with the current color.
          </p>
        </div>
      )}

      {/* ---- Typography ---- */}
      <div className="space-y-1.5 border-t pt-2.5">
        <FontRow
          label="Headline"
          value={slide.headlineFont ?? THEME_FONT}
          themeFontLabel={fontById(themeHeadlineFont ?? "")?.label}
          onChange={(id) => applyFont("headlineFont", id)}
        />
        <FontRow
          label="Label"
          value={slide.labelFont ?? THEME_FONT}
          themeFontLabel={fontById(themeLabelFont ?? "")?.label}
          onChange={(id) => applyFont("labelFont", id)}
        />
      </div>

      {recentFonts.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Recent fonts</Label>
          <div className="flex flex-wrap gap-1">
            {recentFonts.map((id) => {
              const font = fontById(id);
              if (!font) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyFont("headlineFont", id)}
                  title={`Apply ${font.label} to the headline`}
                  className="rounded border px-2 py-1 text-[11px] transition-colors hover:bg-accent"
                  style={{ fontFamily: font.family }}
                >
                  {font.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FontRow({
  label,
  value,
  themeFontLabel,
  onChange,
}: {
  label: string;
  value: string;
  themeFontLabel?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label} font</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={THEME_FONT}>
            Theme default{themeFontLabel ? ` (${themeFontLabel})` : ""}
          </SelectItem>
          {FONT_CHOICES.map((font) => (
            <SelectItem key={font.id} value={font.id}>
              <span style={{ fontFamily: font.family }}>{font.label}</span>
              {font.note && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">{font.note}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function firstStopColor(stop: string | undefined): string {
  const m = stop ? /#[0-9a-fA-F]{3,6}/.exec(stop) : null;
  return m ? m[0] : "#ffffff";
}

function themeSurface(theme: Theme): string {
  const bg = theme.background;
  if (!bg) return theme.bg;
  if (bg.kind === "solid") return bg.color;
  if (bg.kind === "solids") return bg.colors[0] ?? theme.bg;
  return firstStopColor(bg.stops[0]);
}

function isDarkish(hex: string): boolean {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return false;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.55;
}

export type { ThemeBackground };
