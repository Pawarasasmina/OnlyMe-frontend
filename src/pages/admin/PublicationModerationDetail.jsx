import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiAlertCircle, FiArrowLeft, FiCheck, FiClock, FiExternalLink, FiEye, FiFileText, FiImage, FiLock, FiPlay, FiUser, FiVideo, FiX } from "react-icons/fi";
import { adminPublicationService as api } from "../../services/adminPublicationService";
import { resolveMediaUrl } from "../../utils/media";

const PLANET = String.fromCodePoint(0x1fa90);
const STAR = String.fromCharCode(10022);
const statusStyles = { PENDING_REVIEW: "bg-amber-100 text-amber-800 ring-amber-200", PUBLISHED: "bg-emerald-100 text-emerald-800 ring-emerald-200", CHANGES_REQUESTED: "bg-orange-100 text-orange-800 ring-orange-200", REJECTED: "bg-red-100 text-red-800 ring-red-200" };

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ring-inset ${statusStyles[status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>{String(status || "unknown").replaceAll("_", " ")}</span>;
}

function mediaType(media, fallback = "") { return String(media?.resourceType || media?.mediaType || media?.type || fallback).toLowerCase(); }

function Media({ media, className = "", title = "Publication media" }) {
  const src = resolveMediaUrl(media?.secureUrl || media?.url || media);
  if (!src) return null;
  if (mediaType(media).includes("video")) return <video aria-label={title} className={className} controls playsInline preload="metadata" src={src} />;
  if (mediaType(media).includes("audio")) return <audio aria-label={title} className={className} controls preload="metadata" src={src} />;
  return <img alt={title} className={className} src={src} />;
}

function PreviewBlock({ block }) {
  if (["TEXT", "HIGHLIGHT"].includes(block.type)) return <p className={block.type === "HIGHLIGHT" ? "rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4 font-semibold text-sky-50" : "whitespace-pre-wrap text-sm leading-7 text-slate-200"}>{block.text}</p>;
  if (block.type === "KEY_POINT") return <div className="flex gap-3 rounded-2xl bg-white/5 p-4 text-sm text-slate-100"><FiCheck className="mt-0.5 shrink-0 text-sky-300" /><span>{block.text}</span></div>;
  if (["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) return <Media className={block.type === "IMAGE" ? "max-h-[520px] w-full rounded-2xl object-cover" : block.type === "VIDEO" ? "max-h-[520px] w-full rounded-2xl bg-black" : "w-full"} media={{ ...block.media, type: block.type }} title={block.metadata?.label || "Chapter attachment"} />;
  if (block.type === "LINK" && block.url) return <a className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-sky-300" href={block.url} rel="noreferrer" target="_blank"><span>{block.label || block.url}</span><FiExternalLink /></a>;
  if (block.type === "POLL") return <section className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="font-bold">{block.metadata?.question || "Poll"}</p><div className="mt-3 space-y-2">{(block.metadata?.options || []).map((option) => <div className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300" key={option}>{option}</div>)}</div><small className="mt-3 block text-slate-500">Preview mode; voting is disabled.</small></section>;
  return <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">{block.type || "Unsupported"} block has no previewable content.</div>;
}

function ChapterViewer({ chapter, chapters, index, onClose, onSelect }) {
  const blocks = [...(chapter.blocks || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/90 p-3 backdrop-blur sm:p-8" role="dialog" aria-modal="true" aria-label={`Preview ${chapter.title}`}>
    <article className="mx-auto min-h-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#080c13] text-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-white/10 bg-[#080c13]/95 p-4 backdrop-blur sm:p-6"><button aria-label="Close chapter preview" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10" onClick={onClose} type="button"><FiArrowLeft /></button><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-sky-300">Fan view · Chapter {index + 1} of {chapters.length}</p><h2 className="truncate text-xl font-black">{chapter.title || `Chapter ${index + 1}`}</h2></div><button aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" onClick={onClose} type="button"><FiX /></button></header>
      <div className="flex gap-1 px-6 pt-5">{chapters.map((item, itemIndex) => <button aria-label={`Preview chapter ${itemIndex + 1}`} className={`h-1 flex-1 rounded-full ${itemIndex === index ? "bg-sky-300" : "bg-white/15"}`} key={item.stableChapterId || itemIndex} onClick={() => onSelect(itemIndex)} type="button" />)}</div>
      <section className="space-y-5 p-5 sm:p-8">{blocks.length ? blocks.map((block, blockIndex) => <PreviewBlock block={block} key={block.id || blockIndex} />) : <div className="rounded-2xl border border-dashed border-white/15 py-16 text-center text-sm text-slate-400">This chapter has no content.</div>}</section>
      <footer className="flex justify-end border-t border-white/10 p-5">{index + 1 < chapters.length ? <button className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-black text-slate-950" onClick={() => onSelect(index + 1)} type="button">Next chapter →</button> : <button className="rounded-xl bg-white/10 px-5 py-3 text-sm font-bold" onClick={onClose} type="button">Back to planet</button>}</footer>
    </article>
  </div>;
}

function PlanetPreview({ publication, onOpenChapter }) {
  const chapters = publication.chapters || [];
  const premium = publication.kind === "PREMIUM_WORLD";
  const creatorName = publication.creator?.name || publication.creator?.username || "Creator";
  return <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#070b12] text-white shadow-xl">
    <div className="border-b border-white/10 bg-white/[.03] px-5 py-3 text-center text-[10px] font-black uppercase tracking-[.2em] text-sky-300"><FiEye className="mr-2 inline text-sm" />Fan experience preview · full purchased access</div>
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-9">
      <div className="text-center"><div className="relative mx-auto grid h-28 w-28 place-items-center rounded-full border border-sky-200/30 bg-[radial-gradient(circle_at_35%_25%,rgba(186,230,253,.35),#142036_68%)] text-6xl shadow-[0_0_55px_rgba(125,211,252,.2)]"><span className="relative z-10">{publication.planet?.emoji || PLANET}</span><span className="absolute h-10 w-36 rotate-[-14deg] rounded-[50%] border border-sky-200/30" /></div><p className="mt-5 text-xs font-bold text-slate-400">{creatorName} · previewing as a purchased member</p></div>
      <div className="mt-7 flex justify-center"><span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-[11px] font-bold text-sky-200">{PLANET} {premium ? "Premium Planet" : "Free World"}{premium ? ` · ${STAR}${publication.pricing?.starsAmount || 0}/mo` : ""}</span></div>
      <h2 className="mt-6 text-center text-3xl font-black tracking-tight sm:text-4xl">{publication.title}</h2>
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5">{publication.coverMedia?.secureUrl ? <Media className="max-h-[520px] w-full object-cover" media={publication.coverMedia} title={`${publication.title} cover`} /> : <div className="grid h-64 place-items-center text-6xl text-slate-600">{PLANET}</div>}</div>
      <p className="mx-auto mt-6 max-w-xl whitespace-pre-wrap text-center text-sm leading-7 text-slate-300">{publication.description || publication.summary || "No description supplied."}</p>
      <section className="mt-9"><div className="flex items-end justify-between border-b border-white/10 pb-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">The experience</p><h3 className="mt-1 text-xl font-black">Explore every chapter</h3></div><span className="text-xs text-slate-500">{chapters.length} chapters</span></div>
        <div className="divide-y divide-white/10">{chapters.map((chapter, index) => <button className="group flex w-full items-center gap-4 py-4 text-left" key={chapter.stableChapterId || index} onClick={() => onOpenChapter(index)} type="button"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-sm font-black text-sky-300">{index + 1}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{chapter.title || `Chapter ${index + 1}`}</b><small className="mt-1 flex items-center gap-1.5 text-slate-500">{chapter.isPreview ? <><FiEye /> Free preview</> : <><FiLock /> Member chapter</>} · {(chapter.blocks || []).length} items</small></span><span className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-400 transition group-hover:bg-sky-300 group-hover:text-slate-950"><FiPlay /></span></button>)}</div>
        {!chapters.length ? <div className="mt-4 rounded-2xl border border-dashed border-white/15 py-10 text-center text-sm text-slate-500">No chapters were submitted.</div> : null}
      </section>
    </div>
  </section>;
}

function ReviewHistory({ history }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Review history</h2>{history?.length ? <div className="mt-4 space-y-4">{history.map((item) => <div className="flex gap-3" key={item._id}><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" /><div><p className="text-sm font-bold">{String(item.action).replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date unavailable"}{item.admin?.name ? ` · ${item.admin.name}` : ""}</p>{item.creatorVisibleMessage ? <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{item.creatorVisibleMessage}</p> : null}</div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No previous decisions.</p>}</section>;
}

export default function PublicationModerationDetail() {
  const { id } = useParams();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeChapter, setActiveChapter] = useState(null);
  const [checks, setChecks] = useState({ media: false, content: false, experience: false });
  const query = useQuery({ queryKey: ["publication-moderation", id], queryFn: () => api.get(id).then((response) => response.data.data) });
  const publication = query.data?.publication;
  const chapters = useMemo(() => publication?.chapters || [], [publication]);
  const checklistComplete = Object.values(checks).every(Boolean);

  const decide = async (decision) => {
    setError(""); setNotice("");
    if (["changes", "reject"].includes(decision) && !feedback.trim()) { setError("Add clear creator-visible feedback before sending this decision."); return; }
    if (decision === "approve" && !checklistComplete) { setError("Complete all review checks before approving this planet."); return; }
    setSubmitting(true);
    try {
      if (decision === "approve") await api.approve(id, { manualReviewConfirmed: true });
      else if (decision === "changes") await api.requestChanges(id, { creatorVisibleMessage: feedback.trim(), reasonCodes: [] });
      else await api.reject(id, { creatorVisibleMessage: feedback.trim(), rejectionReason: "ADMIN_REVIEW" });
      setNotice(decision === "approve" ? "Planet approved and published." : decision === "changes" ? "Changes requested from the creator." : "Planet rejected.");
      await query.refetch();
    } catch (requestError) {
      if (requestError.response?.status === 409) await query.refetch();
      setError(requestError.response?.status === 409 ? "Another admin already reviewed this submission. The latest status is shown." : requestError.response?.data?.message || "The decision could not be saved.");
    } finally { setSubmitting(false); }
  };

  if (query.isLoading) return <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-slate-500">Loading planet review…</div>;
  if (query.isError || !publication) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><b>Publication unavailable</b><p className="mt-1 text-sm">The moderation record could not be loaded.</p></div>;
  const canDecide = publication.status === "PENDING_REVIEW";

  return <div className="mx-auto max-w-[1700px]">
    <Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950" to="/admin/publication-moderation"><FiArrowLeft /> Planet approvals</Link>
    <header className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black sm:text-3xl">Review planet</h1><StatusBadge status={publication.status} /></div><p className="mt-2 max-w-2xl text-sm text-slate-500">Review the exact media and chapter experience a paying fan receives, then record your decision.</p></div><div className="flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-xl border border-slate-200 bg-white px-3 py-2">Submitted v{publication.submittedVersion ?? "—"}</span><span className="rounded-xl border border-slate-200 bg-white px-3 py-2">Status v{publication.statusVersion ?? "—"}</span></div></header>
    {error ? <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"><FiAlertCircle className="mt-0.5 shrink-0" />{error}</div> : null}
    {notice ? <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><FiCheck />{notice}</div> : null}
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">{publication.creator?.avatar ? <img alt="" className="h-full w-full object-cover" src={resolveMediaUrl(publication.creator.avatar)} /> : <FiUser />}</span><div className="min-w-0 flex-1"><p className="font-black">{publication.creator?.name || "Unknown creator"}</p><p className="truncate text-sm text-slate-500">@{publication.creator?.username || "unknown"} · {publication.creator?.email || "No email"}</p></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-xl bg-slate-50 p-3"><FiFileText className="mx-auto mb-1" /><b>{chapters.length}</b><small className="block text-slate-500">chapters</small></span><span className="rounded-xl bg-slate-50 p-3"><FiVideo className="mx-auto mb-1" /><b>{chapters.flatMap((chapter) => chapter.blocks || []).filter((block) => block.type === "VIDEO").length}</b><small className="block text-slate-500">videos</small></span><span className="rounded-xl bg-slate-50 p-3"><FiImage className="mx-auto mb-1" /><b>{chapters.flatMap((chapter) => chapter.blocks || []).filter((block) => block.type === "IMAGE").length}</b><small className="block text-slate-500">images</small></span></div></div></section>
        <PlanetPreview onOpenChapter={setActiveChapter} publication={publication} />
      </div>
      <aside className="h-fit space-y-5 xl:sticky xl:top-24">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Review decision</h2>{canDecide ? <span className="flex items-center gap-1 text-xs font-bold text-amber-700"><FiClock /> Awaiting review</span> : null}</div>
          {canDecide ? <><p className="mt-2 text-xs leading-5 text-slate-500">Open the chapters, play the media, and confirm each check.</p><div className="mt-5 space-y-2">{[["media", "Media plays and displays correctly"], ["content", "Content follows platform standards"], ["experience", "Purchased fan experience is complete"]].map(([key, label]) => <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${checks[key] ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`} key={key}><input checked={checks[key]} className="mt-1 accent-emerald-600" onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" /><span>{label}</span></label>)}</div>
          <label className="mt-5 block text-xs font-bold text-slate-700" htmlFor="moderation-feedback">Feedback to creator <span className="font-normal text-slate-400">(required for changes or rejection)</span></label><textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" id="moderation-feedback" maxLength={2000} onChange={(event) => setFeedback(event.target.value)} placeholder="Explain exactly what needs attention…" value={feedback} /><div className="mt-1 text-right text-[10px] text-slate-400">{feedback.length}/2000</div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!checklistComplete || submitting} onClick={() => decide("approve")} type="button"><FiCheck /> Approve and publish</button><div className="mt-2 grid grid-cols-2 gap-2"><button className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-bold text-orange-700 disabled:opacity-50" disabled={submitting} onClick={() => decide("changes")} type="button">Request changes</button><button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50" disabled={submitting} onClick={() => decide("reject")} type="button">Reject</button></div></> : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><FiLock className="mb-2" /><b className="block">Review completed</b><p className="mt-1 text-xs">This version is read-only because a decision has already been recorded.</p></div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Submission details</h2><dl className="mt-4 space-y-3 text-sm">{[["Type", publication.kind?.replaceAll("_", " ")], ["Category", publication.category], ["Free previews", chapters.filter((chapter) => chapter.isPreview).length], ["Price", publication.kind === "PREMIUM_WORLD" ? `${STAR}${publication.pricing?.starsAmount || 0}/month` : "Free"]].map(([label, value]) => <div className="flex items-center justify-between gap-3" key={label}><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold">{value ?? "—"}</dd></div>)}</dl></section>
        <ReviewHistory history={query.data.history} />
      </aside>
    </div>
    {activeChapter !== null && chapters[activeChapter] ? <ChapterViewer chapter={chapters[activeChapter]} chapters={chapters} index={activeChapter} onClose={() => setActiveChapter(null)} onSelect={setActiveChapter} /> : null}
  </div>;
}
