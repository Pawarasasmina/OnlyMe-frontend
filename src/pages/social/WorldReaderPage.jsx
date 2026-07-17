import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import LockedChapterCard from "../../components/publication/LockedChapterCard";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { walletService } from "../../services/walletService";
import { publicationFinancialAction } from "../../utils/financialAccess";

function Block({ block, onExpired }) {
  if (["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(block.type)) return <p className="whitespace-pre-wrap leading-7">{block.text}</p>;
  if (block.type === "LINK") return <a href={block.url} rel="noreferrer" target="_blank">{block.label}</a>;
  const url = block.media?.secureUrl;
  if (!url) return <p>Preview unavailable</p>;
  if (block.type === "IMAGE") return <img alt="Chapter media" className="w-full rounded-xl" onError={onExpired} src={url} />;
  if (block.type === "VIDEO") return <video className="w-full" controls onError={onExpired} src={url} />;
  return <audio className="w-full" controls onError={onExpired} src={url} />;
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [modal, setModal] = useState(null);
  const query = useQuery({ queryKey: ["world", id], queryFn: () => api.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });
  if (query.isLoading) return <p>Loading World…</p>;
  if (query.isError) return <div className="min-h-screen bg-atseen-bg p-8 text-white"><h1>World unavailable</h1><p>It may be unpublished, archived, or missing.</p></div>;

  const publication = query.data;
  const chapter = publication.chapters[active];
  const premium = publication.kind === "PREMIUM_WORLD";
  const action = publicationFinancialAction(publication);
  const publicationId = publication.id || publication._id;
  const membership = memberships.data?.find((item) => (item.premiumPublication?._id || item.premiumPublication?.id) === publicationId);
  const beginFinancialAction = () => {
    if (!user) return navigate("/login", { state: { from: { pathname: location.pathname } } });
    setModal(action);
  };
  return <div className="min-h-screen bg-atseen-bg p-4 text-atseen-text"><main className="mx-auto max-w-3xl"><Link to={`/profile/${publication.creator?.username}`}>← @{publication.creator?.username}</Link>{publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} className="mt-5 aspect-video w-full rounded-3xl object-cover" src={publication.coverMedia.secureUrl} /> : null}<p className="mt-6 text-3xl">{publication.planet?.emoji || "🪐"}</p><p className="text-xs font-black uppercase text-atseen-blue">{premium ? "Premium World" : "World"} · Profile planet</p><h1 className="mt-2 text-4xl font-black">{publication.title}</h1><p className="mt-3 text-atseen-muted">{publication.summary}</p><p className="mt-3 whitespace-pre-wrap">{publication.description}</p>{action ? <button className="mt-5 rounded-full bg-atseen-blue px-6 py-3 font-black text-atseen-bg" onClick={beginFinancialAction} type="button">{premium ? `Join · ✦${publication.pricing?.starsAmount}/month` : `Unlock once · ✦${publication.pricing?.starsAmount}`}</button> : <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 text-sm font-bold text-emerald-200">You have full access to this {premium ? "Premium World" : "World"}.</p>}{premium && membership ? <p className="mt-3 rounded-xl border border-atseen-line p-4 text-sm">Membership: {membership.status.replaceAll("_", " ")}. Current access period ends {new Date(membership.currentPeriodEnd).toLocaleDateString()}. <Link className="underline" to="/memberships">Manage membership</Link></p> : null}<nav aria-label="World chapters" className="mt-7 space-y-2">{publication.chapters.map((item, index) => item.locked ? <LockedChapterCard chapter={item} index={index} key={item.stableChapterId} /> : <button className="w-full rounded-xl border border-atseen-blue/30 p-4 text-left" key={item.stableChapterId} onClick={() => setActive(index)}>Chapter {index + 1} · {item.title}</button>)}</nav>{chapter?.locked ? <section aria-live="polite" className="mt-7 rounded-2xl border border-atseen-line p-8 text-center"><h2>🔒 {chapter.title}</h2><p>No chapter body or media is available.</p></section> : chapter ? <section className="mt-7"><h2 className="text-2xl font-black">{chapter.title}</h2><div className="mt-5 space-y-5">{chapter.blocks.map((block) => <Block block={block} key={block.id} onExpired={() => query.refetch()} />)}</div></section> : null}</main><PurchaseWorldModal onClose={() => setModal(null)} onSuccess={() => query.refetch()} open={modal === "PURCHASE_WORLD"} publication={publication} /><JoinPremiumModal onClose={() => setModal(null)} onSuccess={() => query.refetch()} open={modal === "JOIN_PREMIUM"} publication={publication} /></div>;
}
