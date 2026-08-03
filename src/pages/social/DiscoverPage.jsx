import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiHeart, FiMessageCircle, FiMoreHorizontal, FiSearch, FiUserPlus } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import {
  CategoryCard,
  DiscoverCreatorCard,
  DiscoverEmpty,
  DiscoverError,
  DiscoverFilters,
  DiscoverHeader,
  DiscoverSection,
  DiscoverSkeleton,
  ExperienceCard,
  FeaturedCreatorCard,
  StoryStrip,
  WorldCard,
} from "../../components/discover/DiscoverCards";
import DiscoverSettingsModal from "../../components/discover/DiscoverSettingsModal";
import { compactNumber } from "../../components/discover/discoverFormat";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import {
  useDiscoverFollowMutation,
  useDiscoverQuery,
  useDiscoverSettingsMutation,
  useResetDiscoverSettings,
} from "../../hooks/useDiscoverQuery";
import { resolveMediaUrl } from "../../utils/media";

const FILTERS = [
  "All", "Nearby", "Trending", "Rising", "New", "Friends", "Photography", "Travel",
  "Fitness", "Food", "Music", "Gaming", "Fashion", "Art", "Business", "Technology",
  "Lifestyle", "Education", "Sports", "Pets", "Comedy",
];

function useDebouncedValue(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function uniqueCreators(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const creator of list || []) {
      if (creator?.username && !map.has(creator.username)) map.set(creator.username, creator);
    }
  }
  return Array.from(map.values());
}

function creatorMatchesFilter(creator, active) {
  if (["All", "Trending", "Rising", "New", "Nearby", "Friends"].includes(active)) return true;
  return [creator.category, ...(creator.tags || [])].some((tag) => tag?.toLowerCase() === active.toLowerCase());
}

