import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiClock, FiShield } from "react-icons/fi";
import { verificationService } from "../../services/verificationService";
import { useAuth } from "../../hooks/useAuth";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";

export default function ManualIdentityApplication({ onClose }) {
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [files, setFiles] = useState({});
  const [form, setForm] = useState({ legalFullName: "", dateOfBirth: "", country: "", issuingCountry: "", documentType: "passport", expiryDate: "", ageConfirmed: false, informationConfirmed: false, policyAccepted: false, policyVersion: "identity-manual-v1" });
  const query = useQuery({ queryKey: ["manual-identity", user?.id || user?._id], queryFn: () => verificationService.getMine().then(r => r.data.data.verification), refetchInterval: q => q.state.data?.status === "PENDING_REVIEW" ? 15000 : false });
  const verification = query.data, status = verification?.status, approved = verification?.purpose === "IDENTITY" && status === "APPROVED";
  useEffect(() => {
    if (!verification) return;
    setForm(current => ({ ...current, ...Object.fromEntries(Object.keys(current).map(key => [key, key === "dateOfBirth" || key === "expiryDate" ? verification[key]?.slice(0, 10) || "" : verification[key] ?? current[key]])) }));
  }, [verification]);
  useEffect(() => {
    if (!approved) return;
    setUser?.(current => current ? { ...current, isVerified: true } : current);
    client.invalidateQueries({ queryKey: ["unified-profile"] });
    client.invalidateQueries({ queryKey: ["identity"] });
  }, [approved, client, setUser]);
  if (query.isPending) return <p role="status">Loading verification...</p>;
  if (query.isError) return <><p role="alert">Unable to load your application.</p><button className="identity-primary" onClick={() => query.refetch()}>Try again</button></>;
  if (approved) return <><img className="identity-scene" src="/illustrations/verified-confirmation.svg" alt="" /><h2 className="identity-center">You’re verified</h2><div className="identity-name"><b>{user?.name}</b><VerifiedBadge variant="profile" /></div><p className="identity-center">The @seen team has reviewed and approved your identity. Your verified badge is on.</p><button className="identity-primary" onClick={onClose}>Done</button></>;
  if (status === "PENDING_REVIEW") return <div className="manual-identity-status"><FiClock /><h2>Under review</h2><p>The @seen team is reviewing your identity document and selfie. Your badge will appear after approval.</p><p>You can close this page and check your status here later.</p><button className="identity-primary" onClick={onClose}>Done</button></div>;
  const needsChanges = ["REJECTED", "CHANGES_REQUESTED"].includes(status);
  const choose = (field, file) => {
    setError("");
    if (!file) return;
    const allowed = field === "selfieWithDocument" ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Choose a supported file of 10 MB or smaller. Selfies must be images."); return; }
    setFiles(current => ({ ...current, [field]: file }));
  };
  const save = async submit => {
    setBusy(true); setError(""); setNotice("");
    try {
      await verificationService.saveIdentityDraft(form);
      for (const [field, file] of Object.entries(files)) await verificationService.uploadDocument(field, file);
      if (submit) {
        if (needsChanges) await verificationService.resubmit(); else await verificationService.submit();
      }
      setFiles({});
      await query.refetch();
      setNotice(submit ? "Sent for review" : "Draft saved");
    } catch (e) { setError(e.response?.data?.message || "We couldn’t save your application. Please try again."); }
    finally { setBusy(false); }
  };
  const update = e => setForm(current => ({ ...current, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const upload = (field, label, imageOnly = false) => <label className="manual-identity-upload"><b>{label}</b><span>{files[field]?.name || verification?.[field]?.originalName || "No file selected"}</span><input aria-label={label} type="file" accept={imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={e => choose(field, e.target.files?.[0])} /><small>{imageOnly ? "JPEG, PNG or WebP" : "JPEG, PNG, WebP or PDF"} · maximum 10 MB</small></label>;
  if (!editing && !needsChanges && !(verification?.purpose === "IDENTITY" && status === "DRAFT")) return <><img className="identity-scene" src="/illustrations/verification-start.svg" alt="" /><h2 className="identity-center">Get verified</h2><p className="identity-center">Show people it’s really you.</p><div className="identity-row"><span className="identity-icon"><FiShield /></span><div><b>Reviewed by the @seen team</b><p>Submit your ID and a selfie holding it. An admin checks your details before your badge is activated.</p></div></div><div className="identity-row"><span className="identity-icon"><FiCheck /></span><div><b>Private identity review</b><p>Your documents are visible only to you and authorized reviewers. No external verification page.</p></div></div><button className="identity-primary" onClick={() => setEditing(true)}>Start verification</button><small className="identity-center">Free · ID + selfie · reviewed by @seen</small></>;
  return <><h2>Verify your identity</h2><p>Your information and documents stay private. The @seen team will review your application.</p>{needsChanges && <div className="identity-availability" role="status"><div><b>{status === "REJECTED" ? "Application not approved" : "Changes requested"}</b><p>{verification.creatorVisibleMessage || verification.rejectionReason || "Please update your details and resubmit."}</p>{verification.changesRequestedReasons?.map(reason => <p key={reason}>{reason}</p>)}</div></div>}
    <form onSubmit={e => { e.preventDefault(); save(true); }}><fieldset disabled={busy} className="manual-identity-form">
      <label>Legal full name<input name="legalFullName" autoComplete="name" value={form.legalFullName} onChange={update} required maxLength={150} /></label>
      <label>Date of birth<input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update} required /></label>
      <label>Country of residence<input name="country" autoComplete="country-name" value={form.country} onChange={update} required maxLength={80} /></label>
      <label>Document type<select name="documentType" value={form.documentType} onChange={update}><option value="passport">Passport</option><option value="national_id">National ID</option><option value="driver_license">Driving licence</option></select></label>
      <label>Document issuing country<input name="issuingCountry" value={form.issuingCountry} onChange={update} required maxLength={80} /></label>
      <label>Document expiry date (if applicable)<input name="expiryDate" type="date" value={form.expiryDate} onChange={update} /></label>
      {upload("documentFront", "Identity document front")}
      {form.documentType !== "passport" && upload("documentBack", "Identity document back")}
      {upload("selfieWithDocument", "Selfie holding your identity document", true)}
      <p>Use clear, readable photos. Your face and the document must both be visible in the selfie.</p>
      <label className="manual-identity-consent"><input type="checkbox" name="ageConfirmed" checked={form.ageConfirmed} onChange={update} required />I confirm that I am 18 or older.</label>
      <label className="manual-identity-consent"><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={update} required />The information and documents belong to me and are accurate.</label>
      <label className="manual-identity-consent"><input type="checkbox" name="policyAccepted" checked={form.policyAccepted} onChange={update} required />I agree to the @seen team reviewing these documents for identity verification.</label>
      <button className="identity-primary" type="submit">{busy ? "Saving..." : needsChanges ? "Resubmit for review" : "Send for review"}</button><button className="identity-later" type="button" onClick={() => save(false)}>Save draft</button>
    </fieldset></form>{error && <p className="identity-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </>;
}
