import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiMessageSquare, FiRefreshCw, FiShield, FiUser } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const statusStep = { RECEIVED: 1, REVIEWING: 2, RESOLVED: 3, CLOSED: 3 };
const statusLabel = { RECEIVED: "Received", REVIEWING: "Reviewing", RESOLVED: "Resolved", CLOSED: "Resolved" };
const statusClass = { RECEIVED: "bg-amber-100 text-amber-700", REVIEWING: "bg-blue-100 text-blue-700", RESOLVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-emerald-100 text-emerald-700" };
const decisions = [["NO_ACTION", "Dismiss — no violation"], ["WARNING", "Record a warning"], ["MESSAGING_RESTRICTED", "Restrict messaging"]];
const durations = [["24_HOURS", "24 hours"], ["2_DAYS", "2 days"], ["7_DAYS", "7 days"], ["30_DAYS", "30 days"]];
const activeRestriction = (user) => Boolean(user?.messagingRestrictedUntil && new Date(user.messagingRestrictedUntil) > new Date());

function Progress({ status }) {
  return <div><div className="mb-2 flex justify-between text-[10px] font-bold uppercase text-slate-400"><span>Received</span><span>Reviewing</span><span>Resolved</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${(statusStep[status] || 1) * 33.333}%` }} /></div></div>;
}

function Evidence({ report }) {
  const messages = report.snapshot?.messages || (report.snapshot ? [report.snapshot] : []);
  return messages.length ? <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{messages.map((message, index) => <div className={`max-w-[88%] rounded-xl border p-3 text-sm ${String(message.senderId) === String(report.reporter?._id) ? "mr-auto bg-white" : "ml-auto border-orange-200 bg-orange-50"}`} key={message.messageId || index}><p className="mb-1 text-[10px] font-bold uppercase text-slate-400">{String(message.senderId) === String(report.reporter?._id) ? "Reporter" : "Reported user"} · {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</p><p className="whitespace-pre-wrap break-words">{message.deletedAt ? "[Deleted] " : ""}{message.body || `[${message.mediaType || "media"}]`}</p></div>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No evidence snapshot available.</p>;
}

export default function MessageReportsPage() {
  const client = useQueryClient();
  const [userId, setUserId] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [action, setAction] = useState("MESSAGING_RESTRICTED");
  const [duration, setDuration] = useState("24_HOURS");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const usersQuery = useQuery({ queryKey: ["admin", "reported-message-users"], queryFn: () => adminService.getReportedMessageUsers().then((response) => response.data.data) });
  const groups = usersQuery.data?.items || [];
  const selectedUserId = userId || groups[0]?.user?._id || null;
  const detailQuery = useQuery({ queryKey: ["admin", "reported-message-user", selectedUserId], queryFn: () => adminService.getReportedMessageUser(selectedUserId).then((response) => response.data.data), enabled: Boolean(selectedUserId) });
  const reports = detailQuery.data?.reports || [];
  const selectedReport = reports.find((report) => report._id === reportId) || reports[0] || null;
  const restrictionReport = reports.find((report) => report.resolution?.action === "MESSAGING_RESTRICTED" && !report.resolution?.restrictionLiftedAt);
  useEffect(() => { setReportId(null); setNote(""); setError(""); }, [selectedUserId]);
  const refresh = async () => Promise.all([
    client.invalidateQueries({ queryKey: ["admin", "reported-message-users"] }),
    selectedUserId ? client.invalidateQueries({ queryKey: ["admin", "reported-message-user", selectedUserId] }) : null,
  ]);
  const startReview = async () => {
    if (!selectedReport) return;
    setBusy(true); setError("");
    try { await adminService.startMessageReportReview(selectedReport._id); await refresh(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not start review."); }
    finally { setBusy(false); }
  };
  const resolve = async () => {
    if (!selectedReport || !note.trim()) return setError("Add a moderation note explaining the decision.");
    setBusy(true); setError("");
    try { await adminService.resolveMessageReport(selectedReport._id, { action, note: note.trim(), ...(action === "MESSAGING_RESTRICTED" ? { duration } : {}) }); setNote(""); await refresh(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not save this decision."); }
    finally { setBusy(false); }
  };
  const lift = async () => {
    if (!restrictionReport) return;
    const reason = window.prompt("Why are you lifting this messaging restriction?");
    if (!reason?.trim()) return;
    setBusy(true); setError("");
    try { await adminService.resolveMessageReport(restrictionReport._id, { action: "RESTRICTION_LIFTED", note: reason.trim() }); await refresh(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not lift the restriction."); }
    finally { setBusy(false); }
  };
  const summary = usersQuery.data?.summary || {};
  return <div className="mx-auto max-w-[1800px]"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Trust and safety</p><h1 className="mt-1 text-3xl font-black">Reported users</h1><p className="mt-1 text-sm text-slate-500">One account per case file, containing every report, reporter, evidence item, warning, and restriction.</p></div><button className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold" onClick={refresh} type="button"><FiRefreshCw /> Refresh</button></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">{[["Reported users", summary.users || 0, FiUser], ["All reports", summary.reports || 0, FiMessageSquare], ["Open reports", summary.open || 0, FiClock], ["Restricted now", summary.restricted || 0, FiShield]].map(([label, value, Icon]) => <div className="rounded-2xl border bg-white p-4 shadow-sm" key={label}><Icon className="text-orange-500" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</section>
    {usersQuery.isLoading ? <p className="mt-8 text-slate-500">Loading reported users…</p> : usersQuery.isError ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">Unable to load reported users.</p> : !groups.length ? <p className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">No message reports have been submitted.</p> :
      <div className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]"><aside className="max-h-[78vh] space-y-2 overflow-y-auto">{groups.map((group) => <button className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm ${selectedUserId === String(group.user._id) ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200"}`} key={group.user._id} onClick={() => setUserId(String(group.user._id))} type="button"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{group.user.name}</p><p className="text-xs text-slate-500">@{group.user.username} · {group.user.role}</p></div>{group.received + group.reviewing ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">{group.received + group.reviewing} open</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Clear</span>}</div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span>{group.totalReports} reports</span><span>· {group.warnings} warnings</span><span>· {group.restrictions} restrictions</span></div>{activeRestriction(group.user) ? <p className="mt-2 text-xs font-bold text-red-600">Restricted until {new Date(group.user.messagingRestrictedUntil).toLocaleString()}</p> : null}<p className="mt-2 text-[10px] text-slate-400">Latest report {new Date(group.lastReportedAt).toLocaleString()}</p></button>)}</aside>
        {detailQuery.isLoading ? <p className="p-8 text-slate-500">Loading complete case file…</p> : detailQuery.isError ? <p className="rounded-xl bg-red-50 p-4 text-red-700">Unable to load this user’s reports.</p> : detailQuery.data ? <main className="min-w-0 space-y-5"><section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-orange-500">Reported account</p><h2 className="mt-1 text-2xl font-black">{detailQuery.data.user.name}</h2><p className="text-sm text-slate-500">@{detailQuery.data.user.username} · {detailQuery.data.user.email} · {detailQuery.data.user.role}</p></div>{activeRestriction(detailQuery.data.user) ? <div className="rounded-xl bg-red-50 px-4 py-3 text-right"><p className="text-xs font-black text-red-700">Messaging restricted</p><p className="text-[10px] text-red-600">Until {new Date(detailQuery.data.user.messagingRestrictedUntil).toLocaleString()}</p><button className="mt-2 text-xs font-bold text-blue-700 underline disabled:opacity-50" disabled={busy} onClick={lift} type="button">Lift restriction now</button></div> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Messaging available</span>}</div></section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-black">Previous moderation history</h3>{detailQuery.data.history.length ? <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-5">{detailQuery.data.history.map((event) => <li className="rounded-xl bg-slate-50 p-3" key={event.reportId}><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold">{event.action.replaceAll("_", " ")}</p><time className="text-[10px] text-slate-400">{event.resolvedAt ? new Date(event.resolvedAt).toLocaleString() : ""}</time></div><p className="mt-1 text-xs text-slate-600">{event.note}</p><p className="mt-2 text-[10px] text-slate-400">Admin: {event.reviewedBy?.name || event.reviewedBy?.username || "Unknown"}</p>{event.restrictionLiftedAt ? <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">Restriction lifted {new Date(event.restrictionLiftedAt).toLocaleString()}: {event.restrictionLiftNote}</p> : null}</li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No previous warnings or decisions.</p>}</section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-black">All reports against this user ({reports.length})</h3><div className="flex flex-wrap gap-2">{reports.map((report) => <button className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedReport?._id === report._id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`} key={report._id} onClick={() => { setReportId(report._id); setError(""); }} type="button">{report.reason.replaceAll("_", " ")} · {new Date(report.createdAt).toLocaleDateString()}</button>)}</div></div>
            {selectedReport ? <div className="mt-5"><div className="flex flex-wrap justify-between gap-3"><div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[selectedReport.status]}`}>{statusLabel[selectedReport.status]}</span><p className="mt-3 font-black">{selectedReport.reason.replaceAll("_", " ")} · {selectedReport.scope}</p><p className="mt-1 text-xs text-slate-500">Reported by {selectedReport.reporter?.name} (@{selectedReport.reporter?.username}) · {selectedReport.reporter?.email}</p></div><p className="text-xs text-slate-400">{new Date(selectedReport.createdAt).toLocaleString()}</p></div><div className="mt-5"><Progress status={selectedReport.status} /></div>{selectedReport.details ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Reporter details:</strong> {selectedReport.details}</div> : null}<h4 className="mb-2 mt-5 text-sm font-bold">Captured evidence</h4><Evidence report={selectedReport} />
              {selectedReport.resolution?.action ? <div className="mt-4 rounded-xl bg-emerald-50 p-4"><p className="font-bold text-emerald-800">{selectedReport.resolution.action.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-emerald-900">{selectedReport.resolution.note}</p></div> : null}
              {!["RESOLVED", "CLOSED"].includes(selectedReport.status) ? <div className="mt-5 border-t pt-5">{selectedReport.status === "RECEIVED" ? <button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white" disabled={busy} onClick={startReview} type="button">Start review</button> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Decision<select className="mt-2 w-full rounded-xl border p-3 font-normal" onChange={(event) => setAction(event.target.value)} value={action}>{decisions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{action === "MESSAGING_RESTRICTED" ? <label className="text-xs font-bold">Duration<select className="mt-2 w-full rounded-xl border p-3 font-normal" onChange={(event) => setDuration(event.target.value)} value={duration}>{durations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}</div><label className="mt-3 block text-xs font-bold">Moderation note<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal" maxLength={2000} onChange={(event) => setNote(event.target.value)} value={note} /></label>{error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<button className="mt-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !note.trim()} onClick={resolve} type="button">{busy ? "Saving…" : "Resolve report"}</button></div> : null}</div> : null}</section>
        </main> : null}</div>}
  </div>;
}
