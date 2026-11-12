/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import{Link}from"react-router-dom";export default function WorldCard({item,to}){
  __useUiLanguage();return <Link className="overflow-hidden rounded-2xl border border-atseen-blue/25 bg-atseen-surface" to={to||`/world/${item.id}`}><div className="aspect-video">{item.coverMedia?.secureUrl?<img alt="" className="h-full w-full object-cover" src={item.coverMedia.secureUrl}/>:null}</div><div className="p-4"><p className="text-2xl">{item.planet?.emoji||"🪐"}</p><strong dir="auto">{item.title}</strong><p className="text-xs text-atseen-muted">{item.kind==="PREMIUM_WORLD"?__msg("financial.premiumWorld"):__msg("admin.world")} · ✦{item.pricing?.starsAmount}{item.pricing?.mode==="MONTHLY"?__msg("system.perMonthFull"):""}</p></div></Link>}
