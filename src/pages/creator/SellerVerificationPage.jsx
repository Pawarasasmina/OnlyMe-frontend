import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiShield } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { verificationService } from "../../services/verificationService";

const emptyForm = { legalFullName: "", dateOfBirth: "", country: "", address: "", ageConfirmed: false };

export default function SellerVerificationPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const query = useQuery({ queryKey: ["creator", "verification"], queryFn: () => verificationService.getMine().then((response) => response.data.data), refetchOnMount: "always" });
  const verification = query.data?.verification;
  const complete = Boolean(verification?.status === "APPROVED" && verification.legalFullName && verification.dateOfBirth && verification.country && verification.address && verification.ageConfirmed);

  useEffect(() => {
    if (!verification) return;
    setForm({
      legalFullName: verification.legalFullName || "",
      dateOfBirth: verification.dateOfBirth ? String(verification.dateOfBirth).slice(0, 10) : "",
      country: verification.country || "",
      address: verification.address || "",
      ageConfirmed: Boolean(verification.ageConfirmed),
    });
  }, [verification]);

  const change = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError(""); };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.legalFullName.trim() || !form.dateOfBirth || !form.country.trim() || !form.address.trim()) return setError("Complete every seller information field.");
    if (!form.ageConfirmed) return setError("Confirm that you are 18 or older.");
    setBusy(true); setError("");
    try {
      const draftResponse = await verificationService.saveDraft({
        category: verification.category,
        socialPages: verification.socialPages || [],
        nationality: verification.nationality || "",
        city: verification.city || "",
        phoneNumber: verification.phoneNumber || "",
        documentType: verification.documentType || "",
        documentNumber: verification.documentNumber || "",
        issuingCountry: verification.issuingCountry || "",
        expiryDate: verification.expiryDate || null,
        policyAccepted: Boolean(verification.policyAccepted),
        policyVersion: verification.policyVersion || "",
        ...form,
        informationConfirmed: true,
      });
      const savedStatus = draftResponse.data?.data?.verification?.status;
      if (["CHANGES_REQUESTED", "REJECTED"].includes(savedStatus)) await verificationService.resubmit();
      else await verificationService.submit();
      await client.invalidateQueries({ queryKey: ["creator", "verification"] });
      await query.refetch();
      setSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Seller verification could not be submitted.");
    } finally { setBusy(false); }
  };

  if (query.isLoading) return <Loader label="Loading seller verification..." />;
  if (query.isError || !verification) return <p className="m-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load verification.</p>;
  if (verification.status === "PENDING_REVIEW" || sent) return <main className="mx-auto min-h-screen max-w-lg bg-[#0A0C0F] px-5 py-6 text-white"><button aria-label="Back to Settings" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><section className="mt-20 text-center"><FiShield className="mx-auto text-4xl text-atseen-blue" /><h1 className="mt-5 text-2xl font-black">Seller verification under review</h1><p className="mt-3 text-sm leading-6 text-white/55">Paid Seens and Worlds remain Only you until the review is approved.</p></section></main>;
  if (complete) return <main className="mx-auto min-h-screen max-w-lg bg-[#0A0C0F] px-5 py-6 text-white"><button aria-label="Back to Settings" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><section className="mt-20 text-center"><FiCheck className="mx-auto text-4xl text-emerald-400" /><h1 className="mt-5 text-2xl font-black">Seller verified</h1><p className="mt-3 text-sm leading-6 text-white/55">You can publish Paid Seens and Worlds.</p></section></main>;

  return <main className="mx-auto min-h-screen max-w-lg bg-[#0A0C0F] px-5 py-5 text-white"><header className="flex items-center gap-3"><button aria-label="Back to Settings" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><div><h1 className="text-xl font-black">Verified Creator</h1><p className="text-xs text-white/45">Complete seller identity</p></div></header><section className="mt-7 rounded-3xl border border-white/10 bg-[#151A22] p-5"><p className="text-sm leading-6 text-white/60">This information must match your approved identity document. It is required for Paid Seens and Worlds.</p><form className="mt-5 grid gap-3" onSubmit={submit}><input className="rounded-xl border border-white/10 bg-[#0E1218] px-4 py-3 text-sm outline-none focus:border-atseen-blue" maxLength={150} onChange={(event) => change("legalFullName", event.target.value)} placeholder="Legal full name" value={form.legalFullName} /><input className="rounded-xl border border-white/10 bg-[#0E1218] px-4 py-3 text-sm outline-none focus:border-atseen-blue [color-scheme:dark]" max={new Date().toISOString().slice(0, 10)} onChange={(event) => change("dateOfBirth", event.target.value)} type="date" value={form.dateOfBirth} /><input className="rounded-xl border border-white/10 bg-[#0E1218] px-4 py-3 text-sm outline-none focus:border-atseen-blue" maxLength={80} onChange={(event) => change("country", event.target.value)} placeholder="Country" value={form.country} /><textarea className="min-h-24 rounded-xl border border-white/10 bg-[#0E1218] px-4 py-3 text-sm outline-none focus:border-atseen-blue" maxLength={300} onChange={(event) => change("address", event.target.value)} placeholder="Residential address" value={form.address} /><label className="flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs leading-5 text-white/65"><input checked={form.ageConfirmed} className="mt-1 accent-[#9CCBFF]" onChange={(event) => change("ageConfirmed", event.target.checked)} type="checkbox" /><span>I confirm that I am 18 or older and that the information above is accurate.</span></label>{error ? <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : null}<button className="mt-2 rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black disabled:opacity-50" disabled={busy} type="submit">{busy ? "Submitting..." : "Submit seller verification"}</button></form></section></main>;
}
