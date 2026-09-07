import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import ModerationChecklist from "../../components/admin/ModerationChecklist";
import { EMPTY_REVIEW_CHECKS, reviewIsComplete } from "../../utils/moderationReview";
import { adminService } from "../../services/adminService";

const durations = [["1_HOUR", "1 hour"], ["5_HOURS", "5 hours"], ["24_HOURS", "1 day"], ["7_DAYS", "7 days"], ["30_DAYS", "1 month"]];
const outcomes = [["NO_ACTION", "Dismiss", "No violation found"], ["WARNING", "Send warning", "Notify the account owner"], ["MESSAGING_RESTRICTED", "Restrict messaging", "Temporarily disable messaging"]];
const title = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function MessageEvidence({ report }) {
  const messages = report.snapshot?.messages || (report.snapshot ? [report.snapshot] : []);
  return <div className="rounded-2xl bg-slate-100 p-4"><p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Conversation captured when reported</p>{messages.length ? <div className="max-h-[440px] space-y-2 overflow-y-auto">{messages.map((message, index) => <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white p-3 shadow-sm" key={message.messageId || index}><p className="whitespace-pre-wrap break-words text-sm">{message.body || `[${message.mediaType || "Media message"}]`}</p>{message.createdAt && <p className="mt-1 text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString()}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No captured message evidence is available.</p>}</div>;
}

export default function MessageReportsOnlyPage() {
  const client = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [action, setAction] = useState("NO_ACTION");
  const [duration, setDuration] = useState("24_HOURS");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState(EMPTY_REVIEW_CHECKS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ["admin", "message-report-users"], queryFn: () => adminService.getReportedMessageUsers().then((response) => response.data.data) });
  const groups = query.data?.items || [];
  const userId = selectedUserId || groups[0]?.user?._id;
  const detail = useQuery({ queryKey: ["admin", "message-report-user", userId], queryFn: () => adminService.getReportedMessageUser(userId).then((response) => response.data.data), enabled: Boolean(userId) });
  const reports = detail.data?.reports || [];
  const report = reports.find((item) => item._id === selectedReportId) || reports[0];
  const clearReview = () => { setNote(""); setChecks(EMPTY_REVIEW_CHECKS); setAction("NO_ACTION"); setError(""); };
  useEffect(() => { setSelectedReportId(null); clearReview(); }, [userId]);
  useEffect(() => { clearReview(); }, [selectedReportId]);
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["admin", "message-report-users"] }), client.invalidateQueries({ queryKey: ["admin", "message-report-user", userId] })]);
  const decide = async () => {
    if (!reviewIsComplete(checks)) return setError("Complete all four review checks before deciding.");
    if (!note.trim()) return setError("Add a moderation note explaining the decision.");
    if (action === "MESSAGING_RESTRICTED" && !window.confirm(`Restrict messaging for ${title(duration)}?`)) return;
    setBusy(true); setError("");
    try { await adminService.resolveMessageReport(report._id, { action, note: note.trim(), ...(action === "MESSAGING_RESTRICTED" ? { duration } : {}) }); clearReview(); await refresh(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not resolve report."); }
    finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-[1600px]"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Trust and safety</p><h1 className="mt-1 text-3xl font-black">Message reports</h1><p className="mt-1 text-sm text-slate-500">Choose one report, inspect its conversation evidence, and decide.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2" onClick={refresh}><FiRefreshCw /> Refresh</button></header>
    {query.isLoading ? <p className="mt-8">Loading…</p> : !groups.length ? <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500"><FiMessageSquare className="mx-auto mb-2 text-2xl" />No message reports.</div> : <div className="mt-6 grid gap-5 xl:grid-cols-[340px_1fr]"><aside className="space-y-2">{groups.map((group) => <button className={`w-full rounded-2xl border bg-white p-4 text-left ${String(userId) === String(group.user._id) ? "border-orange-400 ring-2 ring-orange-100" : ""}`} key={group.user._id} onClick={() => setSelectedUserId(group.user._id)}><b>{group.user.name}</b><p className="text-xs text-slate-500">@{group.user.username} · {group.totalReports} reports · {group.received + group.reviewing} open</p></button>)}</aside>
      <main className="min-w-0 rounded-2xl border bg-white p-5"><h3 className="font-black">Choose a report</h3><div className="mt-3 flex flex-wrap gap-2">{reports.map((item) => <button className={`rounded-full px-3 py-1.5 text-xs font-bold ${report?._id === item._id ? "bg-slate-900 text-white" : "bg-slate-100"}`} key={item._id} onClick={() => setSelectedReportId(item._id)}>{title(item.reason)} · {title(item.scope)}</button>)}</div>{report && <div className="mt-5"><div className="flex justify-between gap-4"><div><b>{title(report.reason)}</b><p className="text-xs text-slate-500">Reported by {report.reporter?.name} · {new Date(report.createdAt).toLocaleString()}</p></div><span className="text-xs font-bold">{title(report.status)}</span></div>{report.details && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm"><b>Reporter note:</b> {report.details}</p>}<div className="mt-4"><MessageEvidence report={report} /></div>
        {!['RESOLVED', 'CLOSED'].includes(report.status) && <div className="mt-6 space-y-4 border-t pt-5"><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={busy || report.status === "REVIEWING"} onClick={() => adminService.startActualMessageReportReview(report._id).then(refresh)}>{report.status === "REVIEWING" ? "Review in progress" : "Start review"}</button><ModerationChecklist checks={checks} onChange={setChecks} /><section><h4 className="font-black">Choose an outcome</h4><div className="mt-2 grid gap-2 md:grid-cols-3">{outcomes.map(([value, heading, description]) => <button className={`rounded-xl border p-3 text-left ${action === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "hover:border-slate-400"}`} key={value} onClick={() => setAction(value)}><b className="text-sm">{heading}</b><span className="mt-1 block text-[11px] text-slate-500">{description}</span></button>)}</div></section>{action === "MESSAGING_RESTRICTED" && <label className="block text-xs font-bold">Restriction duration<select className="mt-2 block w-full rounded-xl border p-3 sm:max-w-xs" value={duration} onChange={(event) => setDuration(event.target.value)}>{durations.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>}<label className="block text-xs font-bold">Admin decision note *<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3 text-sm font-normal" placeholder="Explain what you found and why this action is appropriate" value={note} onChange={(event) => setNote(event.target.value)} /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={busy || !reviewIsComplete(checks) || !note.trim()} onClick={decide}>{busy ? "Saving…" : `Confirm: ${outcomes.find(([value]) => value === action)?.[1]}`}</button></div>}
      </div>}</main></div>}
  </div>;
}
