import { optionLabel as __optionLabel } from "../../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { FiCheck } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { WALL_FILTER_TOPICS } from "../../../data/wallFilters";
const types = {
  "buy & sell": ["Buy & Sell", "buy_sell"], "buy/sell": ["Offering", "offering"],
  "looking for": ["Looking for", "looking_for"], offering: ["Offering", "offering"],
  "need help": ["Need help", "need_help"], question: ["Question", "question"], advice: ["Question", "question"],
  recommendation: ["Recommendation", "recommendation"], event: ["Event", "event"], events: ["Event", "event"],
  "right now": ["Right now", "right_now"],
};
export default function WallPostTypeBadge({ postType, topic, context, rightNow, closedLabel = "", topicOnly = false }) {
  __useUiLanguage();
  const location = useLocation();
  const [type, typeKey] = types[String(postType || context || "").trim().toLowerCase()] || ["Community", ""];
  const topicLabel = topic || (!postType ? context : "");
  const topicKey = WALL_FILTER_TOPICS.find(item => (item.sourceLabel || item.label).toLowerCase() === String(topicLabel).toLowerCase())?.value;
  const target = (field, value) => {
    const params = new URLSearchParams(location.pathname === "/wall" ? location.search : "");
    for (const key of ["note", "filter", "type", "topic", "q", "compose", "composeRequest", "question"]) params.delete(key);
    params.set(field, value);
    return `/wall?${params}`;
  };
  if (topicOnly) return topicKey && topicLabel.toLowerCase() !== type.toLowerCase() ? <Link className="wall-post-topic-link wall-note-topic" aria-label={__msg("fanWeb.filterWallByTopic", { value0: topicLabel })} to={target("topic",topicKey)}>{__optionLabel(topicLabel)}</Link> : null;
  return <span className={`wall-post-type ${closedLabel ? "is-closed" : ""}`} data-closed-good={["Solved", "Sold", "Found"].includes(closedLabel) ? "true" : "false"}>
    <Link aria-label={__msg("fanWeb.filterWallBy", { value0: type })} className="wall-post-type-link" to={target(typeKey ? "type" : "topic",typeKey || topicKey || "community")}>{["Sold", "Solved", "Found"].includes(closedLabel) ? <FiCheck aria-hidden="true" /> : null}{__optionLabel(closedLabel || type)}</Link>
    {rightNow && !closedLabel ? <span className="wall-now-badge">{__msg("fanWeb.now")}</span> : null}
  </span>;
}
