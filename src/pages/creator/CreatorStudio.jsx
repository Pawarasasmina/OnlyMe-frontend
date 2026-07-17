import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { contentService } from "../../services/contentService";
import { publicationService as api } from "../../services/publicationService";

function Stat({ label, value }) { return <div className="rounded-xl border border-atseen-line p-4"><strong className="text-2xl">{value}</strong><p className="text-xs text-atseen-muted">{label}</p></div>; }

export default function CreatorStudio() {
  const [legacy, setLegacy] = useState([]);
  const [publications, setPublications] = useState([]);
  useEffect(() => { Promise.all([contentService.listMyContent({ limit: 5 }), api.listMyPublications({ limit: 50 })]).then(([content, publication]) => { setLegacy(content.data.data.items || []); setPublications(publication.data.data.items || []); }); }, []);
  const seens = publications.filter((item) => item.kind === "SEEN");
  const worlds = publications.filter((item) => item.kind === "WORLD");
  const premium = publications.filter((item) => item.kind === "PREMIUM_WORLD");
  const reviewed = [...worlds, ...premium];
  return <div><div className="flex justify-between"><div><h1 className="text-3xl font-black">Creator Studio</h1><p className="text-atseen-muted">Structured publications and Legacy Content remain separate.</p></div><Link to="/create">Create</Link></div><div className="mt-6 grid gap-3 sm:grid-cols-4"><Stat label="Seens" value={seens.length} /><Stat label="Worlds used" value={`${worlds.filter((item) => item.status !== "ARCHIVED").length}/2`} /><Stat label="Premium used" value={`${premium.filter((item) => item.status !== "ARCHIVED").length}/1`} /><Stat label="World reviews" value={`${reviewed.filter((item) => item.status === "PENDING_REVIEW").length} pending · ${reviewed.filter((item) => item.status === "CHANGES_REQUESTED").length} changes`} /></div><div className="mt-6 flex flex-wrap gap-3"><Link to="/create/seen">Create Seen</Link><Link to="/create/world">Create World</Link><Link to="/create/premium-world">Create Premium World</Link><Link to="/studio/seens">Manage Seens</Link><Link to="/studio/worlds">Manage Worlds</Link><Link to="/creator/content">Legacy Content</Link></div><section className="mt-6 rounded-2xl border border-atseen-line p-5"><h2 className="font-black">Recent structured publications</h2>{publications.slice(0, 5).map((item) => <Link className="mt-3 flex justify-between" key={item.id} to={item.kind === "SEEN" ? `/studio/seens/${item.id}` : `/studio/worlds/${item.id}`}><span>{item.title || "Untitled"}</span><span>{item.kind.replaceAll("_", " ")} · {item.status}</span></Link>)}</section><section className="mt-6 rounded-2xl border border-atseen-line p-5"><h2 className="font-black">Legacy Content</h2>{legacy.slice(0, 5).map((item) => <Link className="mt-3 block" key={item.id} to={`/creator/content/${item.id}`}>{item.title}</Link>)}</section><section className="mt-6 rounded-2xl border border-atseen-line p-5"><h2 className="font-black">Stars activity</h2><p className="mt-2 text-sm text-atseen-muted">Creator earnings reporting is not available yet. Backend ledger activity is intentionally not presented as an incomplete or estimated earnings total.</p></section></div>;
}