function creatorMatchesSearch(creator, query) {
  if (!query) return true;
  const haystack = [creator.name, creator.username, creator.category, creator.location, creator.bio, ...(creator.tags || [])].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function worldMatchesSearch(world, query) {
  if (!query) return true;
  const haystack = [world.title, world.category, world.preview, world.owner?.name, world.owner?.username].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function mediaUrl(creator) {
  return resolveMediaUrl(creator.cover || creator.previewThumbnails?.[0] || creator.avatar || "");
}

function DiscoverMosaicCard({ creator, followPending, onFollow }) {
  const background = mediaUrl(creator);
  return (
    <article className="discover-mosaic-card group">
      {background ? <img alt="" loading="lazy" src={background} /> : <div className="discover-mosaic-fallback">{creator.name.slice(0, 1)}</div>}
      <div className="discover-mosaic-shade" />
      {creator.updatedAt ? <span className="discover-live-dot" /> : null}
      <button aria-label={`More options for ${creator.name}`} className="discover-more" type="button"><FiMoreHorizontal /></button>
      <div className="discover-card-copy">
        <Link className="discover-card-name" to={`/profile/${encodeURIComponent(creator.username)}`}>
          {creator.name.split(" ")[0]}{creator.verified ? <VerifiedBadge /> : null}
        </Link>
        <p>{creator.category || "Creator"} · {creator.location?.split(",")[0] || "Global"}</p>
        <strong>{creator.whyRecommended || "Similar interests"}</strong>
      </div>
      <div className="discover-card-actions">
        <button aria-label={creator.following ? `Unfollow ${creator.name}` : `Follow ${creator.name}`} className={creator.following ? "is-on" : ""} disabled={followPending} onClick={() => onFollow(creator)} type="button">
          <span><FiUserPlus /></span><i>{creator.following ? "Following" : "Follow"}</i>
        </button>
        <Link aria-label={`Message ${creator.name}`} to={`/messages?user=${encodeURIComponent(creator.username)}`}>
          <span><FiMessageCircle /></span><i>Message</i>
        </Link>
        <Link aria-label={`View ${creator.name}`} to={`/profile/${encodeURIComponent(creator.username)}`}>
          <span><FiEye /></span><i>Profile</i>
        </Link>
      </div>
    </article>
  );
}

function DiscoverPrototypeMosaic({ creators, followPending, onFollow }) {
  if (!creators.length) return null;
  return (
    <section className="discover-prototype" aria-label="People worth seeing next">
      <div className="discover-prototype-top">
        <div>
          <span>Discover</span>
          <p>people worth seeing next</p>
        </div>
        <button aria-label="Search Discover" type="button"><FiSearch /></button>
      </div>
      <div className="discover-prototype-grid">
        {creators.slice(0, 6).map((creator) => (
          <DiscoverMosaicCard creator={creator} followPending={followPending} key={creator.username} onFollow={onFollow} />
        ))}
      </div>
    </section>
  );
}

function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = FILTERS.includes(searchParams.get("filter")) ? searchParams.get("filter") : "All";
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const queryParams = useMemo(() => ({ search: debouncedSearch || undefined }), [debouncedSearch]);
  const discoverQuery = useDiscoverQuery(queryParams);
  const followMutation = useDiscoverFollowMutation(queryParams);
  const settingsMutation = useDiscoverSettingsMutation(queryParams);
  const resetMutation = useResetDiscoverSettings(queryParams);
  const { showToast } = useFanToast();
  const data = discoverQuery.data || {};

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const current = searchParams.get("filter") || "All";
    if (current === activeFilter) return;
    if (activeFilter === "All") next.delete("filter");
    else next.set("filter", activeFilter);
    setSearchParams(next, { replace: true });
  }, [activeFilter, searchParams, setSearchParams]);

  const allCreators = useMemo(() => uniqueCreators(
    data.featuredCreators,
    data.recommendedCreators,
    data.risingCreators,
    data.nearbyCreators,
    data.newCreators,
    data.friendsOfFriends,
  ), [data.featuredCreators, data.friendsOfFriends, data.nearbyCreators, data.newCreators, data.recommendedCreators, data.risingCreators]);

  const activeCreators = useMemo(() => {
    const base = activeFilter === "Nearby" ? data.nearbyCreators || []
      : activeFilter === "Trending" || activeFilter === "Rising" ? data.risingCreators || []
        : activeFilter === "New" ? data.newCreators || []
          : activeFilter === "Friends" ? data.friendsOfFriends || []
            : allCreators;
    return base.filter((creator) => creatorMatchesFilter(creator, activeFilter) && creatorMatchesSearch(creator, debouncedSearch));
  }, [activeFilter, allCreators, data.friendsOfFriends, data.nearbyCreators, data.newCreators, data.risingCreators, debouncedSearch]);

  const worlds = useMemo(() => (data.popularWorlds || []).filter((world) => worldMatchesSearch(world, debouncedSearch)), [data.popularWorlds, debouncedSearch]);
  const recommendedWorlds = useMemo(() => (data.recommendedWorlds?.length ? data.recommendedWorlds : worlds).filter((world) => worldMatchesSearch(world, debouncedSearch)), [data.recommendedWorlds, debouncedSearch, worlds]);
  const featuredExperiences = useMemo(() => (data.featuredExperiences || []).filter((item) => worldMatchesSearch(item, debouncedSearch)), [data.featuredExperiences, debouncedSearch]);
  const recentlyActive = useMemo(() => [...activeCreators].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0)).slice(0, 12), [activeCreators]);
  const becauseTopic = (data.settings?.topics || []).find((topic) => topic.preference === "interested")?.label || data.interestTags?.[0] || "your interests";

  const setFilter = useCallback((filter) => setActiveFilter(filter), []);
  const followCreator = useCallback((creator) => followMutation.mutate(creator), [followMutation]);
  const saveSettings = useCallback((payload) => {
    settingsMutation.mutate(payload, {
      onSuccess: () => {
        setSettingsOpen(false);
        showToast("Discover settings saved.");
      },
      onError: (error) => showToast(error?.response?.data?.message || "Unable to save Discover settings."),
    });
  }, [settingsMutation, showToast]);
  const resetSettings = useCallback(() => {
    resetMutation.mutate(undefined, {
      onSuccess: () => showToast("Discover reset."),
      onError: (error) => showToast(error?.response?.data?.message || "Unable to reset Discover."),
    });
  }, [resetMutation, showToast]);

  if (discoverQuery.isLoading) {
    return <DiscoverSkeleton />;
  }

  if (discoverQuery.isError) {
    return <DiscoverError error={discoverQuery.error} onRetry={() => discoverQuery.refetch()} />;
  }

  const featured = data.featuredCreators?.[0] || activeCreators[0];
  const empty = !activeCreators.length && !worlds.length && !featuredExperiences.length;

  return (
    <div className="discover-page">
      <DiscoverHeader
        onRefresh={() => discoverQuery.refetch()}
        onSearchChange={setSearch}
        onSettings={() => setSettingsOpen(true)}
        refreshing={discoverQuery.isFetching}
        search={search}
      />
      <StoryStrip groups={data.creatorStories || []} />
      <DiscoverFilters active={activeFilter} filters={FILTERS} onChange={setFilter} />
      {empty ? <DiscoverEmpty onRefresh={() => discoverQuery.refetch()} onSettings={() => setSettingsOpen(true)} /> : null}
      {!empty ? (
        <>
          <DiscoverPrototypeMosaic creators={activeCreators.length ? activeCreators : allCreators} followPending={followMutation.isPending} onFollow={followCreator} />
          <FeaturedCreatorCard creator={featured} followPending={followMutation.isPending} onFollow={followCreator} />

          <DiscoverSection title="Recommended for You">
            {activeCreators.slice(0, 12).map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="Trending Creators">
            {(data.risingCreators || []).filter((creator) => creatorMatchesSearch(creator, debouncedSearch)).map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="People Nearby">
            {(data.nearbyCreators?.length ? data.nearbyCreators : activeCreators).slice(0, 12).map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="New Creators">
            {(data.newCreators || []).filter((creator) => creatorMatchesSearch(creator, debouncedSearch)).map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="Friends You May Know">
            {(data.friendsOfFriends || []).filter((creator) => creatorMatchesSearch(creator, debouncedSearch)).map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="Popular Worlds">
            {worlds.map((world) => <WorldCard key={world.id} world={world} />)}
          </DiscoverSection>

          <DiscoverSection title="Recently Active">
            {recentlyActive.map((creator) => <DiscoverCreatorCard creator={creator} followPending={followMutation.isPending} key={creator.username} onFollow={followCreator} />)}
          </DiscoverSection>

          <DiscoverSection title="Recommended Stories">
            {(data.creatorStories || []).map((group) => (
              <button className="w-[132px] shrink-0 rounded-[20px] border border-atseen-line bg-[#101319] p-3 text-left transition hover:-translate-y-1 hover:border-atseen-blue/30" key={group.id} type="button">
                <FanAvatar className="ring-2 ring-atseen-blue/60" name={group.owner?.name} size="h-14 w-14" src={group.owner?.avatar} />
                <b className="mt-3 block truncate text-sm text-white">{group.owner?.name}</b>
                <span className="mt-1 block text-[10px] font-bold text-atseen-muted">{group.live ? "Live now" : `${group.stories?.length || 0} stories`}</span>
              </button>
            ))}
          </DiscoverSection>

          <DiscoverSection title="Featured Experiences">
            {featuredExperiences.map((experience) => <ExperienceCard experience={experience} key={experience.id} />)}
          </DiscoverSection>

          <DiscoverSection title={`Because You Follow ${becauseTopic}`}>
            {recommendedWorlds.map((world) => <WorldCard key={world.id} world={world} />)}
          </DiscoverSection>

          <DiscoverSection title="Suggested Categories">
            {(data.categories || []).map((category) => <CategoryCard category={category} key={category.id || category.title} onClick={setFilter} />)}
          </DiscoverSection>

          <section className="mt-7 rounded-[20px] border border-atseen-line bg-atseen-surface p-4">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">Discover reasons</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(data.discoverReasons || []).map((reason) => <span className="rounded-full border border-atseen-line bg-white/[0.035] px-3 py-2 text-xs font-bold text-atseen-muted" key={reason}>{reason}</span>)}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/48">
              <FiHeart aria-hidden="true" />
              <span>{compactNumber(allCreators.length)} creators tuned to {data.viewerLocation || "your orbit"}</span>
            </div>
          </section>
        </>
      ) : null}

      <DiscoverSettingsModal
        interestTags={data.interestTags || []}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReset={resetSettings}
        onSave={saveSettings}
        resetPending={resetMutation.isPending}
        savePending={settingsMutation.isPending}
        settings={data.settings || {}}
      />
    </div>
  );
}

export default DiscoverPage;
