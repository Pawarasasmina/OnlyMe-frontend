import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiClock, FiMessageSquare, FiRefreshCw, FiShield, FiUser } from "react-icons/fi";
import ModerationChecklist from "../../components/admin/ModerationChecklist";
import { EMPTY_REVIEW_CHECKS, reviewIsComplete } from "../../utils/moderationReview";
import PostReportPreview from "../../components/admin/PostReportPreview";
import { adminService } from "../../services/adminService";

const outcomes = [__uiTuple(["NO_ACTION", { __uiMessage: "admin.dismiss" }, { __uiMessage: "admin.noViolationFound" }]), __uiTuple(["WARNING", { __uiMessage: "admin.sendWarning" }, { __uiMessage: "admin.notifyTheAccountOwner" }]), __uiTuple(["ACCOUNT_RESTRICTED", { __uiMessage: "admin.restrictLogin" }, { __uiMessage: "options.Temporarily_block_platform_access" }])];
const durations = [__uiTuple(["1_HOUR", { __uiMessage: "system.copy.f030c3d66765" }]), __uiTuple(["5_HOURS", { __uiMessage: "system.copy.1fe288aa5f69" }]), __uiTuple(["24_HOURS", { __uiMessage: "system.copy.2d8a6f7c3446" }]), __uiTuple(["7_DAYS", { __uiMessage: "system.copy.0a8dd6adce7a" }]), __uiTuple(["30_DAYS", { __uiMessage: "system.copy.42fa50c1524a" }])];
const label = (value = "") => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const restricted = (user) => Boolean(user?.loginRestrictedUntil && new Date(user.loginRestrictedUntil) > new Date());

function Evidence({ report }) {
  __useUiLanguage();
  const snapshot = report.snapshot || {};
  return <div className="space-y-3"><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm"><p className="text-[10px] font-bold uppercase text-blue-500">{__msg("admin.reportRaisedBy")}</p><p className="mt-1 font-bold">{report.reporter?.name || __msg("admin.unknownUser")} {report.reporter?.username ? `(@${report.reporter.username})` : ""}</p><p className="text-xs text-slate-600">{report.reporter?.email || __msg("admin.emailUnavailable")}</p></div>{["FEED_POST", "SEEN"].includes(report.scope) ? <div className="rounded-2xl bg-slate-50 p-4"><PostReportPreview report={report} /></div> : <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="text-xs font-bold uppercase text-slate-400">{__msg("admin.reportedProfile")}</p><p className="mt-2 font-bold">@{snapshot.username || report.reportedUser?.username || __msg("admin.unknown_bc7819")}</p><p className="mt-1 text-slate-600">{snapshot.name || report.reportedUser?.name}</p><p className="mt-3 text-xs text-slate-400">{__msg("admin.userId")} {snapshot.userId || report.reportedUser?._id}</p></div>}</div>;
}

