import { useQuery } from "@tanstack/react-query";
import { postService } from "../../../services/postService";
import { FiCalendar, FiGift, FiHelpCircle, FiLifeBuoy, FiSearch, FiStar, FiTag, FiX } from "react-icons/fi";

const NEEDS = [
  { key: "need_help", label: "Need help", type: "Need Help", icon: FiLifeBuoy, description: "Something went wrong — people nearby can step in" },
  { key: "looking_for", label: "Looking for", type: "Looking for", icon: FiSearch, description: "A person, a service or a thing" },
  { key: "offering", label: "Offering", type: "Offering", icon: FiGift, description: "Your help, skill or service" },
  { key: "buy_sell", label: "Buy & Sell", type: "Buy & Sell", icon: FiTag, description: "Sell something or find it second-hand" },
  { key: "question", label: "Question", type: "Question", icon: FiHelpCircle, description: "Ask the people around you" },
  { key: "recommendation", label: "Recommendation", type: "Recommendation", icon: FiStar, description: "A place or person worth it" },
  { key: "event", label: "Event", type: "Event", icon: FiCalendar, description: "Invite people somewhere" },
];

export default function WallNeedPicker({ onClose, onSelect, location = "", viewerId }) {
  const params = { scope: location ? "custom" : "worldwide", location };
  const countsQuery = useQuery({
    queryKey: ["feed-posts", "need-counts", viewerId, params],
    queryFn: () => postService.getNeedCounts(params),
    staleTime: 15000,
    refetchOnMount: "always",
    retry: false,
  });
  return <section aria-labelledby="wall-need-title" className="wall-need-picker">
    <button aria-label="Close need picker" className="wall-need-close" onClick={onClose} type="button"><FiX /></button>
    <div className="wall-need-content">
      <h1 id="wall-need-title">What do you need today?</h1>
      <p>Choose what fits. People nearby will see it and reply.</p>
      {countsQuery.isError ? <button className="wall-need-retry" onClick={() => countsQuery.refetch()} type="button">Could not load activity. Retry</button> : null}
      <div className="wall-need-grid">
        {NEEDS.map(({ icon: Icon, ...need }) => <button className="wall-need-card" key={need.label} onClick={() => onSelect(need)} type="button">
          <Icon aria-hidden="true" />
          <strong>{need.label}</strong>
          <span>{need.description}</span>
          <small>{countsQuery.isPending ? "Loading?" : countsQuery.isError ? "Count unavailable" : countsQuery.data?.counts?.[need.key] ? `${countsQuery.data.counts[need.key]} active ${location ? "nearby" : "on Wall"}` : location ? "Quiet nearby" : "Quiet for now"}</small>
        </button>)}
      </div>
    </div>
  </section>;
}
