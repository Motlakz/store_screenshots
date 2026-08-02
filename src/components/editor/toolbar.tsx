"use client";
import * as React from "react";
// Icon vocabulary is deliberately split: curved arrows (Undo2/Redo2) mean
// history and nothing else, so save mode and "reset to defaults" — which used
// to borrow the same circular-arrow glyph — now read as what they are.
import {
  AlertTriangle,
  Check,
  Cloud,
  Download,
  Eraser,
  Hand,
  Palette,
  Redo2,
  Save,
  UnfoldHorizontal,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEVICE_LABEL,
  resolveThemes,
} from "@/lib/constants";
import { detectPlatform } from "@/lib/defaults";
import { slugifyAppId, type AppSummary, type EditorMode } from "@/lib/apps";
import { PaletteDialog } from "./palette-dialog";
import { ThemeToggle } from "./theme-toggle";
import type { Device, SaveMode, Theme } from "@/lib/types";

// Sentinel value for the "New app…" row inside the app <Select>.
const NEW_APP_VALUE = "__new_app__";

type Props = {
  apps: AppSummary[];
  /** Where projects live — changes what the save and reset copy can promise. */
  mode: EditorMode;
  appId: string;
  onSwitchApp: (id: string) => void;
  onCreateApp: (name: string) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  onDeleteApp: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  switching: boolean;
  themeId: string;
  setThemeId: (v: string) => void;
  appThemes?: Theme[];
  /** Fully resolved active theme (shared starter merged with app overrides). */
  activeTheme: Theme;
  themeOwned: boolean;
  onPatchTheme: (patch: Partial<Theme>) => void;
  appName: string;
  setAppName: (v: string) => void;
  connectedCanvas: boolean;
  setConnectedCanvas: (v: boolean) => void;
  locale: string;
  setLocale: (v: string) => void;
  locales: string[];
  device: Device;
  setDevice: (v: Device) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onResetAll: () => void;
  onResetDevice: () => void;
  exporting: string | null;
  savedAt: number | null;
  saveError: string | null;
  saveMode: SaveMode;
  setSaveMode: (mode: SaveMode) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
  busy: boolean;
};

