import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiChevronLeft, FiImage, FiX } from "react-icons/fi";
import "./SupportPage.css";

const helpSections = [
  ["Getting started", [
    ["What is @seen?", "@seen is a place to show what you see — and get paid for it. A Seen is a short post of a real experience: a morning ritual, a trip, a routine, told in chapters."],
    ["Seen · Story · World", "A Seen is free for everyone and lives in the Seen feed. A Story lives on your avatar for 24 hours. Your World is the one paid space every creator gets — fans subscribe monthly to step inside."],
    __uiTuple(["Discover", { __uiMessage: "settings.discoverShowsPeopleWorthSeeingNextFriendsFirst" }]),
  ]],
  ["Coins & money", [
    ["How money works", "Fans buy coins and spend them on gifts, Worlds, support and Direct Access. The moment coins are spent on a creator, the creator receives real dollars automatically. Wallet shows the current conversion and available earnings. Coins never convert back to money: one direction only. Payouts go to your approved bank after the clearing period."],
    ["Bonus coins", "Bigger packs include bonus coins. They sit in a separate balance, are spent first and can never be withdrawn."],
    ["Payouts", "Your earnings live in Wallet in dollars. Withdraw cleared earnings to your approved bank when you reach the minimum shown in Wallet. Bank transfers follow once your request is processed. Or convert available creator income to coins to support others."],
  ]],
  ["Your World", [["", "One creator — one world. A monthly subscription opens everything inside: chapters, private stories, closeness. Buying a single month works too — it simply opens the world for that month."]]],
  ["Safety", [["", "Block, report, mute and unsend live behind ••• on every post, profile and message. Views are always silent. Saves are anonymous. You choose who can message you in Settings. Muted and blocked lists are yours to manage anytime."]]],
  ["Account", [["", "@seen speaks eight languages: English, العربية, Русский, Español, Français, Português, Українська, Deutsch. Creator verification is free. Deleting your account removes your content. Coins are non-refundable."]]],
];

const termsSections = [
  ["Terms of service", [
    ["The deal", "@seen (Atseen) lets you publish what you see and earn from people who value it. You own your content. By posting you give @seen a licence to show it inside the app — nothing more."],
    ["Content rules", "@seen is a safe-for-work platform. No nudity, no violence, no harassment, no stolen content. Real experiences, real you. Repeat violations end the account."],
    ["Coins & subscriptions", "Coins are a virtual item, not money: non-refundable, non-transferable, never convertible back to currency. World subscriptions renew monthly and cancel anytime — access stays until the paid month ends. Creator payouts: from $20, 3–5 business days."],
    __uiTuple(["Age", { __uiMessage: "settings.seenIsForPeople16AndOlder" }]),
  ]],
  ["Privacy", [
    ["What we collect", "Your profile, your content, and how you use the app — to make Discover honest and payments work. That’s it."],
    ["What we never do", "We don’t sell your data. Views are silent and never shown to others. Saves are anonymous. Your messages are yours — we read them only on your report."],
    ["Your controls", "Who can message you, muted, blocked, public supporters on/off, delete account — all in Settings, all instant."],
    ["Where we stand", "Atseen operates under European Union law. GDPR applies to everyone, everywhere — one standard, the strictest one."],
  ]],
];

function PageHeader({ title, prototype = false }) {
  __useUiLanguage();
  const navigate = useNavigate();
  return <header className="flex items-center gap-3"><button aria-label={__msg("settings.backToSettings")} className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07]" onClick={() => navigate("/settings")} type="button">{prototype ? <FiChevronLeft data-ui-directional="true" /> : <FiArrowLeft data-ui-directional="true" />}</button><h1 className="text-base font-black">{title}</h1></header>;
}

function TextSections({ sections }) {
  __useUiLanguage();
  return <div className="mt-8 space-y-7">{sections.map(([heading, items]) => <section key={heading}><h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{heading}</h2><div className="space-y-4">{items.map(([title, copy]) => <article key={title}>{title ? <h3 className="text-sm font-black text-white">{title}</h3> : null}<p className="mt-1 text-xs leading-5 text-white/60">{copy}</p></article>)}</div></section>)}</div>;
}

