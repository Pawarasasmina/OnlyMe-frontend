import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { publicationService as api } from "../../services/publicationService";

export default function WorldOwnerDetailPage() {
  __useUiLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState();
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const load = () => api.getMyPublication(id).then((response) => setP(response.data.data.publication)).catch((requestError) => setError(requestError.response?.data?.message || __msg("creator.unableToLoadWorld")));
  useEffect(load, [id]);
  const remove = async () => {
    if (!confirm(__msg("creator.removeValue0ItWillDisappearFromYourProfile", { value0: p.title }))) return;
    setRemoving(true); setError("");
    try { await api.deletePlanet(id, p.statusVersion); navigate("/studio/worlds", { replace: true }); }
    catch (requestError) { setError(requestError.response?.data?.message || __msg("creator.unableToRemovePlanet")); setRemoving(false); }
  };
  if (!p) return <p>{error || __msg("financial.loading")}</p>;
  return <div><Link to="/studio/worlds">{__msg("creator.manageWorlds")}</Link><div className="mt-5 flex justify-between"><div><h1 dir="auto" className="text-3xl font-black">{p.planet?.emoji} {p.title}</h1><p>{p.kind.replace("_", " ")} · {__enumLabel(p.status)} · {p.planet?.slot} · ✦{p.pricing?.starsAmount}{p.pricing?.mode === "MONTHLY" ? __msg("system.perMonthFull") : ""}</p></div>{["DRAFT", "CHANGES_REQUESTED", "PUBLISHED"].includes(p.status) ? <Link to={`/studio/worlds/${id}/edit`}>{__msg("profile.edit")}</Link> : null}</div>{error ? <p className="mt-5 rounded-xl bg-red-400/10 p-4 text-red-300">{__systemMessage(error)}</p> : null}{p.creatorVisibleFeedback ? <p className="mt-5 rounded-xl bg-orange-400/10 p-4">{p.creatorVisibleFeedback}</p> : null}{p.coverMedia?.secureUrl ? <img alt={__msg("publication.worldCover")} className="my-5 aspect-video w-full object-cover" src={p.coverMedia.secureUrl} /> : null}<p>{p.description}</p>{p.chapters.map((chapter, index) => <section className="my-3 rounded-xl border border-atseen-line p-4" key={chapter.stableChapterId}><strong dir="auto">{chapter.isPreview ? __msg("admin.preview") : __msg("creator.locked")} · {index + 1}. {chapter.title}</strong><p>{chapter.blocks.length} {__msg("creator.blocks")}</p></section>)}{p.status !== "ARCHIVED" ? <button className="mt-5 rounded-full border border-red-400/40 px-5 py-2.5 font-bold text-red-300 disabled:opacity-50" disabled={removing} onClick={remove} type="button">{removing ? __msg("creator.removing") : __msg("creator.removePlanet")}</button> : null}</div>;
}
