import { msg } from "../../i18n/runtime.js";
import { getLocale } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import "./TicketShare.css";

export default function TicketChatCard({ content }) {
  useLanguage();
  const ticket = content.ticket || {};
  const label = ticket.label || `№${Number(ticket.number).toLocaleString(getLocale())}`;
  const date = ticket.date ?? (ticket.joinedAt ? new Date(ticket.joinedAt).toLocaleDateString(getLocale(), { day: "numeric", month: "long", year: "numeric" }) : "");
  return <div className="ticket-chat-card">
    <div className="ticket-chat-art">
      <div className="ticket-chat-paper">
        <span>{msg("fanWeb.member")}</span>
        <strong>{label}</strong>
        {date ? <time>{date}</time> : null}
      </div>
    </div>
    <div className="ticket-chat-copy">
      <strong>{content.title}</strong>
      <p>{content.previewText}</p>
      <small><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12z"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/></svg>atseen.com</small>
    </div>
  </div>;
}
