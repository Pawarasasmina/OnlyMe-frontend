import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiAlertTriangle, FiArrowLeft, FiCheckCircle, FiExternalLink, FiUser } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import AdminProtectedDocumentViewer from "../../components/admin/AdminProtectedDocumentViewer";
import AdminVerificationStatusBadge from "../../components/admin/AdminVerificationStatusBadge";
import VerificationDecisionModal from "../../components/admin/VerificationDecisionModal";
import VerificationHistoryTimeline from "../../components/admin/VerificationHistoryTimeline";
import { adminVerificationService } from "../../services/adminVerificationService";
import { resolveMediaUrl } from "../../utils/media";

const checklistItems = [
  "Identity document is readable", "Document appears valid", "Document is not expired", "Legal name matches",
  "Date of birth matches", "Creator is 18 or older", "Selfie appears to match the document holder",
  "Required declarations are accepted", "No obvious fraud concern",
];

function InfoRow({ label, value, warning }) {
  return <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-[190px_1fr]"><dt className="text-sm text-slate-500">{label}</dt><dd className={`break-words text-sm font-medium ${warning ? "text-red-600" : "text-slate-900"}`}>{value ?? "—"}</dd></div>;
}
function maskDocument(value) {
  if (!value) return "—";
  return value.length <= 4 ? value : `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}
function calculateAge(value) {
  if (!value) return null;
  const birth = new Date(value); const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age;
}

function CreatorVerificationDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState(() => Object.fromEntries(checklistItems.map((item) => [item, false])));
  const [modal, setModal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const detailQuery = useQuery({ queryKey: ["admin", "creator-verification", id], queryFn: () => adminVerificationService.getById(id).then((response) => response.data.data.verification), refetchOnMount: "always" });
  const historyQuery = useQuery({ queryKey: ["admin", "creator-verification", id, "history"], queryFn: () => adminVerificationService.getHistory(id).then((response) => response.data.data.history), enabled: Boolean(id) });
  const verification = detailQuery.data;
  const creator = verification?.creator;
  const checklistComplete = Object.values(checklist).every(Boolean);
  const final = ["APPROVED", "REJECTED"].includes(verification?.status);
  const canDecide = verification?.status === "PENDING_REVIEW" && !verification?.stateSyncPending;
  const age = calculateAge(verification?.dateOfBirth);
  const expired = verification?.expiryDate ? new Date(verification.expiryDate) < new Date() : false;
  const submittedBackRequired = ["national_id", "driver_license"].includes(verification?.documentType);

  const refresh = async () => {
    await Promise.all([detailQuery.refetch(), historyQuery.refetch()]);
    queryClient.invalidateQueries({ queryKey: ["admin", "creator-verifications"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "creator-verification-count"] });
  };
  const decide = async (payload) => {
    setSubmitting(true); setError(""); setSuccess("");
    try {
      if (modal === "approve") await adminVerificationService.approve(id, payload);
      if (modal === "changes") await adminVerificationService.requestChanges(id, payload);
      if (modal === "reject") await adminVerificationService.reject(id, payload);
      const message = modal === "approve" ? "Creator verification approved." : modal === "changes" ? "Changes requested from the creator." : "Creator verification rejected.";
      setModal(""); setSuccess(message); await refresh();
    } catch (requestError) {
      setModal("");
      if (requestError.response?.status === 409) {
        await refresh();
        setError("Another reviewer changed this application. The latest record has been loaded.");
      } else if (requestError.response?.status === 403) setError("You are not authorized to review this verification.");
      else if (requestError.response?.status === 404) setError("This verification application no longer exists.");
      else setError(requestError.response?.data?.message || "Unable to save the verification decision.");
    } finally { setSubmitting(false); }
  };

  if (detailQuery.isLoading) return <div className="text-slate-600"><Loader label="Loading verification application..." /></div>;
  if (detailQuery.isError || !verification) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"><p>{detailQuery.error?.response?.status === 404 ? "Verification application not found." : "Unable to load this verification application."}</p><Link className="mt-4 inline-flex font-bold underline" to="/admin/creator-verifications">Return to queue</Link></div>;

  return <div className="mx-auto max-w-[1500px]"><Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900" to="/admin/creator-verifications"><FiArrowLeft />Back to verification queue</Link>
    <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black sm:text-3xl">Creator verification review</h1><AdminVerificationStatusBadge status={verification.status} /></div><p className="mt-2 text-sm text-slate-500">Review identity details and protected documents before making a manual decision.</p></div>{canDecide ? <div className="flex flex-wrap gap-2"><button className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700" onClick={() => setModal("changes")} type="button">Request changes</button><button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700" onClick={() => setModal("reject")} type="button">Reject</button><button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!checklistComplete} onClick={() => setModal("approve")} title={!checklistComplete ? "Complete every checklist item before approval" : "Approve creator"} type="button">Approve</button></div> : null}</div>

    {success ? <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><FiCheckCircle />{success}</div> : null}
    {error ? <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><FiAlertTriangle />{error}</div> : null}
    {verification.stateSyncPending ? <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"><strong>Account synchronization pending.</strong> The verification decision was saved, but account-state synchronization has not completed.{verification.stateSyncError ? ` ${verification.stateSyncError}` : ""}</div> : null}
    {final ? <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">This application has a final decision. Further decision actions are disabled.</div> : null}

    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-2xl text-slate-400">{creator?.avatar ? <img alt={creator.name} className="h-full w-full object-cover" src={resolveMediaUrl(creator.avatar)} /> : <FiUser />}</span><div><h2 className="text-xl font-black">{creator?.name || "Unknown creator"}</h2><p className="text-sm text-slate-500">@{creator?.username} · {creator?.email}</p><div className="mt-3 flex flex-wrap gap-2">{verification.legacyMigrated ? <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">Legacy migrated approval</span> : null}<a className="inline-flex items-center gap-1 text-xs font-bold text-orange-600" href={`/creators/${creator?.username}`} rel="noreferrer" target="_blank">View profile <FiExternalLink /></a></div></div></div><dl className="mt-5"><InfoRow label="Signup date" value={creator?.createdAt ? new Date(creator.createdAt).toLocaleString() : "—"} /><InfoRow label="Account status" value={creator?.status} /><InfoRow label="Creator approval" value={creator?.creatorApprovalStatus || "pending"} /><InfoRow label="Verification" value={verification.status.replaceAll("_", " ")} /></dl></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Personal information</h2><dl className="mt-3"><InfoRow label="Legal full name" value={verification.legalFullName} /><InfoRow label="Date of birth" value={verification.dateOfBirth ? new Date(verification.dateOfBirth).toLocaleDateString() : "—"} /><InfoRow label="Calculated age" value={age != null ? `${age} years` : "—"} warning={age != null && age < 18} /><InfoRow label="Country" value={verification.country} /><InfoRow label="Nationality" value={verification.nationality} /><InfoRow label="Address" value={verification.address} /><InfoRow label="City" value={verification.city} /><InfoRow label="Phone number" value={verification.phoneNumber} /></dl></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Identity information</h2><dl className="mt-3"><InfoRow label="Document type" value={verification.documentType?.replaceAll("_", " ")} /><InfoRow label="Document number" value={maskDocument(verification.documentNumber)} /><InfoRow label="Issuing country" value={verification.issuingCountry} /><InfoRow label="Expiry date" value={verification.expiryDate ? new Date(verification.expiryDate).toLocaleDateString() : "Not provided"} warning={expired} />{expired ? <InfoRow label="Validity" value="Document is expired" warning /> : null}</dl></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Declarations</h2><dl className="mt-3"><InfoRow label="Age confirmed" value={verification.ageConfirmed ? "Yes" : "No"} warning={!verification.ageConfirmed} /><InfoRow label="Information confirmed" value={verification.informationConfirmed ? "Yes" : "No"} warning={!verification.informationConfirmed} /><InfoRow label="Policy accepted" value={verification.policyAccepted ? "Yes" : "No"} warning={!verification.policyAccepted} /><InfoRow label="Policy version" value={verification.policyVersion} /><InfoRow label="Accepted date" value={verification.acceptedAt ? new Date(verification.acceptedAt).toLocaleString() : "—"} /></dl></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Protected documents</h2><p className="mt-1 text-sm text-slate-500">Files are fetched through authenticated admin endpoints and are never loaded from public storage paths.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><AdminProtectedDocumentViewer documentType="documentFront" label="ID front" metadata={verification.documentFront} verificationId={id} />{verification.documentBack || submittedBackRequired ? <AdminProtectedDocumentViewer documentType="documentBack" label="ID back" metadata={verification.documentBack} verificationId={id} /> : null}<AdminProtectedDocumentViewer documentType="selfieWithDocument" label="Selfie with document" metadata={verification.selfieWithDocument} verificationId={id} /></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Review history</h2><div className="mt-5">{historyQuery.isLoading ? <Loader label="Loading review history..." /> : historyQuery.isError ? <p className="text-sm text-red-600">Unable to load review history.</p> : <VerificationHistoryTimeline history={historyQuery.data} />}</div></section>
    </div>

    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24"><h2 className="text-lg font-black">Manual review checklist</h2><p className="mt-1 text-xs leading-5 text-slate-500">UI assistance only. Completing this checklist does not automatically approve the creator.</p><div className="mt-5 space-y-2">{checklistItems.map((item) => <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm" key={item}><input checked={checklist[item]} className="mt-1 accent-emerald-600" disabled={!canDecide} onChange={(event) => setChecklist((current) => ({ ...current, [item]: event.target.checked }))} type="checkbox" /><span>{item}</span></label>)}</div><p className={`mt-4 rounded-xl p-3 text-xs font-bold ${checklistComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{checklistComplete ? "Checklist complete. Manual approval can now be confirmed." : "Complete all mandatory checks before approval."}</p></aside>
    </div>

    <VerificationDecisionModal checklistComplete={checklistComplete} isOpen={Boolean(modal)} mode={modal} onClose={() => !submitting && setModal("")} onSubmit={decide} submitting={submitting} />
  </div>;
}

export default CreatorVerificationDetail;

