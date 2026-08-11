"use client";

import * as React from "react";
import { Check, Download, Images, Languages, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEVICE_LABEL } from "@/lib/constants";
import {
  availableDecks,
  planExport,
  sizesFor,
  type ExportSelection,
} from "@/lib/export";
import type { Device, Orientation, ProjectState, Slide } from "@/lib/types";

type Scope = "screen" | "group" | "groups";
type LocaleScope = "one" | "all";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ProjectState;
  orientation: Orientation;
  activeSlide: Slide | null;
  busy: boolean;
  onExport: (selection: ExportSelection) => void;
};

export function ExportDialog({
  open,
  onOpenChange,
  state,
  orientation,
  activeSlide,
  busy,
  onExport,
}: Props) {
  const decks = React.useMemo(() => availableDecks(state), [state]);
  const [scope, setScope] = React.useState<Scope>("screen");
  const [localeScope, setLocaleScope] = React.useState<LocaleScope>("one");
  const [singleLocale, setSingleLocale] = React.useState(state.locale);
  const [selectedDevices, setSelectedDevices] = React.useState<Device[]>([state.device]);

  React.useEffect(() => {
    if (!open) return;
    setScope("screen");
    setLocaleScope("one");
    setSingleLocale(state.locale);
    setSelectedDevices([state.device]);
  }, [open, state.device, state.locale]);

  const selection = React.useMemo<ExportSelection>(() => {
    const locales = localeScope === "all" ? [...state.locales] : [singleLocale];
    if (scope === "screen") {
      return {
        locales,
        picks: [{
          device: state.device,
          sizes: sizesFor(state.device, orientation),
          ...(activeSlide ? { slideIds: [activeSlide.id] } : {}),
        }],
      };
    }
    const devices = scope === "group"
      ? [state.device]
      : decks.map((deck) => deck.device).filter((device) => selectedDevices.includes(device));
    return {
      locales,
      picks: devices.map((device) => ({
        device,
        sizes: sizesFor(device, orientation),
      })),
    };
  }, [activeSlide, decks, localeScope, orientation, scope, selectedDevices, singleLocale, state]);

  const units = React.useMemo(() => planExport(state, selection), [selection, state]);
  const canExport = units.length > 0 && selection.picks.length > 0;
  const currentLabel = state.device === "feature-graphic" ? "feature graphic" : "screen";

  function toggleDevice(device: Device) {
    setSelectedDevices((current) =>
      current.includes(device)
        ? current.filter((entry) => entry !== device)
        : [...current, device],
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose what to export</DialogTitle>
          <DialogDescription>
            Nothing is bulk-exported until you choose it. The default is the current {currentLabel} in one language.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</div>
            <Choice
              active={scope === "screen"}
              icon={<Square />}
              title={state.device === "feature-graphic" ? "Single feature graphic" : "Current screen"}
              detail={activeSlide ? "Only the screen open in the editor" : "The current screen"}
              onClick={() => setScope("screen")}
            />
            <Choice
              active={scope === "group"}
              icon={<Images />}
              title="Current screenshot group"
              detail={`${DEVICE_LABEL[state.device]} · ${(state.slidesByDevice[state.device] || []).length} screen${(state.slidesByDevice[state.device] || []).length === 1 ? "" : "s"}`}
              onClick={() => setScope("group")}
            />
            <Choice
              active={scope === "groups"}
              icon={<Images />}
              title="Choose screenshot groups"
              detail="Export one or more device decks"
              onClick={() => setScope("groups")}
            />

            {scope === "groups" && (
              <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/20 p-2">
                {decks.map((deck) => {
                  const selected = selectedDevices.includes(deck.device);
                  return (
                    <button
                      key={deck.device}
                      type="button"
                      onClick={() => toggleDevice(deck.device)}
                      className={`flex items-center justify-between rounded border px-2.5 py-2 text-left text-xs transition-colors ${
                        selected ? "border-primary bg-primary/10 text-foreground" : "border-input bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{DEVICE_LABEL[deck.device]}</span>
                      <span className="flex items-center gap-1">
                        {deck.count}
                        {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</div>
            <Choice
              active={localeScope === "one"}
              icon={<Languages />}
              title="One language"
              detail="Export only the language selected below"
              onClick={() => setLocaleScope("one")}
            />
            {localeScope === "one" && (
              <Select value={singleLocale} onValueChange={setSingleLocale}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.locales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {locale.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Choice
              active={localeScope === "all"}
              icon={<Languages />}
              title="All languages"
              detail={state.locales.map((locale) => locale.toUpperCase()).join(" · ")}
              onClick={() => setLocaleScope("all")}
            />

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">
                {units.length} PNG{units.length === 1 ? "" : "s"}
              </div>
              <div className="mt-1 leading-relaxed">
                {units.length === 1
                  ? "Downloads directly as a PNG."
                  : "Downloads as a ZIP, grouped by language first and then screenshot group."}
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onExport(selection)}
            disabled={busy || !canExport}
          >
            <Download />
            {busy ? "Exporting…" : units.length === 1 ? "Export PNG" : `Export ${units.length} PNGs`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Choice({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-input bg-background hover:bg-muted/50"
      }`}
    >
      <span className={`mt-0.5 ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-medium">
          {title}
          {active && <Check className="h-4 w-4 text-primary" />}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
