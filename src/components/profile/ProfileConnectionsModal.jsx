import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { profileService } from "../../services/profileService";

function ProfileConnectionsModal({ onClose, type }) {
  const query = useQuery({
    queryKey: ["profile-connections", type],
    queryFn: () => profileService.getOwnConnections(type).then((response) => response.data.data),
    enabled: Boolean(type),
  });
  const accounts = query.data?.accounts || [];

  return <FanModal className="max-w-md" isOpen={Boolean(type)} onClose={onClose} title={type === "following" ? "Following" : "Followers"}>
    <div className="max-h-[60vh] overflow-y-auto pr-1">
      {query.isLoading ? <LoadingSkeleton className="h-14" count={4} /> : null}
      {query.isError ? <div className="py-8 text-center"><p className="text-sm text-atseen-muted">Unable to load these accounts.</p><button className="mt-3 text-sm font-bold text-atseen-blue" onClick={() => query.refetch()} type="button">Try again</button></div> : null}
      {!query.isLoading && !query.isError && !accounts.length ? <p className="py-10 text-center text-sm text-atseen-muted">No {type} yet.</p> : null}
      {accounts.map((account) => <Link className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-atseen-surface-2" key={account.id} onClick={onClose} to={`/profile/${account.username}`}><FanAvatar name={account.name} size="h-11 w-11" src={account.avatar} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-sm font-bold text-atseen-text">{account.name}{account.verified ? <VerifiedBadge /> : null}</p><p className="truncate text-xs text-atseen-muted">@{account.username}</p></div><span className="rounded-full border border-atseen-line px-2 py-1 text-[9px] font-bold uppercase text-atseen-dim">{account.role}</span></Link>)}
    </div>
  </FanModal>;
}

export default ProfileConnectionsModal;
