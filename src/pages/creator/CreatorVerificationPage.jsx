import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiCreditCard, FiEye, FiInstagram, FiMusic, FiUpload } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../hooks/useAuth";
import { verificationService } from "../../services/verificationService";

const categories = ["Beauty", "Fitness", "Travel", "Food", "Business", "Fashion", "Art", "Music", "Lifestyle"];
const pages = [
  ["Instagram", "Instagram · @handle", FiInstagram],
  ["TikTok", "TikTok · @handle", FiMusic],
  ["Snapchat", "Snapchat · @handle", FiUpload],
  ["Facebook", "Facebook · @handle", FiCreditCard],
  ["YouTube", "YouTube · @handle", FiEye],
];
const editableStatuses = new Set(["NOT_STARTED", "DRAFT", "CHANGES_REQUESTED"]);

const errorText = (error, fallback) => error.response?.data?.message || error.message || fallback;

function UnderReview({ verification }) {
  const submitted = (verification.socialPages || []).filter((item) => item.handle);
  return <section className="mx-auto mt-8 w-full max-w-lg rounded-t-[24px] border border-b-0 border-white/10 bg-[#1C212B] px-5 pb-10 pt-2 shadow-[0_-20px_70px_rgba(0,0,0,.5)]"><span className="mx-auto mb-6 block h-1 w-9 rounded-full bg-white/30" /><div className="text-center"><FiEye className="mx-auto text-3xl text-atseen-blue" /><h1 className="mt-5 text-xl font-black">Under review</h1><p className="mt-2 text-sm leading-6 text-white/55">Our team is looking at your pages and document.<br />Usually 24–48 hours.</p></div><div className="mt-6 divide-y divide-white/[0.07]">{submitted.map((item) => <div className="flex items-center gap-3 py-3" key={item.platform}><span className="text-atseen-blue">{item.platform === "TikTok" ? <FiMusic /> : <FiInstagram />}</span><span className="min-w-0 flex-1"><b className="block text-sm">{item.platform}</b><small className="block truncate text-xs text-white/40">{item.handle}</small></span><small className="text-xs text-white/35">checking...</small></div>)}<div className="flex items-center gap-3 py-3"><FiCreditCard className="text-atseen-blue" /><span className="flex-1"><b className="block text-sm">Document</b><small className="text-xs text-white/40">received</small></span><FiCheck className="text-emerald-400" /></div></div></section>;
}