export function Toolbar(props: Props) {
  const hosted = props.mode === "hosted";
  // Where a save actually lands, for every tooltip that needs to say so.
  const store = hosted ? "this browser" : "the project file";
  const platform = detectPlatform(props.device);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [newAppOpen, setNewAppOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [newAppName, setNewAppName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [appSelectOpen, setAppSelectOpen] = React.useState(false);
  // The app queued for deletion — also what keeps the confirm dialog open.
  const [pendingDelete, setPendingDelete] = React.useState<AppSummary | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Nothing to fall back to if you remove the last one, so the X disappears.
  const canRemoveApps = props.apps.length > 1;

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await props.onDeleteApp(pendingDelete.id);
    setDeleting(false);
    if (result.ok) setPendingDelete(null);
    else setDeleteError(result.error);
  }

  const themeOptions = React.useMemo(
    () => Object.values(resolveThemes(props.appThemes)),
    [props.appThemes],
  );

  async function submitNewApp() {
    const name = newAppName.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError(null);
    const result = await props.onCreateApp(name);
    setCreating(false);
    if (result.ok) {
      setNewAppOpen(false);
      setNewAppName("");
    } else {
      setCreateError(result.error);
    }
  }

  // Track last device per platform so iOS/Android tabs preserve user's choice.
  const lastByPlatform = React.useRef<{ ios: Device; android: Device }>({
    ios: platform === "ios" ? props.device : "iphone",
    android: platform === "android" ? props.device : "android",
  });
  React.useEffect(() => {
    lastByPlatform.current[platform] = props.device;
  }, [platform, props.device]);

  const showLocale = props.locales.length > 1;

  const deviceLabel = DEVICE_LABEL[props.device];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-card/40 px-4 py-2">
      <Select
        open={appSelectOpen}
        onOpenChange={setAppSelectOpen}
        value={props.appId}
        onValueChange={(v) => {
          if (props.busy || props.switching) return;
          if (v === NEW_APP_VALUE) {
            setCreateError(null);
            setNewAppOpen(true);
            return;
          }
          props.onSwitchApp(v);
        }}
        disabled={props.busy || props.switching}
      >
        <SelectTrigger
          className="h-8 w-44 text-xs font-semibold"
          title="Active app — each app keeps its own screens, screenshots, and palette"
          aria-label="Active app"
        >
          <SelectValue placeholder="App" />
        </SelectTrigger>
        <SelectContent>
          {props.apps.map((app) => (
            <SelectItem
              key={app.id}
              value={app.id}
              className="group/app"
              action={
                canRemoveApps ? (
                  // Not a <button>: Radix commits the row on pointer-up, so
                  // this has to swallow pointer events rather than sit inside
                  // them. role/tabIndex/onKeyDown restore what that costs.
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${app.appName}`}
                    title={`Remove ${app.appName}`}
                    className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover/app:opacity-60 hover:!opacity-100"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAppSelectOpen(false);
                      setDeleteError(null);
                      setPendingDelete(app);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      setAppSelectOpen(false);
                      setDeleteError(null);
                      setPendingDelete(app);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                ) : undefined
              }
            >
              {app.appName}
            </SelectItem>
          ))}
          <SelectItem value={NEW_APP_VALUE}>+ New app…</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={props.appName}
        onChange={(e) => props.setAppName(e.target.value)}
        className="h-8 w-36 border-dashed text-sm font-semibold focus-visible:border-input focus-visible:border-solid focus-visible:bg-background"
        placeholder="App name"
        aria-label="App name"
        title="Display name used on the canvas (click to edit)"
        disabled={props.busy || props.switching}
      />

      <Select
        value={props.themeId}
        onValueChange={props.setThemeId}
        disabled={props.busy || props.switching}
      >
        <SelectTrigger
          className="h-8 w-40 text-xs"
          title="Palette for this app only"
          aria-label="Theme"
        >
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          {themeOptions.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full border"
                  style={{ background: theme.bg, borderColor: theme.accent }}
                />
                {theme.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => setPaletteOpen(true)}
        title="Edit this app's background and colors"
        aria-label="Edit palette"
        disabled={props.busy || props.switching}
      >
        <Palette className="h-4 w-4" />
      </Button>

      <span aria-hidden className="mx-1 h-5 w-px bg-border" />

      <Button
        type="button"
        variant={props.connectedCanvas ? "secondary" : "outline"}
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs"
        onClick={() => props.setConnectedCanvas(!props.connectedCanvas)}
        aria-pressed={props.connectedCanvas}
        title={
          props.connectedCanvas
            ? "Connected canvas enabled"
            : "Isolated screens; turn on to let elements cross screen edges"
        }
        disabled={props.busy}
      >
        <UnfoldHorizontal className="h-3.5 w-3.5" />
        {props.connectedCanvas ? "Connected" : "Isolated"}
      </Button>

      <span aria-hidden className="mx-1 h-5 w-px bg-border" />

      <Tabs
        value={platform}
        onValueChange={(p) => {
          if (props.busy) return;
          const next = p === "ios" ? lastByPlatform.current.ios : lastByPlatform.current.android;
          props.setDevice(next);
        }}
      >
        <TabsList className="h-8 p-0.5">
          <TabsTrigger value="ios" className="h-7 px-3 text-xs" disabled={props.busy}>
            iOS
          </TabsTrigger>
          <TabsTrigger value="android" className="h-7 px-3 text-xs" disabled={props.busy}>
            Android
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Select
        value={props.device}
        onValueChange={(v) => props.setDevice(v as Device)}
        disabled={props.busy}
      >
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Device">{deviceLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {platform === "ios" ? (
            <>
              <SelectItem value="iphone">{DEVICE_LABEL.iphone}</SelectItem>
              <SelectItem value="ipad">{DEVICE_LABEL.ipad}</SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="android">{DEVICE_LABEL.android}</SelectItem>
              <SelectItem value="android-7">{DEVICE_LABEL["android-7"]}</SelectItem>
              <SelectItem value="android-10">{DEVICE_LABEL["android-10"]}</SelectItem>
              <SelectItem value="feature-graphic">{DEVICE_LABEL["feature-graphic"]}</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {/* Portrait/landscape now lives in the inspector's Device frame panel,
          next to the other controls that change how the device is presented. */}

      {showLocale && (
        <Select value={props.locale} onValueChange={props.setLocale} disabled={props.busy}>
          <SelectTrigger className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {props.locales.map((l) => (
              <SelectItem key={l} value={l}>
                {l.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={props.onUndo}
            disabled={!props.canUndo || props.busy}
            title="Undo (⌘/Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={props.onRedo}
            disabled={!props.canRedo || props.busy}
            title="Redo (⌘/Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <span aria-hidden className="h-5 w-px bg-border" />

        <SaveStatus
          savedAt={props.savedAt}
          saveError={props.saveError}
          dirty={props.dirty}
          saving={props.saving}
          saveMode={props.saveMode}
          store={store}
        />

        <Button
          type="button"
          variant={props.saveMode === "auto" ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={() => props.setSaveMode(props.saveMode === "auto" ? "manual" : "auto")}
          aria-pressed={props.saveMode === "auto"}
          title={
            props.saveMode === "auto"
              ? `Auto-save on — every edit is written to ${store}`
              : "Manual save — nothing is written until you click Save"
          }
          disabled={props.busy}
        >
          {props.saveMode === "auto" ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Hand className="h-3.5 w-3.5" />
          )}
          {props.saveMode === "auto" ? "Auto" : "Manual"}
        </Button>

        {props.saveMode === "manual" && (
          <Button
            type="button"
            variant={props.dirty ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={props.onSave}
            disabled={!props.dirty || props.saving || props.busy}
            title={`Save this app's deck to ${store} (⌘/Ctrl+S)`}
          >
            <Save className="h-3.5 w-3.5" />
            {props.saving ? "Saving…" : "Save"}
          </Button>
        )}

        <span aria-hidden className="h-5 w-px bg-border" />
        {/* Editor chrome only — the slide palette is the Theme select above. */}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setResetOpen(true)}
          title="Reset screens to defaults"
          aria-label="Reset"
          disabled={props.busy}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          onClick={props.onExport}
          disabled={!!props.exporting}
          size="sm"
          className="h-8"
          title="Export every size × locale for this device as a zip"
        >
          <Download className="h-4 w-4" />
          {props.exporting ? `Exporting ${props.exporting}` : "Export bundle"}
        </Button>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset {props.appName} to defaults?</DialogTitle>
            <DialogDescription>
              Choose whether to reset just <span className="font-medium">{deviceLabel}</span> or every device deck for this app. Canvas edits and copy will be lost. Other apps are untouched, and{" "}
              {hosted ? (
                <>your uploaded screenshots stay in this browser.</>
              ) : (
                <>
                  the files in{" "}
                  <span className="font-mono text-[11px]">public/screenshots/{props.appId}/</span>{" "}
                  stay on disk.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setResetOpen(false);
                props.onResetDevice();
              }}
            >
              Reset {deviceLabel} only
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setResetOpen(false);
                props.onResetAll();
              }}
            >
              Reset all devices
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaletteDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        theme={props.activeTheme}
        appId={props.appId}
        owned={props.themeOwned}
        onPatch={props.onPatchTheme}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (open || deleting) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {pendingDelete?.appName}?</DialogTitle>
            <DialogDescription>
              {hosted ? (
                <>
                  Deletes this app&apos;s deck from this browser — its screens, copy, and palettes.
                  Screenshots you uploaded stay in browser storage, and other apps are untouched.
                </>
              ) : (
                <>
                  Deletes{" "}
                  <span className="font-mono text-[11px]">projects/{pendingDelete?.id}.json</span> —
                  this app&apos;s screens, copy, and palettes. The images in{" "}
                  <span className="font-mono text-[11px]">
                    public/screenshots/{pendingDelete?.id}/
                  </span>{" "}
                  are kept, so nothing irreplaceable is lost. Other apps are untouched.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-[11px] text-destructive">{deleteError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Removing…" : "Remove app"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={newAppOpen}
        onOpenChange={(open) => {
          setNewAppOpen(open);
          if (!open) {
            setNewAppName("");
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New app</DialogTitle>
            <DialogDescription>
              {hosted ? (
                <>
                  Creates a blank deck stored in this browser under{" "}
                  <span className="font-mono text-[11px]">{slugPreview(newAppName)}</span>. It
                  isn&apos;t sent anywhere, and clearing site data removes it. Nothing from the
                  current app carries over.
                </>
              ) : (
                <>
                  Creates{" "}
                  <span className="font-mono text-[11px]">
                    projects/{slugPreview(newAppName)}.json
                  </span>{" "}
                  and{" "}
                  <span className="font-mono text-[11px]">
                    public/screenshots/{slugPreview(newAppName)}/
                  </span>{" "}
                  with a blank deck. Nothing from the current app carries over.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newAppName}
              autoFocus
              placeholder="BellyClock"
              onChange={(e) => setNewAppName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitNewApp();
                }
              }}
              aria-label="New app name"
            />
            {createError && <p className="text-[11px] text-destructive">{createError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewAppOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newAppName.trim() || creating}
              onClick={() => void submitNewApp()}
            >
              {creating ? "Creating…" : "Create app"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Previews the exact id the server will derive from the typed name.
function slugPreview(name: string): string {
  return slugifyAppId(name) || "app-id";
}

function SaveStatus({
  savedAt,
  saveError,
  dirty,
  saving,
  saveMode,
  store,
}: {
  savedAt: number | null;
  saveError: string | null;
  dirty: boolean;
  saving: boolean;
  saveMode: SaveMode;
  /** Human-readable name for wherever saves land, e.g. "this browser". */
  store: string;
}) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (saveError) {
    return (
      <span
        className="flex items-center gap-1 text-xs text-destructive"
        title={saveError}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> save failed
      </span>
    );
  }

  if (saving) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Cloud className="h-3.5 w-3.5" /> saving…
      </span>
    );
  }

  if (dirty) {
    return (
      <span
        className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"
        title={
          saveMode === "manual"
            ? `Edits are in memory only — ${store} is untouched`
            : "Auto-save is pending"
        }
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        unsaved changes
      </span>
    );
  }

  if (!savedAt) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5" /> up to date
      </span>
    );
  }
  const seconds = Math.max(0, Math.round((Date.now() - savedAt) / 1000));
  const label =
    seconds < 5
      ? "saved"
      : seconds < 60
        ? `saved ${seconds}s ago`
        : seconds < 3600
          ? `saved ${Math.round(seconds / 60)}m ago`
          : `saved ${Math.round(seconds / 3600)}h ago`;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-green-500" /> {label}
    </span>
  );
}
