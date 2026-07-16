import { useState } from "react";
import { FiBookmark, FiMessageCircle, FiShare2 } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators } from "../../../data/atseenMockData";

function WorldCard({ onOpenChapter, world }) {
  const creator = atseenCreators[world.creatorId];
  const { showToast } = useFanToast();
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`https://atseen.com/worlds/${world.id}`);
      showToast("World link copied.");
    } catch {
      showToast("Could not copy the world link.");
    }
  };

  return (
    <article className="mb-6 overflow-hidden rounded-[22px] border border-atseen-line bg-atseen-surface">
      <div className="flex items-center gap-2.5 px-[18px] py-[15px]">
        <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-atseen-text">
            {creator.name}
            {creator.verified ? <VerifiedBadge /> : null}
          </p>
          <p className="text-[10.5px] text-atseen-muted">{creator.location}</p>
        </div>
        <span className="relative text-[26px]">
          {world.worldEmoji}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm">{world.themeEmoji}</span>
        </span>
      </div>
      <button className="relative block h-[280px] w-full text-left" onClick={() => onOpenChapter(world, 0)} type="button">
        <img alt="" className="h-full w-full object-cover" src={world.cover} />
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atseen-bg/95" />
        <span className="absolute right-4 top-4 rounded-full bg-atseen-bg/60 px-3 py-1.5 text-[10.5px] font-bold text-white backdrop-blur">
          ▶ {world.duration}
        </span>
        <span className="absolute bottom-[18px] left-[22px] right-[22px]">
          <span className="block text-2xl font-extrabold tracking-[-0.02em] text-white">{world.title}</span>
          <span className="mt-1 block text-[11px] text-atseen-muted">
            <b className="text-white">{world.steppedInside.toLocaleString()}</b> stepped inside · {world.chapters.length} chapters
          </span>
        </span>
      </button>
      <div className="px-[18px] pb-[18px] pt-4">
        <p className="text-sm leading-6 text-atseen-muted">{world.description}</p>
        <div className="mt-3 space-y-2">
          {world.chapters.slice(0, 2).map((chapter, index) => (
            <button
              className={`flex w-full items-center gap-3 rounded-[14px] border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left text-[13.5px] font-semibold text-atseen-text transition hover:border-atseen-blue/40 ${
                index > 0 ? "opacity-60" : ""
              }`}
              key={chapter}
              onClick={() => onOpenChapter(world, index)}
              type="button"
            >
              <span className="w-4 text-[11px] font-bold text-atseen-dim">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{chapter}</span>
              <span className={`text-[11px] ${index > 0 ? "text-atseen-dim" : "text-atseen-success"}`}>{index > 0 ? "Locked" : "Open"}</span>
            </button>
          ))}
          <button
            className="w-full px-4 py-2.5 text-center text-xs font-semibold text-atseen-blue transition hover:text-white"
            onClick={() => onOpenChapter(world, 0)}
            type="button"
          >
            Open — {world.chapters.length - 2}+ more chapters
          </button>
        </div>
        <div className="mt-2 flex items-start gap-2">
          <FanAvatar name={atseenCreators[world.testimonial.creatorId].name} size="h-5 w-5" src={atseenCreators[world.testimonial.creatorId].avatar} />
          <p className="text-[11.5px] italic leading-5 text-atseen-muted">“{world.testimonial.text}”</p>
        </div>
        <div className="mt-3 flex items-center gap-5 text-[11.5px] font-semibold text-atseen-dim">
          <button
            className={`inline-flex items-center gap-1.5 transition hover:text-white ${supported ? "text-atseen-blue" : ""}`}
            onClick={() => setSupported((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="text-sm">🤝</span>
            {world.handshakes + (supported ? 1 : 0)}
          </button>
          <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={() => showToast("World comments open in the app.")} type="button">
            <FiMessageCircle aria-hidden="true" /> {world.comments}
          </button>
          <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={share} type="button">
            <FiShare2 aria-hidden="true" /> Share
          </button>
          <button
            aria-label={saved ? "Remove saved world" : "Save world"}
            className={`ml-auto transition hover:text-white ${saved ? "text-atseen-blue" : ""}`}
            onClick={() => {
              setSaved((current) => !current);
              showToast(saved ? "Removed from your library." : "World saved.");
            }}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default WorldCard;
