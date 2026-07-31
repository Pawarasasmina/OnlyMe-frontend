import { Link } from "react-router-dom";
import { FiChevronRight, FiMapPin, FiMessageCircle, FiUser } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import SeeYouButton from "./SeeYouButton";
import { formatOrbitLocation, formatOrbitStatusLine } from "./orbitFormat";

function WorldGlyph({ onOpen, world }) {
  const emoji = world?.badge?.emoji || "\uD83E\uDE90";
  const content = (
    <>
      <span aria-hidden="true">{emoji}</span>
      <span className="sr-only">{world?.title || world?.category || "Creator World"}</span>
    </>
  );

  if (world?.id) {
    return (
      <Link
        aria-label={`Step inside ${world.title || "this World"}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-atseen-blue/25 bg-atseen-blue/10 text-lg transition hover:scale-105 hover:border-atseen-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue"
        onClick={onOpen}
        title={world?.title || world?.category || "Creator World"}
        to={`/worlds/${world.id}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-atseen-blue/25 bg-atseen-blue/10 text-lg"
      title={world?.title || world?.category || "Creator World"}
    >
      {content}
    </span>
  );
}

function CompactPanel({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-atseen-line bg-atseen-surface p-3 ${className}`}>
      {children}
    </div>
  );
}

function OrbitProfilePreview({ node, onClose }) {
  const profilePath = node?.profileRoute || (node?.username ? `/profile/${encodeURIComponent(node.username)}` : "/profile");
  const city = formatOrbitLocation(node?.location).split(",")[0] || node?.city || "";
  const statusLine = formatOrbitStatusLine(node);
  const happeningNow = node?.happeningNow || node?.status || node?.reason;
  const quote = node?.quote || node?.bio;
  const worlds = node?.worlds || [];

  return (
    <FanModal
      className="max-h-[calc(100dvh-2rem)] max-w-4xl overflow-hidden p-4 sm:p-5 max-sm:mt-auto max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:rounded-b-none"
      isOpen={Boolean(node)}
      onClose={onClose}
      title={node?.name || "Orbit preview"}
    >
      {node ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex min-h-0 flex-col gap-3">
            <Link className="group grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-2xl transition hover:bg-atseen-surface-2 sm:grid-cols-[108px_minmax(0,1fr)]" to={profilePath}>
              <FanAvatar className="border-2 border-atseen-blue/45 shadow-glow" name={node.name} size="h-[88px] w-[88px] sm:h-[108px] sm:w-[108px]" src={node.avatar} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xl font-extrabold text-atseen-text">
                  {node.name}
                  {node.verified ? <VerifiedBadge /> : null}
                </p>
                {statusLine ? (
                  <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-atseen-muted">
                    <FiMapPin aria-hidden="true" className="mt-0.5 shrink-0 text-atseen-blue" />
                    <span>{statusLine}</span>
                  </p>
                ) : (
                  <p className="mt-1 truncate text-xs text-atseen-muted">@{node.username}</p>
                )}
                <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-atseen-blue opacity-0 transition group-hover:opacity-100">
                  <FiUser aria-hidden="true" />
                  View profile
                </p>
              </div>
            </Link>

            <CompactPanel className="border-atseen-blue/20 bg-atseen-blue/10">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-atseen-blue">Happening Now</p>
              <p className="mt-1.5 line-clamp-2 text-[14px] font-extrabold italic leading-5 text-atseen-text">&quot;{happeningNow}&quot;</p>
            </CompactPanel>

            {quote ? (
              <p className="line-clamp-3 text-[12px] italic leading-5 text-atseen-muted">&quot;{quote}&quot;</p>
            ) : null}

            <div className="mt-auto grid grid-cols-2 gap-2">
              <SeeYouButton className="min-h-11" hasSeenSignal={node.hasSeenSignal} targetName={node.name} targetUserId={node.id} />
              {node.canMessage ? (
                <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm font-bold text-atseen-text transition hover:border-atseen-blue/50" to="/messages">
                  <FiMessageCircle aria-hidden="true" />
                  Message
                </Link>
              ) : (
                <Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-sm font-bold text-atseen-text transition hover:border-atseen-blue/50" to={profilePath}>
                  View Profile
                </Link>
              )}
            </div>
            {city ? <p className="text-center text-[10px] text-atseen-muted">tap the photo to step inside {city}</p> : null}
          </section>

          <section className="grid min-h-0 content-start gap-3">
            <CompactPanel>
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-atseen-dim">Worlds</p>
                {worlds.length ? (
                  <div className="flex flex-1 items-center gap-2">
                    {worlds.slice(0, 3).map((world) => <WorldGlyph key={world.id} onOpen={onClose} world={world} />)}
                  </div>
                ) : (
                  <p className="flex-1 text-xs text-atseen-muted">Public Worlds will appear here.</p>
                )}
                {worlds.length ? <p className="shrink-0 text-[10px] text-atseen-muted">tap to step inside</p> : null}
              </div>
            </CompactPanel>

            <CompactPanel>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{node.reasonDetails?.label || "Why You Two"}</p>
              <p className="mt-1.5 text-sm font-semibold leading-5 text-atseen-text">{node.reasonDetails?.detail || node.reason}</p>
              {node.hasMutualSignal ? (
                <p className="mt-2 rounded-xl border border-atseen-blue/20 bg-atseen-blue/10 px-3 py-2 text-xs font-semibold text-atseen-blue">
                  {node.name} has seen you too.
                </p>
              ) : null}
            </CompactPanel>

            {node.dream ? (
              <CompactPanel className="py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center text-lg" aria-hidden="true">
                    {node.dream.status === "completed" ? "\u2705" : node.dream.emoji || "\u2728"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-atseen-text">
                      {node.dream.status === "completed" ? "Dream completed" : `Dreams of ${node.dream.title}`}
                    </p>
                    <p className="mt-0.5 text-xs text-atseen-muted">{node.dream.status === "completed" ? "Ask how it went" : "Help make it happen"}</p>
                  </div>
                  <FiChevronRight className="text-atseen-muted" aria-hidden="true" />
                </div>
              </CompactPanel>
            ) : null}

            {worlds.length ? (
              <div className="grid grid-cols-2 gap-2">
                {worlds.slice(0, 2).map((world) => (
                  <Link className="min-w-0 rounded-2xl transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-atseen-blue" key={world.id} onClick={onClose} to={`/worlds/${world.id}`}>
                    <CompactPanel className="min-w-0">
                    <p className="truncate text-xs font-bold text-atseen-text">{world.title}</p>
                    {world.category ? <p className="mt-1 text-[11px] text-atseen-muted">{world.category}</p> : null}
                    </CompactPanel>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </FanModal>
  );
}

export default OrbitProfilePreview;
