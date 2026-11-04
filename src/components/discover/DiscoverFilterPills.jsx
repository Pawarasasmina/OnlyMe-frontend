/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiRefreshCw, FiSearch, FiSliders } from "react-icons/fi";
import { Link } from "react-router-dom";

const FALLBACK_FILTERS = [
  { id: "for_you", get label() { return __msg("discover.forYou"); } },
  { id: "nearby", get label() { return __msg("discover.nearby"); } },
  { id: "trending", get label() { return __msg("discover.trending"); } },
  { id: "new", get label() { return __msg("discover.new"); } },
  { id: "rising", get label() { return __msg("discover.rising"); } },
  { id: "following", get label() { return __msg("activity.following"); } },
];

function DiscoverFilterPills({ active, filters = [], isFetching, onChange, onRefresh, onSettings }) {
  __useUiLanguage();
  const available = filters.length ? filters : FALLBACK_FILTERS;
  return (
    <div className="discover-slide-top">
      <div className="discover-slide-top-actions">
        <Link aria-label={__msg("discover.search")} className="discover-icon-button" to="/search?from=discover">
          <FiSearch aria-hidden="true" />
        </Link>
        <button aria-label={__msg("discover.tuneDiscover")} className="discover-icon-button" onClick={onSettings} type="button">
          <FiSliders aria-hidden="true" />
        </button>
        <button aria-label={__msg("discover.refreshRecommendations")} className="discover-icon-button" disabled={isFetching} onClick={onRefresh} type="button">
          <FiRefreshCw aria-hidden="true" className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <nav aria-label={__msg("discover.discoverFilters")} className="atseen-hide-scrollbar discover-filter-strip">
        {available.map((filter) => {
          const selected = active === filter.id;
          return (
            <button
              aria-pressed={selected}
              className={`discover-filter-pill ${selected ? "is-selected" : ""}`}
              key={filter.id}
              onClick={() => onChange(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default DiscoverFilterPills;
