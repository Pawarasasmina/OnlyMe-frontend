/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiRefreshCw, FiSliders } from "react-icons/fi";

function OrbitHeader({ disabled = false, location, onRefresh, onTune, refreshing = false }) {
  __useUiLanguage();
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-atseen-dim">{__msg("orbit.personalDiscovery")}</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-atseen-text">{__msg("orbit.yourOrbit")}{location ? <span className="text-atseen-muted"> &middot; {location}</span> : null}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-atseen-muted">{__msg("orbit.peopleDriftCloserForRealReasonsNeverForFollower")}</p>
        <button
          className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-atseen-blue transition hover:text-white focus-visible:text-white"
          onClick={onTune}
          type="button"
        >
          <FiSliders aria-hidden="true" />{__msg("orbit.tunedToYourInstincts")}{"\u00b7"}{__msg("orbit.closerMeansMoreLikeYou")}</button>
      </div>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-atseen-blue/30 bg-atseen-blue/10 px-4 py-2.5 text-xs font-extrabold text-atseen-blue transition hover:border-atseen-blue hover:bg-atseen-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || refreshing}
        onClick={onRefresh}
        type="button"
      >
        <FiRefreshCw aria-hidden="true" className={refreshing ? "animate-spin" : ""} />
        {refreshing ? __msg("orbit.findingLights") : __msg("orbit.newLights")}
      </button>
    </header>
  );
}

export default OrbitHeader;
