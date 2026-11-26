import AdminWalletLedgers from "../../components/admin/AdminWalletLedgers";
import { enumLabel, getLocale, msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useRef, useState } from "react";
import { FiCornerUpLeft, FiLock, FiUnlock } from "react-icons/fi";
import GovernanceTargetPicker from "../../components/admin/GovernanceTargetPicker";
import { adminOperationsService as service } from "../../services/adminOperationsService";
import { useAdminDialog } from "../../components/admin/AdminDialogProvider";

export default function FinanceUserPage() {
  useLanguage(); const dialog = useAdminDialog(); const holdLock = useRef(false);
  const [holding, setHolding] = useState(false), [id, setId] = useState(""), [data, setData] = useState(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const load = async (userId = id) => { if (!userId) return; setError(""); setBusy(true); try { setData((await service.financialUser(userId)).data.data); } catch (requestError) { setError(requestError.response?.data?.message || requestError.message); } finally { setBusy(false); } };
  const choose = (userId) => { setId(userId); setData(null); if (userId) void load(userId); };
  const hold = async (release) => {
    if (holdLock.current || busy || !data) return;
    holdLock.current = true; setHolding(true); setError(""); setNotice("");
    try {
      const reason = await dialog.prompt({ title: release ? "Release manual payout hold?" : "Hold payouts?", description: `@${data.user.username}: ${release ? "A serious-case safety hold will remain active." : "Payouts remain blocked until the hold is released."}`, inputLabel: "Reason (3–500 characters)", minLength: 3, maxLength: 500, confirmLabel: release ? "Release manual hold" : "Hold payouts", tone: release ? "warning" : "danger" });
      if (!reason?.trim()) return;
      const response = await (release ? service.releasePayouts(id, reason.trim()) : service.holdPayouts(id, reason.trim()));
      const updatedHold = response.data.data.hold;
      setData((current) => ({ ...current, payoutHold: updatedHold?.active ? updatedHold : null }));
      setNotice(response.data.message || (release ? "Payout hold released" : "Payout hold active"));
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message); }
    finally { holdLock.current = false; setHolding(false); }
  };
  const refund = async () => setError(msg("system.FinanceUserPage.96f40312c5"));
  const worlds = data?.purchases?.worlds || [], memberships = data?.purchases?.memberships || [];
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl bg-slate-950 p-7 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-400">{msg("system.FinanceUserPage.5eba17a839")}</p><h1 className="mt-2 text-3xl font-black">{msg("system.AdminLayout.7ecd315515")}</h1><p className="mt-2 text-sm text-slate-300">{msg("system.FinanceUserPage.38cba8fce5")}</p></header>
    {(error || notice) && <p role={error ? "alert" : "status"} className={`rounded-xl p-4 text-sm font-bold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{error || notice}</p>}
    <fieldset disabled={holding || busy} className="rounded-2xl border bg-white p-4"><label className="text-sm font-black">{msg("system.FinanceUserPage.3bed1192b5")}<GovernanceTargetPicker source="users" type="USER" value={id} onChange={choose} /></label>{busy && !data && <p className="mt-3 text-sm text-slate-400">{msg("system.FinanceUserPage.ca6aa5f613")}</p>}</fieldset>
    {data && <><section className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{data.user.name}</h2><p className="text-sm text-slate-500"><bdi dir="ltr">@{data.user.username}</bdi> · {data.user.email}</p></div>{data.payoutHold?.manualActive !== false ? <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white" disabled={holding || busy} type="button" onClick={() => hold(true)}><FiUnlock /> {holding ? "Saving…" : "Release manual hold"}</button> : data.payoutHold ? <span className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-black text-red-700"><FiLock className="me-2 inline" />Safety hold</span> : <button className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white" disabled={holding || busy} type="button" onClick={() => hold(false)}><FiLock /> {holding ? "Saving…" : "Hold payouts"}</button>}</div>{data.payoutHold && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700"><strong>Payout hold active:</strong> {data.payoutHold.seriousCaseRefs?.length ? `${data.payoutHold.seriousCaseRefs.length} open serious safety case(s). ` : ""}{data.payoutHold.reason}</p>}</section><AdminWalletLedgers key={id} reports={data.walletReports} accountType={data.user.accountType} /><div className="grid gap-6 xl:grid-cols-2"><PurchaseList busy={busy} items={worlds} kind="world" onRefund={refund} /><PurchaseList busy={busy} items={memberships} kind="membership" onRefund={refund} /></div></>}
  </div>;
}

function PurchaseList({ items, kind, onRefund, busy }) {
  useLanguage(); const title = kind === "world" ? msg("admin.worldPurchases") : msg("admin.premiumMemberships");
  return <section className="overflow-hidden rounded-3xl border bg-white"><div className="border-b p-5"><h2 className="font-black">{title}</h2><p className="text-xs text-slate-500">{msg("system.FinanceUserPage.046d9f1a31")}</p></div><div className="max-h-96 divide-y overflow-auto">{items.map((item) => { const refunded = item.status === "REFUNDED"; const name = kind === "world" ? item.publication?.title : item.premiumPublication?.title; return <article className="flex items-center justify-between gap-4 p-4" key={item._id}><div><strong className="text-sm">{name || msg("system.FinanceUserPage.07cb54dfa4")}</strong><p className="mt-1 text-xs text-slate-500">{enumLabel(item.status)} · <img alt={msg("profile.coins")} className="inline-block h-[1em] w-[1em] object-contain align-[-0.12em]" src="/brand/goldcoin.png" />{item.purchasedStars || item.starsPerPeriod} · {new Date(item.createdAt).toLocaleDateString(getLocale())}</p></div><button className="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-40" disabled={busy || refunded} onClick={() => onRefund(kind, item)} type="button"><FiCornerUpLeft /> {refunded ? msg("fan.refunded") : msg("system.FinanceUserPage.e17c8ad0dc")}</button></article>; })}{!items.length && <p className="p-6 text-center text-sm text-slate-400">{msg("search.no")} {title.toLowerCase()}.</p>}</div></section>;
}
