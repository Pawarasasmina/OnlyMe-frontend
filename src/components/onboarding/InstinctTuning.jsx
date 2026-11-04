/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { FiCheck, FiCompass, FiGlobe, FiLayers, FiRadio, FiUsers } from "react-icons/fi";

const groups = [
  {
    key: "creatorVibe",
    get title() { return __msg("onboarding.chooseYourMainSignal"); },
    Icon: FiRadio,
    options: [
      { value: "fresh", get title() { return __msg("onboarding.freshTrending"); }, get description() { return __msg("onboarding.newVoicesEmergingCreatorsAndWhatIsHappeningRight"); } },
      { value: "established", get title() { return __msg("onboarding.confidentEstablished"); }, get description() { return __msg("onboarding.peopleWithAClearPointOfViewAndProven"); } },
      { value: "mature", get title() { return __msg("onboarding.matureInspiring"); }, get description() { return __msg("onboarding.thoughtfulCreatorsLifeLessonsAndDeeperJourneys"); } },
      { value: "any", get title() { return __msg("onboarding.noPreference"); }, get description() { return __msg("onboarding.keepDiscoveryBroadAndLetAtseenLearnOverTime"); } },
    ],
  },
  {
    key: "showMe",
    get title() { return __msg("onboarding.showMe"); },
    Icon: FiUsers,
    options: [
      { value: "everyone", get title() { return __msg("onboarding.everyone"); }, get description() { return __msg("onboarding.keepDiscoveryOpen"); } },
      { value: "women", get title() { return __msg("onboarding.women"); }, get description() { return __msg("onboarding.prioritizeWomenCreatorsInDiscovery"); } },
      { value: "men", get title() { return __msg("onboarding.men"); }, get description() { return __msg("onboarding.prioritizeMenCreatorsInDiscovery"); } },
    ],
  },
  {
    key: "creatorStyle",
    get title() { return __msg("onboarding.whichFeelsCloser"); },
    Icon: FiLayers,
    options: [
      { value: "personal", get title() { return __msg("onboarding.realRoutines"); }, get description() { return __msg("onboarding.honestLivedUnpolishedMoments"); } },
      { value: "aspirational", get title() { return __msg("onboarding.polishedInspiration"); }, get description() { return __msg("onboarding.elevatedIdeasAndFutureFacingVisuals"); } },
      { value: "practical", get title() { return __msg("onboarding.practicalAdvice"); }, get description() { return __msg("onboarding.usefulStepsYouCanApplyQuickly"); } },
      { value: "educational", get title() { return __msg("onboarding.establishedExperts"); }, get description() { return __msg("onboarding.peopleWhoCanTeachFromExperience"); } },
      { value: "any", get title() { return __msg("onboarding.noPreference"); }, get description() { return __msg("onboarding.letAtseenMixTheStyles"); } },
    ],
  },
  {
    key: "discoveryRange",
    get title() { return __msg("onboarding.whereShouldDiscoveryBegin"); },
    Icon: FiGlobe,
    options: [
      { value: "city", get title() { return __msg("onboarding.localDiscoveries"); }, get description() { return __msg("onboarding.startWithPeopleCloserToYourCity"); } },
      { value: "country", get title() { return __msg("onboarding.myCountry"); }, get description() { return __msg("onboarding.keepItFamiliarButWider"); } },
      { value: "global", get title() { return __msg("onboarding.globalStories"); }, get description() { return __msg("onboarding.letTheWorldIn"); } },
    ],
  },
  {
    key: "contentDepth",
    get title() { return __msg("onboarding.whatRhythmFeelsRight"); },
    Icon: FiCompass,
    options: [
      { value: "quick", get title() { return __msg("onboarding.quickMoments"); }, get description() { return __msg("onboarding.usefulDiscoveriesAtAGlance"); } },
      { value: "deep", get title() { return __msg("onboarding.personalJourneys"); }, get description() { return __msg("onboarding.longerLivedStoriesWithDepth"); } },
      { value: "both", get title() { return __msg("onboarding.both"); }, get description() { return __msg("onboarding.aBalancedHomeAndOrbit"); } },
    ],
  },
];

function InstinctTuning({ onChange, values }) {
  __useUiLanguage();
  return (
    <div className="onboarding-instincts space-y-4">
      {groups.map((group, groupIndex) => {
        const Icon = group.Icon;
        return (
          <section className="onboarding-instinct-group rounded-[18px] border border-white/10 bg-white/[0.035] p-3.5" key={group.key} style={{ "--instinct-index": `"${groupIndex + 1}"` }}>
            <div className="flex items-center gap-3">
              <span className="onboarding-instinct-icon grid h-9 w-9 place-items-center rounded-xl border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 text-sm text-[#9CCBFF]">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">{__msg("onboarding.instinct")} {groupIndex + 1} {__msg("onboarding.of")} {groups.length}</p>
                <h2 dir="auto" className="mt-1 text-base font-black text-white">{group.title}</h2>
              </div>
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {group.options.map((option) => {
                const selected = values[group.key] === option.value;
                return (
                  <button
                    aria-pressed={selected}
                    className={`onboarding-instinct-option min-h-20 rounded-xl border p-3.5 text-start transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CCBFF] ${selected ? "is-selected border-[#9CCBFF] bg-[#9CCBFF]/12 text-white shadow-[0_0_24px_rgba(156,203,255,.16)]" : "border-white/10 bg-[#12151B] text-white/62 hover:border-white/25 hover:text-white"}`}
                    key={option.value}
                    onClick={() => onChange(group.key, option.value)}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span dir="auto" className="block text-sm font-black">{option.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-white/45">{option.description}</span>
                      </span>
                      {selected ? <FiCheck className="mt-0.5 shrink-0 text-[#9CCBFF]" aria-hidden="true" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default InstinctTuning;
