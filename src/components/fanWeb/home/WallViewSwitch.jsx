import { msg } from "../../../i18n/runtime.js";
import { useLanguage } from "../../../hooks/useLanguage";
export default function WallViewSwitch({ view, onChange }) {
  useLanguage();
  return <div className="wall-view-switch" role="group" aria-label={msg("wallGrid.view")}>
    {["feed", "grid"].map(value => <button key={value} aria-label={msg(`wallGrid.${value}`)} aria-pressed={view === value} onClick={() => onChange(value)} title={msg(`wallGrid.${value}`)} type="button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{value === "feed" ? <><circle cx="6" cy="7" r="2" /><path d="M11 6h9M11 9h6M11 15h9M11 18h6" /><circle cx="6" cy="16" r="2" /></> : <><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></>}</svg></button>)}
  </div>;
}
