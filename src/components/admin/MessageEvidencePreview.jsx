import { useState } from "react";
import { FiClock, FiMessageSquare } from "react-icons/fi";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { resolveMediaUrl } from "../../utils/media";

function EvidenceMedia({ kind, media }) {
  const [failed, setFailed] = useState(false);
  if (!media?.assetId && !media?.url) return null;
  const url = resolveMediaUrl(media.url || "");
  if (!url || failed) return <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Preserved {kind === "audio" ? "voice note" : kind === "video" ? "video" : "image"} is currently unavailable. The remaining frozen metadata is still shown.</p>;
  if (kind === "image") return <img alt="Reported image evidence" className="mt-3 max-h-[520px] w-full rounded-2xl bg-slate-950 object-contain" src={url} onError={() => setFailed(true)} />;
  if (kind === "audio") return <audio aria-label="Reported voice-note evidence" className="mt-3 w-full" controls preload="metadata" src={url} onError={() => setFailed(true)} />;
  return <video aria-label="Reported video evidence" className="mt-3 max-h-[520px] w-full rounded-2xl bg-black object-contain" controls playsInline preload="metadata" src={url} onError={() => setFailed(true)} />;
}

function identity(report, row) {
  const senderId = String(row.senderId || "");
  const reporter = report.reporter || {};
  const author = report.author || report.reportedUser || {};
  if (senderId && senderId === String(reporter._id || reporter.id || "")) return reporter;
  if (senderId && senderId === String(author._id || author.id || "")) return author;
  return row.author || author;
}

function MessageCard({ report, row, reported = false }) {
  const person = identity(report, row);
  const avatar = resolveMediaUrl(person?.avatar || person?.avatarUrl || "");
  return <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${reported ? "border-orange-300 ring-2 ring-orange-100" : "border-slate-200"}`}>
    <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-900 text-xs font-black text-white">{avatar ? <img alt="" className="h-full w-full object-cover" src={avatar} /> : (person?.name || person?.username || "U").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{person?.name || "Captured participant"}</p><p className="truncate text-[11px] text-slate-500">{person?.username ? <bdi dir="ltr">@{person.username}</bdi> : row.senderId ? `User ${row.senderId}` : "Identity unavailable"}</p></div>{reported ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">Reported</span> : null}</header>
    <div className="p-4"><div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500"><span className="inline-flex items-center gap-1"><FiClock /> {row.createdAt ? new Date(row.createdAt).toLocaleString(__uiLocale()) : "Time unavailable"}</span>{row.disappearAfterSeconds != null ? <span className="rounded-full bg-slate-100 px-2 py-1">Disappearing message</span> : null}{row.mediaType ? <span className="rounded-full bg-slate-100 px-2 py-1">{String(row.mediaType).replaceAll("_", " ")}</span> : null}</div>{row.body ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{row.body}</p> : <p className="mt-3 text-sm italic text-slate-400">Media message without a caption</p>}{["image", "audio", "video"].map((kind) => <EvidenceMedia key={kind} kind={kind} media={row[kind]} />)}</div>
  </article>;
}

export default function MessageEvidencePreview({ report }) {
  const snapshot = report.snapshot || {};
  const rows = snapshot.messages || (snapshot.messageId || snapshot.body ? [snapshot] : []);
  const primaryRows = rows.filter((row) => row.reported !== false);
  const contextRows = snapshot.context?.filter((row) => !row.reported) || [];
  return <div className="space-y-3">{snapshot.frozenAt ? <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FiClock /> Captured {new Date(snapshot.frozenAt).toLocaleString(__uiLocale())}</p> : null}{primaryRows.length ? primaryRows.map((row, index) => <MessageCard key={row.messageId || index} report={report} reported={row.reported !== false} row={row} />) : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><FiMessageSquare className="me-2 inline" />This legacy report has no displayable message body. Raw evidence remains available below.</div>}{contextRows.length ? <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-black text-slate-700">Conversation context ({contextRows.length})</summary><div className="mt-4 space-y-3">{contextRows.map((row, index) => <MessageCard key={row.messageId || index} report={report} row={row} />)}</div></details> : null}</div>;
}
