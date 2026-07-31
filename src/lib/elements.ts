import type { BuiltInElementId, ElementId, FocusElementId, TextElementId } from "./types";

export const BUILT_IN_ELEMENT_IDS: BuiltInElementId[] = [
  "caption",
  "device",
  "deviceSecondary",
];

export const TEXT_ELEMENT_PREFIX = "text:";
export const FOCUS_ELEMENT_PREFIX = "focus:";

export function isBuiltInElementId(id: ElementId | string): id is BuiltInElementId {
  return (BUILT_IN_ELEMENT_IDS as string[]).includes(id);
}

export function isTextElementId(id: ElementId | string | null | undefined): id is TextElementId {
  return typeof id === "string" && id.startsWith(TEXT_ELEMENT_PREFIX);
}

export function toTextElementId(id: string): TextElementId {
  return `${TEXT_ELEMENT_PREFIX}${id}` as TextElementId;
}

export function textElementKey(id: TextElementId | ElementId): string {
  return isTextElementId(id) ? id.slice(TEXT_ELEMENT_PREFIX.length) : id;
}

export function isFocusElementId(id: ElementId | string | null | undefined): id is FocusElementId {
  return typeof id === "string" && id.startsWith(FOCUS_ELEMENT_PREFIX);
}

export function toFocusElementId(id: string): FocusElementId {
  return `${FOCUS_ELEMENT_PREFIX}${id}` as FocusElementId;
}

export function focusElementKey(id: FocusElementId | ElementId): string {
  return isFocusElementId(id) ? id.slice(FOCUS_ELEMENT_PREFIX.length) : id;
}
