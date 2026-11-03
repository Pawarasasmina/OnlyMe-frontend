import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FinancialConfirmDialog from "./FinancialConfirmDialog";
import WalletBalance from "./WalletBalance";
import { walletService } from "../../services/walletService";
import { purchaseService } from "../../services/purchaseService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";

export default function PurchaseWorldModal({ open, onClose, publication, onSuccess }) {
  __useUiLanguage();
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const experience = publication?.kind === "EXPERIENCE";
  const noun = experience ? __msg("contentEntities.experience") : __msg("admin.world");
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), enabled: open, retry: false });

  useEffect(() => {
    if (open && !key) setKey(createIdempotencyKey(experience ? "experience-purchase" : "world-purchase"));
    if (!open) { setKey(""); setAccepted(false); setError(""); }
  }, [experience, key, open]);

  const confirmPurchase = async () => {
    setBusy(true); setError("");
    try {
      await purchaseService.purchaseWorld(publication.id, key);
      await Promise.all([client.invalidateQueries({ queryKey: ["wallet"] }), client.invalidateQueries({ queryKey: ["world-entitlements"] }), client.invalidateQueries({ queryKey: ["world", publication.id] }), client.invalidateQueries({ queryKey: ["unified-profile"] })]);
      await onSuccess?.(); onClose();
    } catch (requestError) {
      const code = financialErrorCode(requestError);
      if (["ALREADY_ENTITLED", "SELF_PURCHASE_NOT_REQUIRED"].includes(code)) { await onSuccess?.(); onClose(); }
      else if (code === "INSUFFICIENT_STARS") { const short = Math.max(0, Number(publication.pricing?.starsAmount || 0) - Number(wallet.data?.balance || 0)); setError(__msg("financial.youNeedMoreStars", { value0: short })); }
      else setError(financialErrorMessage(requestError));
    } finally { setBusy(false); }
  };

  const remaining = wallet.data ? wallet.data.balance - Number(publication?.pricing?.starsAmount || 0) : null;
  return <FinancialConfirmDialog presentation="center-sheet" open={open} onClose={() => !busy && onClose()} title={__msg("financial.unlockThis", { value0: noun })} actions={<><button className="rounded-full border border-atseen-line px-5 py-3" disabled={busy} onClick={onClose}>{__msg("admin.cancel")}</button><button className="rounded-full bg-atseen-blue px-5 py-3 font-black text-atseen-bg disabled:opacity-40" disabled={busy || !accepted || wallet.isError} onClick={confirmPurchase}>{busy ? __msg("financial.processing") : __msg("financial.unlock", { value0: publication?.pricing?.starsAmount })}</button></>}>
    <p dir="auto" className="font-bold">{publication?.title}</p>
    <p className="mt-1 text-sm text-atseen-muted">{__msg("financial.permanentAccessToThis")} {noun}{__msg("financial.onePaymentIncludingFutureChapterUpdates")}</p>
    {experience && publication?.includedInWorld ? <p className="mt-3 rounded-xl border border-atseen-blue/20 bg-atseen-blue/5 p-3 text-xs text-atseen-muted">{__msg("financial.thisExperienceIsAlsoIncludedWhileYourWorldMembership")}</p> : null}
    <div className="mt-4 rounded-xl bg-atseen-bg p-4"><p className="text-xs text-atseen-muted">{__msg("financial.currentBalance")}</p><WalletBalance /><p className="mt-2 text-xs text-atseen-muted">{__msg("financial.estimatedRemainingBalance")} {remaining == null ? __msg("admin.unavailable") : `✦${remaining}`}</p></div>
    <label className="mt-4 flex items-start gap-3 text-sm"><input checked={accepted} className="mt-1" onChange={(event) => setAccepted(event.target.checked)} type="checkbox" /> {__msg("financial.iConfirmThisOneTimeStarsPurchase")}</label>
    {error ? <p aria-live="assertive" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{__systemMessage(error)}</p> : null}
  </FinancialConfirmDialog>;
}
