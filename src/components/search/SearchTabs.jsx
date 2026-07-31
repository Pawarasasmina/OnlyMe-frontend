import { SEARCH_TYPES } from "./searchConfig";

function SearchTabs({ counts = {}, onChange, value }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 py-3 atseen-hide-scrollbar" role="tablist" aria-label="Search result type">
      <div className="flex min-w-max gap-2">
        {SEARCH_TYPES.map((tab) => {
          const selected = value === tab.id;
          const count = counts[tab.id];
          return (
            <button
              aria-selected={selected}
              className={`min-h-11 rounded-full border px-4 text-sm font-bold transition ${selected ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}{typeof count === "number" ? <span className="ml-1 text-[11px] opacity-70">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchTabs;
