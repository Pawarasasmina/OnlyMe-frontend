import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { FiGift, FiUserPlus } from "react-icons/fi";
import { creatorService } from "../../services/creatorService";

export default function ReferralLandingPage() {
  const { code } = useParams();
  const query = useQuery({ queryKey: ["referral", code], queryFn: () => creatorService.getInvitation(code).then((r) => r.data.data), retry: false });
  if (query.isLoading) return <main className="referral-landing"><p>Opening invitation…</p></main>;
  if (query.isError) return <main className="referral-landing"><h1>This invitation is no longer available.</h1><Link to="/register">Join @seen</Link></main>;
  const invite = query.data;
  return <main className="referral-landing"><span>{invite.type === "creator" ? <FiUserPlus /> : <FiGift />}</span><small>@SEEN INVITATION</small><h1>{invite.inviter.name} invited you to be seen.</h1><p>{invite.type === "creator" ? "Create Experiences, build your World, receive Gifts, and keep your own earnings. Your inviter may receive a separate reward from @seen for 12 months." : "A friend’s first Experience is on us. Join the people and stories they care about."}</p><Link to={`/register?ref=${encodeURIComponent(code)}`}>{invite.type === "creator" ? "Join as a new creator" : "Join @seen"}</Link><em>Referral rewards are paid by @seen — never deducted from creator earnings.</em></main>;
}
