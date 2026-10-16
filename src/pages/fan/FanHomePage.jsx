import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { FiChevronDown, FiSliders } from "react-icons/fi";
import WallFilterSheet from "../../components/fanWeb/home/WallFilterSheet";
import { DEFAULT_WALL_FILTERS, WALL_FILTER_SORTS } from "../../data/wallFilters";
import { mergeWallPages, readWallFilters, writeWallFilters } from "../../utils/wallFilters";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import WallSeenTodayNotice from "../../components/fanWeb/home/WallSeenTodayNotice";
import WallFeedSkeleton from "../../components/fanWeb/home/WallFeedSkeleton";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";
import { useAuth } from "../../hooks/useAuth";
import { useDiscoverQuery } from "../../hooks/useDiscoverQuery";
import { useFeedPosts } from "../../hooks/useFeedPosts";
import { useUnreadActivityCount } from "../../hooks/useUnreadActivityCount";
import { profileService } from "../../services/profileService";
import { canCreateFeedPost } from "../../utils/postPermissions";
import ContentEmptyState from "../../components/shared/ContentEmptyState";

const HOME_FILTERS = [
  { key: "all", label: "All" },
  { key: "right_now", label: "Right now" },
  { key: "places", label: "Places" },
  { key: "events", label: "Events" },
  { key: "things_to_do", label: "Things to do" },
  { key: "food", label: "Food" },
  { key: "travel", label: "Travel" },
  { key: "business", label: "Business" },
  { key: "fitness", label: "Fitness" },
  { key: "beauty", label: "Beauty" },
  { key: "family", label: "Family" },
  { key: "shopping", label: "Shopping" },
  { key: "advice", label: "Advice" },
];

function uniqueList(items = []) {
  return items.map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, list) => list.indexOf(item) === index);
}

function creatorLocation(creator = {}) {
  return [creator.city || creator.location?.city, creator.country || creator.location?.country].filter(Boolean).join(", ");
}

function HomeEmptyState({ activeFilter, canPost, onShowAll }) {
  const filtered = activeFilter !== "all";
  return <ContentEmptyState message={filtered ? "No posts match these filters yet. Try another type, topic, or location." : "Give your Wall some life with a note, or discover people worth following."} primaryAction={filtered ? { label: "Show all posts", onClick: onShowAll } : canPost ? { label: "Create your first post", to: `/wall?compose=note&composeRequest=${Date.now()}` } : { label: "Discover people", to: "/discover" }} secondaryAction={filtered || canPost ? { label: "Discover people", to: "/discover" } : { label: "View Seen", to: "/seen" }} title={filtered ? "Nothing here yet" : "Create your first post"} variant="wall" />;
}

