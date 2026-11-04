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
  const query = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), retry: false });
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const openResume = (membership) => { setAction({ membership, key: createIdempotencyKey("premium-resume") }); setError(""); };
  const confirmResume = async () => {
    setBusy(true); setError("");
    try {
      await membershipService.resumeMembership(action.membership.id, action.key);
      await client.invalidateQueries({ queryKey: ["memberships"] });
      await client.invalidateQueries({ queryKey: ["world", action.membership.premiumPublication?._id || action.membership.premiumPublication?.id] });
      setAction(null);
    } catch (requestError) { setError(financialErrorMessage(requestError)); }
    finally { setBusy(false); }
  };

  return <div>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/wallet"><FiArrowLeft /> Back to Wallet</Link>
    <h1 className="text-3xl font-black">Purchases &amp; subscriptions</h1>
    <p className="mt-2 text-sm text-atseen-muted">World memberships renew every 30 days. We remind you three days before payment. Cancel anytime; access continues until the paid period ends.</p>
    <Link className="mt-4 inline-flex rounded-full border border-atseen-blue/30 px-4 py-2 text-xs font-bold text-atseen-blue" to="/purchases">View one-time Seen purchases</Link>
    {query.isLoading ? <p className="mt-6">Loading memberships…</p> : query.isError ? <p className="mt-6 text-red-300">Membership history is unavailable.</p> : query.data.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{query.data.map((membership) => <MembershipCard busy={busy} key={membership.id} membership={membership} onResume={openResume} />)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">No World memberships yet.</p>}
    <FinancialConfirmDialog open={Boolean(action)} onClose={() => !busy && setAction(null)} title="Restart membership?" actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={() => setAction(null)}>Not now</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg" disabled={busy} onClick={confirmResume}>{busy ? "Saving…" : "Restart membership"}</button></>}><p className="text-sm">Automatic renewal will turn back on. You can cancel again at any time before the period ends.</p>{error ? <p aria-live="assertive" className="mt-4 text-red-300">{error}</p> : null}</FinancialConfirmDialog>
  </div>;
}
