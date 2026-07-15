import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight, FiCheck, FiSave } from "react-icons/fi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import VerificationDocumentUploader from "../../components/verification/VerificationDocumentUploader";
import VerificationReviewSummary from "../../components/verification/VerificationReviewSummary";
import VerificationStatusCard from "../../components/verification/VerificationStatusCard";
import VerificationStepIndicator from "../../components/verification/VerificationStepIndicator";
import { useAuth } from "../../hooks/useAuth";
import { verificationService } from "../../services/verificationService";

const POLICY_VERSION = "1.0";
const initialForm = {
  legalFullName: "", dateOfBirth: "", country: "", nationality: "", address: "", city: "", phoneNumber: "",
  documentType: "", documentNumber: "", issuingCountry: "", expiryDate: "",
  ageConfirmed: false, informationConfirmed: false, policyAccepted: false, policyVersion: POLICY_VERSION,
};
const editableStatuses = new Set(["NOT_STARTED", "DRAFT", "CHANGES_REQUESTED"]);
const inputClass = "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-brand-primary";

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function toForm(verification) {
  return {
    ...initialForm,
    legalFullName: verification.legalFullName || "",
    dateOfBirth: toDateInput(verification.dateOfBirth),
    country: verification.country || "",
    nationality: verification.nationality || "",
    address: verification.address || "",
    city: verification.city || "",
    phoneNumber: verification.phoneNumber || "",
    documentType: verification.documentType || "",
    documentNumber: verification.documentNumber || "",
    issuingCountry: verification.issuingCountry || "",
    expiryDate: toDateInput(verification.expiryDate),
    ageConfirmed: Boolean(verification.ageConfirmed),
    informationConfirmed: Boolean(verification.informationConfirmed),
    policyAccepted: Boolean(verification.policyAccepted),
    policyVersion: verification.policyVersion || POLICY_VERSION,
  };
}

function readError(error, fallback) {
  if (error.response?.status === 413) return "The selected file is too large.";
  if (error.response?.status === 403) return "You are not allowed to perform this verification action.";
  return error.response?.data?.message || error.message || fallback;
}

function CreatorVerificationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyDocument, setBusyDocument] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formInitialized = useRef(false);

  const verificationQuery = useQuery({
    queryKey: ["creator", "verification"],
    queryFn: () => verificationService.getMine().then((response) => response.data.data),
    refetchOnMount: "always",
  });
  const data = verificationQuery.data;
  const verification = data?.verification;
  const status = verification?.status || "NOT_STARTED";
  const editable = editableStatuses.has(status);
  const backRequired = ["national_id", "driver_license"].includes(form.documentType);

  useEffect(() => {
    if (!verification) return;
    if (!formInitialized.current) {
      setForm(toForm(verification));
      formInitialized.current = true;
    }
    if (data.creatorApprovalStatus) {
      setUser((current) => current ? { ...current, creatorApprovalStatus: data.creatorApprovalStatus } : current);
    }
  }, [data?.creatorApprovalStatus, setUser, verification]);

  const setField = ({ target }) => {
    const value = target.type === "checkbox" ? target.checked : target.value;
    setForm((current) => ({ ...current, [target.name]: value }));
    setError("");
  };

  const updateCachedVerification = (nextVerification) => {
    queryClient.setQueryData(["creator", "verification"], (current) => ({ ...(current || {}), verification: nextVerification }));
  };

  const handleConflict = async (requestError) => {
    if (requestError.response?.status !== 409) return false;
    const refreshed = await verificationQuery.refetch();
    if (refreshed.data?.verification) setForm(toForm(refreshed.data.verification));
    setError("This verification application changed while you were editing it. The latest version has been loaded; please review it again.");
    return true;
  };

  const saveDraft = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await verificationService.saveDraft(form);
      updateCachedVerification(response.data.data.verification);
      setSuccess("Verification draft saved securely.");
    } catch (requestError) {
      if (!await handleConflict(requestError)) setError(readError(requestError, "Unable to save the verification draft."));
    } finally { setSaving(false); }
  };

  const uploadDocument = async (documentType, file, onProgress) => {
    setBusyDocument(documentType); setError(""); setSuccess("");
    try {
      const response = await verificationService.uploadDocument(documentType, file, onProgress);
      updateCachedVerification(response.data.data.verification);
      setSuccess("Document uploaded securely.");
    } catch (requestError) {
      if (!await handleConflict(requestError)) setError(readError(requestError, "Document upload failed."));
      throw requestError;
    } finally { setBusyDocument(""); }
  };

  const deleteDocument = async (documentType) => {
    if (!window.confirm("Remove this verification document?")) return;
    setBusyDocument(documentType); setError(""); setSuccess("");
    try {
      const response = await verificationService.deleteDocument(documentType);
      updateCachedVerification(response.data.data.verification);
      setSuccess("Document removed.");
    } catch (requestError) {
      if (!await handleConflict(requestError)) setError(readError(requestError, "Unable to remove this document."));
    } finally { setBusyDocument(""); }
  };

  const validateStep = () => {
    if (step === 0) {
      const required = [form.legalFullName, form.dateOfBirth, form.country, form.nationality, form.address, form.city, form.phoneNumber];
      if (required.some((value) => !String(value).trim())) return "Complete every personal information field.";
      const birthDate = new Date(form.dateOfBirth);
      if (birthDate > new Date()) return "Date of birth cannot be in the future.";
      const adultDate = new Date(); adultDate.setFullYear(adultDate.getFullYear() - 18);
      if (birthDate > adultDate) return "You must be at least 18 years old.";
    }
    if (step === 1) {
      if (![form.documentType, form.documentNumber, form.issuingCountry].every((value) => String(value).trim())) return "Complete the identity document information.";
      if (!verification.documentFront) return "Upload the front of your identity document.";
      if (backRequired && !verification.documentBack) return "Upload the back of this identity document.";
    }
    if (step === 2 && !verification.selfieWithDocument) return "Upload a selfie while holding your identity document.";
    if (step === 3 && (!form.ageConfirmed || !form.informationConfirmed || !form.policyAccepted)) return "Accept all declarations before continuing.";
    return "";
  };

  const next = () => {
    const validationError = validateStep();
    if (validationError) { setError(validationError); return; }
    setError(""); setStep((current) => Math.min(4, current + 1));
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await verificationService.saveDraft(form);
      const response = status === "CHANGES_REQUESTED" ? await verificationService.resubmit() : await verificationService.submit();
      updateCachedVerification(response.data.data.verification);
      setConfirmOpen(false);
      await verificationQuery.refetch();
      navigate("/creator/dashboard", { replace: true, state: { verificationSubmitted: true } });
    } catch (requestError) {
      setConfirmOpen(false);
      if (!await handleConflict(requestError)) setError(readError(requestError, "Unable to submit verification for review."));
    } finally { setSubmitting(false); }
  };

  const maxBirthDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (verificationQuery.isLoading) return <Loader label="Loading creator verification..." />;
  if (verificationQuery.isError || !verification) return <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5"><p className="text-red-200">{readError(verificationQuery.error, "Unable to load creator verification.")}</p><Button className="mt-4" onClick={() => verificationQuery.refetch()} type="button">Try again</Button></div>;

  if (!editable) return <div className="space-y-5"><VerificationStatusCard verification={verification} /><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-secondary" to="/creator/dashboard"><FiArrowLeft /> Back to dashboard</Link></div>;

  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-secondary">Manual creator review</p><h2 className="mt-2 text-3xl font-black">Complete verification</h2><p className="mt-2 text-sm text-brand-mist/60">Your documents are stored privately and reviewed only by authorized administrators.</p></div><Button disabled={saving || submitting || Boolean(busyDocument)} onClick={saveDraft} type="button" variant="secondary"><span className="inline-flex items-center gap-2"><FiSave />{saving ? "Saving..." : "Save draft"}</span></Button></div>
    {status === "CHANGES_REQUESTED" ? <div className="mt-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-5"><p className="font-bold text-orange-100">Administrator requested changes</p><p className="mt-2 text-sm leading-6 text-orange-100/80">{verification.creatorVisibleMessage}</p>{verification.changesRequestedReasons?.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-orange-100/75">{verification.changesRequestedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</div> : null}
    <div className="mt-7"><VerificationStepIndicator currentStep={step} /></div>
    {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
    {success ? <div role="status" className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

    <section className="mt-6 rounded-3xl border border-white/10 bg-brand-dark/50 p-5 sm:p-7">
      {step === 0 ? <div><h3 className="text-xl font-bold">Personal information</h3><p className="mt-1 text-sm text-brand-mist/55">You must be at least 18 years old.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><Input label="Legal full name" name="legalFullName" onChange={setField} required value={form.legalFullName} /><Input label="Date of birth" max={maxBirthDate} name="dateOfBirth" onChange={setField} required type="date" value={form.dateOfBirth} /><Input label="Country" name="country" onChange={setField} required value={form.country} /><Input label="Nationality" name="nationality" onChange={setField} required value={form.nationality} /><Input label="City" name="city" onChange={setField} required value={form.city} /><Input label="Phone number" name="phoneNumber" onChange={setField} required type="tel" value={form.phoneNumber} /><label className="block space-y-2 sm:col-span-2"><span className="text-sm text-brand-mist/80">Residential address</span><textarea className={`${inputClass} min-h-28 resize-y`} maxLength={300} name="address" onChange={setField} required value={form.address} /></label></div></div> : null}

      {step === 1 ? <div><h3 className="text-xl font-bold">Identity document</h3><p className="mt-1 text-sm text-brand-mist/55">Submit a current government-issued identity document.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="block space-y-2"><span className="text-sm text-brand-mist/80">Document type</span><select className={inputClass} name="documentType" onChange={setField} required value={form.documentType}><option className="bg-brand-slate" value="">Select type</option><option className="bg-brand-slate" value="national_id">National ID</option><option className="bg-brand-slate" value="passport">Passport</option><option className="bg-brand-slate" value="driver_license">Driving licence</option><option className="bg-brand-slate" value="other">Other</option></select></label><Input label="Document number" name="documentNumber" onChange={setField} required value={form.documentNumber} /><Input label="Issuing country" name="issuingCountry" onChange={setField} required value={form.issuingCountry} /><Input label="Expiry date (optional)" min={maxBirthDate} name="expiryDate" onChange={setField} type="date" value={form.expiryDate} /></div><div className="mt-6 space-y-4"><VerificationDocumentUploader busy={busyDocument === "documentFront"} documentType="documentFront" label="Front of document" metadata={verification.documentFront} onDelete={() => deleteDocument("documentFront")} onUpload={(file, progress) => uploadDocument("documentFront", file, progress)} />{backRequired ? <VerificationDocumentUploader busy={busyDocument === "documentBack"} documentType="documentBack" label="Back of document" metadata={verification.documentBack} onDelete={() => deleteDocument("documentBack")} onUpload={(file, progress) => uploadDocument("documentBack", file, progress)} /> : null}</div></div> : null}

      {step === 2 ? <div><h3 className="text-xl font-bold">Selfie with your ID</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-brand-mist/60">Upload a clear selfie while holding the identity document submitted in the previous step. Face matching is not automatic; an authorized administrator will manually compare the selfie and document.</p><div className="mt-6"><VerificationDocumentUploader busy={busyDocument === "selfieWithDocument"} documentType="selfieWithDocument" imageOnly label="Selfie holding identity document" metadata={verification.selfieWithDocument} onDelete={() => deleteDocument("selfieWithDocument")} onUpload={(file, progress) => uploadDocument("selfieWithDocument", file, progress)} /></div></div> : null}

      {step === 3 ? <div><h3 className="text-xl font-bold">Declaration</h3><p className="mt-1 text-sm text-brand-mist/55">All declarations are required before submission.</p><div className="mt-6 space-y-4">{[{ name: "ageConfirmed", label: "I confirm that I am 18 years or older." }, { name: "informationConfirmed", label: "I confirm that the submitted information is accurate." }, { name: "policyAccepted", label: `I agree to the platform Terms and Content Policy (version ${form.policyVersion}).` }].map((item) => <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={item.name}><input checked={form[item.name]} className="mt-1 h-4 w-4 accent-orange-500" name={item.name} onChange={setField} type="checkbox" /><span className="text-sm leading-6 text-brand-mist/80">{item.label}</span></label>)}</div></div> : null}

      {step === 4 ? <div><h3 className="text-xl font-bold">Review and submit</h3><p className="mt-1 text-sm text-brand-mist/55">Review your application carefully. An administrator will make the final decision.</p><div className="mt-5"><VerificationReviewSummary backRequired={backRequired} form={form} verification={verification} /></div></div> : null}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between"><Button disabled={step === 0 || saving || submitting || Boolean(busyDocument)} onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }} type="button" variant="ghost"><span className="inline-flex items-center gap-2"><FiArrowLeft />Back</span></Button>{step < 4 ? <Button disabled={saving || submitting || Boolean(busyDocument)} onClick={next} type="button"><span className="inline-flex items-center gap-2">Continue<FiArrowRight /></span></Button> : <Button disabled={submitting || saving || Boolean(busyDocument)} onClick={() => setConfirmOpen(true)} type="button"><span className="inline-flex items-center gap-2"><FiCheck />{status === "CHANGES_REQUESTED" ? "Resubmit for Review" : "Submit for Review"}</span></Button>}</div>
    </section>

    <Modal isOpen={confirmOpen} onClose={() => !submitting && setConfirmOpen(false)} title={status === "CHANGES_REQUESTED" ? "Resubmit verification?" : "Submit verification?"}><p className="text-sm leading-6 text-brand-mist/70">After submission, editing and document replacement will be locked while an administrator reviews the application.</p><div className="mt-6 flex justify-end gap-3"><Button disabled={submitting} onClick={() => setConfirmOpen(false)} type="button" variant="ghost">Cancel</Button><Button disabled={submitting} onClick={submit} type="button">{submitting ? "Submitting..." : "Confirm submission"}</Button></div></Modal>
  </div>;
}

export default CreatorVerificationPage;

