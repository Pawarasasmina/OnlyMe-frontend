/* i18n-source-migrated */
import { msg as __msg, optionLabel } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";

const DEFAULT_TOPICS = ["Photography", "Travel", "Fitness", "Food", "Music", "Gaming", "Fashion", "Art", "Business", "Technology", "Lifestyle", "Education", "Sports", "Pets", "Comedy"];
const STATES = ["neutral", "interested", "less"];

function nextPreference(current) {
  const index = STATES.indexOf(current || "neutral");
  return STATES[(index + 1) % STATES.length];
}

function topicMap(settings = {}, tags = []) {
  const map = new Map((settings.topics || []).map((topic) => [topic.label, topic.preference]));
  return [...new Set([...tags, ...DEFAULT_TOPICS])].map((label) => ({ label, preference: map.get(label) || "neutral" }));
}

function Toggle({ checked, label, onChange }) {
  __useUiLanguage();
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-atseen-line bg-white/[0.035] px-4 py-3">
      <span className="text-sm font-bold text-white">{label}</span>
      <button
        aria-checked={checked}
        className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-atseen-blue" : "bg-white/12"}`}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </label>
  );
}

function topicClasses(preference) {
  if (preference === "interested") return "border-atseen-blue bg-atseen-blue text-atseen-bg";
  if (preference === "less") return "border-atseen-danger/40 bg-atseen-danger/12 text-atseen-danger";
  return "border-atseen-line bg-white/[0.035] text-atseen-muted hover:text-white";
}

function DiscoverSettingsModal({ interestTags = [], isOpen, onClose, onReset, onSave, resetPending, savePending, settings = {} }) {
  __useUiLanguage();
  const initialTopics = useMemo(() => topicMap(settings, interestTags), [interestTags, settings]);
  const [draft, setDraft] = useState({ ...settings, topics: initialTopics });
  const [languageText, setLanguageText] = useState((settings.languages || []).join(", "));

  useEffect(() => {
    if (!isOpen) return;
    const nextTopics = topicMap(settings, interestTags);
    setDraft({ ...settings, topics: nextTopics });
    setLanguageText((settings.languages || []).join(", "));
  }, [interestTags, isOpen, settings]);

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleTopic = (label) => {
    setDraft((current) => ({
      ...current,
      topics: (current.topics || []).map((topic) => topic.label === label ? { ...topic, preference: nextPreference(topic.preference) } : topic),
    }));
  };

  const save = () => {
    onSave({
      ...draft,
      languages: languageText.split(",").map((item) => item.trim()).filter(Boolean),
      topics: (draft.topics || []).filter((topic) => topic.preference !== "neutral"),
    });
  };

  return (
    <FanModal className="max-w-xl" isOpen={isOpen} onClose={onClose} title={__msg("discover.recommendationSettings")}>
      <div className="space-y-5">
        <section>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">{__msg("discover.recommendations")}</h3>
          <div className="mt-3 grid gap-2">
            <Toggle checked={draft.recommendations !== false} label={__msg("discover.recommendations")} onChange={(value) => setField("recommendations", value)} />
            <Toggle checked={draft.peopleNearby !== false} label={__msg("discover.peopleNearby")} onChange={(value) => setField("peopleNearby", value)} />
            <Toggle checked={draft.risingCreators !== false} label={__msg("discover.risingCreators")} onChange={(value) => setField("risingCreators", value)} />
            <Toggle checked={draft.newCreators !== false} label={__msg("discover.newCreators")} onChange={(value) => setField("newCreators", value)} />
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">{__msg("discover.interestPreferences")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(draft.topics || []).map((topic) => (
              <button className={`rounded-full border px-3 py-2 text-xs font-extrabold transition ${topicClasses(topic.preference)}`} key={topic.label} onClick={() => toggleTopic(topic.label)} type="button">
                {optionLabel(topic.label)}{topic.preference === "interested" ? __msg("discover.interested") : topic.preference === "less" ? __msg("discover.less") : ""}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-atseen-muted">{__msg("discover.languages")}</span>
            <input className="mt-2 h-11 w-full rounded-2xl border border-atseen-line bg-white/[0.035] px-3 text-sm text-white outline-none focus:border-atseen-blue" onChange={(event) => setLanguageText(event.target.value)} value={languageText} />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-atseen-muted">{__msg("discover.preferredCity")}</span>
            <input className="mt-2 h-11 w-full rounded-2xl border border-atseen-line bg-white/[0.035] px-3 text-sm text-white outline-none focus:border-atseen-blue" onChange={(event) => setField("preferredCity", event.target.value)} value={draft.preferredCity || ""} />
          </label>
        </section>

        <section className="rounded-2xl border border-atseen-line bg-white/[0.025] p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-atseen-blue">{__msg("discover.hiddenCreators")}</h3>
          <p className="mt-2 text-sm text-atseen-muted">{draft.hiddenCreators?.length ? __msg("discover.creatorsHiddenFromDiscover", { value0: draft.hiddenCreators.length }) : __msg("discover.noCreatorsHiddenFromDiscover")}</p>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-atseen-danger/30 px-4 text-sm font-extrabold text-atseen-danger hover:bg-atseen-danger/10" disabled={resetPending} onClick={onReset} type="button">
            <FiRefreshCw aria-hidden="true" className={resetPending ? "animate-spin" : ""} />{__msg("discover.resetDiscover")}</button>
          <button className="min-h-11 rounded-full bg-atseen-blue px-5 text-sm font-black text-atseen-bg hover:bg-white disabled:opacity-60" disabled={savePending} onClick={save} type="button">{__msg("discover.saveSettings")}</button>
        </div>
      </div>
    </FanModal>
  );
}

export default DiscoverSettingsModal;
