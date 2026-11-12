import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg, optionLabel } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiImage, FiX } from "react-icons/fi";
import "./SupportPage.css";

const helpSections = [
  __uiTuple([{ __uiMessage: "options.Getting_started" }, [
    __uiTuple([{ __uiMessage: "options.What_is_seen" }, { __uiMessage: "system.copy.8860cf8e9eee" }]),
    __uiTuple([{ __uiMessage: "options.Seen_Story_World" }, { __uiMessage: "system.copy.be1ba36999ea" }]),
    __uiTuple([{ __uiMessage: "discover.discover" }, { __uiMessage: "settings.discoverShowsPeopleWorthSeeingNextFriendsFirst" }]),
  ]]),
  __uiTuple([{ __uiMessage: "options.Coins_money" }, [
    __uiTuple([{ __uiMessage: "options.How_money_works" }, { __uiMessage: "system.copy.6ecdbecd0d33" }]),
    __uiTuple([{ __uiMessage: "verification.bonusCoins" }, { __uiMessage: "options.Bigger_packs_include_bonus_coins_They_sit_in_a_separate_balance_are_spent_first_and_can_never_be_withdrawn" }]),
    __uiTuple([{ __uiMessage: "verification.payouts" }, { __uiMessage: "settings.yourEarningsLiveInWalletInDollarsWithdraw_f6ab49" }]),
  ]]),
  __uiTuple([{ __uiMessage: "profile.yourWorld" }, [__uiTuple(["", { __uiMessage: "system.copy.a4d06a343b23" }])]]),
  __uiTuple([{ __uiMessage: "options.Safety" }, [__uiTuple(["", { __uiMessage: "options.Block_report_mute_and_unsend_live_behind_on_every_post_profile_and_message_Views_are_always_silent_Saves_are_anonymous_You_choose_who_can_me" }])]]),
  __uiTuple([{ __uiMessage: "layouts.account" }, [__uiTuple(["", { __uiMessage: "system.copy.7e64078f80d7" }])]]),
];

const termsSections = [
  __uiTuple([{ __uiMessage: "options.Terms_of_service" }, [
    __uiTuple([{ __uiMessage: "options.The_deal" }, { __uiMessage: "system.copy.e41d00f69ad2" }]),
    __uiTuple([{ __uiMessage: "options.Content_rules" }, { __uiMessage: "system.copy.a8fa9d3bc410" }]),
    __uiTuple([{ __uiMessage: "options.Coins_subscriptions" }, { __uiMessage: "options.Coins_are_a_virtual_item_not_money_non_refundable_non_transferable_never_convertible_back_to_currency_World_subscriptions_renew_monthly_and_" }]),
    __uiTuple([{ __uiMessage: "options.Age" }, { __uiMessage: "settings.seenIsForPeople16AndOlder" }]),
  ]]),
  __uiTuple([{ __uiMessage: "settings.privacy" }, [
    __uiTuple([{ __uiMessage: "options.What_we_collect" }, { __uiMessage: "options.Your_profile_your_content_and_how_you_use_the_app_to_make_Discover_honest_and_payments_work_That_s_it" }]),
    __uiTuple([{ __uiMessage: "options.What_we_never_do" }, { __uiMessage: "options.We_don_t_sell_your_data_Views_are_silent_and_never_shown_to_others_Saves_are_anonymous_Your_messages_are_yours_we_read_them_only_on_your_rep" }]),
    __uiTuple([{ __uiMessage: "options.Your_controls" }, { __uiMessage: "options.Who_can_message_you_muted_blocked_public_supporters_on_off_delete_account_all_in_Settings_all_instant" }]),
    __uiTuple([{ __uiMessage: "options.Where_we_stand" }, { __uiMessage: "options.Atseen_operates_under_European_Union_law_GDPR_applies_to_everyone_everywhere_one_standard_the_strictest_one" }]),
  ]]),
];

function PageHeader({ title }) {
  __useUiLanguage();
  const navigate = useNavigate();
  return <header className="support-page-header"><button aria-label={__msg("settings.backToSettings")} onClick={() => navigate("/settings")} type="button"><span aria-hidden="true" data-ui-directional="true">‹</span></button><h1>{title}</h1></header>;
}

