import type {
  BuiltInElementId,
  ElementId,
  ElementTransform,
  FocusElementId,
  LocaleTransforms,
  Slide,
  TextElementId,
} from "./types";

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

// ---------- Per-locale placement ----------
// One deck, several language cuts of the same screens. A locale that has never
// been touched inherits the shared transform, so decks start out identical;
// once you move something while a locale is scoped, only that language moves.

type LocalizedElement = { transform: ElementTransform; transformByLocale?: LocaleTransforms };

/** Placement of a built-in element in `locale`, or undefined to use the layout default. */
export function builtInTransform(
  slide: Slide,
  id: BuiltInElementId,
  locale: string,
): ElementTransform | undefined {
  return slide.transformsByLocale?.[locale]?.[id] ?? slide.transforms?.[id];
}

/** Placement of a text or crop layer in `locale`. */
export function localizedTransform(element: LocalizedElement, locale: string): ElementTransform {
  return element.transformByLocale?.[locale] ?? element.transform;
}

/** True when this element has been moved for this language specifically. */
export function hasLocaleTransform(slide: Slide, id: ElementId, locale: string): boolean {
  if (isTextElementId(id)) {
    const key = textElementKey(id);
    return !!slide.textElements?.find((e) => e.id === key)?.transformByLocale?.[locale];
  }
  if (isFocusElementId(id)) {
    const key = focusElementKey(id);
    return !!slide.focusElements?.find((e) => e.id === key)?.transformByLocale?.[locale];
  }
  if (!isBuiltInElementId(id)) return false;
  return !!slide.transformsByLocale?.[locale]?.[id];
}

/**
 * Slide patch that stores `transform` for `elementId`.
 *
 * `scopeLocale` non-null writes the override for that language alone. Passing
 * null writes the shared transform *and* drops every per-locale override of
 * this element, so "apply to all locales" genuinely leaves them all matching
 * rather than quietly losing to a stale override.
 */
export function writeElementTransform(
  slide: Slide,
  elementId: ElementId,
  transform: ElementTransform,
  scopeLocale: string | null,
): Partial<Slide> {
  if (isTextElementId(elementId)) {
    const key = textElementKey(elementId);
    return {
      textElements: (slide.textElements || []).map((element) =>
        element.id === key ? placeElement(element, transform, scopeLocale) : element,
      ),
    };
  }
  if (isFocusElementId(elementId)) {
    const key = focusElementKey(elementId);
    return {
      focusElements: (slide.focusElements || []).map((element) =>
        element.id === key ? placeElement(element, transform, scopeLocale) : element,
      ),
    };
  }
  if (!isBuiltInElementId(elementId)) return {};
  if (scopeLocale) {
    return {
      transformsByLocale: {
        ...(slide.transformsByLocale || {}),
        [scopeLocale]: {
          ...(slide.transformsByLocale?.[scopeLocale] || {}),
          [elementId]: transform,
        },
      },
    };
  }
  return {
    transforms: { ...(slide.transforms || {}), [elementId]: transform },
    transformsByLocale: withoutBuiltIn(slide.transformsByLocale, elementId),
  };
}

/** Slide patch dropping this element's override in `locale` — back to shared. */
export function clearLocaleTransform(
  slide: Slide,
  elementId: ElementId,
  locale: string,
): Partial<Slide> {
  if (isTextElementId(elementId)) {
    const key = textElementKey(elementId);
    return {
      textElements: (slide.textElements || []).map((element) =>
        element.id === key ? unplaceElement(element, locale) : element,
      ),
    };
  }
  if (isFocusElementId(elementId)) {
    const key = focusElementKey(elementId);
    return {
      focusElements: (slide.focusElements || []).map((element) =>
        element.id === key ? unplaceElement(element, locale) : element,
      ),
    };
  }
  if (!isBuiltInElementId(elementId)) return {};
  const forLocale = { ...(slide.transformsByLocale?.[locale] || {}) };
  delete forLocale[elementId];
  const next = { ...(slide.transformsByLocale || {}) };
  if (Object.keys(forLocale).length) next[locale] = forLocale;
  else delete next[locale];
  return { transformsByLocale: Object.keys(next).length ? next : undefined };
}

/**
 * Re-stamp zIndex onto every per-locale override of a built-in element. Layer
 * order is a composition decision rather than a language one, so sending a
 * card to the back has to reach the overrides too — otherwise fr keeps the old
 * stacking while en gets the new one.
 */
export function restackByLocale(
  byLocale: Slide["transformsByLocale"],
  zByElement: Partial<Record<BuiltInElementId, number>>,
): Slide["transformsByLocale"] {
  if (!byLocale) return undefined;
  const next: NonNullable<Slide["transformsByLocale"]> = {};
  for (const [locale, map] of Object.entries(byLocale)) {
    if (!map) continue;
    const stamped: Partial<Record<BuiltInElementId, ElementTransform>> = {};
    for (const [id, transform] of Object.entries(map)) {
      if (!transform) continue;
      const zIndex = zByElement[id as BuiltInElementId];
      stamped[id as BuiltInElementId] = zIndex === undefined ? transform : { ...transform, zIndex };
    }
    next[locale] = stamped;
  }
  return next;
}

/** The text/crop-layer counterpart of restackByLocale. */
export function restackElement<T extends LocalizedElement>(element: T, zIndex: number): T {
  const byLocale = element.transformByLocale;
  return {
    ...element,
    transform: { ...element.transform, zIndex },
    ...(byLocale
      ? {
          transformByLocale: Object.fromEntries(
            Object.entries(byLocale).map(([locale, transform]) => [
              locale,
              transform ? { ...transform, zIndex } : transform,
            ]),
          ),
        }
      : {}),
  };
}

function placeElement<T extends LocalizedElement>(
  element: T,
  transform: ElementTransform,
  scopeLocale: string | null,
): T {
  if (scopeLocale) {
    return {
      ...element,
      transformByLocale: { ...(element.transformByLocale || {}), [scopeLocale]: transform },
    };
  }
  return { ...element, transform, transformByLocale: undefined };
}

function unplaceElement<T extends LocalizedElement>(element: T, locale: string): T {
  if (!element.transformByLocale?.[locale]) return element;
  const next = { ...element.transformByLocale };
  delete next[locale];
  return { ...element, transformByLocale: Object.keys(next).length ? next : undefined };
}

function withoutBuiltIn(
  byLocale: Slide["transformsByLocale"],
  id: BuiltInElementId,
): Slide["transformsByLocale"] {
  if (!byLocale) return undefined;
  const next: NonNullable<Slide["transformsByLocale"]> = {};
  for (const [locale, map] of Object.entries(byLocale)) {
    if (!map) continue;
    const rest = { ...map };
    delete rest[id];
    if (Object.keys(rest).length) next[locale] = rest;
  }
  return Object.keys(next).length ? next : undefined;
}
