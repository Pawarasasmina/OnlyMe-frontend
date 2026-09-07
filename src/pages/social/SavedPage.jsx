import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCompass,
  FiEdit3,
  FiHeart,
  FiLock,
  FiMapPin,
  FiMessageCircle,
  FiRefreshCw,
  FiTrash2,
  FiUserCheck,
} from "react-icons/fi";
import SavedCategoryCard from "../../components/saved/SavedCategoryCard";
import SavedEmptyState from "../../components/saved/SavedEmptyState";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import SeenCard from "../../components/publication/SeenCard";
import UnifiedProfilePage from "./UnifiedProfilePage";
import VerifiedBadge from "../../components/fanWeb/shared/VerifiedBadge";
import { profileService } from "../../services/profileService";
import { savedService } from "../../services/savedService";
import { wallService } from "../../services/wallService";
import { resolveMediaUrl } from "../../utils/media";
import { SAVED_PEOPLE_DETAIL_TITLE, SAVED_PEOPLE_EMPTY_STATE, followInvalidationKeys } from "../../utils/savedPeople";

const CATEGORIES = [
  { id: "places", title: "Places", icon: FiMapPin, empty: "Save places from Local Tips - they'll live here." },
  { id: "journeys", title: "Journeys", icon: FiCompass, empty: "Tap the heart on any journey to keep it here." },
  { id: "experiences", title: "Experiences", detailTitle: "Premium Experiences", icon: FiLock, empty: "Experiences you open will live here." },
  { id: "people", title: "People", detailTitle: SAVED_PEOPLE_DETAIL_TITLE, icon: FiHeart, empty: SAVED_PEOPLE_EMPTY_STATE },
  { id: "posts", title: "Posts", icon: FiEdit3, empty: "No saved posts yet." },
  { id: "books", title: "Books", icon: FiBookOpen, empty: "Book recommendations you save will live here." },
  { id: "comments", title: "Comments", icon: FiMessageCircle, empty: "Save useful advice from comments - it lives here.", full: true },
];

const categoryById = Object.fromEntries(CATEGORIES.map((category) => [category.id, category]));

function countLabel(value) {
  const count = Number(value) || 0;
  return count.toLocaleString();
}

function dateLabel(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

function Sheet({ beforeTitle = null, children, title }) {
  return (
    <section
      aria-labelledby="saved-page-title"
      className="saved-sheet saved-prototype-sheet"
      style={{ boxSizing: "border-box", maxWidth: 548, width: "100%" }}
    >
      <span aria-hidden="true" className="saved-sheet-handle" />
      {beforeTitle}
      <h1 id="saved-page-title">{title}</h1>
      {children}
    </section>
  );
}

function SavedOverview() {
  const query = useQuery({
    queryKey: ["saved", "overview"],
    queryFn: () => savedService.overview().then((response) => response.data.data),
    retry: false,
    staleTime: 1000 * 60,
  });
  const counts = query.data?.counts || {};
  const experienceMeta = query.data?.metadata?.experiences || {};
  const total = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return (
    <Sheet title="Saved">
      {query.isError ? (
        <div className="saved-error" role="alert">
          <p>Couldn&apos;t load your saved items.</p>
          <button onClick={() => query.refetch()} type="button"><FiRefreshCw aria-hidden="true" /> Retry</button>
        </div>
      ) : null}
      <div className="saved-grid">
        {CATEGORIES.map((category) => (
          <SavedCategoryCard
            count={counts[category.id] || 0}
            full={category.full}
            icon={category.icon}
            key={category.id}
            loading={query.isLoading}
            subtitle={category.id === "experiences" && !query.isLoading ? `${countLabel(experienceMeta.unlockedCount)} unlocked` : undefined}
            title={category.title}
            to={`/saved/${category.id}`}
          />
        ))}
      </div>
      {!query.isLoading && !query.isError && total === 0 ? (
        <p className="saved-overview-empty">Save places, posts, people and experiences to find them here.</p>
      ) : null}
    </Sheet>
  );
}

function CategoryHeader({ category }) {
  const Icon = category.icon;
  return (
    <div className="saved-category-header">
      <Link aria-label="Back to Saved" to="/saved"><FiArrowLeft aria-hidden="true" /></Link>
      <span className="saved-category-header-icon" aria-hidden="true"><Icon /></span>
      <p>Saved library</p>
    </div>
  );
}

function SavedExperienceCard({ item }) {
  const cover = item.coverMedia?.secureUrl || item.introMedia?.secureUrl || "";

  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={`/world/${item.id}`}>
        {cover ? <img alt={`${item.title} cover`} src={cover} /> : <FiLock aria-hidden="true" />}
      </Link>
      <div className="saved-list-copy">
        <Link to={`/world/${item.id}`}>{item.title || "Untitled experience"}</Link>
        <p>{[item.creator?.name, item.category].filter(Boolean).join(" - ") || "Experience"}</p>
        <small>{item.accessType === "OPENED_FREE_WORLD" ? "Opened" : "Unlocked"}{dateLabel(item.unlockedAt) ? ` - ${dateLabel(item.unlockedAt)}` : ""}</small>
      </div>
    </article>
  );
}

