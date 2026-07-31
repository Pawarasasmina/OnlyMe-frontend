const QUICK_REACTIONS = [
  { label: "heart", value: "❤️" },
  { label: "fire", value: "🔥" },
  { label: "applause", value: "👏" },
  { label: "laugh", value: "😂" },
  { label: "surprise", value: "😮" },
  { label: "spark", value: "✦" },
];

function StoryReactionTray({ disabled = false, onReact, pending = false, selectedReaction }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/35 p-1.5 backdrop-blur">
      <div className="flex items-center justify-between gap-1">
        {QUICK_REACTIONS.map(({ label, value }) => (
          <button
            aria-label={`React with ${label}`}
            aria-pressed={selectedReaction === value}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
              selectedReaction === value ? "bg-atseen-blue text-atseen-bg" : "hover:bg-white/15"
            } ${pending ? "cursor-wait opacity-70" : ""}`}
            disabled={disabled || pending}
            key={value}
            onClick={() => onReact(value)}
            type="button"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

export default StoryReactionTray;
