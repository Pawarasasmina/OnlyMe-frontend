import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import FinancialConfirmDialog from "../../components/financial/FinancialConfirmDialog";
import MembershipCard from "../../components/financial/MembershipCard";
import { membershipService } from "../../services/membershipService";
import { walletService } from "../../services/walletService";
import { financialErrorMessage } from "../../utils/financialErrorMessages";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

export default function MembershipsPage() {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), retry: false });
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = (mode, membership) => { setAction({ mode, membership, key: createIdempotencyKey(`premium-${mode}`) }); setError(""); };
  const confirm = async () => {
    setBusy(true); setError("");
    try {
      if (action.mode === "cancel") await membershipService.cancelMembership(action.membership.id, action.key);
      else await membershipService.resumeMembership(action.membership.id, action.key);
      await client.invalidateQueries({ queryKey: ["memberships"] });
      await client.invalidateQueries({ queryKey: ["world", action.membership.premiumPublication?._id || action.membership.premiumPublication?.id] });
      setAction(null);
    } catch (requestError) { setError(financialErrorMessage(requestError)); } finally { setBusy(false); }
  };

  return <div>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/wallet"><FiArrowLeft /> Back to Wallet</Link>
    <h1 className="text-3xl font-black">Premium memberships</h1>
    <p className="mt-2 text-sm text-atseen-muted">Memberships renew automatically every 30 days using internal Stars. Cancel anytime; access continues until the paid period ends.</p>
    {q.isLoading ? <p className="mt-6">Loading memberships…</p> : q.isError ? <p className="mt-6 text-red-300">Membership history is unavailable.</p> : q.data.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{q.data.map((membership) => <MembershipCard busy={busy} key={membership.id} membership={membership} onCancel={(item) => open("cancel", item)} onResume={(item) => open("resume", item)} />)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">No Premium memberships yet.</p>}
    <FinancialConfirmDialog open={Boolean(action)} onClose={() => !busy && setAction(null)} title={action?.mode === "cancel" ? "Cancel at period end?" : "Resume membership?"} actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={() => setAction(null)}>Keep current state</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg" disabled={busy} onClick={confirm}>{busy ? "Saving…" : action?.mode === "cancel" ? "Confirm cancellation" : "Resume membership"}</button></>}><p className="text-sm">{action?.mode === "cancel" ? `Access remains active until ${action ? new Date(action.membership.currentPeriodEnd).toLocaleDateString() : "the period end"}. No further renewal will be charged.` : "Automatic 30-day renewal will be turned back on. You can cancel again anytime before the period ends."}</p>{error ? <p aria-live="assertive" className="mt-4 text-red-300">{error}</p> : null}</FinancialConfirmDialog>
  </div>;
}
