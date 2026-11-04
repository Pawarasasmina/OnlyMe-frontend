/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiSliders } from "react-icons/fi";

function DiscoverEmptyState({ onRefresh, onSettings }) {
  __useUiLanguage();
  return (
    <section className="discover-state-panel">
      <h1>{__msg("discover.noNewLightsYet")}</h1>
      <p>{__msg("discover.updateYourInterestsOrDiscoverySettingsThenRefreshYour")}</p>
      <div>
        <button onClick={onSettings} type="button"><FiSliders aria-hidden="true" /> {__msg("discover.tuneDiscover")}</button>
        <button onClick={onRefresh} type="button"><FiRefreshCw aria-hidden="true" /> {__msg("discover.refresh")}</button>
        <Link to="/seen">{__msg("discover.exploreWorlds")}</Link>
      </div>
    </section>
  );
}

export default DiscoverEmptyState;
