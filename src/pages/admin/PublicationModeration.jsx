import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiChevronRight, FiClock, FiEye, FiInbox } from "react-icons/fi";
import { adminPublicationService as api } from "../../services/adminPublicationService";

const statuses = ["PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED"];

export default function PublicationModeration() {
  const [status, setStatus] = useState("PENDING_REVIEW");
  const query = useQuery({ queryKey: ["planet-approvals", status], queryFn: () => api.list({ status }).then((response) => response.data.data) });
  const items = query.data?.items || [];
  return <div className="mx-auto max-w-6xl">
    <header><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Creator submissions</p><h1 className="mt-1 text-3xl font-black">Planet approvals</h1><p className="mt-2 text-sm text-slate-500">Review creator Planets before fans can purchase or join them.</p></header>
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Planet approval status">{statuses.map((item) => <button className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${status === item ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`} key={item} onClick={() => setStatus(item)} type="button">{item.replaceAll("_", " ")}</button>)}</nav>
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {query.isLoading ? <div className="grid min-h-48 place-items-center text-sm font-semibold text-slate-500">Loading planet approvals…</div> : query.isError ? <div className="grid min-h-48 place-items-center text-sm font-semibold text-red-600">Unable to load planet approvals.</div> : items.length ? <div className="divide-y divide-slate-100">{items.map((planet) => <Link className="group flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5" key={planet.id} to={`/admin/publication-moderation/${planet.id}`}><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-950 text-3xl shadow-inner">{planet.planet?.emoji || "🪐"}</span><span className="min-w-0 flex-1"><strong className="block truncate">{planet.title}</strong><small className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500"><span>@{planet.creator?.username || "unknown"}</span><span>·</span><span>{planet.chapters?.length || 0} chapters</span><span>·</span><span>{planet.chapters?.filter((chapter) => chapter.isPreview).length || 0} free previews</span></small></span><span className="hidden items-center gap-1 text-xs font-bold text-slate-400 sm:flex">{status === "PENDING_REVIEW" ? <FiClock /> : <FiEye />} Review</span><FiChevronRight className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" /></Link>)}</div> : <div className="grid min-h-56 place-items-center p-8 text-center"><div><FiInbox className="mx-auto text-3xl text-slate-300" /><h2 className="mt-3 font-black">No planets here</h2><p className="mt-1 text-sm text-slate-500">There are no {status.toLowerCase().replaceAll("_", " ")} planet submissions.</p></div></div>}
    </section>
  </div>;
}
