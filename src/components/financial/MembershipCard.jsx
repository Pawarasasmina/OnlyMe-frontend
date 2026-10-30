import { Link } from "react-router-dom";

export default function MembershipCard({ membership, onResume, busy }) {
  const active = ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(membership.status) && new Date(membership.currentPeriodEnd) > new Date();
  const canResume = membership.status === "CANCEL_AT_PERIOD_END" && active;
  const worldId = membership.premiumPublication?._id || membership.premiumPublication?.id;
  return <article className="rounded-2xl border border-atseen-line bg-atseen-surface p-5">
    <div className="flex items-start gap-3">{membership.creator?.avatar ? <img alt="" className="h-11 w-11 rounded-full object-cover" src={membership.creator.avatar} /> : null}<div><h2 className="font-black">{membership.premiumPublication?.title || "Premium World"}</h2><p className="text-xs text-atseen-muted">@{membership.creator?.username || "creator"}</p></div></div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-atseen-muted">Price</dt><dd>✦{membership.starsPerPeriod}/30 days</dd></div><div><dt className="text-atseen-muted">Status</dt><dd>{membership.status.replaceAll("_", " ")}</dd></div><div className="col-span-2"><dt className="text-atseen-muted">Current period</dt><dd>{new Date(membership.currentPeriodStart).toLocaleDateString()} – {new Date(membership.currentPeriodEnd).toLocaleDateString()}</dd></div></dl>
    <p className="mt-3 text-xs text-atseen-muted">{membership.autoRenew ? `Renews automatically on ${new Date(membership.currentPeriodEnd).toLocaleDateString()}. Renewal reminder arrives three days before payment.` : "Automatic renewal is off."}</p>
    {membership.status === "CANCEL_AT_PERIOD_END" ? <p className="mt-2 text-sm text-orange-200">Your membership ends {new Date(membership.currentPeriodEnd).toLocaleDateString()}.</p> : null}
    {membership.status === "SUSPENDED" ? <p className="mt-2 text-sm text-red-300">Not enough coins to renew — top up to stay.</p> : null}
    <div className="mt-4 flex flex-wrap gap-2">
      {worldId ? <Link className="rounded-full border border-atseen-line px-3 py-2 text-xs font-bold" to={`/world/${worldId}`}>Open World</Link> : null}
      {membership.status === "ACTIVE" ? <Link className="rounded-full border border-red-300/30 px-3 py-2 text-xs text-red-200" to={`/memberships/${membership.id}/cancel`}>Cancel membership</Link> : null}
      {membership.status === "SUSPENDED" ? <Link className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" to="/wallet">Top up</Link> : null}
      {canResume ? <button className="rounded-full bg-atseen-blue px-3 py-2 text-xs font-bold text-atseen-bg" disabled={busy} onClick={() => onResume(membership)} type="button">Restart membership</button> : null}
    </div>
  </article>;
}
