import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiCheck, FiHome, FiTrendingUp } from 'react-icons/fi';
import { useLanguage } from '../../hooks/useLanguage';
import { msg, getLocale, systemMessage } from '../../i18n/runtime';
import { walletService } from '../../services/walletService';
import { createIdempotencyKey } from '../../utils/idempotencyKey';
import FinancialConfirmDialog from './FinancialConfirmDialog';
import './PayoutFlow.css';
import HoldsRefundRules from './HoldsRefundRules';

const money = value => value == null ? '—' : new Intl.NumberFormat(getLocale(), {style:'currency',currency:'USD'}).format(value);

export default function PayoutFlow({ onClose, anchorRef }) {
  useLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [step, setStep] = useState('overview');
  const [selection, setSelection] = useState(null);
  const [bounds, setBounds] = useState({});
  useEffect(() => {
    const sync = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (rect) setBounds({'--payout-left':`${rect.left}px`,'--payout-width':`${rect.width}px`});
    };
    sync();
    window.addEventListener('resize',sync);
    return () => window.removeEventListener('resize',sync);
  },[anchorRef]);
  const key = useRef(null);
  const query = useQuery({queryKey:['wallet'],queryFn:()=>walletService.getWallet().then(r=>r.data.data.wallet),retry:false});
  const wallet = query.data;
  const payout = wallet?.payouts;
  const withdraw = useMutation({
    mutationFn: () => {
      key.current ||= createIdempotencyKey('withdraw');
      return walletService.withdrawIncome(selection.stars,key.current,'standard').then(r=>r.data.data.withdrawal);
    },
    onSuccess: result => {
      client.setQueryData(['wallet'],current=>({...current,
        availableIncomeStars:Math.max(0,current.availableIncomeStars-result.starsAmount),
        availableIncomeUsd:Math.max(0,current.availableIncomeUsd-result.usdAmount),
      }));
      setStep('done');
      client.invalidateQueries({queryKey:['wallet']});
      client.invalidateQueries({queryKey:['wallet-ledger']});
    },
  });
  const automatic = useMutation({
    mutationFn:active=>walletService.setAutomaticPayout(active).then(r=>r.data.data),
    onSuccess:result=>client.setQueryData(['wallet'],current=>({...current,payouts:{...current.payouts,automaticPayout:result.automaticPayout}})),
  });
  const close = () => { if (!withdraw.isPending && !automatic.isPending) onClose(); };
  const canWithdraw = payout?.bankReady && payout?.standard?.enabled
    && wallet.availableIncomeUsd >= wallet.withdrawalMinimumUsd && wallet.availableIncomeStars > 0;
  const confirm = () => {
    setSelection({stars:wallet.availableIncomeStars,usd:wallet.availableIncomeUsd,bankLast4:payout.bankLast4,feeUsd:payout.standard.feeUsd});
    withdraw.reset();
    setStep('confirm');
  };
  return <div className={`payout-flow${step==='holds' ? ' is-holds' : ''}`} style={bounds}><FinancialConfirmDialog open title={step==='overview' ? msg('verification.payouts') : step==='holds' ? msg('verification.holdsRefunds') : ''} onClose={close} presentation="center-sheet">
    {query.isPending && !wallet ? <p role="status">{msg('social.loadingAvailableIncome')}</p> : query.isError && !wallet ? <div role="alert"><p>{msg('social.unableToLoadWithdrawalDetails')}</p><button onClick={()=>query.refetch()} type="button">{msg('discover.tryAgain')}</button></div> : step==='overview' ? <>
      <div className="payout-available"><small>{msg('wallet.availableToWithdraw')}</small><strong>{money(wallet.availableIncomeUsd)}</strong></div>
      <div className="payout-summary-row"><span>{msg('wallet.clearing')}<small>{msg('payout.readyAfterDays',{days:wallet.clearingDays})}</small></span><b>{money(wallet.pendingIncomeUsd)}</b></div>
      <div className="payout-summary-row"><span>{msg('payout.refundsDeducted')}<small>{msg('wallet.thisMonth')}</small></span><b>{payout?.refundsDeductedUsd ? '−' : ''}{money(payout?.refundsDeductedUsd)}</b></div>
      <button className="payout-detail-row" onClick={()=>{close();navigate('/settings/monetization');}} type="button"><FiHome /><span><b>{payout?.bankReady ? `${payout.bankName || msg('payout.bank')} •• ${payout.bankLast4}` : msg('payout.setupBank')}</b><small>{payout?.bankReady ? msg('payout.bankApproved') : msg('payout.bankRequired')}</small></span></button>
      <div className="payout-detail-row"><FiTrendingUp /><span><b>{msg('payout.clearingPeriod')}</b><small>{msg('payout.readyAfterDays',{days:wallet.clearingDays})}</small></span></div>
      <div className="payout-detail-row"><FiCalendar /><span><b>{msg('payout.automatic')}</b><small>{msg(payout?.automaticPayout ? 'payout.preferenceOn' : 'payout.preferenceOff')}</small></span><button className={`payout-switch ${payout?.automaticPayout ? 'is-on' : ''}`} role="switch" aria-label={msg('payout.automatic')} aria-checked={Boolean(payout?.automaticPayout)} disabled={!payout?.bankReady || automatic.isPending} onClick={()=>automatic.mutate(!payout.automaticPayout)} type="button"><i /></button></div>
      <button className="payout-primary" disabled={!canWithdraw} onClick={confirm} type="button">{msg('payout.withdrawNow')} · {money(wallet.availableIncomeUsd)}</button>
      <p className="payout-footnote">{msg('social.minimum')} {money(wallet.withdrawalMinimumUsd)}</p>
      <button className="payout-help" onClick={()=>setStep('holds')} type="button">{msg('verification.holdsRefunds')} ›</button>
      {automatic.isError ? <p role="alert">{systemMessage(automatic.error.response?.data?.message || msg('payout.preferenceError'))}</p> : null}
    </> : step==='confirm' ? <>
      <div className="payout-confirm-total"><small>{msg('payout.withdrawNow')}</small><strong>{money(selection.usd)}</strong><small>{msg('payout.toBank',{last4:selection.bankLast4})}</small></div>
      <div className="payout-method is-selected"><span><b>{msg('payout.standard')}</b><small>{msg('payout.afterProcessing')}</small></span><b>{selection.feeUsd===0 ? msg('profile.free') : money(selection.feeUsd)}</b><i /></div>
      <div className="payout-method is-disabled" aria-disabled="true"><span><b>{msg('payout.instant')}</b><small>{msg('payout.instantUnavailable')}</small></span><i /></div>
      <button className="payout-primary" disabled={withdraw.isPending} onClick={()=>withdraw.mutate()} type="button">{withdraw.isPending ? msg('social.submittingWithdrawal') : `${msg('social.withdraw')} ${money(selection.usd-selection.feeUsd)}`}</button>
      {withdraw.isError ? <p className="payout-error" role="alert">{systemMessage(withdraw.error.response?.data?.message || msg('social.withdrawalCouldNotBeSubmitted'))}</p> : null}
      <button className="payout-cancel" disabled={withdraw.isPending} onClick={()=>setStep('overview')} type="button">{msg('admin.cancel')}</button>
    </> : step==='done' ? <div className="payout-done"><span><FiCheck /></span><h2>{msg('payout.submitted')}</h2><p>{msg('payout.processingConfirmation')}</p><button className="payout-primary" onClick={close} type="button">{msg('comments.done')}</button></div> : <>
      <HoldsRefundRules clearingDays={wallet.clearingDays} />
    </>}
  </FinancialConfirmDialog></div>;
}
