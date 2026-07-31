import { FiCheck, FiCompass, FiGlobe, FiLayers, FiRadio, FiUsers } from "react-icons/fi";

const groups = [
  {
    key: "creatorVibe",
    title: "Choose your main signal",
    Icon: FiRadio,
    options: [
      { value: "fresh", title: "Fresh & Trending", description: "New voices, emerging creators and what is happening right now." },
      { value: "established", title: "Confident & established", description: "People with a clear point of view and proven experience." },
      { value: "mature", title: "Mature & inspiring", description: "Thoughtful creators, life lessons and deeper journeys." },
      { value: "any", title: "No preference", description: "Keep discovery broad and let Atseen learn over time." },
    ],
  },
  {
    key: "showMe",
    title: "Show me",
    Icon: FiUsers,
    options: [
      { value: "everyone", title: "Everyone", description: "Keep discovery open." },
      { value: "women", title: "Women", description: "Prioritize women creators in discovery." },
      { value: "men", title: "Men", description: "Prioritize men creators in discovery." },
    ],
  },
  {
    key: "creatorStyle",
    title: "Which feels closer?",
    Icon: FiLayers,
    options: [
      { value: "personal", title: "Real routines", description: "Honest, lived, unpolished moments." },
      { value: "aspirational", title: "Polished inspiration", description: "Elevated ideas and future-facing visuals." },
      { value: "practical", title: "Practical advice", description: "Useful steps you can apply quickly." },
      { value: "educational", title: "Established experts", description: "People who can teach from experience." },
      { value: "any", title: "No preference", description: "Let Atseen mix the styles." },
    ],
  },
  {
    key: "discoveryRange",
    title: "Where should discovery begin?",
    Icon: FiGlobe,
    options: [
      { value: "city", title: "Local discoveries", description: "Start with people closer to your city." },
      { value: "country", title: "My country", description: "Keep it familiar, but wider." },
      { value: "global", title: "Global stories", description: "Let the world in." },
    ],
  },
  {
    key: "contentDepth",
    title: "What rhythm feels right?",
    Icon: FiCompass,
    options: [
      { value: "quick", title: "Quick moments", description: "Useful discoveries at a glance." },
      { value: "deep", title: "Personal journeys", description: "Longer lived stories with depth." },
      { value: "both", title: "Both", description: "A balanced Home and Orbit." },
    ],
  },
];

function InstinctTuning({ onChange, values }) {
  return (
    <div className="space-y-5">
      {groups.map((group, groupIndex) => {
        const Icon = group.Icon;
        return (
          <section className="rounded-[20px] border border-white/10 bg-white/[0.035] p-4" key={group.key}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-[#9CCBFF]/20 bg-[#9CCBFF]/10 text-[#9CCBFF]">
                <Icon aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">Instinct {groupIndex + 1} of {groups.length}</p>
                <h2 className="mt-1 text-lg font-black text-white">{group.title}</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {group.options.map((option) => {
                const selected = values[group.key] === option.value;
                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-24 rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9CCBFF] ${selected ? "border-[#9CCBFF] bg-[#9CCBFF]/12 text-white shadow-[0_0_24px_rgba(156,203,255,.16)]" : "border-white/10 bg-[#12151B] text-white/62 hover:border-white/25 hover:text-white"}`}
                    key={option.value}
                    onClick={() => onChange(group.key, option.value)}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-black">{option.title}</span>
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
