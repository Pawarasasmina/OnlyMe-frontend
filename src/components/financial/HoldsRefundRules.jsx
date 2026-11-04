import { FiCalendar, FiCheck, FiCreditCard, FiGift, FiLock, FiMessageCircle, FiShield } from 'react-icons/fi';
import { msg } from '../../i18n/runtime';
import { useLanguage } from '../../hooks/useLanguage';
import './HoldsRefundRules.css';

const rows = [
  [FiCheck, 'credited'],
  [FiCalendar, 'clearing'],
  [FiShield, 'refund'],
  [FiLock, 'reserves'],
  [FiMessageCircle, 'direct'],
  [FiGift, 'gifts'],
  [FiCreditCard, 'firstPayout'],
  [FiGift, 'bonus'],
  [FiShield, 'verification'],
  [FiShield, 'fairPlay'],
];

export default function HoldsRefundRules({ clearingDays }) {
  useLanguage();
  return <div className="holds-refund-rules">{rows.map(([Icon, key]) => <section className="holds-refund-rule" key={key}>
    <span aria-hidden="true"><Icon /></span>
    <div><h3>{msg(`holds.${key}.title`, { days: clearingDays })}</h3><p>{msg(`holds.${key}.body`, { days: clearingDays })}</p></div>
  </section>)}</div>;
}
