import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheckCircle, FiCreditCard, FiSearch, FiUser } from "react-icons/fi";
import FinancialConfirmDialog from "../../components/financial/FinancialConfirmDialog";
import { adminFinancialService } from "../../services/adminFinancialService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorMessage } from "../../utils/financialErrorMessages";

const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

export default function FinancialAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const walletsQuery = useQuery({ queryKey: ["admin", "fan-wallets"], queryFn: () => adminFinancialService.listFanWallets().then((response) => response.data.data.items) });
  const fans = useMemo(() => (walletsQuery.data || []).filter((fan) => { const term = search.trim().toLowerCase(); return !term || fan.name.toLowerCase().includes(term) || fan.username.toLowerCase().includes(term) || fan.email.toLowerCase().includes(term); }), [search, walletsQuery.data]);
  const selected = (walletsQuery.data || []).find((fan) => fan.id === selectedId);

  const review = (event) => {
    event.preventDefault();
    setError("");
    setDraft({ userId: selected.id, target: `${selected.name} (@${selected.username})`, amount: Number(amount), reason: reason.trim(), resetLegacyWallet: selected.wallet.exists && selected.wallet.reconciliationStatus !== "MATCHED", previousBalance: selected.wallet.balance, previousCurrency: selected.wallet.currency, key: createIdempotencyKey("admin-credit") });
  };
  const close = () => { if (!busy) { setDraft(null); setError(""); } };
  const confirm = async () => {
    setBusy(true); setError(""); setResult("");
    try {
      await adminFinancialService.creditStars(draft.userId, { starsAmount: draft.amount, reason: draft.reason, resetLegacyWallet: draft.resetLegacyWallet, idempotencyKey: draft.key });
      setResult(`Added ✦${draft.amount.toLocaleString()} to ${draft.target}.`);
      setAmount(""); setReason(""); setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "fan-wallets"] });
    } catch (requestError) { setError(financialErrorMessage(requestError)); } finally { setBusy(false); }
  };

  return <div className="mx-auto max-w-5xl">
    <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Stars administration</p><h1 className="mt-1 text-3xl font-black text-slate-900">Top up a fan Wallet</h1><p className="mt-2 text-sm text-slate-500">Select one fan and add Stars through an audited ledger entry.</p></header>
    {result ? <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700" role="status"><FiCheckCircle />{result}</p> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(300px,0.9fr)_minmax(380px,1.1fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-4"><h2 className="font-bold text-slate-900">Select a fan</h2><div className="relative mt-3"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400" onChange={(event) => setSearch(event.target.value)} placeholder="Search name, username or email" value={search} /></div></div><div className="max-h-[520px] overflow-y-auto">{walletsQuery.isLoading ? <p className="p-5 text-sm text-slate-500">Loading fans…</p> : walletsQuery.isError ? <p className="p-5 text-sm text-red-600">Unable to load fans.</p> : fans.map((fan) => <button className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition ${selectedId === fan.id ? "bg-orange-50" : "hover:bg-slate-50"}`} key={fan.id} onClick={() => { setSelectedId(fan.id); setResult(""); setError(""); }} type="button"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><FiUser /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{fan.name}</strong><small className="block truncate text-slate-500">@{fan.username} · {fan.email}</small></span><span className="text-sm font-black text-slate-700">✦{fan.wallet.balance.toLocaleString()}</span></button>)}</div></section>
      <section>{selected ? <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={review}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-xl text-orange-600"><FiCreditCard /></span><div><h2 className="font-black text-slate-900">{selected.name}</h2><p className="text-xs text-slate-500">@{selected.username}</p></div></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current balance</p><p className="mt-1 text-3xl font-black text-slate-900">✦{selected.wallet.balance.toLocaleString()}</p></div><label className="mt-5 block text-sm font-semibold text-slate-700">Stars to add<input className={inputClass} min="1" onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" required step="1" type="number" value={amount} /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Reason<textarea className={`${inputClass} min-h-24 resize-y`} maxLength="500" minLength="3" onChange={(event) => setReason(event.target.value)} placeholder="Why are these Stars being added?" required value={reason} /></label><button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-40" disabled={selected.status !== "active"} type="submit">Review top up</button>{selected.status !== "active" ? <p className="mt-2 text-xs text-red-600">This fan account is suspended.</p> : null}</form> : <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><div><FiCreditCard className="mx-auto text-4xl text-slate-300" /><h2 className="mt-3 font-bold text-slate-700">Choose a fan</h2><p className="mt-1 text-sm text-slate-500">The top-up form will appear here.</p></div></div>}</section>
    </div>
    <FinancialConfirmDialog open={Boolean(draft)} onClose={close} title="Confirm Wallet top up" actions={<><button className="rounded-full border border-atseen-line px-5 py-2" disabled={busy} onClick={close} type="button">Cancel</button><button className="rounded-full bg-red-600 px-5 py-2 font-bold text-white disabled:opacity-50" disabled={busy} onClick={confirm} type="button">{busy ? "Processing…" : "Add Stars"}</button></>}><p className="text-sm"><strong>Fan:</strong> {draft?.target}</p>{draft?.resetLegacyWallet ? <p className="mt-3 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200"><strong>Legacy reset:</strong> the old {draft.previousCurrency} balance of {draft.previousBalance?.toLocaleString()} will be replaced with a clean zero-balance Stars ledger before this top-up.</p> : null}<p className="mt-2 text-sm"><strong>Stars to add:</strong> ✦{draft?.amount?.toLocaleString()}</p><p className="mt-2 text-sm"><strong>New balance:</strong> ✦{draft?.resetLegacyWallet ? draft?.amount?.toLocaleString() : ((draft?.previousBalance || 0) + (draft?.amount || 0)).toLocaleString()}</p><p className="mt-2 text-sm"><strong>Reason:</strong> {draft?.reason}</p><p className="mt-4 text-xs text-atseen-muted">This creates an immutable Wallet ledger entry.</p>{error ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p> : null}</FinancialConfirmDialog>
  </div>;
}