function ReportPage() {
  __useUiLanguage();
  const inputRef = useRef(null);
  const [category, setCategory] = useState("Bug");
  const [details, setDetails] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [sent, setSent] = useState(false);
  const categories = ["Bug", "Payments", "Safety", "Account", "Idea"];
  const send = (event) => {
    event.preventDefault();
    if (!details.trim()) return;
    const subject = encodeURIComponent(__msg("settings.seenProblemReportValue0", { value0: category }));
    const body = encodeURIComponent(`${details.trim()}${screenshot ? __msg("settings.screenshotSelectedValue0", { value0: screenshot.name }) : ""}`);
    window.location.href = `mailto:hello@atseen.com?subject=${subject}&body=${body}`;
    setSent(true);
  };
  return <><PageHeader title={__msg("settings.reportAProblem")} /><form className="mt-8" onSubmit={send}><p className="text-sm leading-5 text-white/65">{__msg("settings.tellUsWhatBrokeOrWhatFeelsWrongA")}</p><div className="mt-4 flex flex-wrap gap-2">{categories.map((item) => <button className={`rounded-full border px-4 py-2 text-xs font-bold ${category === item ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface text-white"}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div><textarea aria-label={__msg("settings.whatHappened")} className="mt-3 min-h-32 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-atseen-blue" maxLength={2000} onChange={(event) => { setDetails(event.target.value); setSent(false); }} placeholder={__msg("settings.whatHappened")} required value={details} /><input accept="image/*" className="hidden" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} ref={inputRef} type="file" /><div className="mt-3 flex items-center gap-3"><button className="flex items-center gap-2 text-xs text-white/50 hover:text-white" onClick={() => inputRef.current?.click()} type="button"><FiImage /> {__msg("settings.attachAScreenshot")}</button>{screenshot ? <span className="flex min-w-0 items-center gap-1 text-xs text-atseen-blue"><span dir="auto" className="max-w-40 truncate">{screenshot.name}</span><button aria-label={__msg("settings.removeScreenshot")} onClick={() => setScreenshot(null)} type="button"><FiX /></button></span> : null}</div><button className="mt-5 w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black shadow-[0_8px_24px_rgba(143,196,255,.22)] disabled:opacity-40" disabled={!details.trim()} type="submit">{__msg("fanWeb.send")}</button>{sent ? <p className="mt-3 text-center text-xs text-atseen-blue">{__msg("settings.yourEmailAppHasBeenOpenedWithTheReport")}</p> : null}<p className="mt-3 text-center text-[10px] text-white/35">{__msg("settings.badContentReportItFasterViaRightOnThe")}</p></form></>;
}

function AboutPage() {
  __useUiLanguage();
  return <><PageHeader prototype title={__msg("settings.about")} /><div className="support-about-intro"><div className="support-about-logo"><span className="text-atseen-blue">@</span>{__msg("branding.seen")}</div><p className="mt-1 text-xs text-white/60">{__msg("settings.beSeenGetPaid")}</p></div><TextSections sections={[["What we believe", [["", "Social media made everyone watch a few. We think it should pay the many. Every person sees something worth showing — a morning, a city, a craft, a recovery, a first try. @seen turns being seen into income: not for influencers, for people."]]],["How it works", [["", "You post Seens — short chaptered pieces of real life. Free, always. When people want more of your world, they subscribe to it: one world per creator, one honest monthly price. Fans spend coins; creators earn dollars, instantly and automatically. @seen takes a share and never charges creators a fee to exist."]]],["How we build", [["", "Small team, big taste. Thin lines, quiet toasts, no dark patterns, no paywalled analytics, notifications that respect you, views that stay silent. Six languages from day one: English, العربية, Русский, Español, Français, Português. Built in Europe, GDPR-level privacy for everyone."]]]]} /><footer className="support-about-contact"><a href="mailto:hello@atseen.com">{__msg("settings.helloAtseenCom")}</a><span className="ms-2 text-xs text-white/40">{__msg("settings.atseenCom")}</span></footer></>;
}

export default function SupportPage() {
  __useUiLanguage();
  const { section } = useParams();
  return <main className={`mx-auto w-full max-w-xl px-4 pb-14 pt-5${section !== "report" ? ` support-help-page${section === "about" ? " support-about-page" : ""}` : ""}`}>{section === "report" ? <ReportPage /> : section === "about" ? <AboutPage /> : <><PageHeader prototype title={section === "terms" ? __msg("settings.termsPrivacy") : __msg("settings.helpCenter")} /><TextSections sections={section === "terms" ? termsSections : helpSections} /><a className="mt-7 inline-block text-xs font-bold text-atseen-blue" href="mailto:hello@atseen.com">{__msg("settings.helloAtseenCom")}</a></>}</main>;
}
