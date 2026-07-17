import { useState } from "react";
import FinancialConfirmDialog from "../../components/financial/FinancialConfirmDialog";
import { adminFinancialService } from "../../services/adminFinancialService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import { financialErrorMessage } from "../../utils/financialErrorMessages";

const actions = {
  credit: { title: "Credit Stars", idLabel: "User ID", button: "Credit wallet", amount: true },
  world: { title: "Refund World purchase", idLabel: "Entitlement ID", button: "Refund purchase" },
  premium: { title: "Refund Premium period", idLabel: "Membership ID", button: "Refund period" },
};

export default function FinancialAdminPage() {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const submit = (event, type) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDraft({ type, id: String(data.get("id") || "").trim(), amount: Number(data.get("amount")), reason: String(data.get("reason") || "").trim(), key: createIdempotencyKey(`admin-${type}`) });
    setError("");
  };
  const confirm = async () => {
    setBusy(true); setError(""); setResult("");
    try {
      if (draft.type === "credit") await adminFinancialService.creditStars(draft.id, { starsAmount: draft.amount, reason: draft.reason, idempotencyKey: draft.key });
      if (draft.type === "world") await adminFinancialService.refundWorldEntitlement(draft.id, { reason: draft.reason, idempotencyKey: draft.key });
      if (draft.type === "premium") await adminFinancialService.refundPremiumMembership(draft.id, { reason: draft.reason, idempotencyKey: draft.key });
      setResult(`${actions[draft.type].title} completed successfully.`); setDraft(null);
    } catch (requestError) { setError(financialErrorMessage(requestError)); } finally { setBusy(false); }
  };
  return <div><h1 className="text-2xl font-black">Financial operations</h1><p className="mt-2 text-sm text-slate-500">Audited internal-Stars commands. Wallet balances cannot be edited directly.</p>{result ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{result}</p> : null}<div className="mt-6 grid gap-5 xl:grid-cols-3">{Object.entries(actions).map(([type, action]) => <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={type} onSubmit={(event) => submit(event, type)}><h2 className="font-bold">{action.title}</h2><label className="mt-4 block text-sm font-semibold">{action.idLabel}<input className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-sm" name="id" required /></label>{action.amount ? <label className="mt-3 block text-sm font-semibold">Stars amount<input className="mt-1 w-full rounded-lg border border-slate-300 p-2" min="1" name="amount" required step="1" type="number" /></label> : null}<label className="mt-3 block text-sm font-semibold">Reason<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-2" minLength="3" name="reason" required /></label><button className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white" type="submit">Review command</button></form>)}</div><FinancialConfirmDialog open={Boolean(draft)} onClose={() => !busy && setDraft(null)} title={`Confirm ${draft ? actions[draft.type].title : "operation"}`} actions={<><button className="rounded-full border px-5 py-2" disabled={busy} onClick={() => setDraft(null)}>Cancel</button><button className="rounded-full bg-red-600 px-5 py-2 font-bold text-white" disabled={busy} onClick={confirm}>{busy ? "Processing…" : "Execute command"}</button></>}><p className="text-sm">Target ID: <code>{draft?.id}</code></p>{draft?.type === "credit" ? <p className="mt-2 text-sm">Amount: ✦{draft.amount}</p> : null}<p className="mt-2 text-sm">Reason: {draft?.reason}</p><p className="mt-3 text-xs text-atseen-muted">This creates immutable ledger records and cannot be undone by editing a balance.</p>{error ? <p className="mt-4 text-sm text-red-300" role="alert">{error}</p> : null}</FinancialConfirmDialog></div>;
}
