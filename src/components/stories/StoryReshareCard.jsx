/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
export default function StoryReshareCard({ card }) {
  __useUiLanguage();
  const handle = card.username || String(card.subtitle || "").match(/@([^\s·]+)/)?.[1] || "";
  const name = String(card.title || handle).split(" ")[0];
  return <>
    <div className="story-reshare-card-media">
      {card.mediaType === "video" ? <video autoPlay loop muted playsInline src={card.imageUrl} /> : <img alt={__msg("stories.originalStory")} draggable={false} src={card.imageUrl} />}
      <span className="story-reshare-card-author">{card.avatarUrl ? <img alt="" draggable={false} src={card.avatarUrl} /> : <i aria-hidden="true">{name.slice(0, 1)}</i>}<b>{name}</b></span>
    </div>
    <span className="story-reshare-card-credit"><span>@</span>{handle}</span>
  </>;
}
