import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FiBookmark, FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { publicationService } from "../../services/publicationService";

function Block({ block }) {
  if (["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(block.type)) return <p className={`whitespace-pre-wrap leading-7 ${block.type !== "TEXT" ? "rounded-xl bg-atseen-blue/10 p-4" : ""}`}>{block.text}</p>;
  if (block.type === "LINK") return <a className="text-atseen-blue underline" href={block.url} rel="noreferrer" target="_blank">{block.label}</a>;
  const url = block.media?.secureUrl;
  if (!url) return <p>Preview unavailable</p>;
  if (block.type === "IMAGE") return <img alt="Chapter media" className="w-full rounded-xl" src={url} />;
  if (block.type === "VIDEO") return <video className="w-full" controls src={url} />;
  return <audio className="w-full" controls src={url} />;
}

export default function SeenReaderPage() {
  const { id } = useParams();
  const [chapterIndex, setChapterIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [actionError, setActionError] = useState("");
  const publicationQuery = useQuery({ queryKey: ["seen", id], queryFn: () => publicationService.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const engagementQuery = useQuery({ queryKey: ["seen-engagement", id], queryFn: () => publicationService.getSeenEngagement(id).then((response) => response.data.data.engagement), retry: false });
  const updateEngagement = (request) => request.then((response) => { engagementQuery.refetch(); return response.data.data.engagement; }).catch((error) => { setActionError(error.response?.status === 403 ? "This Seen action is not available for your account." : error.response?.data?.message || "Unable to complete this action."); throw error; });
  const reactionMutation = useMutation({ mutationFn: (reaction) => updateEngagement(engagementQuery.data?.viewerReaction === reaction ? publicationService.removeSeenReaction(id) : publicationService.reactToSeen(id, reaction)) });
  const shareMutation = useMutation({ mutationFn: () => updateEngagement(engagementQuery.data?.viewerShared ? publicationService.removeSeenShare(id) : publicationService.shareSeen(id, shareCaption.trim())), onSuccess: () => { setShareOpen(false); setShareCaption(""); } });
  const saveMutation = useMutation({ mutationFn: () => updateEngagement(publicationService.toggleSeenSave(id)) });
  const commentMutation = useMutation({ mutationFn: (text) => updateEngagement(publicationService.commentOnSeen(id, text)), onSuccess: () => setComment("") });

  if (publicationQuery.isLoading) return <p>Loading Seen…</p>;
  if (publicationQuery.isError) return <div className="min-h-screen bg-atseen-bg p-8 text-white"><h1>Seen unavailable</h1><Link to="/seen">Browse Seen</Link></div>;
  const publication = publicationQuery.data;
  const chapter = publication.chapters[chapterIndex];
  const engagement = engagementQuery.data || { reactionCount: 0, commentCount: 0, shareCount: 0, comments: [] };
  const submitComment = (event) => { event.preventDefault(); const text = comment.trim(); if (text) { setActionError(""); commentMutation.mutate(text); } };

  return <div className="min-h-screen bg-atseen-bg p-4 text-atseen-text"><main className="mx-auto max-w-2xl">
    <Link to="/seen">← Seen</Link>{publication.creator?.username ? <Link className="mt-4 block" to={`/profile/${publication.creator.username}`}>@{publication.creator.username}</Link> : null}
    {publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} className="mt-4 aspect-video w-full rounded-2xl object-cover" src={publication.coverMedia.secureUrl} /> : null}
    <p className="mt-6 text-xs font-black text-atseen-blue">SEEN · FREE AND PUBLIC</p><h1 className="mt-2 text-4xl font-black">{publication.title}</h1><p className="mt-3 text-atseen-muted">{publication.summary}</p>
    <nav className="mt-5 flex gap-2 overflow-x-auto">{publication.chapters.map((item, index) => <button className={`rounded-full border px-3 py-2 ${index === chapterIndex ? "border-atseen-blue text-atseen-blue" : "border-atseen-line"}`} key={item.stableChapterId} onClick={() => setChapterIndex(index)}>{index + 1}. {item.title}</button>)}</nav>
    <section className="mt-8"><h2 className="text-2xl font-black">{chapter.title}</h2><div className="mt-5 space-y-5">{chapter.blocks.map((block) => <Block block={block} key={block.id} />)}</div></section>
    <div className="mt-8 flex justify-between"><button disabled={!chapterIndex} onClick={() => setChapterIndex(chapterIndex - 1)}>Previous</button>{chapterIndex < publication.chapters.length - 1 ? <button onClick={() => setChapterIndex(chapterIndex + 1)}>Next</button> : <strong>Seen complete</strong>}</div>

    <section className="mt-10 rounded-2xl border border-atseen-line bg-atseen-surface p-5"><h2 className="text-lg font-black">Join the conversation</h2>
      <div className="mt-4 flex flex-wrap gap-2">{[["LIKE", "Like"], ["LOVE", "Love"], ["INSIGHTFUL", "Insightful"]].map(([value, label]) => <button className={`rounded-full border px-4 py-2 text-sm ${engagement.viewerReaction === value ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line"}`} disabled={reactionMutation.isPending} key={value} onClick={() => { setActionError(""); reactionMutation.mutate(value); }}><FiHeart className="mr-2 inline" />{label}</button>)}<button className={`rounded-full border px-4 py-2 text-sm ${engagement.viewerShared ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line"}`} disabled={shareMutation.isPending} onClick={() => { setActionError(""); if (engagement.viewerShared) shareMutation.mutate(); else setShareOpen((value) => !value); }}><FiShare2 className="mr-2 inline" />{engagement.viewerShared ? "Shared" : "Share to profile"}</button><button className={`rounded-full border px-4 py-2 text-sm ${engagement.viewerSaved ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line"}`} disabled={saveMutation.isPending} onClick={() => { setActionError(""); saveMutation.mutate(); }}><FiBookmark className="mr-2 inline" fill={engagement.viewerSaved ? "currentColor" : "none"} />{engagement.viewerSaved ? "Saved" : "Save"}</button></div>
      {shareOpen && !engagement.viewerShared ? <form className="mt-4 rounded-xl border border-atseen-line bg-atseen-bg p-4" onSubmit={(event) => { event.preventDefault(); shareMutation.mutate(); }}><label className="text-xs font-bold text-atseen-muted">Caption <span className="font-normal">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface p-3 text-sm text-white" maxLength={500} onChange={(event) => setShareCaption(event.target.value)} placeholder="Say something about this Seen…" value={shareCaption} /></label><div className="mt-3 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface"><div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-atseen-blue">Original Seen</p><p className="mt-1 text-sm font-black">{publication.title}</p><p className="mt-1 text-xs text-atseen-muted">@{publication.creator?.username}</p></div>{publication.coverMedia?.secureUrl ? <img alt="Seen sharing preview" className="aspect-video w-full object-cover" src={publication.coverMedia.secureUrl} /> : null}{publication.summary ? <p className="line-clamp-2 p-3 text-xs leading-5 text-atseen-muted">{publication.summary}</p> : null}</div><p className="mt-2 text-[10px] text-atseen-dim">Preview of how the shared Seen will appear on your profile.</p><div className="mt-3 flex justify-end gap-2"><button className="rounded-xl border border-atseen-line px-4 py-2 text-xs font-bold" onClick={() => { setShareOpen(false); setShareCaption(""); }} type="button">Cancel</button><button className="rounded-xl bg-atseen-blue px-4 py-2 text-xs font-bold text-atseen-bg" disabled={shareMutation.isPending} type="submit">Share</button></div></form> : null}
      <p className="mt-3 text-xs text-atseen-muted">{engagement.reactionCount} reactions · {engagement.commentCount} comments · {engagement.shareCount} shares</p>{actionError ? <p className="mt-3 text-sm text-red-300" role="alert">{actionError}</p> : null}
      <form className="mt-5 flex gap-2" onSubmit={submitComment}><input className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-atseen-bg p-3" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Write a comment…" value={comment} /><button className="rounded-xl bg-atseen-blue px-4 font-bold text-atseen-bg" disabled={!comment.trim() || commentMutation.isPending} type="submit">Post</button></form>
      <div className="mt-5 space-y-3">{engagement.comments?.map((item) => <article className="rounded-xl border border-atseen-line p-3" key={item.id}><div className="flex items-center justify-between"><Link className="text-sm font-bold" to={item.author?.username ? `/profile/${item.author.username}` : "#"}>{item.author?.name || "Fan"}</Link><time className="text-xs text-atseen-muted">{new Date(item.createdAt).toLocaleDateString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm">{item.text}</p></article>)}{!engagement.comments?.length ? <p className="text-sm text-atseen-muted"><FiMessageCircle className="mr-2 inline" />Be the first to comment.</p> : null}</div>
    </section>
  </main></div>;
}
