/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
function Row({ label, value }) {
  __useUiLanguage();
  return <div className="grid gap-1 border-b border-white/5 py-3 sm:grid-cols-[180px_1fr]"><dt className="text-sm text-brand-mist/45">{label}</dt><dd className="break-words text-sm text-white">{value || "—"}</dd></div>;
}

function maskNumber(value) {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

function VerificationReviewSummary({ form, verification, backRequired }) {
  __useUiLanguage();
  return <div className="space-y-6">
    <section><h3 className="text-lg font-bold">{__msg("verification.personalInformation")}</h3><dl className="mt-2"><Row label={__msg("verification.legalFullName")} value={form.legalFullName} /><Row label={__msg("verification.dateOfBirth")} value={form.dateOfBirth} /><Row label={__msg("verification.country")} value={form.country} /><Row label={__msg("verification.nationality")} value={form.nationality} /><Row label={__msg("verification.address")} value={[form.address, form.city].filter(Boolean).join(", ")} /><Row label={__msg("verification.phone")} value={form.phoneNumber} /></dl></section>
    <section><h3 className="text-lg font-bold">{__msg("verification.identity")}</h3><dl className="mt-2"><Row label={__msg("verification.documentType")} value={form.documentType?.replaceAll("_", " ")} /><Row label={__msg("verification.documentNumber")} value={maskNumber(form.documentNumber)} /><Row label={__msg("verification.issuingCountry")} value={form.issuingCountry} /><Row label={__msg("verification.expiryDate")} value={form.expiryDate || "Not provided"} /></dl></section>
    <section><h3 className="text-lg font-bold">{__msg("verification.documents")}</h3><dl className="mt-2"><Row label={__msg("verification.frontDocument")} value={verification.documentFront?.originalName} />{backRequired ? <Row label={__msg("verification.backDocument")} value={verification.documentBack?.originalName} /> : null}<Row label={__msg("verification.selfieWithId")} value={verification.selfieWithDocument?.originalName} /></dl></section>
    <section><h3 className="text-lg font-bold">{__msg("verification.declarations")}</h3><ul className="mt-3 space-y-2 text-sm text-brand-mist/70"><li>{form.ageConfirmed ? "✓" : "✕"} {__msg("verification.age18OrOlderConfirmed")}</li><li>{form.informationConfirmed ? "✓" : "✕"} {__msg("verification.informationAccuracyConfirmed")}</li><li>{form.policyAccepted ? "✓" : "✕"} {__msg("verification.termsAndContentPolicyAccepted")}{form.policyVersion})</li></ul></section>
  </div>;
}

export default VerificationReviewSummary;
