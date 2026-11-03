import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiChevronRight, FiClock, FiEye, FiInbox } from "react-icons/fi";
import { adminPublicationService as api } from "../../services/adminPublicationService";

const statuses = ["PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED"];

export default function PublicationModeration() {
  __useUiLanguage();
  const [status, setStatus] = useState("PENDING_REVIEW");
  const query = useQuery({ queryKey: ["planet-approvals", status], queryFn: () => api.list({ status }).then((response) => response.data.data) });
  const items = query.data?.items || [];
  return <div className="mx-auto max-w-6xl">
    <header><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">{__msg("admin.creatorSubmissions")}</p><h1 className="mt-1 text-3xl font-black">{__msg("admin.planetApprovals")}</h1><p className="mt-2 text-sm text-slate-500">{__msg("admin.reviewCreatorPlanetsBeforeFansCanPurchaseOrJoin")}</p></header>
    <nav className="mt-6 flex flex-wrap gap-2" aria-label={__msg("admin.planetApprovalStatus")}>{__enumLabel(statuses.map((item) => <button className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${status === item ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`} key={item} onClick={() => setStatus(item)} type="button">{item.replaceAll("_", " ")}</button>))}</nav>
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {query.isLoading ? <div className="grid min-h-48 place-items-center text-sm font-semibold text-slate-500">{__msg("admin.loadingPlanetApprovals")}</div> : query.isError ? <div className="grid min-h-48 place-items-center text-sm font-semibold text-red-600">{__msg("admin.unableToLoadPlanetApprovals")}</div> : items.length ? <div className="divide-y divide-slate-100">{items.map((planet) => <Link className="group flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5" key={planet.id} to={`/admin/publication-moderation/${planet.id}`}><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-950 text-3xl shadow-inner">{planet.planet?.emoji || "🪐"}</span><span className="min-w-0 flex-1"><strong dir="auto" className="block truncate">{planet.title}</strong><small className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500"><span>@{planet.creator?.username || __msg("admin.unknown")}</span><span>·</span><span>{planet.chapters?.length || 0} {__msg("discover.chapters")}</span><span>·</span><span>{planet.chapters?.filter((chapter) => chapter.isPreview).length || 0} {__msg("admin.freePreviews")}</span></small></span><span className="hidden items-center gap-1 text-xs font-bold text-slate-400 sm:flex">{status === "PENDING_REVIEW" ? <FiClock /> : <FiEye />} {__msg("admin.review")}</span><FiChevronRight data-ui-directional="true" className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" /></Link>)}</div> : <div className="grid min-h-56 place-items-center p-8 text-center"><div><FiInbox className="mx-auto text-3xl text-slate-300" /><h2 className="mt-3 font-black">{__msg("admin.noPlanetsHere")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("admin.thereAreNo")} {__enumLabel(status.toLowerCase().replaceAll("_", " "))} {__msg("admin.planetSubmissions")}</p></div></div>}
    </section>
  </div>;
}
