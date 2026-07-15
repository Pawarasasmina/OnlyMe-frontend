import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

const changeReasons = ["FRONT_DOCUMENT_UNCLEAR", "BACK_DOCUMENT_MISSING", "DOCUMENT_NUMBER_UNCLEAR", "DOCUMENT_EXPIRED", "SELFIE_UNCLEAR", "SELFIE_DOCUMENT_NOT_VISIBLE", "NAME_MISMATCH", "DOB_UNCONFIRMED", "ADDITIONAL_INFORMATION_REQUIRED", "OTHER"];
const rejectionReasons = ["UNDERAGE", "INVALID_DOCUMENT", "EXPIRED_DOCUMENT", "IDENTITY_MISMATCH", "SUSPECTED_FAKE_DOCUMENT", "DUPLICATE_ACCOUNT", "POLICY_VIOLATION", "OTHER"];

function VerificationDecisionModal({ checklistComplete, isOpen, mode, onClose, onSubmit, submitting }) {
  const [confirmed, setConfirmed] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [creatorVisibleMessage, setCreatorVisibleMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setConfirmed(false); setReasons([]); setRejectionReason(""); setCreatorVisibleMessage(""); setInternalNote(""); setError("");
  }, [isOpen, mode]);
  if (!isOpen) return null;

  const title = mode === "approve" ? "Approve creator verification" : mode === "changes" ? "Request verification changes" : "Reject creator verification";
  const submit = async () => {
    if (mode === "approve" && (!checklistComplete || !confirmed)) { setError("Complete the checklist and confirm the manual review."); return; }
    if (mode === "changes" && (!reasons.length || !creatorVisibleMessage.trim())) { setError("Select at least one reason and enter a creator-visible message."); return; }
    if (mode === "reject" && (!rejectionReason || !creatorVisibleMessage.trim())) { setError("Select a rejection reason and enter a creator-visible message."); return; }
    setError("");
    await onSubmit({ reasons, rejectionReason, creatorVisibleMessage: creatorVisibleMessage.trim(), internalNote: internalNote.trim() });
  };
  const toggleReason = (reason) => setReasons((current) => current.includes(reason) ? current.filter((item) => item !== reason) : [...current, reason]);

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="decision-title"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black" id="decision-title">{title}</h2><button aria-label="Close modal" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" disabled={submitting} onClick={onClose} type="button"><FiX /></button></div>
    {mode === "approve" ? <label className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><input checked={confirmed} className="mt-1 accent-emerald-600" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" /><span className="text-sm text-emerald-900">I confirm that I manually reviewed the submitted information and documents and completed every required checklist item.</span></label> : null}
    {mode === "changes" ? <fieldset className="mt-6"><legend className="text-sm font-bold">Reasons</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{changeReasons.map((reason) => <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs" key={reason}><input checked={reasons.includes(reason)} className="mt-0.5 accent-orange-500" onChange={() => toggleReason(reason)} type="checkbox" /><span>{reason.replaceAll("_", " ")}</span></label>)}</div></fieldset> : null}
    {mode === "reject" ? <label className="mt-6 block text-sm font-bold">Rejection reason<select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-red-400" onChange={(event) => setRejectionReason(event.target.value)} value={rejectionReason}><option value="">Select reason</option>{rejectionReasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</select></label> : null}
    {mode !== "approve" ? <label className="mt-5 block text-sm font-bold">Creator-visible message<textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-orange-400" maxLength={2000} onChange={(event) => setCreatorVisibleMessage(event.target.value)} value={creatorVisibleMessage} /></label> : null}
    <label className="mt-5 block text-sm font-bold">Internal admin note <span className="font-normal text-slate-400">(optional)</span><textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-orange-400" maxLength={2000} onChange={(event) => setInternalNote(event.target.value)} value={internalNote} /></label>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600" disabled={submitting} onClick={onClose} type="button">Cancel</button><button className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${mode === "approve" ? "bg-emerald-600" : mode === "changes" ? "bg-orange-500" : "bg-red-600"}`} disabled={submitting} onClick={submit} type="button">{submitting ? "Saving decision..." : mode === "approve" ? "Approve creator" : mode === "changes" ? "Request changes" : "Reject creator"}</button></div>
  </div></div>;
}

export default VerificationDecisionModal;
