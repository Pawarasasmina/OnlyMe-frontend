/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import WallExploreNeeds from "../../components/fanWeb/home/WallExploreNeeds";
import { prependCreatedWallPosts } from "../../utils/wallCreatedPosts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { DEFAULT_WALL_FILTERS, WALL_FILTER_TYPES, WALL_FILTER_TOPICS } from "../../data/wallFilters";
import { mergeWallPages, readWallFilters, writeWallFilters, wallFilterValues } from "../../utils/wallFilters";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import WallCategoryRow from "../../components/fanWeb/home/WallCategoryRow";
import WallMarketplaceTile from "../../components/fanWeb/home/WallMarketplaceTile";
import WallViewSwitch from "../../components/fanWeb/home/WallViewSwitch";
import { useWallViewPreference } from "../../hooks/useWallViewPreference";
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
import { postService } from "../../services/postService";
import { profileService } from "../../services/profileService";
import { canCreateFeedPost } from "../../utils/postPermissions";
import WallEmptyState from "../../components/fanWeb/home/WallEmptyState";
import { wallHaptic } from "../../utils/wallHaptics";
import { activeWallPosts } from "../../utils/wallLifecycle";
import { useWallLifecycleClock } from "../../hooks/useWallLifecycleClock";
import { wallExpiryPrompt } from "../../utils/wallLifetimePresentation";

const HOME_FILTERS = [
  { key: "all", get label() { return __msg("fanWeb.all"); } },
  { key: "right_now", get label() { return __msg("constants.rightNow"); } },
  { key: "places", get label() { return __msg("data.places"); } },
  { key: "events", get label() { return __msg("data.events"); } },
  { key: "things_to_do", get label() { return __msg("fan.thingsToDo"); } },
  { key: "food", get label() { return __msg("fanWeb.food"); } },
  { key: "travel", get label() { return __msg("data.travel"); } },
  { key: "business", get label() { return __msg("profile.business"); } },
  { key: "fitness", get label() { return __msg("fan.fitness"); } },
  { key: "beauty", get label() { return __msg("fan.beauty"); } },
  { key: "family", get label() { return __msg("fan.family"); } },
  { key: "shopping", get label() { return __msg("fan.shopping"); } },
  { key: "advice", get label() { return __msg("fan.advice"); } },
];

function uniqueList(items = []) {
  return items.map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, list) => list.indexOf(item) === index);
}

function creatorLocation(creator = {}) {
  return [creator.city || creator.location?.city, creator.country || creator.location?.country].filter(Boolean).join(", ");
}

