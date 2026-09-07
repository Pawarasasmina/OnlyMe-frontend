import { useEffect, useMemo, useState } from "react";
import { FiBookmark, FiBookOpen, FiCompass, FiLock, FiMapPin, FiSearch, FiX } from "react-icons/fi";
import { CONTENT_ENTITY_LABELS, CONTENT_ENTITY_TYPES } from "../../constants/contentEntityTypes";
import { contentEntityService } from "../../services/contentEntityService";
import { resolveMediaUrl } from "../../utils/media";

const typeOptions = [
  { icon: FiMapPin, label: "Place", type: CONTENT_ENTITY_TYPES.PLACE },
  { icon: FiBookOpen, label: "Book", type: CONTENT_ENTITY_TYPES.BOOK },
  { icon: FiCompass, label: "Journey", type: CONTENT_ENTITY_TYPES.JOURNEY },
  { icon: FiLock, label: "Experience", type: CONTENT_ENTITY_TYPES.EXPERIENCE },
];

export default function EntityAttachmentPicker({ context = "", disabled = false, onChange, value = [] }) {
  const [type, setType] = useState(() => {
    const normalized = String(context).toLowerCase();
    if (normalized.includes("book")) return CONTENT_ENTITY_TYPES.BOOK;
    if (normalized.includes("travel")) return CONTENT_ENTITY_TYPES.PLACE;
    return CONTENT_ENTITY_TYPES.PLACE;
  });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const selected = useMemo(() => value || [], [value]);
  const selectedKeys = useMemo(() => new Set(selected.map((item) => `${item.type}:${item.id}`)), [selected]);

  useEffect(() => {
    if (String(context).toLowerCase().includes("book")) setType(CONTENT_ENTITY_TYPES.BOOK);
  }, [context]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      contentEntityService.search({ q: query.trim(), type }, controller.signal)
        .then((data) => setResults(data.items || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, type]);

  const add = (item) => {
    const next = [...selected.filter((candidate) => `${candidate.type}:${candidate.id}` !== `${item.type}:${item.id}`), item].slice(-4);
    onChange?.(next);
    setQuery("");
    setResults([]);
  };

  return (
    <section className="entity-attachment-picker">
      <div className="entity-attachment-head">
        <span><FiBookmark aria-hidden="true" /> Attach</span>
        <div role="group" aria-label="Attachment type">
          {typeOptions.map(({ icon: Icon, label, type: optionType }) => (
            <button aria-pressed={type === optionType} className={type === optionType ? "is-selected" : ""} disabled={disabled} key={optionType} onClick={() => setType(optionType)} type="button">
              <Icon aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>
      <label className="entity-attachment-search">
        <FiSearch aria-hidden="true" />
        <input disabled={disabled} onChange={(event) => setQuery(event.target.value)} placeholder={`Search existing ${CONTENT_ENTITY_LABELS[type].toLowerCase()} records`} value={query} />
      </label>
      {selected.length ? (
        <div className="entity-attachment-selected">
          {selected.map((item) => {
            const option = typeOptions.find((entry) => entry.type === item.type) || typeOptions[0];
            const Icon = option.icon;
            return (
              <span key={`${item.type}-${item.id}`}>
                <Icon aria-hidden="true" />
                <b>{item.title}</b>
                <button aria-label={`Remove ${item.title}`} disabled={disabled} onClick={() => onChange?.(selected.filter((candidate) => `${candidate.type}:${candidate.id}` !== `${item.type}:${item.id}`))} type="button"><FiX /></button>
              </span>
            );
          })}
        </div>
      ) : null}
      {query.trim().length >= 2 ? (
        <div className="entity-attachment-results" role="listbox">
          {loading ? <p>Searching...</p> : null}
          {!loading && !results.length ? <p>No existing {CONTENT_ENTITY_LABELS[type].toLowerCase()} found.</p> : null}
          {results.map((item) => {
            const image = resolveMediaUrl(item.image);
            const option = typeOptions.find((entry) => entry.type === item.type) || typeOptions[0];
            const Icon = option.icon;
            const selectedAlready = selectedKeys.has(`${item.type}:${item.id}`);
            return (
              <button aria-disabled={selectedAlready} disabled={selectedAlready || disabled} key={`${item.type}-${item.id}`} onClick={() => add(item)} type="button">
                <span>{image ? <img alt="" src={image} /> : <Icon aria-hidden="true" />}</span>
                <strong>{item.title}<small>{item.subtitle || item.category}</small></strong>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
