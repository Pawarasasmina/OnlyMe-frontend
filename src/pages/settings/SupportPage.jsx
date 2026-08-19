import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiImage, FiX } from "react-icons/fi";

const helpSections = [
  ["Getting started", [
    ["What is @seen?", "@seen is a place to show what you see — and get paid for it. A Seen is a short post of a real experience: a morning ritual, a trip, a routine, told in chapters."],
    ["Seen · Story · World", "A Seen is free for everyone and lives in Scenes. A Story lives on your avatar for 24 hours. Your World ✨ is the one paid space every creator gets — fans subscribe monthly to step inside."],
    ["Discover", "Discover shows people worth seeing next — friends first, then people picked for real reasons. We always tell you why. You can reset what Discover learned in Settings → Recommendations."],
  ]],
  ["Coins & money", [
    ["How money works", "Fans buy coins (✦10 = $1) and spend them on support, Worlds and Direct Access. The moment coins are spent on a creator, the creator receives real dollars — automatically. Coins never convert back to money. One direction only. That keeps @seen clean and legal everywhere."],
    ["Bonus coins", "Bigger packs include bonus coins. They sit in a separate balance, are spent first and can never be withdrawn."],
    ["Payouts", "Your earnings live in Wallet in dollars. Withdraw from $20 to your bank in 3–5 business days, transfer fees on us. Or convert your dollars to coins to support others."],
  ]],
  ["Your World", [["One creator — one World", "A monthly subscription opens everything inside: chapters, private stories, closeness. Buying a single month works too — it simply opens the world for that month."]]],
  ["Safety", [["Your safety controls", "Block, report, mute and unsend live behind ••• on every post, profile and message. Views are always silent. Saves are anonymous. You choose who can message you in Settings. Muted and blocked lists are yours to manage anytime."]]],
  ["Account", [["Your account", "@seen speaks six languages: English, العربية, Русский, Español, Français, Português. Creator verification is free. Deleting your account removes your content. Coins are non-refundable."]]],
];

const termsSections = [
  ["Terms of service", [
    ["The deal", "@seen (Atseen) lets you publish what you see and earn from people who value it. You own your content. By posting you give @seen a licence to show it inside the app — nothing more."],
    ["Content rules", "@seen is a safe-for-work platform. No nudity, no violence, no harassment, no stolen content. Real experiences, real you. Repeat violations end the account."],
    ["Coins & subscriptions", "Coins are a virtual item, not money: non-refundable, non-transferable, never convertible back to currency. World subscriptions renew monthly and cancel anytime — access stays until the paid month ends. Creator payouts: from $20, 3–5 business days."],
    ["Age", "@seen is for people 16 and older."],
  ]],
  ["Privacy", [
    ["What we collect", "Your profile, your content, and how you use the app — to make Discover honest and payments work. That’s it."],
    ["What we never do", "We don’t sell your data. Views are silent and never shown to others. Saves are anonymous. Your messages are yours — we read them only on your report."],
    ["Your controls", "Who can message you, muted, blocked, public supporters on/off, delete account — all in Settings, all instant."],
    ["Where we stand", "Atseen operates under European Union law. GDPR applies to everyone, everywhere — one standard, the strictest one."],
  ]],
];

function PageHeader({ title }) {
  const navigate = useNavigate();
  return <header className="flex items-center gap-3"><button aria-label="Back to settings" className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.07]" onClick={() => navigate("/settings")} type="button"><FiArrowLeft /></button><h1 className="text-base font-black">{title}</h1></header>;
}

function TextSections({ sections }) {
  return <div className="mt-8 space-y-7">{sections.map(([heading, items]) => <section key={heading}><h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{heading}</h2><div className="space-y-4">{items.map(([title, copy]) => <article key={title}><h3 className="text-sm font-black text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-white/60">{copy}</p></article>)}</div></section>)}</div>;
}

