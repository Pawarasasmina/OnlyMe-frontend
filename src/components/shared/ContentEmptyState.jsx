import { Link } from "react-router-dom";

function EmptyIllustration({ variant }) {
  return <svg aria-hidden="true" className="content-empty-illustration" viewBox="0 0 320 220">
    <defs><linearGradient id={`empty-gradient-${variant}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#6FA9E8" /><stop offset="1" stopColor="#D6EAFF" /></linearGradient></defs>
    <path d="M58 128c0-38 27-70 64-77 20-29 67-31 89 0 30 7 52 34 52 67 0 43-35 78-78 78H131c-40 0-73-30-73-68Z" fill="rgba(111,169,232,.10)" />
    <circle cx="118" cy="91" r="31" fill="#F6B09D" stroke="#0A0C0F" strokeWidth="6" /><circle cx="200" cy="91" r="31" fill="#C88A82" stroke="#0A0C0F" strokeWidth="6" />
    <path d="M82 164c5-38 25-57 50-57 17 0 27 8 29 23 4-15 15-23 31-23 27 0 47 20 50 57" fill={`url(#empty-gradient-${variant})`} stroke="#0A0C0F" strokeLinecap="round" strokeWidth="7" />
    <path d="M132 105c8 16 18 25 29 25s21-9 31-25M154 143l7 8 8-8" fill="none" stroke="#0A0C0F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
    <g fill="#9CCBFF"><circle cx="55" cy="67" r="5" /><circle cx="267" cy="67" r="5" /><circle cx="76" cy="40" r="3" /><circle cx="246" cy="39" r="3" /></g>
  </svg>;
}

function EmptyAction({ action, secondary = false }) {
  if (!action?.label) return null;
  const className = secondary ? "content-empty-secondary" : "content-empty-primary";
  return action.to ? <Link className={className} to={action.to}>{action.label}</Link> : <button className={className} onClick={action.onClick} type="button">{action.label}</button>;
}

export default function ContentEmptyState({ compact = false, message, primaryAction, secondaryAction, title, variant = "content" }) {
  return <section aria-live="polite" className={`content-empty-state is-${variant}${compact ? " is-compact" : ""}`}>
    <EmptyIllustration variant={variant} />
    <h2>{title}</h2><p>{message}</p>
    <div className="content-empty-actions"><EmptyAction action={primaryAction} /><EmptyAction action={secondaryAction} secondary /></div>
  </section>;
}