function TextSections({ sections }) {
  __useUiLanguage();
  return <div className="support-text-sections">{sections.map(([heading, items]) => <section key={heading}><h2>{heading}</h2><div>{items.map(([title, copy]) => <article key={title}>{title ? <h3>{title}</h3> : null}<p>{copy}</p></article>)}</div></section>)}</div>;
}

function ReportPage() {
  __useUiLanguage();
  const inputRef = useRef(null);
  const [category, setCategory] = useState("");
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
  return <>
    <PageHeader title={__msg("settings.reportAProblem")} />
    <form className="support-report-form" onSubmit={send}>
      <p className="support-report-intro">{__msg("settings.tellUsWhatBrokeOrWhatFeelsWrongA")}</p>
      <div className="support-report-categories">{categories.map((item) => <button aria-pressed={category === item} key={item} onClick={() => setCategory(item)} type="button">{optionLabel(item)}</button>)}</div>
      <textarea aria-label={__msg("settings.whatHappened")} maxLength={2000} onChange={(event) => { setDetails(event.target.value); setSent(false); }} placeholder={__msg("settings.whatHappened")} required rows={5} value={details} />
      <input accept="image/*" hidden onChange={(event) => setScreenshot(event.target.files?.[0] || null)} ref={inputRef} type="file" />
      <div className="support-report-attachment"><button onClick={() => inputRef.current?.click()} type="button"><FiImage />{__msg("settings.attachAScreenshot")}</button>{screenshot ? <span className="support-report-filename"><span dir="auto">{screenshot.name}</span><button aria-label={__msg("settings.removeScreenshot")} onClick={() => setScreenshot(null)} type="button"><FiX /></button></span> : null}</div>
      <button className="support-report-send" type="submit">{__msg("fanWeb.send")}</button>
      {sent ? <p className="support-report-sent" role="status">{__msg("settings.yourEmailAppHasBeenOpenedWithTheReport")}</p> : null}
      <p className="support-report-note">{__msg("settings.badContentReportItFasterViaRightOnThe")}</p>
    </form>
  </>;
}

function AboutPage() {
  __useUiLanguage();
  return <><PageHeader prototype title={__msg("settings.about")} /><div className="support-about-intro"><div className="support-about-logo"><span className="text-atseen-blue">@</span>{__msg("branding.seen")}</div><p className="mt-1 text-xs text-white/60">{__msg("settings.beSeenGetPaid")}</p></div><TextSections sections={[["What we believe", [["", "Social media made everyone watch a few. We think it should pay the many. Every person sees something worth showing — a morning, a city, a craft, a recovery, a first try. @seen turns being seen into income: not for influencers, for people."]]],["How it works", [["", "You post Seens — short chaptered pieces of real life. Free, always. When people want more of your world, they subscribe to it: one world per creator, one honest monthly price. Fans spend coins; creators earn dollars, instantly and automatically. @seen takes a share and never charges creators a fee to exist."]]],["How we build", [["", "Small team, big taste. Thin lines, quiet toasts, no dark patterns, no paywalled analytics, notifications that respect you, views that stay silent. Six languages from day one: English, العربية, Русский, Español, Français, Português. Built in Europe, GDPR-level privacy for everyone."]]]]} /><footer className="support-about-contact"><a href="mailto:hello@atseen.com">{__msg("settings.helloAtseenCom")}</a><span className="ms-2 text-xs text-white/40">{__msg("settings.atseenCom")}</span></footer></>;
}

export default function SupportPage() {
  __useUiLanguage();
  const { section } = useParams();
  return <main className={`support-help-page${section === "about" ? " support-about-page" : ""}${section === "report" ? " support-report-page" : ""}`}>{section === "report" ? <ReportPage /> : section === "about" ? <AboutPage /> : <><PageHeader title={section === "terms" ? __msg("settings.termsPrivacy") : __msg("settings.helpCenter")} /><TextSections sections={section === "terms" ? termsSections : helpSections} /><a className="support-contact" href="mailto:hello@atseen.com">{__msg("settings.helloAtseenCom")}</a></>}</main>;
}
