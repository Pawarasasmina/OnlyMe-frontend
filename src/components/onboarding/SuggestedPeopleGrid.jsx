import { Link } from "react-router-dom";
import { FiCheck, FiMapPin } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";

function SuggestedPeopleGrid({ max = 10, onToggle, people = [], selected = [] }) {
  const selectedSet = new Set(selected);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {people.map((person) => {
        const active = selectedSet.has(person.id);
        const disabled = !active && selected.length >= max;
        const location = [person.location?.city, person.location?.country].filter(Boolean).join(", ");
        const tags = (person.categories || person.sharedInterests || []).slice(0, 3);
        return (
          <article
            className={`flex min-h-[260px] flex-col rounded-[20px] border p-4 text-left transition ${active ? "border-[#9CCBFF] bg-[#9CCBFF]/10 shadow-[0_0_24px_rgba(156,203,255,.16)]" : "border-white/10 bg-[#12151B] hover:border-white/25"} ${disabled ? "opacity-45" : ""}`}
            key={person.id}
          >
            <button
              aria-pressed={active}
              className="flex flex-1 gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CCBFF]"
              disabled={disabled}
              onClick={() => onToggle(person.id)}
              type="button"
            >
              <FanAvatar name={person.name} size="h-14 w-14" src={person.avatar} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 truncate text-sm font-black text-white">
                  {person.name}
                  {person.verified ? <VerifiedBadge /> : null}
                </span>
                <span className="mt-1 block truncate text-xs text-white/45">@{person.username}</span>
                {location ? (
                  <span className="mt-2 flex items-center gap-1 truncate text-[11px] text-white/45">
                    <FiMapPin className="shrink-0 text-[#9CCBFF]" aria-hidden="true" />
                    {location}
                  </span>
                ) : null}
                {person.bio ? <span className="mt-2 block line-clamp-2 text-xs leading-5 text-white/50">{person.bio}</span> : null}
                <span className="mt-2 block line-clamp-2 text-xs font-bold leading-5 text-[#9CCBFF]">{person.reason || person.status || "Recommended for your Orbit"}</span>
              </span>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${active ? "border-[#9CCBFF] bg-[#9CCBFF] text-[#0A0C0F]" : "border-white/20 text-transparent"}`}>
                <FiCheck aria-hidden="true" />
              </span>
            </button>
            {tags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-white/55" key={tag}>{tag}</span>)}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <button className={`rounded-full px-3 py-2 text-xs font-black ${active ? "bg-[#9CCBFF] text-[#0A0C0F]" : "border border-white/10 text-white/62"}`} disabled={disabled} onClick={() => onToggle(person.id)} type="button">
                {active ? "Selected" : "Follow"}
              </button>
              {person.profileRoute ? <Link className="text-xs font-bold text-white/45 hover:text-[#9CCBFF]" to={person.profileRoute}>View profile</Link> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default SuggestedPeopleGrid;
