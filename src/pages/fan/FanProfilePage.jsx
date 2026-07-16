import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiCheckCircle, FiEdit3, FiGrid, FiSettings, FiShield } from "react-icons/fi";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import FanCard from "../../components/fanWeb/shared/FanCard";
import LoadingSkeleton from "../../components/fanWeb/shared/LoadingSkeleton";
import { useAuth } from "../../hooks/useAuth";
import { useSocialCapabilities } from "../../hooks/useSocialCapabilities";
import { profileService } from "../../services/profileService";
import { getUserDisplay } from "../../components/fanWeb/shared/userDisplay";

function ActionLink({ icon: Icon, label, to }) {
  return <Link className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-3 text-sm font-semibold transition hover:border-atseen-blue/45" to={to}><Icon className="text-atseen-blue" />{label}</Link>;
}

function FanProfilePage() {
  const { status } = useOutletContext();
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const profileQuery = useQuery({
    queryKey: ["profile", "me", "social-profile"],
    queryFn: () => profileService.getMe().then((response) => response.data.data),
    retry: false,
  });

  if (profileQuery.isLoading) return <LoadingSkeleton className="h-40" count={2} />;
  if (profileQuery.isError) return <FanCard className="border-atseen-danger/25 bg-atseen-danger/10"><p className="font-semibold text-atseen-danger">Unable to load your profile.</p><button className="mt-3 text-sm font-bold text-atseen-blue" onClick={() => profileQuery.refetch()} type="button">Retry</button></FanCard>;

  const account = profileQuery.data?.account || user;
  const profile = profileQuery.data?.profile || {};
  const display = getUserDisplay({ ...account, avatar: account?.profilePhoto, city: profile.city }, status);

  return (
    <div>
      <div className="rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)] px-5 py-10 text-center">
        <FanAvatar className="mx-auto border-2 border-atseen-blue shadow-glow" name={display.name} size="h-[84px] w-[84px]" src={display.avatar} />
        <p className="mt-3 flex items-center justify-center gap-2 text-lg font-extrabold">{display.name}{account?.isVerified ? <FiCheckCircle className="text-atseen-blue" /> : null}</p>
        <p className="mt-1 text-sm text-atseen-muted">@{display.username}</p>
        {profile.bio ? <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/80">{profile.bio}</p> : null}
        {status ? <span className="mt-4 inline-flex rounded-full border border-atseen-blue/25 bg-atseen-blue/10 px-3 py-1.5 text-xs font-bold text-atseen-blue">{status}</span> : null}
      </div>

      {capabilities.isCreator ? (
        <FanCard className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-atseen-blue">Creator account</p>
          <p className="mt-2 text-sm text-atseen-muted">{capabilities.isApprovedCreator ? "Approved for creator management and publishing tools." : "Verification is required before creation and Studio access are enabled."}</p>
        </FanCard>
      ) : null}

      <div className="mt-5 grid gap-2">
        <ActionLink icon={FiEdit3} label="Edit profile" to="/settings" />
        {capabilities.canAccessStudio ? <ActionLink icon={FiGrid} label="Creator Studio" to="/studio" /> : null}
        {capabilities.canCreate ? <ActionLink icon={FiEdit3} label="Create" to="/creator/content/new" /> : null}
        {capabilities.canAccessVerification && !capabilities.isApprovedCreator ? <ActionLink icon={FiShield} label="Creator verification" to="/creator/verification" /> : null}
        <ActionLink icon={FiSettings} label="Settings" to="/settings" />
      </div>
      <FanCard className="mt-5 text-center"><p className="text-sm font-semibold">Social profile content is not connected yet.</p><p className="mt-2 text-xs leading-5 text-atseen-muted">Seens, Wall posts, planets, and audience metrics will appear only after their live services are implemented.</p></FanCard>
    </div>
  );
}

export default FanProfilePage;