function FanHomePage() {
  __useUiLanguage();
  const { status, setStatus } = useOutletContext();
  const navigation = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { view, setView } = useWallViewPreference();
  const unreadActivityCount = useUnreadActivityCount(Boolean(user));
  const [searchParams, setSearchParams] = useSearchParams();
  const display = getUserDisplay(user, status);
  const requestedFilter = searchParams.get("filter") || "all";
  const composeSignal = searchParams.get("compose") === "note"
    ? searchParams.get("composeRequest") || "note"
    : "";
  const consumeCompose = useCallback(() => setSearchParams((current) => {
    const next = new URLSearchParams(current); next.delete("compose"); next.delete("composeRequest"); next.delete("question"); next.delete("composeType"); next.delete("composeTopic"); next.delete("composeRightNow"); return next;
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
  const noteId = searchParams.get("note") || "";
  useEffect(() => {
    if (!/^[a-f0-9]{24}$/i.test(noteId)) return;
    const returnParams = new URLSearchParams(searchParams); returnParams.delete("note");
    navigate(`/posts/${noteId}`, { replace: true, state: { wallReturnTo: `/wall${returnParams.size ? `?${returnParams}` : ""}` } });
  }, [noteId, navigate, searchParams]);
  const focusedNote = useQuery({
    queryKey: ["wall-note", noteId],
    queryFn: () => postService.getPost(noteId),
    enabled: false,
    retry: false,
  });
  const lifecycleNow = useWallLifecycleClock([...feedState.items, ...(createdQuery.data?.items || []), ...(focusedNote.data ? [focusedNote.data] : [])]);
  const feedPosts = useMemo(() => {
    const items = feedState.scope === queryScope ? feedState.items : [];
    const selection = JSON.parse(queryScope);
    const unfiltered = selection.filter === "all" && Object.entries(DEFAULT_WALL_FILTERS).every(([key, value]) => selection[key] === value);
    const list = unfiltered ? prependCreatedWallPosts(items, createdQuery.data?.items || []) : items;
    const selected = focusedNote.data;
    if (!selected?.id) return activeWallPosts(list, lifecycleNow);
    return activeWallPosts([selected, ...list.filter(item => String(item.originalPostId || item.id) !== String(selected.id))], lifecycleNow);
  }, [feedState, queryScope, createdQuery.data, focusedNote.data, lifecycleNow]);
  const sentinelRef = useRef(null);
  const mainRef = useRef(null);
  const heldHeight = useRef(0);

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
    matchMode: "any",
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
    const restoreScroll = { content: document.querySelector(".social-center-scroll")?.scrollTop || 0, window: window.scrollY };
    // Preserve the tapped icon's position even when the filtered list is shorter.
    if (mainRef.current) {
      heldHeight.current = Math.max(heldHeight.current, mainRef.current.offsetHeight);
      mainRef.current.style.minHeight = `${heldHeight.current}px`;
    }
    setSearchParams((current) => {
      const next = writeWallFilters(current, nextFilters);
      if (current.has("country")) next.set("country", current.get("country"));
      return next;
    }, { replace: true, state: { restoreScroll, scrollToWallFeed: nextFilters.rightNow || nextFilters.type !== "all" || nextFilters.topic !== "all" } });
  }, [setSearchParams]);

  const resetFilters = () => {
    wallHaptic();
    const restoreScroll = { content: document.querySelector(".social-center-scroll")?.scrollTop || 0, window: window.scrollY };
    if (mainRef.current) {
      heldHeight.current = Math.max(heldHeight.current, mainRef.current.offsetHeight);
      mainRef.current.style.minHeight = `${heldHeight.current}px`;
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["note", "type", "topic", "rightNow", "filter", "q"]) next.delete(key);
      return next;
    }, { replace: true, state: { restoreScroll } });
  };
  const changeView = next => {
    if (view === next) return;
    wallHaptic();
    if (mainRef.current) {
      heldHeight.current = Math.max(heldHeight.current, mainRef.current.offsetHeight);
      mainRef.current.style.minHeight = `${heldHeight.current}px`;
    }
    setView(next);
  };
  const changeLocation = useCallback((location, countryCode = "") => {
    setSearchParams((current) => {
      const next = writeWallFilters(current, { ...readWallFilters(current), location, near: location.split(",")[0].trim(), scope: location ? "custom" : "worldwide", sort: !location && readWallFilters(current).sort === "nearby" ? "recent" : readWallFilters(current).sort });
      if (countryCode) next.set("country", countryCode);
      else next.delete("country");
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const selectedTypes = wallFilterValues(filters, "type");
  const selectedTopics = wallFilterValues(filters, "topic");
  const activeCount = Number(filters.rightNow) + selectedTypes.length + selectedTopics.length + Number(activeFilter !== "all") + Number(Boolean(searchParams.get("q")));
  const compactNotes = filters.type !== "all" || filters.topic !== "all" || filters.rightNow || activeFilter !== "all";
  const selectedLabels = [
    filters.rightNow ? __msg("constants.rightNow") : "",
    selectedTopics.includes("meet_people") ? __msg("wallNeeds.company") : "",
    ...["need_help", "looking_for", "buy_sell", "recommendation", "offering", "question", "event"].filter(key => selectedTypes.includes(key)).map(key => ({ need_help: __msg("fanWeb.needHelp"), recommendation: __msg("wallNeeds.tips"), buy_sell: __msg("fanWeb.buySell"), looking_for: __msg("fanWeb.lookingFor") }[key] || WALL_FILTER_TYPES.find(item => item.value === key)?.label)),
    ...WALL_FILTER_TOPICS.filter(item => item.value !== "meet_people" && selectedTopics.includes(item.value)).map(item => item.label),
  ].filter(Boolean);
  const feedTitle = selectedLabels.join(" \u00b7 ") || (activeFilter !== "all" ? HOME_FILTERS.find((item) => item.key === activeFilter)?.label : __msg("fan.forYou"));

  return (
    <div className="home-prototype-page">
      <section className="home-prototype-main" ref={mainRef} aria-label={__msg("fan.homeFeed")}>
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
        {canPost ? <PostComposer initialQuestion={searchParams.get("question")} initialType={searchParams.get("composeType")} initialTopic={searchParams.get("composeTopic")} initialRightNow={searchParams.get("composeRightNow") === "true"} key={user?.id || user?._id} onComposeOpened={consumeCompose} onPublished={handlePublished} defaultLocation={feedLocation || profileCity} currentUser={display} openSignal={composeSignal} /> : null}


        <WallExploreNeeds location={feedLocation} viewerId={String(user?.id || user?._id || "")} filters={filters} onSelect={applyFilters} />
        <div className="wall-feed-heading"><h2 title={feedTitle}>{feedTitle}</h2>{!selectedLabels.length ? <span>· {feedLocation || __msg("fanWeb.worldwide")}</span> : null}{activeCount ? <button onClick={resetFilters} type="button">{__msg("fan.clear")}</button> : null}<WallViewSwitch view={view} onChange={changeView} /></div>

        {loading ? <WallFeedSkeleton /> : null}
        {feedQuery.isError && page === 1 ? (
          <section className="home-feed-error" role="alert">
            <p>{__msg("fan.unableToLoadPostsFromTheDatabase")}</p>
            <button onClick={() => feedQuery.refetch()} type="button">{__msg("activity.retry")}</button>
          </section>
        ) : null}
        {!loading && feedQuery.isSuccess && feedState.scope === queryScope && !feedPosts.length ? <WallEmptyState
          location={feedLocation}
          type={filters.type}
          label={selectedLabels.length || activeFilter !== "all" ? feedTitle : ""}
          filtered={Boolean(activeCount)}
          canPost={canPost}
          onClear={resetFilters}
          onWorldwide={() => changeLocation("")}
          onWrite={() => setSearchParams(current => {
            const next = new URLSearchParams(current);
            const postType = { buy_sell: "Buy & Sell", looking_for: "Looking for", offering: "Offering", need_help: "Need Help", question: "Question", recommendation: "Recommendation", event: "Event", right_now: "Right Now" }[filters.type];
            next.set("compose", "note");
            next.set("composeRequest", String(Date.now()));
            if (postType) next.set("composeType", postType);
            if (filters.rightNow) next.set("composeRightNow", "true");
            const topic = WALL_FILTER_TOPICS.find(item => item.value === filters.topic);
            if (topic && filters.topic !== "all") next.set("composeTopic", topic.label);
            return next;
          }, { replace: true })}
        /> : null}
        <div aria-busy={loading ? "true" : "false"} className={`home-feed-list${view === "grid" ? " wall-market-grid" : ""}`}>
          {feedPosts.map((post) => (post.isOwner || String(post.author?.id || post.author?._id || post.author) === String(user?.id || user?._id)) && wallExpiryPrompt(post, lifecycleNow)
            ? <div className="wall-expiry-note" key={post.id}><FeedPost post={post} /></div>
            : view === "grid"
            ? <WallMarketplaceTile key={post.id} post={post} location={feedLocation} hideCategory={selectedTypes.length === 1 && !selectedTopics.length && !filters.rightNow} />
            : compactNotes
            ? <WallCategoryRow key={post.id} post={post} hideCategory={selectedTypes.length === 1 && !selectedTopics.length && !filters.rightNow} />
            : <FeedPost key={post.id} post={post} />)}
        </div>
        <div className="home-feed-sentinel" ref={sentinelRef}>
          {feedQuery.isError && page > 1 ? <section className="home-feed-error" role="alert"><p>{__msg("wallFeed.moreError")}</p><button onClick={() => feedQuery.refetch()} type="button">{__msg("activity.retry")}</button></section> : null}
          {feedQuery.isFetching && page > 1 ? <LoadingSkeleton className="h-16" count={1} /> : null}
          {!feedQuery.isFetching && !feedQuery.isError && feedQuery.data?.pagination?.pages > page ? <button className="wall-load-more" onClick={() => setCursor({ scope: queryScope, page: page + 1 })} type="button">{__msg("wallFeed.loadMore")}</button> : null}
        </div>
      </section>

    </div>
  );
}

export default FanHomePage;
