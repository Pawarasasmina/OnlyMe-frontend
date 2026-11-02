import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { creatorService } from "../../services/creatorService";
import { InviteLanding } from "../../components/profile/BringFriendsFlow";
import { useAuth } from "../../hooks/useAuth";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";

export default function ReferralLandingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const query = useQuery({ queryKey: ["referral", code], queryFn: () => creatorService.getInvitation(code).then(r => r.data.data), retry: false });
  if (query.isPending) return <main className="public-friend-invitation invite-state" role="status">Opening invitation...</main>;
  if (query.isError) return <main className="public-friend-invitation invite-state"><h1>This invitation is no longer available.</h1><Link to="/register">Join @seen</Link></main>;
  return <main className="public-friend-invitation"><InviteLanding inviter={query.data.inviter} onClose={() => navigate(user ? "/profile" : "/")} onJoin={shareIdentity => {
    if (user) { showToast("You are already on @seen", { variant: "archive" }); navigate("/seen"); return; }
    navigate(`/register?ref=${encodeURIComponent(code)}${shareIdentity ? "" : "&private=1"}`);
  }} /></main>;
}
