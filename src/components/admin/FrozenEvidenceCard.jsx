import { useState } from "react";
import { FiChevronDown, FiClock, FiExternalLink, FiFileText, FiShield, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { resolveMediaUrl } from "../../utils/media";
import MessageEvidencePreview from "./MessageEvidencePreview";
import PostReportPreview from "./PostReportPreview";

const MESSAGE_SCOPES = new Set(["MESSAGE", "GROUP_MESSAGE", "CONVERSATION"]);
const CONTENT_SCOPES = new Set(["FEED_POST", "POST", "STORY", "SEEN", "WORLD", "PUBLICATION", "COMMENT"]);

function workspace(report) {
  if (MESSAGE_SCOPES.has(report?.scope)) return "message";
  if (["PROFILE", "PROFILE_MEDIA", "USER"].includes(report?.scope)) return "user";
  return "post";
}

function reportId(report) {
  return report?.id || report?._id || "";
}

function capturedAt(report) {
  return report?.snapshot?.frozenAt || report?.snapshot?.capturedAt || report?.snapshot?.createdAt || report?.createdAt;
}

function ProfileEvidence({ report }) {
  const snapshot = report.snapshot || {};
  const person = report.reportedUser || report.author || {};
  const username = snapshot.username || snapshot.creatorUsername || person.username || "unknown";
  const name = snapshot.name || snapshot.displayName || snapshot.creatorName || person.name || "Reported account";
  const avatar = resolveMediaUrl(snapshot.avatar || snapshot.avatarUrl || person.avatar || person.avatarUrl || "");
  const userId = snapshot.userId || snapshot.reportedUserId || snapshot.ownerId || snapshot.creatorId || person._id || person.id;
  const mediaUrl = resolveMediaUrl(snapshot.url || snapshot.mediaUrl || "");
  const mediaType = String(snapshot.type || snapshot.mediaType || "image").toLowerCase();

  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center gap-4 border-b border-slate-100 p-5">
      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 text-xl font-black text-white">
        {avatar ? <img alt="" className="h-full w-full object-cover" src={avatar} /> : name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-black text-slate-950">{name}</p>
        <p className="truncate text-sm text-slate-500"><bdi dir="ltr">@{username}</bdi></p>
      </div>
      <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600">{report.scope === "PROFILE_MEDIA" ? "Profile media" : "Profile"}</span>
    </header>
    {report.scope === "PROFILE_MEDIA" && mediaUrl ? <div className="bg-slate-950">
      {mediaType.includes("video") ? <video className="max-h-[520px] w-full object-contain" controls playsInline preload="metadata" src={mediaUrl} /> : <img alt="Reported profile evidence" className="max-h-[520px] w-full object-contain" src={mediaUrl} />}
    </div> : null}
    <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account ID</span><p className="mt-1 break-all font-semibold text-slate-700">{userId || "Unavailable"}</p></div>
      <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Captured</span><p className="mt-1 font-semibold text-slate-700">{capturedAt(report) ? new Date(capturedAt(report)).toLocaleString(__uiLocale()) : "Time unavailable"}</p></div>
    </div>
  </article>;
}

function UnknownEvidence({ report }) {
  const snapshot = report.snapshot || {};
  const blockText = Array.isArray(snapshot.blocks) ? snapshot.blocks.map((block) => block.text || block.caption || block.title).filter(Boolean).join("\n\n") : "";
  const text = snapshot.text || snapshot.body || snapshot.caption || snapshot.summary || blockText || report.details;
  const media = snapshot.media || snapshot.coverMedia || (snapshot.mediaUrl || snapshot.url ? { url: snapshot.mediaUrl || snapshot.url, type: snapshot.mediaType || snapshot.type } : null) || (Array.isArray(snapshot.blocks) ? snapshot.blocks.find((block) => block.media)?.media : null);
  const mediaUrl = resolveMediaUrl(Array.isArray(media) ? media[0]?.url || media[0]?.secureUrl : media?.url || media?.secureUrl || "");
  const mediaType = String(Array.isArray(media) ? media[0]?.type || media[0]?.resourceType : media?.type || media?.resourceType || "image").toLowerCase();
  const author = report.author || report.reportedUser || report.creator || {};
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600"><FiFileText /></span><div className="min-w-0"><h3 className="truncate font-black text-slate-950">{snapshot.title || snapshot.name || "Captured evidence"}</h3><p className="truncate text-xs text-slate-500">{author.username ? `@${author.username} · ` : ""}{String(report.scope || report.kind || "Report").replaceAll("_", " ")}{capturedAt(report) ? ` · ${new Date(capturedAt(report)).toLocaleString(__uiLocale())}` : ""}</p></div></div>
    {text ? <p className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{text}</p> : <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">This legacy report does not contain a displayable content snapshot. Raw evidence remains available below.</p>}
    {mediaUrl ? mediaType.includes("video") ? <video className="mt-4 max-h-[520px] w-full rounded-2xl bg-black object-contain" controls playsInline preload="metadata" src={mediaUrl} /> : <img alt="Captured evidence" className="mt-4 max-h-[520px] w-full rounded-2xl bg-slate-950 object-contain" src={mediaUrl} /> : null}
  </article>;
}

export default function FrozenEvidenceCard({ report, showReviewLink = true }) {
  const [rawOpen, setRawOpen] = useState(false);
  if (!report) return null;
  const scope = String(report.scope || report.kind || "").toUpperCase();
  const area = workspace({ ...report, scope });
  const id = reportId(report);
  const userId = report.snapshot?.userId || report.snapshot?.reportedUserId || report.snapshot?.ownerId || report.reportedUser?._id || report.author?._id || report.author?.id;
  const reviewPath = id ? `/admin/${area}-reports/${id}` : "";
  const accountPath = userId ? `/admin/users/${userId}` : "";

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3"><FiShield className="shrink-0 text-blue-700" /><div><p className="text-sm font-black text-blue-950">Frozen at report time</p><p className="text-xs text-blue-700">Review this preserved card—not the potentially changed live content.</p></div></div>
      <div className="flex flex-wrap gap-2">
        {showReviewLink && reviewPath ? <Link className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800" to={reviewPath}>Open full review <FiExternalLink /></Link> : null}
        {accountPath && ["PROFILE", "PROFILE_MEDIA", "USER"].includes(scope) ? <Link className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-800" to={accountPath}><FiUser /> Account</Link> : null}
      </div>
    </div>

    {MESSAGE_SCOPES.has(scope) ? <MessageEvidencePreview report={report} /> : CONTENT_SCOPES.has(scope) ? <PostReportPreview report={{ ...report, scope }} /> : ["PROFILE", "PROFILE_MEDIA", "USER"].includes(scope) ? <ProfileEvidence report={{ ...report, scope }} /> : <UnknownEvidence report={report} />}

    <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white" onToggle={(event) => setRawOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
        <span className="inline-flex items-center gap-2"><FiFileText className="text-slate-400" /> Raw evidence</span>
        <FiChevronDown className={`transition ${rawOpen ? "rotate-180" : ""}`} />
      </summary>
      <div className="border-t border-slate-200 bg-slate-950 p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400"><FiClock /> Read-only preserved snapshot</p>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-200">{JSON.stringify(report.snapshot || report, null, 2)}</pre>
      </div>
    </details>
  </div>;
}
