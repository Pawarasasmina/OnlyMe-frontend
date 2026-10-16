import { useState } from "react";
import { FiMapPin, FiX } from "react-icons/fi";
import FanModal from "../shared/FanModal";
import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS, WALL_FILTER_SORTS } from "../../../data/wallFilters";

function FilterGroup({ label, options, value, onChange }) {
  return <fieldset className="wall-filter-group"><legend>{label}</legend><div className="wall-filter-chips">{options.map((option) => <button aria-pressed={value === option.value} className={value === option.value ? "is-selected" : ""} key={option.value} onClick={() => onChange(option.value)} type="button">{option.value === "nearby" && label === "Location" ? <FiMapPin aria-hidden="true" /> : null}{option.label}</button>)}</div></fieldset>;
}

export default function WallFilterSheet({ filters, profileCity, profileCountry, onApply, onClose, position }) {
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState("");
  const city = (profileCity || (filters.scope !== "country" ? filters.location : "") || "").split(",")[0].trim();
  const [cityInput, setCityInput] = useState(filters.near || city);
  const set = (name, value) => { setDraft((current) => ({ ...current, [name]: value })); setError(""); };
  const locations = [
    { value: "nearby", label: "Nearby" },
    ...(city ? [{ value: "city", label: city }] : []),
    ...(profileCountry ? [{ value: "country", label: profileCountry }] : []),
    { value: "worldwide", label: "Worldwide" },
    { value: "custom", label: "Other location" },
  ];
  const chooseScope = (scope) => {
    setDraft((current) => ({ ...current, scope, location: scope === "country" ? profileCountry : scope === "city" ? city : scope === "worldwide" ? "" : current.scope === "country" ? "" : current.location }));
    setError("");
  };
  const apply = () => {
    const near = cityInput.trim();
    const location = draft.scope === "nearby" ? near : draft.scope === "worldwide" ? "" : draft.location.trim();
    if ((draft.scope === "nearby" || draft.sort === "nearby") && !near) { setError("Enter a city to use Nearby."); return; }
    if (draft.scope !== "worldwide" && !location) { setError("Choose a location first."); return; }
    onApply({ ...draft, location, near: draft.scope === "nearby" || draft.sort === "nearby" ? near : "" });
  };
  return <FanModal className="wall-filter-sheet" hideHeader isOpen onClose={onClose} overlayClassName="wall-filter-overlay" overlayStyle={position} portal title="Wall filters">
    <span className="wall-filter-handle" aria-hidden="true" />
    <header className="wall-filter-heading"><h2>Filters</h2><button aria-label="Close filters" onClick={onClose} type="button"><FiX /></button></header>
    <div className="wall-filter-content">
      <FilterGroup label="Type" onChange={(value) => set("type", value)} options={WALL_FILTER_TYPES} value={draft.type} />
      <FilterGroup label="Topic" onChange={(value) => set("topic", value)} options={WALL_FILTER_TOPICS} value={draft.topic} />
      <FilterGroup label="Location" onChange={chooseScope} options={locations} value={draft.scope} />
      {draft.scope === "custom" ? <label className="wall-filter-input">City or country<input autoComplete="off" maxLength={120} onChange={(event) => set("location", event.target.value)} placeholder="Enter a city or country" value={draft.location} /></label> : null}
      <FilterGroup label="Sort" onChange={(value) => set("sort", value)} options={WALL_FILTER_SORTS} value={draft.sort} />
      {draft.scope === "nearby" || draft.sort === "nearby" ? <label className="wall-filter-input">Nearby city<input autoComplete="address-level2" maxLength={120} onChange={(event) => { setCityInput(event.target.value); setError(""); }} placeholder="Enter your city" value={cityInput} /><small>Nearby uses city names, not GPS distance.</small></label> : null}
    </div>
    <footer className="wall-filter-footer">
      {error ? <p role="alert">{error}</p> : null}
      <button className="wall-filter-apply" onClick={apply} type="button">Apply</button>
      <button className="wall-filter-reset" onClick={() => { setDraft({ ...DEFAULT_WALL_FILTERS }); setCityInput(city); setError(""); }} type="button">Reset filters</button>
    </footer>
  </FanModal>;
}
