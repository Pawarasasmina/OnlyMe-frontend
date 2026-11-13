import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { FiShare } from "react-icons/fi";
import { useState } from "react";
import ShareSheet from "../share/ShareSheet";
import { ticketImage, ticketStoryDraft } from "../../utils/memberTicket";
import "../profile/MemberTicket.css";
import "./TicketMotion.css";

export default function OnboardingTicket({ city = "", memberNumber, joinedAt, name, onContinue, busy = false, overlay = false }) {
  __useUiLanguage();
  const [sharing, setSharing] = useState(false);
  const [image, setImage] = useState(null);
  const validNumber = Number.isSafeInteger(Number(memberNumber)) && Number(memberNumber) > 0;
  const number = validNumber ? Number(memberNumber).toLocaleString(__uiLocale()) : "";
  const date = joinedAt ? new Date(joinedAt) : null;
  const joined = date && Number.isFinite(date.getTime()) ? date.toLocaleDateString(__uiLocale(), { day: "numeric", month: "long", year: "numeric" }) : "";
  const place = city || "";

  const ticket = { city: place, date: joined, label: validNumber ? `№${number}` : "—", number: Number(memberNumber) };
  const author = { name };
  const sharePayload = {
    author,
    contentType: "ticket",
    imageUrl: image,
    route: "/profile",
    ticket,
    title: __msg("ticket.shareTitle", { number: ticket.label }),
    previewText: place ? __msg("profile.oneOfTheFirstIn", { value0: place }) : __msg("profile.oneOfTheFirstOnSeen"),
    get storyDraft() { return ticketStoryDraft(ticket, author); },
  };

  return <>
    <main className={`onboarding-ticket-screen ${overlay ? "is-overlay absolute inset-0 z-[150] min-h-full bg-[#06101b]/95 backdrop-blur-[5px]" : "relative h-[100dvh] w-full bg-[#05070a]"} overflow-y-auto overflow-x-hidden text-white`} role={overlay ? "dialog" : undefined} aria-modal={overlay ? "true" : undefined} aria-label={overlay ? __msg("system.OnboardingTicket.4b9a49b725") : undefined}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[78%] bg-[radial-gradient(ellipse_at_50%_31%,rgba(45,79,124,.34),transparent_58%)]" />
      <section className={`onboarding-ticket-content relative mx-auto flex ${overlay ? "min-h-full" : "min-h-[100dvh]"} w-full max-w-[458px] flex-col items-center justify-center px-6 py-[max(24px,env(safe-area-inset-top))]`}>
        <p className="member-ticket-heading">{__msg("profile.yourTicket")}</p>

        <article className="member-ticket-card onboarding-member-ticket ticket-motion-card">
          <header><b><em>@</em>{__msg("branding.seen")}</b><span>{place}</span></header>
          <div className="member-ticket-identity">
            <span>{__msg("fanWeb.member")}</span>
            <strong>{ticket.label}</strong>
            {joined ? <time>{joined}</time> : null}
          </div>
          <footer>{place ? __msg("profile.oneOfTheFirstIn", { value0: place }) : __msg("profile.oneOfTheFirstOnSeen")}</footer>
        </article>

        <button className="member-ticket-share onboarding-ticket-action" disabled={!validNumber} onClick={() => { setImage(ticketImage(ticket)); setSharing(true); }} type="button">
          <FiShare /> {__msg("admin.share")}
        </button>
        <button className="member-ticket-close" disabled={busy} onClick={onContinue} type="button">
          {busy ? __msg("system.OnboardingTicket.5e83c4d356") : __msg("activity.close")}
        </button>
      </section>
    </main>
    <ShareSheet isOpen={sharing} onClose={() => setSharing(false)} payload={sharePayload} variant="ticket" />
  </>;
}
