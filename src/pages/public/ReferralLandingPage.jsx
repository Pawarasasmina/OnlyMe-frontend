/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { creatorService } from "../../services/creatorService";
import { InviteLanding } from "../../components/profile/BringFriendsFlow";
import { useAuth } from "../../hooks/useAuth";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";

export default function ReferralLandingPage() {
  __useUiLanguage();
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const query = useQuery({ queryKey: ["referral", code], queryFn: () => creatorService.getInvitation(code).then(r => r.data.data), retry: false });
  if (query.isPending) return <main className="public-friend-invitation invite-state" role="status">{__msg("public.openingInvitation")}</main>;
  if (query.isError) return <main className="public-friend-invitation invite-state"><h1>{__msg("public.thisInvitationIsNoLongerAvailable")}</h1><Link to="/register">{__msg("public.joinSeen")}</Link></main>;
  return <main className="public-friend-invitation"><InviteLanding inviter={query.data.inviter} onClose={() => navigate(user ? "/profile" : "/")} onJoin={shareIdentity => {
    if (user) { showToast(__msg("public.youAreAlreadyOnSeen"), { variant: "archive" }); navigate("/seen"); return; }
    navigate(`/register?ref=${encodeURIComponent(code)}${shareIdentity ? "" : "&private=1"}`);
  }} /></main>;
}
