import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiClock, FiShield } from "react-icons/fi";
import { verificationService } from "../../services/verificationService";
import { useAuth } from "../../hooks/useAuth";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";

export default function ManualIdentityApplication({ onClose, onAddBank, bankReady = false, bankLoading = false }) {
  __useUiLanguage();
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
  if (query.isPending) return <p role="status">{__msg("verification.loadingVerification")}</p>;
  if (query.isError) return <><p role="alert">{__msg("verification.unableToLoadYourApplication")}</p><button className="identity-primary" onClick={() => query.refetch()}>{__msg("discover.tryAgain")}</button></>;
  if (approved) return <><img className="identity-scene" src="/illustrations/verified-confirmation.svg" alt="" /><h2 className="identity-center identity-verified-title">{__msg("profile.youReVerified")}</h2><div className="identity-name"><b>{user?.name || verification.legalFullName || user?.username}</b><VerifiedBadge variant="profile" /></div><p className="identity-center identity-verified-copy">{bankReady ? __msg("verification.yourBadgeIsOnYourBankIsReadyFor") : __msg("profile.yourBadgeIsOnAddABankToWithdraw")}</p>{bankReady ? <button className="identity-primary" onClick={onClose}>{__msg("comments.done")}</button> : <><button className="identity-primary" disabled={bankLoading} onClick={onAddBank}>{bankLoading ? __msg("verification.checkingPayoutSetup") : __msg("verification.addABankForPayouts")}</button><button className="identity-later" onClick={onClose}>{__msg("verification.later")}</button></>}</>;
  if (status === "PENDING_REVIEW") return <div className="manual-identity-status"><FiClock /><h2>{__msg("verification.underReview")}</h2><p>{__msg("verification.theSeenTeamIsReviewingYourIdentityDocumentAnd")}</p><p>{__msg("verification.youCanCloseThisPageAndCheckYourStatus")}</p><button className="identity-primary" onClick={onClose}>{__msg("comments.done")}</button></div>;
  const needsChanges = ["REJECTED", "CHANGES_REQUESTED"].includes(status);
  const choose = (field, file) => {
    setError("");
    if (!file) return;
    const allowed = field === "selfieWithDocument" ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) { setError(__msg("verification.chooseASupportedFileOf10MbOrSmaller")); return; }
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
      setNotice(submit ? __msg("verification.sentForReview") : __msg("creator.draftSaved"));
    } catch (e) { setError(e.response?.data?.message || __msg("verification.weCouldnTSaveYourApplicationPleaseTry")); }
    finally { setBusy(false); }
  };
  const update = e => setForm(current => ({ ...current, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const upload = (field, label, imageOnly = false) => <label className="manual-identity-upload"><b>{label}</b><span>{files[field]?.name || verification?.[field]?.originalName || __msg("verification.noFileSelected")}</span><input aria-label={label} type="file" accept={imageOnly ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"} onChange={e => choose(field, e.target.files?.[0])} /><small>{imageOnly ? __msg("verification.jpegPngOrWebp") : __msg("verification.jpegPngWebpOrPdf")} {__msg("verification.maximum10Mb")}</small></label>;
  if (!editing && !needsChanges && !(verification?.purpose === "IDENTITY" && status === "DRAFT")) return <><img className="identity-scene" src="/illustrations/verification-start.svg" alt="" /><h2 className="identity-center">{__msg("verification.getVerified")}</h2><p className="identity-center">{__msg("verification.showPeopleItSReallyYou")}</p><div className="identity-row"><span className="identity-icon"><FiShield /></span><div><b>{__msg("verification.reviewedByTheSeenTeam_87cfbb")}</b><p>{__msg("verification.submitYourIdAndASelfieHoldingItAn")}</p></div></div><div className="identity-row"><span className="identity-icon"><FiCheck /></span><div><b>{__msg("verification.privateIdentityReview")}</b><p>{__msg("verification.yourDocumentsAreVisibleOnlyToYouAndAuthorized")}</p></div></div><button className="identity-primary" onClick={() => setEditing(true)}>{__msg("verification.startVerification")}</button><small className="identity-center">{__msg("verification.freeIdSelfieReviewedBySeen")}</small></>;
  return <><h2>{__msg("verification.verifyYourIdentity")}</h2><p>{__msg("verification.yourInformationAndDocumentsStayPrivateTheSeenTeam")}</p>{needsChanges && <div className="identity-availability" role="status"><div><b>{status === "REJECTED" ? __msg("verification.applicationNotApproved") : __msg("content.changesRequested")}</b><p>{verification.creatorVisibleMessage || verification.rejectionReason || __msg("verification.pleaseUpdateYourDetailsAndResubmit")}</p>{verification.changesRequestedReasons?.map(reason => <p key={reason}>{reason}</p>)}</div></div>}
    <form onSubmit={e => { e.preventDefault(); save(true); }}><fieldset disabled={busy} className="manual-identity-form">
      <label>{__msg("verification.legalFullName")}<input name="legalFullName" autoComplete="name" value={form.legalFullName} onChange={update} required maxLength={150} /></label>
      <label>{__msg("verification.dateOfBirth")}<input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={update} required /></label>
      <label>{__msg("verification.countryOfResidence")}<input name="country" autoComplete="country-name" value={form.country} onChange={update} required maxLength={80} /></label>
      <label>{__msg("verification.documentType")}<select name="documentType" value={form.documentType} onChange={update}><option value="passport">{__msg("verification.passport")}</option><option value="national_id">{__msg("verification.nationalId")}</option><option value="driver_license">{__msg("verification.drivingLicence")}</option></select></label>
      <label>{__msg("verification.documentIssuingCountry")}<input name="issuingCountry" value={form.issuingCountry} onChange={update} required maxLength={80} /></label>
      <label>{__msg("verification.documentExpiryDateIfApplicable")}<input name="expiryDate" type="date" value={form.expiryDate} onChange={update} /></label>
      {upload("documentFront", __msg("verification.identityDocumentFront"))}
      {form.documentType !== "passport" && upload("documentBack", __msg("verification.identityDocumentBack"))}
      {upload("selfieWithDocument", __msg("verification.selfieHoldingYourIdentityDocument"), true)}
      <p>{__msg("verification.useClearReadablePhotosYourFaceAndTheDocument")}</p>
      <label className="manual-identity-consent"><input type="checkbox" name="ageConfirmed" checked={form.ageConfirmed} onChange={update} required />{__msg("verification.iConfirmThatIAm18OrOlder")}</label>
      <label className="manual-identity-consent"><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={update} required />{__msg("verification.theInformationAndDocumentsBelongToMeAndAre")}</label>
      <label className="manual-identity-consent"><input type="checkbox" name="policyAccepted" checked={form.policyAccepted} onChange={update} required />{__msg("verification.iAgreeToTheSeenTeamReviewingTheseDocuments")}</label>
      <button className="identity-primary" type="submit">{busy ? __msg("admin.saving") : needsChanges ? __msg("verification.resubmitForReview") : __msg("verification.sendForReview")}</button><button className="identity-later" type="button" onClick={() => save(false)}>{__msg("publication.saveDraft")}</button>
    </fieldset></form>{error && <p className="identity-error" role="alert">{__systemMessage(error)}</p>}{notice && <p role="status">{__systemMessage(notice)}</p>}
  </>;
}
