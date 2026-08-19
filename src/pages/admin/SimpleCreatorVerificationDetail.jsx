import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiExternalLink, FiInstagram, FiMusic, FiUser, FiX } from "react-icons/fi";
import AdminProtectedDocumentViewer from "../../components/admin/AdminProtectedDocumentViewer";
import AdminVerificationStatusBadge from "../../components/admin/AdminVerificationStatusBadge";
import Loader from "../../components/common/Loader";
import { adminVerificationService } from "../../services/adminVerificationService";
import { resolveMediaUrl } from "../../utils/media";

const errorText = (error) => error.response?.data?.message || "Unable to save this decision.";

export default function SimpleCreatorVerificationDetail() {
  const { id } = useParams();
  const client = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const query = useQuery({ queryKey: ["admin", "creator-verification", id], queryFn: () => adminVerificationService.getById(id).then((response) => response.data.data.verification), refetchOnMount: "always" });
  const verification = query.data;
  const creator = verification?.creator;
  const pending = verification?.status === "PENDING_REVIEW" && !verification?.stateSyncPending;

  const refresh = async () => {
    await query.refetch();
    client.invalidateQueries({ queryKey: ["admin", "creator-verifications"] });
    client.invalidateQueries({ queryKey: ["admin", "creator-verification-count"] });
  };
  const approve = async () => {
    if (!checked) { setError("Check that you reviewed the page and ID first."); return; }
    setBusy(true); setError("");
    try { await adminVerificationService.approve(id, { internalNote: note }); setSuccess("Creator approved."); await refresh(); }
    catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    if (!reason.trim()) { setError("Enter a reason the creator can understand."); return; }
    setBusy(true); setError("");
    try { await adminVerificationService.reject(id, { rejectionReason: "OTHER", creatorVisibleMessage: reason.trim(), internalNote: note }); setMode(""); setSuccess("Application rejected."); await refresh(); }
    catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(false); }
  };

  if (query.isLoading) return <Loader label="Loading creator application..." />;
  if (query.isError || !verification) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">Unable to load this application.</div>;

  return <main className="mx-auto max-w-4xl"><Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900" to="/admin/creator-verifications"><FiArrowLeft /> Back to applications</Link><header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-orange-500">Creator review</p><h1 className="mt-1 text-3xl font-black">Simple verification</h1><p className="mt-2 text-sm text-slate-500">Review the creator page and protected ID, then approve or reject.</p></div><AdminVerificationStatusBadge status={verification.status} /></header>
    {success ? <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{success}</p> : null}{error ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-400">{creator?.avatar ? <img alt="" className="h-full w-full object-cover" src={resolveMediaUrl(creator.avatar)} /> : <FiUser />}</span><div className="min-w-0"><h2 className="truncate text-xl font-black">{creator?.name}</h2><p className="truncate text-sm text-slate-500">@{creator?.username} · {creator?.email}</p><a className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-600" href={`/profile/${creator?.username}`} rel="noreferrer" target="_blank">Open profile <FiExternalLink /></a></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[.14em] text-slate-400">What they create</p><h2 className="mt-2 text-2xl font-black">{verification.category || "Not supplied"}</h2><div className="mt-5 divide-y divide-slate-100">{(verification.socialPages || []).map((page) => <div className="flex items-center gap-3 py-3" key={page.platform}>{page.platform === "TikTok" ? <FiMusic className="text-violet-500" /> : <FiInstagram className="text-pink-500" />}<span className="flex-1"><b className="block text-sm">{page.platform}</b><small className="text-slate-500">{page.handle}</small></span><FiCheck className="text-emerald-500" /></div>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Identity document</h2><p className="mt-1 text-sm text-slate-500">Securely loaded for admins only.</p><div className="mt-4"><AdminProtectedDocumentViewer documentType="documentFront" label="Submitted ID" metadata={verification.documentFront} verificationId={id} /></div></section></div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-lg font-black">Decision</h2>{pending ? <><label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><input checked={checked} className="mt-1 accent-emerald-600" onChange={(event) => { setChecked(event.target.checked); setError(""); }} type="checkbox" /><span>I checked the creator page and identity document.</span></label><label className="mt-4 block text-xs font-bold text-slate-600">Private admin note <span className="font-normal text-slate-400">(optional)</span><textarea className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-slate-400" onChange={(event) => setNote(event.target.value)} value={note} /></label><button className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-40" disabled={busy || !checked} onClick={approve} type="button">Approve creator</button><button className="mt-2 w-full rounded-xl border border-red-200 py-3 text-sm font-black text-red-600 disabled:opacity-40" disabled={busy} onClick={() => setMode("reject")} type="button">Reject</button></> : <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">This application already has a decision.</p>}</aside></div>
    {mode === "reject" ? <div aria-modal="true" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4" role="dialog"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Reject application</h2><button aria-label="Close" className="p-2" onClick={() => setMode("")} type="button"><FiX /></button></div><label className="mt-5 block text-sm font-bold">Reason for the creator<textarea autoFocus className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-red-400" maxLength={1000} onChange={(event) => setReason(event.target.value)} value={reason} /></label><div className="mt-5 flex justify-end gap-2"><button className="rounded-xl border px-4 py-2.5 text-sm font-bold" onClick={() => setMode("")} type="button">Cancel</button><button className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={busy} onClick={reject} type="button">{busy ? "Rejecting..." : "Reject"}</button></div></section></div> : null}
  </main>;
}
