import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiBarChart2, FiCheckCircle, FiClock, FiEdit3, FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "../../components/common/Button";
import ContentStatusBadge from "../../components/content/ContentStatusBadge";
import StoryCreator from "../../components/stories/StoryCreator";
import { useAuth } from "../../hooks/useAuth";
import { useDeleteStory, useMyStories } from "../../hooks/useStories";
import { contentService } from "../../services/contentService";
import { contentError, formatContentLabel } from "../../utils/content";
import { canCreateStory, canDeleteStory } from "../../utils/storyPermissions";

const statuses = ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED", "ARCHIVED"];
const statCards = [
  { key: "total", label: "All content", icon: FiFileText },
  { key: "DRAFT", label: "Drafts", icon: FiEdit3 },
  { key: "PENDING_REVIEW", label: "In review", icon: FiClock },
  { key: "PUBLISHED", label: "Published", icon: FiCheckCircle },
];

function CreatorStudio() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const canCreate = canCreateStory(user);
  const storiesQuery = useMyStories({ enabled: canCreate });
  const deleteStoryMutation = useDeleteStory();

  useEffect(() => {
    Promise.all([contentService.listMyContent({ limit: 5 }), ...statuses.map((status) => contentService.listMyContent({ limit: 1, status }))])
      .then(([recent, ...responses]) => {
        setItems(recent.data.data.items || []);
        setTotal(recent.data.data.pagination?.total || 0);
        setCounts(Object.fromEntries(statuses.map((status, index) => [status, responses[index].data.data.pagination?.total || 0])));
      })
      .catch((e) => setError(contentError(e, "Unable to load studio")))
      .finally(() => setLoading(false));
  }, []);

  const values = { ...counts, total };
  const activeStories = storiesQuery.data || [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="creator-eyebrow">Creator studio</p>
          <h1 className="creator-page-title">Good to see you, {user?.name?.split(" ")[0] || "Creator"}</h1>
          <p className="creator-muted mt-2">Structured Seens, Stories, and legacy Content stay separate.</p>
          <div className="mt-3 flex gap-4 text-sm font-bold">
            <Link className="text-sky-300" to="/studio/seens">Manage Seens</Link>
            <Link className="text-slate-400" to="/creator/content">Legacy Content</Link>
            <span className="text-slate-500">Future Worlds - Coming next phase</span>
          </div>
        </div>
        <Link to="/create">
          <Button className="gap-2"><FiPlus /> Create</Button>
        </Link>
      </div>

      {error ? <p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p> : null}

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div className="creator-card p-5" key={key}>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-sky-300/10 p-2.5 text-sky-300"><Icon /></span>
              <span className="text-xs text-slate-500">Live</span>
            </div>
            <p className="mt-5 text-3xl font-black">{loading ? "-" : values[key] || 0}</p>
            <p className="mt-1 text-sm text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {canCreate ? (
        <section className="creator-card mt-5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="creator-eyebrow">Stories</p>
              <h2 className="font-bold">Active Stories</h2>
              <p className="mt-1 text-xs text-slate-500">24-hour updates with views, reactions, and owner controls.</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-black text-slate-950" onClick={() => setStoryCreatorOpen(true)} type="button">
              <FiPlus /> Add Story
            </button>
          </div>
          {storiesQuery.isLoading ? <p className="mt-4 text-sm text-slate-400">Loading Stories...</p> : null}
          {!storiesQuery.isLoading && !activeStories.length ? <p className="mt-4 text-sm text-slate-400">No active Stories right now.</p> : null}
          {activeStories.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeStories.map((story) => (
                <article className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]" key={story.id}>
                  <div className="aspect-[9/16] max-h-56 bg-black">
                    {story.mediaType === "video" ? <video className="h-full w-full object-cover" muted src={story.mediaUrl} /> : <img alt="" className="h-full w-full object-cover" src={story.thumbnailUrl || story.mediaUrl} />}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-bold">{story.caption || "Untitled Story"}</p>
                    <p className="mt-1 text-xs text-slate-500">{story.timeAgo} - expires in 24h</p>
                    <div className="mt-3 flex gap-2">
                      <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2 text-xs font-bold text-sky-300" type="button">
                        <FiBarChart2 /> Insights
                      </button>
                      {canDeleteStory(user, story) ? (
                        <button
                          className="inline-flex items-center justify-center rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200"
                          disabled={deleteStoryMutation.isPending}
                          onClick={() => deleteStoryMutation.mutate(story.id)}
                          type="button"
                        >
                          <FiTrash2 />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="creator-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
            <div>
              <h2 className="font-bold">Recent content</h2>
              <p className="mt-1 text-xs text-slate-500">Your latest drafts and submissions</p>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300" to="/creator/content">View all <FiArrowRight /></Link>
          </div>
          {!loading && !items.length ? (
            <div className="p-12 text-center">
              <p className="text-slate-400">Your studio is ready for its first post.</p>
              <Link className="mt-3 inline-block text-sm font-semibold text-sky-300" to="/creator/content/new">Create a draft</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {items.map((item) => (
                <Link className="flex items-center justify-between gap-4 p-5 transition hover:bg-white/[0.025]" key={item.id} to={`/creator/content/${item.id}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatContentLabel(item.contentType)} - {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ContentStatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="creator-card p-5">
            <p className="creator-eyebrow">Review pipeline</p>
            <div className="mt-4 space-y-3">
              {statuses.slice(0, 5).map((status) => (
                <div className="flex items-center justify-between text-sm" key={status}>
                  <span className="text-slate-400">{formatContentLabel(status)}</span>
                  <span className="font-bold">{loading ? "-" : counts[status] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="creator-card bg-gradient-to-br from-sky-400/10 to-transparent p-5">
            <h2 className="font-bold">Build your profile</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">A complete public profile helps fans understand what you create.</p>
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-300" to="/creator/settings/profile">Edit profile <FiArrowRight /></Link>
          </div>
        </aside>
      </div>
      <StoryCreator isOpen={storyCreatorOpen} onClose={() => setStoryCreatorOpen(false)} />
    </div>
  );
}

export default CreatorStudio;
