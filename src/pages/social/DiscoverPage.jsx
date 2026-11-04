import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiChevronRight, FiRefreshCw, FiSearch, FiUserPlus } from "react-icons/fi";
import DiscoverMasonryCard from "../../components/discover/DiscoverMasonryCard";
import DiscoverPeopleSections from "../../components/discover/DiscoverPeopleSections";
import DiscoverRecommendationStory from "../../components/discover/DiscoverRecommendationStory";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import ContentEmptyState from "../../components/shared/ContentEmptyState";
import { useAuth } from "../../hooks/useAuth";
import {
  useDiscoverFollowMutation,
  useDiscoverSlidesQuery,
} from "../../hooks/useDiscoverQuery";
import { firstUnseenStoryIndex } from "../../utils/discoverFriends";
import { resolveMediaUrl } from "../../utils/media";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";

const DEFAULT_FILTER = "for_you";
const SUPPORTED_FILTERS = new Set(["for_you", "nearby", "rising", "new", "creators"]);
function dedupeByProfile(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id || item.username || item.creator?.id || item.creator?.username;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function DiscoverSkeleton() {
  return (
    <div className="discover-orb-loading" aria-label="Loading Discover">
      <div className="discover-skeleton-top">
        <span />
        <span />
        <span />
      </div>
      <div className="discover-skeleton-friends">
        {Array.from({ length: 4 }).map((_, index) => <span key={index} />)}
      </div>
      <div className="discover-orb-grid">
        {Array.from({ length: 6 }).map((_, index) => <span className="discover-card-skeleton" key={index} />)}
      </div>
    </div>
  );
}

function DiscoverEmpty({ onRefresh }) {
  return <ContentEmptyState message="You’re caught up for now. Refresh suggestions or search for someone you already know." primaryAction={{ label: "Refresh suggestions", onClick: onRefresh }} secondaryAction={{ label: "Search people", to: "/search?from=discover" }} title="No recommendations yet" variant="discover" />;
}

function DiscoverError({ error, onRetry }) {
  return (
    <section className="discover-empty-panel is-error" role="alert">
      <h1>We could not load Discover.</h1>
      <p>{error?.response?.data?.message || error?.message || "Something went wrong while loading recommendations."}</p>
      <button onClick={onRetry} type="button">
        <FiRefreshCw aria-hidden="true" />
        Retry
      </button>
    </section>
  );
}

function DiscoverPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useFanToast();
  const requestedFilter = searchParams.get("filter") || DEFAULT_FILTER;
  const activeFilter = SUPPORTED_FILTERS.has(requestedFilter) ? requestedFilter : DEFAULT_FILTER;
  const activeTopic = searchParams.get("topic") || "";
  const viewerId = user?.id || user?._id || "";
  const [refreshToken, setRefreshToken] = useState(() => `${Date.now()}-${Math.random()}`);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStart = useRef(null);
  const queryParams = useMemo(() => ({ _viewerId: viewerId, filter: activeFilter, limit: 8, refreshToken, topic: activeTopic || undefined, view: "slides" }), [activeFilter, activeTopic, refreshToken, viewerId]);
  const discoverQuery = useDiscoverSlidesQuery(queryParams);
  const followMutation = useDiscoverFollowMutation(queryParams);
  const sentinelRef = useRef(null);
  const storyHistoryPushedRef = useRef(false);
  const storyTriggerRef = useRef(null);
  const [storyViewer, setStoryViewer] = useState({ personId: null, index: 0 });
  const [activeRecommendationStory, setActiveRecommendationStory] = useState(null);

  const pages = useMemo(() => discoverQuery.data?.pages || [], [discoverQuery.data?.pages]);
  const firstPage = pages[0] || {};
  const topicChips = firstPage.topicChips || [];
  const localTonight = firstPage.localTonight || null;
  const recommendations = useMemo(() => dedupeByProfile(pages.flatMap((page) => page.recommendations || [])).sort((left, right) => Number(String(right.creator?.status || right.status || "").toLowerCase() === "at seen") - Number(String(left.creator?.status || left.status || "").toLowerCase() === "at seen")), [pages]);
  const followingPeople = useMemo(
    () => dedupeByProfile((firstPage.following || []).filter((person) => String(person?.id || person?._id || "") !== String(viewerId || ""))),
    [firstPage.following, viewerId],
  );
  const followingStoryPeople = useMemo(
    () => followingPeople.filter((person) => Array.isArray(person.stories) && person.stories.length > 0),
    [followingPeople],
  );
  const activeStoryPerson = useMemo(
    () => followingStoryPeople.find((person) => person.id === storyViewer.personId),
    [followingStoryPeople, storyViewer.personId],
  );

  const changeFilter = useCallback((filterId) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (filterId === DEFAULT_FILTER) next.delete("filter");
      else next.set("filter", filterId);
      next.delete("topic");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const changeTopic = useCallback((topicId) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("filter");
      if (topicId && topicId !== activeTopic) next.set("topic", topicId);
      else next.delete("topic");
      return next;
    }, { replace: true });
  }, [activeTopic, setSearchParams]);

  const refresh = useCallback(() => {
    setRefreshToken(`${Date.now()}-${Math.random()}`);
  }, []);

  useEffect(() => {
    const onNavigationClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a");
      if (!link || new URL(link.href, window.location.origin).pathname !== "/discover") return;
      event.preventDefault();
      refresh();
      sentinelRef.current?.closest(".social-center-scroll")?.scrollTo({ top: 0, behavior: "auto" });
      showToast("Fresh picks");
    };
    document.addEventListener("click", onNavigationClick, true);
    return () => document.removeEventListener("click", onNavigationClick, true);
  }, [refresh, showToast]);

  const startPull = (event) => {
    const scrollRoot = event.currentTarget.closest(".social-center-scroll");
    if ((scrollRoot?.scrollTop || 0) <= 0) pullStart.current = event.touches?.[0]?.clientY ?? null;
  };
  const movePull = (event) => {
    if (pullStart.current == null) return;
    setPullDistance(Math.max(0, Math.min(110, (event.touches?.[0]?.clientY || 0) - pullStart.current)));
  };
  const endPull = () => {
    if (pullDistance >= 72 && !discoverQuery.isFetching) refresh();
    pullStart.current = null;
    setPullDistance(0);
  };

  const toggleFollow = useCallback((person) => {
    if (!person?.username) return;
    followMutation.mutate(person, {
      onError: (error) => showToast(error?.response?.data?.message || "Unable to update follow."),
    });
  }, [followMutation, showToast]);

  const closeFriendStories = useCallback(({ fromPop = false } = {}) => {
    setStoryViewer({ personId: null, index: 0 });
    window.setTimeout(() => storyTriggerRef.current?.focus?.(), 0);
    if (!fromPop && storyHistoryPushedRef.current) {
      storyHistoryPushedRef.current = false;
      window.history.back();
    }
  }, []);

  const openPersonStories = useCallback((person, trigger) => {
    if (!person?.stories?.length) return;
    setActiveRecommendationStory(null);
    storyTriggerRef.current = trigger;
    setStoryViewer({ personId: person.id, index: firstUnseenStoryIndex(person) });
    if (!storyHistoryPushedRef.current && typeof window !== "undefined") {
      window.history.pushState({ atseenDiscoverStory: true }, "", window.location.href);
      storyHistoryPushedRef.current = true;
    }
  }, []);

  const openRecommendationStory = useCallback((index) => {
    setStoryViewer({ personId: null, index: 0 });
    setActiveRecommendationStory(recommendations[index] || null);
  }, [recommendations]);

  useEffect(() => {
    if (!activeRecommendationStory) return;
    const stillExists = recommendations.find((card) => (card.id || card.username) === (activeRecommendationStory.id || activeRecommendationStory.username));
    if (stillExists && stillExists !== activeRecommendationStory) setActiveRecommendationStory(stillExists);
  }, [activeRecommendationStory, recommendations]);

  const closeRecommendationStory = useCallback(() => {
    setActiveRecommendationStory(null);
  }, []);

  const moveRecommendationStory = useCallback((direction) => {
    const currentIndex = recommendations.findIndex((card) => (card.id || card.username) === (activeRecommendationStory?.id || activeRecommendationStory?.username));
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= recommendations.length) {
      if (discoverQuery.hasNextPage && !discoverQuery.isFetchingNextPage) discoverQuery.fetchNextPage();
      else if (!discoverQuery.hasNextPage) setActiveRecommendationStory(null);
      return;
    }
    setActiveRecommendationStory(recommendations[nextIndex]);
  }, [activeRecommendationStory, discoverQuery, recommendations]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !discoverQuery.hasNextPage) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !discoverQuery.isFetchingNextPage) discoverQuery.fetchNextPage();
    }, { rootMargin: "520px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [discoverQuery]);

  useEffect(() => {
    const nextCard = recommendations[recommendations.length - 1];
    const src = resolveMediaUrl(nextCard?.coverImage || nextCard?.media?.url);
    if (!src || typeof Image === "undefined") return;
    const image = new Image();
    image.src = src;
  }, [recommendations]);

  useEffect(() => {
    if (!storyViewer.personId) return undefined;
    const onPopState = () => {
      if (storyHistoryPushedRef.current) {
        storyHistoryPushedRef.current = false;
        closeFriendStories({ fromPop: true });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeFriendStories, storyViewer.personId]);

  if (discoverQuery.isLoading) {
    return (
      <div className="discover-orb-page">
        <section className="discover-orb-main"><DiscoverSkeleton /></section>
      </div>
    );
  }

  if (discoverQuery.isError) {
    return (
      <div className="discover-orb-page">
        <section className="discover-orb-main">
          <DiscoverError error={discoverQuery.error} onRetry={refresh} />
        </section>
      </div>
    );
  }

  return (
    <div className="discover-orb-page" onTouchCancel={endPull} onTouchEnd={endPull} onTouchMove={movePull} onTouchStart={startPull}>
      {pullDistance > 0 ? <div aria-live="polite" className="flex items-center justify-center py-2 text-xs font-bold text-atseen-muted" style={{ height: pullDistance / 2 }}>{pullDistance >= 72 ? "Release for fresh recommendations" : "Pull for fresh recommendations"}</div> : null}
      <section className="discover-orb-main" aria-label="Discover">
        {activeStoryPerson ? (
          <DiscoverRecommendationStory
            key={activeStoryPerson.id}
            card={activeStoryPerson}
            initialIndex={storyViewer.index}
            onClose={closeFriendStories}
            onNext={() => {
              const next = followingStoryPeople[followingStoryPeople.indexOf(activeStoryPerson) + 1];
              if (next) setStoryViewer({ personId: next.id, index: firstUnseenStoryIndex(next) });
              else closeFriendStories();
            }}
            onPrevious={() => {
              const previous = followingStoryPeople[followingStoryPeople.indexOf(activeStoryPerson) - 1];
              if (previous) setStoryViewer({ personId: previous.id, index: 0 });
            }}
          />
        ) : activeRecommendationStory ? (
          <DiscoverRecommendationStory
            key={activeRecommendationStory.userId || activeRecommendationStory.id}
            card={activeRecommendationStory}
            followPending={followMutation.isPending}
            onClose={closeRecommendationStory}
            onFollow={toggleFollow}
            onNext={() => moveRecommendationStory(1)}
            onPrevious={() => moveRecommendationStory(-1)}
            position={recommendations.findIndex((card) => (card.id || card.username) === (activeRecommendationStory.id || activeRecommendationStory.username)) + 1}
            total={recommendations.length}
          />
        ) : (
          <>
            <div className="discover-orb-toolbar">
              <h1>Discover</h1>
              <div>
                <Link aria-label="Search" className="discover-orb-icon" to="/search?from=discover">
                  <FiSearch aria-hidden="true" />
                </Link>
                <Link aria-label="Find people" className="discover-orb-icon" to="/search?from=discover">
                  <FiUserPlus aria-hidden="true" />
                </Link>
              </div>
            </div>

            <DiscoverPeopleSections
              friends={followingPeople}
              friendSectionTitle="Following"
              following={[]}
              onOpenFollowingStories={openPersonStories}
              onOpenFriendStories={openPersonStories}
            />

            {localTonight ? (
              <Link className="discover-dubai-today" to={localTonight.route || `/search?location=${encodeURIComponent(localTonight.city || "")}`}>
                <span className="discover-dubai-avatars" aria-hidden="true">
                  {(localTonight.avatars || []).map((person) => <FanAvatar key={person.id} name={person.name} size="h-10 w-10" src={person.avatar} />)}
                </span>
                <span className="discover-dubai-copy"><strong><i />{localTonight.title}</strong><small>{localTonight.subtitle}</small></span>
                <FiChevronRight aria-hidden="true" />
              </Link>
            ) : null}

            <div className="discover-recommendation-heading">
              <h2>People worth seeing next</h2>
              <div className="discover-orb-filters" role="group" aria-label="Discover filters">
                {[{ id: "for_you", label: "For you" }, { id: "nearby", label: "Nearby" }].map((filter) => (
                  <button
                    aria-pressed={!activeTopic && activeFilter === filter.id}
                    className={`discover-orb-chip ${!activeTopic && activeFilter === filter.id ? "is-selected" : ""}`}
                    key={filter.id}
                    onClick={() => changeFilter(filter.id)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
                {topicChips.map((topic) => <button aria-pressed={activeTopic === topic.id} className={`discover-orb-chip ${activeTopic === topic.id ? "is-selected" : ""}`} key={topic.id} onClick={() => changeTopic(topic.id)} type="button">{topic.label}</button>)}
              </div>
            </div>

            {recommendations.length ? (
              <>
                <div className="discover-orb-grid">
                  {recommendations.map((card, index) => (
                    <DiscoverMasonryCard card={card} index={index} key={card.id || card.username} onOpen={openRecommendationStory} />
                  ))}
                </div>
                <div className="discover-next-sentinel" ref={sentinelRef}>
                  {discoverQuery.isFetchingNextPage ? <FiRefreshCw aria-hidden="true" className="animate-spin" /> : null}
                </div>
              </>
            ) : (
              <DiscoverEmpty onRefresh={refresh} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default DiscoverPage;
