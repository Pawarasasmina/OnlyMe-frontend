import { useState } from "react";

const usd = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
export default function AdminWalletLedgers({ reports, accountType }) {
  const [mode, setMode] = useState(accountType === "TEST" ? "TEST" : "REAL_SEED");
  const report = reports?.[mode];
  return <section className="space-y-4" aria-label="Separate wallets">
    <div className="flex flex-wrap gap-2">{[["REAL_SEED", "Real / seed money"], ["TEST", "Test money"]].map(([value, title]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${mode === value ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}>{title}</button>)}</div>
    {!report ? <p role="status">Wallet ledger report is unavailable. Reload to try again.</p> : <>
      {report.reconciliation !== "MATCHED" && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{report.reconciliationMessage}</p>}
      <p className="text-sm text-slate-500">{mode === "TEST" ? "Test balances are isolated from real money. " : ""}10 coins = $1. Fan coins are spend-only. Creator earnings are withdrawal-only.</p>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <Ledger title="Fan coins" balance={report.fanCoins} rows={report.fanLedger} />
        <Ledger title="Creator earnings" balance={report.creatorEarningsUsd} rows={report.earningsLedger} earnings />
      </div>
    </>}
  </section>;
}
function Ledger({ title, balance, rows, earnings = false }) {
  const format = earnings ? usd : (value) => `${Number(value).toLocaleString()} coins`;
  return <section className="min-w-0 overflow-hidden rounded-3xl border bg-white"><header className="border-b p-5"><h2 className="font-black">{title}</h2><p className="mt-2 text-2xl font-black">{format(balance)}</p><p className="text-xs text-slate-500">Newest first · Running balance after each entry</p></header>
    <div className="max-h-[600px] overflow-auto"><table className="w-full min-w-[530px] text-sm"><thead className="sticky top-0 bg-slate-50 text-start text-xs uppercase"><tr><th className="p-3 text-start">Date / event</th><th className="p-3 text-end">Change</th><th className="p-3 text-end">Balance</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row._id}><td className="p-3"><time>{new Date(row.createdAt).toLocaleString()}</time><strong className="block">{row.entryType.replaceAll("_", " ")}</strong><small className="block text-slate-500">{row.referenceType} · {row.referenceId}</small>{row.adjustment && <small className="block font-bold text-amber-700">Manual / opening adjustment{row.metadata?.seeded ? " · Demo data" : ""}</small>}{row.metadata?.reason && <small className="block text-slate-600">Reason: {row.metadata.reason}</small>}</td><td className="p-3 text-end font-bold">{row.walletChange > 0 ? "+" : ""}{format(row.walletChange)}</td><td className="p-3 text-end font-black">{format(row.walletBalance)}</td></tr>)}</tbody></table>{!rows.length && <p className="p-5 text-sm text-slate-500">No entries in this wallet.</p>}</div>
  </section>;
}
