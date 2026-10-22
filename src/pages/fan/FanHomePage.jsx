import WallExploreNeeds from "../../components/fanWeb/home/WallExploreNeeds";
import { prependCreatedWallPosts } from "../../utils/wallCreatedPosts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutletContext, useSearchParams } from "react-router-dom";
import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS } from "../../data/wallFilters";
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
  const navigation = useLocation();
  const { user, loading: authLoading } = useAuth();
  const unreadActivityCount = useUnreadActivityCount(Boolean(user));
  const [searchParams, setSearchParams] = useSearchParams();
  const display = getUserDisplay(user, status);
  const requestedFilter = searchParams.get("filter") || "all";
  const composeSignal = searchParams.get("compose") === "note"
    ? searchParams.get("composeRequest") || "note"
    : "";
  const consumeCompose = useCallback(() => setSearchParams((current) => {
    const next = new URLSearchParams(current); next.delete("compose"); next.delete("composeRequest"); next.delete("question"); return next;
  }, { replace: true }), [setSearchParams]);
  const handlePublished = () => {
    setCursor({ scope: JSON.stringify({ ...readWallFilters(new URLSearchParams()), filter: "all" }), page: 1 });
    setSearchParams(new URLSearchParams(), { replace: true });
    document.querySelector(".social-center-scroll")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };
  const activeFilter = HOME_FILTERS.some((filter) => filter.key === requestedFilter) ? requestedFilter : "all";
  const filters = useMemo(() => readWallFilters(searchParams), [searchParams]);
  const queryScope = JSON.stringify({ ...filters, filter: activeFilter });
  const [cursor, setCursor] = useState({ scope: "", page: 1 });
  const page = cursor.scope === queryScope ? cursor.page : 1;
  const [feedState, setFeedState] = useState({ scope: "", items: [] });
  const createdQuery = useQuery({
    queryKey: ["feed-posts", "created", String(user?.id || user?._id || "")],
    queryFn: () => ({ items: [] }),
    enabled: false,
    initialData: { items: [] },
  });
  const feedPosts = useMemo(() => {
    const items = feedState.scope === queryScope ? feedState.items : [];
    const selection = JSON.parse(queryScope);
    const unfiltered = selection.filter === "all" && Object.entries(DEFAULT_WALL_FILTERS).every(([key, value]) => selection[key] === value);
    return unfiltered ? prependCreatedWallPosts(items, createdQuery.data?.items || []) : items;
  }, [feedState, queryScope, createdQuery.data]);
  const sentinelRef = useRef(null);

  const profileQuery = useQuery({
    queryKey: ["profile", "me", "social-home"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });

  const profileCity = profileQuery.data?.profile?.city || display.location || "";
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

  useEffect(() => {
    if (loading || !navigation.state?.scrollToWallFeed) return undefined;
    const frame = window.requestAnimationFrame(() => document.querySelector(".wall-feed-heading")?.scrollIntoView({ block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [loading, navigation.key, navigation.state]);

  const applyFilters = useCallback((nextFilters) => {
    setSearchParams((current) => {
      const next = writeWallFilters(current, nextFilters);
      if (current.has("country")) next.set("country", current.get("country"));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const resetFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["type", "topic", "filter", "q"]) next.delete(key);
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
  const activeCount = Number(filters.type !== "all") + Number(filters.topic !== "all") + Number(activeFilter !== "all") + Number(Boolean(searchParams.get("q")));
  const selectedLabels = [
    filters.type !== "all" ? ({ need_help: "Need help", right_now: "Right now", buy_sell: "Buy & Sell", looking_for: "Looking for" }[filters.type] || WALL_FILTER_TYPES.find((item) => item.value === filters.type)?.label) : "",
    filters.topic !== "all" ? WALL_FILTER_TOPICS.find((item) => item.value === filters.topic)?.label : "",
  ].filter(Boolean);
  const feedTitle = selectedLabels.join(" \u00b7 ") || (activeFilter !== "all" ? HOME_FILTERS.find((item) => item.key === activeFilter)?.label : "For you");

  return (
    <div className="home-prototype-page">
      <section className="home-prototype-main" aria-label="Home feed">
        <HomeHeader
          activityCount={unreadActivityCount}
          countryCode={selectedCountryCode}
          location={feedLocation}
          locationOptions={locationOptions}
          onLocationChange={changeLocation}
          onNeedOpen={canPost ? () => setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("compose", "note");
            next.set("composeRequest", String(Date.now()));
            return next;
          }, { replace: true }) : undefined}
        />
        <StoriesRow currentUser={display} onStatusChange={setStatus} />
        <WallSeenTodayNotice />
        {canPost ? <PostComposer initialQuestion={searchParams.get("question")} key={user?.id || user?._id} onComposeOpened={consumeCompose} onPublished={handlePublished} defaultLocation={feedLocation || profileCity} currentUser={display} openSignal={composeSignal} /> : null}


        <WallExploreNeeds location={feedLocation} viewerId={String(user?.id || user?._id || "")} filters={filters} onSelect={(selection) => applyFilters({ ...filters, type: "all", topic: "all", ...selection })} />
        <div className="wall-feed-heading"><h2>{feedTitle}</h2><span>· {feedLocation || "Worldwide"}</span>{activeCount ? <button onClick={resetFilters} type="button">Clear</button> : null}</div>

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
