"use client";

import * as React from "react";
import { Download, FileArchive, Folder, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEVICE_LABEL } from "@/lib/constants";
import {
  availableDecks,
  downloadName,
  planExport,
  sizesFor,
  type ExportSelection,
  type ExportUnit,
} from "@/lib/export";
import { pickText } from "@/lib/locale";
import type { Device, Orientation, ProjectState, Slide } from "@/lib/types";

// How many rows the "You'll get" tree shows before it collapses into a count.
const PREVIEW_ROWS = 5;

type Scope = "screen" | "groups";

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
  const [devices, setDevices] = React.useState<Device[]>([state.device]);
  const [locales, setLocales] = React.useState<string[]>([state.locale]);

  // Each visit starts from what you're looking at, never from last time's
  // picks — a stale selection is how you ship the wrong language. Keyed on the
  // slide *id* so an unrelated edit re-rendering the slide can't wipe a
  // half-made selection out from under the user.
  const activeSlideId = activeSlide?.id ?? null;
  React.useEffect(() => {
    if (!open) return;
    setScope(activeSlideId ? "screen" : "groups");
    setDevices([state.device]);
    setLocales([state.locale]);
  }, [open, activeSlideId, state.device, state.locale]);

  const selection = React.useMemo<ExportSelection>(() => {
    if (scope === "screen") {
      // No slide open means there is no "this screen" to export. Falling back
      // to the whole deck here would quietly hand over 8 PNGs when the dialog
      // promised one.
      if (!activeSlide) return { locales, picks: [] };
      return {
        locales,
        picks: [
          {
            device: state.device,
            sizes: sizesFor(state.device, orientation),
            slideIds: [activeSlide.id],
          },
        ],
      };
    }
    return {
      locales,
      picks: decks
        .filter((deck) => devices.includes(deck.device))
        .map((deck) => ({ device: deck.device, sizes: sizesFor(deck.device, orientation) })),
    };
  }, [activeSlide, decks, devices, locales, orientation, scope, state.device]);

  const units = React.useMemo(
    () => (selection.picks.length ? planExport(state, selection) : []),
    [selection, state],
  );
  const filename = React.useMemo(
    () => (units.length ? downloadName(state.appId, state.appName, selection, units) : ""),
    [selection, state.appId, state.appName, units],
  );
  const preview = React.useMemo(() => previewRows(units), [units]);

  const multiLocale = state.locales.length > 1;
  const deckCount = (state.slidesByDevice[state.device] || []).length;
  const screenName = activeSlide
    ? pickText(activeSlide.label, state.locale) || pickText(activeSlide.headline, state.locale)
    : "";

  function toggleDevice(device: Device) {
    setDevices((current) =>
      current.includes(device)
        ? current.filter((entry) => entry !== device)
        : [...current, device],
    );
  }

  function toggleLocale(locale: string) {
    setLocales((current) =>
      current.includes(locale)
        ? current.filter((entry) => entry !== locale)
        : state.locales.filter((entry) => current.includes(entry) || entry === locale),
    );
  }

  const allLocales = locales.length === state.locales.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      {/* Scrolls rather than overflowing on short viewports; the base
          DialogContent already caps the width at max-w-lg. */}
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Only what you pick here goes in the download — language sets stay separate.
          </DialogDescription>
        </DialogHeader>

        <Section label="Screens">
          <div className="space-y-1">
            <Radio
              active={scope === "screen"}
              title="This screen only"
              meta={
                activeSlide
                  ? [firstLine(screenName) || "Untitled", DEVICE_LABEL[state.device]]
                      .filter(Boolean)
                      .join(" · ")
                  : "Nothing selected"
              }
              disabled={!activeSlide}
              onClick={() => setScope("screen")}
            />
            <Radio
              active={scope === "groups"}
              title="Whole screenshot groups"
              meta={`${DEVICE_LABEL[state.device]} has ${deckCount} screen${deckCount === 1 ? "" : "s"}`}
              onClick={() => setScope("groups")}
            />
          </div>

          {/* pl-[34px] indents the chips to the radio titles: 10px button
              padding + 14px radio dot + 10px gap. */}
          {scope === "groups" && (
            <div className="flex flex-wrap gap-1.5 pl-[34px] pt-0.5">
              {decks.map((deck) => (
                <Chip
                  key={deck.device}
                  active={devices.includes(deck.device)}
                  onClick={() => toggleDevice(deck.device)}
                >
                  {DEVICE_LABEL[deck.device]}
                  <span className="opacity-60">{deck.count}</span>
                </Chip>
              ))}
            </div>
          )}
        </Section>

        {multiLocale && (
          <Section
            label="Languages"
            action={
              <button
                type="button"
                className="text-[10px] font-medium text-primary hover:underline"
                onClick={() => setLocales(allLocales ? [state.locale] : [...state.locales])}
              >
                {allLocales ? `Only ${state.locale.toUpperCase()}` : "Select all"}
              </button>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {state.locales.map((locale) => (
                <Chip
                  key={locale}
                  active={locales.includes(locale)}
                  onClick={() => toggleLocale(locale)}
                >
                  {locale.toUpperCase()}
                </Chip>
              ))}
            </div>
          </Section>
        )}

        <Section label="You'll get">
          {units.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground">
              {scope === "screen"
                ? "No screen is open — pick whole screenshot groups instead."
                : locales.length === 0
                  ? "Pick at least one language."
                  : "Pick at least one screenshot group."}
            </p>
          ) : (
            <div className="space-y-1 rounded-md border bg-muted/30 p-2.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                {units.length === 1 ? (
                  <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FileArchive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate" title={filename}>
                  {filename}
                </span>
              </div>
              {preview.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-1.5 pl-[18px] text-muted-foreground"
                >
                  {row.isFolder ? (
                    <Folder className="h-3 w-3 shrink-0" />
                  ) : (
                    <ImageIcon className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{row.label}</span>
                  {row.meta && <span className="ml-auto shrink-0 pl-2 opacity-70">{row.meta}</span>}
                </div>
              ))}
              {preview.hidden > 0 && (
                <div className="pl-[18px] text-muted-foreground opacity-70">
                  +{preview.hidden} more
                </div>
              )}
            </div>
          )}
        </Section>

        <div className="-mx-6 -mb-6 mt-1 flex items-center justify-between gap-3 border-t px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {units.length === 0
              ? "Nothing selected"
              : `${units.length} PNG${units.length === 1 ? "" : "s"}`}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onExport(selection)} disabled={busy || !units.length}>
              <Download />
              {busy ? "Exporting…" : units.length === 1 ? "Export PNG" : "Export"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Radio({
  active,
  title,
  meta,
  disabled,
  onClick,
}: {
  active: boolean;
  title: string;
  meta: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 ${
        active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          active ? "border-primary" : "border-muted-foreground/50"
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </span>
      <span className="shrink-0 text-xs font-medium">{title}</span>
      <span className="min-w-0 flex-1 truncate text-right text-[11px] text-muted-foreground">
        {meta}
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-input bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * What the download looks like once unzipped. Folders win over files: when the
 * export fans out across languages or decks the folder names are the useful
 * information, and when it doesn't there are no folders to show, which is the
 * whole point of collapsing them.
 */
function previewRows(units: ExportUnit[]): {
  rows: { label: string; meta?: string; isFolder: boolean }[];
  hidden: number;
} {
  if (units.length < 2) return { rows: [], hidden: 0 };

  const folders = new Map<string, number>();
  const files: string[] = [];
  for (const unit of units) {
    const parts = unit.path.split("/");
    // Every path shares the bundle folder; show what sits inside it.
    const inner = parts.slice(1, -1).join("/");
    if (inner) folders.set(inner, (folders.get(inner) || 0) + 1);
    else files.push(parts[parts.length - 1]);
  }

  if (folders.size > 0) {
    const entries = [...folders.entries()];
    return {
      rows: entries.slice(0, PREVIEW_ROWS).map(([label, count]) => ({
        label: `${label}/`,
        meta: `${count} PNG${count === 1 ? "" : "s"}`,
        isFolder: true,
      })),
      hidden: Math.max(0, entries.length - PREVIEW_ROWS),
    };
  }

  return {
    rows: files.slice(0, PREVIEW_ROWS).map((label) => ({ label, isFolder: false })),
    hidden: Math.max(0, files.length - PREVIEW_ROWS),
  };
}

function firstLine(text: string): string {
  return text.split("\n")[0].trim();
}
