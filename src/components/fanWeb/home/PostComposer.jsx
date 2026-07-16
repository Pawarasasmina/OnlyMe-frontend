import { useState } from "react";
import { FiEdit3, FiImage, FiLayers, FiPenTool } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import { useFanToast } from "../shared/FanToastContext";
import { atseenStatuses } from "../../../data/atseenMockData";
import { useAuth } from "../../../hooks/useAuth";
import { canCreateStory } from "../../../utils/storyPermissions";

const createOptions = [
  { label: "Seen", description: "A quick public note for the feed.", icon: FiPenTool },
  { label: "Story", description: "A temporary moment for your orbit.", icon: FiImage, requiresStoryPermission: true },
  { label: "Home", description: "A longer note, ask, or useful sighting.", icon: FiEdit3 },
  { label: "World", description: "A chaptered experience people can step into.", icon: FiLayers },
];

function PostComposer({ currentUser, onStatusChange, status }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const [statusOpen, setStatusOpen] = useState(false);
  const [postingOpen, setPostingOpen] = useState(false);
  const visibleCreateOptions = createOptions.filter((option) => !option.requiresStoryPermission || canCreateStory(user));

  const chooseStatus = (nextStatus) => {
    onStatusChange(nextStatus);
    setStatusOpen(false);
    showToast(`Status: ${nextStatus}`);
  };

  return (
    <>
      <div className="my-[18px] flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-3.5 text-sm text-atseen-dim">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setPostingOpen(true)}
          type="button"
        >
          <FanAvatar name={currentUser.name} size="h-[34px] w-[34px]" src={currentUser.avatar} />
          <span className="truncate">Share what you&apos;ve seen...</span>
        </button>
        <button
          className="shrink-0 rounded-full border border-atseen-blue/25 bg-atseen-blue/10 px-3 py-1.5 text-[11px] font-bold text-atseen-blue transition hover:bg-atseen-blue/15"
          onClick={() => setStatusOpen(true)}
          type="button"
        >
          {status}
        </button>
      </div>

      <FanModal isOpen={statusOpen} onClose={() => setStatusOpen(false)} title="Choose a status">
        <div className="grid gap-2 sm:grid-cols-2">
          {atseenStatuses.map((item) => (
            <button
              className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                status === item
                  ? "border-atseen-blue/50 bg-atseen-blue/10 text-atseen-blue"
                  : "border-atseen-line bg-atseen-surface-2 text-atseen-text hover:border-atseen-blue/40"
              }`}
              key={item}
              onClick={() => chooseStatus(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </FanModal>

      <FanModal isOpen={postingOpen} onClose={() => setPostingOpen(false)} title="Create">
        <p className="text-sm leading-6 text-atseen-muted">
          Choose what you want to make. Desktop creation is staged here; publishing stays connected to the existing product flow.
        </p>
        <div className="mt-4 grid gap-2">
          {visibleCreateOptions.map(({ description, icon: Icon, label }) => (
            <button
              className="flex items-center gap-3 rounded-2xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-left transition hover:border-atseen-blue/45 hover:bg-atseen-blue/10"
              key={label}
              onClick={() => {
                setPostingOpen(false);
                showToast(`${label} creation will open here when publishing is enabled.`);
              }}
              type="button"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-atseen-blue/25 bg-atseen-blue/10 text-atseen-blue">
                <Icon aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-atseen-text">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-atseen-muted">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </FanModal>
    </>
  );
}

export default PostComposer;