function removeMutationFor(category, item) {
  const id = item.commentId || item.id;
  if (category === "places") return () => savedService.unsavePlace(id);
  if (category === "journeys") return () => savedService.unsaveJourney(id);
  if (category === "books") return () => savedService.unsaveBook(id);
  if (category === "comments") return () => savedService.unsaveComment(id);
  return () => Promise.resolve();
}

function SavedRemoveButton({ category, item, label }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: removeMutationFor(category, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["seen-feed"] });
      queryClient.invalidateQueries({ queryKey: ["content-entity"] });
    },
  });
  return (
    <button aria-label={label} disabled={remove.isPending} onClick={() => remove.mutate()} type="button">
      <FiTrash2 aria-hidden="true" />
    </button>
  );
}

function SavedPlaceCard({ item }) {
  const image = resolveMediaUrl(item.image);
  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={item.route || "/search?type=places"}>
        {image ? <img alt="" src={image} /> : <FiMapPin aria-hidden="true" />}
      </Link>
      <div className="saved-list-copy">
        <Link to={item.route || "/search?type=places"}>{item.title || item.name || "Saved place"}</Link>
        <p>{[item.location, item.address, item.description].filter(Boolean).join(" - ")}</p>
        <small>{[item.category, item.creator?.name, dateLabel(item.savedAt)].filter(Boolean).join(" - ")}</small>
      </div>
      <SavedRemoveButton category="places" item={item} label={`Remove ${item.title || "place"} from Saved`} />
    </article>
  );
}

function SavedJourneyCard({ item }) {
  const progress = item.completed ? "Completed" : item.started && item.totalSteps ? `${item.visitedCount || 0} / ${item.totalSteps} places completed` : "Saved";
  const meta = [item.location || item.city, item.localTipCount ? `${item.localTipCount} Local Tips` : "", progress].filter(Boolean).join(" - ");
  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={item.route || "/orbit"}>{item.emoji || item.icon || <FiCompass aria-hidden="true" />}</Link>
      <div className="saved-list-copy">
        <Link to={item.route || "/orbit"}>{item.title || "Saved journey"}</Link>
        <p>{meta || item.creator?.name || "Journey"}</p>
        <small>{item.started && !item.completed ? "Continue" : dateLabel(item.savedAt)}</small>
      </div>
      <SavedRemoveButton category="journeys" item={item} label={`Remove ${item.title || "journey"} from Saved`} />
    </article>
  );
}

function SavedBookCard({ item }) {
  const cover = resolveMediaUrl(item.cover || item.image);
  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={item.route || "/search?category=Books"}>
        {cover ? <img alt="" src={cover} /> : <FiBookOpen aria-hidden="true" />}
      </Link>
      <div className="saved-list-copy">
        <Link to={item.route || "/search?category=Books"}>{item.title || "Saved book"}</Link>
        <p>{[item.recommendationText || item.description, item.creator?.name].filter(Boolean).join(" - ")}</p>
        <small>{[item.category, item.topic, dateLabel(item.savedAt)].filter(Boolean).join(" - ")}</small>
      </div>
      <SavedRemoveButton category="books" item={item} label={`Remove ${item.title || "book"} from Saved`} />
    </article>
  );
}

function SavedCommentCard({ item }) {
  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={item.parent?.route || "/wall"}>
        <FanAvatar name={item.author?.name || "Fan"} size="h-full w-full" src={item.author?.avatar} />
      </Link>
      <div className="saved-list-copy">
        <Link to={item.parent?.route || "/wall"}>{item.author?.name || "Fan"} - on {item.parent?.author?.name || item.parent?.title || "a note"}</Link>
        <p>{item.text}</p>
        <small>{dateLabel(item.savedAt)}</small>
      </div>
      <SavedRemoveButton category="comments" item={item} label="Remove comment from Saved" />
    </article>
  );
}

function SavedWallPostCard({ entry }) {
  const queryClient = useQueryClient();
  const post = entry.item || {};
  const remove = useMutation({
    mutationFn: () => wallService.save(post.originalPostId || post.id, entry.type === "wallShare" ? post.shareId : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
    },
  });

  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={`/wall?post=${post.originalPostId || post.id}`}>
        {post.media?.[0]?.url ? <img alt="" src={post.media[0].url} /> : <FiEdit3 aria-hidden="true" />}
      </Link>
      <div className="saved-list-copy">
        <Link to={`/wall?post=${post.originalPostId || post.id}`}>{post.text || "Wall post"}</Link>
        <p>{[post.creator?.name, post.context, post.location].filter(Boolean).join(" - ")}</p>
        <small>{dateLabel(entry.savedAt)}</small>
      </div>
      <button aria-label="Remove wall post from Saved" disabled={remove.isPending} onClick={() => remove.mutate()} type="button">
        <FiTrash2 aria-hidden="true" />
      </button>
    </article>
  );
}

