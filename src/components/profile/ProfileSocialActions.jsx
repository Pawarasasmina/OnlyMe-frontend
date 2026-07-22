import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiEye, FiMessageCircle, FiUserCheck, FiUserPlus } from "react-icons/fi";
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
    <div className={`grid gap-2 ${capabilities.canMessage ? "grid-cols-3" : "grid-cols-2"}`}>
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.following ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{relationship.following ? <FiUserCheck /> : <FiUserPlus />}{relationship.following ? "Following" : "Follow"}</button> : null}
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.seeSignalSent ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={signal.isPending} onClick={() => signal.mutate()} type="button"><FiEye />{relationship.seeSignalSent ? "Seen you" : "I see you"}</button> : null}
      {capabilities.canMessage ? <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-3 py-3 text-sm font-bold text-atseen-bg transition hover:bg-white" onClick={openMessage} type="button"><FiMessageCircle /> Message</button> : null}
    </div>
    {error ? <p className="mt-2 text-xs text-red-300" role="alert">{error}</p> : null}
    {messagePrompt ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-sm rounded-3xl border border-atseen-line bg-atseen-bg-2 p-6 shadow-2xl"><h2 className="text-lg font-bold">Message this creator?</h2><p className="mt-3 text-sm leading-6 text-atseen-muted">You are not following this creator. Follow first to message directly, or start with a message request.</p>{error ? <p className="mt-3 text-xs text-atseen-danger">{error}</p> : null}<div className="mt-6 grid gap-2"><button className="rounded-full bg-atseen-blue py-3 text-sm font-bold text-atseen-bg disabled:opacity-50" disabled={messageBusy} onClick={followAndMessage} type="button">{messageBusy ? "Following…" : "Follow & message directly"}</button><button className="rounded-full border border-atseen-blue/40 py-3 text-sm font-bold text-atseen-blue disabled:opacity-50" disabled={messageBusy} onClick={() => navigate(`/messages?with=${encodeURIComponent(profile.ownerUserId)}&request=1`)} type="button">Send a message request</button><button className="py-2 text-sm font-bold text-atseen-muted hover:text-white" disabled={messageBusy} onClick={() => setMessagePrompt(false)} type="button">Cancel</button></div></div></div> : null}
  </section>;
}
