function Row({ label, value }) {
  return <div className="grid gap-1 border-b border-white/5 py-3 sm:grid-cols-[180px_1fr]"><dt className="text-sm text-brand-mist/45">{label}</dt><dd className="break-words text-sm text-white">{value || "—"}</dd></div>;
}

function maskNumber(value) {
  if (!value) return "—";
  if (value.length <= 4) return value;
  return `${"•".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

function VerificationReviewSummary({ form, verification, backRequired }) {
  return <div className="space-y-6">
    <section><h3 className="text-lg font-bold">Personal information</h3><dl className="mt-2"><Row label="Legal full name" value={form.legalFullName} /><Row label="Date of birth" value={form.dateOfBirth} /><Row label="Country" value={form.country} /><Row label="Nationality" value={form.nationality} /><Row label="Address" value={[form.address, form.city].filter(Boolean).join(", ")} /><Row label="Phone" value={form.phoneNumber} /></dl></section>
    <section><h3 className="text-lg font-bold">Identity</h3><dl className="mt-2"><Row label="Document type" value={form.documentType?.replaceAll("_", " ")} /><Row label="Document number" value={maskNumber(form.documentNumber)} /><Row label="Issuing country" value={form.issuingCountry} /><Row label="Expiry date" value={form.expiryDate || "Not provided"} /></dl></section>
    <section><h3 className="text-lg font-bold">Documents</h3><dl className="mt-2"><Row label="Front document" value={verification.documentFront?.originalName} />{backRequired ? <Row label="Back document" value={verification.documentBack?.originalName} /> : null}<Row label="Selfie with ID" value={verification.selfieWithDocument?.originalName} /></dl></section>
    <section><h3 className="text-lg font-bold">Declarations</h3><ul className="mt-3 space-y-2 text-sm text-brand-mist/70"><li>{form.ageConfirmed ? "✓" : "✕"} Age 18 or older confirmed</li><li>{form.informationConfirmed ? "✓" : "✕"} Information accuracy confirmed</li><li>{form.policyAccepted ? "✓" : "✕"} Terms and Content Policy accepted ({form.policyVersion})</li></ul></section>
  </div>;
}

export default VerificationReviewSummary;
