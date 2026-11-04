import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiGlobe, FiMapPin, FiNavigation, FiSearch } from "react-icons/fi";
import { searchService } from "../../services/searchService";
import { geolocationErrorMessage } from "../../utils/locationLookup";

const FALLBACK = [
  ["Downtown Dubai", "Dubai, UAE", 25.1972, 55.2744, "area"], ["JBR", "Dubai, UAE", 25.0781, 55.1336, "area"],
  ["Palm Jumeirah", "Dubai, UAE", 25.1124, 55.139, "area"], ["Business Bay", "Dubai, UAE", 25.185, 55.265, "area"],
  ["Dubai", "UAE", 25.2048, 55.2708, "city"], ["Abu Dhabi", "UAE", 24.4539, 54.3773, "city"],
  ["Paris", "France", 48.8566, 2.3522, "city"], ["London", "United Kingdom", 51.5072, -0.1276, "city"],
  ["New York", "United States", 40.7128, -74.006, "city"], ["Lisbon", "Portugal", 38.7223, -9.1393, "city"],
].map(([name, subtitle, latitude, longitude, kind]) => ({ id: `popular-${name}`, name, label: `${name}, ${subtitle}`, subtitle, latitude, longitude, kind }));
const DEFAULT_PLACE = { name: "Dubai Marina", label: "Dubai Marina, Dubai", subtitle: "Current location", latitude: 25.0805, longitude: 55.1403, kind: "area" };

function tileData(place) {
  const zoom = place.kind === "country" || place.kind === "world" ? 4 : place.kind === "city" ? 11 : 13;
  const lat = Number(place.latitude ?? DEFAULT_PLACE.latitude), lon = Number(place.longitude ?? DEFAULT_PLACE.longitude);
  const n = 2 ** zoom, px = ((lon + 180) / 360) * n * 256, r = lat * Math.PI / 180;
  const py = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n * 256;
  const tiles = [];
  for (let tx = Math.floor((px - 280) / 256); tx <= Math.floor((px + 280) / 256); tx += 1) for (let ty = Math.floor((py - 120) / 256); ty <= Math.floor((py + 120) / 256); ty += 1) {
    if (ty >= 0 && ty < n) tiles.push({ x: ((tx % n) + n) % n, y: ty, left: Math.round(tx * 256 - px), top: Math.round(ty * 256 - py), zoom });
  }
  return tiles;
}

function MapPreview({ place }) {
  const tiles = useMemo(() => tileData(place), [place]);
  return <div className="universal-location-map" aria-label={`Map preview of ${place.name}`}>
    <div className="universal-location-tiles">{tiles.map((tile) => <img alt="" draggable="false" key={`${tile.x}-${tile.y}`} src={`https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`} style={{ left: tile.left, top: tile.top }} />)}</div>
    <i className="universal-location-pulse" /><i className="universal-location-dot" /><b>{place.name}</b><small>© OpenStreetMap</small>
  </div>;
}

