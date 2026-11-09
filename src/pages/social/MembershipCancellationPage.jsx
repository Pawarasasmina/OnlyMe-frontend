import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FiArrowLeft, FiCheck, FiRefreshCw } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { membershipService } from "../../services/membershipService";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { resolveMediaUrl } from "../../utils/media";

const longDate = (value) => new Date(value).toLocaleDateString(__uiLocale(), { day: "numeric", month: "long", year: "numeric" });

export default function MembershipCancellationPage() {
  __useUiLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), retry: false });
  const membership = useMemo(() => memberships.data?.find((item) => String(item.id) === String(id)), [id, memberships.data]);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const world = membership?.premiumPublication;
  const worldId = world?._id || world?.id;
  const cover = resolveMediaUrl(world?.coverMedia?.secureUrl || world?.coverMedia?.url || "");
  const isVideo = String(world?.coverMedia?.mediaType || world?.coverMedia?.resourceType || "").toLowerCase().includes("video");
  const endLabel = membership?.currentPeriodEnd ? longDate(membership.currentPeriodEnd) : __msg("social.theEndOfThisPaidPeriod");

  const cancel = async () => {
    if (!membership || busy) return;
    setBusy(true); setError("");
    try {
      await membershipService.cancelMembership(membership.id, createIdempotencyKey("premium-cancel"));
      await client.invalidateQueries({ queryKey: ["memberships"] });
      if (worldId) await client.invalidateQueries({ queryKey: ["world", String(worldId)] });
      setComplete(true);
    } catch (requestError) { setError(requestError.response?.data?.message || __msg("social.cancellationCouldNotBeCompletedPleaseTryAgain")); }
    finally { setBusy(false); }
  };

  const restart = async () => {
    if (!membership || busy) return;
    setBusy(true); setError("");
    try {
      await membershipService.resumeMembership(membership.id, createIdempotencyKey("premium-resume"));
      await client.invalidateQueries({ queryKey: ["memberships"] });
      navigate(worldId ? `/world/${worldId}` : "/memberships", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || __msg("social.membershipCouldNotBeRestarted")); }
    finally { setBusy(false); }
  };

  if (memberships.isLoading) return <main className="membership-cancel-page is-state"><FiRefreshCw className="membership-cancel-spin" /><p>{__msg("system.MembershipCancellationPage.a59d9e2429")}</p></main>;
  if (memberships.isError || !membership) return <main className="membership-cancel-page is-state"><h1>{__msg("system.MembershipCancellationPage.853a6f1878")}</h1><p>{__msg("system.MembershipCancellationPage.72d37b411a")}</p><button onClick={() => navigate("/memberships", { replace: true })} type="button">{__msg("system.MembershipCancellationPage.437dc906f5")}</button></main>;

  return <main className="membership-cancel-page">
    <header><button aria-label={__msg("profile.goBack")} onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><span>{__msg("system.MembershipCancellationPage.907d3b8c0f")}</span></header>
    <section className="membership-cancel-wall" aria-label={__msg("system.MembershipCancellationPage.841dc4ae1f", { value0: world?.title || __msg("admin.world") })}>
      {cover ? isVideo ? <video autoPlay loop muted playsInline src={cover} /> : <img alt="" src={cover} /> : <div className="membership-cancel-orb" aria-hidden="true" />}
      <div><small>{__msg("system.MembershipCancellationPage.1a5db92679")}</small><h2>{world?.title || __msg("profile.yourWorld")}</h2><p>@{membership.creator?.username || __msg("financial.creator")} {__msg("system.MembershipCancellationPage.27226b4dd0")}{membership.memberNumber || "—"}</p></div>
    </section>
    {!complete ? <section className="membership-cancel-card">
      <p className="membership-cancel-kicker">{__msg("system.MembershipCancellationPage.f4f10ead25")}</p><h1>{__msg("profile.cancelYourMembership")}</h1><p>{__msg("system.MembershipCancellationPage.50cc83d7a1")} {endLabel}{__msg("system.MembershipCancellationPage.f672b61e5f")}</p>
      <ol className="membership-cancel-timeline"><li><i /><span><b>{__msg("profile.today")}</b><small>{__msg("system.MembershipCancellationPage.7fe45a8f86")}</small></span></li><li><i /><span><b>{endLabel}</b><small>{__msg("system.MembershipCancellationPage.3791730a93")}</small></span></li><li><i /><span><b>{__msg("system.MembershipCancellationPage.42f3d5f0d2")}</b><small>{__msg("system.MembershipCancellationPage.4267bccf78")}{membership.memberNumber || "—"} {__msg("system.MembershipCancellationPage.475d1e38d9")}</small></span></li></ol>
      <div className="membership-cancel-waiting"><strong>{__msg("system.MembershipCancellationPage.57b28da24c")}</strong><p>{__msg("system.MembershipCancellationPage.e8d1cfa32e")} {endLabel}.</p></div>
      {error ? <p className="membership-cancel-error" role="alert">{__systemMessage(error)}</p> : null}<button className="membership-cancel-primary" disabled={busy} onClick={cancel} type="button">{busy ? __msg("system.MembershipCancellationPage.90218af7b5") : __msg("profile.finishCancellation")}</button><button className="membership-cancel-back" disabled={busy} onClick={() => navigate(-1)} type="button">{__msg("profile.goBack")}</button>
    </section> : <section className="membership-cancel-card is-complete">
      <span className="membership-cancel-check"><FiCheck /></span><p className="membership-cancel-kicker">{__msg("system.MembershipCancellationPage.0542404a61")}</p><h1>{__msg("system.MembershipCancellationPage.b3bb6c23e9")}</h1><p>{__msg("system.MembershipCancellationPage.7e2374c902")} {world?.title || __msg("system.MembershipCancellationPage.6d028fe89f")} {__msg("system.MembershipCancellationPage.b310f4d4d8")} {endLabel}{__msg("system.MembershipCancellationPage.2ce831776f")}</p>
      <div className="membership-cancel-waiting"><strong>{__msg("profile.yourMembershipEnds")} {endLabel}</strong><p>{__msg("system.MembershipCancellationPage.7533a16886")}{membership.memberNumber || "—"} {__msg("system.MembershipCancellationPage.e282cb5709")}</p></div>
      {error ? <p className="membership-cancel-error" role="alert">{__systemMessage(error)}</p> : null}<button className="membership-cancel-primary" onClick={() => navigate(worldId ? `/world/${worldId}` : "/memberships", { replace: true })} type="button">{__msg("comments.done")}</button><button className="membership-cancel-back" disabled={busy} onClick={restart} type="button">{busy ? __msg("system.MembershipCancellationPage.b86eee163a") : __msg("profile.restartMembership")}</button>
    </section>}
  </main>;
}
