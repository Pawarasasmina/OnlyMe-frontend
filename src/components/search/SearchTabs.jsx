import { SEARCH_TYPES } from "./searchConfig";

function SearchTabs({ onChange, value }) {
  return (
    <div className="search-result-tabs min-w-0 max-w-full overflow-x-auto pt-3 pb-1 atseen-hide-scrollbar" role="tablist" aria-label="Search result type">
      <div className="flex min-w-max gap-2">
        {SEARCH_TYPES.filter((tab) => ["all", "people", "seens", "wall_notes"].includes(tab.id)).map((tab) => {
          const selected = value === tab.id;
          return (
            <button
              aria-selected={selected}
              className={`search-result-tab ${selected ? "is-selected" : ""}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchTabs;
