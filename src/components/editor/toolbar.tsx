"use client";
import * as React from "react";
import { AlertTriangle, Check, Cloud, Download, UnfoldHorizontal, RotateCcw } from "lucide-react";
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
  supportsLandscape,
} from "@/lib/constants";
import { detectPlatform } from "@/lib/defaults";
import { slugifyAppId, type AppSummary } from "@/lib/apps";
import type { Device, Orientation, Theme } from "@/lib/types";

// Sentinel value for the "New app…" row inside the app <Select>.
const NEW_APP_VALUE = "__new_app__";

type Props = {
  apps: AppSummary[];
  appId: string;
  onSwitchApp: (id: string) => void;
  onCreateApp: (name: string) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  switching: boolean;
  themeId: string;
  setThemeId: (v: string) => void;
  appThemes?: Theme[];
  appName: string;
  setAppName: (v: string) => void;
  connectedCanvas: boolean;
  setConnectedCanvas: (v: boolean) => void;
  locale: string;
  setLocale: (v: string) => void;
  locales: string[];
  device: Device;
  setDevice: (v: Device) => void;
  orientation: Orientation;
  setOrientation: (v: Orientation) => void;
  onExport: () => void;
  onResetAll: () => void;
  onResetDevice: () => void;
  exporting: string | null;
  savedAt: number | null;
  saveError: string | null;
  busy: boolean;
};

export function Toolbar(props: Props) {
  const platform = detectPlatform(props.device);
  const hasLandscape = supportsLandscape(props.device);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [newAppOpen, setNewAppOpen] = React.useState(false);
  const [newAppName, setNewAppName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

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
            <SelectItem key={app.id} value={app.id}>
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

      {hasLandscape && (
        <Select
          value={props.orientation}
          onValueChange={(v) => props.setOrientation(v as Orientation)}
          disabled={props.busy}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
      )}

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
        <SaveStatus savedAt={props.savedAt} saveError={props.saveError} />
        <span aria-hidden className="h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setResetOpen(true)}
          title="Reset screens to defaults"
          aria-label="Reset"
          disabled={props.busy}
        >
          <RotateCcw className="h-4 w-4" />
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
              Choose whether to reset just <span className="font-medium">{deviceLabel}</span> or every device deck for this app. Canvas edits and copy will be lost. Other apps are untouched, and the files in <span className="font-mono text-[11px]">public/screenshots/{props.appId}/</span> stay on disk.
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
              Creates <span className="font-mono text-[11px]">projects/{slugPreview(newAppName)}.json</span> and{" "}
              <span className="font-mono text-[11px]">public/screenshots/{slugPreview(newAppName)}/</span> with a blank deck. Nothing from the current app carries over.
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

function SaveStatus({ savedAt, saveError }: { savedAt: number | null; saveError: string | null }) {
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

  if (!savedAt) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Cloud className="h-3.5 w-3.5" /> not saved yet
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
