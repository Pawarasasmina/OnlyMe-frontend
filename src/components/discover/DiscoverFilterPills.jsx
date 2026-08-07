import { FiRefreshCw, FiSearch, FiSliders } from "react-icons/fi";
import { Link } from "react-router-dom";

const FALLBACK_FILTERS = [
  { id: "for_you", label: "For You" },
  { id: "nearby", label: "Nearby" },
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "rising", label: "Rising" },
  { id: "following", label: "Following" },
];

function DiscoverFilterPills({ active, filters = [], isFetching, onChange, onRefresh, onSettings }) {
  const available = filters.length ? filters : FALLBACK_FILTERS;
  return (
    <div className="discover-slide-top">
      <div className="discover-slide-top-actions">
        <Link aria-label="Search" className="discover-icon-button" to="/search">
          <FiSearch aria-hidden="true" />
        </Link>
        <button aria-label="Tune Discover" className="discover-icon-button" onClick={onSettings} type="button">
          <FiSliders aria-hidden="true" />
        </button>
        <button aria-label="Refresh recommendations" className="discover-icon-button" disabled={isFetching} onClick={onRefresh} type="button">
          <FiRefreshCw aria-hidden="true" className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <nav aria-label="Discover filters" className="atseen-hide-scrollbar discover-filter-strip">
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
