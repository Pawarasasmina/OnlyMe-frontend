import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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
  __useUiLanguage();
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
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/wallet"><FiArrowLeft data-ui-directional="true" /> {__msg("social.backToWallet")}</Link>
    <h1 className="text-3xl font-black">{__msg("social.purchasesSubscriptions")}</h1>
    <p className="mt-2 text-sm text-atseen-muted">{__msg("social.worldSubscriptionsRenewEvery30DaysCancelAnytimeAccess")}</p>
    <Link className="mt-4 inline-flex rounded-full border border-atseen-blue/30 px-4 py-2 text-xs font-bold text-atseen-blue" to="/purchases">{__msg("social.viewOneTimeExperiencePurchases")}</Link>
    {q.isLoading ? <p className="mt-6">{__msg("social.loadingMemberships")}</p> : q.isError ? <p className="mt-6 text-red-300">{__msg("social.membershipHistoryIsUnavailable")}</p> : q.data.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{q.data.map((membership) => <MembershipCard busy={busy} key={membership.id} membership={membership} onCancel={(item) => open("cancel", item)} onResume={(item) => open("resume", item)} />)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">{__msg("social.noPremiumMembershipsYet")}</p>}
    <FinancialConfirmDialog open={Boolean(action)} onClose={() => !busy && setAction(null)} title={action?.mode === "cancel" ? __msg("social.cancelAtPeriodEnd") : __msg("social.resumeMembership")} actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={() => setAction(null)}>{__msg("social.keepCurrentState")}</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg" disabled={busy} onClick={confirm}>{busy ? __msg("financial.saving") : action?.mode === "cancel" ? __msg("social.confirmCancellation") : __msg("social.resumeMembership_e6ace6")}</button></>}><p className="text-sm">{action?.mode === "cancel" ? __msg("social.accessRemainsActiveUntilNoFurtherRenewalWillBe", { value0: action ? new Date(action.membership.currentPeriodEnd).toLocaleDateString(__uiLocale()) : __msg("social.thePeriodEnd") }) : __msg("social.automatic30DayRenewalWillBeTurnedBackOn")}</p>{error ? <p aria-live="assertive" className="mt-4 text-red-300">{__systemMessage(error)}</p> : null}</FinancialConfirmDialog>
  </div>;
}
