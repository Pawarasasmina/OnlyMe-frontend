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
} from "react-icons/fi";
import SavedCategoryCard from "../../components/saved/SavedCategoryCard";
import SavedEmptyState from "../../components/saved/SavedEmptyState";
import FeedPost from "../../components/fanWeb/home/FeedPost";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import SeenCard from "../../components/publication/SeenCard";
import UnifiedProfilePage from "./UnifiedProfilePage";
import { discoverService } from "../../services/discoverService";
import { savedService } from "../../services/savedService";
import { wallService } from "../../services/wallService";

const CATEGORIES = [
  { id: "places", title: "Places", icon: FiMapPin, empty: "No saved places yet." },
  { id: "journeys", title: "Journeys", icon: FiCompass, empty: "No saved journeys yet." },
  { id: "experiences", title: "Experiences", icon: FiLock, empty: "No saved or unlocked experiences yet." },
  { id: "people", title: "People", icon: FiHeart, empty: "No saved people yet." },
  { id: "posts", title: "Posts", icon: FiEdit3, empty: "No saved posts yet." },
  { id: "books", title: "Books", icon: FiBookOpen, empty: "No saved books yet." },
  { id: "comments", title: "Comments", icon: FiMessageCircle, empty: "No saved comments yet.", full: true },
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
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => discoverService.toggleOfferSave(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
    },
  });
  const cover = item.coverMedia?.secureUrl || item.introMedia?.secureUrl || "";
  const canUnsave = Boolean(item.viewerSaved);

  return (
    <article className="saved-list-card">
      <Link className="saved-list-thumb" to={`/world/${item.id}`}>
        {cover ? <img alt={`${item.title} cover`} src={cover} /> : <FiLock aria-hidden="true" />}
      </Link>
      <div className="saved-list-copy">
        <Link to={`/world/${item.id}`}>{item.title || "Untitled experience"}</Link>
        <p>{[item.creator?.name, item.category].filter(Boolean).join(" - ") || "Experience"}</p>
        <small>{item.viewerUnlocked ? "Unlocked" : "Saved"}{dateLabel(item.savedAt || item.unlockedAt) ? ` - ${dateLabel(item.savedAt || item.unlockedAt)}` : ""}</small>
      </div>
      {canUnsave ? (
        <button aria-label={`Remove ${item.title || "experience"} from Saved`} disabled={remove.isPending} onClick={() => remove.mutate()} type="button">
          <FiTrash2 aria-hidden="true" />
        </button>
      ) : null}
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
    <Sheet beforeTitle={<CategoryHeader category={category} />} title={category.title}>
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
          {category.id === "experiences"
            ? items.map((item) => <SavedExperienceCard item={item} key={item.id} />)
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
