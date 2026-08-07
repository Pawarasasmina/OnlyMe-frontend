const QUICK_REACTIONS = [
  { label: "love", value: "\u2764\ufe0f" },
  { label: "fire", value: "\ud83d\udd25" },
  { label: "laugh", value: "\ud83d\ude02" },
  { label: "support", value: "\ud83d\ude4f" },
];

function SeenEyeIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,.55)]" viewBox="0 0 64 40">
      <path d="M2 20C14 3 50 3 62 20C50 37 14 37 2 20Z" fill="currentColor" />
      <circle cx="32" cy="20" fill="#0A0C0F" r="8.5" />
    </svg>
  );
}

function StoryReactionTray({ canReact = true, canSeeYou = false, onReact, onSeeYou, pending = false, seeYouPending = false, selectedReaction }) {
  const reactions = canReact ? QUICK_REACTIONS : [];

  return (
    <div className="px-1">
      <div className="flex items-center justify-between gap-4">
        {reactions.length ? (
          <div aria-label="Story reactions" className="flex min-w-0 flex-1 items-center justify-between gap-3" role="group">
            {reactions.map(({ label, value }) => (
              <button
                aria-label={`React with ${label}`}
                aria-pressed={selectedReaction === value}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-[27px] drop-shadow-[0_2px_8px_rgba(0,0,0,.5)] transition ${
                  selectedReaction === value ? "scale-110 bg-white/15" : "hover:bg-white/10 hover:scale-105"
                } ${pending ? "cursor-wait opacity-70" : ""}`}
                disabled={pending || !canReact}
                key={value}
                onClick={() => onReact?.(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}
        {canSeeYou ? (
          <button
            aria-label="Send I SEE YOU"
            className={`group flex h-12 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 text-white shadow-[0_10px_28px_rgba(0,0,0,.35)] backdrop-blur transition hover:border-white/45 hover:bg-white/12 hover:scale-[1.03] ${seeYouPending ? "cursor-wait opacity-70" : ""}`}
            disabled={seeYouPending}
            onClick={() => onSeeYou?.()}
            type="button"
          >
            <SeenEyeIcon />
            <span className="hidden text-[9px] font-black uppercase tracking-[0.12em] text-white/80 sm:inline">I see you</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default StoryReactionTray;
