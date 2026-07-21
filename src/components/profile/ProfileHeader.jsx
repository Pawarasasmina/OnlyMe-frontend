import { FiCheckCircle, FiExternalLink, FiMapPin } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { resolveMediaUrl } from "../../utils/media";

function ProfileHeader({ metrics = {}, profile }) {
  const cover = resolveMediaUrl(profile.cover);
  const avatar = resolveMediaUrl(profile.avatar);
  return (
    <header className="overflow-hidden rounded-[22px] border border-atseen-line bg-atseen-surface">
      <div className="h-36 bg-[radial-gradient(circle_at_top,#15233a,#080b10_70%)] sm:h-48">
        {cover ? <img alt={`${profile.displayName} cover`} className="h-full w-full object-cover" src={cover} /> : null}
      </div>
      <div className="px-5 pb-6 sm:px-7">
        <FanAvatar className="-mt-11 border-4 border-atseen-bg shadow-glow" name={profile.displayName} size="h-[88px] w-[88px]" src={avatar} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-atseen-text">{profile.displayName}</h1>
          {profile.verified ? <FiCheckCircle aria-label="Verified" className="text-atseen-blue" /> : null}
          <span className="rounded-full border border-atseen-line px-2.5 py-1 text-[10px] font-bold uppercase text-atseen-muted">{profile.role}</span>
        </div>
        <p className="mt-1 text-sm text-atseen-muted">@{profile.username}</p>
        {profile.role === "creator" ? <div className="mt-3 flex gap-6 text-xs text-atseen-muted"><span><strong className="text-sm text-atseen-text">{(metrics.followerCount || 0).toLocaleString()}</strong> followers</span><span><strong className="text-sm text-atseen-text">{(metrics.followingCount || 0).toLocaleString()}</strong> following</span></div> : null}
        {profile.location ? <p className="mt-3 flex items-center gap-2 text-xs text-atseen-muted"><FiMapPin /> {profile.location}</p> : null}
        {profile.bio ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/85">{profile.bio}</p> : null}
        {profile.categories?.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.categories.map((category) => <span className="rounded-full bg-atseen-blue/10 px-3 py-1 text-xs font-semibold text-atseen-blue" key={category}>{category}</span>)}</div> : null}
        {profile.socialLinks?.length ? <div className="mt-4 flex flex-wrap gap-3">{profile.socialLinks.map((link) => <a className="inline-flex items-center gap-1 text-xs font-semibold text-atseen-blue hover:text-white" href={link.url} key={`${link.platform}-${link.url}`} rel="noreferrer" target="_blank">{link.platform}<FiExternalLink /></a>)}</div> : null}
      </div>
    </header>
  );
}

export default ProfileHeader;
