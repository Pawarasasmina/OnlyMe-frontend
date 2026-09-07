import ContentEntityChip from "./ContentEntityChip";

export default function ContentEntityList({ entities = [], onNotice }) {
  const visible = (entities || []).filter((entity) => entity?.id && entity?.title);
  if (!visible.length) return null;
  return (
    <div className="content-entity-list">
      {visible.map((entity) => <ContentEntityChip entity={entity} key={`${entity.type}-${entity.id}`} onNotice={onNotice} />)}
    </div>
  );
}
