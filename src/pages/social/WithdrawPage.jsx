import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiChevronRight, FiHome } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { walletService } from "../../services/walletService";

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value || 0));

export default function WithdrawPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const wallet = walletQuery.data;
  const available = Number(wallet?.availableIncomeUsd || 0);
  const pending = Number(wallet?.pendingIncomeUsd || 0);
  const minimum = Number(wallet?.withdrawalMinimumUsd || 20);
  const canWithdraw = available >= minimum;

  const previewWithdrawal = () => {
    if (!canWithdraw) return;
    if (!window.confirm(`Withdraw ${money(available)} to the temporary bank account ending 4832?`)) return;
    setNotice("Payout processing is not connected yet. No money was moved and your balance was not changed.");
  };

  return <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-xl px-5 py-5 text-white">
    <header className="flex items-center gap-3"><button aria-label="Back to Wallet" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate("/wallet")} type="button"><FiArrowLeft /></button><h1 className="text-xl font-black">Withdraw</h1></header>

    {walletQuery.isLoading ? <p className="mt-16 text-center text-sm text-white/50">Loading available income…</p> : null}
    {walletQuery.isError ? <section className="mt-16 text-center"><p className="text-sm text-red-300">Unable to load withdrawal details.</p><button className="mt-4 font-bold underline" onClick={() => walletQuery.refetch()} type="button">Try again</button></section> : null}
    {wallet ? <>
      <section className="pb-7 pt-10 text-center"><p className="text-sm text-white/40">Available</p><strong className="mt-2 block text-5xl font-black tracking-tight">{money(available)}</strong><p className="mt-3 text-xs text-white/40">minimum {money(minimum)} · no fees</p></section>

      {pending > 0 ? <section className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.07] px-4 py-3"><strong className="text-sm text-amber-100">{money(pending)} is still pending</strong><p className="mt-1 text-xs leading-5 text-white/50">Creator income received during the last 24 hours cannot be withdrawn yet. It becomes available automatically after the 24-hour hold.</p></section> : <p className="mb-5 text-center text-xs text-white/40">No income is currently in the 24-hour hold.</p>}

      <button className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-[#151922] px-5 py-5 text-left" onClick={() => setNotice("Bank account management will be connected with the payout provider.")} type="button"><FiHome className="text-lg text-white/60" /><span className="flex-1"><b className="block text-sm">Bank •• 4832</b><small className="mt-1 block text-[11px] text-white/40">Temporary payout account · arrives in 3–5 days</small></span><FiChevronRight className="text-white/60" /></button>

      <button className="mt-5 w-full rounded-2xl bg-[#8fc3ff] py-4 text-sm font-black text-[#07101a] shadow-[0_10px_28px_rgba(116,181,255,.3)] disabled:cursor-not-allowed disabled:opacity-40" disabled={!canWithdraw} onClick={previewWithdrawal} type="button">{canWithdraw ? `Withdraw ${money(available)}` : `Minimum ${money(minimum)} required`}</button>
      {notice ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-center text-xs leading-5 text-white/60" role="status">{notice}</p> : null}
    </> : null}
  </main>;
}
