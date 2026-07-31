import { FiClock, FiGrid, FiMapPin, FiSearch, FiTag, FiUser } from "react-icons/fi";

const icons = {
  category: FiTag,
  person: FiUser,
  place: FiMapPin,
  recent: FiClock,
  world: FiGrid,
};

function SearchSuggestionList({ activeIndex, onPick, open, suggestions = [] }) {
  if (!open || !suggestions.length) return null;

  return (
    <div className="relative z-30">
      <div className="absolute left-0 right-0 top-2 overflow-hidden rounded-2xl border border-atseen-line bg-[#10141b] shadow-2xl" id="search-suggestions" role="listbox">
        {suggestions.map((item, index) => {
          const Icon = icons[item.type] || FiSearch;
          return (
            <button
              aria-selected={activeIndex === index}
              className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm transition ${activeIndex === index ? "bg-atseen-blue/15 text-white" : "text-atseen-muted hover:bg-white/[0.04] hover:text-white"}`}
              id={`search-suggestion-${index}`}
              key={`${item.type}-${item.id}-${item.label}`}
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(item);
              }}
              role="option"
              type="button"
            >
              <Icon aria-hidden="true" className="shrink-0 text-atseen-blue" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-atseen-dim">{item.type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchSuggestionList;
