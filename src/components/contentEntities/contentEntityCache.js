export function updateAttachedEntitySaved(queryClient, entity, saved) {
  if (!entity?.id || !entity?.type) return;
  const matches = (candidate) => String(candidate?.id) === String(entity.id) && candidate?.type === entity.type;
  const updateEntity = (candidate) => matches(candidate) ? { ...candidate, saved } : candidate;
  const updateList = (items = []) => items.map((item) => ({
    ...item,
    attachedEntities: (item.attachedEntities || []).map(updateEntity),
  }));

  queryClient.setQueriesData({ queryKey: ["feed-posts"] }, (current) => {
    if (!current?.items) return current;
    return { ...current, items: updateList(current.items) };
  });
  queryClient.setQueriesData({ queryKey: ["seen-feed"] }, (current) => Array.isArray(current) ? updateList(current) : current);
  queryClient.setQueriesData({ queryKey: ["seen-detail"] }, (current) => current?.attachedEntities ? { ...current, attachedEntities: current.attachedEntities.map(updateEntity) } : current);
  queryClient.setQueriesData({ queryKey: ["content-entity", entity.type, entity.id] }, (current) => current?.entity ? { ...current, entity: { ...current.entity, saved } } : current);

  queryClient.invalidateQueries({ queryKey: ["saved"] });
  queryClient.invalidateQueries({ queryKey: ["saved-content"] });
  queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
  queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
  queryClient.invalidateQueries({ queryKey: ["search"] });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("atseen-content-entity-saved", {
      detail: { id: String(entity.id), saved, type: entity.type },
    }));
  }
}
