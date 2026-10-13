export function scrollPositionForNavigation({ navigationType, restoreScroll, entryPosition, routePosition }) {
  if (navigationType === "POP" && entryPosition) return entryPosition;
  if (restoreScroll && routePosition) return routePosition;
  return { content: 0, window: 0 };
}

export function restoreSocialScroll(content, viewport, position) {
  content?.scrollTo({ top: position.content, behavior: "instant" });
  viewport.scrollTo({ top: position.window, behavior: "instant" });
  return Math.abs((content?.scrollTop || 0) - position.content) <= 1
    && Math.abs(viewport.scrollY - position.window) <= 1;
}
