import { useId } from "react";
import "./AiThinking.css";

export default function AiThinking({ label }) {
  const gradient = useId();
  return <div className="ai-thinking" role="status" aria-live="polite">
    <span className="ai-thinking-halo" aria-hidden="true" />
    <svg className="ai-thinking-eye" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><defs><linearGradient id={gradient} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stopColor="#f2f8ff" /><stop offset=".45" stopColor="#9ccbff" /><stop offset="1" stopColor="#4f7fc4" /></linearGradient></defs><circle cx="12" cy="12" r="8.4" stroke={`url(#${gradient})`} strokeWidth="2.3" /><circle cx="12" cy="12" r="2.6" fill={`url(#${gradient})`} /></svg>
    <span className="ai-thinking-label">{label}</span>
    <span className="ai-thinking-lines" aria-hidden="true"><i /><i /><i /></span>
  </div>;
}
