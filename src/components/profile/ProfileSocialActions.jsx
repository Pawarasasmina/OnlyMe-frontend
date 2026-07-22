import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiEye, FiMessageCircle, FiUserCheck, FiUserPlus } from "react-icons/fi";
import { profileService } from "../../services/profileService";

export default function ProfileSocialActions({ capabilities, profile, relationship = {} }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
  const follow = useMutation({ mutationFn: () => profileService.toggleFollow(profile.username), onSuccess: () => { setError(""); refresh(); }, onError: (requestError) => setError(requestError.response?.data?.message || "Unable to update this follow.") });
  const signal = useMutation({ mutationFn: () => profileService.toggleSeeSignal(profile.username), onSuccess: () => { setError(""); refresh(); }, onError: (requestError) => setError(requestError.response?.data?.message || "Unable to send this signal.") });

  if ((!capabilities.canFollow && !capabilities.canMessage) || profile.role !== "creator") return null;
  return <section className="mt-4">
    <div className={`grid gap-2 ${capabilities.canMessage ? "grid-cols-3" : "grid-cols-2"}`}>
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.following ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={follow.isPending} onClick={() => follow.mutate()} type="button">{relationship.following ? <FiUserCheck /> : <FiUserPlus />}{relationship.following ? "Following" : "Follow"}</button> : null}
      {capabilities.canFollow ? <button className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-bold transition ${relationship.seeSignalSent ? "border-atseen-blue/40 bg-atseen-blue/10 text-atseen-blue" : "border-atseen-line bg-atseen-surface hover:border-atseen-blue/45"}`} disabled={signal.isPending} onClick={() => signal.mutate()} type="button"><FiEye />{relationship.seeSignalSent ? "Seen you" : "I see you"}</button> : null}
      {capabilities.canMessage ? <Link className="inline-flex items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-3 py-3 text-sm font-bold text-atseen-bg transition hover:bg-white" to={`/messages?with=${encodeURIComponent(profile.ownerUserId)}`}><FiMessageCircle /> Message</Link> : null}
    </div>
    {error ? <p className="mt-2 text-xs text-red-300" role="alert">{error}</p> : null}
  </section>;
}
