import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import HomeHeader from "../../components/fanWeb/home/HomeHeader";
import PostComposer from "../../components/fanWeb/home/PostComposer";
import StoriesRow from "../../components/fanWeb/home/StoriesRow";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";
import { useAuth } from "../../hooks/useAuth";
import { useDiscoverQuery } from "../../hooks/useDiscoverQuery";
import { useFeedPosts, useMyFeedPosts } from "../../hooks/useFeedPosts";
import { profileService } from "../../services/profileService";
import { canCreateFeedPost } from "../../utils/postPermissions";

const HOME_LOCATION_KEY = "atseen_home_location";
const HOME_FILTERS = [
  { key: "all", label: "All" },
  { key: "right_now", label: "Right now" },
  { key: "places", label: "Places" },
  { key: "events", label: "Events" },
  { key: "things_to_do", label: "Things to do" },
  { key: "food", label: "Food" },
];

function uniqueList(items = []) {
  return items.map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, list) => list.indexOf(item) === index);
}

function creatorLocation(creator = {}) {
  return [creator.city || creator.location?.city, creator.country || creator.location?.country].filter(Boolean).join(", ");
}

function mergePosts(current = [], next = []) {
  const byId = new Map(current.map((post) => [post.id, post]));
  next.forEach((post) => byId.set(post.id, post));
  return [...byId.values()].sort((left, right) => new Date(right.feedCreatedAt || right.publishedAt || right.createdAt) - new Date(left.feedCreatedAt || left.publishedAt || left.createdAt));
}

function HomeFeedFilters({ activeFilter, onChange }) {
  return (
    <nav aria-label="Home feed filters" className="home-filter-strip">
      {HOME_FILTERS.map((filter) => (
        <button
          aria-pressed={activeFilter === filter.key}
          className={`home-filter-chip ${activeFilter === filter.key ? "is-selected" : ""}`}
          key={filter.key}
          onClick={() => onChange(filter.key)}
          type="button"
        >
          {filter.label}
        </button>
      ))}
    </nav>
  );
}

function SeenTodayLink({ count = 0 }) {
  if (!count) {
    return (
      <Link className="home-seen-today is-empty" to="/activity">
        No one has seen you today yet
      </Link>
    );
  }

  return (
    <Link className="home-seen-today" to="/activity">
      <strong>{count}</strong> saw you today <span aria-hidden="true">&gt;</span>
    </Link>
  );
}

function HomeEmptyState({ activeFilter }) {
  return (
    <section className="home-empty-state">
      <h2>No posts here yet.</h2>
      <p>{activeFilter === "all" ? "Follow creators or check Seen for published stories." : "Try All or another supported filter."}</p>
      <div>
        <Link to="/discover">Discover people</Link>
        <Link to="/seen">View Seen</Link>
      </div>
    </section>
  );
}

