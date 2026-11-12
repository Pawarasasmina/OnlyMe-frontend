import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { FiShare } from "react-icons/fi";

export default function OnboardingTicket({ city = __msg("atseenMockData.dubai"), memberNumber, name, onContinue, busy = false, overlay = false }) {
  __useUiLanguage();
  const number = Number(memberNumber || 1).toLocaleString(__uiLocale());
  const joined = new Date().toLocaleDateString(__uiLocale(), { day: "numeric", month: "long", year: "numeric" });
  const place = city || __msg("atseenMockData.dubai");

  const share = async () => {
    const text = __msg("onboarding.iMValue0OnSeenOneOfThe", { value0: number, value1: place });
    if (navigator.share) {
      await navigator.share({ title: __msg("system.OnboardingTicket.9db6363b44"), text, url: window.location.origin }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(`${text} ${window.location.origin}`);
  };

  return (
    <main className={`${overlay ? "absolute inset-0 z-[150] min-h-full animate-[ticket-rise_.52s_cubic-bezier(.2,.8,.2,1)_both] bg-[#06101b]/95 backdrop-blur-[5px]" : "relative h-[100dvh] w-full bg-[#05070a]"} overflow-y-auto overflow-x-hidden text-white`} role={overlay ? "dialog" : undefined} aria-modal={overlay ? "true" : undefined} aria-label={overlay ? __msg("system.OnboardingTicket.4b9a49b725") : undefined}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[78%] bg-[radial-gradient(ellipse_at_50%_31%,rgba(45,79,124,.34),transparent_58%)]" />
      <section className={`relative mx-auto flex ${overlay ? "min-h-full" : "min-h-[100dvh]"} w-full max-w-[458px] flex-col items-center px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(36px,env(safe-area-inset-top))] sm:pt-[max(64px,env(safe-area-inset-top))]`}>
        <p className="text-[11px] font-black tracking-[.2em] text-[#a9d2ff]">{__msg("system.OnboardingTicket.148c837787")}</p>

        <article className="relative mt-[16px] flex h-[clamp(360px,55dvh,480px)] w-[min(300px,84vw)] flex-col overflow-hidden rounded-[27px] border border-[#a9c8ea]/25 bg-[radial-gradient(circle_at_54%_43%,rgba(129,168,211,.17),transparent_31%),linear-gradient(155deg,#263346_0%,#141e2d_48%,#0a1019_100%)] px-[23px] pb-[19px] pt-[29px] text-left shadow-[0_24px_75px_rgba(44,86,136,.22)]">
          <div className="flex items-center justify-between">
            <b className="text-[18px] tracking-[-.04em]"><i className="not-italic text-[#9CCBFF]">@</i>seen</b>
            <span className="text-[10px] font-black tracking-[.13em] text-white/60">{place.toUpperCase()}</span>
          </div>
          <span className="absolute left-1/2 top-[63px] -translate-x-1/2 rounded-[9px] border border-white/10 bg-[#222838]/90 px-[12px] py-[8px] text-[12px] font-bold shadow-lg after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[7px] after:border-t-[7px] after:border-x-transparent after:border-t-[#222838]">{__msg("system.OnboardingTicket.696bb7b72f")}</span>
          <div className="flex flex-1 flex-col justify-center">
            <span className="text-[11px] font-black tracking-[.16em] text-white/48">{__msg("system.OnboardingTicket.e6c167fd27")}</span>
            <strong className="mt-[9px] text-[58px] font-black leading-[.85] tracking-[-.07em] text-[#ddecfb]">№{number}</strong>
            <b className="mt-[18px] truncate text-[17px] leading-tight">{name}</b>
            <small className="mt-[3px] text-[12px] text-white/48">{joined}</small>
          </div>
          <i className="absolute -left-[11px] bottom-[52px] h-[21px] w-[21px] rounded-full bg-[#05070a]" />
          <i className="absolute -right-[11px] bottom-[52px] h-[21px] w-[21px] rounded-full bg-[#05070a]" />
          <div className="-mx-[23px] -mb-[19px] border-t border-dashed border-white/15 px-[23px] py-[20px] text-[13px] text-white/75">{__msg("system.OnboardingTicket.874c654e67")} {place}.</div>
        </article>

        <button className="mt-[26px] flex h-[47px] w-[300px] items-center justify-center gap-2 rounded-[15px] bg-[#9CCBFF] text-[14px] font-black text-[#0A0C0F] shadow-[0_10px_30px_rgba(94,161,232,.22)] transition active:scale-[.97]" onClick={share} type="button">
          <FiShare className="text-[15px]" />{__msg("admin.share")}</button>
        <button className="mt-[8px] px-4 py-2 text-[12px] text-white/60 transition active:scale-[.97] disabled:opacity-40" disabled={busy} onClick={onContinue} type="button">
          {busy ? __msg("system.OnboardingTicket.5e83c4d356") : __msg("profile.continue")}
        </button>
      </section>
    </main>
  );
}
