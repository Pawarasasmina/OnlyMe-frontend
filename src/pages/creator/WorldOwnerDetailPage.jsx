import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { publicationService as api } from "../../services/publicationService";

export default function WorldOwnerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState();
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const load = () => api.getMyPublication(id).then((response) => setP(response.data.data.publication)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load World"));
  useEffect(load, [id]);
  const remove = async () => {
    if (!confirm(`Remove “${p.title}”? It will disappear from your profile and will no longer be visible to fans.`)) return;
    setRemoving(true); setError("");
    try { await api.deletePlanet(id, p.statusVersion); navigate("/studio/worlds", { replace: true }); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to remove Planet"); setRemoving(false); }
  };
  if (!p) return <p>{error || "Loading…"}</p>;
  return <div><Link to="/studio/worlds">← Manage Worlds</Link><div className="mt-5 flex justify-between"><div><h1 className="text-3xl font-black">{p.planet?.emoji} {p.title}</h1><p>{p.kind.replace("_", " ")} · {p.status} · {p.planet?.slot} · ✦{p.pricing?.starsAmount}{p.pricing?.mode === "MONTHLY" ? "/month" : ""}</p></div>{["DRAFT", "CHANGES_REQUESTED", "PUBLISHED"].includes(p.status) ? <Link to={`/studio/worlds/${id}/edit`}>Edit</Link> : null}</div>{error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-red-300">{error}</p> : null}{p.creatorVisibleFeedback ? <p className="mt-5 rounded-xl bg-orange-400/10 p-4">{p.creatorVisibleFeedback}</p> : null}{p.coverMedia?.secureUrl ? <img alt="World cover" className="my-5 aspect-video w-full object-cover" src={p.coverMedia.secureUrl} /> : null}<p>{p.description}</p>{p.chapters.map((chapter, index) => <section className="my-3 rounded-xl border border-atseen-line p-4" key={chapter.stableChapterId}><strong>{chapter.isPreview ? "Preview" : "🔒 Locked"} · {index + 1}. {chapter.title}</strong><p>{chapter.blocks.length} blocks</p></section>)}{p.status !== "ARCHIVED" ? <button className="mt-5 rounded-full border border-red-400/40 px-5 py-2.5 font-bold text-red-300 disabled:opacity-50" disabled={removing} onClick={remove} type="button">{removing ? "Removing…" : "Remove Planet"}</button> : null}</div>;
}
