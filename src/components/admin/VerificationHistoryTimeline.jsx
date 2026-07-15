import AdminVerificationStatusBadge from "./AdminVerificationStatusBadge";

function VerificationHistoryTimeline({ history = [] }) {
  if (!history.length) return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No review history is available.</p>;
  return <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
    {history.map((event) => <li className="relative" key={event._id}><span className="absolute -left-[1.95rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-orange-500 ring-2 ring-slate-200" /><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-900">{event.action.replaceAll("_", " ")}</p><time className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</time></div><div className="mt-3 flex flex-wrap items-center gap-2"><AdminVerificationStatusBadge status={event.previousStatus} /><span className="text-slate-400">→</span><AdminVerificationStatusBadge status={event.newStatus} /></div>{event.admin ? <p className="mt-3 text-xs text-slate-500">Reviewer: {event.admin.name || event.admin.username || event.admin.email}</p> : null}{event.creatorVisibleMessage ? <p className="mt-3 text-sm text-slate-700"><strong>Creator message:</strong> {event.creatorVisibleMessage}</p> : null}{event.internalNote ? <p className="mt-2 rounded-lg bg-slate-200/60 p-3 text-sm text-slate-700"><strong>Internal note:</strong> {event.internalNote}</p> : null}{event.reason ? <p className="mt-2 text-sm text-red-700"><strong>Reason:</strong> {event.reason}</p> : null}</div></li>)}
  </ol>;
}
export default VerificationHistoryTimeline;
