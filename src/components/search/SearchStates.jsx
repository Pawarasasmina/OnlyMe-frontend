import { FiAlertCircle, FiEye, FiRefreshCw, FiSearch } from "react-icons/fi";

export function SearchSkeleton({ count = 5 }) {
  return (
    <div className="mt-4 space-y-3" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-24 animate-pulse rounded-2xl border border-atseen-line bg-atseen-surface-2" key={index} />
      ))}
      <span className="sr-only">Loading search results</span>
    </div>
  );
}

export function SearchEmptyState({ onClearFilters, onExploreWorlds, onSearchAll, query, typeLabel = "results" }) {
  return (
    <div className="mt-8 rounded-[22px] border border-atseen-line bg-atseen-surface p-8 text-center" role="status">
      <FiEye aria-hidden="true" className="mx-auto text-4xl text-white/15" />
      <h2 className="mt-4 text-lg font-extrabold text-atseen-text">No {typeLabel} for &quot;{query}&quot;</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-atseen-muted">Try a different name, category, place, or idea.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="rounded-full border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-muted hover:text-white" onClick={onClearFilters} type="button">Clear filters</button>
        <button className="rounded-full border border-atseen-blue/50 px-4 py-2 text-sm font-bold text-atseen-blue" onClick={onSearchAll} type="button">Search all</button>
        <button className="rounded-full border border-atseen-line px-4 py-2 text-sm font-bold text-atseen-muted hover:text-white" onClick={onExploreWorlds} type="button">Explore Worlds</button>
      </div>
    </div>
  );
}

export function SearchErrorState({ error, onRetry }) {
  const status = error?.response?.status;
  const message = status === 429 ? "Search is moving too quickly. Please wait a moment and try again." : "We couldn't complete your search.";
  return (
    <div className="mt-8 rounded-[22px] border border-red-300/20 bg-red-500/10 p-6 text-center" role="alert">
      <FiAlertCircle aria-hidden="true" className="mx-auto text-2xl text-red-200" />
      <h2 className="mt-3 text-lg font-extrabold text-red-100">{message}</h2>
      <button className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-200/30 px-4 py-2 text-sm font-bold text-red-100" onClick={onRetry} type="button">
        <FiRefreshCw aria-hidden="true" /> Try again
      </button>
    </div>
  );
}

export function SearchPromptState() {
  return (
    <div className="mt-8 rounded-[22px] border border-atseen-line bg-atseen-surface p-8 text-center">
      <FiSearch aria-hidden="true" className="mx-auto text-3xl text-atseen-blue" />
      <p className="mt-3 text-sm text-atseen-muted">Enter at least 2 characters to search Atseen.</p>
    </div>
  );
}