function ReportPage() {
  const inputRef = useRef(null);
  const [category, setCategory] = useState("Bug");
  const [details, setDetails] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [sent, setSent] = useState(false);
  const categories = ["Bug", "Payments", "Safety", "Account", "Idea"];
  const send = (event) => {
    event.preventDefault();
    if (!details.trim()) return;
    const subject = encodeURIComponent(`@seen problem report: ${category}`);
    const body = encodeURIComponent(`${details.trim()}${screenshot ? `\n\nScreenshot selected: ${screenshot.name}` : ""}`);
    window.location.href = `mailto:hello@atseen.com?subject=${subject}&body=${body}`;
    setSent(true);
  };
  return <><PageHeader title="Report a problem" /><form className="mt-8" onSubmit={send}><p className="text-sm leading-5 text-white/65">Tell us what broke or what feels wrong — a human reads every report.</p><div className="mt-4 flex flex-wrap gap-2">{categories.map((item) => <button className={`rounded-full border px-4 py-2 text-xs font-bold ${category === item ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface text-white"}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}</div><textarea aria-label="What happened?" className="mt-3 min-h-32 w-full resize-y rounded-xl border border-atseen-line bg-atseen-surface p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-atseen-blue" maxLength={2000} onChange={(event) => { setDetails(event.target.value); setSent(false); }} placeholder="What happened?" required value={details} /><input accept="image/*" className="hidden" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} ref={inputRef} type="file" /><div className="mt-3 flex items-center gap-3"><button className="flex items-center gap-2 text-xs text-white/50 hover:text-white" onClick={() => inputRef.current?.click()} type="button"><FiImage /> Attach a screenshot</button>{screenshot ? <span className="flex min-w-0 items-center gap-1 text-xs text-atseen-blue"><span className="max-w-40 truncate">{screenshot.name}</span><button aria-label="Remove screenshot" onClick={() => setScreenshot(null)} type="button"><FiX /></button></span> : null}</div><button className="mt-5 w-full rounded-xl bg-atseen-blue py-3.5 text-sm font-black text-black shadow-[0_8px_24px_rgba(143,196,255,.22)] disabled:opacity-40" disabled={!details.trim()} type="submit">Send</button>{sent ? <p className="mt-3 text-center text-xs text-atseen-blue">Your email app has been opened with the report ready to send.</p> : null}<p className="mt-3 text-center text-[10px] text-white/35">Bad content? Report it faster via ••• right on the post.</p></form></>;
}

function AboutPage() {
  return <><PageHeader title="About" /><div className="mt-8"><div className="text-2xl font-black"><span className="text-atseen-blue">@</span>seen</div><p className="mt-1 text-xs text-white/60">Be seen. Get paid.</p></div><TextSections sections={[["What we believe", [["", "Social media made everyone watch a few. We think it should pay the many. Every person sees something worth showing — a morning, a city, a craft, a recovery, a first try. @seen turns being seen into income: not for influencers, for people."]]],["How it works", [["", "You post Seens — short chaptered pieces of real life. Free, always. When people want more of your world, they subscribe to it: one World per creator, one honest monthly price. Fans spend coins; creators earn dollars, instantly and automatically. @seen takes a share and never charges creators a fee to exist."]]],["How we build", [["", "Small team, big taste. Thin lines, quiet toasts, no dark patterns, no paywalled analytics, notifications that respect you, views that stay silent. Six languages from day one. Built in Europe, GDPR-level privacy for everyone."]]]]} /><a className="mt-6 inline-block text-xs font-bold text-atseen-blue" href="mailto:hello@atseen.com">hello@atseen.com</a><span className="ml-2 text-xs text-white/40">· atseen.com</span></>;
}

export default function SupportPage() {
  const { section } = useParams();
  return <main className="mx-auto w-full max-w-xl px-4 pb-14 pt-5">{section === "report" ? <ReportPage /> : section === "about" ? <AboutPage /> : <><PageHeader title={section === "terms" ? "Terms & Privacy" : "Help Center"} /><TextSections sections={section === "terms" ? termsSections : helpSections} /><a className="mt-7 inline-block text-xs font-bold text-atseen-blue" href="mailto:hello@atseen.com">hello@atseen.com</a></>}</main>;
}
