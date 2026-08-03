import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiClock, FiEye, FiMessageCircle, FiShare2, FiShield, FiUserCheck, FiUserPlus, FiZap } from "react-icons/fi";
import { profileService } from "../../services/profileService";

export default function ProfileSocialActions({ capabilities, profile, relationship = {} }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [messagePrompt, setMessagePrompt] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
  const follow = useMutation({ mutationFn: () => profileService.toggleFollow(profile.username), onSuccess: () => { setError(""); refresh(); }, onError: (requestError) => setError(requestError.response?.data?.message || "Unable to update this follow.") });
  const signal = useMutation({ mutationFn: () => profileService.toggleSeeSignal(profile.username), onSuccess: () => { setError(""); refresh(); }, onError: (requestError) => setError(requestError.response?.data?.message || "Unable to send this signal.") });
  const openMessage = () => {
    if (relationship.following) navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}`);
    else setMessagePrompt(true);
  };
  const openDirectAccess = () => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}&directAccess=1`);
  const followAndMessage = async () => {
    setMessageBusy(true); setError("");
    try {
      await profileService.toggleFollow(profile.username);
      await refresh();
      navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}`);
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to follow this creator."); }
    finally { setMessageBusy(false); }
  };

  if ((!capabilities.canFollow && !capabilities.canMessage) || profile.role !== "creator") return null;
  return <section className="mt-4">
    <div className={`grid gap-2 ${capabilities.canMessage ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.following ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{relationship.following ? <FiUserCheck /> : <FiUserPlus />}{relationship.following ? "Following" : "Follow"}</button> : null}
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.seeSignalSent ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={signal.isPending} onClick={() => signal.mutate()} type="button"><FiEye />{relationship.seeSignalSent ? "Seen you" : "I see you"}</button> : null}
      {capabilities.canMessage ? <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-3 py-3 text-sm font-bold text-atseen-bg transition hover:bg-white" onClick={openMessage} type="button"><FiMessageCircle /> Message</button> : null}
      {capabilities.canMessage ? <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface px-3 py-3 text-sm font-bold transition hover:border-atseen-blue/45" onClick={() => navigate(`/messages?share=${encodeURIComponent(`${window.location.origin}/profile/${profile.username}`)}`)} type="button"><FiShare2 /> Share</button> : null}
    </div>
    {capabilities.canMessage && profile.directAccess?.enabled ? <button className="group mt-3 w-full overflow-hidden rounded-2xl border border-atseen-blue/30 bg-gradient-to-br from-atseen-blue/[0.14] via-atseen-blue/[0.06] to-transparent p-4 text-left transition hover:border-atseen-blue/60 hover:from-atseen-blue/[0.2]" onClick={openDirectAccess} type="button">
      <span className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue shadow-[0_0_24px_-8px_rgba(156,203,255,0.8)]"><FiZap /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="font-black">Direct Access</span>
            <span className="shrink-0 rounded-full bg-atseen-blue px-3 py-1 text-xs font-black text-atseen-bg">✦{profile.directAccess.priceStars}</span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-atseen-muted">Send a priority message with a guaranteed reply—or receive a full refund.</span>
        </span>
      </span>
      <span className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-atseen-blue/15 pt-3 text-[11px] font-semibold text-atseen-blue">
        <span className="inline-flex items-center gap-1.5"><FiClock /> 48-hour window</span>
        <span className="inline-flex items-center gap-1.5"><FiMessageCircle /> Up to 3 messages</span>
        <span className="inline-flex items-center gap-1.5"><FiShield /> Refund if unanswered</span>
      </span>
    </button> : null}
    {error ? <p className="mt-2 text-xs text-red-300" role="alert">{error}</p> : null}
    {messagePrompt ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-sm rounded-3xl border border-atseen-line bg-atseen-bg-2 p-6 shadow-2xl"><h2 className="text-lg font-bold">Message this creator?</h2><p className="mt-3 text-sm leading-6 text-atseen-muted">You are not following this creator. Follow first to message directly, or start with a message request.</p>{error ? <p className="mt-3 text-xs text-atseen-danger">{error}</p> : null}<div className="mt-6 grid gap-2"><button className="rounded-full bg-atseen-blue py-3 text-sm font-bold text-atseen-bg disabled:opacity-50" disabled={messageBusy} onClick={followAndMessage} type="button">{messageBusy ? "Following…" : "Follow & message directly"}</button><button className="rounded-full border border-atseen-blue/40 py-3 text-sm font-bold text-atseen-blue disabled:opacity-50" disabled={messageBusy} onClick={() => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}&request=1`)} type="button">Send a message request</button><button className="py-2 text-sm font-bold text-atseen-muted hover:text-white" disabled={messageBusy} onClick={() => setMessagePrompt(false)} type="button">Cancel</button></div></div></div> : null}
  </section>;
}
