import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiMessageSquare, FiRefreshCw } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const durations = [["1_HOUR", "1 hour"], ["5_HOURS", "5 hours"], ["24_HOURS", "1 day"], ["7_DAYS", "7 days"], ["30_DAYS", "1 month"]];
const title = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function MessageReportsOnlyPage() {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [duration, setDuration] = useState("24_HOURS");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ["admin", "message-report-users"], queryFn: () => adminService.getReportedMessageUsers().then((response) => response.data.data) });
  const groups = query.data?.items || [];
  const userId = selectedId || groups[0]?.user?._id;
  const detail = useQuery({ queryKey: ["admin", "message-report-user", userId], queryFn: () => adminService.getReportedMessageUser(userId).then((response) => response.data.data), enabled: Boolean(userId) });
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: ["admin", "message-report-users"] }), client.invalidateQueries({ queryKey: ["admin", "message-report-user", userId] })]);
  const act = async (report, action) => { if (!note.trim()) return setError("Add a moderation note first."); setBusy(true); setError(""); try { await adminService.resolveMessageReport(report._id, { action, note: note.trim(), ...(action === "MESSAGING_RESTRICTED" ? { duration } : {}) }); setNote(""); await refresh(); } catch (requestError) { setError(requestError.response?.data?.message || "Could not resolve report."); } finally { setBusy(false); } };
  return <div className="mx-auto max-w-[1600px]"><header className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">Trust and safety</p><h1 className="mt-1 text-3xl font-black">Message reports</h1><p className="mt-1 text-sm text-slate-500">Direct, group, and conversation reports only.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2" onClick={refresh}><FiRefreshCw /> Refresh</button></header>
    {query.isLoading ? <p className="mt-8">Loading…</p> : !groups.length ? <div className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500"><FiMessageSquare className="mx-auto mb-2 text-2xl" />No message reports.</div> : <div className="mt-6 grid gap-5 xl:grid-cols-[340px_1fr]"><aside className="space-y-2">{groups.map((group) => <button className={`w-full rounded-2xl border bg-white p-4 text-left ${String(userId) === String(group.user._id) ? "border-orange-400 ring-2 ring-orange-100" : ""}`} key={group.user._id} onClick={() => setSelectedId(group.user._id)}><b>{group.user.name}</b><p className="text-xs text-slate-500">@{group.user.username} · {group.totalReports} reports · {group.received + group.reviewing} open</p></button>)}</aside>
      <main className="space-y-3">{detail.data?.reports?.map((report) => <article className="rounded-2xl border bg-white p-5" key={report._id}><div className="flex justify-between gap-4"><div><b>{title(report.reason)}</b><p className="text-xs text-slate-500">{title(report.scope)} · reported by {report.reporter?.name}</p></div><span className="text-xs font-bold">{title(report.status)}</span></div>{report.details && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{report.details}</p>}{!["RESOLVED", "CLOSED"].includes(report.status) && <div className="mt-4 border-t pt-4"><textarea className="w-full rounded-xl border p-3 text-sm" placeholder="Moderation note" value={note} onChange={(event) => setNote(event.target.value)} /><div className="mt-2 flex flex-wrap gap-2"><select className="rounded-xl border px-3" value={duration} onChange={(event) => setDuration(event.target.value)}>{durations.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white" disabled={busy} onClick={() => act(report, "MESSAGING_RESTRICTED")}>Restrict messaging</button><button className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold" disabled={busy} onClick={() => act(report, "WARNING")}>Warning</button><button className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold" disabled={busy} onClick={() => act(report, "NO_ACTION")}>Dismiss</button></div>{error && <p className="mt-2 text-sm text-red-600">{error}</p>}</div>}</article>)}</main></div>}
  </div>;
}
