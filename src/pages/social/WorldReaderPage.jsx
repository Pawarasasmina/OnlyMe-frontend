import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight, FiLock } from "react-icons/fi";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { walletService } from "../../services/walletService";
import { publicationFinancialAction } from "../../utils/financialAccess";

function Block({ block, onExpired }) {
  if (block.type === "TEXT") return <p className="whitespace-pre-wrap text-[15px] leading-7 text-white/85">{block.text}</p>;
  if (["KEY_POINT", "HIGHLIGHT"].includes(block.type)) return <div className="rounded-r-2xl border-l-2 border-atseen-blue bg-atseen-blue/[0.07] px-5 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-blue">{block.type === "KEY_POINT" ? "Key point" : "Highlight"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/90">{block.text}</p></div>;
  if (block.type === "LINK") return <a className="inline-flex rounded-full border border-atseen-blue/30 px-4 py-2 text-sm font-bold text-atseen-blue" href={block.url} rel="noreferrer" target="_blank">{block.label}</a>;
  const url = block.media?.secureUrl;
  if (!url) return <p className="text-sm text-atseen-muted">Preview unavailable</p>;
  if (block.type === "IMAGE") return <img alt="Chapter media" className="w-full rounded-2xl" onError={onExpired} src={url} />;
  if (block.type === "VIDEO") return <video className="w-full rounded-2xl" controls onError={onExpired} src={url} />;
  return <audio className="w-full" controls onError={onExpired} src={url} />;
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState(0);
  const [modal, setModal] = useState(null);
  const query = useQuery({ queryKey: ["world", id], queryFn: () => api.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });

  if (query.isLoading) return <div className="grid min-h-[60vh] place-items-center"><p className="text-sm text-atseen-muted">Opening World…</p></div>;
  if (query.isError) return <div className="rounded-3xl border border-atseen-line bg-atseen-surface p-8 text-center text-white"><h1 className="text-xl font-black">World unavailable</h1><p className="mt-2 text-sm text-atseen-muted">It may be unpublished, archived, or missing.</p></div>;

  const publication = query.data;
  const chapters = publication.chapters || [];
  const chapter = chapters[active];
  const premium = publication.kind === "PREMIUM_WORLD";
  const action = publicationFinancialAction(publication);
  const publicationId = publication.id || publication._id;
  const membership = memberships.data?.find((item) => (item.premiumPublication?._id || item.premiumPublication?.id) === publicationId);
  const beginFinancialAction = () => {
    if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
    if (action) setModal(action);
  };
  const openChapter = (index) => {
    const nextChapter = chapters[index];
    if (!nextChapter) return;
    if (nextChapter.locked) return beginFinancialAction();
    setActive(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const modals = <><PurchaseWorldModal onClose={() => setModal(null)} onSuccess={() => query.refetch()} open={modal === "PURCHASE_WORLD"} publication={publication} /><JoinPremiumModal onClose={() => setModal(null)} onSuccess={() => query.refetch()} open={modal === "JOIN_PREMIUM"} publication={publication} /></>;

  if (!entered) return <div className="-mx-4 -mt-6 bg-atseen-bg text-atseen-text sm:-mx-6 md:-mx-[34px] md:-mt-[30px]"><section className="world-entry">
    <Link aria-label="Back to creator profile" className="absolute left-6 top-6 grid h-12 w-12 place-items-center rounded-full border border-atseen-line bg-black/20 text-lg text-atseen-muted backdrop-blur transition hover:border-atseen-blue/40 hover:text-white" to={`/profile/${publication.creator?.username}`}><FiArrowLeft /></Link>
    <div className="world-entry-content"><div className="world-entry-planet"><span>{publication.planet?.emoji || "🌍"}</span></div><h1>{publication.title}</h1><p>a world by {publication.creator?.name?.split(" ")[0] || `@${publication.creator?.username}`}</p><button className="world-entry-button" onClick={() => { setActive(0); setEntered(true); }} type="button">Step inside</button></div>
  </section>{modals}</div>;

  return <div className="min-h-[70vh] bg-atseen-bg text-atseen-text"><main className="mx-auto max-w-2xl">
    <header className="flex items-center gap-3 border-b border-atseen-line pb-4"><button aria-label="Back to planet entrance" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-atseen-muted hover:text-white" onClick={() => setEntered(false)} type="button"><FiArrowLeft /></button><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-atseen-muted">Chapter {active + 1} of {chapters.length} · {publication.title}</p><h1 className="mt-1 truncate text-xl font-black">{chapter?.title}</h1></div><span className="text-2xl">{publication.planet?.emoji || "🌍"}</span></header>
    <div aria-label="Chapter progress" className="mt-4 flex gap-1">{chapters.map((item, index) => <span className={`h-1 flex-1 rounded-full ${index <= active ? "bg-atseen-blue" : "bg-white/10"}`} key={item.stableChapterId} />)}</div>
    {active === 0 && publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} className="mt-6 aspect-video w-full rounded-3xl object-cover" src={publication.coverMedia.secureUrl} /> : null}
    {active === 0 && publication.summary ? <p className="mt-5 text-sm leading-6 text-atseen-muted">{publication.summary}</p> : null}
    {chapter?.locked ? <section aria-live="polite" className="mt-8 rounded-3xl border border-atseen-line bg-atseen-surface p-8 text-center"><FiLock className="mx-auto text-2xl text-atseen-blue" /><h2 className="mt-4 font-black">{chapter.title}</h2><p className="mt-2 text-sm text-atseen-muted">Unlock this world to continue the journey.</p><button className="mt-5 rounded-full bg-atseen-blue px-6 py-3 text-sm font-black text-atseen-bg" onClick={beginFinancialAction} type="button">{premium ? `Join · ✦${publication.pricing?.starsAmount}/month` : `Unlock once · ✦${publication.pricing?.starsAmount}`}</button></section> : chapter ? <section className="mt-8"><div className="space-y-5">{chapter.blocks.map((block) => <Block block={block} key={block.id} onExpired={() => query.refetch()} />)}</div></section> : <p className="mt-8 text-center text-sm text-atseen-muted">This World has no chapters yet.</p>}
    {premium && membership ? <p className="mt-8 text-center text-xs text-atseen-muted">Membership access ends {new Date(membership.currentPeriodEnd).toLocaleDateString()}. <Link className="text-atseen-blue" to="/memberships">Manage</Link></p> : null}
    {chapters.length ? <nav aria-label="Chapter navigation" className="mt-10 flex items-center gap-3 border-t border-atseen-line pt-5"><button className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-atseen-line text-atseen-muted transition hover:text-white disabled:invisible" disabled={active === 0} onClick={() => openChapter(active - 1)} type="button"><FiArrowLeft /></button>{active < chapters.length - 1 ? <button className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-5 text-sm font-black text-atseen-bg" onClick={() => openChapter(active + 1)} type="button">{chapters[active + 1]?.locked ? <FiLock /> : null}<span className="truncate">Next — {chapters[active + 1]?.title}</span><FiArrowRight className="shrink-0" /></button> : <Link className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-atseen-line px-5 text-sm font-black" to={`/profile/${publication.creator?.username}`}>Finish world</Link>}</nav> : null}
  </main>{modals}</div>;
}
