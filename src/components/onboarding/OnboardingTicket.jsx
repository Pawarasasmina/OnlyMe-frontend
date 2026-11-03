import { FiSend, FiShare2 } from "react-icons/fi";

export default function OnboardingTicket({ memberNumber, name, onContinue }) {
  const number = Number(memberNumber || 1).toLocaleString();
  const share = async () => {
    const text = `I’m №${number} on @seen`;
    if (navigator.share) await navigator.share({ title: "@seen", text, url: window.location.origin }).catch(() => {});
    else await navigator.clipboard?.writeText(text);
  };
  return <section className="flex w-full max-w-[430px] flex-col items-center text-center">
    <p className="text-xs font-black tracking-[.22em] text-[#9CCBFF]">YOU’RE IN</p>
    <div className="relative mt-5 flex aspect-[.68] w-full max-w-[310px] flex-col overflow-hidden rounded-[26px] border border-white/15 bg-[radial-gradient(circle_at_50%_32%,rgba(156,203,255,.28),transparent_35%),linear-gradient(155deg,#182433,#0A0F19_65%)] p-6 text-left shadow-2xl">
      <div className="flex items-center justify-between"><b className="text-xl"><i className="not-italic text-[#9CCBFF]">@</i>seen</b><span className="text-[10px] font-bold tracking-[.18em] text-white/45">FOUNDING MEMBER</span></div>
      <div className="flex flex-1 flex-col justify-center"><span className="text-[11px] font-bold tracking-[.2em] text-white/45">MEMBER</span><strong className="mt-2 text-5xl font-black tracking-[-.05em]">№{number}</strong><b className="mt-5 text-lg">{name}</b><small className="mt-1 text-white/45">Joined {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</small></div>
      <div className="-mx-6 border-t border-dashed border-white/15 px-6 pt-5 text-sm text-white/65">One of the first people inside @seen.</div>
    </div>
    <div className="mt-6 grid w-full grid-cols-2 gap-3"><button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] py-4 font-bold active:scale-[.97]" onClick={share} type="button"><FiShare2 /> Share</button><button className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.06] py-4 font-bold active:scale-[.97]" onClick={share} type="button"><FiSend /> Send</button></div>
    <button className="mt-3 w-full rounded-2xl bg-[#9CCBFF] py-4 font-black text-[#0A0C0F] active:scale-[.97]" onClick={onContinue} type="button">Continue</button>
  </section>;
}
