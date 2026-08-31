import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiLock, FiMessageCircle } from "react-icons/fi";
import WalletBalance from "./WalletBalance";
import { walletService } from "../../services/walletService";
import { membershipService } from "../../services/membershipService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";

export default function JoinPremiumModal({ authenticated = true, onRequireAuth, open, publication, onSuccess }) {
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet),
    enabled: open && authenticated,
    retry: false,
  });

  useEffect(() => {
    if (open && !key) setKey(createIdempotencyKey("premium-join"));
    if (!open) {
      setKey("");
      setError("");
    }
  }, [key, open]);

  if (!open || !publication) return null;

  const price = Number(publication.pricing?.starsAmount || 0);
  const creatorFirstName = publication.creator?.name?.trim().split(/\s+/)[0] || "this creator";

  const confirm = async () => {
    if (busy) return;
    if (!authenticated) {
      onRequireAuth?.();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await membershipService.joinPremiumWorld(publication.id, key);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["wallet"] }),
        client.invalidateQueries({ queryKey: ["memberships"] }),
        client.invalidateQueries({ queryKey: ["world", publication.id] }),
      ]);
      await onSuccess?.(response.data.data.membership);
    } catch (requestError) {
      const code = financialErrorCode(requestError);
      if (code === "MEMBERSHIP_ALREADY_ACTIVE") {
        await onSuccess?.();
      } else if (code === "INSUFFICIENT_STARS") {
        const short = Math.max(0, price - Number(wallet.data?.balance || 0));
        setError(`You need ✦${short} more Stars. Add Stars to your wallet before subscribing.`);
      } else {
        setError(financialErrorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="premium-join-page">
      <section className="premium-join-card">
        <div className="premium-join-hero">
          {publication.coverMedia?.secureUrl ? <img alt="" src={publication.coverMedia.secureUrl} /> : null}
          <div />
        </div>
        <div className="premium-join-content">
          <small>🪐 Premium Planet</small>
          <h2>{publication.title}</h2>
          <p>You unlock everything about {creatorFirstName}.</p>
          <div className="premium-join-benefits">
            <span><FiMessageCircle /><b>Direct access to {creatorFirstName}&apos;s private world</b></span>
            <span><FiCheck /><b>Private replies from {creatorFirstName}—guaranteed</b></span>
            <span><span>🪐</span><b>Every premium chapter—always new</b></span>
            <span><FiLock /><b>Private stories and highlights</b></span>
          </div>
          {authenticated ? <div className="premium-join-balance"><span>Your balance</span><WalletBalance /></div> : null}
          {error ? <p aria-live="assertive" className="premium-join-error">{error}</p> : null}
          <button className="premium-join-confirm" disabled={busy || (authenticated && (wallet.isError || wallet.isLoading))} onClick={confirm} type="button">
            {!authenticated ? "Sign in to unlock" : busy ? "Confirming…" : `Unlock everything · ✦${price}/mo`}
          </button>
          <p className="premium-join-terms">Renews automatically every 30 days using Stars · Cancel anytime</p>
        </div>
      </section>
    </main>
  );
}
