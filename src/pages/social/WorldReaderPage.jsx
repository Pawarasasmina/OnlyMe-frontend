import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiLock, FiMessageCircle } from "react-icons/fi";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { walletService } from "../../services/walletService";

const MARKER_COLORS = { ICE_BLUE: "#9CCBFF", AMBER: "#F2C76E", CORAL: "#F18A78", MINT: "#6ECF97", LILAC: "#B7A5FF", WHITE: "#F4F7FB" };

function Block({ block, onExpired }) {
  if (block.type === "TEXT") return <p className="whitespace-pre-wrap text-[15px] leading-7 text-white/85">{block.text}</p>;
  if (block.type === "KEY_POINT") return <div className="rounded-r-2xl border-l-2 border-atseen-blue bg-atseen-blue/[0.07] px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-blue">★ Key point</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{block.text}</p></div>;
  if (block.type === "HIGHLIGHT") { const color = MARKER_COLORS[block.metadata?.color] || MARKER_COLORS.ICE_BLUE; return <p className="rounded-xl px-4 py-3 text-sm leading-6 text-[#0A0C0F]" style={{ backgroundColor: color }}>{block.text}</p>; }
  if (block.type === "LINK") return <a className="inline-flex max-w-full break-all rounded-full border border-atseen-blue/30 px-4 py-2 text-sm font-bold text-atseen-blue" href={block.url} rel="noreferrer" target="_blank">🔗 {block.label}</a>;
  const url = block.media?.secureUrl;
  if (!url) return <p className="text-sm text-atseen-muted">Preview unavailable</p>;
  if (block.type === "IMAGE") return <img alt="Chapter media" className="w-full rounded-2xl" onError={onExpired} src={url} />;
  if (block.type === "VIDEO") return <video className="w-full rounded-2xl" controls onError={onExpired} playsInline src={url} />;
  return <audio className="w-full" controls onError={onExpired} src={url} />;
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const [comment, setComment] = useState("");
  const query = useQuery({ queryKey: ["world", id], queryFn: () => api.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });
  const engagement = useQuery({ queryKey: ["world-engagement", id], queryFn: () => api.getSeenEngagement(id).then((response) => response.data.data.engagement), retry: false });

  const publication = query.data;
  const publicationId = publication?.id || publication?._id;
  const chapters = publication?.chapters || [];
  const premium = publication?.kind === "PREMIUM_WORLD";
  const membership = memberships.data?.find((item) => (item.premiumPublication?._id || item.premiumPublication?.id) === publicationId);
  const owner = String(user?.id || user?._id || "") === String(publication?.creator?.id || publication?.creator?._id || "");
  const chapterMedia = chapters.flatMap((item) => (item.blocks || []).filter((block) => ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl).map((block) => ({ ...block.media, title: item.title })));
  const stories = publication ? [publication.coverMedia, ...chapterMedia].filter(Boolean).slice(0, 6) : [];

  if (query.isLoading) return <div className="grid min-h-[60vh] place-items-center"><p className="text-sm text-atseen-muted">Opening planet…</p></div>;
  if (query.isError || !publication) return <div className="rounded-3xl border border-atseen-line bg-atseen-surface p-8 text-center"><h1 className="text-xl font-black">World unavailable</h1><p className="mt-2 text-sm text-atseen-muted">It may be unpublished, archived, or missing.</p></div>;

  const openChapter = (index) => {
    const next = chapters[index];
    if (!next) return;
    if (next.locked) {
      if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
      setJoinOpen(true);
      return;
    }
    setActive(index);
    document.getElementById("world-active-chapter")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const completeWorld = async () => {
    localStorage.setItem(`atseen_walked_world_${publicationId}`, new Date().toISOString());
    if (user) await api.markWorldWalked(publicationId).catch(() => null);
    navigate("/seen", { state: { walkedWorld: { id: publicationId, title: publication.title, creator: publication.creator } } });
  };
  const addComment = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!value) return;
    await api.commentOnSeen(publicationId, value);
    setComment("");
    engagement.refetch();
  };
  const chapter = chapters[active];

  return <article className="mx-auto w-full max-w-3xl pb-16 text-atseen-text">
    <header className="flex items-center justify-between gap-4"><Link aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-atseen-line text-atseen-muted" to={publication.creator?.username ? `/profile/${publication.creator.username}` : "/seen"}><FiArrowLeft /></Link><span className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-muted">{premium ? "Premium Planet" : "Free World"}</span></header>

    <section className="mt-5 text-center"><button aria-label={owner ? "Change planet" : "Planet"} className={`text-6xl ${owner ? "cursor-pointer transition hover:scale-105" : "cursor-default"}`} onClick={() => owner && navigate(`/studio/worlds/${publicationId}/edit`)} type="button">{publication.planet?.emoji || (premium ? "🪐" : "🌍")}</button>{owner ? <p className="mt-2 text-[10px] text-atseen-muted">Tap your planet to change it</p> : null}</section>

    <section className="mt-7"><div className="flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-[0.16em] text-atseen-muted">Stories of this world</h2><span className="text-[10px] text-atseen-dim">{stories.length}</span></div><div className="atseen-hide-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">{stories.length ? stories.map((story, index) => <button className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border border-atseen-blue/30 bg-atseen-surface" key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => openChapter(Math.min(index, chapters.length - 1))} type="button">{story.resourceType === "video" ? <video className="h-full w-full object-cover" muted src={story.secureUrl} /> : <img alt={story.title || "World story"} className="h-full w-full object-cover" src={story.secureUrl} />}</button>) : <div className="rounded-2xl border border-dashed border-atseen-line px-5 py-4 text-xs text-atseen-muted">Stories added to this world will appear here.</div>}</div></section>

    <section className="mt-6 flex items-center gap-3 border-t border-atseen-line pt-5">{publication.creator?.avatar ? <img alt="" className="h-11 w-11 rounded-full object-cover" src={publication.creator.avatar} /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-atseen-surface font-black text-atseen-blue">{publication.creator?.name?.[0] || "@"}</span>}<div className="min-w-0"><p className="truncate text-sm font-black">{publication.creator?.name || publication.creator?.username || "Creator"} <span className="text-atseen-blue">✓</span></p><p className="text-[11px] text-atseen-muted">@{publication.creator?.username || "creator"}</p></div></section>

    <h1 className="mt-6 text-3xl font-black tracking-tight">{publication.title}</h1>
    <section className="mt-4 overflow-hidden rounded-3xl border border-atseen-line bg-atseen-surface">{publication.coverMedia?.secureUrl ? publication.coverMedia.resourceType === "video" ? <video className="aspect-video w-full object-cover" controls playsInline src={publication.coverMedia.secureUrl} /> : <img alt={`${publication.title} cover`} className="aspect-video w-full object-cover" src={publication.coverMedia.secureUrl} /> : null}<div className="p-5"><p className="text-sm leading-6 text-atseen-muted">{publication.summary}</p>{publication.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">{publication.description}</p> : null}</div></section>

    <section className="mt-7"><div className="flex items-center justify-between"><h2 className="font-black">Chapters</h2><span className="text-xs text-atseen-muted">{chapters.length}/{premium ? 5 : 7}</span></div><div className="mt-3 grid gap-2">{chapters.map((item, index) => <button className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 text-left ${active === index ? "border-atseen-blue/50 bg-atseen-blue/[0.07]" : "border-atseen-line bg-atseen-surface"}`} key={item.stableChapterId} onClick={() => openChapter(index)} type="button"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.05] text-[11px] font-black">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-bold">{item.title}</span>{item.locked ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-black text-atseen-muted"><FiLock /> MEMBERS ONLY</span> : <span className="text-[10px] font-bold text-atseen-blue">Open</span>}</button>)}</div></section>

    {chapter ? <section className="scroll-mt-5 mt-7 border-t border-atseen-line pt-7" id="world-active-chapter"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-muted">Chapter {active + 1} of {chapters.length}</p><h2 className="mt-2 text-2xl font-black">{chapter.title}</h2>{chapter.locked ? <div className="mt-5 rounded-3xl border border-atseen-blue/20 bg-atseen-blue/[0.04] p-7 text-center"><FiLock className="mx-auto text-2xl text-atseen-blue" /><p className="mt-3 text-xs font-black tracking-wider text-atseen-blue">MEMBERS ONLY</p><p className="mt-2 text-sm text-atseen-muted">Unlocking this chapter starts your first residency month and opens every Members Only chapter.</p><button className="mt-5 rounded-full bg-atseen-blue px-6 py-3 text-sm font-black text-atseen-bg" onClick={() => setJoinOpen(true)} type="button">Become a resident · ✦{publication.pricing?.starsAmount}/mo</button></div> : <div className="mt-5 space-y-5">{chapter.blocks.map((block) => <Block block={block} key={block.id} onExpired={() => query.refetch()} />)}</div>}</section> : null}

    <section className="mt-10 border-t border-atseen-line pt-6"><h2 className="text-sm font-black">What people say</h2>{user?.role === "fan" ? <form className="mt-3 flex gap-2" onSubmit={addComment}><input className="min-w-0 flex-1 rounded-full border border-atseen-line bg-atseen-surface px-4 py-2 text-xs outline-none focus:border-atseen-blue/50" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Say something small…" value={comment} /><button className="rounded-full border border-atseen-blue/30 px-4 text-xs font-bold text-atseen-blue" type="submit">Post</button></form> : null}<div className="mt-4 space-y-3">{engagement.data?.comments?.map((item) => <article className="flex gap-3" key={item.id}>{item.author?.avatar ? <img alt="" className="h-7 w-7 rounded-full object-cover" src={item.author.avatar} /> : <span className="grid h-7 w-7 place-items-center rounded-full bg-atseen-surface text-[10px]">@</span>}<div className="min-w-0"><p className="text-xs font-bold">{item.author?.name || "Fan"}</p><p className="mt-1 text-xs leading-5 text-atseen-muted">{item.text}</p></div></article>)}{!engagement.isLoading && !engagement.data?.comments?.length ? <p className="flex items-center gap-2 text-xs text-atseen-muted"><FiMessageCircle /> No comments yet.</p> : null}</div></section>

    {chapters.length && active === chapters.length - 1 && !chapter?.locked ? <div className="mt-8 text-center"><button className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-7 py-3 text-sm font-bold text-atseen-muted" onClick={completeWorld} type="button"><FiCheck /> Continue ›</button></div> : null}
    {membership ? <p className="mt-6 text-center text-[10px] text-atseen-muted">Resident through {new Date(membership.currentPeriodEnd).toLocaleDateString()} · <Link className="text-atseen-blue" to="/memberships">Manage</Link></p> : null}
    <JoinPremiumModal onClose={() => setJoinOpen(false)} onSuccess={() => query.refetch()} open={joinOpen} publication={publication} />
  </article>;
}