export default function CreatorVerificationPage() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const fileRef = useRef(null);
  const [category, setCategory] = useState("");
  const [handles, setHandles] = useState({});
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["creator", "verification"], queryFn: () => verificationService.getMine().then((response) => response.data.data), refetchOnMount: "always" });
  const verification = query.data?.verification;
  const status = verification?.status || "NOT_STARTED";

  useEffect(() => {
    if (!verification) return;
    setCategory((current) => current || verification.category || "");
    setHandles((current) => Object.keys(current).length ? current : Object.fromEntries((verification.socialPages || []).map((item) => [item.platform, item.handle])));
    if (query.data?.creatorApprovalStatus) setUser((current) => current ? { ...current, creatorApprovalStatus: query.data.creatorApprovalStatus } : current);
  }, [query.data?.creatorApprovalStatus, setUser, verification]);

  if (query.isLoading) return <Loader label="Loading creator application..." />;
  if (query.isError || !verification) return <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200">Unable to load creator application.</p>;
  if (status === "PENDING_REVIEW") return <UnderReview verification={verification} />;
  if (status === "APPROVED") return <section className="mx-auto max-w-lg rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-7 text-center"><FiCheck className="mx-auto text-4xl text-emerald-400" /><h1 className="mt-4 text-2xl font-black">Creator approved</h1><p className="mt-2 text-sm text-white/55">Your creator tools are ready.</p><Link className="mt-6 inline-flex rounded-full bg-atseen-blue px-6 py-3 text-sm font-black text-black" to="/studio">Open professional dashboard</Link></section>;
  if (!editableStatuses.has(status)) return <section className="mx-auto max-w-lg rounded-3xl border border-orange-400/20 bg-orange-500/10 p-6"><h1 className="text-xl font-black">Application {status.toLowerCase()}</h1><p className="mt-2 text-sm text-white/55">{verification.creatorVisibleMessage || verification.rejectionReason || "Please contact support for more information."}</p></section>;

  const socialPages = pages.map(([platform]) => ({ platform, handle: String(handles[platform] || "").trim() })).filter((item) => item.handle);
  const submit = async () => {
    if (!category) { setError("Choose what you create."); return; }
    if (!socialPages.length) { setError("Add at least one creator page."); return; }
    if (!file && !verification.documentFront) { setError("Upload your ID document."); return; }
    setBusy(true); setError("");
    try {
      await verificationService.saveDraft({ category, socialPages });
      if (file) await verificationService.uploadDocument("documentFront", file);
      if (status === "CHANGES_REQUESTED") await verificationService.resubmit(); else await verificationService.submit();
      await queryClient.invalidateQueries({ queryKey: ["creator", "verification"] });
      await query.refetch();
    } catch (requestError) { setError(errorText(requestError, "Unable to send your application.")); }
    finally { setBusy(false); }
  };

  return <section className="mx-auto w-full max-w-lg rounded-t-[24px] border border-b-0 border-white/10 bg-[#1C212B] px-5 pb-10 pt-2 shadow-[0_-20px_70px_rgba(0,0,0,.5)]"><span className="mx-auto mb-5 block h-1 w-9 rounded-full bg-white/30" /><h1 className="text-2xl font-black">Creator ✓ · Apply</h1><p className="mt-1 text-sm text-white/55">Show us what you create. We review every application by hand.</p>{status === "CHANGES_REQUESTED" ? <p className="mt-4 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-200">{verification.creatorVisibleMessage || "Please update your application and send it again."}</p> : null}<div className="mt-6"><h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-white/35">What do you create?</h2><div className="mt-3 flex flex-wrap gap-2">{categories.map((item) => <button className={`rounded-full border px-4 py-2 text-xs font-bold ${category === item ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-white/10 bg-white/[0.04] text-white/55"}`} key={item} onClick={() => { setCategory(item); setError(""); }} type="button">{item}</button>)}</div></div><div className="mt-6"><h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-white/35">Your pages <span className="normal-case tracking-normal">· at least one</span></h2><div className="mt-3 space-y-2">{pages.map(([platform, placeholder, Icon]) => <label className="flex items-center gap-3" key={platform}><Icon className="shrink-0 text-atseen-blue" /><input aria-label={platform} className="w-full rounded-xl border border-white/10 bg-[#11151B] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-atseen-blue" onChange={(event) => { setHandles((current) => ({ ...current, [platform]: event.target.value })); setError(""); }} placeholder={placeholder} value={handles[platform] || ""} /></label>)}</div></div><div className="mt-6"><h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-white/35">Document</h2><input accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} ref={fileRef} type="file" /><button className="mt-3 flex w-full items-center gap-4 rounded-2xl border border-dashed border-atseen-blue/45 bg-atseen-blue/[0.04] p-4 text-left" onClick={() => fileRef.current?.click()} type="button"><FiCreditCard className="text-xl text-atseen-blue" /><span><b className="block text-sm">{file ? file.name : verification.documentFront ? "ID uploaded" : "Upload ID"}</b><small className="mt-1 block text-[10px] text-white/40">Passport or Emirates ID · encrypted, deleted after review</small></span></button></div>{error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}<button className="mt-5 w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black disabled:opacity-50" disabled={busy} onClick={submit} type="button">{busy ? "Sending..." : status === "CHANGES_REQUESTED" ? "Send again for review" : "Send for review"}</button><p className="mt-3 text-center text-[10px] text-white/35">Review by the @seen team · usually 24–48h</p></section>;
}
