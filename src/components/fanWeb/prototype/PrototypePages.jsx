import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  FiBarChart2,
  FiBookmark,
  FiCheck,
  FiChevronRight,
  FiEye,
  FiGift,
  FiMessageCircle,
  FiPlay,
  FiShare2,
  FiZap,
} from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import FanCard from "../shared/FanCard";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { useSocialCapabilities } from "../../../hooks/useSocialCapabilities";
import { useMyFeedPosts } from "../../../hooks/useFeedPosts";
import { getUserDisplay } from "../shared/userDisplay";
import FeedPost from "../home/FeedPost";

const image = (id, width = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=60`;
const portrait = (id) => `${image(id, 220)}&crop=faces&h=220`;

const creators = {
  anna: {
    avatar: portrait("1573496359142-b8d87734a5a2"),
    name: "Anna Kim",
    place: "Dubai",
    status: "\u{1F4D6} Reading",
    verified: true,
    why: "Depth over crowds, both of you.",
  },
  ethan: {
    avatar: portrait("1526506118085-60ce8714f8c5"),
    name: "Ethan Brooks",
    place: "Dubai",
    status: "\u{1F3CB}\uFE0F At the gym",
    verified: true,
    why: "5 AM people find each other.",
  },
  james: {
    avatar: portrait("1519085360753-af0119f7cbe7"),
    name: "James Cole",
    place: "Dubai",
    status: "\u{1F3D7}\uFE0F Building something big",
    verified: true,
    why: "Built to scale, both of you.",
  },
  lina: {
    avatar: portrait("1494790108377-be9c29b29330"),
    name: "Lina Moreau",
    place: "Paris",
    status: "\u{1F377} Wine tasting",
    verified: true,
    why: "You both chase golden hours.",
  },
  mia: {
    avatar: portrait("1517841905240-472988babdf9"),
    name: "Mia Chen",
    place: "Tokyo",
    status: "\u2708\uFE0F Just landed",
    verified: true,
    why: "One-way-ticket instincts, both.",
  },
  omar: {
    avatar: portrait("1506794778202-cad84cf45f1d"),
    name: "Omar Hadid",
    place: "Dubai",
    status: "\u{1F3BE} Tennis?",
    verified: false,
    why: "He needs a partner. You play.",
  },
  sofia: {
    avatar: portrait("1531746020798-e6953c6e8e04"),
    name: "Sofia Rey",
    place: "Dubai",
    status: "\u2615 Perfect order",
    verified: false,
    why: "Same cafe, different tables.",
  },
};

const worlds = [
  {
    chapters: ["Week 1 - Foundations", "Week 2 - Building the habit", "Week 3 - Progressive load"],
    comments: 2,
    cover: image("1517836357463-d25dfeac3438"),
    creator: "ethan",
    description: "A structured 8-week program to transform your body, no gym required. Weekly goals, form guidance and the exact meals.",
    id: "transformation",
    steppedInside: 7176,
    support: 53,
    title: "8-Week Transformation",
    worldIcon: "\u{1F30D}",
    worldTop: "\u{1F3CB}\uFE0F",
  },
  {
    chapters: ["My 6th arrondissement morning", "The cafe list", "Sundays done right"],
    comments: 3,
    cover: image("1502602898657-3e91760cbb34"),
    creator: "lina",
    description: "My complete personal map: cafes, restaurants, neighborhoods and hidden gems.",
    id: "paris",
    steppedInside: 6578,
    support: 47,
    title: "Paris Like a Local",
    worldIcon: "\u{1F30D}",
    worldTop: "\u{1F377}",
  },
  {
    chapters: ["Why order matters", "The first three", "When it gets hard"],
    comments: 2,
    cover: image("1512820790803-83ca734da794"),
    creator: "anna",
    description: "Twelve books, one per month, in the exact order that changed how I think. With my margin notes.",
    id: "books",
    steppedInside: 4930,
    support: 38,
    title: "Books That Rebuilt Me",
    worldIcon: "\u{1F315}",
    worldTop: "\u{1F4D6}",
  },
  {
    chapters: ["The decision", "Paperwork, honestly", "Week one alone"],
    comments: 4,
    cover: image("1540959733332-eab4deabeeaf"),
    creator: "mia",
    description: "How I moved across the world with one suitcase, visas, apartments, first friends, real numbers.",
    id: "tokyo",
    steppedInside: 5840,
    support: 61,
    title: "Tokyo, One Way",
    worldIcon: "\u{1F30D}",
    worldTop: "\u2708\uFE0F",
  },
];

const orbitPositions = {
  anna: [19, 36],
  ethan: [81, 38],
  james: [63, 13],
  lina: [50, 16],
  mia: [13, 68],
  omar: [73, 76],
  sofia: [36, 84],
};

const directRequests = [
  { creator: "sofia", text: "Which camera for a beginner who shoots at night? Budget 3k AED.", value: 100, time: "1h" },
  { creator: "james", text: "Can I get 15 minutes on scaling a service business? Happy to book a call.", value: 100, time: "4h" },
];

const statusOptions = ["\u{1F3BE} Tennis?", "\u{1F305} Morning person", "\u{1F4AA} At the gym", "\u{1F4D6} Reading", "\u2615 Coffee walk"];

function PageTitle({ children, meta, subtitle }) {
  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">
        {children}
        {meta ? <span className="ml-2 text-xs font-semibold text-atseen-muted">{meta}</span> : null}
      </h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-6 text-atseen-muted">{subtitle}</p> : null}
    </div>
  );
}

function CreatorName({ creator }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate">{creator.name}</span>
      {creator.verified ? <VerifiedBadge /> : null}
    </span>
  );
}

function ActionBar({ comments = 0, id, support = 0 }) {
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const { showToast } = useFanToast();

  return (
    <div className="mt-3 flex items-center gap-5 text-[11.5px] font-semibold text-atseen-dim">
      <button className={`inline-flex items-center gap-1.5 transition hover:text-white ${supported ? "text-atseen-blue" : ""}`} onClick={() => setSupported((value) => !value)} type="button">
        <span aria-hidden="true">Handshake</span>
        <span>{support + (supported ? 1 : 0)}</span>
      </button>
      <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={() => showToast("Comments open in the app.")} type="button">
        <FiMessageCircle aria-hidden="true" />
        {comments}
      </button>
      <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={() => showToast("Link copied - atseen.com")} type="button">
        <FiShare2 aria-hidden="true" />
      </button>
      <button aria-label={`Save ${id}`} className="ml-auto transition hover:text-white" onClick={() => setSaved((value) => !value)} type="button">
        <FiBookmark className={saved ? "fill-atseen-blue text-atseen-blue" : ""} aria-hidden="true" />
      </button>
    </div>
  );
}

function WorldBadge({ icon, top }) {
  return (
    <span className="relative text-[26px] leading-none">
      {icon}
      <span className="absolute left-1/2 top-[-11px] -translate-x-1/2 text-sm">{top}</span>
    </span>
  );
}

function WorldCard({ world }) {
  const creator = creators[world.creator];
  const { showToast } = useFanToast();

  return (
    <article className="mb-[26px] overflow-hidden rounded-[22px] border border-atseen-line bg-atseen-surface">
      <div className="flex items-center gap-2.5 px-[18px] py-[15px]">
        <FanAvatar name={creator.name} size="h-9 w-9" src={creator.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold"><CreatorName creator={creator} /></p>
          <p className="text-[10.5px] text-atseen-muted">{creator.place}</p>
        </div>
        <WorldBadge icon={world.worldIcon} top={world.worldTop} />
      </div>

      <button className="relative block h-[280px] w-full overflow-hidden text-left" onClick={() => showToast(`${world.title} opens in the reader.`)} type="button">
        <img alt="" className="h-full w-full object-cover" src={world.cover} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atseen-bg/95" />
        <span className="absolute right-3.5 top-3.5 rounded-full bg-atseen-bg/55 px-3 py-1.5 text-[10.5px] font-bold backdrop-blur">Play 0:30</span>
        <div className="absolute bottom-[18px] left-[22px] right-[22px]">
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{world.title}</h2>
          <p className="mt-1 text-[11px] text-atseen-muted">
            <b className="text-white">{world.steppedInside.toLocaleString()}</b> stepped inside - {world.chapters.length} chapters
          </p>
        </div>
      </button>

      <div className="px-[18px] pb-[18px] pt-4">
        <p className="text-sm leading-6 text-atseen-muted">{world.description}</p>
        <div className="mt-3 space-y-2">
          {world.chapters.slice(0, 2).map((chapter, index) => (
            <button
              className={`flex w-full items-center gap-3 rounded-[14px] border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left text-[13.5px] font-semibold transition hover:border-atseen-blue/40 ${index ? "opacity-55" : ""}`}
              key={chapter}
              onClick={() => showToast(index ? "Unlocks in the app." : "Opening chapter preview.")}
              type="button"
            >
              <span className="w-3.5 text-[11px] font-bold text-atseen-dim">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{chapter}</span>
              <span className={index ? "text-atseen-dim" : "text-atseen-success"}>{index ? "Lock" : ">"}</span>
            </button>
          ))}
          <button className="w-full py-3 text-center text-xs font-semibold text-atseen-blue" onClick={() => showToast("More chapters open in the app.")} type="button">
            Open - {world.chapters.length - 2}+ more chapters
          </button>
        </div>
        <ActionBar comments={world.comments} id={world.id} support={world.support} />
      </div>
    </article>
  );
}

export function PrototypeWorldsPage() {
  return (
    <div>
      <PageTitle subtitle="A new format. Not pictures, not videos, real experiences you can step into.">Worlds</PageTitle>
      <div className="mt-[22px]">
        {worlds.map((world) => (
          <WorldCard key={world.id} world={world} />
        ))}
      </div>
    </div>
  );
}

function CurrentUserAvatar({ className = "", size = "h-[58px] w-[58px]" }) {
  const { status } = useOutletContext();
  const { user } = useAuth();
  const display = getUserDisplay(user, status);
  return <FanAvatar className={className} name={display.name} size={size} src={display.avatar || portrait("1500648767791-00dcc994a43e")} />;
}

function OrbitStage({ compact = false }) {
  const { showToast } = useFanToast();
  const rings = compact ? [[420, 155], [280, 102]] : [[520, 190], [380, 140], [250, 92]];
  const stars = compact ? [[14, 18], [86, 24], [9, 66], [91, 70], [30, 88], [66, 10]] : [[12, 14], [88, 20], [7, 55], [93, 64], [24, 90], [70, 92], [45, 6], [58, 95]];

  return (
    <div className={`relative overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(80%_90%_at_50%_45%,#0d1420,#06080B_75%)] ${compact ? "h-[330px]" : "mt-[18px] h-[380px]"}`}>
      {rings.map(([width, height]) => (
        <div className="atseen-orbit-ring" key={`${width}-${height}`} style={{ width, height }} />
      ))}
      {stars.map(([left, top], index) => (
        <span
          className="atseen-twinkle absolute h-[2.5px] w-[2.5px] rounded-full bg-atseen-blue"
          key={`${left}-${top}`}
          style={{ animationDuration: `${2.2 + index * 0.55}s`, left: `${left}%`, top: `${top}%` }}
        />
      ))}
      <div className={`absolute left-1/2 z-[4] -translate-x-1/2 -translate-y-1/2 text-center ${compact ? "top-[46%]" : "top-1/2"}`}>
        <CurrentUserAvatar className="border-2 border-atseen-blue shadow-glow" size={compact ? "h-[84px] w-[84px]" : "h-[58px] w-[58px]"} />
        {!compact ? <div className="mt-1.5 text-[10.5px] font-extrabold">You</div> : null}
      </div>
      {!compact
        ? Object.entries(orbitPositions).map(([id, [left, top]]) => {
            const creator = creators[id];
            const world = worlds.find((item) => item.creator === id);
            return (
              <button
                className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 text-center transition hover:scale-110"
                key={id}
                onClick={() => showToast(`${creator.name}: ${creator.why}`)}
                style={{ left: `${left}%`, top: `${top}%` }}
                type="button"
              >
                <span className="relative inline-block">
                  <FanAvatar className="border-2 border-atseen-blue/45 shadow-glow" name={creator.name} size="h-11 w-11" src={creator.avatar} />
                  {world ? <span className="absolute right-[-9px] top-[-13px] text-[15px] drop-shadow">{world.worldIcon}</span> : null}
                </span>
                <span className="mt-1 block text-[10px] font-bold drop-shadow">{creator.name.split(" ")[0]}</span>
              </button>
            );
          })
        : null}
      {compact ? (
        <>
          {[
            ["\u{1F30D}", "\u{1F4AA}", "Morning Discipline", 20, 30],
            ["\u{1F315}", "\u{1F4D6}", "My Bookshelf", 80, 36],
          ].map(([planet, topIcon, label, left, top]) => (
            <button className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 text-center" key={label} onClick={() => showToast(`${label} opens in the app.`)} style={{ left: `${left}%`, top: `${top}%` }} type="button">
              <span className="relative inline-block text-[40px] drop-shadow">{planet}<span className="absolute left-1/2 top-[-15px] -translate-x-1/2 text-[19px]">{topIcon}</span></span>
              <span className="mt-1 block text-[10.5px] font-bold">{label}</span>
            </button>
          ))}
          <button className="absolute left-1/2 top-[84%] z-[3] -translate-x-1/2 -translate-y-1/2 text-center opacity-60" onClick={() => showToast("Light a new planet in the app.")} type="button">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-white/30 text-lg text-atseen-dim">+</span>
            <span className="mt-1 block text-[10.5px] font-semibold text-atseen-dim">Light a planet</span>
          </button>
        </>
      ) : null}
      <p className="absolute inset-x-0 bottom-3 z-[2] text-center text-[10px] text-atseen-muted">
        {compact ? "your worlds - tap a planet to step inside" : "tap a light to meet them"}
      </p>
    </div>
  );
}

