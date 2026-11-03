import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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
  __useUiLanguage();
  const [muted, setMuted] = useState(true);
  return <div className="invitation-world-preview">
    {item.resourceType === "video" ? <><video src={resolveMediaUrl(item.coverUrl)} autoPlay loop playsInline muted={muted} /><button type="button" aria-label={muted ? __msg("messaging.unmutePreview") : __msg("messaging.mutePreview")} onClick={() => setMuted(!muted)}>{muted ? <FiVolumeX /> : <FiVolume2 />}</button></> : <img src={resolveMediaUrl(item.coverUrl)} alt="" />}
    <b dir="auto">{item.title}</b>
  </div>;
}

export default function InvitationWorldPage() {
  __useUiLanguage();
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["invitation-landing", code], queryFn: () => creatorService.getInvitationLanding(code).then(r => r.data.data), retry: false });
  const close = () => navigate(location.state?.returnTo || "/messages");
  if (query.isPending) return <div className="invitation-world-state" role="status">{__msg("public.openingInvitation")}</div>;
  if (query.isError) return <div className="invitation-world-state"><p>{__msg("public.thisInvitationIsNoLongerAvailable")}</p><button onClick={close}>{__msg("fan.backToMessages")}</button></div>;
  const { inviter, joinedCount, fanNumber, previews = [] } = query.data;
  const first = inviter.name?.trim().split(/\s+/)[0] || inviter.username;
  const join = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data: { data } } = await creatorService.joinInvitation(code);
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      navigate(`/profile/${encodeURIComponent(data.username)}`);
      showToast(__msg("social.youReOneOfSFirstFans", { value0: first, value1: data.number.toLocaleString(__uiLocale()) }), { variant: "archive" });
    } catch (e) { setError(e.response?.data?.message || __msg("social.couldNotJoinPleaseTryAgain")); }
    finally { setBusy(false); }
  };
  return <section className="invitation-world-page">
    <div className="invitation-world-close"><button aria-label={__msg("profile.closeInvitation")} onClick={close}><FiX /></button></div>
    <div className="invitation-world-main">
      <FanAvatar src={inviter.avatar} name={inviter.name} size="invitation-world-avatar" />
      <p className="invitation-world-eyebrow">{first.toUpperCase()} {__msg("profile.invitedYou")}</p>
      <h1>{__msg("creator.stepInto")} {first}{__msg("creator.sWorld")}</h1>
      <p className="invitation-world-count">{Number(joinedCount || 0).toLocaleString(__uiLocale())} {__msg("creator.joinedThrough")} {first}</p>
      {previews.length > 0 && <div className="invitation-world-previews">{previews.map(item => <Preview key={item.id} item={item} />)}</div>}
      <div className="invitation-world-perks"><p><span><FiCheck /></span>{__msg("creator.theFirstChapterOfEverythingFree")}</p><p><span><FiStar /></span>{__msg("social.oneOf")} {first}{__msg("social.sFirstFans")}{Number(fanNumber).toLocaleString(__uiLocale())}{__msg("social.onlyYouSeeIt")}</p></div>
    </div>
    <footer>{error && <p role="alert">{__systemMessage(error)}</p>}<button disabled={busy} onClick={join}>{busy ? __msg("social.joining") : __msg("social.join", { value0: first })}</button><p>{__msg("creator.freeYouCanLeaveAnytime")}</p></footer>
  </section>;
}
