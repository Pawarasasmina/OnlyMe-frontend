/* i18n-source-migrated */
import { msg as __msg } from "../../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { useQuery } from "@tanstack/react-query";
import { postService } from "../../../services/postService";
import { FiX } from "react-icons/fi";
import WallNeedIcon from "./WallNeedIcon";

const NEEDS = [
  { key: "need_help", get label() { return __msg("fanWeb.needHelp"); }, type: "Need Help", get description() { return __msg("fanWeb.somethingWentWrongPeopleNearbyCanStepIn"); } },
  { key: "looking_for", get label() { return __msg("fanWeb.lookingFor"); }, type: "Looking for", get description() { return __msg("fanWeb.aPersonAServiceOrAThing"); } },
  { key: "offering", get label() { return __msg("fanWeb.offering"); }, type: "Offering", get description() { return __msg("fanWeb.yourHelpSkillOrService"); } },
  { key: "buy_sell", get label() { return __msg("fanWeb.buySell"); }, type: "Buy & Sell", get description() { return __msg("fanWeb.sellSomethingOrFindItSecondHand"); } },
  { key: "question", get label() { return __msg("fanWeb.question"); }, type: "Question", get description() { return __msg("fanWeb.askThePeopleAroundYou"); } },
  { key: "recommendation", get label() { return __msg("fanWeb.recommendation"); }, type: "Recommendation", get description() { return __msg("fanWeb.aPlaceOrPersonWorthIt"); } },
  { key: "event", get label() { return __msg("fanWeb.event"); }, type: "Event", get description() { return __msg("fanWeb.invitePeopleSomewhere"); } },
];

export default function WallNeedPicker({ onClose, onSelect, location = "", viewerId }) {
  __useUiLanguage();
  const params = { scope: location ? "custom" : "worldwide", location };
  const countsQuery = useQuery({
    queryKey: ["feed-posts", "need-counts", viewerId, params],
    queryFn: () => postService.getNeedCounts(params),
    staleTime: 15000,
    refetchOnMount: "always",
    retry: false,
  });
  return <section aria-labelledby="wall-need-title" className="wall-need-picker">
    <button aria-label={__msg("fanWeb.closeNeedPicker")} className="wall-need-close" onClick={onClose} type="button"><FiX /></button>
    <div className="wall-need-content">
      <h1 id="wall-need-title">{__msg("fanWeb.whatDoYouNeedToday")}</h1>
      <p>{__msg("fanWeb.chooseWhatFitsPeopleNearbyWillSeeItAnd")}</p>
      {countsQuery.isError ? <button className="wall-need-retry" onClick={() => countsQuery.refetch()} type="button">{__msg("fanWeb.couldNotLoadActivityRetry")}</button> : null}
      <div className="wall-need-grid">
        {NEEDS.map((need) => <button className="wall-need-card" key={need.label} onClick={() => onSelect(need)} type="button">
          <WallNeedIcon kind={need.key} />
          <strong>{need.label}</strong>
          <span>{need.description}</span>
          <small>{countsQuery.isPending ? __msg("fanWeb.loading_5fabab") : countsQuery.isError ? __msg("fanWeb.countUnavailable") : countsQuery.data?.counts?.[need.key] ? __msg("fanWeb.active_be09be", { value0: countsQuery.data.counts[need.key], value1: location ? "nearby" : "on Wall" }) : location ? __msg("fanWeb.quietNearby") : __msg("fanWeb.quietForNow")}</small>
        </button>)}
      </div>
    </div>
  </section>;
}
