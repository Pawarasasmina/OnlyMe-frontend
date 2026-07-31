import { Link, useNavigate } from "react-router-dom";
import { FiBriefcase, FiCheck, FiCircle, FiEdit3, FiEye, FiImage, FiMap, FiMapPin, FiNavigation, FiRadio, FiUser, FiUsers, FiX } from "react-icons/fi";
import { useDismissChecklist, useOnboardingChecklist, useTrackChecklistEvent } from "../../hooks/useOnboardingChecklist";

const icons = {
  interestsSelected: FiMap,
  instinctsTuned: FiRadio,
  followedFirstPeople: FiUsers,
  profilePhoto: FiImage,
  cityAdded: FiMapPin,
  statusSet: FiEdit3,
  coverPhoto: FiImage,
  bioAdded: FiUser,
  watchedIntro: FiEye,
  openedOrbit: FiNavigation,
  openedStudio: FiBriefcase,
  createdFirstPost: FiCircle,
  sharedFirstStory: FiCircle,
  createdFirstWorld: FiMap,
  reactedToStory: FiCircle,
  visitedWorld: FiMap,
  completedProfile: FiUser,
};

function ChecklistSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => <div className="h-12 animate-pulse rounded-2xl bg-white/5" key={item} />)}
    </div>
  );
}

const eventByTask = {
  watchedIntro: "watchedIntro",
  openedOrbit: "openedOrbit",
  openedStudio: "openedStudio",
  sharedFirstStory: "sharedFirstStory",
  reactedToStory: "reactedToStory",
  visitedWorld: "visitedWorld",
};

function LightYourWorldChecklist({ compact = false, forceVisible = false, onboardingMode = false }) {
  const navigate = useNavigate();
  const checklist = useOnboardingChecklist();
  const trackEvent = useTrackChecklistEvent();
  const dismiss = useDismissChecklist();
  const data = checklist.data;

  if (checklist.isLoading) {
    return (
      <section className="rounded-[20px] border border-white/10 bg-[#12151B] p-4">
        <ChecklistSkeleton />
      </section>
    );
  }

  if (checklist.isError || !data || (!forceVisible && (data.dismissedAt || data.completed === data.total))) {
    return null;
  }

  const openTask = (task) => {
    const event = eventByTask[task.key];
    if (event) {
      trackEvent.mutate(event);
    }
    navigate(task.href);
  };

  return (
    <section className={`rounded-[20px] border border-[#9CCBFF]/20 bg-[#12151B] ${compact ? "p-4" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">{data.title} <span className="text-[#9CCBFF]">✦</span></h2>
          <p className="mt-1 text-xs leading-5 text-white/45">{data.subtitle}</p>
        </div>
        {!compact && !onboardingMode ? (
          <button aria-label="Dismiss checklist" className="rounded-full p-1 text-white/35 hover:bg-white/5 hover:text-white/70" onClick={() => dismiss.mutate()} type="button">
            <FiX aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-[#9CCBFF]" style={{ width: `${data.progress}%` }} />
        </div>
        <span className="text-xs font-black text-white/62">{data.completed} / {data.total}</span>
      </div>
      <div className="mt-4 space-y-2">
        {data.tasks.map((task) => {
          const Icon = icons[task.key] || FiCircle;
          return (
            <button
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${task.completed ? "border-white/5 bg-white/[0.025] opacity-60" : "border-white/10 bg-white/[0.035] hover:border-[#9CCBFF]/35 hover:bg-[#9CCBFF]/8"}`}
              disabled={task.completed}
              key={task.key}
              onClick={() => openTask(task)}
              type="button"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${task.completed ? "border-[#6ECF97]/35 bg-[#6ECF97]/10 text-[#6ECF97]" : "border-[#9CCBFF]/25 bg-[#9CCBFF]/10 text-[#9CCBFF]"}`}>
                {task.completed ? <FiCheck aria-hidden="true" /> : <Icon aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-black ${task.completed ? "text-white/45 line-through" : "text-white"}`}>{task.title}</span>
                {!task.completed ? <span className="mt-0.5 block truncate text-[11px] text-white/42">{task.description}</span> : null}
              </span>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${task.required ? "border-[#9CCBFF]/25 text-[#9CCBFF]" : "border-white/10 text-white/35"}`}>
                {task.required ? "Required" : "Optional"}
              </span>
            </button>
          );
        })}
      </div>
      {data.reward?.enabled ? (
        <p className="mt-4 rounded-2xl border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 p-3 text-xs font-bold text-[#9CCBFF]">Welcome Stars unlock when all five are complete.</p>
      ) : null}
      {!compact && !onboardingMode ? <Link className="mt-3 block text-center text-xs font-bold text-[#9CCBFF]" to="/settings/profile">Tune profile details</Link> : null}
    </section>
  );
}

export default LightYourWorldChecklist;