export default function UserReportsPage({ reportType = "profile" }) {
  __useUiLanguage();
  const isPost = reportType === "post";
  const client = useQueryClient();
  const [userId, setUserId] = useState(null);
  const [reportId, setReportId] = useState(null);
  const [action, setAction] = useState("NO_ACTION");
  const [duration, setDuration] = useState("24_HOURS");
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState(EMPTY_REVIEW_CHECKS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const namespace = isPost ? "reported-post-users" : "reported-profile-users";
  const listQuery = useQuery({ queryKey: ["admin", namespace], queryFn: () => (isPost ? adminService.getReportedPostUsers() : adminService.getReportedUsers()).then((response) => response.data.data) });
  const groups = listQuery.data?.items || [];
  const selectedUserId = userId || groups[0]?.user?._id;
  const detailQuery = useQuery({ queryKey: ["admin", namespace, selectedUserId], queryFn: () => (isPost ? adminService.getReportedPostUser(selectedUserId) : adminService.getReportedUser(selectedUserId)).then((response) => response.data.data), enabled: Boolean(selectedUserId) });
  const reports = detailQuery.data?.reports || [];
  const report = reports.find((item) => item._id === reportId) || reports[0];
  const restrictionReport = reports.find((item) => item.resolution?.action === "ACCOUNT_RESTRICTED" && !item.resolution?.restrictionLiftedAt);
  const summary = listQuery.data?.summary || {};

  const clearReview = () => { setNote(""); setError(""); setChecks(EMPTY_REVIEW_CHECKS); setAction("NO_ACTION"); };
  useEffect(() => { setReportId(null); clearReview(); }, [selectedUserId]);
  useEffect(() => { clearReview(); }, [reportId]);
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", namespace] });
  const run = async (operation) => { setBusy(true); setError(""); try { await operation(); await refresh(); } catch (requestError) { setError(requestError.response?.data?.message || __msg("admin.couldNotSaveThisModerationDecision")); } finally { setBusy(false); } };
  const resolveReport = isPost ? adminService.resolvePostReport : adminService.resolveUserReport;
  const startReview = isPost ? adminService.startPostReportReview : adminService.startUserReportReview;
  const decide = () => {
    if (!reviewIsComplete(checks)) return setError(__msg("admin.completeAllFourReviewChecksBeforeDeciding"));
    if (!note.trim()) return setError(__msg("admin.addAModerationNoteExplainingTheDecision"));
    if (action === "ACCOUNT_RESTRICTED" && !window.confirm(__msg("admin.restrictThisAccountForValue0", { value0: label(duration) }))) return;
    return run(() => resolveReport(report._id, { action, note: note.trim(), ...(action === "ACCOUNT_RESTRICTED" ? { duration } : {}) }).then(clearReview));
  };
  const lift = () => { const reason = window.prompt(__msg("admin.whyAreYouLiftingThisLoginRestriction")); if (reason?.trim()) run(() => resolveReport(restrictionReport._id, { action: "RESTRICTION_LIFTED", note: reason.trim() })); };

  return <div className="mx-auto max-w-[1800px]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">{__msg("admin.trustAndSafety")}</p><h1 className="mt-1 text-3xl font-black">{isPost ? __msg("admin.reportedPosts") : __msg("admin.reportedUserProfiles")}</h1><p className="mt-1 text-sm text-slate-500">{__msg("admin.chooseAReportReviewItsEvidenceCompleteTheChecks")}</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold" onClick={refresh}><FiRefreshCw /> {__msg("discover.refresh")}</button></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-4">{[[__msg("system.copy.14b59bc67dd3"), summary.users, FiUser], [__msg("system.copy.40061bc604c6"), summary.reports, FiMessageSquare], [__msg("system.AdminDashboard.3b1bb4d541"), summary.open, FiClock], [__msg("admin.loginRestricted"), summary.restricted, FiShield]].map(([text, value, Icon]) => <div className="rounded-2xl border bg-white p-4 shadow-sm" key={text}><Icon className="text-orange-500" /><p className="mt-3 text-2xl font-black">{value || 0}</p><p className="text-xs text-slate-500">{text}</p></div>)}</section>
    {listQuery.isLoading ? <p className="mt-8">{__msg("admin.loadingReports")}</p> : !groups.length ? <p className="mt-8 rounded-2xl border border-dashed p-12 text-center text-slate-500">{__msg("search.no")} {isPost ? __msg("admin.post") : __msg("admin.profile")} {__msg("admin.reports_394cc2")}</p> : <div className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]"><aside className="space-y-2">{groups.map((group) => <button className={`w-full rounded-2xl border bg-white p-4 text-start ${String(selectedUserId) === String(group.user._id) ? "border-orange-400 ring-2 ring-orange-100" : ""}`} key={group.user._id} onClick={() => setUserId(group.user._id)}><div className="flex justify-between gap-2"><div><b dir="auto">{group.user.name}</b><p dir="auto" className="text-xs text-slate-500">@{group.user.username}</p></div><b className="text-xs text-red-600">{group.received + group.reviewing} {__msg("admin.open")}</b></div><p className="mt-3 text-xs font-bold">{group.totalReports} {__msg("admin.reports_0b7ec6")}</p></button>)}</aside>
      {detailQuery.data && <main className="min-w-0 space-y-5"><section className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><h2 dir="auto" className="text-2xl font-black">{detailQuery.data.user.name}</h2><p dir="auto" className="text-sm text-slate-500">@{detailQuery.data.user.username} · {detailQuery.data.user.email}</p></div>{restricted(detailQuery.data.user) ? <div className="rounded-xl bg-red-50 p-3 text-end text-xs"><b className="text-red-700">{__msg("admin.loginRestricted")}</b><p>{__msg("admin.until")} {new Date(detailQuery.data.user.loginRestrictedUntil).toLocaleString(__uiLocale())}</p><button className="mt-2 font-bold text-blue-700 underline" disabled={busy} onClick={lift}>{__msg("admin.liftNow")}</button></div> : <span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{__msg("admin.loginAvailable")}</span>}</div></section>
        <section className="rounded-2xl border bg-white p-5"><h3 className="font-black">{__msg("admin.chooseAReport")}</h3><div className="mt-3 flex flex-wrap gap-2">{reports.map((item) => <button className={`rounded-full px-3 py-1.5 text-xs font-bold ${report?._id === item._id ? "bg-slate-900 text-white" : "bg-slate-100"}`} key={item._id} onClick={() => setReportId(item._id)}>{label(item.reason)} · {label(item.scope)}</button>)}</div>{report && <div className="mt-5"><p className="font-black">{label(report.reason)}</p><p className="text-xs text-slate-500">{label(report.status)} · {new Date(report.createdAt).toLocaleString(__uiLocale())}</p>{report.details && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm"><b>{__msg("admin.reporterNote")}</b> {report.details}</p>}<h4 className="mb-2 mt-4 text-sm font-bold">{__msg("admin.capturedEvidence")}</h4><Evidence report={report} />
          {!['RESOLVED', 'CLOSED'].includes(report.status) && <div className="mt-6 space-y-4 border-t pt-5"><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={busy || report.status === "REVIEWING"} onClick={() => run(() => startReview(report._id))}>{report.status === "REVIEWING" ? __msg("admin.reviewInProgress") : __msg("admin.startReview")}</button><ModerationChecklist checks={checks} onChange={setChecks} /><section><h4 className="font-black">{__msg("admin.chooseAnOutcome")}</h4><div className="mt-2 grid gap-2 md:grid-cols-3">{outcomes.map(([value, title, description]) => <button className={`rounded-xl border p-3 text-start ${action === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "hover:border-slate-400"}`} key={value} onClick={() => setAction(value)} type="button"><b className="text-sm">{title}</b><span className="mt-1 block text-[11px] text-slate-500">{description}</span></button>)}</div></section>{action === "ACCOUNT_RESTRICTED" && <label className="block text-xs font-bold">{__msg("admin.restrictionDuration")}<select className="mt-2 block w-full rounded-xl border p-3 sm:max-w-xs" value={duration} onChange={(event) => setDuration(event.target.value)}>{durations.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>}<label className="block text-xs font-bold">{__msg("admin.adminDecisionNote")}<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3 text-sm font-normal" maxLength={2000} placeholder={__msg("admin.explainWhatYouFoundAndWhyThisActionIs")} value={note} onChange={(event) => setNote(event.target.value)} /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{__systemMessage(error)}</p>}<button className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={busy || !reviewIsComplete(checks) || !note.trim()} onClick={decide}>{busy ? __msg("financial.saving") : __msg("admin.confirm", { value0: outcomes.find(([value]) => value === action)?.[1] })}</button></div>}
        </div>}</section></main>}
    </div>}
  </div>;
}
