import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiAward, FiCheck, FiCreditCard, FiSearch, FiShield, FiStar } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../hooks/useAuth";
import { verifiedCreatorService } from "../../services/verifiedCreatorService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

const benefits = [
  [FiAward, "Blue verification tick", "Show audiences that your identity and creator account were reviewed."],
  [FiSearch, "More trust in discovery", "Stand out wherever people discover profiles and content."],
  [FiShield, "Impersonation protection", "Give fans a clear signal that they found your official account."],
  [FiStar, "Verified Creator benefits", "Access future verified-only creator features as they launch."],
];

export default function VerifiedCreatorPage({ embedded = false, onClose }) {
  const client = useQueryClient();
  const { setUser } = useAuth();
  const [statement, setStatement] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["creator", "verified-status"], queryFn: () => verifiedCreatorService.getMine().then((r) => r.data.data), refetchOnMount: "always" });
  const mutation = useMutation({ mutationFn: () => verifiedCreatorService.apply({ statement, autoRenew: true }), onSuccess: () => { client.invalidateQueries({ queryKey: ["creator", "verified-status"] }); setConfirm(false); }, onError: (e) => setError(e.response?.data?.message || "Unable to submit your application.") });
  const renew = useMutation({ mutationFn: () => verifiedCreatorService.renew(createIdempotencyKey("verified-creator")), onSuccess: (response) => { client.invalidateQueries({ queryKey: ["creator", "verified-status"] }); client.invalidateQueries({ queryKey: ["wallet"] }); setUser((u) => u ? { ...u, isVerified: response.data.data.isVerified } : u); }, onError: (e) => setError(e.response?.data?.message || "Unable to pay for Verified Creator with Stars.") });
  if (query.isLoading) return <Loader label="Loading Verified Creator..." />;
  const data = query.data || {};
  const subscription = data.subscription;
  const status = subscription?.status || "NOT_APPLIED";
  const amount = `${subscription?.starsPerMonth || data.plan?.starsPerMonth || 190} Stars`;
  const active = status === "APPROVED" && subscription?.paymentStatus === "PAID" && (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date());
  const shell = embedded ? "fixed inset-x-3 bottom-3 z-[200] mx-auto max-h-[90vh] max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#151A22] p-6 shadow-2xl" : "mx-auto max-w-2xl px-4 py-8";
  return <main className={shell}>
    {embedded ? <button className="float-right text-sm text-white/50" onClick={onClose} type="button">Close</button> : null}
    <p className="text-[11px] font-black uppercase tracking-[.18em] text-atseen-blue">Verified Creator</p><h1 className="mt-2 text-3xl font-black">Earn the blue tick</h1><p className="mt-2 text-sm leading-6 text-white/55">Creator approval gives publishing access. Verified Creator is a separate, reviewed monthly subscription.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">{benefits.map(([Icon, title, text]) => <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4" key={title}><Icon className="text-xl text-atseen-blue" /><b className="mt-3 block text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-white/45">{text}</p></div>)}</div>
    <section className="mt-6 rounded-2xl border border-atseen-blue/25 bg-atseen-blue/[.07] p-5"><div className="flex items-end justify-between gap-3"><div><small className="font-bold uppercase tracking-wider text-atseen-blue">Monthly plan</small><p className="mt-1 text-3xl font-black">{amount}<span className="text-sm font-medium text-white/45"> / month</span></p></div><FiCreditCard className="text-2xl text-atseen-blue" /></div><p className="mt-3 text-xs leading-5 text-white/50">The badge is removed automatically if the monthly renewal is not paid. We’ll send an in-app notice when that happens.</p></section>
    {status === "PENDING" ? <p className="mt-5 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">Your application is under admin review. No badge is shown until approval.</p> : null}
    {active ? <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-200"><b className="block">Verified Creator active</b><span>Renews by {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "the next billing date"}.</span></div> : null}
    {status === "EXPIRED" ? <button className="mt-5 w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black disabled:opacity-50" disabled={renew.isPending} onClick={() => renew.mutate()} type="button">{renew.isPending ? "Paying with Stars..." : `Renew for ${amount}`}</button> : null}
    {["NOT_APPLIED", "REJECTED", "CANCELLED"].includes(status) ? <><label className="mt-5 block text-xs font-bold text-white/60">Why should your official creator account be verified?<textarea className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm font-normal text-white outline-none focus:border-atseen-blue" maxLength={1000} onChange={(e) => { setStatement(e.target.value); setError(""); }} placeholder="Share your public presence, audience, or impersonation risk..." value={statement} /></label><div className="mt-1 flex justify-between text-[10px] text-white/35"><span>Minimum 20 characters</span><span>{statement.trim().length}/1000</span></div><button className="mt-4 w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50" disabled={statement.trim().length < 20} onClick={() => { if (statement.trim().length < 20) { setError("Tell us why your account should be verified using at least 20 characters."); return; } setError(""); setConfirm(true); }} type="button">Apply for Verified Creator</button></> : null}
    {error ? <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
    {confirm ? <div className="fixed inset-0 z-[220] grid place-items-end bg-black/70 p-3 sm:place-items-center"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1C212B] p-6"><FiCheck className="text-3xl text-atseen-blue" /><h2 className="mt-3 text-xl font-black">Agree and submit?</h2><p className="mt-2 text-sm leading-6 text-white/55">You authorize a {amount} charge from your Stars wallet if the admin approves this request. Approval automatically activates your blue tick; successful monthly renewals keep it active.</p><button className="mt-5 w-full rounded-xl bg-atseen-blue py-3 font-black text-black disabled:opacity-50" disabled={mutation.isPending} onClick={() => mutation.mutate()} type="button">{mutation.isPending ? "Submitting..." : `Agree to ${amount} and submit`}</button><button className="mt-2 w-full py-3 text-sm font-bold text-white/50" onClick={() => setConfirm(false)} type="button">Not now</button></section></div> : null}
  </main>;
}
