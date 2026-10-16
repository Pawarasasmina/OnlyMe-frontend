import { useState } from "react";
import { FiMapPin, FiTag } from "react-icons/fi";

const legacyTypes = { "buy/sell": "Offering", "advice": "Question", "events": "Event", "looking for": "Looking for", "need help": "Need Help", "recommendation": "Recommendation", "right now": "Right Now" };

export default function WallPostTypeBadge({ postType, topic, location, context }) {
  const [step, setStep] = useState(0);
  const legacyType = legacyTypes[String(context || "").trim().toLowerCase()];
  const type = postType || legacyType || "Community";
  const topicLabel = topic || (!legacyType ? context : "");
  const tags = [{ kind: "Type", text: type }, ...(topicLabel ? [{ kind: "Topic", text: topicLabel }] : []), ...(location ? [{ kind: "Location", text: location }] : [])];
  const index = step % tags.length;
  const tag = tags[index];
  const next = tags[(index + 1) % tags.length];
  return <div className="wall-post-type">
    <button aria-label={`${tag.kind}: ${tag.text}${tags.length > 1 ? `. Show ${next.kind.toLowerCase()}: ${next.text}` : ""}`} className="home-context-pill" data-type={type.toLowerCase().replaceAll(" ", "-")} onClick={() => setStep((value) => (value + 1) % tags.length)} title={`${tag.kind}: ${tag.text}${tags.length > 1 ? ` ? tap to show ${next.kind.toLowerCase()}` : ""}`} type="button">
      {tag.kind === "Topic" && <FiTag aria-hidden="true" />}
      {tag.kind === "Location" && <FiMapPin aria-hidden="true" />}
      <span>{tag.text}</span>
    </button>
  </div>;
}
