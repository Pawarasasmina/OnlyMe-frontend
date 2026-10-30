import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FiArrowLeft, FiCheck, FiRefreshCw } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { membershipService } from "../../services/membershipService";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { resolveMediaUrl } from "../../utils/media";

const longDate = (value) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export default function MembershipCancellationPage() {
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
  const endLabel = membership?.currentPeriodEnd ? longDate(membership.currentPeriodEnd) : "the end of this paid period";

  const cancel = async () => {
    if (!membership || busy) return;
    setBusy(true); setError("");
    try {
      await membershipService.cancelMembership(membership.id, createIdempotencyKey("premium-cancel"));
      await client.invalidateQueries({ queryKey: ["memberships"] });
      if (worldId) await client.invalidateQueries({ queryKey: ["world", String(worldId)] });
      setComplete(true);
    } catch (requestError) { setError(requestError.response?.data?.message || "Cancellation could not be completed. Please try again."); }
    finally { setBusy(false); }
  };

  const restart = async () => {
    if (!membership || busy) return;
    setBusy(true); setError("");
    try {
      await membershipService.resumeMembership(membership.id, createIdempotencyKey("premium-resume"));
      await client.invalidateQueries({ queryKey: ["memberships"] });
      navigate(worldId ? `/world/${worldId}` : "/memberships", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || "Membership could not be restarted."); }
    finally { setBusy(false); }
  };

  if (memberships.isLoading) return <main className="membership-cancel-page is-state"><FiRefreshCw className="membership-cancel-spin" /><p>Loading your membership…</p></main>;
  if (memberships.isError || !membership) return <main className="membership-cancel-page is-state"><h1>Membership unavailable</h1><p>We could not find this membership.</p><button onClick={() => navigate("/memberships", { replace: true })} type="button">Back to subscriptions</button></main>;

  return <main className="membership-cancel-page">
    <header><button aria-label="Go back" onClick={() => navigate(-1)} type="button"><FiArrowLeft /></button><span>Manage membership</span></header>
    <section className="membership-cancel-wall" aria-label={`${world?.title || "World"} content wall`}>
      {cover ? isVideo ? <video autoPlay loop muted playsInline src={cover} /> : <img alt="" src={cover} /> : <div className="membership-cancel-orb" aria-hidden="true" />}
      <div><small>WORLD</small><h2>{world?.title || "Your World"}</h2><p>@{membership.creator?.username || "creator"} · Member #{membership.memberNumber || "—"}</p></div>
    </section>
    {!complete ? <section className="membership-cancel-card">
      <p className="membership-cancel-kicker">YOUR MEMBERSHIP</p><h1>Cancel your membership?</h1><p>You keep everything inside until {endLabel}. There are no further charges after that date.</p>
      <ol className="membership-cancel-timeline"><li><i /><span><b>Today</b><small>Everything stays open. Your access does not change now.</small></span></li><li><i /><span><b>{endLabel}</b><small>Your membership ends and no further renewal is charged.</small></span></li><li><i /><span><b>After expiry</b><small>You can restart anytime. We hold member #{membership.memberNumber || "—"} for 30 days.</small></span></li></ol>
      <div className="membership-cancel-waiting"><strong>Waiting for you inside</strong><p>Your saved World stories, included Paid Seens, Circles and creator welcome remain available through {endLabel}.</p></div>
      {error ? <p className="membership-cancel-error" role="alert">{error}</p> : null}<button className="membership-cancel-primary" disabled={busy} onClick={cancel} type="button">{busy ? "Finishing…" : "Finish cancellation"}</button><button className="membership-cancel-back" disabled={busy} onClick={() => navigate(-1)} type="button">Go back</button>
    </section> : <section className="membership-cancel-card is-complete">
      <span className="membership-cancel-check"><FiCheck /></span><p className="membership-cancel-kicker">CONFIRMED</p><h1>Membership cancelled</h1><p>You can keep using {world?.title || "this World"} until {endLabel}. We sent the confirmation to your email and Activity.</p>
      <div className="membership-cancel-waiting"><strong>Your membership ends {endLabel}</strong><p>No further charge is scheduled. Member #{membership.memberNumber || "—"} is held for 30 days after expiry.</p></div>
      {error ? <p className="membership-cancel-error" role="alert">{error}</p> : null}<button className="membership-cancel-primary" onClick={() => navigate(worldId ? `/world/${worldId}` : "/memberships", { replace: true })} type="button">Done</button><button className="membership-cancel-back" disabled={busy} onClick={restart} type="button">{busy ? "Restarting…" : "Restart membership"}</button>
    </section>}
  </main>;
}
