import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBookmark, FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { publicationService } from "../../services/publicationService";
import { resolveMediaUrl } from "../../utils/media";

const firstQuote = (item) => {
  const block = item.chapters?.flatMap((chapter) => chapter.blocks || []).find((candidate) => ["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(candidate.type) && candidate.text?.trim());
  return block?.text?.trim() || "";
};

const actionError = (error) => error.response?.status === 403 ? "Only fan accounts can use Seen social actions." : error.response?.status === 401 ? "Log in as a fan to use Seen social actions." : error.response?.data?.message || "This action could not be completed.";

function SeenFeedCard({ item, target }) {
  const queryClient = useQueryClient();
  const chapter = item.chapters?.[0];
  const quote = firstQuote(item);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [error, setError] = useState("");
  const engagementQuery = useQuery({ queryKey: ["seen-engagement", item.id], queryFn: () => publicationService.getSeenEngagement(item.id).then((response) => response.data.data.engagement), retry: false });
  const complete = async (request) => { try { const response = await request; setError(""); await engagementQuery.refetch(); return response; } catch (requestError) { setError(actionError(requestError)); throw requestError; } };
  const reactionMutation = useMutation({ mutationFn: () => complete(engagementQuery.data?.viewerReaction === "LIKE" ? publicationService.removeSeenReaction(item.id) : publicationService.reactToSeen(item.id, "LIKE")) });
  const shareMutation = useMutation({ mutationFn: () => complete(engagementQuery.data?.viewerShared ? publicationService.removeSeenShare(item.id) : publicationService.shareSeen(item.id, shareCaption.trim())), onSuccess: () => { setShareOpen(false); setShareCaption(""); queryClient.invalidateQueries({ queryKey: ["unified-profile"] }); } });
  const saveMutation = useMutation({ mutationFn: () => complete(publicationService.toggleSeenSave(item.id)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-content"] }) });
  const commentMutation = useMutation({ mutationFn: (text) => complete(publicationService.commentOnSeen(item.id, text)), onSuccess: () => setComment("") });
  const engagement = engagementQuery.data || { reactionCount: 0, commentCount: 0, shareCount: 0, comments: [] };
  const submitComment = (event) => { event.preventDefault(); const text = comment.trim(); if (text) commentMutation.mutate(text); };

  return <article className="seen-feed-card">
    {item.shareCaption ? <div className="border-b border-atseen-line bg-atseen-surface px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-atseen-blue">Shared with a note</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{item.shareCaption}</p></div> : null}
    <Link className="seen-feed-cover" to={target}>{item.coverMedia?.secureUrl ? <img alt={`${item.title} cover`} src={item.coverMedia.secureUrl} /> : <span className="seen-cover-fallback">@seen</span>}<span className="seen-cover-shade" /><span className="seen-topic-planet">{item.planet?.emoji || "✦"}</span><span className="seen-new-label">New Seen</span><h2>{item.title}</h2></Link>
    <div className="seen-feed-body">
      {item.creator?.username ? <Link className="seen-feed-author" to={`/profile/${item.creator.username}`}>{item.creator.avatar ? <img alt="" src={resolveMediaUrl(item.creator.avatar)} /> : <span>{item.creator.name?.slice(0, 1)}</span>}<strong>{item.creator.name || `@${item.creator.username}`}</strong>{item.creator.name ? <small>@{item.creator.username}</small> : null}</Link> : null}
      {item.description || item.summary ? <p className="seen-feed-description">{item.description || item.summary}</p> : null}
      {chapter ? <Link className="seen-chapter-hook" to={target}><span>01</span><strong>{chapter.title}</strong><em>Open ›</em></Link> : null}
      {quote ? <p className="seen-feed-quote">“{quote.length > 120 ? `${quote.slice(0, 120)}…` : quote}”</p> : null}
      <div className="seen-feed-actions" aria-label="Seen actions">
        <button aria-label={engagement.viewerReaction ? "Remove reaction" : "React to Seen"} className={engagement.viewerReaction ? "text-atseen-blue" : ""} disabled={reactionMutation.isPending} onClick={() => reactionMutation.mutate()} type="button"><FiHeart /> <small>{engagement.reactionCount}</small></button>
        <button aria-expanded={commentsOpen} aria-label="Open comments" className={commentsOpen ? "text-atseen-blue" : ""} onClick={() => setCommentsOpen((value) => !value)} type="button"><FiMessageCircle /> <small>{engagement.commentCount}</small></button>
        <button aria-label={engagement.viewerShared ? "Remove Seen from profile" : "Share Seen to profile"} className={engagement.viewerShared ? "text-atseen-blue" : ""} disabled={shareMutation.isPending} onClick={() => engagement.viewerShared ? shareMutation.mutate() : setShareOpen((value) => !value)} type="button"><FiShare2 /> <small>{engagement.shareCount}</small></button>
        <button aria-label={engagement.viewerSaved ? "Remove Seen from Saved" : "Save Seen"} className={engagement.viewerSaved ? "text-atseen-blue" : ""} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button"><FiBookmark fill={engagement.viewerSaved ? "currentColor" : "none"} /></button>
      </div>
      {engagementQuery.isError ? <p className="mt-3 text-xs text-red-300">Social actions are unavailable. Restart the backend and try again.</p> : null}
      {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}
      {shareOpen && !engagement.viewerShared ? <form className="mt-4 border-t border-atseen-line pt-4" onSubmit={(event) => { event.preventDefault(); shareMutation.mutate(); }}><label className="text-xs font-bold text-atseen-muted">Add a caption <span className="font-normal">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm text-white outline-none focus:border-atseen-blue" maxLength={500} onChange={(event) => setShareCaption(event.target.value)} placeholder="Say something about this Seen…" value={shareCaption} /></label><div className="mt-3 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg"><div className="flex items-center gap-3 p-3">{item.creator?.avatar ? <img alt="" className="h-9 w-9 rounded-full object-cover" src={resolveMediaUrl(item.creator.avatar)} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-atseen-surface-2 text-sm font-bold">{item.creator?.name?.slice(0, 1) || "@"}</span>}<div className="min-w-0"><p className="truncate text-xs font-bold">{item.creator?.name || `@${item.creator?.username}`}</p><p className="text-[10px] text-atseen-muted">Original Seen</p></div></div>{item.coverMedia?.secureUrl ? <img alt="" className="aspect-video w-full object-cover" src={item.coverMedia.secureUrl} /> : null}<div className="p-3"><p className="text-sm font-black">{item.title}</p>{item.summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-atseen-muted">{item.summary}</p> : null}</div></div><p className="mt-2 text-[10px] text-atseen-dim">Preview of how the shared Seen will appear on your profile.</p><div className="mt-3 flex justify-end gap-2"><button className="rounded-xl border border-atseen-line px-4 py-2 text-xs font-bold" onClick={() => { setShareOpen(false); setShareCaption(""); }} type="button">Cancel</button><button className="rounded-xl bg-atseen-blue px-4 py-2 text-xs font-bold text-atseen-bg" disabled={shareMutation.isPending} type="submit">{shareMutation.isPending ? "Sharing…" : "Share to profile"}</button></div></form> : null}
      {commentsOpen ? <section className="mt-4 border-t border-atseen-line pt-4">
        <form className="flex gap-2" onSubmit={submitComment}><input aria-label="Comment" className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" value={comment} /><button className="rounded-xl bg-atseen-blue px-4 text-sm font-bold text-atseen-bg" disabled={!comment.trim() || commentMutation.isPending} type="submit">Post</button></form>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{engagement.comments?.map((entry) => <article className="rounded-xl bg-atseen-bg p-3" key={entry.id}><div className="flex justify-between gap-3"><Link className="text-xs font-bold" to={entry.author?.username ? `/profile/${entry.author.username}` : target}>{entry.author?.name || "Fan"}</Link><time className="text-[10px] text-atseen-muted">{new Date(entry.createdAt).toLocaleDateString()}</time></div><p className="mt-1 whitespace-pre-wrap text-sm">{entry.text}</p></article>)}{!engagement.comments?.length ? <p className="text-xs text-atseen-muted">No comments yet.</p> : null}</div>
      </section> : null}
    </div>
  </article>;
}

export default function SeenCard({ item, to, variant = "tile" }) {
  const target = to || `/seen/${item.id}`;
  if (variant === "feed") return <SeenFeedCard item={item} target={target} />;
  return <Link className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface" to={target}><div className="aspect-square bg-atseen-surface-2">{item.coverMedia?.secureUrl ? <img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl} /> : null}</div><div className="p-3"><strong>{item.title}</strong><p className="text-xs text-atseen-muted">{item.chapterCount || item.chapters?.length || 0} chapters</p></div></Link>;
}
