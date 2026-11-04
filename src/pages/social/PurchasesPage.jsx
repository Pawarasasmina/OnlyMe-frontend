import { enumLabel as __enumLabel } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import { walletService } from "../../services/walletService";

export default function PurchasesPage() {
  __useUiLanguage();
  const q = useQuery({ queryKey: ["world-entitlements"], queryFn: () => walletService.getWorldEntitlements().then((response) => response.data.data.items), retry: false });

  return <div>
    <Link className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-atseen-muted transition hover:text-atseen-blue" to="/wallet"><FiArrowLeft data-ui-directional="true" /> {__msg("social.backToWallet")}</Link>
    <h1 className="text-3xl font-black">{__msg("social.experiencePurchases")}</h1>
    <p className="mt-2 text-sm text-atseen-muted">{__msg("social.yourOneTimePurchaseHistoryPurchasedExperiencesRemainAvailable")}</p>
    {q.isLoading ? <p className="mt-6">{__msg("social.loadingPurchases")}</p> : q.isError ? <p className="mt-6 text-red-300">{__msg("social.purchaseHistoryIsUnavailable")}</p> : q.data.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{q.data.map((item) => <article className="overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface" key={item.id}>{item.publication?.coverMedia?.secureUrl ? <img alt="" className="aspect-video w-full object-cover" src={item.publication.coverMedia.secureUrl} /> : null}<div className="p-4"><h2 className="font-black">{item.publication?.title || __msg("social.worldUnavailable")}</h2><p className="mt-1 text-xs text-atseen-muted">{__msg("social.paid")}{item.purchasedStars} · {new Date(item.grantedAt).toLocaleDateString(__uiLocale())}</p><p className={`mt-2 text-sm font-bold ${item.status === "ACTIVE" ? "text-emerald-300" : "text-red-300"}`}>{__enumLabel(item.status)}</p>{item.status === "ACTIVE" && item.publication ? <Link className="mt-4 inline-block rounded-full bg-atseen-blue px-4 py-2 text-xs font-bold text-atseen-bg" to={`/world/${item.publication._id || item.publication.id}`}>{__msg("financial.openWorld")}</Link> : <p className="mt-3 text-xs text-atseen-muted">{__msg("social.accessIsNoLongerActivePurchaseHistoryIsRetained")}</p>}</div></article>)}</div> : <p className="mt-6 rounded-2xl border border-dashed border-atseen-line p-10 text-center text-atseen-muted">{__msg("social.noWorldPurchasesYet")}</p>}
  </div>;
}
