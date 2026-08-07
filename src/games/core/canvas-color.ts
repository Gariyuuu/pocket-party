/**
 * Canvas 2D's color parser cannot resolve CSS custom properties on its own
 * — `ctx.fillStyle = "var(--x)"` silently fails to parse and the
 * assignment is a no-op (this is a real, confirmed browser limitation, not
 * a typo: the Canvas 2D API only accepts literal `<color>` syntax). Every
 * game that paints theme colors onto a canvas needs to resolve each
 * variable to its computed value first — this stays theme/dark-mode-
 * reactive, since `getComputedStyle` still reflects whatever `:root`/
 * `.dark`/theme-pack class is actually in effect on the page.
 */
export function resolveCssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** Resolves several custom properties at once, in one getComputedStyle call. */
export function resolveCssVars(el: Element, names: readonly string[]): string[] {
  const style = getComputedStyle(el);
  return names.map((name) => style.getPropertyValue(name).trim());
}
