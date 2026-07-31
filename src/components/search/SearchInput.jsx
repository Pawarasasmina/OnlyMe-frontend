import { forwardRef } from "react";
import { FiArrowLeft, FiSliders, FiX } from "react-icons/fi";

const SearchInput = forwardRef(function SearchInput({
  activeSuggestionId,
  hasFilters = false,
  onBack,
  onClear,
  onFilterToggle,
  onKeyDown,
  onSubmit,
  placeholder = "Search people or Seens",
  showBack = false,
  showFilters = true,
  suggestionsOpen = false,
  value,
  onChange,
}, ref) {
  return (
    <form className="sticky top-[57px] z-20 -mx-4 bg-atseen-bg/95 px-4 pb-5 pt-2 backdrop-blur md:top-0 md:-mx-6 md:px-6 md:pt-0" onSubmit={onSubmit}>
      <div className="flex items-center gap-3">
        {showBack ? (
          <button aria-label="Go back" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[24px] text-white transition hover:bg-white/[0.11]" onClick={onBack} type="button">
            <FiArrowLeft aria-hidden="true" strokeWidth={2.4} />
          </button>
        ) : null}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search Atseen</span>
          <input
            aria-activedescendant={activeSuggestionId || undefined}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={suggestionsOpen}
            className="h-[58px] w-full rounded-[15px] border border-atseen-blue/55 bg-[#11151b] px-5 pr-12 text-[17px] font-medium text-atseen-text outline-none placeholder:text-white/45 focus:border-atseen-blue"
            maxLength={100}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={ref}
            role="combobox"
            type="search"
            value={value}
          />
          {value ? (
            <button aria-label="Clear search" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-atseen-muted hover:bg-white/10 hover:text-white" onClick={onClear} type="button">
              <FiX aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {showFilters ? <button
          aria-label="Search filters"
          aria-pressed={hasFilters}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border transition ${hasFilters ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`}
          onClick={onFilterToggle}
          type="button"
        >
          <FiSliders aria-hidden="true" />
        </button> : null}
      </div>
    </form>
  );
});

export default SearchInput;