function FanHomePage() {
  const { status, setStatus } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const unreadActivityCount = useUnreadActivityCount(Boolean(user));
  const [searchParams, setSearchParams] = useSearchParams();
  const display = getUserDisplay(user, status);
  const requestedFilter = searchParams.get("filter") || "all";
  const composeSignal = searchParams.get("compose") === "note"
    ? searchParams.get("composeRequest") || "note"
    : "";
  const activeFilter = HOME_FILTERS.some((filter) => filter.key === requestedFilter) ? requestedFilter : "all";
  const filters = useMemo(() => readWallFilters(searchParams), [searchParams]);
  const queryScope = JSON.stringify({ ...filters, filter: activeFilter });
  const [cursor, setCursor] = useState({ scope: "", page: 1 });
  const page = cursor.scope === queryScope ? cursor.page : 1;
  const [feedState, setFeedState] = useState({ scope: "", items: [] });
  const feedPosts = useMemo(() => feedState.scope === queryScope ? feedState.items : [], [feedState, queryScope]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetPosition, setSheetPosition] = useState({});
  const filterButtonRef = useRef(null);
  const sentinelRef = useRef(null);

  const profileQuery = useQuery({
    queryKey: ["profile", "me", "social-home"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });

  const profileCity = profileQuery.data?.profile?.city || display.location || "";
  const profileCountry = profileQuery.data?.profile?.country || "";
  const feedLocation = filters.location;
  const selectedCountryCode = searchParams.get("country") || "";
  const feedParams = useMemo(() => ({
    ...JSON.parse(queryScope),
    limit: 20,
    page,
    _viewerId: user?.id || user?._id || "",
  }), [queryScope, page, user?.id, user?._id]);
  const feedQuery = useFeedPosts(feedParams);
  const canPost = canCreateFeedPost(user);

  useEffect(() => {
    const refreshResolution = () => {
      setCursor({ scope: queryScope, page: 1 });
      setFeedState({ scope: queryScope, items: [] });
    };
    window.addEventListener("wall-resolution-changed", refreshResolution);
    return () => window.removeEventListener("wall-resolution-changed", refreshResolution);
  }, [queryScope]);
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const update = () => {
      const bounds = filterButtonRef.current?.closest(".social-center-scroll")?.getBoundingClientRect();
      setSheetPosition(window.innerWidth > 880 && bounds ? { "--wall-filter-left": `${bounds.left}px`, "--wall-filter-width": `${bounds.width}px` } : {});
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [filtersOpen]);

  const discoverParams = useMemo(() => ({ _viewerId: user?.id || user?._id || "", filter: "for_you", limit: 8 }), [user?.id, user?._id]);
  const discoverQuery = useDiscoverQuery(discoverParams);

  useEffect(() => {
    if (!feedQuery.data?.items) return;
    setFeedState((current) => ({
      scope: queryScope,
      items: page === 1 || current.scope !== queryScope ? feedQuery.data.items : mergeWallPages(current.items, feedQuery.data.items),
    }));
  }, [feedQuery.data?.items, page, queryScope]);

  useEffect(() => {
    const target = sentinelRef.current;
    const pagination = feedQuery.data?.pagination;
    if (!target || !pagination || page >= pagination.pages) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !feedQuery.isFetching) setCursor({ scope: queryScope, page: page + 1 });
    }, { rootMargin: "420px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedQuery.data?.pagination, feedQuery.isFetching, page, queryScope]);

  const recommendations = useMemo(() => discoverQuery.data?.recommendations || [], [discoverQuery.data?.recommendations]);
  const suggestedUsers = useMemo(() => {
    if (discoverQuery.data?.suggestedUsers?.length) return discoverQuery.data.suggestedUsers;
    return recommendations.filter((card) => !(card.isFollowing || card.following || card.actions?.following)).slice(0, 4);
  }, [discoverQuery.data?.suggestedUsers, recommendations]);
  const locationOptions = useMemo(() => uniqueList([
    profileCity,
    display.location,
    ...feedPosts.map((post) => post.location),
    ...suggestedUsers.map(creatorLocation),
    ...recommendations.map(creatorLocation),
  ]), [display.location, feedPosts, profileCity, recommendations, suggestedUsers]);
  const loading = profileQuery.isLoading || (feedQuery.isLoading && page === 1);

  const applyFilters = useCallback((nextFilters) => {
    setSearchParams((current) => writeWallFilters(current, nextFilters), { replace: true });
    setFiltersOpen(false);
  }, [setSearchParams]);

  const resetFilters = () => {
    setSearchParams((current) => {
      const next = writeWallFilters(current, DEFAULT_WALL_FILTERS);
      next.delete("q");
      return next;
    }, { replace: true });
  };
  const changeLocation = useCallback((location, countryCode = "") => {
    setSearchParams((current) => {
      const next = writeWallFilters(current, { ...readWallFilters(current), location, near: location.split(",")[0].trim(), scope: location ? "custom" : "worldwide", sort: !location && readWallFilters(current).sort === "nearby" ? "recent" : readWallFilters(current).sort });
      if (countryCode) next.set("country", countryCode);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const activeCount = Number(filters.type !== "all") + Number(filters.topic !== "all") + Number(filters.scope !== "worldwide") + Number(filters.sort !== "recent") + Number(activeFilter !== "all");
  const summary = `${filters.scope === "worldwide" ? "Worldwide" : filters.scope === "nearby" ? `Near ${filters.near || filters.location}` : filters.location} \u00b7 ${WALL_FILTER_SORTS.find((option) => option.value === filters.sort)?.label || "Recent"}`;

  return (
    <div className="home-prototype-page">
      <section className="home-prototype-main" aria-label="Home feed">
        <HomeHeader
          activityCount={unreadActivityCount}
          countryCode={selectedCountryCode}
          location={feedLocation}
          locationOptions={locationOptions}
          onLocationChange={changeLocation}
        />
        <StoriesRow currentUser={display} onStatusChange={setStatus} />
        <div className="wall-filter-toolbar">
          <button aria-expanded={filtersOpen} aria-haspopup="dialog" className={`wall-filter-trigger ${activeCount ? "has-filters" : ""}`} onClick={() => setFiltersOpen(true)} ref={filterButtonRef} type="button"><FiSliders aria-hidden="true" />Filters{activeCount ? <span>{activeCount}</span> : null}<FiChevronDown aria-hidden="true" /></button>
          <button aria-label={`Change filters and sort: ${summary}`} className="wall-filter-summary" onClick={() => setFiltersOpen(true)} type="button">{summary}</button>
        </div>
        {filtersOpen ? <WallFilterSheet filters={filters} onApply={applyFilters} onClose={() => setFiltersOpen(false)} position={sheetPosition} profileCity={profileCity} profileCountry={profileCountry} /> : null}
        <WallSeenTodayNotice />
        {canPost ? <PostComposer currentUser={display} openSignal={composeSignal} /> : null}

        {loading ? <WallFeedSkeleton /> : null}
        {feedQuery.isError ? (
          <section className="home-feed-error" role="alert">
            <p>Unable to load posts from the database.</p>
            <button onClick={() => feedQuery.refetch()} type="button">Retry</button>
          </section>
        ) : null}
        {!loading && !feedQuery.isError && !feedPosts.length ? <HomeEmptyState activeFilter={activeCount ? "filtered" : "all"} canPost={canPost} onShowAll={resetFilters} /> : null}
        <div aria-busy={loading ? "true" : "false"} className="home-feed-list">
          {feedPosts.map((post) => <FeedPost key={post.id} post={post} />)}
        </div>
        <div className="home-feed-sentinel" ref={sentinelRef}>
          {feedQuery.isFetching && page > 1 ? <LoadingSkeleton className="h-16" count={1} /> : null}
        </div>
      </section>

    </div>
  );
}

export default FanHomePage;
