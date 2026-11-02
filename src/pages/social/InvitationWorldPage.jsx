import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiCheck, FiStar, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { creatorService } from "../../services/creatorService";
import { resolveMediaUrl } from "../../utils/media";
import "./InvitationWorldPage.css";

function Preview({ item }) {
  const [muted, setMuted] = useState(true);
  return <div className="invitation-world-preview">
    {item.resourceType === "video" ? <><video src={resolveMediaUrl(item.coverUrl)} autoPlay loop playsInline muted={muted} /><button type="button" aria-label={muted ? "Unmute preview" : "Mute preview"} onClick={() => setMuted(!muted)}>{muted ? <FiVolumeX /> : <FiVolume2 />}</button></> : <img src={resolveMediaUrl(item.coverUrl)} alt="" />}
    <b>{item.title}</b>
  </div>;
}

export default function InvitationWorldPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["invitation-landing", code], queryFn: () => creatorService.getInvitationLanding(code).then(r => r.data.data), retry: false });
  const close = () => navigate(location.state?.returnTo || "/messages");
  if (query.isPending) return <div className="invitation-world-state" role="status">Opening invitation...</div>;
  if (query.isError) return <div className="invitation-world-state"><p>This invitation is no longer available.</p><button onClick={close}>Back to messages</button></div>;
  const { inviter, joinedCount, fanNumber, previews = [] } = query.data;
  const first = inviter.name?.trim().split(/\s+/)[0] || inviter.username;
  const join = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data: { data } } = await creatorService.joinInvitation(code);
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      navigate(`/profile/${encodeURIComponent(data.username)}`);
      showToast(`You’re one of ${first}’s first fans — #${data.number.toLocaleString()}`, { variant: "archive" });
    } catch (e) { setError(e.response?.data?.message || "Could not join. Please try again."); }
    finally { setBusy(false); }
  };
  return <section className="invitation-world-page">
    <div className="invitation-world-close"><button aria-label="Close invitation" onClick={close}><FiX /></button></div>
    <div className="invitation-world-main">
      <FanAvatar src={inviter.avatar} name={inviter.name} size="invitation-world-avatar" />
      <p className="invitation-world-eyebrow">{first.toUpperCase()} INVITED YOU</p>
      <h1>Step into {first}’s world</h1>
      <p className="invitation-world-count">{Number(joinedCount || 0).toLocaleString()} joined through {first}</p>
      {previews.length > 0 && <div className="invitation-world-previews">{previews.map(item => <Preview key={item.id} item={item} />)}</div>}
      <div className="invitation-world-perks"><p><span><FiCheck /></span>The first chapter of everything — free</p><p><span><FiStar /></span>One of {first}’s first fans — #{Number(fanNumber).toLocaleString()}, only you see it</p></div>
    </div>
    <footer>{error && <p role="alert">{error}</p>}<button disabled={busy} onClick={join}>{busy ? "Joining..." : `Join ${first}`}</button><p>Free · you can leave anytime</p></footer>
  </section>;
}
