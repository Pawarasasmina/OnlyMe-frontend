/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axiosInstance";
export default function ManualBankApplication({ onClose, onSaved }) {
  __useUiLanguage();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["payout-bank"], queryFn: () => api.get("/identity/bank").then(r => r.data.data), refetchInterval: q => q.state.data?.bank?.status === "PENDING_REVIEW" ? 15000 : false });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ accountHolder: "", bankName: "", country: "", currency: "", accountNumber: "", swift: "", routing: "", confirmOwnership: false });
  const bank = query.data?.bank;
  const [loadedVersion, setLoadedVersion] = useState("");
  useEffect(() => {
    const version = bank ? `${bank.id}:${bank.version}` : "";
    if (!bank || editing || loadedVersion === version) return;
    setForm(current => ({ ...current, accountHolder: bank.accountHolder, bankName: bank.bankName, country: bank.country, currency: bank.currency, accountNumber: "", swift: "", routing: "", confirmOwnership: false }));
    setLoadedVersion(version);
  }, [bank, editing, loadedVersion]);
  const mutation = useMutation({ mutationFn: () => api.post("/identity/bank", { ...form, version: bank?.version || 0 }), onSuccess: () => { setForm({ accountHolder: "", bankName: "", country: "", currency: "", accountNumber: "", swift: "", routing: "", confirmOwnership: false }); setEditing(false); query.refetch(); client.invalidateQueries({ queryKey: ["identity"] }); client.invalidateQueries({ queryKey: ["monetization"] }); onSaved?.(); } });
  const edit = () => { setForm({ accountHolder: bank?.accountHolder || "", bankName: bank?.bankName || "", country: bank?.country || "", currency: bank?.currency || "", accountNumber: "", swift: "", routing: "", confirmOwnership: false }); setEditing(true); mutation.reset(); };
  if (query.isPending) return <p role="status">{__msg("verification.loadingBankApplication")}</p>;
  if (query.isError) return <><p role="alert">{__msg("verification.unableToLoadBankSetup")}</p><button className="identity-primary" onClick={() => query.refetch()}>{__msg("discover.tryAgain")}</button></>;
  if (!query.data.available) return <><h2>{__msg("verification.addABankForPayouts")}</h2><p role="status">{__msg("verification.bankSetupIsTemporarilyUnavailablePleaseTryAgainLater")}</p><button className="identity-later" onClick={onClose}>{__msg("discover.back")}</button></>;
  if (bank?.status === "PENDING_REVIEW") return <div className="manual-identity-status"><h2>{__msg("verification.bankDetailsUnderReview")}</h2><p>{__msg("verification.theSeenTeamWillReviewYourBankDetailsPayouts")}</p><p>{bank.bankName} {__msg("verification.accountEnding")} {bank.accountLast4}</p><button className="identity-primary" onClick={onClose}>{__msg("comments.done")}</button></div>;
  if (bank?.status === "APPROVED" && !editing) return <div className="manual-identity-status"><h2>{__msg("verification.yourBankIsApproved")}</h2><p>{bank.bankName} {__msg("verification.accountEnding")} {bank.accountLast4}</p><p>{__msg("verification.reviewedByTheSeenTeam")}</p><button className="identity-primary" onClick={onClose}>{__msg("comments.done")}</button><button className="identity-later" onClick={edit}>{__msg("verification.changeBankDetails")}</button></div>;
  const field = (name, label, options = {}) => <label>{label}<input name={name} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} {...options} /></label>;
  return <><h2>{__msg("verification.addABankForPayouts")}</h2><p>{__msg("verification.enterYourBankDetailsForReviewByTheSeen")}</p>{bank?.reviewMessage && <p className="identity-error" role="status">{bank.reviewMessage}</p>}{bank && !editing && <p>{__msg("verification.pleaseCorrectYourDetailsAndSubmitThemAgain")}</p>}<form className="manual-identity-form" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><fieldset disabled={mutation.isPending} className="manual-bank-fields">{field("accountHolder", __msg("verification.accountHolderSFullName"), { required: true, maxLength: 150, autoComplete: "name" })}{field("bankName", __msg("verification.bankName"), { required: true, maxLength: 150 })}{field("country", __msg("verification.bankCountry"), { required: true, maxLength: 80, placeholder: __msg("verification.countryNameOrTwoLetterCode") })}{field("currency", __msg("verification.accountCurrency"), { required: true, maxLength: 3, minLength: 3, placeholder: __msg("verification.eGUsd"), autoCapitalize: "characters" })}{field("accountNumber", __msg("verification.accountNumberOrIban"), { required: true, minLength: 6, maxLength: 50, autoComplete: "off", spellCheck: false })}{field("swift", "SWIFT/BIC (or provide routing code below)", { maxLength: 11, autoComplete: "off" })}{field("routing", __msg("verification.routingOrBranchCodeIfApplicable"), { maxLength: 40, autoComplete: "off" })}<label className="manual-identity-consent"><input type="checkbox" required checked={form.confirmOwnership} onChange={e => setForm({ ...form, confirmOwnership: e.target.checked })} /><span>{__msg("verification.iConfirmThisBankAccountBelongsToMeAnd")}</span></label><button className="identity-primary" type="submit">{mutation.isPending ? __msg("verification.submitting") : bank ? __msg("verification.resubmitForReview") : __msg("verification.submitForAdminReview")}</button></fieldset>{mutation.isError && <p className="identity-error" role="alert">{mutation.error.response?.data?.message || __msg("verification.unableToSubmitYourBankDetails")}</p>}<button className="identity-later" disabled={mutation.isPending} onClick={onClose} type="button">{__msg("admin.cancel")}</button></form></>;
}
