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
    <form className="search-input-form min-w-0 w-full" onSubmit={onSubmit}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {showBack ? (
          <button aria-label="Go back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[22px] text-white transition hover:bg-white/[0.11]" onClick={onBack} type="button">
            <FiArrowLeft aria-hidden="true" strokeWidth={2.4} />
          </button>
        ) : null}
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search Atseen</span>
          <input
            aria-activedescendant={activeSuggestionId || undefined}
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={suggestionsOpen}
            className="h-[49px] w-full rounded-[14px] border border-[#303744] bg-[#11151b] px-4 pr-12 text-[16px] sm:text-[14px] font-medium text-atseen-text outline-none placeholder:text-[#758196] focus:border-[#7598c7]"
            maxLength={100}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            ref={ref}
            role="combobox"
            inputMode="search"
            type="text"
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
