import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import{useQuery}from"@tanstack/react-query";import{walletService}from"../../services/walletService";export default function WalletBalance({compact=false}){
  __useUiLanguage();const q=useQuery({queryKey:["wallet"],queryFn:()=>walletService.getWallet().then(r=>r.data.data.wallet),retry:false,staleTime:30000});if(q.isLoading)return <span aria-label={__msg("financial.walletLoading")}><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />…</span>;if(q.isError)return <span className="text-atseen-muted" title={__msg("financial.walletUnavailable")}>{__msg("financial.unavailable")}</span>;return <span className={compact?"text-xs font-black text-atseen-blue":"text-4xl font-black"}><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />{q.data.balance.toLocaleString(__uiLocale())}</span>}