function FanHomePage() {
  const { status, setStatus } = useOutletContext();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const display = getUserDisplay(user, status);
  const requestedFilter = searchParams.get("filter") || "all";
  const composeSignal = searchParams.get("compose") === "note" ? "note" : "";
  const activeFilter = HOME_FILTERS.some((filter) => filter.key === requestedFilter) ? requestedFilter : "all";
  const requestedCity = searchParams.get("city") || "";
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (requestedCity) return requestedCity;
    if (typeof window === "undefined") return "";
    return localStorage.getItem(HOME_LOCATION_KEY) || "";
  });
  const [locationInitialized, setLocationInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [feedPosts, setFeedPosts] = useState([]);
  const sentinelRef = useRef(null);

  const profileQuery = useQuery({
    queryKey: ["profile", "me", "social-home"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    enabled: Boolean(user) && !authLoading,
    retry: false,
  });

  const profileCity = profileQuery.data?.profile?.city || display.location || "";
  const feedLocation = selectedLocation || "";
  const feedParams = useMemo(() => ({
    limit: 20,
    page,
    ...(activeFilter !== "all" ? { filter: activeFilter } : {}),
    ...(feedLocation ? { location: feedLocation } : {}),
  }), [activeFilter, feedLocation, page]);
  const feedQuery = useFeedPosts(feedParams);
  const canPost = canCreateFeedPost(user);
  const myPostsQuery = useMyFeedPosts({
    limit: 10,
    page: 1,
    ...(activeFilter !== "all" ? { filter: activeFilter } : {}),
  }, {
    enabled: Boolean(user) && !authLoading && canPost && Boolean(feedLocation),
  });

  const discoverParams = useMemo(() => ({ _viewerId: user?.id || user?._id || "", filter: "for_you", limit: 8 }), [user?.id, user?._id]);
  const discoverQuery = useDiscoverQuery(discoverParams);

  useEffect(() => {
    if (locationInitialized) return;
    if (selectedLocation || requestedCity) {
      setLocationInitialized(true);
      return;
    }
    if (profileCity) {
      setSelectedLocation(profileCity);
      setLocationInitialized(true);
    }
  }, [locationInitialized, profileCity, requestedCity, selectedLocation]);

  useEffect(() => {
    setPage(1);
    setFeedPosts([]);
  }, [activeFilter, feedLocation]);

  useEffect(() => {
    if (!feedQuery.data?.items) return;
    const ownLocationSafePosts = page === 1 && feedLocation ? myPostsQuery.data?.items || [] : [];
    const nextItems = mergePosts(feedQuery.data.items, ownLocationSafePosts);
    setFeedPosts((current) => (page === 1 ? nextItems : mergePosts(current, feedQuery.data.items)));
  }, [feedLocation, feedQuery.data?.items, myPostsQuery.data?.items, page]);

  useEffect(() => {
    const target = sentinelRef.current;
    const pagination = feedQuery.data?.pagination;
    if (!target || !pagination || page >= pagination.pages) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !feedQuery.isFetching) setPage((current) => current + 1);
    }, { rootMargin: "420px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [feedQuery.data?.pagination, feedQuery.isFetching, page]);

  const recommendations = useMemo(() => discoverQuery.data?.recommendations || [], [discoverQuery.data?.recommendations]);
  const suggestedUsers = useMemo(() => {
    if (discoverQuery.data?.suggestedUsers?.length) return discoverQuery.data.suggestedUsers;
    return recommendations.filter((card) => !(card.isFollowing || card.following || card.actions?.following)).slice(0, 4);
  }, [discoverQuery.data?.suggestedUsers, recommendations]);
  const seenTodayCount = Number(discoverQuery.data?.seenTodayCount || discoverQuery.data?.activity?.seenTodayCount || 0);
  const locationOptions = useMemo(() => uniqueList([
    profileCity,
    display.location,
    ...feedPosts.map((post) => post.location),
    ...suggestedUsers.map(creatorLocation),
    ...recommendations.map(creatorLocation),
  ]), [display.location, feedPosts, profileCity, recommendations, suggestedUsers]);
  const loading = profileQuery.isLoading || (feedQuery.isLoading && page === 1);

  const changeFilter = useCallback((filterKey) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (filterKey === "all") next.delete("filter");
      else next.set("filter", filterKey);
      return next;
    }, { replace: true });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [setSearchParams]);

  const changeLocation = useCallback((location) => {
    setSelectedLocation(location);
    setLocationInitialized(true);
    if (typeof window !== "undefined") {
      if (location) localStorage.setItem(HOME_LOCATION_KEY, location);
      else localStorage.removeItem(HOME_LOCATION_KEY);
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (location) next.set("city", location);
      else next.delete("city");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const clearComposeSignal = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("compose");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="home-prototype-page">
      <section className="home-prototype-main" aria-label="Home feed">
        <HomeHeader
          activityCount={Number(discoverQuery.data?.activity?.count || 0)}
          location={feedLocation}
          locationOptions={locationOptions}
          onLocationChange={changeLocation}
        />
        <StoriesRow currentUser={display} onStatusChange={setStatus} />
        <HomeFeedFilters activeFilter={activeFilter} onChange={changeFilter} />
        <SeenTodayLink count={seenTodayCount} />
        {canPost ? <PostComposer currentUser={display} onComposeOpened={clearComposeSignal} onStatusChange={setStatus} openSignal={composeSignal} status={status} /> : null}

        {loading ? <LoadingSkeleton className="h-20" count={4} /> : null}
        {feedQuery.isError ? (
          <section className="home-feed-error" role="alert">
            <p>Unable to load posts from the database.</p>
            <button onClick={() => feedQuery.refetch()} type="button">Retry</button>
          </section>
        ) : null}
        {!loading && !feedQuery.isError && !feedPosts.length ? <HomeEmptyState activeFilter={activeFilter} /> : null}
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
