import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiMapPin } from "react-icons/fi";
import { WALL_LOCATIONS } from "../../../data/wallLocations";
import { searchService } from "../../../services/searchService";

export default function WallLocationPicker({ anchorRef, location, onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({});
  const sheet = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const query = search.trim().toLowerCase();
  const groups = WALL_LOCATIONS.flatMap(([code, name, cities]) => {
    const matchesCountry = !query || name.toLowerCase().includes(query) || code.toLowerCase() === query;
    const matches = matchesCountry ? cities : cities.filter((city) => city.toLowerCase().includes(query));
    return matchesCountry || matches.length ? [{ code, name, cities: matches }] : [];
  });
  const showWorld = !query || "worldwide".includes(query);
  const selected = String(location || "").split(",")[0].trim().toLowerCase();

  useEffect(() => {
    const center = anchorRef.current?.closest(".social-center-scroll");
    const restore = document.activeElement;
    const overflow = center?.style.overflow;
    const update = () => {
      const bounds = center?.getBoundingClientRect();
      if (bounds) setPosition({ left: bounds.left, width: bounds.width, top: Math.max(0, bounds.top), bottom: Math.max(0, window.innerHeight - bounds.bottom) });
    };
    update();
    if (center) center.style.overflow = "hidden";
    const observer = new ResizeObserver(update);
    if (center) observer.observe(center);
    window.addEventListener("resize", update);
    const keydown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const targets = [...sheet.current.querySelectorAll('input,button')];
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", keydown);
    // Keep the mobile keyboard closed until the search field is tapped.
    sheet.current?.focus();
    return () => {
      if (center) center.style.overflow = overflow;
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", keydown);
      if (restore?.isConnected) restore.focus();
    };
  }, [anchorRef]);

  useEffect(() => {
    setResults([]);
    setError("");
    if (query.length < 2) { setLoading(false); return undefined; }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchService.searchLocations({ q: search.trim(), language: navigator.language || "en" }, controller.signal)
        .then((items) => { if (!controller.signal.aborted) setResults(items); })
        .catch((failure) => { if (!controller.signal.aborted) setError(failure?.response?.data?.message || "Could not search locations. Try again."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, search]);

  const choose = (value, code = "") => { onSelect?.(value, code); onClose(); };
  const check = (name) => selected === name.toLowerCase() ? <FiCheck aria-hidden="true" className="wall-location-check" /> : null;
  const knownNames = new Set(groups.flatMap((group) => [group.name, ...group.cities]).map((name) => name.toLowerCase()));
  const extras = results.filter((item) => !knownNames.has(item.name.toLowerCase()));

  return createPortal(<div className="wall-location-layer" style={position}>
    <button aria-label="Close location picker" className="wall-location-scrim" tabIndex={-1} onClick={onClose} type="button" />
    <section aria-labelledby="wall-location-title" aria-modal="true" className="wall-location-sheet" ref={sheet} role="dialog" tabIndex={-1}>
      <div aria-hidden="true" className="wall-location-handle" />
      <h2 id="wall-location-title">Location</h2>
      <p className="wall-location-subtitle">See what’s happening where you are.</p>
      <label className="wall-location-search"><span className="sr-only">Search a country or city</span><input placeholder="Search a country or city" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="wall-location-list" key={query}>
        {showWorld ? <button aria-pressed={!selected} className="wall-location-row" onClick={() => choose("")} type="button"><span aria-hidden="true" className="wall-location-symbol">🌍</span><strong>Worldwide</strong>{check("")}</button> : null}
        {groups.map(({ code, name, cities }) => <div className="wall-location-group" key={code}>
          <button aria-pressed={selected === name.toLowerCase()} className="wall-location-row" onClick={() => choose(name, code)} type="button"><span aria-hidden="true" className="wall-location-symbol wall-location-code">{code}</span><strong>{name}</strong>{check(name)}</button>
          {cities.map((city) => <button aria-pressed={selected === city.toLowerCase()} className="wall-location-row wall-location-city" key={city} onClick={() => choose(`${city}, ${name}`, code)} type="button"><strong>{city}</strong>{check(city)}</button>)}
        </div>)}
        {extras.map((item) => <button aria-pressed={location === item.label} className="wall-location-row" key={item.id || item.label} onClick={() => choose(item.label, item.code)} type="button"><span aria-hidden="true" className="wall-location-symbol wall-location-code">{item.code || <FiMapPin />}</span><span className="wall-location-live"><strong>{item.name}</strong>{item.subtitle ? <small>{item.subtitle}</small> : null}</span>{location === item.label ? <FiCheck aria-hidden="true" className="wall-location-check" /> : null}</button>)}
        {loading ? <p className="wall-location-status" role="status">Searching locations…</p> : null}
        {!loading && error ? <p className="wall-location-status" role="alert">{error}</p> : null}
        {!loading && !error && !showWorld && !groups.length && !extras.length ? <p className="wall-location-status">No locations found.</p> : null}
      </div>
    </section>
  </div>, document.body);
}
