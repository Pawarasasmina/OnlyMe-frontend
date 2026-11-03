/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { SEARCH_TYPES } from "./searchConfig";

function SearchTabs({ onChange, value }) {
  __useUiLanguage();
  return (
    <div className="search-result-tabs min-w-0 max-w-full overflow-x-auto pt-3 pb-1 atseen-hide-scrollbar" role="tablist" aria-label={__msg("search.searchResultType")}>
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
