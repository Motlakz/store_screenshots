"use client";
import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyMode,
  readStoredMode,
  resolveMode,
  storeMode,
  type ThemeMode,
} from "@/lib/theme-mode";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICON: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const LABEL: Record<ThemeMode, string> = {
  system: "Following your system theme",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * Cycles system → light → dark. The mode lives in localStorage and is applied
 * to <html> before paint by the init script in layout.tsx; this button only
 * ever changes it afterwards.
 */
export function ThemeToggle({ disabled }: { disabled?: boolean }) {
  const [mode, setMode] = React.useState<ThemeMode>("system");
  // The server has no way to know the stored choice, so the icon can't be
  // rendered until we're on the client. Ghost placeholder keeps the toolbar
  // from reflowing when it arrives.
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMode(readStoredMode());
    setMounted(true);
  }, []);

  // Only "system" tracks the OS; an explicit choice should survive sunset.
  React.useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyMode("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function cycle() {
    const next = NEXT_MODE[mode];
    setMode(next);
    storeMode(next);
    applyMode(next);
  }

  if (!mounted) {
    return <div aria-hidden className="h-8 w-8 shrink-0" />;
  }

  const Icon = ICON[mode];
  const resolved = resolveMode(mode);
  const hint = mode === "system" ? `${LABEL.system} (${resolved})` : LABEL[mode];

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={cycle}
      disabled={disabled}
      title={`${hint} — click for ${LABEL[NEXT_MODE[mode]].toLowerCase()}`}
      aria-label={`Theme: ${hint}. Switch to ${NEXT_MODE[mode]}.`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
