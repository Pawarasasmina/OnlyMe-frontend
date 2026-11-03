/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useState } from "react";
import { STORY_QUICK_REACTIONS, STORY_REACTIONS } from "../../constants/storyReactions";

function SeenEyeIcon() {
  __useUiLanguage();
  return (
    <svg aria-hidden="true" className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,.55)]" viewBox="0 0 64 40">
      <path d="M2 20C14 3 50 3 62 20C50 37 14 37 2 20Z" fill="currentColor" />
      <circle cx="32" cy="20" fill="#0A0C0F" r="8.5" />
    </svg>
  );
}

function StoryReactionTray({ canReact = true, canSeeYou = false, onReact, onSeeYou, pending = false, seeYouPending = false, selectedReaction }) {
  __useUiLanguage();
  const [expanded, setExpanded] = useState(false);
  const reactions = canReact ? (expanded ? STORY_REACTIONS : STORY_QUICK_REACTIONS).map((value) => ({ label: value, value })) : [];

  return (
    <div className="px-1">
      <div className="flex items-center justify-between gap-4">
        {reactions.length ? (
          <div aria-label={__msg("stories.storyReactions")} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-1" role="group">
            {reactions.map(({ label, value }) => (
              <button
                aria-label={__msg("profile.reactWith", { value0: label })}
                aria-pressed={selectedReaction === value}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-[27px] drop-shadow-[0_2px_8px_rgba(0,0,0,.5)] transition ${
                  selectedReaction === value ? "scale-110 bg-white/15" : "hover:bg-white/10 hover:scale-105"
                } ${pending ? "cursor-wait opacity-70" : ""}`}
                disabled={pending || !canReact}
                key={value}
                onClick={() => onReact?.(selectedReaction === value ? null : value)}
                type="button"
              >
                {value}
              </button>
            ))}
            <button aria-label={expanded ? __msg("profile.fewerReactions") : __msg("fanWeb.moreReactions")} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} type="button">{expanded ? "−" : "+"}</button>
          </div>
        ) : null}
        {canSeeYou ? (
          <button
            aria-label={__msg("stories.sendISeeYou")}
            className={`group flex h-12 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 text-white shadow-[0_10px_28px_rgba(0,0,0,.35)] backdrop-blur transition hover:border-white/45 hover:bg-white/12 hover:scale-[1.03] ${seeYouPending ? "cursor-wait opacity-70" : ""}`}
            disabled={seeYouPending}
            onClick={() => onSeeYou?.()}
            type="button"
          >
            <SeenEyeIcon />
            <span className="hidden text-[9px] font-black uppercase tracking-[0.12em] text-white/80 sm:inline">{__msg("discover.iSeeYou")}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default StoryReactionTray;
