import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiClock, FiInbox, FiMessageCircle, FiPhone, FiRefreshCw, FiX } from "react-icons/fi";
import { useCalls } from "../../context/callContextBase";
import { callService } from "../../services/callService";
import { messageService } from "../../services/messageService";

const benefitRows = [
  [FiMessageCircle, "A 48-hour private window", "Send up to 3 messages. This is a real back-and-forth, not a support ticket."],
  [FiInbox, "Top of the priority inbox", "Your message appears above standard conversations so it cannot get lost."],
  [FiClock, "First reply within 48 hours", "The creator guarantees a personal reply during your private window."],
  [FiRefreshCw, "Refunded if unanswered", "If the creator does not reply in time, your held Stars return automatically."],
];

export default function DirectAccessOfferModal({ onClose, profile }) {
  const navigate = useNavigate();
  const { startCall } = useCalls();
  const creatorId = profile.ownerUserId;
  const firstName = profile.displayName?.split(" ")[0] || profile.username;
  const messageOffer = useQuery({
    queryKey: ["direct-access-offer", creatorId],
    queryFn: () => messageService.getDirectAccessOffer(creatorId).then((response) => response.data.data),
    retry: false,
  });
  const callOffer = useQuery({
    queryKey: ["paid-call-offer", creatorId],
    queryFn: () => callService.getPaidOffer(creatorId).then((response) => response.data.data),
    retry: false,
  });
  const offer = messageOffer.data;
  const paidCall = callOffer.data;
  const openMessages = () => {
    onClose();
    navigate(`/messages?with=${encodeURIComponent(creatorId)}&directAccess=1`);
  };
  const requestCall = (type = "AUDIO") => {
    onClose();
    startCall({ id: creatorId, displayName: profile.displayName, username: profile.username, avatarUrl: profile.avatar, role: "creator" }, type);
  };

  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section aria-labelledby="direct-access-offer-title" aria-modal="true" className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-atseen-line bg-atseen-bg shadow-2xl sm:rounded-3xl" role="dialog">
      <header className="flex shrink-0 items-center gap-3 border-b border-atseen-line bg-atseen-bg-2 px-5 py-4">
        <img alt="" className="h-10 w-10 rounded-full border border-atseen-line object-cover" src={profile.avatar || "/default-avatar.png"} />
        <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black" id="direct-access-offer-title">{profile.displayName}</h2><p className="text-[11px] text-atseen-muted">Direct Access</p></div>
        <button aria-label="Close Direct Access" className="grid h-9 w-9 place-items-center rounded-full text-atseen-muted hover:bg-white/5 hover:text-white" onClick={onClose} type="button"><FiX /></button>
      </header>

      <div className="overflow-y-auto px-5 pb-28 pt-4">
        {callOffer.isLoading ? <div className="h-20 animate-pulse rounded-2xl bg-atseen-surface-2" /> : paidCall?.enabled ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
          <FiPhone className="shrink-0 text-lg text-emerald-300" />
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">Call with {firstName}</h3><p className="mt-1 text-[10px] text-atseen-muted">✦{paidCall.priceStars} · {paidCall.durationMinutes} min · guaranteed or refunded</p></div>
          <button className="shrink-0 rounded-full bg-atseen-blue px-4 py-2 text-xs font-black text-atseen-bg" onClick={() => requestCall("AUDIO")} type="button">Request</button>
        </div> : null}

        <div className="py-7 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-atseen-blue/40 bg-atseen-blue/10 text-3xl text-atseen-blue shadow-[0_0_34px_-8px_rgba(156,203,255,0.55)]">✦</div>
          <h3 className="mt-4 text-2xl font-black tracking-tight">A real conversation.</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-atseen-muted">Not one reply into the void—a private 48-hour window with {firstName}, with a promise attached.</p>
        </div>

        <div>{benefitRows.map(([Icon, title, copy]) => <div className="flex gap-3 border-b border-white/[0.06] py-3.5 last:border-0" key={title}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-atseen-blue/25 bg-atseen-blue/[0.09] text-atseen-blue"><Icon /></span><div><h4 className="text-sm font-bold">{title}</h4><p className="mt-1 text-xs leading-5 text-atseen-muted">{copy}</p></div></div>)}</div>

        {messageOffer.isError ? <p className="mt-4 rounded-xl border border-atseen-danger/25 bg-atseen-danger/10 p-3 text-center text-xs text-atseen-danger">{messageOffer.error?.response?.data?.message || "Direct Access is unavailable right now."}</p> : offer ? <div className="mt-4 overflow-hidden rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4">
          <div className="flex justify-between border-b border-atseen-line py-3 text-sm"><span className="text-atseen-muted">Price</span><b>{offer.premiumAllowance?.available ? "Premium window included" : `✦${offer.priceStars}`}</b></div>
          <div className="flex justify-between border-b border-atseen-line py-3 text-sm"><span className="text-atseen-muted">Your balance</span><b>✦{Number(offer.walletBalance || 0)}</b></div>
          <div className="flex justify-between py-3 text-sm"><span className="text-atseen-muted">Guarantee</span><b className="text-emerald-300">48h or refunded</b></div>
        </div> : null}
        <p className="mt-4 text-center text-[11px] text-atseen-muted">Stars are held securely and only captured after {firstName} replies.</p>
      </div>

      <footer className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-atseen-bg via-atseen-bg to-transparent px-5 pb-5 pt-10">
        <button className="w-full rounded-2xl bg-atseen-blue py-3.5 text-sm font-black text-atseen-bg disabled:opacity-40" disabled={messageOffer.isLoading || !offer?.enabled} onClick={openMessages} type="button">{offer?.premiumAllowance?.available ? "Open your included window" : offer ? `Unlock Direct Access · ✦${offer.priceStars}` : "Loading offer…"}</button>
        {offer && !offer.premiumAllowance?.available && Number(offer.walletBalance || 0) < Number(offer.priceStars) ? <button className="mt-2 w-full text-xs font-bold text-atseen-warning" onClick={() => { onClose(); navigate("/fan/wallet"); }} type="button">Not enough Stars · Open Wallet</button> : null}
      </footer>
    </section>
  </div>;
}
