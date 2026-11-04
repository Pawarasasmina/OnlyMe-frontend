import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiBookmark, FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { publicationService } from "../../services/publicationService";
import { resolveMediaUrl } from "../../utils/media";
import PublicationCoverMedia from "./PublicationCoverMedia";

const firstQuote = (item) => {
  const block = item.chapters?.flatMap((chapter) => chapter.blocks || []).find((candidate) => ["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(candidate.type) && candidate.text?.trim());
  return block?.text?.trim() || "";
};

const actionError = (error) => error.response?.status === 403 ? __msg("publication.onlyFanAccountsCanUseSeenSocialActions") : error.response?.status === 401 ? __msg("publication.logInAsAFanToUseSeen") : error.response?.data?.message || __msg("publication.thisActionCouldNotBeCompleted");

function SeenFeedCard({ item, target }) {
  __useUiLanguage();
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
  const saveMutation = useMutation({
    mutationFn: () => complete(publicationService.toggleSeenSave(item.id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved"] });
      queryClient.invalidateQueries({ queryKey: ["saved-content"] });
    },
  });
  const commentMutation = useMutation({ mutationFn: (text) => complete(publicationService.commentOnSeen(item.id, text)), onSuccess: () => setComment("") });
  const engagement = engagementQuery.data || { reactionCount: 0, commentCount: 0, shareCount: 0, comments: [] };
  const submitComment = (event) => { event.preventDefault(); const text = comment.trim(); if (text) commentMutation.mutate(text); };

  return <article className="seen-feed-card">
    {item.shareCaption ? <div className="border-b border-atseen-line bg-atseen-surface px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-atseen-blue">{__msg("publication.sharedWithANote")}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{item.shareCaption}</p></div> : null}
    <Link className="seen-feed-cover" to={target}>{item.coverMedia?.secureUrl || item.coverMedia?.url || item.coverMedia?.playbackUrl ? <PublicationCoverMedia alt={__msg("discover.cover", { value0: item.title })} autoPlay loop media={item.coverMedia} /> : <span className="seen-cover-fallback">@seen</span>}<span className="seen-cover-shade" /><span className="seen-topic-planet">{item.planet?.emoji || "✦"}</span><span className="seen-new-label">{__msg("publication.newSeen")}</span><h2 dir="auto">{item.title}</h2></Link>
    <div className="seen-feed-body">
      {item.creator?.username ? <Link className="seen-feed-author" to={`/profile/${item.creator.username}`}>{item.creator.avatar ? <img alt="" src={resolveMediaUrl(item.creator.avatar)} /> : <span>{item.creator.name?.slice(0, 1)}</span>}<strong>{item.creator.name || `@${item.creator.username}`}</strong>{item.creator.name ? <small dir="auto">@{item.creator.username}</small> : null}</Link> : null}
      {item.description || item.summary ? <p className="seen-feed-description">{item.description || item.summary}</p> : null}
      {chapter ? <Link className="seen-chapter-hook" to={target}><span>01</span><strong dir="auto">{chapter.title}</strong><em>{__msg("publication.open")}</em></Link> : null}
      {quote ? <p className="seen-feed-quote">“{quote.length > 120 ? `${quote.slice(0, 120)}…` : quote}”</p> : null}
      <div className="seen-feed-actions" aria-label={__msg("publication.seenActions")}>
        <button aria-label={engagement.viewerReaction ? __msg("publication.removeReaction") : __msg("publication.reactToSeen")} className={engagement.viewerReaction ? "text-atseen-blue" : ""} disabled={reactionMutation.isPending} onClick={() => reactionMutation.mutate()} type="button"><FiHeart /> <small>{engagement.reactionCount}</small></button>
        <button aria-expanded={commentsOpen} aria-label={__msg("fanWeb.openComments")} className={commentsOpen ? "text-atseen-blue" : ""} onClick={() => setCommentsOpen((value) => !value)} type="button"><FiMessageCircle /> <small>{engagement.commentCount}</small></button>
        <button aria-label={engagement.viewerShared ? __msg("publication.removeSeenFromProfile") : __msg("publication.shareSeenToProfile")} className={engagement.viewerShared ? "text-atseen-blue" : ""} disabled={shareMutation.isPending} onClick={() => engagement.viewerShared ? shareMutation.mutate() : setShareOpen((value) => !value)} type="button"><FiShare2 /> <small>{engagement.shareCount}</small></button>
        <button aria-label={engagement.viewerSaved ? __msg("publication.removeSeenFromSaved") : __msg("publication.saveSeen")} className={engagement.viewerSaved ? "text-atseen-blue" : ""} disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button"><FiBookmark fill={engagement.viewerSaved ? "currentColor" : "none"} /></button>
      </div>
      {engagementQuery.isError ? <p className="mt-3 text-xs text-red-300">{__msg("publication.socialActionsAreUnavailableRestartTheBackendAndTry")}</p> : null}
      {error ? <p className="mt-3 text-xs text-red-300" role="alert">{__systemMessage(error)}</p> : null}
      {shareOpen && !engagement.viewerShared ? <form className="mt-4 border-t border-atseen-line pt-4" onSubmit={(event) => { event.preventDefault(); shareMutation.mutate(); }}><label className="text-xs font-bold text-atseen-muted">{__msg("publication.addACaption")} <span className="font-normal">{__msg("admin.optional")}</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm text-white outline-none focus:border-atseen-blue" maxLength={500} onChange={(event) => setShareCaption(event.target.value)} placeholder={__msg("publication.saySomethingAboutThisSeen")} value={shareCaption} /></label><div className="mt-3 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-bg"><div className="flex items-center gap-3 p-3">{item.creator?.avatar ? <img alt="" className="h-9 w-9 rounded-full object-cover" src={resolveMediaUrl(item.creator.avatar)} /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-atseen-surface-2 text-sm font-bold">{item.creator?.name?.slice(0, 1) || "@"}</span>}<div className="min-w-0"><p className="truncate text-xs font-bold">{item.creator?.name || `@${item.creator?.username}`}</p><p className="text-[10px] text-atseen-muted">{__msg("publication.originalSeen")}</p></div></div>{item.coverMedia?.secureUrl ? <PublicationCoverMedia alt="" autoPlay className="aspect-video w-full object-cover" loop media={item.coverMedia} /> : null}<div className="p-3"><p dir="auto" className="text-sm font-black">{item.title}</p>{item.summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-atseen-muted">{item.summary}</p> : null}</div></div><p className="mt-2 text-[10px] text-atseen-dim">{__msg("publication.previewOfHowTheSharedSeenWillAppearOn")}</p><div className="mt-3 flex justify-end gap-2"><button className="rounded-xl border border-atseen-line px-4 py-2 text-xs font-bold" onClick={() => { setShareOpen(false); setShareCaption(""); }} type="button">{__msg("admin.cancel")}</button><button className="rounded-xl bg-atseen-blue px-4 py-2 text-xs font-bold text-atseen-bg" disabled={shareMutation.isPending} type="submit">{shareMutation.isPending ? __msg("publication.sharing") : __msg("fanWeb.shareToProfile")}</button></div></form> : null}
      {commentsOpen ? <section className="mt-4 border-t border-atseen-line pt-4">
        <form className="flex gap-2" onSubmit={submitComment}><input aria-label={__msg("admin.comment")} className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-atseen-bg p-3 text-sm" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder={__msg("publication.writeAComment")} value={comment} /><button className="rounded-xl bg-atseen-blue px-4 text-sm font-bold text-atseen-bg" disabled={!comment.trim() || commentMutation.isPending} type="submit">{__msg("fanWeb.post")}</button></form>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{engagement.comments?.map((entry) => <article className="rounded-xl bg-atseen-bg p-3" key={entry.id}><div className="flex justify-between gap-3"><Link className="text-xs font-bold" to={entry.author?.username ? `/profile/${entry.author.username}` : target}>{entry.author?.name || __msg("profile.fan")}</Link><time className="text-[10px] text-atseen-muted">{new Date(entry.createdAt).toLocaleDateString(__uiLocale())}</time></div><p dir="auto" className="mt-1 whitespace-pre-wrap text-sm">{entry.text}</p></article>)}{!engagement.comments?.length ? <p className="text-xs text-atseen-muted">{__msg("profile.noCommentsYet")}</p> : null}</div>
      </section> : null}
    </div>
  </article>;
}

export default function SeenCard({ item, to, variant = "tile" }) {
  __useUiLanguage();
  const target = to || `/seen/${item.id}`;
  if (variant === "feed") return <SeenFeedCard item={item} target={target} />;
  return <Link className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface" to={target}><div className="aspect-square bg-atseen-surface-2">{item.coverMedia?.secureUrl || item.coverMedia?.url || item.coverMedia?.playbackUrl ? <PublicationCoverMedia alt="" autoPlay className="h-full w-full object-cover" loop media={item.coverMedia} /> : null}</div><div className="p-3"><strong dir="auto">{item.title}</strong><p className="text-xs text-atseen-muted">{item.chapterCount || item.chapters?.length || 0} {__msg("discover.chapters")}</p></div></Link>;
}
