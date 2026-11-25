/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiCheckCircle, FiDollarSign, FiPercent } from "react-icons/fi";
import { adminFinancialService } from "../../services/adminFinancialService";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-lg font-black outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

export default function FinancialAdminPage() {
  __useUiLanguage();
  const [starsPerUsd, setStarsPerUsd] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [rateBusy, setRateBusy] = useState(false);
  const [taxBusy, setTaxBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const rateQuery = useQuery({ queryKey: ["admin", "star-exchange-rate"], queryFn: () => adminFinancialService.getExchangeRate().then((response) => response.data.data) });
  const taxQuery = useQuery({ queryKey: ["admin", "coin-tax-rate"], queryFn: () => adminFinancialService.getCoinTaxRate().then((response) => response.data.data) });

  useEffect(() => { if (rateQuery.data?.starsPerUsd != null) setStarsPerUsd(String(rateQuery.data.starsPerUsd)); }, [rateQuery.data?.starsPerUsd]);
  useEffect(() => { if (taxQuery.data?.percent != null) setTaxPercent(String(taxQuery.data.percent)); }, [taxQuery.data?.percent]);

  const saveRate = async (event) => {
    event.preventDefault(); setRateBusy(true); setError(""); setResult("");
    try {
      const response = await adminFinancialService.updateExchangeRate({ starsPerUsd: Number(starsPerUsd) });
      setStarsPerUsd(String(response.data.data.starsPerUsd));
      setResult(__msg("admin.exchangeRateUpdatedValue01", { value0: response.data.data.starsPerUsd }));
    } catch (requestError) { setError(requestError.response?.data?.message || __msg("admin.unableToUpdateExchangeRate")); }
    finally { setRateBusy(false); }
  };
  const saveTax = async (event) => {
    event.preventDefault(); setTaxBusy(true); setError(""); setResult("");
    try {
      const response = await adminFinancialService.updateCoinTaxRate({ percent: Number(taxPercent) });
      setTaxPercent(String(response.data.data.percent));
      setResult(__msg("admin.webCoinTaxUpdatedToValue0", { value0: response.data.data.percent }));
    } catch (requestError) { setError(requestError.response?.data?.message || __msg("admin.unableToUpdateWebCoinTax")); }
    finally { setTaxBusy(false); }
  };
  const loading = rateQuery.isLoading || taxQuery.isLoading;
  const loadError = rateQuery.isError || taxQuery.isError;
  return <div className="mx-auto max-w-4xl">
    <header>
      <p className="text-xs font-black uppercase tracking-[.18em] text-orange-500">{__msg("admin.commerceControlCenter")}</p>
      <h1 className="mt-1 text-3xl font-black">{__msg("layouts.financialOperations")}</h1>
      <p className="mt-2 text-sm text-slate-500">Set the coin exchange rate and web purchase tax. Users manage their own top-ups from their Wallet.</p>
    </header>

    {loadError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load financial settings. <button className="font-bold underline" onClick={() => { rateQuery.refetch(); taxQuery.refetch(); }} type="button">{__msg("activity.retry")}</button></p> : null}
    {result ? <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><FiCheckCircle />{result}</p> : null}
    {error ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}

    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={saveRate}>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><FiDollarSign /></span>
        <h2 className="mt-4 text-lg font-black">{__msg("states.star_exchange_rate")}</h2>
        <p className="mt-1 text-sm text-slate-500">Number of coins users receive for each US dollar.</p>
        <label className="mt-5 block text-xs font-bold uppercase text-slate-500">{__msg("admin.starsPer1")}<input className={inputClass} disabled={loading || rateBusy} min="0.01" onChange={(event) => setStarsPerUsd(event.target.value)} required step="0.01" type="number" value={starsPerUsd} /></label>
        <button className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={loading || rateBusy} type="submit">{rateBusy ? __msg("financial.saving") : __msg("admin.updateRate")}</button>
      </form>

      <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={saveTax}>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600"><FiPercent /></span>
        <h2 className="mt-4 text-lg font-black">Web purchase tax</h2>
        <p className="mt-1 text-sm text-slate-500">Tax percentage applied when users purchase coins on the web.</p>
        <label className="mt-5 block text-xs font-bold uppercase text-slate-500">{__msg("system.FinancialAdminPage.3cd190362c")}<input className={inputClass} disabled={loading || taxBusy} min="0" max="100" onChange={(event) => setTaxPercent(event.target.value)} required step="0.001" type="number" value={taxPercent} /></label>
        <button className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={loading || taxBusy} type="submit">{taxBusy ? __msg("financial.saving") : __msg("system.FinancialAdminPage.3d49b0256c")}</button>
      </form>
    </div>
  </div>;
}
