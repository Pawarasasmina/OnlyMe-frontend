import { FiMapPin, FiTag, FiX } from "react-icons/fi";
import { SORT_OPTIONS } from "./searchConfig";

function SearchFilters({ categories = [], category, location, onChange, onClear, open, sort }) {
  if (!open) return null;

  return (
    <section className="mt-3 rounded-[18px] border border-atseen-line bg-atseen-surface p-3" aria-label="Search filters">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="relative">
          <span className="sr-only">Category</span>
          <FiTag aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-atseen-dim" />
          <input
            className="h-11 w-full rounded-[13px] border border-atseen-line bg-white/[0.04] pl-9 pr-3 text-sm text-atseen-text outline-none focus:border-atseen-blue/70"
            list="search-categories"
            onChange={(event) => onChange("category", event.target.value)}
            placeholder="Category"
            value={category}
          />
          <datalist id="search-categories">
            {categories.map((item) => <option key={item} value={item} />)}
          </datalist>
        </label>
        <label className="relative">
          <span className="sr-only">City or country</span>
          <FiMapPin aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-atseen-dim" />
          <input
            className="h-11 w-full rounded-[13px] border border-atseen-line bg-white/[0.04] pl-9 pr-3 text-sm text-atseen-text outline-none focus:border-atseen-blue/70"
            onChange={(event) => onChange("location", event.target.value)}
            placeholder="City or country"
            value={location}
          />
        </label>
        <select
          aria-label="Sort results"
          className="h-11 rounded-[13px] border border-atseen-line bg-[#0b0f15] px-3 text-sm font-semibold text-atseen-text outline-none focus:border-atseen-blue/70"
          onChange={(event) => onChange("sort", event.target.value)}
          value={sort}
        >
          {SORT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.slice(0, 8).map((item) => (
          <button
            className={`rounded-full border px-3 py-2 text-xs font-bold transition ${category === item ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface-2 text-atseen-muted hover:text-white"}`}
            key={item}
            onClick={() => onChange("category", category === item ? "" : item)}
            type="button"
          >
            {item}
          </button>
        ))}
        {category || location || sort !== "relevant" ? (
          <button className="inline-flex items-center gap-1 rounded-full border border-atseen-line px-3 py-2 text-xs font-bold text-atseen-muted hover:text-white" onClick={onClear} type="button">
            <FiX aria-hidden="true" /> Clear filters
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default SearchFilters;
