import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiRefreshCw, FiSearch, FiUserPlus } from "react-icons/fi";
import DiscoverMasonryCard from "../../components/discover/DiscoverMasonryCard";
import DiscoverPeopleSections from "../../components/discover/DiscoverPeopleSections";
import DiscoverRecommendationStory from "../../components/discover/DiscoverRecommendationStory";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import StoryViewer from "../../components/stories/StoryViewer";
import { useAuth } from "../../hooks/useAuth";
import {
  useDiscoverFollowMutation,
  useDiscoverSlidesQuery,
} from "../../hooks/useDiscoverQuery";
import { firstUnseenStoryIndex } from "../../utils/discoverFriends";
import { resolveMediaUrl } from "../../utils/media";

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
  return (
    <section className="discover-empty-panel" aria-live="polite">
      <span aria-hidden="true" />
      <h1>No recommendations</h1>
      <p>Refresh when more public creators are available for your preferences.</p>
      <button onClick={onRefresh} type="button">
        <FiRefreshCw aria-hidden="true" />
        Refresh
      </button>
    </section>
  );
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
  const viewerId = user?.id || user?._id || "";
  const queryParams = useMemo(() => ({ _viewerId: viewerId, filter: activeFilter, limit: 8 }), [activeFilter, viewerId]);
  const discoverQuery = useDiscoverSlidesQuery(queryParams);
  const followMutation = useDiscoverFollowMutation(queryParams);
  const sentinelRef = useRef(null);
  const storyHistoryPushedRef = useRef(false);
  const storyTriggerRef = useRef(null);
  const [storyViewer, setStoryViewer] = useState({ personId: null, index: 0 });
  const [activeRecommendationStory, setActiveRecommendationStory] = useState(null);

  const pages = useMemo(() => discoverQuery.data?.pages || [], [discoverQuery.data?.pages]);
  const firstPage = pages[0] || {};
  const recommendations = useMemo(() => dedupeByProfile(pages.flatMap((page) => page.recommendations || [])), [pages]);
  const filters = useMemo(() => (firstPage.filters || []).filter((filter) => SUPPORTED_FILTERS.has(filter.id)), [firstPage.filters]);
  const followingPeople = useMemo(
    () => dedupeByProfile((firstPage.following || []).filter((person) => String(person?.id || person?._id || "") !== String(viewerId || ""))).slice(0, 12),
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
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const refresh = useCallback(() => {
    discoverQuery.refetch();
  }, [discoverQuery]);

  const invite = useCallback(async () => {
    const url = typeof window === "undefined" ? "" : `${window.location.origin}/discover`;
    try {
      if (navigator.share) await navigator.share({ title: "@seen", text: "Find people worth seeing next on @seen.", url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("Discover link copied.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") showToast("Unable to share Discover right now.");
    }
  }, [showToast]);

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
    <div className="discover-orb-page">
      <section className="discover-orb-main" aria-label="Discover">
        {activeStoryPerson ? (
          <StoryViewer
            initialIndex={storyViewer.index}
            isOpen
            onClose={closeFriendStories}
            presentation="inline"
            stories={activeStoryPerson.stories || []}
          />
        ) : activeRecommendationStory ? (
          <DiscoverRecommendationStory
            card={activeRecommendationStory}
            followPending={followMutation.isPending}
            onClose={closeRecommendationStory}
            onFollow={toggleFollow}
          />
        ) : (
          <>
            <div className="discover-orb-toolbar">
              <span />
              <div>
                <Link aria-label="Search" className="discover-orb-icon" to="/search">
                  <FiSearch aria-hidden="true" />
                </Link>
                <button aria-label="Invite people" className="discover-orb-icon" onClick={invite} type="button">
                  <FiUserPlus aria-hidden="true" />
                </button>
              </div>
            </div>

            <DiscoverPeopleSections
              friends={followingStoryPeople}
              friendSectionTitle="Following"
              friendSectionSubtitle="People you already chose"
              following={[]}
              onOpenFollowingStories={openPersonStories}
              onOpenFriendStories={openPersonStories}
            />

            <p className="discover-orb-kicker">{"Discover \u2014 people worth seeing next"}</p>
            {firstPage.sharedWalks?.length ? <div className="mb-4 grid gap-2">{firstPage.sharedWalks.map((walk) => <Link className="flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-left" key={walk.id} to={`/world/${walk.world.id}`}><span className="text-xl">{walk.world.emoji}</span><span className="min-w-0"><b className="block truncate text-xs text-amber-200">You both walked {walk.world.title}</b><span className="block truncate text-[10px] text-atseen-muted">with {walk.person.name || `@${walk.person.username}`}</span></span></Link>)}</div> : null}
            {filters.length ? (
              <div className="discover-orb-filters" role="tablist" aria-label="Discover filters">
                {filters.map((filter) => (
                  <button
                    aria-selected={activeFilter === filter.id}
                    className={`discover-orb-chip ${activeFilter === filter.id ? "is-selected" : ""}`}
                    key={filter.id}
                    onClick={() => changeFilter(filter.id)}
                    role="tab"
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : null}

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