export default function UniversalLocationPicker({ allowCustom = true, allowWorldwide = false, anchorRef, onClose, onSelect, title = "Location", value = "" }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value ? { name: value.split(",")[0], label: value } : allowWorldwide ? { name: "Worldwide", label: "", kind: "world", latitude: 25, longitude: 20 } : null);
  const [results, setResults] = useState([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const panelRef = useRef(null);
  useEffect(() => {
    const old = document.body.style.overflow; document.body.style.overflow = "hidden"; panelRef.current?.focus();
    const key = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key); return () => { document.body.style.overflow = old; window.removeEventListener("keydown", key); };
  }, [onClose]);
  useEffect(() => {
    const q = query.trim(); setError("");
    if (q.length < 2) { setResults([]); setLoading(false); return undefined; }
    const controller = new AbortController(); const timer = setTimeout(() => { setLoading(true); searchService.searchLocations({ q, language: navigator.language || "en" }, controller.signal).then(setResults).catch((e) => setError(e?.response?.data?.message || "Could not search locations. Try again.")).finally(() => !controller.signal.aborted && setLoading(false)); }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const chooseCurrent = () => {
    if (!navigator.geolocation) { setError("Location access is not supported by this browser."); return; }
    setLoading(true); setError(""); navigator.geolocation.getCurrentPosition(({ coords }) => searchService.searchLocations({ latitude: coords.latitude, longitude: coords.longitude, language: navigator.language || "en" }).then((items) => setSelected(items[0] || { ...DEFAULT_PLACE, latitude: coords.latitude, longitude: coords.longitude })).catch((e) => setError(e?.response?.data?.message || "Could not identify your current area.")).finally(() => setLoading(false)), (e) => { setLoading(false); setError(geolocationErrorMessage(e)); }, { maximumAge: 300000, timeout: 8000 });
  };
  const shown = query.trim().length >= 2 ? results : FALLBACK;
  const exact = shown.some((item) => item.name.toLowerCase() === query.trim().toLowerCase());
  const custom = allowCustom && query.trim().length >= 2 && !exact ? { id: "custom", name: query.trim(), label: query.trim(), subtitle: "Use this name", latitude: selected?.latitude, longitude: selected?.longitude, kind: "custom" } : null;
  const row = (item, icon) => <button aria-pressed={selected?.label === item.label} className="universal-location-row" key={item.id || item.label} onClick={() => setSelected(item)} type="button"><span>{icon || <FiMapPin />}</span><i><strong>{item.name}</strong><small>{item.subtitle}</small></i>{selected?.label === item.label ? <FiCheck className="universal-location-check" /> : null}</button>;
  const host = anchorRef?.current?.closest(".social-center-scroll"); const bounds = host?.getBoundingClientRect();
  return createPortal(<div className="universal-location-layer" style={bounds ? { left: bounds.left, width: bounds.width, top: Math.max(0, bounds.top), bottom: Math.max(0, innerHeight - bounds.bottom) } : undefined}>
    <button aria-label="Close location picker" className="universal-location-scrim" onClick={onClose} type="button" />
    <section aria-modal="true" className="universal-location-sheet" ref={panelRef} role="dialog" tabIndex={-1}><span className="universal-location-handle" /><h2>{title}</h2>
      <MapPreview place={selected || DEFAULT_PLACE} />
      <label className="universal-location-search"><FiSearch /><input aria-label="Search a city, district or place" onChange={(e) => setQuery(e.target.value)} placeholder="Search a city, district or place" value={query} /></label>
      <div className="universal-location-list">
        {!query.trim() && allowWorldwide ? row({ id: "world", name: "Worldwide", label: "", subtitle: "Everything, everywhere", kind: "world", latitude: 25, longitude: 20 }, <FiGlobe />) : null}
        {!query.trim() ? <button className="universal-location-row" onClick={chooseCurrent} type="button"><span><FiNavigation /></span><i><strong>Current location</strong><small>{loading ? "Finding your area…" : "Use your device location"}</small></i></button> : null}
        {!query.trim() ? <em className="universal-location-popular">POPULAR</em> : null}
        {loading ? <p>Searching locations…</p> : null}{!loading && error ? <p role="alert">{error}</p> : null}
        {!loading && !error && shown.map((item) => row(item))}{!loading && !error && custom ? row(custom) : null}
        {!loading && !error && query.trim().length >= 2 && !shown.length && !custom ? <p>Nothing found.</p> : null}
      </div>
      <button className="universal-location-done" disabled={!selected} onClick={() => { const code = selected?.code || (selected?.subtitle?.includes("UAE") ? "AE" : ""); onSelect(selected?.label || "", code, selected); onClose(); }} type="button">Done{selected ? ` · ${selected.name}` : ""}</button>
      {value ? <button className="universal-location-current" onClick={() => { onSelect("", null); onClose(); }} type="button">Remove location</button> : null}
    </section>
  </div>, document.body);
}
