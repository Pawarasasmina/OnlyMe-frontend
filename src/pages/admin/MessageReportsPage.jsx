import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiMessageSquare, FiRefreshCw, FiShield, FiUser } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const decisions = [["NO_ACTION", "Dismiss — no violation"], ["WARNING", "Record a warning"], ["ACCOUNT_RESTRICTED", "Restrict system login"]];
const durations = [["1_HOUR", "1 hour"], ["5_HOURS", "5 hours"], ["24_HOURS", "1 day"], ["7_DAYS", "7 days"], ["30_DAYS", "1 month"]];
const activeRestriction = (user) => Boolean(user?.loginRestrictedUntil && new Date(user.loginRestrictedUntil) > new Date());
const label = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

function Evidence({ report }) {
  const snapshot = report.snapshot || {};
  const reporter = <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm"><p className="text-[10px] font-bold uppercase text-blue-500">Report raised by</p><p className="mt-1 font-bold">{report.reporter?.name || "Unknown user"} {report.reporter?.username ? `(@${report.reporter.username})` : ""}</p><p className="text-xs text-slate-600">{report.reporter?.email || "Email unavailable"}</p></div>;
  if (["FEED_POST", "SEEN", "PROFILE"].includes(report.scope)) return <>{reporter}<div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="text-xs font-bold uppercase text-slate-400">{label(report.scope)}</p><p className="mt-2 whitespace-pre-wrap">{snapshot.text || snapshot.title || snapshot.summary || `@${snapshot.username || "Profile evidence"}`}</p><p className="mt-2 text-xs text-slate-400">Content ID: {snapshot.postId || snapshot.publicationId || snapshot.userId}</p></div></>;
  const messages = snapshot.messages || (report.snapshot ? [snapshot] : []);
  return <>{reporter}{messages.length ? <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{messages.map((message, index) => <div className="rounded-xl border bg-white p-3 text-sm" key={message.messageId || index}><p className="whitespace-pre-wrap break-words">{message.body || `[${message.mediaType || "media"}]`}</p></div>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No evidence snapshot available.</p>}</>;
}

export default function UserReportsPage() {
  const client = useQueryClient();
  const [userId, setUserId] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [action, setAction] = useState("ACCOUNT_RESTRICTED");
  const [duration, setDuration] = useState("1_HOUR");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const usersQuery = useQuery({ queryKey: ["admin", "reported-users"], queryFn: () => adminService.getReportedUsers().then((response) => response.data.data) });
  const groups = usersQuery.data?.items || [];
  const selectedUserId = userId || groups[0]?.user?._id || null;
  const detailQuery = useQuery({ queryKey: ["admin", "reported-user", selectedUserId], queryFn: () => adminService.getReportedUser(selectedUserId).then((response) => response.data.data), enabled: Boolean(selectedUserId) });
  const reports = detailQuery.data?.reports || [];
  const selectedReport = reports.find((item) => item._id === reportId) || reports[0] || null;
  const restrictionReport = reports.find((item) => item.resolution?.action === "ACCOUNT_RESTRICTED" && !item.resolution?.restrictionLiftedAt);
  useEffect(() => { setReportId(null); setNote(""); setError(""); }, [selectedUserId]);
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["admin", "reported-users"] }), client.invalidateQueries({ queryKey: ["admin", "reported-user", selectedUserId] })]);
  const run = async (operation) => { setBusy(true); setError(""); try { await operation(); await refresh(); } catch (requestError) { setError(requestError.response?.data?.message || "Could not save this moderation decision."); } finally { setBusy(false); } };
  const resolve = () => note.trim() ? run(() => adminService.resolveUserReport(selectedReport._id, { action, note: note.trim(), ...(action === "ACCOUNT_RESTRICTED" ? { duration } : {}) }).then(() => setNote(""))) : setError("Add a moderation note explaining the decision.");
  const lift = () => { const reason = window.prompt("Why are you lifting this login restriction?"); if (reason?.trim()) run(() => adminService.resolveUserReport(restrictionReport._id, { action: "RESTRICTION_LIFTED", note: reason.trim() })); };
  const summary = usersQuery.data?.summary || {};

  return <div className="mx-auto max-w-[1800px]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Trust and safety</p><h1 className="mt-1 text-3xl font-black">Reported users</h1><p className="mt-1 text-sm text-slate-500">All feed, profile, conversation, and message reports grouped by account.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold" onClick={refresh}><FiRefreshCw /> Refresh</button></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">{[["Reported users", summary.users, FiUser], ["All reports", summary.reports, FiMessageSquare], ["Open reports", summary.open, FiClock], ["Login restricted", summary.restricted, FiShield]].map(([text, value, Icon]) => <div className="rounded-2xl border bg-white p-4 shadow-sm" key={text}><Icon className="text-orange-500" /><p className="mt-3 text-2xl font-black">{value || 0}</p><p className="text-xs text-slate-500">{text}</p></div>)}</section>
    {usersQuery.isLoading ? <p className="mt-8">Loading reported users…</p> : !groups.length ? <p className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">No user reports have been submitted.</p> : <div className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
      <aside className="space-y-2">{groups.map((group) => <button className={`w-full rounded-2xl border bg-white p-4 text-left ${selectedUserId === String(group.user._id) ? "border-orange-400 ring-2 ring-orange-100" : ""}`} key={group.user._id} onClick={() => setUserId(String(group.user._id))}><div className="flex justify-between"><div><p className="font-black">{group.user.name}</p><p className="text-xs text-slate-500">@{group.user.username}</p></div><b className="text-xs text-red-600">{group.received + group.reviewing} open</b></div><p className="mt-3 text-xs font-bold">{group.totalReports} reports</p><div className="mt-2 flex flex-wrap gap-1">{Object.entries(group.categoryCounts || {}).map(([category, count]) => <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]" key={category}>{label(category)} · {count}</span>)}</div>{activeRestriction(group.user) && <p className="mt-2 text-xs font-bold text-red-600">Login restricted until {new Date(group.user.loginRestrictedUntil).toLocaleString()}</p>}</button>)}</aside>
      {detailQuery.data && <main className="min-w-0 space-y-5"><section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-2xl font-black">{detailQuery.data.user.name}</h2><p className="text-sm text-slate-500">@{detailQuery.data.user.username} · {detailQuery.data.user.email}</p></div>{activeRestriction(detailQuery.data.user) ? <div className="rounded-xl bg-red-50 p-3 text-right text-xs"><b className="text-red-700">System login restricted</b><p>Until {new Date(detailQuery.data.user.loginRestrictedUntil).toLocaleString()}</p><button className="mt-2 font-bold text-blue-700 underline" disabled={busy} onClick={lift}>Lift now</button></div> : <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Login available</span>}</div></section>
        <section className="rounded-2xl border bg-white p-5"><h3 className="font-black">All reports ({reports.length})</h3><div className="mt-3 flex flex-wrap gap-2">{reports.map((item) => <button className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedReport?._id === item._id ? "bg-slate-900 text-white" : "bg-slate-100"}`} key={item._id} onClick={() => setReportId(item._id)}>{label(item.reason)} · {label(item.scope)}</button>)}</div>{selectedReport && <div className="mt-5"><p className="font-bold">{label(selectedReport.reason)} · {label(selectedReport.status)}</p><p className="text-xs text-slate-500">Reported by {selectedReport.reporter?.name} · {new Date(selectedReport.createdAt).toLocaleString()}</p>{selectedReport.details && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{selectedReport.details}</p>}<h4 className="mb-2 mt-4 text-sm font-bold">Captured evidence</h4><Evidence report={selectedReport} />{!["RESOLVED", "CLOSED"].includes(selectedReport.status) && <div className="mt-5 border-t pt-5"><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white" disabled={busy} onClick={() => run(() => adminService.startMessageReportReview(selectedReport._id))}>Start review</button><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Decision<select className="mt-2 w-full rounded-xl border p-3" value={action} onChange={(event) => setAction(event.target.value)}>{decisions.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>{action === "ACCOUNT_RESTRICTED" && <label className="text-xs font-bold">Duration<select className="mt-2 w-full rounded-xl border p-3" value={duration} onChange={(event) => setDuration(event.target.value)}>{durations.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>}</div><textarea className="mt-3 min-h-24 w-full rounded-xl border p-3 text-sm" maxLength={2000} placeholder="Moderation note (required)" value={note} onChange={(event) => setNote(event.target.value)} />{error && <p className="mt-2 text-sm text-red-600">{error}</p>}<button className="mt-3 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white" disabled={busy} onClick={resolve}>Resolve report</button></div>}</div>}</section>
      </main>}
    </div>}
  </div>;
}
