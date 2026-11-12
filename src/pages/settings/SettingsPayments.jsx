import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';
import { useLanguage } from '../../hooks/useLanguage';
import { msg, getLocale } from '../../i18n/runtime';
import { walletService } from '../../services/walletService';
import './SettingsPayments.css';
import OwnerThingsSheet from '../../components/profile/OwnerThingsSheet';

function Row({ title, subtitle, to, onClick }) {
  __useUiLanguage();
  const content=<><span className="settings-index-row-copy"><b>{title}</b><small>{subtitle}</small></span><FiChevronRight data-ui-directional="true" /></>;
  return to ? <Link className="settings-index-row" to={to}>{content}</Link> : <button className="settings-index-row" onClick={onClick} type="button">{content}</button>;
}

export default function SettingsPayments() {
  useLanguage();
  const [subscriptionsOpen,setSubscriptionsOpen]=useState(false);
  const [toastVersion,setToastVersion]=useState(0);
  useEffect(()=>{
    if (!toastVersion) return undefined;
    const timer=window.setTimeout(()=>setToastVersion(0),2800);
    return ()=>window.clearTimeout(timer);
  },[toastVersion]);
  const wallet=useQuery({queryKey:['wallet'],queryFn:()=>walletService.getWallet().then(r=>r.data.data.wallet)});
  const memberships=useQuery({queryKey:['memberships'],queryFn:()=>walletService.getMemberships().then(r=>r.data.data.items)});
  const active=(memberships.data || []).filter(item=>['ACTIVE','CANCEL_AT_PERIOD_END'].includes(item.status) && new Date(item.currentPeriodEnd)>new Date());
  const next=active.filter(item=>item.autoRenew && item.status==='ACTIVE').sort((a,b)=>new Date(a.currentPeriodEnd)-new Date(b.currentPeriodEnd))[0];
  const subscriptionSummary=memberships.isPending ? msg('admin.loading') : memberships.isError ? msg('payments.subscriptionsUnavailable') : next ? msg('payments.renews',{date:new Date(next.currentPeriodEnd).toLocaleDateString(getLocale(),{month:'short',day:'numeric'}),coins:Number(next.starsPerPeriod).toLocaleString(getLocale())}) : active.length ? msg('payments.activeSubscriptions',{count:active.length}) : msg('payments.noSubscriptions');
  return <section className="settings-index-group settings-payments"><h2>{msg('settings.payments')}</h2><div>
    <Row title={msg('profile.wallet')} to="/wallet" subtitle={wallet.isPending ? msg('admin.loading') : wallet.isError ? msg('settings.balanceUnavailable') : <span className="settings-wallet-coins"><img src="/brand/goldcoin.png" alt={msg('social.coins')} />{Number(wallet.data.balance || 0).toLocaleString(getLocale())}</span>} />
    <Row title={msg('payments.methods')} subtitle={msg('payments.methodsUnavailable')} onClick={()=>setToastVersion(value=>value+1)} />
    <Row title={msg('admin.subscriptions')} subtitle={subscriptionSummary} onClick={()=>setSubscriptionsOpen(true)} />
  </div>
  {subscriptionsOpen ? <OwnerThingsSheet isOpen initialView="subscriptions" onClose={()=>setSubscriptionsOpen(false)} /> : null}
  {toastVersion ? <div className="settings-payments-toast" role="status">{msg('payments.methodsUnavailable')}</div> : null}
  </section>;
}
