/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFinancialService } from "../../services/adminFinancialService";
export default function AdminMonetizationPolicy() {
  __useUiLanguage();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "monetization-policy"], queryFn: () => adminFinancialService.getMonetizationPolicy().then(r => r.data.data) });
  const [countries, setCountries] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [version, setVersion] = useState("");
  useEffect(() => { if (query.data) { setCountries(query.data.supportedCountries.join("\n")); setEnabled(query.data.enabled); setVersion(query.data.termsVersion); } }, [query.data]);
  const mutation = useMutation({ mutationFn: () => adminFinancialService.updateMonetizationPolicy({ enabled, supportedCountries: countries.split(/\n|,/).map(c => c.trim()).filter(Boolean), termsVersion: version }), onSuccess: r => { client.setQueryData(["admin", "monetization-policy"], r.data.data); client.invalidateQueries({ queryKey: ["monetization"] }); } });
  return <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">{__msg("financial.monetizationEligibility")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("financial.setPayoutCountriesConfirmedForYourPaymentProviderAn")}</p>{query.isPending ? <p>{__msg("financial.loading")}</p> : query.isError ? <button onClick={() => query.refetch()} type="button">{__msg("financial.retryLoadingPolicy")}</button> : <form className="mt-4 grid gap-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}><label className="flex gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />{__msg("financial.monetizationEnabled")}</label><label className="grid gap-1 text-sm font-semibold">{__msg("financial.supportedPayoutCountriesOnePerLine")}<textarea className="min-h-28 rounded-lg border border-slate-300 p-3 font-normal" value={countries} onChange={e => setCountries(e.target.value)} /></label><label className="grid gap-1 text-sm font-semibold">{__msg("financial.monetizationTermsVersion")}<input className="rounded-lg border border-slate-300 p-3 font-normal" required maxLength={60} pattern="[a-zA-Z0-9._-]+" value={version} onChange={e => setVersion(e.target.value)} /></label><button className="w-fit rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40" disabled={mutation.isPending} type="submit">{mutation.isPending ? __msg("financial.saving") : __msg("financial.saveEligibilityPolicy")}</button>{mutation.isError && <p className="text-sm text-red-600" role="alert">{mutation.error.response?.data?.message || __msg("financial.unableToSavePolicy")}</p>}{mutation.isSuccess && <p className="text-sm text-green-700" role="status">{__msg("financial.eligibilityPolicySaved")}</p>}</form>}</section>;
}
