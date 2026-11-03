/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import "./InvitationMessageCard.css";

export default function InvitationMessageCard({ content, mine, onOpen }) {
  __useUiLanguage();
  const author = content.author || {};
  const firstName = (author.name || __msg("messages.yourFriend")).split(/\s+/)[0];
  const title = content.title || __msg("messages.value0InvitedYouToSeen", { value0: firstName });
  const domain = new URL(import.meta.env.VITE_APP_ORIGIN || import.meta.env.VITE_PUBLIC_APP_URL || "https://atseen.com").hostname;
  const Card = mine ? "div" : "button";
  const interaction = mine ? {} : { "aria-label": __msg("messages.openInvitationValue0", { value0: title }), onClick: () => onOpen(content), type: "button" };
  return <Card {...interaction} className={`invitation-message-card ${mine ? "is-outgoing" : "is-incoming"}`}>
    <div className="invitation-message-hero"><FanAvatar name={author.name || firstName} size="h-16 w-16" src={author.avatarUrl || author.avatar || content.imageUrl} /></div>
    <div className="invitation-message-copy"><b>{title}</b><p>{content.previewText || __msg("messages.realStoriesFromRealPeopleJoinMeThere")}</p><small><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12C5.3 7.8 18.7 7.8 22 12 18.7 16.2 5.3 16.2 2 12Z" /><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" /></svg>{domain}</small></div>
  </Card>;
}
