import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { walletService } from "../../services/walletService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

const STAR = "✦";
const money = (value) => new Intl.NumberFormat(__uiLocale(), { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value || 0));

export default function IncomeToCoinsPage() {
  __useUiLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then((response) => response.data.data.wallet), retry: false });
  const wallet = walletQuery.data;
  const rate = Number(wallet?.starsPerUsd || 10);
  const earnedStars = Number(wallet?.availableIncomeStars || 0);
  const options = useMemo(() => [5, 10, 25].map((usd) => ({ label: money(usd), stars: Math.round(usd * rate) })).filter((item) => item.stars <= earnedStars), [earnedStars, rate]);

  const convert = async (stars, label) => {
    if (!Number.isSafeInteger(stars) || stars < 1) return;
    if (!window.confirm(__msg("social.convertValue0OfCreatorIncomeIntoValue1Value2", { value0: label, value1: STAR, value2: stars.toLocaleString(__uiLocale()) }))) return;
    setBusy(true);
    setMessage("");
    try {
      await walletService.convertIncome(stars, createIdempotencyKey("income-to-coins"));
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["wallet"] }), queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] })]);
      setMessage(__msg("social.convertedSuccessfullyTheseCoinsNowBehaveLikeTopUp", { value0: STAR, value1: stars.toLocaleString(__uiLocale()) }));
    } catch (error) {
      setMessage(error.response?.data?.message || __msg("social.couldNotConvertCreatorIncomePleaseTryAgain"));
    } finally {
      setBusy(false);
    }
  };

  return <main className="mx-auto min-h-[calc(100dvh-80px)] w-full max-w-xl px-5 py-5 text-white">
    <header className="flex items-center gap-3"><button aria-label={__msg("social.backToWallet")} className="grid h-10 w-10 place-items-center rounded-full bg-white/[.06]" onClick={() => navigate("/wallet")} type="button"><FiArrowLeft data-ui-directional="true" /></button><h1 className="text-xl font-black">{__msg("social.dollarsCoins")}</h1></header>
    {walletQuery.isLoading ? <p className="mt-16 text-center text-sm text-white/50">{__msg("social.loadingCreatorIncome")}</p> : null}
    {walletQuery.isError ? <section className="mt-16 text-center"><p className="text-sm text-red-300">{__msg("social.unableToLoadCreatorIncome")}</p><button className="mt-4 font-bold underline" onClick={() => walletQuery.refetch()} type="button">{__msg("discover.tryAgain")}</button></section> : null}
    {wallet ? <section className="pt-9 text-center">
      <p className="text-sm text-white/40">{__msg("social.creatorIncomeAvailableToConvert")}</p>
      <strong className="mt-2 block text-4xl font-black tracking-tight">{money(wallet.availableIncomeUsd)}</strong>
      <p className="mx-auto mt-5 max-w-xs text-sm font-semibold leading-6 text-white/60">{__msg("social.oneWayOnlyCoinsNeverTurnBackIntoMoney")}</p>
      {Number(wallet.pendingIncomeUsd || 0) > 0 ? <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-amber-100/70">{money(wallet.pendingIncomeUsd)} {__msg("social.receivedDuringTheLast24HoursIsStillPending")}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[5, 10, 25].map((usd) => { const stars = Math.round(usd * rate); const enabled = stars <= earnedStars; return <button className="rounded-full border border-white/10 bg-[#171b23] px-5 py-3 text-sm font-black disabled:opacity-30" disabled={busy || !enabled} key={usd} onClick={() => convert(stars, money(usd))} type="button">${usd} → <span className="text-[#8fc3ff]">{STAR}</span> {stars.toLocaleString(__uiLocale())}</button>; })}
      </div>
      {earnedStars > 0 ? <button className="mt-3 rounded-full border border-[#8fc3ff]/45 bg-[#17202a] px-5 py-3 text-sm font-black text-[#9bcaff] disabled:opacity-40" disabled={busy} onClick={() => convert(earnedStars, money(wallet.availableIncomeUsd))} type="button">{__msg("social.all")} {money(wallet.availableIncomeUsd)} → {STAR} {earnedStars.toLocaleString(__uiLocale())}</button> : null}
      {!options.length && earnedStars > 0 ? <p className="mt-4 text-xs text-white/40">{__msg("social.useAllToConvertABalanceBelow")} {money(5)}.</p> : null}
      <p className="mt-4 text-xs text-white/35">{STAR}{rate.toLocaleString(__uiLocale())} = $1</p>
      {message ? <p className="mx-auto mt-5 max-w-sm rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs leading-5 text-white/60" role="status">{message}</p> : null}
    </section> : null}
  </main>;
}
