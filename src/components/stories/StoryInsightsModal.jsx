import { Link } from "react-router-dom";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useStoryInsights } from "../../hooks/useStories";

function viewedTime(value) {
  if (!value) return "Viewed";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function StoryInsightsModal({ isOpen, onClose, story }) {
  const insightsQuery = useStoryInsights(story?.id, { enabled: isOpen && Boolean(story?.id) });
  const insights = insightsQuery.data;

  return (
    <FanModal className="max-w-[520px]" isOpen={isOpen} onClose={onClose} title="Story insights">
      {insightsQuery.isLoading ? <LoadingSkeleton className="h-24" count={2} /> : null}
      {insightsQuery.isError ? (
        <p className="rounded-2xl border border-atseen-danger/25 bg-atseen-danger/10 p-4 text-sm font-semibold text-atseen-danger">
          Insights could not be loaded.
        </p>
      ) : null}
      {insights ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Views", insights.totalViews ?? 0],
              ["Unique viewers", insights.uniqueViewers ?? 0],
              ["Replies", insights.replies ?? 0],
              ["Shares", insights.shares ?? 0],
            ].map(([label, value]) => (
              <div className="rounded-2xl border border-atseen-line bg-atseen-surface p-4" key={label}>
                <p className="text-2xl font-black text-atseen-text">{value}</p>
                <p className="mt-1 text-xs font-semibold text-atseen-muted">{label}</p>
              </div>
            ))}
          </div>
          <section>
            <h3 className="text-sm font-bold text-atseen-text">Reactions</h3>
            {insights.reactions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {insights.reactions.map((item) => (
                  <span className="rounded-full border border-atseen-line px-3 py-1.5 text-sm" key={item.reaction}>
                    {item.reaction} {item.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-atseen-muted">No reaction data yet.</p>
            )}
          </section>
          <section>
            <div className="flex items-end justify-between"><div><h3 className="text-sm font-bold text-atseen-text">Viewers</h3><p className="mt-1 text-[11px] text-atseen-muted">People who reacted appear first.</p></div><span className="text-xs font-bold text-atseen-blue">{insights.reactionTotal || 0} reacted</span></div>
            {insights.viewers?.length ? (
              <div className="mt-3 divide-y divide-atseen-line overflow-hidden rounded-2xl border border-atseen-line">
                {insights.viewers.map((viewer) => (
                  <Link className="flex items-center gap-3 p-3 transition hover:bg-white/[0.04]" key={viewer.id} onClick={onClose} to={`/profile/${viewer.username}`}>
                    <div className="relative"><FanAvatar name={viewer.name || viewer.username} size="h-10 w-10" src={viewer.avatar} />{viewer.reaction ? <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-atseen-surface bg-atseen-bg text-sm">{viewer.reaction}</span> : null}</div>
                    <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate text-sm font-bold text-atseen-text">{viewer.name || viewer.username}{viewer.verified ? <VerifiedBadge /> : null}</p><p className="truncate text-[11px] text-atseen-muted">@{viewer.username} · {viewedTime(viewer.viewedAt)}</p></div>
                    <span className={`shrink-0 text-xs font-bold ${viewer.reaction ? "text-atseen-blue" : "text-atseen-muted"}`}>{viewer.reaction || "Viewed"}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-atseen-muted">No viewer list is available yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </FanModal>
  );
}

export default StoryInsightsModal;
