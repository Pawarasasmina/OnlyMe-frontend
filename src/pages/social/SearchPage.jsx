import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchDefaultState from "../../components/search/SearchDefaultState";
import SearchInput from "../../components/search/SearchInput";
import {
  ResultCountAnnouncer,
  SearchAllResults,
  SearchTypeNote,
  SearchTypedResults,
} from "../../components/search/SearchResults";
import { SearchEmptyState, SearchErrorState, SearchPromptState, SearchSkeleton } from "../../components/search/SearchStates";
import { SEARCH_TYPES, normalizeSearchInput } from "../../components/search/searchConfig";
import { searchService } from "../../services/searchService";

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function validType(value) {
  return SEARCH_TYPES.some((item) => item.id === value) ? value : "all";
}

function paramsObject(searchParams) {
  return {
    q: searchParams.get("q") || "",
    type: validType(searchParams.get("type") || "all"),
    category: searchParams.get("category") || "",
    location: searchParams.get("location") || "",
    sort: searchParams.get("sort") || "relevant",
    cursor: searchParams.get("cursor") || "",
  };
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const current = paramsObject(searchParams);
  const [draft, setDraft] = useState(current.q);
  const debouncedDraft = useDebouncedValue(draft, 300);
  const normalizedDebounced = normalizeSearchInput(debouncedDraft);
  const hasSearch = normalizedDebounced.length >= 1 || current.category || current.location;
  const searchType = current.type;

  useEffect(() => {
    setDraft(current.q);
  }, [current.q]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const nextQuery = normalizeSearchInput(debouncedDraft);
    if (nextQuery === current.q) return;
    const next = new URLSearchParams(searchParams);
    if (nextQuery) next.set("q", nextQuery);
    else next.delete("q");
    next.delete("cursor");
    setSearchParams(next, { replace: true });
  }, [current.q, debouncedDraft, searchParams, setSearchParams]);

  const defaultsQuery = useQuery({
    queryKey: ["search", "defaults"],
    queryFn: ({ signal }) => searchService.getSearchDefaults(signal),
  });

  const searchQuery = useQuery({
    queryKey: ["search", {
      category: current.category,
      cursor: current.cursor,
      location: current.location,
      q: normalizedDebounced,
      sort: current.sort,
      type: searchType,
    }],
    queryFn: ({ signal }) => searchService.search({
      category: current.category || undefined,
      cursor: current.cursor || undefined,
      location: current.location || undefined,
      q: normalizedDebounced,
      sort: current.sort,
      type: searchType,
      limit: searchType === "all" ? 20 : 18,
    }, signal),
    enabled: Boolean(hasSearch),
    placeholderData: (previous) => previous,
  });

  const totalCount = searchQuery.data?.sections
    ? Object.values(searchQuery.data.sections).reduce((sum, section) => sum + (section.total || 0), 0)
    : searchQuery.data?.total || 0;

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("cursor");
    setSearchParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams);
    next.delete("category");
    next.delete("location");
    next.set("sort", "relevant");
    next.delete("cursor");
    setSearchParams(next);
  }

  function runImmediate(nextQuery, nextType = searchType) {
    const clean = normalizeSearchInput(nextQuery);
    const next = new URLSearchParams(searchParams);
    if (clean) next.set("q", clean);
    else next.delete("q");
    next.set("type", nextType || "all");
    next.delete("cursor");
    setDraft(clean);
    setSearchParams(next);
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;
    if (draft) runImmediate("");
    else inputRef.current?.blur();
  }

  function loadMore() {
    const cursor = searchQuery.data?.nextCursor;
    if (cursor) updateParam("cursor", cursor);
  }

  function renderResults() {
    if (!hasSearch && draft.trim().length === 1) return <SearchPromptState />;
    if (!hasSearch) {
      return <SearchDefaultState defaults={defaultsQuery.data} loading={defaultsQuery.isLoading} onSearch={runImmediate} />;
    }
    if (searchQuery.isLoading) return <SearchSkeleton />;
    if (searchQuery.isError) return <SearchErrorState error={searchQuery.error} onRetry={() => searchQuery.refetch()} />;
    if (!totalCount) {
      const typeLabel = searchType === "all" ? "results" : SEARCH_TYPES.find((item) => item.id === searchType)?.label || "results";
      return (
        <SearchEmptyState
          onClearFilters={clearFilters}
          onExploreWorlds={() => updateParam("type", "worlds")}
          onSearchAll={() => updateParam("type", "all")}
          query={normalizedDebounced || current.category || current.location}
          typeLabel={typeLabel}
        />
      );
    }
    if (searchQuery.data?.sections) {
      return <SearchAllResults onSeeAll={(type) => updateParam("type", type)} sections={searchQuery.data.sections} />;
    }
    return (
      <>
        <SearchTypeNote type={searchType} />
        <div className="mb-3 mt-4 flex items-center justify-between">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-white/[0.42]">
            {SEARCH_TYPES.find((item) => item.id === searchType)?.label || "Results"} <span className="text-atseen-blue">{searchQuery.data?.total || 0}</span>
          </h2>
        </div>
        <SearchTypedResults items={searchQuery.data?.items || []} />
        {searchQuery.data?.nextCursor ? (
          <button className="mt-4 min-h-11 w-full rounded-full border border-atseen-line bg-atseen-surface-2 text-sm font-bold text-atseen-muted hover:text-white" onClick={loadMore} type="button">
            Load more
          </button>
        ) : null}
      </>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-7rem)]">
      <SearchInput
        activeSuggestionId=""
        hasFilters={Boolean(current.category || current.location || current.sort !== "relevant")}
        onBack={() => navigate(-1)}
        onChange={(value) => setDraft(value.slice(0, 100))}
        onClear={() => runImmediate("")}
        onFilterToggle={() => {}}
        onKeyDown={handleKeyDown}
        onSubmit={(event) => {
          event.preventDefault();
          runImmediate(draft);
        }}
        ref={inputRef}
        showBack
        showFilters={false}
        suggestionsOpen={false}
        value={draft}
      />
      {searchQuery.isFetching && !searchQuery.isLoading ? <p className="mb-2 text-xs text-atseen-dim" role="status">Updating results...</p> : null}
      <ResultCountAnnouncer count={totalCount} query={normalizedDebounced || "current filters"} />
      {renderResults()}
    </div>
  );
}

export default SearchPage;
