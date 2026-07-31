import FanModal from "../fanWeb/shared/FanModal";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import { useStoryInsights } from "../../hooks/useStories";

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
          {insights.unavailable ? (
            <p className="rounded-2xl border border-atseen-line bg-atseen-surface p-4 text-sm text-atseen-muted">
              Insights are not available yet. The component is ready for backend view, reaction, reply, and completion data.
            </p>
          ) : null}
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
            <h3 className="text-sm font-bold text-atseen-text">Viewers</h3>
            {insights.viewers?.length ? (
              <div className="mt-3 divide-y divide-atseen-line rounded-2xl border border-atseen-line">
                {insights.viewers.map((viewer) => (
                  <div className="flex items-center justify-between p-3 text-sm" key={viewer.id}>
                    <span>{viewer.name || viewer.username}</span>
                    <span className="text-atseen-muted">{viewer.reaction || viewer.viewedAt || "Viewed"}</span>
                  </div>
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
