import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { FiBriefcase, FiStar, FiUser } from "react-icons/fi";

const types = [
  { id: "personal", get title() { return __msg("profile.personal"); }, icon: FiUser, get copy() { return __msg("profile.shareYourLifeAndFollowPeopleGiftsDreamAnd"); } },
  { id: "creator", get title() { return __msg("discover.creator"); }, icon: FiStar, get copy() { return __msg("profile.forPeopleBuildingAnAudienceAddsWorldDirectAccess"); } },
  { id: "business", get title() { return __msg("profile.business"); }, icon: FiBriefcase, get copy() { return __msg("profile.forBrandsShopsAndPlacesEverythingCreatorsGetPlus"); } },
];

export default function AccountTypePicker({ onChange, value }) {
  __useUiLanguage();
  return <div className="grid gap-3">{types.map(({ id, title, icon: Icon, copy }) => {
    const selected = value === id;
    return <button aria-pressed={selected} className={`flex min-h-[88px] w-full items-start gap-3 rounded-2xl px-4 py-[14px] text-left transition active:scale-[.97] ${selected ? "border-[1.5px] border-[#9CCBFF]/70 bg-[#9CCBFF]/[.08]" : "border border-white/[.08] bg-white/[.04]"}`} key={id} onClick={() => onChange(id)} type="button">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${selected ? "bg-[#9CCBFF]/15 text-[#BFE3FF]" : "bg-white/[.06] text-white/55"}`}><Icon /></span>
      <span className="min-w-0 flex-1"><b className="block text-[15px] text-white">{title}</b><small className="mt-1 block text-[12.5px] leading-5 text-white/55">{copy}</small></span>
      <span className={`mt-2 h-5 w-5 shrink-0 rounded-full ${selected ? "bg-[#9CCBFF] shadow-[inset_0_0_0_5px_#0E1520]" : "border border-white/25"}`} />
    </button>;
  })}</div>;
}