export function PrototypeOrbitPage() {
  const omar = creators.omar;

  return (
    <div>
      <PageTitle meta="- Dubai" subtitle="People drift closer for real reasons, never for follower counts.">Your Orbit</PageTitle>
      <OrbitStage />
      <p className="mb-3 mt-[26px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Today&apos;s Encounter</p>
      <FanCard className="flex items-center gap-4 rounded-[20px] p-[18px]">
        <FanAvatar name={omar.name} size="h-[66px] w-[66px]" src={omar.avatar} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold"><CreatorName creator={omar} /></p>
          <p className="mt-1 text-[11.5px] text-atseen-muted">{omar.status} - {omar.place}</p>
          <p className="mt-2 text-[12.5px] font-semibold text-atseen-blue">{omar.why}</p>
        </div>
        <button className="shrink-0 rounded-[11px] border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-xs font-semibold transition hover:border-atseen-blue/40" type="button">
          Meet
        </button>
      </FanCard>
    </div>
  );
}

function DirectRequestCard({ index, request }) {
  const [resolved, setResolved] = useState("");
  const { showToast } = useFanToast();
  const creator = creators[request.creator];

  const decide = (accepted) => {
    setResolved(accepted ? "Accepted - answer in the app" : "Declined - refunded");
    showToast(accepted ? "Accepted - guaranteed answer is on." : "Declined - stars go back.");
  };

  return (
    <FanCard className={`mb-2.5 rounded-[18px] p-4 transition ${resolved ? "opacity-50" : ""}`} id={`direct-${index}`}>
      <div className="flex items-center gap-3">
        <FanAvatar name={creator.name} size="h-[38px] w-[38px]" src={creator.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold"><CreatorName creator={creator} /> <span className="text-[10.5px] font-normal text-atseen-muted">- {request.time} - pending</span></p>
        </div>
        <b className="shrink-0 text-[12.5px] text-atseen-blue"><FiZap className="inline" /> {request.value}</b>
      </div>
      <p className="mt-2.5 text-[13px] leading-6 text-white/85">{request.text}</p>
      <div className="mt-3 flex items-center gap-2">
        {resolved ? (
          <span className={`text-xs font-bold ${resolved.startsWith("Accepted") ? "text-atseen-success" : "text-atseen-muted"}`}>{resolved}</span>
        ) : (
          <>
            <button className="rounded-[13px] bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-5 py-2.5 text-xs font-extrabold text-atseen-bg" onClick={() => decide(true)} type="button">Accept</button>
            <button className="rounded-[11px] border border-atseen-line bg-atseen-surface-2 px-4 py-2.5 text-xs font-semibold" onClick={() => decide(false)} type="button">Decline</button>
            <span className="ml-auto text-[10px] text-atseen-muted">guaranteed answer - or refunded</span>
          </>
        )}
      </div>
    </FanCard>
  );
}

export function PrototypeMessagesPage() {
  return (
    <div>
      <PageTitle>Messages</PageTitle>
      <p className="mb-1 mt-[22px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Direct Access - {directRequests.length} Waiting</p>
      <p className="text-[11px] text-atseen-muted">Paid, guaranteed-answer requests. Accept, or the stars go back.</p>
      <div className="mt-3">
        {directRequests.map((request, index) => <DirectRequestCard index={index} key={request.creator} request={request} />)}
      </div>

      <p className="mb-0.5 mt-[22px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Earlier</p>
      {[
        ["anna", "Which desk setup for small apartments? Links appreciated.", "answered - 100 earned", "text-atseen-success"],
        ["mia", "Can you review my week-one plan?", "expired - 100 refunded", "text-atseen-muted"],
      ].map(([id, text, label, color]) => {
        const creator = creators[id];
        return (
          <FanCard className="mb-2.5 flex items-center gap-3 rounded-[18px] p-4 opacity-75" key={id}>
            <FanAvatar name={creator.name} size="h-[34px] w-[34px]" src={creator.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold">{creator.name}</p>
              <p className="truncate text-[11px] text-atseen-muted">{text}</p>
            </div>
            <span className={`rounded-full border border-atseen-line bg-white/[0.05] px-3 py-1.5 text-[10.5px] font-bold ${color}`}>{label}</span>
          </FanCard>
        );
      })}

      <p className="mb-0.5 mt-6 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Chats</p>
      {[
        ["lina", "Thank you for the support yesterday", "2h"],
        ["ethan", "Week 2 plan is up, check chapter two", "5h"],
        ["omar", "Tennis Saturday? Court is booked", "1d"],
      ].map(([id, preview, time]) => {
        const creator = creators[id];
        return (
          <button className="flex w-full items-center gap-3 border-b border-white/[0.05] py-3.5 text-left" key={id} type="button">
            <FanAvatar name={creator.name} size="h-[46px] w-[46px]" src={creator.avatar} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold"><CreatorName creator={creator} /></p>
              <p className="truncate text-[11.5px] text-atseen-muted">{preview}</p>
            </div>
            <span className="text-[10px] text-atseen-muted">{time}</span>
          </button>
        );
      })}
      <FanCard className="mt-[22px] flex cursor-pointer items-center gap-3 rounded-[18px] p-4">
        <FiZap className="text-lg text-atseen-blue" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold">Your Direct Access</p>
          <p className="text-[11px] text-atseen-muted">Priority 100 - Calls off</p>
        </div>
        <FiChevronRight className="text-atseen-muted" />
      </FanCard>
    </div>
  );
}

function VideoCard({ label }) {
  const { showToast } = useFanToast();
  return (
    <button className="relative mt-4 block h-[190px] w-full overflow-hidden rounded-[18px] text-left" onClick={() => showToast("The video plays in the app.")} type="button">
      <img alt="" className="h-full w-full object-cover" src={image("1512453979798-5ea266f8880c")} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-atseen-bg/85" />
      <span className="absolute left-1/2 top-[42%] flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-atseen-bg/55 text-lg backdrop-blur"><FiPlay /></span>
      <div className="absolute bottom-3 left-4">
        <p className="text-[13px] font-bold">{label}</p>
        <p className="text-[10.5px] text-atseen-muted">0:30 - why this person exists here</p>
      </div>
    </button>
  );
}

function DreamCard() {
  const percent = Math.round((480 / 3000) * 100);
  return (
    <FanCard className="mt-4 rounded-[18px] p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{String.fromCodePoint(0x1f305)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">My Dream</p>
          <p className="text-[13.5px] font-bold">A rooftop cinema for the whole orbit</p>
        </div>
      </div>
      <div className="mt-3 h-1 rounded-full bg-white/[0.07]"><span className="block h-full rounded-full bg-gradient-to-r from-atseen-blue to-atseen-blue-strong" style={{ width: `${percent}%` }} /></div>
      <div className="mt-2 flex justify-between text-[11px] text-atseen-muted">
        <span><b className="text-white">480</b> support received - 12 people</span>
        <span>goal 3,000</span>
      </div>
    </FanCard>
  );
}

export function PrototypeProfilePage() {
  const { status, setStatus } = useOutletContext();
  const { user } = useAuth();
  const capabilities = useSocialCapabilities();
  const myPostsQuery = useMyFeedPosts({ limit: 5 }, { enabled: capabilities.isCreator });
  const display = getUserDisplay(user, status);
  const nextStatus = useMemo(() => {
    const index = statusOptions.indexOf(status);
    return statusOptions[(index + 1) % statusOptions.length];
  }, [status]);

  return (
    <div>
      <div className="relative">
        <OrbitStage compact />
        <div className="pointer-events-none absolute left-1/2 top-[46%] z-[5] -translate-x-1/2 translate-y-[52px] text-center">
          <div className="text-[15px] font-extrabold">{display.name || "Max"} <VerifiedBadge /></div>
          <p className="mt-0.5 text-[10.5px] text-atseen-muted">@{display.username || "max"} - Dubai - 128 followers</p>
          <button
            className="pointer-events-auto mt-2 rounded-full border border-atseen-blue/25 bg-atseen-blue/10 px-3 py-1.5 text-[11px] font-bold text-atseen-blue"
            onClick={() => setStatus(nextStatus)}
            type="button"
          >
            {status || statusOptions[0]} <span className="ml-1 opacity-50">tap</span>
          </button>
        </div>
      </div>

      <div className="mt-[18px] flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px]">
        <span><b>128</b> <span className="text-atseen-muted">followers</span></span>
        <span><b>9</b> <span className="text-atseen-muted">posts</span></span>
        <span><b>2</b> <span className="text-atseen-muted">worlds</span></span>
        <span><b>1,240</b> <span className="text-atseen-muted">balance</span></span>
        <span><b>14</b> <span className="text-atseen-muted">saw you today</span></span>
      </div>

      <Link className="mt-[18px] flex items-center gap-3 rounded-[18px] border border-atseen-line bg-white/[0.04] p-4" to={capabilities.canAccessStudio ? "/studio" : "/settings/profile"}>
        <FiBarChart2 className="text-atseen-muted" />
        <span className="min-w-0 flex-1 text-[13px] font-bold text-atseen-muted">Professional dashboard</span>
        <FiChevronRight className="text-atseen-muted" />
      </Link>
      <VideoCard label="30 seconds of me" />
      <DreamCard />

      {myPostsQuery.data?.items?.length ? (
        <div className="mt-[26px]">
          <p className="mb-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">My Posts</p>
          {myPostsQuery.data.items.map((post) => (
            <FeedPost key={post.id} post={post} />
          ))}
        </div>
      ) : null}

      <p className="mb-1 mt-[26px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Most Useful</p>
      {[
        ["Advice - Dubai", "Stopped asking where to network, started hosting Sunday coffee on my rooftop. Four real friendships in two months.", 44, 7],
        ["Things to do - Dubai", "Kayak at Hatta before 7 AM. Cooler air, glass water, back by ten. Best free therapy in the UAE.", 61, 9],
      ].map(([tag, text, support, comments], index) => (
        <article className="border-b border-white/[0.05] py-3.5" key={tag}>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] text-atseen-muted">{Number(support) * 3} saved</span>
            <span className="rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">{tag}</span>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-white/85">{text}</p>
          <ActionBar comments={Number(comments)} id={`profile-note-${index}`} support={Number(support)} />
        </article>
      ))}
    </div>
  );
}

export function PrototypeActivityPage() {
  const { showToast } = useFanToast();
  const today = [
    ["lina", "Lina has seen you", "2h", FiEye],
    ["omar", "Omar shook hands on your note", "4h", FiCheck],
    ["sofia", "Sofia sent a gift on your dream +50", "6h", FiGift],
  ];
  const earlier = [
    ["james", "James stepped inside Morning Discipline", "1d", FiPlay],
    ["anna", "Anna replied to your comment", "1d", FiMessageCircle],
    ["ethan", "Ethan answered your Direct Access", "2d", FiZap],
  ];

  const row = ([id, text, time, Icon]) => {
    const creator = creators[id];
    return (
      <button className="flex w-full items-center gap-3 border-b border-white/[0.05] py-3.5 text-left" key={`${id}-${text}`} onClick={() => showToast(text)} type="button">
        <FanAvatar name={creator.name} size="h-[38px] w-[38px]" src={creator.avatar} />
        <p className="min-w-0 flex-1 text-[13px] leading-5 text-white/85"><Icon className="mr-1 inline text-atseen-blue" /> {text}</p>
        <span className="shrink-0 text-[10px] text-atseen-muted">{time}</span>
      </button>
    );
  };

  return (
    <div>
      <PageTitle>Activity</PageTitle>
      <button
        className="mt-[18px] flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border border-atseen-line bg-atseen-surface p-4 text-left"
        onClick={() => showToast("Who exactly stays private.")}
        type="button"
      >
        <span className="flex">
          {["women/44", "men/86", "women/79"].map((name, index) => (
            <img alt="" className={`h-[30px] w-[30px] rounded-full border border-atseen-bg object-cover blur-[3.5px] ${index ? "-ml-2" : ""}`} key={name} src={`https://randomuser.me/api/portraits/${name}.jpg`} />
          ))}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold">14 people saw you today</p>
          <p className="text-[11px] text-atseen-muted">Who exactly stays private - signals are always free</p>
        </div>
        <FiChevronRight className="text-atseen-muted" />
      </button>

      <p className="mb-1 mt-[22px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Today</p>
      {today.map(row)}
      <p className="mb-1 mt-[22px] text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">Earlier</p>
      {earlier.map(row)}
    </div>
  );
}
