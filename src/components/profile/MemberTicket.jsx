import { useState } from "react";
import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { useAuth } from "../../hooks/useAuth";
import { memberTicketData, showMemberNumber } from "../../utils/memberTicket";
import MemberTicketViewer from "./MemberTicketViewer";
import "./MemberTicket.css";

export default function MemberTicket({ profile }) {
  useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ticket = memberTicketData(profile, user || {});
  if (!ticket?.badgeEligible || !showMemberNumber({ ...user, ...profile })) return null;
  const author = { id: user?.id || user?._id, name: user?.name, username: profile.username || user?.username, avatarUrl: user?.avatar };
  return <>
    <button aria-label={msg("profile.openYourMemberTicket", { value0: ticket.label })} className="member-ticket-badge" onClick={() => setOpen(true)} type="button">{ticket.label}</button>
    <MemberTicketViewer ticket={ticket} author={author} isOpen={open} onClose={() => setOpen(false)} />
  </>;
}
