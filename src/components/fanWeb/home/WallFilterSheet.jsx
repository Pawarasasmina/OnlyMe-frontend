import { systemMessage as __systemMessage } from "../../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useState } from "react";
import { FiMapPin, FiX } from "react-icons/fi";
import FanModal from "../shared/FanModal";
import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS, WALL_FILTER_SORTS } from "../../../data/wallFilters";

function FilterGroup({ label, options, value, onChange }) {
  __useUiLanguage();
  return <fieldset className="wall-filter-group"><legend>{label}</legend><div className="wall-filter-chips">{options.map((option) => <button aria-pressed={value === option.value} className={value === option.value ? "is-selected" : ""} key={option.value} onClick={() => onChange(option.value)} type="button">{option.value === "nearby" && label === __msg("Location") ? <FiMapPin aria-hidden="true" /> : null}{option.label}</button>)}</div></fieldset>;
}

export default function WallFilterSheet({ filters, profileCity, profileCountry, onApply, onClose, position }) {
  __useUiLanguage();
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState("");
  const city = (profileCity || (filters.scope !== "country" ? filters.location : "") || "").split(",")[0].trim();
  const [cityInput, setCityInput] = useState(filters.near || city);
  const set = (name, value) => { setDraft((current) => ({ ...current, [name]: value })); setError(""); };
  const locations = [
    { value: "nearby", label: __msg("discover.nearby") },
    ...(city ? [{ value: "city", label: city }] : []),
    ...(profileCountry ? [{ value: "country", label: profileCountry }] : []),
    { value: "worldwide", label: __msg("fanWeb.worldwide") },
    { value: "custom", label: __msg("fanWeb.otherLocation") },
  ];
  const chooseScope = (scope) => {
    setDraft((current) => ({ ...current, scope, location: scope === "country" ? profileCountry : scope === "city" ? city : scope === "worldwide" ? "" : current.scope === "country" ? "" : current.location }));
    setError("");
  };
  const apply = () => {
    const near = cityInput.trim();
    const location = draft.scope === "nearby" ? near : draft.scope === "worldwide" ? "" : draft.location.trim();
    if ((draft.scope === "nearby" || draft.sort === "nearby") && !near) { setError(__msg("fanWeb.enterACityToUseNearby")); return; }
    if (draft.scope !== "worldwide" && !location) { setError(__msg("fanWeb.chooseALocationFirst")); return; }
    onApply({ ...draft, location, near: draft.scope === "nearby" || draft.sort === "nearby" ? near : "" });
  };
  return <FanModal className="wall-filter-sheet" hideHeader isOpen onClose={onClose} overlayClassName="wall-filter-overlay" overlayStyle={position} portal title={__msg("fanWeb.wallFilters")}>
    <span className="wall-filter-handle" aria-hidden="true" />
    <header className="wall-filter-heading"><h2>{__msg("fanWeb.filters")}</h2><button aria-label={__msg("fanWeb.closeFilters")} onClick={onClose} type="button"><FiX /></button></header>
    <div className="wall-filter-content">
      <FilterGroup label={__msg("content.type")} onChange={(value) => set("type", value)} options={WALL_FILTER_TYPES} value={draft.type} />
      <FilterGroup label={__msg("fanWeb.topic_7e13bd")} onChange={(value) => set("topic", value)} options={WALL_FILTER_TOPICS} value={draft.topic} />
      <FilterGroup label={__msg("fanWeb.location")} onChange={chooseScope} options={locations} value={draft.scope} />
      {draft.scope === "custom" ? <label className="wall-filter-input">{__msg("fanWeb.cityOrCountry")}<input autoComplete="off" maxLength={120} onChange={(event) => set("location", event.target.value)} placeholder={__msg("fanWeb.enterACityOrCountry")} value={draft.location} /></label> : null}
      <FilterGroup label={__msg("fanWeb.sort")} onChange={(value) => set("sort", value)} options={WALL_FILTER_SORTS} value={draft.sort} />
      {draft.scope === "nearby" || draft.sort === "nearby" ? <label className="wall-filter-input">{__msg("fanWeb.nearbyCity")}<input autoComplete="address-level2" maxLength={120} onChange={(event) => { setCityInput(event.target.value); setError(""); }} placeholder={__msg("fanWeb.enterYourCity")} value={cityInput} /><small>{__msg("fanWeb.nearbyUsesCityNamesNotGpsDistance")}</small></label> : null}
    </div>
    <footer className="wall-filter-footer">
      {error ? <p role="alert">{__systemMessage(error)}</p> : null}
      <button className="wall-filter-apply" onClick={apply} type="button">{__msg("fanWeb.apply")}</button>
      <button className="wall-filter-reset" onClick={() => { setDraft({ ...DEFAULT_WALL_FILTERS }); setCityInput(city); setError(""); }} type="button">{__msg("fanWeb.resetFilters")}</button>
    </footer>
  </FanModal>;
}
