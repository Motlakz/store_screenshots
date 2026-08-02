"use client";
import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Device, Orientation, Slide, Theme } from "@/lib/types";
import { newSlide } from "@/lib/defaults";
import { SlideThumb } from "./slide-thumb";

type Props = {
  slides: Slide[];
  activeId: string | null;
  device: Device;
  orientation: Orientation;
  theme: Theme;
  locale: string;
  appName?: string;
  appIcon?: string;
  connectedCanvas: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onReorder: (next: Slide[]) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: (slide: Slide) => void;
};

export function Sidebar({
  slides,
  activeId,
  device,
  orientation,
  theme,
  locale,
  appName,
  appIcon,
  connectedCanvas,
  disabled,
  collapsed,
  onToggleCollapse,
  onReorder,
  onSelect,
  onDelete,
  onDuplicate,
  onAdd,
}: Props) {
  const addSlide = () =>
    onAdd(newSlide(device === "feature-graphic" ? "feature-graphic" : "device-bottom"));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = slides.findIndex((s) => s.id === active.id);
    const newIdx = slides.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(arrayMove(slides, oldIdx, newIdx));
  };

  // Collapsed: a rail wide enough for the two things worth reaching for
  // without the panel — bring it back, and add a screen. Horizontal on narrow
  // screens, where the panel is a strip above the canvas rather than beside it.
  if (collapsed) {
    return (
      <div className="flex h-full w-full items-center gap-1 px-1.5 py-1.5 md:flex-col md:justify-start md:px-0 md:py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleCollapse}
          title="Show screens (⌘/Ctrl+B)"
          aria-label="Show screens panel"
          aria-expanded={false}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <span
          className="text-[11px] font-semibold tabular-nums text-muted-foreground md:[writing-mode:vertical-rl]"
          title={`${slides.length} screen${slides.length === 1 ? "" : "s"}`}
        >
          {slides.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 md:mt-auto"
          onClick={addSlide}
          disabled={disabled}
          title="Add screen"
          aria-label="Add screen"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Screens</h2>
          <p className="text-xs text-muted-foreground">
            {slides.length} screen{slides.length === 1 ? "" : "s"} · drag to reorder
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 h-7 w-7 shrink-0"
          onClick={onToggleCollapse}
          title="Hide screens (⌘/Ctrl+B)"
          aria-label="Hide screens panel"
          aria-expanded
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {slides.map((slide, i) => (
                <SlideThumb
                  key={slide.id}
                  slide={slide}
                  slides={slides}
                  index={i}
                  active={slide.id === activeId}
                  device={device}
                  orientation={orientation}
                  theme={theme}
                  locale={locale}
                  appName={appName}
                  appIcon={appIcon}
                  connectedCanvas={connectedCanvas}
                  onSelect={() => onSelect(slide.id)}
                  onDelete={() => onDelete(slide.id)}
                  onDuplicate={() => onDuplicate(slide.id)}
                />
              ))}
              {slides.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-xs font-medium text-foreground">No screens yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Click <span className="font-semibold">Add screen</span> to get started.
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border-t bg-card p-3">
        <Button
          type="button"
          className="w-full"
          variant="default"
          onClick={addSlide}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" /> Add screen
        </Button>
      </div>
    </div>
  );
}