function SavedPostEntry({ entry }) {
  if (entry.type === "seen") return <SeenCard item={entry.item} variant="feed" />;
  if (entry.type === "feedPost") return <FeedPost post={entry.item} />;
  return <SavedWallPostCard entry={entry} />;
}

function invalidateFollowSurfaces(queryClient) {
  return Promise.all(followInvalidationKeys().map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

function SavedCreatorCard({ creator }) {
  const queryClient = useQueryClient();
  const unfollow = useMutation({
    mutationFn: () => profileService.toggleFollow(creator.username),
    onSuccess: () => invalidateFollowSurfaces(queryClient),
  });
  const profileTarget = creator.profileUrl || (creator.username ? `/profile/${encodeURIComponent(creator.username)}` : "/search");
  const avatar = resolveMediaUrl(creator.avatar || creator.profilePhoto);
  const category = creator.category || creator.categories?.[0] || "Creator";
  const meta = [category, creator.location].filter(Boolean).join(" - ");

  return (
    <article className="saved-creator-card">
      <Link className="saved-creator-main" to={profileTarget}>
        <FanAvatar name={creator.displayName || creator.name || creator.username} size="h-[58px] w-[58px]" src={avatar} />
        <span className="saved-creator-copy">
          <strong>
            <span>{creator.displayName || creator.name || creator.username || "Creator"}</span>
            {creator.isVerified || creator.verified ? <VerifiedBadge /> : null}
          </strong>
          {creator.username ? <small>@{creator.username}</small> : null}
          {meta ? <em>{meta}</em> : null}
          {creator.bio ? <span>{creator.bio}</span> : null}
        </span>
      </Link>
      <button
        aria-label={`Unfollow ${creator.displayName || creator.name || creator.username || "creator"}`}
        className="saved-creator-follow"
        disabled={unfollow.isPending}
        onClick={() => unfollow.mutate()}
        type="button"
      >
        <FiUserCheck aria-hidden="true" />
        {unfollow.isPending ? "Updating..." : "Following"}
      </button>
    </article>
  );
}

function SavedCategoryView({ category }) {
  const query = useInfiniteQuery({
    queryKey: ["saved", category.id],
    queryFn: ({ pageParam = 1 }) => savedService.category(category.id, { page: pageParam, limit: 20 }).then((response) => response.data.data),
    getNextPageParam: (lastPage) => lastPage.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    retry: false,
    staleTime: 1000 * 60,
  });
  const pages = query.data?.pages || [];
  const items = pages.flatMap((page) => page.items || []);

  return (
    <Sheet beforeTitle={<CategoryHeader category={category} />} title={category.detailTitle || category.title}>
      {query.isLoading ? <LoadingSkeleton className="h-28" count={3} /> : null}
      {query.isError ? (
        <div className="saved-error" role="alert">
          <p>Couldn&apos;t load this category.</p>
          <button onClick={() => query.refetch()} type="button"><FiRefreshCw aria-hidden="true" /> Retry</button>
        </div>
      ) : null}
      {!query.isLoading && !query.isError && !items.length ? <SavedEmptyState>{category.empty}</SavedEmptyState> : null}
      {items.length ? (
        <div className="saved-list">
          {category.id === "places"
            ? items.map((item) => <SavedPlaceCard item={item} key={item.id} />)
            : category.id === "journeys"
              ? items.map((item) => <SavedJourneyCard item={item} key={item.id} />)
              : category.id === "experiences"
                ? items.map((item) => <SavedExperienceCard item={item} key={item.id} />)
                : category.id === "people"
                  ? items.map((creator) => <SavedCreatorCard creator={creator} key={creator.id} />)
                  : category.id === "books"
                    ? items.map((item) => <SavedBookCard item={item} key={item.id} />)
                    : category.id === "comments"
                      ? items.map((item) => <SavedCommentCard item={item} key={item.id} />)
                      : items.map((entry) => <SavedPostEntry entry={entry} key={entry.id} />)}
        </div>
      ) : null}
      {query.hasNextPage ? (
        <button className="saved-load-more" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} type="button">
          {query.isFetchingNextPage ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </Sheet>
  );
}

export default function SavedPage() {
  const params = useParams();
  const category = params.category ? categoryById[String(params.category).toLowerCase()] : null;
  const sheet = params.category && !category ? (
    <Sheet title="Saved">
      <SavedEmptyState>That Saved category is not available.</SavedEmptyState>
    </Sheet>
  ) : category ? (
    <SavedCategoryView category={category} />
  ) : (
    <SavedOverview />
  );

  return (
    <div className="saved-popup-route">
      <div aria-hidden="true" className="saved-popup-profile-bg">
        <UnifiedProfilePage owner />
      </div>
      <Link aria-label="Close saved" className="saved-popup-scrim" replace to="/profile" />
      <div className="saved-popup-layer">
        <div className="saved-library-page saved-prototype-page">
          {sheet}
        </div>
      </div>
    </div>
  );
}
