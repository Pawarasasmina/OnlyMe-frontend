import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { localizedTuple as __uiTuple } from "../../i18n/runtime.js";
import { msg as __msg } from "../../i18n/runtime.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit3,
  FiEye,
  FiExternalLink,
  FiLock,
  FiLoader,
  FiMapPin,
  FiMic,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiPlus,
  FiSettings,
  FiSquare,
  FiTrash2,
  FiUpload,
  FiX,
  FiZap,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { formatVoiceTime, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import MinimalWorldIcon from "../../components/world/MinimalWorldIcon";
import StoryCreator from "../../components/stories/StoryCreator";
import UniversalLocationPicker from "../../components/location/UniversalLocationPicker";
import { publicationService as api } from "../../services/publicationService";
import { authService } from "../../services/authService";
import { normalizeTags, publicationError } from "../../utils/publicationValidation";
import { worldCompletenessBySection } from "../../utils/worldValidation";
import { SeenChapterEditor, VideoTrimSheet, chapterBlocksWithStory, chapterStoryText } from "./SeenComposerPage";

const PLANET = "\uD83E\uDE90";
const STAR = "\u2726";
const STORY_PREVIEW_LIMIT = 3;
const SUBSCRIBER_STORY_LIMIT = 3;
const MEDIA_BLOCK_TYPES = new Set(["IMAGE", "VIDEO", "AUDIO", "VOICE"]);
const TEXT_BLOCK_TYPES = new Set(["TEXT", "KEY_POINT", "HIGHLIGHT"]);
const WORLD_CATEGORIES = __uiTuple(["Places", { __uiMessage: "creator.moving" }, { __uiMessage: "profile.business" }, { __uiMessage: "admin.growth" }, { __uiMessage: "profile.lifestyle" }]);
const MONTHLY_PRICES = [190, 490, 990];


function freshWorld(experience = false) {
  return {
    category: "",
    chapters: [],
    coverMedia: null,
    description: "",
    commentsEnabled: true,
    firstMonthOfferEnabled: false,
    ownerWelcomeNote: "",
    includedInWorld: false,
    allowDownload: false,
    experiencePath: "",
    experienceLocation: "",
    kind: experience ? "EXPERIENCE" : "PREMIUM_WORLD",
    ...(experience ? {} : { planet: { accent: "ice-white", emoji: PLANET, faceEmoji: "" } }),
    pricing: experience ? { mode: "ONE_TIME", presetId: "ONE_TIME_190", starsAmount: 190 } : { mode: "MONTHLY", presetId: "MONTHLY_190", starsAmount: 190 },
    status: "DRAFT",
    summary: "",
    tags: [],
    title: "",
  };
}

function blockPayload(block = {}, order) {
  const type = block.type || "TEXT";
  const payload = {
    id: block.id || crypto.randomUUID(),
    order,
    type,
  };

  if (TEXT_BLOCK_TYPES.has(type)) {
    payload.text = block.text || "";
    if (block.metadata) payload.metadata = block.metadata;
    return payload;
  }

  if (MEDIA_BLOCK_TYPES.has(type)) {
    if (block.media) payload.media = block.media;
    if (block.metadata) payload.metadata = block.metadata;
    return payload;
  }

  if (type === "LINK") {
    payload.url = block.url || "";
    payload.label = block.label || __msg("creator.openLink");
    return payload;
  }

  if (type === "POLL") {
    payload.metadata = {
      question: block.metadata?.question || "",
      options: Array.isArray(block.metadata?.options) ? block.metadata.options : [],
      resultsVisibility: block.metadata?.resultsVisibility || "SUBSCRIBERS",
    };
    return payload;
  }

  if (type === "LIST") {
    const items = Array.isArray(block.metadata?.listItems)
      ? block.metadata.listItems
      : Array.isArray(block.metadata?.items)
        ? block.metadata.items
        : String(block.text || "").split("\n");
    const cleanItems = items.map((item) => String(item || "").trim()).filter(Boolean);
    payload.text = cleanItems.join("\n");
    payload.metadata = { listItems: cleanItems };
    return payload;
  }

  return { ...payload, text: block.text || "" };
}

function chapterPayload(chapter, index, allFree = false, allLocked = false) {
  return {
    blocks: (chapter.blocks || []).map(blockPayload),
    isPreview: allFree || (!allLocked && index === 0),
    releaseMode: "IMMEDIATE",
    title: chapter.title || "",
  };
}

function inputClass(extra = "") {
  return `world-publish-input ${extra}`.trim();
}

function statusLabel(world, experience = false) {
  if (!world?.id) return __msg("creator.newDraft");
  if (experience && world.status === "CHANGES_REQUESTED") return __msg("creator.editingPublishedExperience");
  if (experience && world.status === "PUBLISHED") return __msg("admin.published");
  return String(world.status || "DRAFT").replaceAll("_", " ");
}

function isStoryPreviewBlock(block = {}) {
  return Boolean(block.metadata?.storyPreview && ["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl);
}

function isPublicationConflict(error) {
  return error?.response?.status === 409 || /publication changed/i.test(error?.response?.data?.message || error?.message || "");
}

function storyPreviewsFromWorld(publication = {}) {
  return (publication.chapters || [])
    .flatMap((chapter) => (chapter.blocks || [])
      .filter(isStoryPreviewBlock)
      .map((block) => ({
        blockId: block.id,
        chapterId: chapter.stableChapterId,
        id: block.media.assetId || `${chapter.stableChapterId}-${block.id}`,
        label: block.metadata?.label || chapter.title || __msg("activity.story"),
        caption: block.metadata?.caption || "",
        editorMetadata: block.metadata?.editorMetadata || null,
        media: block.media,
        audience: chapter.isPreview ? "FREE" : "SUBSCRIBER",
        saved: true,
        url: block.media.secureUrl,
      })))
    .filter((story, index, stories) => (
      stories.slice(0, index).filter((item) => item.audience === story.audience).length
        < (publication.kind === "EXPERIENCE" ? 5 : story.audience === "FREE" ? STORY_PREVIEW_LIMIT : SUBSCRIBER_STORY_LIMIT)
    ));
}

function revokePreviewUrl(story) {
  if (story?.url?.startsWith("blob:")) URL.revokeObjectURL(story.url);
}

function ExperienceVoiceSheet({ onClose, onSave, onUploadFile }) {
  __useUiLanguage();
  const recorder = useVoiceRecorder({ maxDurationSeconds: 120 });
  const [saving, setSaving] = useState(false);
  const isRecording = recorder.status === "recording";
  const isPaused = recorder.status === "paused";
  const isStarting = recorder.status === "requesting-permission";

  const saveRecording = async () => {
    if (!recorder.audioBlob || saving) return;
    setSaving(true);
    try {
      const extension = recorder.audioBlob.type.includes("mp4") ? "m4a" : recorder.audioBlob.type.includes("ogg") ? "ogg" : "webm";
      await onSave(new File([recorder.audioBlob], `experience-voice-${Date.now()}.${extension}`, { type: recorder.audioBlob.type || "audio/webm" }));
      recorder.resetRecording();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <div aria-modal="true" className="experience-voice-layer" role="dialog">
    <button aria-label={__msg("voice.closeVoiceRecorder")} className="experience-voice-dim" disabled={saving} onClick={onClose} type="button" />
    <section className="experience-voice-sheet">
      <header><div><strong>{__msg("creator.voiceHello")}</strong><small>{__msg("creator.recordLiveOrChooseAnAudioFile")}</small></div><button aria-label={__msg("voice.closeVoiceRecorder")} disabled={saving} onClick={onClose} type="button"><FiX /></button></header>
      <div className={`experience-voice-timer ${isRecording ? "is-live" : ""}`}><i />{formatVoiceTime(recorder.elapsedMs / 1000)}<small>/ 02:00</small></div>
      {recorder.levels.length ? <div aria-hidden="true" className="experience-voice-levels">{recorder.levels.slice(-32).map((level, index) => <i key={index} style={{ height: `${Math.max(12, level * 100)}%` }} />)}</div> : null}
      {recorder.audioUrl ? <audio controls src={recorder.audioUrl} /> : null}
      {recorder.error ? <p className="experience-voice-error" role="alert">{recorder.error}</p> : null}
      <div className="experience-voice-record-actions">
        {recorder.status === "idle" || recorder.status === "error" ? <button disabled={saving} onClick={recorder.startRecording} type="button"><FiMic /> {__msg("messaging.startRecording")}</button> : null}
        {isStarting ? <button disabled type="button"><FiLoader className="world-story-upload-spinner" /> {__msg("creator.allowMicrophone")}</button> : null}
        {isRecording ? <><button onClick={recorder.pauseRecording} type="button"><FiPause /> {__msg("creator.pause")}</button><button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("voice.stop")}</button></> : null}
        {isPaused ? <><button onClick={recorder.resumeRecording} type="button"><FiPlay /> {__msg("creator.resume")}</button><button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("creator.finish")}</button></> : null}
        {recorder.status === "preview" ? <><button disabled={saving} onClick={recorder.resetRecording} type="button"><FiMic /> {__msg("creator.recordAgain")}</button><button className="is-save" disabled={saving} onClick={saveRecording} type="button">{saving ? <FiLoader className="world-story-upload-spinner" /> : <FiCheck />} {__msg("publication.useRecording")}</button></> : null}
      </div>
      <div className="experience-voice-divider"><span>{__msg("creator.or")}</span></div>
      <button className="experience-voice-upload" disabled={isRecording || isPaused || isStarting || saving} onClick={onUploadFile} type="button"><FiArrowUpRight /> {__msg("creator.uploadAudioFile")}</button>
      <small className="experience-voice-hint">{__msg("creator.mp3WavM4aOggOrWebmMaximum2Minutes")}</small>
    </section>
  </div>;
}

function WorldCreateTextSheet({ busy, description, label, maxLength, onClose, onSave, placeholder, title, value }) {
  __useUiLanguage();
  const [draft, setDraft] = useState(value || "");
  const trimmed = draft.trim();
  return (
    <div aria-labelledby="world-create-text-title" aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
      <section className="world-bottom-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="world-sheet-grab" />
        <h2 id="world-create-text-title">{title}</h2>
        <p className="world-sheet-copy">{description}</p>
        {label === "description" ? (
          <textarea autoFocus maxLength={maxLength} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} rows={5} value={draft} />
        ) : (
          <label className="world-sheet-input"><input autoFocus maxLength={maxLength} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} value={draft} /></label>
        )}
        <small className="world-sheet-counter">{draft.length}/{maxLength}</small>
        <button className="world-sheet-primary" disabled={busy || !trimmed} onClick={() => onSave(trimmed)} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
      </section>
    </div>
  );
}

function WorldWelcomeMessageSheet({ busy, error, onClose, onRemoveVoice, onSave, onUploadVoice, value, voiceMedia, voiceBusy }) {
  __useUiLanguage();
  const [message, setMessage] = useState(value || "");
  const [voiceOpen, setVoiceOpen] = useState(Boolean(voiceMedia?.secureUrl || voiceMedia?.url));
  const [voiceMethod, setVoiceMethod] = useState("");
  const fileInput = useRef(null);
  const recorder = useVoiceRecorder({ maxDurationSeconds: 120 });
  const cleanMessage = message.trim();
  const messageChanged = cleanMessage !== (value || "").trim();
  const attachedVoice = voiceMedia?.secureUrl || voiceMedia?.url;
  const hasWelcomeMessage = Boolean(cleanMessage || attachedVoice);
  const toggleVoice = async () => {
    if (voiceBusy) return;
    if (voiceOpen || attachedVoice) {
      recorder.resetRecording();
      setVoiceMethod("");
      setVoiceOpen(false);
      if (attachedVoice) await onRemoveVoice();
      return;
    }
    setVoiceOpen(true);
  };
  const saveRecording = () => {
    if (!recorder.audioBlob) return;
    const extension = recorder.audioBlob.type.includes("mp4") ? "m4a" : recorder.audioBlob.type.includes("ogg") ? "ogg" : "webm";
    onUploadVoice(new File([recorder.audioBlob], `world-welcome-${Date.now()}.${extension}`, { type: recorder.audioBlob.type || "audio/webm" }));
  };
  const startVoiceRecording = () => {
    setVoiceMethod("record");
    recorder.startRecording();
  };
  const recordAgain = () => {
    recorder.resetRecording();
    window.setTimeout(() => recorder.startRecording(), 0);
  };
  return <div aria-labelledby="world-welcome-message-title" aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
    <section className="world-bottom-sheet is-description-sheet world-welcome-message-sheet" onMouseDown={(event) => event.stopPropagation()}>
      <span className="world-sheet-grab" aria-hidden="true" />
      <h2 id="world-welcome-message-title">{__msg("admin.welcomeMessage")}</h2>
      <p className="world-sheet-copy">{__msg("system.WorldPublishingPage.c0334dd9a5")}</p>
      <label className="world-welcome-message-field"><span className="sr-only">{__msg("admin.welcomeMessage")}</span><textarea autoFocus maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={__msg("system.WorldPublishingPage.43748899bc")} rows={5} value={message} /><small>{message.length}/500</small></label>
      <button aria-pressed={Boolean(attachedVoice || voiceOpen)} className="world-welcome-voice-toggle" disabled={voiceBusy} onClick={toggleVoice} type="button"><FiMic /><b>{attachedVoice ? __msg("system.SeenComposerPage.f99c511ff6") : __msg("system.WorldReaderPage.ecbf8fdb41")}</b><i className={attachedVoice || voiceOpen ? "is-on" : ""}><u /></i></button>
      {voiceOpen ? <div className="world-welcome-recorder">
        {attachedVoice ? <><audio controls src={attachedVoice} /><button className="is-remove" disabled={voiceBusy} onClick={toggleVoice} type="button">{__msg("creator.removeVoiceHello")}</button></> : null}
        {!attachedVoice && recorder.audioUrl ? <audio controls src={recorder.audioUrl} /> : null}
        {!attachedVoice ? <div className={`world-welcome-recorder-actions ${!voiceMethod ? "is-method-choice" : "is-record-flow"} ${recorder.status === "preview" ? "is-preview" : ""}`}>
          {!voiceMethod ? <>
            <button className="is-method" disabled={voiceBusy} onClick={startVoiceRecording} type="button"><FiMic /><span><b>{__msg("messaging.startRecording")}</b><small>{__msg("creator.addAVoiceHelloRecordLiveOrUploadAudio")}</small></span></button>
            <button className="is-method" disabled={voiceBusy} onClick={() => { setVoiceMethod("upload"); fileInput.current?.click(); }} type="button"><FiUpload /><span><b>{__msg("system.SeenComposerPage.66d375e583")}</b><small>{__msg("creator.uploadAudioFile")}</small></span></button>
          </> : null}
          {voiceMethod === "record" && (recorder.status === "idle" || recorder.status === "error") ? <button disabled={voiceBusy} onClick={recorder.startRecording} type="button"><FiMic /> {__msg("messaging.startRecording")}</button> : null}
          {recorder.status === "requesting-permission" ? <button disabled type="button">{__msg("creator.allowMicrophone")}</button> : null}
          {recorder.status === "recording" ? <div className="world-voice-live"><div className="world-voice-live-head"><span><i />{__msg("publication.recordingVoice")}</span><time>{formatVoiceTime(recorder.elapsedMs / 1000)}</time></div><div aria-hidden="true" className="world-voice-live-wave">{Array.from({ length: 24 }, (_, index) => { const level = recorder.levels[Math.max(0, recorder.levels.length - 24) + index] || 0.1 + ((index * 7) % 5) * 0.04; return <i key={index} style={{ "--voice-level": Math.max(.12, level) }} />; })}</div><button className="is-stop world-voice-live-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("publication.stopRecording")}</button></div> : null}
          {recorder.status === "paused" ? <button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("creator.finish")}</button> : null}
          {recorder.status === "preview" ? <><button disabled={voiceBusy} onClick={recordAgain} type="button">{__msg("creator.recordAgain")}</button><button className="is-use" disabled={voiceBusy} onClick={saveRecording} type="button">{voiceBusy ? __msg("stories.adding_ffb2e6") : __msg("publication.useRecording")}</button></> : null}
          <input accept="audio/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUploadVoice(file); else setVoiceMethod(""); }} ref={fileInput} type="file" />
        </div> : null}
        {recorder.error ? <p className="world-sheet-error">{recorder.error}</p> : null}
      </div> : null}
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      <button className="world-sheet-primary" disabled={!hasWelcomeMessage} onClick={() => onSave(cleanMessage, messageChanged)} type="button">{busy ? __msg("financial.saving") : __msg("contentEntities.save_efc007")}</button>
    </section>
  </div>;
}

function WorldCreatePriceSheet({ busy, currentPrice, onClose, onSave }) {
  __useUiLanguage();
  const [price, setPrice] = useState(Number(currentPrice || 190));
  const payout = new Intl.NumberFormat(__uiLocale(), { currency: "USD", style: "currency" }).format((price / 1000) * 0.68);
  return (
    <div aria-labelledby="world-create-price-title" aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
      <section className="world-bottom-sheet is-price-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="world-sheet-grab" />
        <h2 id="world-create-price-title">{__msg("creator.worldPrice")}</h2>
        <p className="world-sheet-copy">{__msg("creator.monthlySubscriptionEveryoneAlreadyInsideKeepsTheirPriceForever")}</p>
        <div aria-label={__msg("creator.worldMonthlyPrice")} className="world-price-options" role="radiogroup">
          {MONTHLY_PRICES.map((tierPrice) => {
            const locked = tierPrice === 990;
            const selected = price === tierPrice;
            return <button aria-checked={selected} aria-disabled={locked} className={`${selected ? "is-selected" : ""} ${locked ? "is-locked" : ""}`} disabled={locked || busy} key={tierPrice} onClick={() => setPrice(tierPrice)} role="radio" title={locked ? __msg("creator.requires100ResidentsWithSteadyRenewals") : undefined} type="button">{locked ? <FiLock aria-hidden="true" /> : null}<span>🪙</span> {tierPrice.toLocaleString(__uiLocale())}</button>;
          })}
        </div>
        <p className="world-price-payout"><b>{payout}</b> <span>{__msg("creator.toYouPerResidentMonthly")}</span></p>
        <p className="world-price-helper">{__msg("system.WorldPublishingPage.96e23938ee")}</p>
        <button className="world-sheet-primary" disabled={busy} onClick={() => onSave(price)} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
      </section>
    </div>
  );
}

function ExperienceProgress({ step }) {
  __useUiLanguage();
  const stages = ["Experience", "Chapters", "Publish"];
  return <div aria-label={__msg("creator.stepOf3", { value0: step, value1: stages[step - 1] })} className="experience-progress" role="progressbar" aria-valuemax="3" aria-valuemin="1" aria-valuenow={step}>
    {stages.map((label, index) => { const stage = index + 1; return <i aria-hidden="true" className={stage < step ? "is-complete" : stage === step ? "is-active" : ""} key={label} />; })}
  </div>;
}

function ExperienceDraftPreview({ chapters, coverUrl, onClose, storyPreviews, world }) {
  __useUiLanguage();
  const [chapterIndex, setChapterIndex] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);
  const video = storyPreviews.find((item) => item.file?.type?.startsWith("video/") || item.media?.mediaType === "VIDEO");
  const photos = storyPreviews.filter((item) => item.file?.type?.startsWith("image/") || item.media?.mediaType === "IMAGE").slice(0, 3);
  const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType));
  if (chapterIndex !== null && chapters[chapterIndex]) {
    const chapter = chapters[chapterIndex];
    const blocks = [...(chapter.blocks || [])].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
    const previous = chapters[chapterIndex - 1];
    const next = chapters[chapterIndex + 1];
    return <article className="experience-chapter-preview">
      <header>
        <button aria-label={__msg("admin.closeChapterPreview")} onClick={onClose} type="button"><FiX /></button>
        <div><small>{__msg("creator.chapter")} {chapterIndex + 1} {__msg("creator.of_0cf81c")} {chapters.length} {"\u00b7"} {world.title}</small><h1>{chapter.title || __msg("profile.chapter_7c635d", { value0: chapterIndex + 1 })}</h1></div>
        <span>{__msg("creator.preview_eb2264")}</span>
      </header>
      <div className="experience-chapter-preview-progress">{chapters.map((item, index) => <i className={index <= chapterIndex ? "is-active" : ""} key={item.stableChapterId || item.localId || index} />)}</div>
      <main>
        <section className="experience-chapter-preview-content">
          {blocks.map((block, index) => {
            if (block.type === "IMAGE" && block.media?.secureUrl) return <img alt={__msg("publication.chapterPreview")} key={block.id || index} src={block.media.secureUrl} />;
            if (block.type === "VIDEO" && block.media?.secureUrl) return <video controls key={block.id || index} src={block.media.secureUrl} />;
            if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) return <audio controls key={block.id || index} src={block.media.secureUrl} />;
            if (["TEXT", "HIGHLIGHT", "KEY_POINT"].includes(block.type) && block.text) return <p className={block.type === "HIGHLIGHT" ? "is-highlight" : ""} key={block.id || index}>{block.text}</p>;
            return null;
          })}
        </section>
        <div className="experience-chapter-preview-adjacent">
          <button disabled={!previous} onClick={() => previous && setChapterIndex(chapterIndex - 1)} type="button">{previous ? `‹ ${previous.title}` : ""}</button>
          <button disabled={!next} onClick={() => next && setChapterIndex(chapterIndex + 1)} type="button">{next ? `${next.title} ›` : __msg("creator.experienceComplete")}</button>
        </div>
        <div className="experience-chapter-preview-engagement"><span>{__msg("creator.useful0")}</span><span>◯&nbsp; 0</span><span>↗</span></div>
        <div className="experience-chapter-preview-actions"><button aria-label={__msg("creator.backToExperiencePreview")} onClick={() => setChapterIndex(null)} type="button">←</button><button onClick={() => next ? setChapterIndex(chapterIndex + 1) : setChapterIndex(null)} type="button">{next ? __msg("creator.next") : __msg("creator.backToOverview")}</button></div>
      </main>
    </article>;
  }
  return <article className="experience-viewer-page">
    <header className="experience-viewer-head"><button aria-label={__msg("admin.closePreview")} onClick={onClose} type="button"><FiX /></button><span>{__msg("creator.preview_eb2264")}</span></header>
    <main>
      <div className="experience-viewer-media">
        {coverUrl ? <img alt={__msg("creator.experienceCoverPreview")} src={coverUrl} /> : <span aria-hidden="true">✦</span>}
      </div>
      <h1>{world.title || __msg("profile.untitledExperience")}</h1>
      <p>{world.experiencePath || world.description || __msg("creator.addAShortDescriptionForThisExperience")}</p>
      <span className="experience-viewer-category">{world.category || __msg("content.category")}</span>
      <div className="experience-viewer-chapters">
        {chapters.length ? chapters.map((chapter, index) => <button key={chapter.stableChapterId || chapter.localId || index} onClick={() => setChapterIndex(index)} type="button"><i>{index + 1}</i><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong>{index === 0 ? <em>{__msg("creator.preview_eb2264")}</em> : <FiLock />}<b>›</b></button>) : <p>{__msg("creator.noChaptersAddedYet")}</p>}
      </div>
      {storyPreviews.length ? <section className="experience-public-previews">
        <header><span>{__msg("creator.preview_eb2264")}</span><h2>{__msg("creator.meetTheExperience")}</h2><p>{__msg("creator.thisIsWhatPeopleSeeBeforePurchasing")}</p></header>
        {video?.url ? <div className="experience-public-preview-video"><video controls playsInline preload="metadata" src={video.url} /><span>{video.label || __msg("creator.previewVideo")}</span></div> : null}
        {photos.length ? <div className="experience-public-preview-photos">{photos.map((photo, index) => <button aria-label={__msg("creator.openPreviewPhoto", { value0: index + 1 })} key={photo.id} onClick={() => setActivePhoto(photo)} type="button"><img alt={photo.label || __msg("creator.previewPhoto", { value0: index + 1 })} src={photo.url} /></button>)}</div> : null}
        {voice?.url ? <div className="experience-public-preview-voice"><span><FiPlay /></span><div><b>{voice.label || __msg("creator.voiceHello")}</b><small>{__msg("creator.aVoiceIntroduction")}</small></div><audio controls preload="metadata" src={voice.url} /></div> : null}
      </section> : null}
    </main>
    {activePhoto ? <div aria-label={__msg("creator.experiencePhotoPreview")} aria-modal="true" className="experience-public-preview-lightbox" onClick={() => setActivePhoto(null)} role="dialog"><button aria-label={__msg("admin.closePreview")} onClick={() => setActivePhoto(null)} type="button"><FiX /></button><img alt={activePhoto.label || __msg("creator.experiencePreview")} src={activePhoto.url} /></div> : null}
  </article>;
}

export default function WorldPublishingPage({ experience = false, publicationId = "" }) {
  __useUiLanguage();
  const nav = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "";
  const leaveComposer = () => returnTo ? nav(returnTo, { replace: true }) : nav(-1);
  const { user } = useAuth();
  const coverInputRef = useRef(null);
  const previewInputRef = useRef(null);
  const previewPhotoSlotRef = useRef(null);
  const videoInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const storyPreviewsRef = useRef([]);
  const autoOpenStoryComposerRef = useRef(false);
  const autoSaveAttemptedStoryIds = useRef(new Set());
  const draftAutoSaveTimer = useRef(null);
  const chapterAutoSaveTimer = useRef(null);
  const pendingDraftSaveRef = useRef(false);
  const pendingExperienceContinueRef = useRef(false);
  const saveDraftRef = useRef(null);
  const savingRef = useRef(false);
  const worldEditVersionRef = useRef(0);
  const storySaveResolvers = useRef(new Map());
  const deepLinkedChapterOpenedRef = useRef(false);
  const [world, setWorld] = useState(() => freshWorld(experience));
  const [storyPreviews, setStoryPreviews] = useState([]);
  const [activeStoryId, setActiveStoryId] = useState("");
  const [storyAudience, setStoryAudience] = useState("FREE");
  const [activeChapter, setActiveChapter] = useState(null);
  const [chapterStory, setChapterStory] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const [removingChapterId, setRemovingChapterId] = useState("");
  const [chapterStatus, setChapterStatus] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyAutoSaving, setStoryAutoSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creationStarted, setCreationStarted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [welcomeVoiceBusy, setWelcomeVoiceBusy] = useState(false);
  const [welcomeMessageBusy, setWelcomeMessageBusy] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [experienceStep, setExperienceStep] = useState(1);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [chapterCreateOpen, setChapterCreateOpen] = useState(false);
  const [chapterCreateError, setChapterCreateError] = useState("");
  const [videoTrimFile, setVideoTrimFile] = useState(null);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [experiencePreviewOpen, setExperiencePreviewOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [worldCreateSheet, setWorldCreateSheet] = useState("");
  const monetizationQuery = useQuery({
    queryKey: ["monetization"],
    queryFn: () => authService.getMonetization().then((response) => response.data.data),
    enabled: !experience,
    staleTime: 30_000,
  });
  const monetization = monetizationQuery.data;
  const paidWorldRestricted = !experience && monetization && (!monetization.sellerReady || !monetization.verified);
  const chapters = world.chapters || [];
  const ownerName = user?.name || user?.displayName || user?.username || __msg("creator.max");
  const coverUrl = coverPreviewUrl || world.coverMedia?.secureUrl;
  const validation = useMemo(() => worldCompletenessBySection(world), [world]);
  const validationMessages = Object.values(validation).flat();
  const readyToSubmit = world.id && !validationMessages.length && !saving && !uploading && !storyAutoSaving;
  const activeStory = useMemo(() => storyPreviews.find((story) => story.id === activeStoryId), [activeStoryId, storyPreviews]);
  const freeStories = useMemo(() => storyPreviews.filter((story) => story.audience !== "SUBSCRIBER"), [storyPreviews]);
  const subscriberStories = useMemo(() => storyPreviews.filter((story) => story.audience === "SUBSCRIBER"), [storyPreviews]);

  useEffect(() => {
    if (!chapterStatus || !/(saved|added|removed)$/i.test(chapterStatus)) return undefined;
    const timer = window.setTimeout(() => setChapterStatus(""), 2100);
    return () => window.clearTimeout(timer);
  }, [chapterStatus]);

  const loadWorld = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let existing;
      if (publicationId) {
        existing = (await api.getMyPublication(publicationId)).data.data.publication;
      } else if (experience) {
        setWorld(freshWorld(true));
        setStoryPreviews((current) => {
          current.forEach(revokePreviewUrl);
          return [];
        });
        setNotice(__msg("creator.startCreatingYourPremiumExperience"));
        setCreationStarted(true);
        return;
      } else {
        const response = await api.listMyPublications({ kind: experience ? "EXPERIENCE" : "PREMIUM_WORLD", limit: 50 });
        existing = (response.data.data.items || []).find((item) => ["DRAFT", "CHANGES_REQUESTED", "PENDING_REVIEW", "PUBLISHED"].includes(item.status));
      }
      if (!existing) {
        setWorld(freshWorld(experience));
        setStoryPreviews((current) => {
          current.forEach(revokePreviewUrl);
          return [];
        });
        setNotice(__msg("creator.startCreatingYourPremiumWorld"));
        setCreationStarted(true);
        return;
      }
      if (!experience && !publicationId) {
        nav(`/world/${existing.id}`, { replace: true });
        return;
      }
      let publication = publicationId ? existing : (await api.getMyPublication(existing.id)).data.data.publication;
      if (publication.status === "PUBLISHED") publication = (await api.startPublishedRevision(publication.id, publication.statusVersion)).data.data.publication;
      publication = { ...freshWorld(experience), ...publication };
      if (experience && publication.pricing?.mode !== "ONE_TIME") publication.pricing = { mode: "ONE_TIME", presetId: "ONE_TIME_190", starsAmount: 190 };
      setWorld(publication);
      setCreationStarted(true);
      setStoryPreviews((current) => {
        current.forEach(revokePreviewUrl);
        return storyPreviewsFromWorld(publication);
      });
      setNotice(__msg("creator.opened", { value0: statusLabel(publication, experience) }));
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setLoading(false);
    }
  }, [experience, nav, publicationId]);

  useEffect(() => {
    loadWorld();
  }, [loadWorld]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const chapterId = params.get("chapter");
    if (!experience || loading || !chapterId || deepLinkedChapterOpenedRef.current) return;
    const index = (world.chapters || []).findIndex((chapter) => chapter.stableChapterId === chapterId);
    if (index < 0) return;
    deepLinkedChapterOpenedRef.current = true;
    setExperienceStep(2);
    setActiveChapter(index);
    setChapterStory(chapterStoryText(world.chapters[index]));
    setChapterStatus("");
  }, [experience, loading, location.search, world.chapters]);

  useEffect(() => {
    storyPreviewsRef.current = storyPreviews;
  }, [storyPreviews]);

  useEffect(() => {
    if (experience || loading || !creationStarted || autoOpenStoryComposerRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("addStory") !== "free") return;

    autoOpenStoryComposerRef.current = true;
    setStoryAudience("FREE");
    setStoryComposerOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("world-preview-stories")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    params.delete("addStory");
    nav({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  }, [creationStarted, experience, loading, location.pathname, location.search, nav]);

  useEffect(() => () => {
    storyPreviewsRef.current.forEach(revokePreviewUrl);
    window.clearTimeout(draftAutoSaveTimer.current);
    window.clearTimeout(chapterAutoSaveTimer.current);
  }, []);

  useEffect(() => () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
  }, [coverPreviewUrl]);

  const scheduleDraftSave = () => {
    window.clearTimeout(draftAutoSaveTimer.current);
    draftAutoSaveTimer.current = window.setTimeout(() => saveDraftRef.current?.(), 700);
  };

  const updateWorld = (patch) => {
    worldEditVersionRef.current += 1;
    setWorld((current) => ({ ...current, ...patch }));
    setNotice(__msg("admin.saving"));
    setError("");
    scheduleDraftSave();
  };

  const preserveNewerLocalEdits = (current, next, requestEditVersion) => {
    if (worldEditVersionRef.current <= requestEditVersion) return next;
    return {
      ...next,
      allowDownload: current.allowDownload,
      category: current.category,
      chapters: current.chapters,
      coverMedia: current.coverMedia,
      description: current.description,
      commentsEnabled: current.commentsEnabled,
      firstMonthOfferEnabled: current.firstMonthOfferEnabled,
      ownerWelcomeNote: current.ownerWelcomeNote,
      experienceLocation: current.experienceLocation,
      experiencePath: current.experiencePath,
      includedInWorld: current.includedInWorld,
      planet: current.planet,
      pricing: current.pricing,
      summary: current.summary,
      tags: current.tags,
      title: current.title,
    };
  };

  const ensureDraft = async (snapshot = world, requestEditVersion = worldEditVersionRef.current) => {
    if (snapshot.id) return snapshot;
    const response = await api.createPublicationDraft({
      category: snapshot.category,
      description: snapshot.description,
      commentsEnabled: snapshot.commentsEnabled !== false,
      firstMonthOfferEnabled: Boolean(snapshot.firstMonthOfferEnabled),
      ownerWelcomeNote: snapshot.ownerWelcomeNote || "",
      includedInWorld: Boolean(snapshot.includedInWorld),
      allowDownload: Boolean(snapshot.allowDownload),
      experiencePath: snapshot.experiencePath || "",
      experienceLocation: snapshot.experienceLocation || "",
      kind: experience ? "EXPERIENCE" : "PREMIUM_WORLD",
      ...(experience ? {} : { planet: snapshot.planet }),
      pricing: snapshot.pricing,
      summary: snapshot.summary || snapshot.experiencePath || snapshot.title,
      tags: normalizeTags(snapshot.tags),
      title: snapshot.title,
    });
    const draft = {
      ...snapshot,
      ...response.data.data.publication,
      allowDownload: snapshot.allowDownload,
      category: snapshot.category,
      chapters: snapshot.chapters,
      description: snapshot.description,
      commentsEnabled: snapshot.commentsEnabled !== false,
      firstMonthOfferEnabled: Boolean(snapshot.firstMonthOfferEnabled),
      ownerWelcomeNote: snapshot.ownerWelcomeNote || "",
      experienceLocation: snapshot.experienceLocation,
      experiencePath: snapshot.experiencePath,
      includedInWorld: snapshot.includedInWorld,
      pricing: snapshot.pricing,
      summary: snapshot.summary,
      tags: snapshot.tags,
      title: snapshot.title,
    };
    setWorld((current) => preserveNewerLocalEdits(current, draft, requestEditVersion));
    history.replaceState({}, "", experience
      ? `/studio/experiences/${draft.id}/edit${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
      : "/create/premium-world");
    return draft;
  };

  const refreshWorld = async (id, requestEditVersion = worldEditVersionRef.current) => {
    const response = await api.getMyPublication(id);
    const next = response.data.data.publication;
    setWorld((current) => preserveNewerLocalEdits(
      current,
      {
        ...current,
        ...next,
        coverMedia: next.coverMedia || null,
        worldWelcomeVoiceMedia: next.worldWelcomeVoiceMedia || null,
      },
      requestEditVersion,
    ));
    return next;
  };

  const attachStoryPreviews = async (draft, previews, requestEditVersion) => {
    const unsaved = previews.filter((preview) => preview.file && !preview.saved);
    if (!unsaved.length) return draft;

    let next = draft;
    for (const audience of ["FREE", "SUBSCRIBER"]) {
      const audienceStories = unsaved.filter((preview) => (preview.audience || "FREE") === audience);
      if (!audienceStories.length) continue;

      let targetChapter = experience ? next.chapters?.[0] : next.chapters?.find((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview);
      if (!targetChapter?.stableChapterId) {
        await api.addChapter(next.id, {
          blocks: [],
          isPreview: experience ? next.pricing?.mode === "FREE" : audience === "FREE",
          releaseMode: "IMMEDIATE",
          statusVersion: next.statusVersion,
          title: audience === "FREE" ? __msg("profile.chapter1") : __msg("creator.subscriberStories"),
        });
        next = await refreshWorld(next.id, requestEditVersion);
        targetChapter = experience ? next.chapters?.[0] : next.chapters?.find((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview);
      }
      if (!targetChapter?.stableChapterId) throw new Error(__msg("creator.aStoryChapterCouldNotBePrepared"));

      const limit = experience ? 5 : audience === "FREE" ? STORY_PREVIEW_LIMIT : SUBSCRIBER_STORY_LIMIT;
      const existingStoryCount = (targetChapter.blocks || []).filter(isStoryPreviewBlock).length;
      const uploadQueue = audienceStories.slice(0, Math.max(0, limit - existingStoryCount));
      if (!uploadQueue.length) continue;

      setNotice(audience === "FREE" ? __msg("creator.savingFreePreviewStories") : __msg("creator.savingSubscriberStories"));
      const uploadedBlocks = [];
      for (const preview of uploadQueue) {
        const blockId = preview.blockId || crypto.randomUUID();
        const uploaded = (await api.uploadMedia(next.id, preview.file, {
          blockId,
          chapterId: targetChapter.stableChapterId,
          mediaType: preview.file.type.startsWith("video/") ? "VIDEO" : preview.file.type.startsWith("audio/") ? "VOICE" : "IMAGE",
          purpose: "BLOCK",
          storyPreview: "true",
        })).data.data;
        uploadedBlocks.push({
          id: blockId,
          media: uploaded,
          metadata: { label: preview.label, storyPreview: true },
          order: (targetChapter.blocks || []).length + uploadedBlocks.length,
          text: "",
          type: preview.file.type.startsWith("video/") ? "VIDEO" : preview.file.type.startsWith("audio/") ? "VOICE" : "IMAGE",
        });
      }

      await api.updateChapter(next.id, targetChapter.stableChapterId, {
        blocks: [...(targetChapter.blocks || []), ...uploadedBlocks].map((block, order) => ({ ...block, order })),
        isPreview: experience ? next.pricing?.mode === "FREE" : audience === "FREE",
        releaseMode: targetChapter.releaseMode || "IMMEDIATE",
        statusVersion: next.statusVersion,
        title: targetChapter.title || (audience === "FREE" ? __msg("profile.chapter1") : __msg("creator.subscriberStories")),
      });
      next = await refreshWorld(next.id, requestEditVersion);
    }

    setStoryPreviews((current) => {
      current.forEach(revokePreviewUrl);
      return storyPreviewsFromWorld(next);
    });
    return next;
  };

  const saveDraft = async (retryingConflict = false, snapshotOverride = null) => {
    if (savingRef.current || uploading) {
      pendingDraftSaveRef.current = true;
      return null;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    setNotice(__msg("admin.saving"));
    const snapshot = snapshotOverride || world;
    const requestEditVersion = worldEditVersionRef.current;
    try {
      let draft = await ensureDraft(snapshot, requestEditVersion);
      draft = (await api.updatePublicationDraft(draft.id, {
        category: snapshot.category,
        commentsEnabled: snapshot.commentsEnabled !== false,
        description: snapshot.description,
        firstMonthOfferEnabled: Boolean(snapshot.firstMonthOfferEnabled),
        ownerWelcomeNote: snapshot.ownerWelcomeNote || "",
        includedInWorld: Boolean(snapshot.includedInWorld),
        allowDownload: Boolean(snapshot.allowDownload),
        experiencePath: snapshot.experiencePath || "",
        experienceLocation: snapshot.experienceLocation || "",
        ...(experience ? {} : { planet: snapshot.planet }),
        pricing: snapshot.pricing,
        statusVersion: draft.statusVersion,
        summary: snapshot.summary || snapshot.experiencePath || snapshot.title,
        tags: normalizeTags(snapshot.tags),
        title: snapshot.title,
      })).data.data.publication;

      for (const [index, chapter] of snapshot.chapters.entries()) {
        if (chapter.stableChapterId) {
          await api.updateChapter(draft.id, chapter.stableChapterId, {
            ...chapterPayload(chapter, index, snapshot.pricing?.mode === "FREE", experience && snapshot.pricing?.mode !== "FREE"),
            statusVersion: draft.statusVersion,
          });
        } else {
          await api.addChapter(draft.id, {
            ...chapterPayload(chapter, index, snapshot.pricing?.mode === "FREE", experience && snapshot.pricing?.mode !== "FREE"),
            statusVersion: draft.statusVersion,
          });
        }
        draft = await refreshWorld(draft.id, requestEditVersion);
      }

      if (storyPreviews.some((preview) => preview.file && !preview.saved) && !draft.chapters?.length) {
        await api.addChapter(draft.id, {
          blocks: [],
          isPreview: experience ? snapshot.pricing?.mode === "FREE" : true,
          releaseMode: "IMMEDIATE",
          statusVersion: draft.statusVersion,
          title: __msg("profile.chapter1"),
        });
        draft = await refreshWorld(draft.id, requestEditVersion);
      }

      draft = await attachStoryPreviews(draft, storyPreviews, requestEditVersion);
      setNotice(__msg("creator.draftSaved"));
      if (pendingExperienceContinueRef.current) {
        pendingExperienceContinueRef.current = false;
        setExperienceStep(2);
      }
      return draft;
    } catch (requestError) {
      pendingExperienceContinueRef.current = false;
      if (!retryingConflict && snapshot.id && isPublicationConflict(requestError)) {
        try {
          setNotice(__msg("creator.refreshingLatestDraft"));
          const latest = await refreshWorld(snapshot.id, requestEditVersion);
          const retrySnapshot = {
            ...latest,
            ...snapshot,
            coverMedia: latest.coverMedia || snapshot.coverMedia || null,
            chapters: snapshot.chapters?.length ? snapshot.chapters : latest.chapters || [],
            statusVersion: latest.statusVersion,
          };
          setWorld((current) => preserveNewerLocalEdits(
            current,
            { ...current, ...retrySnapshot },
            requestEditVersion,
          ));
          savingRef.current = false;
          return await saveDraft(true, retrySnapshot);
        } catch (retryError) {
          setError(publicationError(retryError));
          setNotice(__msg("creator.savePaused"));
          return null;
        }
      }
      setError(publicationError(requestError));
      setNotice(__msg("creator.savePaused"));
      return null;
    } finally {
      savingRef.current = false;
      setSaving(false);
      if (pendingDraftSaveRef.current) {
        pendingDraftSaveRef.current = false;
        scheduleDraftSave();
      }
    }
  };

  saveDraftRef.current = saveDraft;

  const saveWelcomeMessage = async (ownerWelcomeNote, messageChanged = true) => {
    if (!messageChanged) {
      setWorldCreateSheet("");
      return;
    }
    if (welcomeMessageBusy || welcomeVoiceBusy) return;
    setWelcomeMessageBusy(true);
    const snapshot = { ...world, ownerWelcomeNote };
    worldEditVersionRef.current += 1;
    setWorld(snapshot);
    try {
      const saved = await saveDraft(false, snapshot);
      if (saved) setWorldCreateSheet("");
    } finally {
      setWelcomeMessageBusy(false);
    }
  };

  const uploadWelcomeVoice = async (file) => {
    if (!file || welcomeVoiceBusy) return;
    setWelcomeVoiceBusy(true);
    setError("");
    try {
      const saved = await saveDraft();
      if (!saved) return;
      await api.uploadWorldWelcomeVoice(saved.id, file);
      await refreshWorld(saved.id);
      setNotice(__msg("system.WorldReaderPage.3acddf17a1"));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || __msg("social.voiceHelloCouldNotBeAdded"));
    } finally {
      setWelcomeVoiceBusy(false);
    }
  };

  const removeWelcomeVoice = async () => {
    if (!world.id || welcomeVoiceBusy) return;
    const previousVoiceMedia = world.worldWelcomeVoiceMedia || null;
    setWelcomeVoiceBusy(true);
    setError("");
    setWorld((current) => ({ ...current, worldWelcomeVoiceMedia: null }));
    try {
      await api.removeWorldWelcomeVoice(world.id);
      await refreshWorld(world.id);
      setNotice(__msg("system.WorldReaderPage.aec0a171ce"));
    } catch (requestError) {
      setWorld((current) => ({ ...current, worldWelcomeVoiceMedia: previousVoiceMedia }));
      setError(requestError?.response?.data?.message || __msg("social.voiceHelloCouldNotBeRemoved"));
    } finally {
      setWelcomeVoiceBusy(false);
    }
  };

  const openWorldManagement = async (panel = "") => {
    const saved = await saveDraft();
    if (!saved) return;
    const search = new URLSearchParams({ edit: "1" });
    if (panel) search.set("worldPanel", panel);
    nav(`/world/${saved.id}?${search.toString()}`);
  };

  const continueExperienceDetails = async () => {
    if (world.id) {
      pendingExperienceContinueRef.current = false;
      const saved = await saveDraft();
      if (saved) setExperienceStep(2);
      if (saved && !(saved.chapters || []).length) {
        const response = await api.addChapter(saved.id, { blocks: [], isPreview: false, releaseMode: "IMMEDIATE", statusVersion: saved.statusVersion, title: __msg("profile.chapter1") });
        const createdId = response.data.data.chapter?.stableChapterId;
        const next = await refreshWorld(saved.id);
        const nextIndex = next.chapters.findIndex((chapter) => chapter.stableChapterId === createdId);
        setActiveChapter(Math.max(0, nextIndex));
        setChapterStory("");
      } else if (saved?.chapters?.length) {
        setActiveChapter(0);
        setChapterStory(chapterStoryText(saved.chapters[0]));
        setChapterStatus(__msg("creator.draftSaved"));
      }
      return;
    }
    pendingExperienceContinueRef.current = true;
    const saved = await saveDraft();
    if (saved) {
      pendingExperienceContinueRef.current = false;
      setExperienceStep(2);
      if (!(saved.chapters || []).length) {
        const response = await api.addChapter(saved.id, { blocks: [], isPreview: false, releaseMode: "IMMEDIATE", statusVersion: saved.statusVersion, title: __msg("profile.chapter1") });
        const createdId = response.data.data.chapter?.stableChapterId;
        const next = await refreshWorld(saved.id);
        const nextIndex = next.chapters.findIndex((chapter) => chapter.stableChapterId === createdId);
        setActiveChapter(Math.max(0, nextIndex));
        setChapterStory("");
      } else {
        setActiveChapter(0);
        setChapterStory(chapterStoryText(saved.chapters[0]));
        setChapterStatus(__msg("creator.draftSaved"));
      }
    }
  };

  useEffect(() => {
    if (!creationStarted) return undefined;
    // A title/details autosave may still be finishing when a cropped preview is
    // handed back. Wait for it instead of rejecting the media upload as failed.
    if (saving || uploading || savingRef.current) return undefined;
    const pendingIds = storyPreviews
      .filter((preview) => preview.file && !preview.saved && !autoSaveAttemptedStoryIds.current.has(preview.id))
      .map((preview) => preview.id);
    if (!pendingIds.length) return undefined;

    pendingIds.forEach((storyId) => autoSaveAttemptedStoryIds.current.add(storyId));
    const timer = window.setTimeout(async () => {
      const saved = await saveDraftRef.current?.();
      if (!saved && (savingRef.current || uploading)) {
        pendingIds.forEach((storyId) => autoSaveAttemptedStoryIds.current.delete(storyId));
        return;
      }
      pendingIds.forEach((storyId) => {
        const resolver = storySaveResolvers.current.get(storyId);
        if (saved) resolver?.resolve(saved);
        else resolver?.reject(new Error(__msg("creator.previewMediaCouldNotBeSavedCheckThe")));
        storySaveResolvers.current.delete(storyId);
      });
      setStoryAutoSaving(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [creationStarted, saving, storyPreviews, uploading]);

  const uploadCover = async (file) => {
    if (!file) return;
    const requestEditVersion = worldEditVersionRef.current;
    const localPreview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    if (localPreview) setCoverPreviewUrl(localPreview);
    setUploading(true);
    setError("");
    setNotice(__msg("creator.uploadingCover"));
    try {
      const draft = await ensureDraft(world, requestEditVersion);
      const response = experience
        ? await api.uploadMedia(draft.id, file, { purpose: "COVER", statusVersion: draft.statusVersion })
        : await api.uploadWorldCover(draft.id, file);
      const uploadedPublication = experience ? response.data.data.publication : response.data.data;
      if (uploadedPublication?.coverMedia?.secureUrl) {
        setWorld((current) => ({ ...current, id: current.id || draft.id, coverMedia: uploadedPublication.coverMedia, statusVersion: uploadedPublication.statusVersion, draftVersion: uploadedPublication.draftVersion }));
      }
      await refreshWorld(draft.id, requestEditVersion);
      setNotice(__msg("creator.coverSaved"));
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice(__msg("creator.coverUploadFailed"));
    } finally {
      setUploading(false);
      setCoverPreviewUrl("");
      if (pendingDraftSaveRef.current) {
        pendingDraftSaveRef.current = false;
        scheduleDraftSave();
      }
    }
  };

  const addStoryPreview = ({ caption = "", editorMetadata = null, file, replaceId = "" }) => {
    if (!file) return;
    const audienceStories = storyAudience === "SUBSCRIBER" ? subscriberStories : freeStories;
    const limit = experience ? 5 : storyAudience === "SUBSCRIBER" ? SUBSCRIBER_STORY_LIMIT : STORY_PREVIEW_LIMIT;
    const replacedStory = replaceId ? storyPreviews.find((story) => story.id === replaceId) : null;
    const remaining = Math.max(0, limit - audienceStories.length + (replacedStory ? 1 : 0));
    if (!remaining) {
      setNotice(__msg("creator.onlyStoriesCanBeShown", { value0: limit, value1: storyAudience === "SUBSCRIBER" ? "subscriber" : __msg("social.freePreview") }));
      return;
    }
    const nextStory = {
      audience: storyAudience,
      caption,
      editorMetadata,
      file,
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      label: caption || new Date().toLocaleTimeString(__uiLocale(), { hour: "numeric", minute: "2-digit" }),
      saved: false,
      url: URL.createObjectURL(file),
    };

    if (replacedStory?.blockId) {
      setWorld((current) => ({
        ...current,
        chapters: (current.chapters || []).map((chapter) => (
          chapter.stableChapterId === replacedStory.chapterId
            ? { ...chapter, blocks: (chapter.blocks || []).filter((block) => block.id !== replacedStory.blockId) }
            : chapter
        )),
      }));
    }
    setStoryAutoSaving(true);
    setStoryPreviews((current) => {
      const replaced = current.find((story) => story.id === replaceId);
      revokePreviewUrl(replaced);
      setNotice(__msg("creator.uploadingStory", { value0: storyAudience === "SUBSCRIBER" ? "subscriber" : __msg("social.freePreview") }));
      return [...current.filter((story) => story.id !== replaceId), nextStory];
    });
    setActiveStoryId(nextStory.id);
    setError("");
    return new Promise((resolve, reject) => {
      storySaveResolvers.current.set(nextStory.id, { reject, resolve });
    });
  };

  const removeCover = async () => {
    if (!world.id || !world.coverMedia || uploading) return;
    if (!window.confirm(__msg("creator.removeThisCoverImage"))) return;
    setUploading(true);
    setError("");
    try {
      await api.deleteMedia(world.id, "cover", world.statusVersion);
      await refreshWorld(world.id);
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setUploading(false);
      if (pendingDraftSaveRef.current) {
        pendingDraftSaveRef.current = false;
        scheduleDraftSave();
      }
    }
  };

  const requestCoverUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setCropTarget({ kind: "cover", url: URL.createObjectURL(file) });
      return;
    }

    uploadCover(file);
  };

  const removeStoryPreview = (storyId) => {
    const removed = storyPreviews.find((story) => story.id === storyId);
    setStoryPreviews((current) => {
      const removed = current.find((story) => story.id === storyId);
      revokePreviewUrl(removed);
      return current.filter((story) => story.id !== storyId);
    });
    if (removed?.blockId) {
      setWorld((current) => ({
        ...current,
        chapters: (current.chapters || []).map((chapter) => (
          chapter.stableChapterId === removed.chapterId
            ? { ...chapter, blocks: (chapter.blocks || []).filter((block) => block.id !== removed.blockId) }
            : chapter
        )),
      }));
      setNotice(__msg("creator.removingStory"));
      scheduleDraftSave();
    }
    if (activeStoryId === storyId) setActiveStoryId("");
    setNotice(__msg("creator.storyPreviewRemoved"));
  };

  const activePlanetChapter = activeChapter == null ? null : chapters[activeChapter];
  const activePlanetEditorChapter = activePlanetChapter ? {
    ...activePlanetChapter,
    blocks: (activePlanetChapter.blocks || []).filter((block) => !block.metadata?.storyPreview),
  } : null;

  const openChapterEditor = async (index) => {
    const saved = await saveDraft();
    if (!saved) return;
    const chapter = saved.chapters?.[index];
    if (!chapter?.stableChapterId) {
      setError(__msg("creator.thisChapterCouldNotBeOpenedYetPleaseTry"));
      return;
    }
    setActiveChapter(index);
    setChapterStory(chapterStoryText(chapter));
    setChapterStatus("");
  };

  const refreshChapterEditor = async () => {
    const next = await refreshWorld(world.id);
    const chapter = next.chapters?.[activeChapter];
    if (chapter) setChapterStory(chapterStoryText(chapter));
    return next;
  };

  const latestChapterContext = async () => {
    const response = await api.getMyPublication(world.id);
    const publication = response.data.data.publication;
    const chapter = publication.chapters?.[activeChapter];
    if (!chapter?.stableChapterId) throw new Error(__msg("creator.chapterIsNoLongerAvailable"));
    setWorld((current) => ({ ...current, ...publication }));
    return { chapter, publication };
  };

  const updateActiveChapterBlocks = async (blocks, status) => {
    if (!activePlanetChapter?.stableChapterId || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus(status);
    setError("");
    try {
      const { chapter, publication } = await latestChapterContext();
      const previewBlocks = (chapter.blocks || []).filter((block) => block.metadata?.storyPreview);
      const mergedBlocks = [...previewBlocks, ...blocks].map((block, order) => ({ ...block, order }));
      await api.updateChapter(publication.id, chapter.stableChapterId, {
        blocks: mergedBlocks,
        isPreview: Boolean(chapter.isPreview || activeChapter === 0),
        releaseMode: chapter.releaseMode || "IMMEDIATE",
        statusVersion: publication.statusVersion,
        title: activePlanetChapter?.title || chapter.title || __msg("profile.chapter_7c635d", { value0: activeChapter + 1 }),
      });
      await refreshChapterEditor();
      setChapterStatus(__msg("creator.chapterSaved"));
      return true;
    } catch (requestError) {
      setError(publicationError(requestError));
      setChapterStatus(__msg("creator.chapterUpdateFailed"));
      return false;
    } finally {
      setChapterSaving(false);
    }
  };

  const saveChapterStory = async ({ close = true } = {}) => {
    if (!activePlanetEditorChapter) return;
    window.clearTimeout(chapterAutoSaveTimer.current);
    const saved = await updateActiveChapterBlocks(chapterBlocksWithStory(activePlanetEditorChapter, chapterStory), __msg("creator.savingChapter"));
    if (saved && close) {
      const openedDirectly = new URLSearchParams(location.search).has("chapter");
      setActiveChapter(null);
      setChapterStatus(__msg("creator.draftSaved"));
      if (openedDirectly && world.id) nav(`/experience/${world.id}`, { replace: true });
    }
    return saved;
  };

  useEffect(() => {
    if (activeChapter == null || !activePlanetEditorChapter || chapterSaving) return undefined;
    window.clearTimeout(chapterAutoSaveTimer.current);
    chapterAutoSaveTimer.current = window.setTimeout(() => {
      void saveChapterStory({ close: false });
    }, 900);
    return () => window.clearTimeout(chapterAutoSaveTimer.current);
  }, [activeChapter, activePlanetEditorChapter?.title, chapterStory]);

  const selectExperienceChapter = async (index) => {
    if (index === activeChapter) return;
    const saved = await saveChapterStory({ close: false });
    if (!saved || !chapters[index]) return;
    setActiveChapter(index);
    setChapterStory(chapterStoryText(chapters[index]));
    setChapterStatus(__msg("creator.draftSaved"));
  };

  const previousExperienceChapter = async () => {
    if (activeChapter > 0) return selectExperienceChapter(activeChapter - 1);
    const saved = await saveChapterStory({ close: false });
    if (saved) {
      setActiveChapter(null);
      setExperienceStep(1);
    }
  };

  const nextExperienceChapter = async () => {
    const currentIndex = activeChapter;
    const saved = await saveChapterStory({ close: false });
    if (!saved) return;
    if (chapters[currentIndex + 1]) {
      setActiveChapter(currentIndex + 1);
      setChapterStory(chapterStoryText(chapters[currentIndex + 1]));
      return;
    }
    setChapterSaving(true);
    setChapterStatus(__msg("creator.creatingNextChapter"));
    try {
      const latest = (await api.getMyPublication(world.id)).data.data.publication;
      const response = await api.addChapter(latest.id, {
        blocks: [],
        isPreview: latest.pricing?.mode === "FREE",
        releaseMode: "IMMEDIATE",
        statusVersion: latest.statusVersion,
        title: __msg("profile.chapter_7c635d", { value0: (latest.chapters?.length || 0) + 1 }),
      });
      const createdId = response.data.data.chapter?.stableChapterId;
      const next = await refreshWorld(latest.id);
      const nextIndex = next.chapters.findIndex((chapter) => chapter.stableChapterId === createdId);
      setActiveChapter(Math.max(0, nextIndex));
      setChapterStory("");
      setChapterStatus(__msg("creator.draftSaved"));
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setChapterSaving(false);
    }
  };

  const finishExperienceChapters = async () => {
    if (chapters.length < 2) {
      setChapterStatus(__msg("creator.premiumExperiencesNeedAtLeast2Chapters"));
      await nextExperienceChapter();
      return;
    }
    const saved = await saveChapterStory({ close: false });
    if (!saved) return;
    setActiveChapter(null);
    setExperienceStep(3);
  };

  const uploadChapterMedia = async (mediaType, file, metadata = {}) => {
    if (!activePlanetChapter?.stableChapterId || chapterSaving) return;
    const blockId = crypto.randomUUID();
    setChapterSaving(true);
    setChapterStatus(__msg("creator.uploadingValue0", { value0: mediaType.toLowerCase() }));
    setError("");
    try {
      const starting = await latestChapterContext();
      const uploaded = (await api.uploadMedia(starting.publication.id, file, {
        blockId,
        chapterId: starting.chapter.stableChapterId,
        mediaType,
        purpose: "BLOCK",
      })).data.data;
      const { chapter, publication } = await latestChapterContext();
      const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory);
      const previewBlocks = (chapter.blocks || []).filter((block) => block.metadata?.storyPreview);
      await api.updateChapter(publication.id, chapter.stableChapterId, {
        blocks: [...previewBlocks, ...blocks, { id: blockId, media: uploaded, ...(Object.keys(metadata || {}).length ? { metadata } : {}), order: previewBlocks.length + blocks.length, type: mediaType }].map((block, order) => ({ ...block, order })),
        isPreview: Boolean(chapter.isPreview || activeChapter === 0),
        releaseMode: chapter.releaseMode || "IMMEDIATE",
        statusVersion: publication.statusVersion,
        title: chapter.title || __msg("profile.chapter_7c635d", { value0: activeChapter + 1 }),
      });
      await refreshChapterEditor();
      setChapterStatus(__msg("creator.value0Added", { value0: mediaType === "IMAGE" ? __msg("fanWeb.photo") : __msg("fanWeb.voice") }));
    } catch (requestError) {
      const message = publicationError(requestError, __msg("creator.mediaUploadFailed"));
      setError(message);
      setChapterStatus(message);
    } finally {
      setChapterSaving(false);
    }
  };

  const requestChapterMedia = async (mediaType, file, metadata = {}) => {
    if (mediaType === "VIDEO") {
      const url = URL.createObjectURL(file);
      try {
        const duration = await new Promise((resolve, reject) => {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () => resolve(Number(video.duration) || 0);
          video.onerror = () => reject(new Error(__msg("creator.unableToReadThisVideo")));
          video.src = url;
        });
        const limitSeconds = experience ? 30 : 120;
        if (duration > limitSeconds + 0.1) {
          setVideoTrimFile({ file, limitSeconds, metadata, target: "chapter", url });
          return;
        }
        URL.revokeObjectURL(url);
        return uploadChapterMedia(mediaType, file, metadata);
      } catch (durationError) {
        URL.revokeObjectURL(url);
        setError(durationError.message);
        return;
      }
    }
    if (mediaType === "IMAGE") setCropTarget({ kind: "chapter", url: URL.createObjectURL(file) });
    else uploadChapterMedia(mediaType, file, metadata);
  };

  const closeImageCrop = () => {
    if (cropTarget?.url) URL.revokeObjectURL(cropTarget.url);
    setCropTarget(null);
  };

  const useAdjustedImage = (file) => {
    const targetKind = cropTarget?.kind;
    closeImageCrop();
    if (targetKind === "cover") uploadCover(file);
    else uploadChapterMedia("IMAGE", file);
  };

  const addPlaceBlock = (label) => {
    const locationLabel = String(label || "").trim().slice(0, 120);
    if (!locationLabel || !activePlanetEditorChapter) return;
    const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory);
    updateActiveChapterBlocks([...blocks, { id: crypto.randomUUID(), metadata: { location: { label: locationLabel } }, order: blocks.length, text: locationLabel, type: "KEY_POINT" }], __msg("creator.addingPlace"));
  };

  const addStructuredBlocks = (newBlocks) => {
    if (!activePlanetEditorChapter || !newBlocks?.length) return false;
    const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory);
    return updateActiveChapterBlocks(
      [...blocks, ...newBlocks].map((block, order) => ({ ...block, order })),
      "Adding block...",
    );
  };

  const updateStructuredBlock = (blockId, changes) => {
    if (!activePlanetEditorChapter || !blockId) return false;
    const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory).map((block, order) =>
      block.id === blockId ? { ...block, ...changes, id: blockId, order } : { ...block, order },
    );
    return updateActiveChapterBlocks(blocks, "Saving block...");
  };

  const removeChapterBlock = (blockId) => {
    const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory)
      .filter((block) => block.id !== blockId)
      .map((block, order) => ({ ...block, order }));
    updateActiveChapterBlocks(blocks, "Removing block...");
  };

  const reorderChapterBlocks = (sourceId, targetId) => {
    const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory);
    const storyId = blocks.find((block) => block.type === "TEXT" && !block.metadata?.location)?.id;
    const source = sourceId === "__story__" ? storyId : sourceId;
    const target = targetId === "__story__" ? storyId : targetId;
    const sourceIndex = blocks.findIndex((block) => block.id === source);
    const targetIndex = blocks.findIndex((block) => block.id === target);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    updateActiveChapterBlocks(reordered.map((block, order) => ({ ...block, order })), "Reordering blocks...");
  };

  const submitWorld = async () => {
    const saved = await saveDraft();
    if (!saved) return;
    const validationTarget = experience ? {
      ...saved,
      chapters: (saved.chapters || []).map((chapter) => ({
        ...chapter,
        isPreview: saved.pricing?.mode === "FREE",
      })),
    } : saved;
    const messages = Object.values(worldCompletenessBySection(validationTarget)).flat();
    if (messages.length) {
      setError(messages[0]);
      return;
    }
    setSubmitting(true);
    setNotice(__msg("creator.publishing"));
    try {
      const response = await api[saved.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](saved.id, saved.statusVersion);
      const submitted = response.data.data.publication;
      setWorld((current) => ({ ...current, ...submitted }));
      setNotice(experience ? __msg("creator.experiencePublished") : __msg("creator.worldPublished"));
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      nav(experience && returnTo ? returnTo : experience ? `/experience/${submitted.id}` : `/world/${submitted.id}`, { replace: true });
    } catch (requestError) {
      if (["SELLER_VERIFICATION_REQUIRED", "SELLER_INFORMATION_REQUIRED"].includes(requestError.response?.data?.code)) {
        nav("/creator/seller-verification", { state: { returnTo: window.location.pathname } });
        return;
      }
      setError(publicationError(requestError));
      setNotice(__msg("creator.publishFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const addChapter = () => {
    const chapterLimit = experience ? null : 5;
    if (chapterLimit && chapters.length >= chapterLimit) {
      setError(__msg("creator.canHaveUpToChapters", { value0: experience ? __msg("create.premiumExperience") : __msg("financial.premiumWorld"), value1: chapterLimit }));
      return;
    }
    updateWorld({
      chapters: [
        ...chapters,
        {
          blocks: [],
          isPreview: false,
          localId: crypto.randomUUID(),
          title: __msg("profile.chapter_7c635d", { value0: chapters.length + 1 }),
        },
      ],
    });
    setNotice(__msg("creator.newChapterAddedOpenItToStartWriting"));
  };

  const previewExperience = () => {
    setExperiencePreviewOpen(true);
  };

  const addNamedExperienceChapter = async () => {
    const title = newChapterTitle.trim();
    if (!title) {
      setChapterCreateOpen(true);
      setChapterCreateError("");
      setError("");
      setNotice("");
      return;
    }
    if (saving || chapterSaving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const draft = await ensureDraft(world);
      await api.addChapter(draft.id, {
        blocks: [],
        isPreview: world.pricing?.mode === "FREE",
        releaseMode: "IMMEDIATE",
        statusVersion: draft.statusVersion,
        title,
      });
      await refreshWorld(draft.id);
      setNewChapterTitle("");
      setNotice(__msg("creator.chapterAddedTapItToStartWriting"));
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const createExperienceChapterAndWrite = async () => {
    const title = newChapterTitle.trim();
    if (!title) {
      setChapterCreateError(__msg("creator.nameThisChapterFirst"));
      return;
    }
    if (saving || chapterSaving) return;
    setSaving(true);
    setChapterCreateError("");
    setError("");
    try {
      const draft = await ensureDraft(world);
      const response = await api.addChapter(draft.id, {
        blocks: [],
        isPreview: world.pricing?.mode === "FREE",
        releaseMode: "IMMEDIATE",
        statusVersion: draft.statusVersion,
        title,
      });
      const createdId = response.data.data.chapter?.stableChapterId;
      const next = await refreshWorld(draft.id);
      const nextIndex = Math.max(0, next.chapters.findIndex((chapter) => chapter.stableChapterId === createdId));
      setNewChapterTitle("");
      setChapterCreateOpen(false);
      setActiveChapter(nextIndex);
      setChapterStory("");
      setChapterStatus("");
    } catch (requestError) {
      setChapterCreateError(publicationError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const removeChapter = async (index) => {
    const chapter = chapters[index];
    if (!chapter || removingChapterId) return;
    const label = chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 });
    if (!window.confirm(__msg("creator.removeValue0ThisAlsoRemovesEverythingSavedInside", { value0: label }))) return;

    if (!chapter.stableChapterId) {
      updateWorld({ chapters: chapters.filter((_, chapterIndex) => chapterIndex !== index) });
      setNotice(__msg("creator.chapterRemoved"));
      return;
    }

    setRemovingChapterId(chapter.stableChapterId);
    setError("");
    setNotice(__msg("creator.removingChapter"));
    try {
      const saved = await saveDraft();
      if (!saved) return;
      await api.deleteChapter(saved.id, chapter.stableChapterId, saved.statusVersion);
      const next = await refreshWorld(saved.id);
      setStoryPreviews((current) => {
        current.forEach(revokePreviewUrl);
        return storyPreviewsFromWorld(next);
      });
      setNotice(__msg("creator.chapterRemoved"));
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice(__msg("creator.chapterRemovalFailed"));
    } finally {
      setRemovingChapterId("");
    }
  };

  const draftExperienceWithAi = () => {
    const prompt = aiPrompt.trim() || __msg("creator.8WeekHomeWorkoutPlanForBeginners");
    setAiPrompt(prompt);
    setAiBusy(true);
    window.setTimeout(() => {
      const fitness = /workout|fitness|gym|training/i.test(prompt);
      updateWorld({
        title: fitness ? "8-Week Home Fitness Kickstart" : prompt.replace(/^\w/, (letter) => letter.toUpperCase()),
        description: fitness ? __msg("creator.aStructured8WeekProgramForPeopleStarting") : `A structured Experience built around ${prompt}, with a clear beginning, practical chapters, and a result people can carry forward.`,
        summary: fitness ? __msg("creator.aStructured8WeekProgramForPeopleStarting_350c66") : `A structured Experience built around ${prompt}.`,
        pricing: { mode: "ONE_TIME", presetId: "ONE_TIME_450", starsAmount: 450 },
      });
      setAiDrafted(true);
      setAiBusy(false);
    }, 700);
  };

  const generateExperienceCover = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280; canvas.height = 720;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, "#203753"); gradient.addColorStop(1, "#090d13");
    context.fillStyle = gradient; context.fillRect(0, 0, 1280, 720);
    context.fillStyle = "rgba(156,203,255,.9)"; context.font = "700 30px sans-serif"; context.fillText(__msg("creator.seenExperience"), 70, 90);
    context.fillStyle = "white"; context.font = "800 68px sans-serif";
    context.fillText((world.title || __msg("profile.untitledExperience")).slice(0, 28), 70, 570);
    canvas.toBlob((blob) => blob && uploadCover(new File([blob], "generated-experience-cover.jpg", { type: "image/jpeg" })), "image/jpeg", .86);
  };

  if (loading) return <div className="world-prototype-state">{__msg("creator.opening")} {experience ? __msg("creator.experience") : __msg("creator.world")}...</div>;

  if (experience && experiencePreviewOpen) return <ExperienceDraftPreview chapters={chapters} coverUrl={coverUrl} onClose={() => setExperiencePreviewOpen(false)} storyPreviews={storyPreviews} world={world} />;

  if (activePlanetEditorChapter) return (
    <>
      {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} source={cropTarget.url} /> : null}
      <SeenChapterEditor
        key={activePlanetEditorChapter.stableChapterId || activeChapter}
        busy={chapterSaving}
        chapter={activePlanetEditorChapter}
        error={error}
        flow={{
          canAdd: true,
          index: activeChapter,
          max: Math.max(chapters.length + 1, 2),
          nextLabel: activeChapter < chapters.length - 1 ? "Next" : "New chapter",
          onAdd: nextExperienceChapter,
          onBack: previousExperienceChapter,
          onFinish: finishExperienceChapters,
          onNext: nextExperienceChapter,
          onSelect: selectExperienceChapter,
          total: chapters.length,
        }}
        onAddBlocks={addStructuredBlocks}
        onAddPlace={addPlaceBlock}
        onDone={saveChapterStory}
        onMediaUpload={requestChapterMedia}
        onRemoveBlock={removeChapterBlock}
        onReorderBlocks={reorderChapterBlocks}
        onStoryChange={(value) => { setChapterStory(value); setChapterStatus("Saving…"); }}
        onTitleChange={(title) => {
          setWorld((current) => ({ ...current, chapters: (current.chapters || []).map((chapter, index) => index === activeChapter ? { ...chapter, title } : chapter) }));
          setChapterStatus("Saving…");
        }}
        onUpdateBlock={updateStructuredBlock}
        status={chapterStatus}
        story={chapterStory}
      />
    </>
  );

  if (experience && creationStarted && experienceStep === 1) return (
    <article className="experience-first-step">
      {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
      {videoTrimFile ? <VideoTrimSheet enableCrop file={videoTrimFile} limitSeconds={videoTrimFile.limitSeconds || 30} onCancel={() => { URL.revokeObjectURL(videoTrimFile.url); setVideoTrimFile(null); }} onUpload={async (file) => { if (videoTrimFile.target === "chapter") await uploadChapterMedia("VIDEO", file, videoTrimFile.metadata || {}); else await addStoryPreview({ file, caption: __msg("creator.previewVideo"), replaceId: videoTrimFile.replaceId }); URL.revokeObjectURL(videoTrimFile.url); setVideoTrimFile(null); }} /> : null}
      {voiceSheetOpen ? <ExperienceVoiceSheet onClose={() => setVoiceSheetOpen(false)} onSave={(file) => { const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); return addStoryPreview({ file, caption: __msg("creator.voiceHello"), replaceId: voice?.id || "" }); }} onUploadFile={() => voiceInputRef.current?.click()} /> : null}
      <header><button aria-label={__msg("discover.back")} onClick={leaveComposer} type="button"><FiArrowLeft /></button><div><h1>{__msg("creator.nameYourExperience")}</h1><p>{__msg("creator.aStageOfLifeWithABeginningAndA")}</p></div><button className="experience-first-preview" onClick={previewExperience} type="button"><FiEye /> {__msg("admin.preview")}</button></header>
      <ExperienceProgress step={1} />
      <main>
        <input className="experience-step-input" maxLength={120} onChange={(event) => updateWorld({ title: event.target.value })} placeholder={__msg("creator.titleEGMovingToDubai")} value={world.title} />
        <input className="experience-step-input" maxLength={300} onChange={(event) => updateWorld({ description: event.target.value, experiencePath: event.target.value, summary: event.target.value })} placeholder={__msg("creator.thePathFromToFromOfficeToMyOwn")} value={world.experiencePath || ""} />

        <p className="experience-field-label">{__msg("creator.premiumPrice")}</p>
        <div className="experience-premium-price">
          <div className="experience-premium-price-entry"><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" /><input aria-label={__msg("creator.oneTimeExperiencePrice")} min="10" onChange={(event) => { const amount = Math.max(10, Math.round(Number(event.target.value) || 10)); updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${amount}`, starsAmount: amount } }); }} type="number" value={world.pricing?.starsAmount || 190} /><small>{__msg("creator.oneTimeUnlockAllChaptersIncludedAfterPurchase")}</small></div>
          <div className="experience-premium-presets">{[150, 300, 500, 900].map((amount) => <button className={Number(world.pricing?.starsAmount) === amount ? "is-selected" : ""} key={amount} onClick={() => updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${amount}`, starsAmount: amount } })} type="button">🪙{amount}</button>)}</div>
          <p>≈ ${(Number(world.pricing?.starsAmount || 190) * .068).toFixed(2)} {__msg("messages.toYou")}</p>
        </div>
        <button className={`experience-download-row ${world.allowDownload ? "is-on" : ""}`} onClick={() => updateWorld({ allowDownload: !world.allowDownload })} type="button"><span>↥</span><span><strong>{__msg("creator.allowDownload")}</strong><small>{__msg("creator.watermarkedPdfTextAndPhotosOnly")}</small></span><em>{world.allowDownload ? __msg("fanWeb.on") : __msg("fanWeb.off")}</em></button>

        <p className="experience-field-label">{__msg("creator.category")}</p>
        <div className="experience-category-chips">{["Travel", "Fitness", "Lifestyle", "Business", "Tech", "Psychology", "Fashion", "Beauty", "Wellness", "Food"].map((category) => <button className={world.category === category ? "is-selected" : ""} key={category} onClick={() => updateWorld({ category })} type="button">{category}</button>)}</div>

        <p className="experience-field-label">{__msg("creator.cover_183bb4")}</p>
        <div className="experience-cover-line"><div className="experience-cover-wrap"><button className="experience-cover-preview" onClick={() => coverInputRef.current?.click()} type="button">{coverUrl ? <img alt={__msg("creator.experienceCover")} src={coverUrl} /> : uploading ? <FiLoader className="world-story-upload-spinner" /> : <FiPlus />}</button>{coverUrl ? <button aria-label={__msg("creator.removeCoverImage")} className="experience-media-remove" disabled={uploading} onClick={removeCover} type="button"><FiX /></button> : null}</div><div><button className="experience-outline-pill" disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">{uploading ? __msg("creator.uploading") : coverUrl ? __msg("creator.replace") : __msg("creator.upload_630cc6")}</button><small>{coverUrl ? __msg("creator.coverAddedShownOnTheCardAndInside") : __msg("creator.1691280pxShownOnTheCardAndInside")}</small></div></div>
        <button className="experience-generate-cover" disabled={uploading} onClick={generateExperienceCover} type="button">{__msg("creator.generateFromTitle")}</button><small className="experience-another-look">{__msg("creator.anotherTapAnotherLook")}</small>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />

        <p className="experience-field-label">{__msg("creator.previewTheTrustLayer")}</p>
        <p className="experience-trust-copy">{__msg("creator.oneShortVideoOfYouRealPhotosWorldsWith")}</p>
        {(() => { const video = storyPreviews.find((item) => item.file?.type?.startsWith("video/") || item.media?.mediaType === "VIDEO"); return <div className="experience-media-wrap"><button className={`experience-video-drop ${video ? "has-media" : ""}`} onClick={() => videoInputRef.current?.click()} type="button">{video?.url ? <><video muted playsInline preload="metadata" src={video.url} /><span>{__msg("creator.shortVideoAddedTapToReplace")}</span></> : <span>{__msg("creator.addAVideoMaximum30Seconds")}</span>}</button>{video ? <button aria-label={__msg("creator.removePreviewVideo")} className="experience-media-remove" onClick={() => removeStoryPreview(video.id)} type="button"><FiX /></button> : null}</div>; })()}
        <div className="experience-photo-slots">{[0, 1, 2].map((index) => { const preview = storyPreviews.filter((item) => item.file?.type?.startsWith("image/") || item.media?.mediaType === "IMAGE")[index]; return <div className="experience-photo-slot" key={index}><button onClick={() => { previewPhotoSlotRef.current = { index, replaceId: preview?.id || "" }; previewInputRef.current?.click(); }} type="button">{preview?.url ? <img alt={__msg("financial.preview", { value0: index + 1 })} src={preview.url} /> : "▣"}</button>{preview ? <button aria-label={__msg("creator.removePreviewPhoto", { value0: index + 1 })} className="experience-media-remove" onClick={() => removeStoryPreview(preview.id)} type="button"><FiX /></button> : null}</div>; })}</div>
        {(() => { const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); return <div className="experience-media-wrap"><button className={`experience-voice-drop ${voice ? "has-media" : ""}`} onClick={() => setVoiceSheetOpen(true)} type="button">🎙 {voice ? __msg("creator.voiceHelloAddedTapToReviewOrReplace") : __msg("creator.addAVoiceHelloRecordLiveOrUploadAudio")}</button>{voice ? <button aria-label={__msg("creator.removeVoiceHello")} className="experience-media-remove" onClick={() => removeStoryPreview(voice.id)} type="button"><FiX /></button> : null}</div>; })()}
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const selection = previewPhotoSlotRef.current; event.target.value = ""; previewPhotoSlotRef.current = null; if (file) addStoryPreview({ file, caption: `Preview photo ${(selection?.index ?? 0) + 1}`, replaceId: selection?.replaceId || "" }); }} ref={previewInputRef} type="file" />
        <input accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const video = storyPreviews.find((item) => item.file?.type?.startsWith("video/") || item.media?.mediaType === "VIDEO"); event.target.value = ""; if (file) setVideoTrimFile({ file, replaceId: video?.id || "", url: URL.createObjectURL(file) }); }} ref={videoInputRef} type="file" />
        <input accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); event.target.value = ""; if (file) { addStoryPreview({ file, caption: __msg("creator.voiceHello"), replaceId: voice?.id || "" }); setVoiceSheetOpen(false); } }} ref={voiceInputRef} type="file" />
        <StoryCreator isOpen={storyComposerOpen} mode="compose" onClose={() => setStoryComposerOpen(false)} onSave={addStoryPreview} />
        {storyAutoSaving ? <p className="experience-media-status"><FiLoader className="world-story-upload-spinner" /> {__msg("creator.savingPreviewMedia")}</p> : storyPreviews.length ? <p className="experience-media-status is-saved"><FiCheck /> {storyPreviews.length} {__msg("creator.preview")} {storyPreviews.length === 1 ? __msg("creator.item") : __msg("admin.items")} {__msg("creator.saved")}</p> : null}
        {error ? <p aria-live="assertive" className="world-publish-error">{__systemMessage(error)}</p> : null}
        <button className="experience-first-continue" disabled={!world.title.trim() || !world.experiencePath?.trim() || !world.category || !coverUrl || uploading} onClick={continueExperienceDetails} type="button">{__msg("profile.continue")}</button>
      </main>
    </article>
  );

  if (experience && creationStarted && experienceStep === 2) return (
    <article className="experience-chapters-step">
      <header>
        <button aria-label={__msg("creator.backToExperienceDetails")} onClick={() => setExperienceStep(1)} type="button"><FiArrowLeft /></button>
        <div><h1>{__msg("creator.buildTheChapters")}</h1><p>{world.title}</p></div>
        <div className="experience-chapters-head-actions"><button disabled={saving} onClick={saveDraft} type="button">{saving ? __msg("financial.saving") : __msg("creator.saveForLater")}</button></div>
      </header>
      <ExperienceProgress step={2} />
      <main>
        <p className="experience-chapters-intro">{__msg("creator.photosPlacesStoriesLessonsEachChapterIsOneStep")}</p>
        {!chapters.length ? <p className="experience-chapters-guidance">{__msg("creator.startWithOneChapterYouCanPublishFromA")}</p> : null}
        <small className="experience-chapters-tip">{__msg("creator.tapAChapterToWriteInsideTextColorMarker")}</small>
        <div className="experience-builder-list">
          {chapters.map((chapter, index) => {
            const thumbnail = (chapter.blocks || []).find((block) => block.type === "IMAGE" && block.media?.secureUrl)?.media?.secureUrl || (index === 0 ? coverUrl : "");
            const storyText = chapterStoryText(chapter).trim();
            return <div className="experience-builder-chapter" key={chapter.stableChapterId || chapter.localId || index}>
              <button className="experience-builder-open" onClick={() => openChapterEditor(index)} type="button">
                <span className="experience-builder-thumb">{thumbnail ? <img alt="" src={thumbnail} /> : <b>{index + 1}</b>}</span>
                <span><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong><small>{storyText ? storyText.slice(0, 70) : __msg("creator.writeAboutYourStory")}</small></span><i>›</i>
              </button>
              <button aria-label={__msg("contentEntities.remove", { value0: chapter.title || __msg("creator.chapterValue0", { value0: index + 1 }) })} className="experience-builder-remove" disabled={Boolean(removingChapterId)} onClick={() => removeChapter(index)} type="button"><FiX /></button>
            </div>;
          })}
        </div>
        <div className="experience-new-chapter"><input maxLength={120} onChange={(event) => setNewChapterTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addNamedExperienceChapter(); } }} placeholder={__msg("creator.nextChapter")} value={newChapterTitle} /><button disabled={saving || !newChapterTitle.trim()} onClick={addNamedExperienceChapter} type="button">{saving ? __msg("stories.adding_ffb2e6") : __msg("publication.add")}</button></div>
        <button className="experience-add-from-notes" type="button">{__msg("creator.addFromMyNotes")} <small>{__msg("creator.optional")}</small><span>▾</span></button>
        {error ? <p aria-live="assertive" className="world-publish-error">{__systemMessage(error)}</p> : null}
        <button className="experience-chapters-continue" disabled={!chapters.length || saving} onClick={async () => { const saved = await saveDraft(); if (saved) setExperienceStep(3); }} type="button">{saving ? __msg("financial.saving") : __msg("profile.continue")}</button>
      </main>
      {chapterCreateOpen ? (
        <div className="experience-chapter-create-layer" role="presentation">
          <button aria-label={__msg("creator.closeChapterCreator")} className="experience-chapter-create-dim" onClick={() => setChapterCreateOpen(false)} type="button" />
          <section aria-labelledby="experience-chapter-create-title" aria-modal="true" className="experience-chapter-create-sheet" role="dialog">
            <span />
            <h2 id="experience-chapter-create-title">{__msg("profile.chapter")} {chapters.length + 1}</h2>
            <p>{__msg("creator.nameItThenWriteThePageUpTo2")}</p>
            <input
              autoFocus
              maxLength={120}
              onChange={(event) => {
                setNewChapterTitle(event.target.value);
                setChapterCreateError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setChapterCreateOpen(false);
                if (event.key === "Enter") createExperienceChapterAndWrite();
              }}
              placeholder={__msg("publication.chapterTitle")}
              value={newChapterTitle}
            />
            {chapterCreateError ? <p className="experience-chapter-create-error" role="alert">{chapterCreateError}</p> : null}
            <button disabled={saving || !newChapterTitle.trim()} onClick={createExperienceChapterAndWrite} type="button">{saving ? __msg("creator.creating") : __msg("creator.createWrite")}</button>
          </section>
        </div>
      ) : null}
    </article>
  );

  if (experience && creationStarted && experienceStep === 3) return (
    <article className="experience-final-preview experience-final-review">
      {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
      <header><button aria-label={__msg("creator.backToChapters")} onClick={() => { const index = Math.max(0, chapters.length - 1); setExperienceStep(2); setActiveChapter(index); setChapterStory(chapterStoryText(chapters[index])); setChapterStatus("Draft saved"); }} type="button"><FiArrowLeft /></button><div><h1>{__msg("creator.oneLastLook")}</h1><p>{__msg("creator.exactlyWhatPeopleWillSee")}</p></div><aside><button className="experience-final-preview-button" onClick={previewExperience} type="button"><FiEye /> {__msg("admin.preview")}</button><button className="experience-final-save-later" disabled={saving} onClick={saveDraft} type="button">{saving ? __msg("financial.saving") : __msg("creator.saveForLater")}</button></aside></header>
      <ExperienceProgress step={3} />
      <main>
        <section className="experience-review-card">
          <div className="experience-review-cover">{coverUrl ? <img alt={__msg("discover.cover", { value0: world.title })} src={coverUrl} /> : null}<FiEye /></div>
          <div className="experience-review-summary"><h2>{world.title}</h2><p>{world.category || __msg("contentEntities.experience")} · {chapters.length} {__msg("profile.chapters_7790c6")} {STAR}{world.pricing?.starsAmount} {__msg("creator.oneTime")}</p></div>
          <div className="experience-review-creator">{user?.avatar ? <img alt="" src={user.avatar} /> : <span>{(user?.name || user?.username || "C").slice(0, 1).toUpperCase()}</span>}<strong>{user?.name || user?.username || __msg("discover.creator")}</strong><FiCheck /></div>
          <div className="experience-review-chapters">
            {chapters.map((chapter, index) => <div key={chapter.stableChapterId || chapter.localId || index}><i>{index + 1}</i><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong><em><FiLock /></em></div>)}
          </div>
        </section>
        <section className="experience-final-settings">
          <header><span>{__msg("creator.finalDetails")}</span><small>{__msg("creator.autosaved")}</small></header>
          <button className={`experience-final-cover ${coverUrl ? "has-cover" : ""}`} disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">
            {coverUrl ? <img alt={__msg("creator.experienceCover")} src={coverUrl} /> : <FiPlus />}
            <span>{uploading ? __msg("creator.uploading") : coverUrl ? __msg("profile.changeCover") : __msg("creator.addCover")}</span>
          </button>
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />
          <label><span>{__msg("content.title")}</span><input maxLength={120} onChange={(event) => updateWorld({ title: event.target.value })} placeholder={__msg("creator.nameYourExperience")} value={world.title} /></label>
          <label><span>{__msg("content.description")}</span><textarea maxLength={300} onChange={(event) => updateWorld({ description: event.target.value, experiencePath: event.target.value, summary: event.target.value })} placeholder={__msg("creator.whatJourneyWillPeopleTake")} rows={3} value={world.experiencePath || ""} /></label>
          <div className="experience-final-settings-grid">
            <label><span>{__msg("content.category")}</span><select onChange={(event) => updateWorld({ category: event.target.value })} value={world.category}><option value="">{__msg("creator.choose")}</option>{["Travel", "Fitness", "Lifestyle", "Business", "Tech", "Psychology", "Fashion", "Beauty", "Wellness", "Food"].map((category) => <option key={category}>{category}</option>)}</select></label>
            <label><span>{__msg("fan.price")}</span><div className="experience-final-price"><b>{STAR}</b><input aria-label={__msg("creator.oneTimeExperiencePrice")} min="10" onChange={(event) => { const amount = Math.max(10, Math.round(Number(event.target.value) || 10)); updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${amount}`, starsAmount: amount } }); }} type="number" value={world.pricing?.starsAmount || 190} /></div></label>
          </div>
          <label><span>{__msg("fanWeb.location")} <em>{__msg("creator.optional")}</em></span><button className="experience-final-location" onClick={() => setLocationPickerOpen(true)} type="button"><FiMapPin />{world.experienceLocation || __msg("creator.addALocation")}</button></label>
          {locationPickerOpen ? <UniversalLocationPicker onClose={() => setLocationPickerOpen(false)} onSelect={(experienceLocation) => updateWorld({ experienceLocation })} value={world.experienceLocation || ""} /> : null}
          <button aria-pressed={world.allowDownload} className={`experience-final-toggle ${world.allowDownload ? "is-on" : ""}`} onClick={() => updateWorld({ allowDownload: !world.allowDownload })} type="button"><span><strong>{__msg("creator.allowDownload")}</strong><small>{__msg("creator.watermarkedTextAndPhotos")}</small></span><i><b /></i></button>
        </section>
        <button className="experience-review-save" disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button">{submitting ? <><FiLoader className="world-story-upload-spinner" /> {__msg("creator.publishing_74f811")}</> : __msg("creator.publishExperience")}</button>
        {error ? <p aria-live="assertive" className="world-publish-error">{__systemMessage(error)}</p> : null}
      </main>
    </article>
  );

  if (experience && creationStarted) return (
    <article className="experience-create-page">
      <header className="experience-create-head">
        <button aria-label={__msg("discover.back")} onClick={leaveComposer} type="button"><FiArrowLeft /></button>
        <h1>{__msg("creator.newExperience")}</h1>
        {world.id ? <button className="experience-save-later" disabled={saving} onClick={saveDraft} type="button">{__msg("creator.saveForLater")}</button> : <span />}
      </header>
      <main className="experience-create-body">
        <section className="experience-ai-builder">
          <h2><span>✦</span> {__msg("creator.aiExperienceBuilder")}</h2>
          <input onChange={(event) => setAiPrompt(event.target.value)} placeholder={__msg("creator.describeYourExperienceInAFewWords")} value={aiPrompt} />
          <button disabled={aiBusy} onClick={draftExperienceWithAi} type="button">{aiBusy ? __msg("creator.drafting") : __msg("creator.draftItForMe")}</button>
          {aiDrafted ? <p>{__msg("creator.aiDraftEditAsNeeded")} <button onClick={draftExperienceWithAi} type="button">{__msg("discover.tryAgain")}</button></p> : null}
        </section>

        {aiDrafted ? <div className="experience-title-chips">
          {["8-Week Home Fitness Kickstart", "Beginner’s 8-Week Home Plan", "Home Fitness Foundations"].map((title) => <button className={world.title === title ? "is-selected" : ""} key={title} onClick={() => updateWorld({ title })} type="button">{title}</button>)}
        </div> : null}

        <p className="experience-field-label">{__msg("creator.details")}</p>
        <button className={`experience-cover-drop ${coverUrl ? "has-cover" : ""}`} disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">
          {coverUrl ? <img alt={__msg("creator.experienceCover")} src={coverUrl} /> : <><FiPlus /><span>{__msg("creator.addCoverSquareCropRecommended")}</span></>}
          {uploading ? <FiLoader className="world-story-upload-spinner" /> : null}
        </button>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />
        <input className="experience-form-input" maxLength={120} onChange={(event) => updateWorld({ title: event.target.value })} placeholder={__msg("content.title")} value={world.title} />
        <textarea className="experience-form-input" maxLength={300} onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })} placeholder={__msg("content.description")} value={world.description} />
        <div className="experience-inline-fields">
          <select className="experience-form-input" onChange={(event) => updateWorld({ category: event.target.value })} value={world.category}><option value="">{__msg("content.category")}</option>{WORLD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
          <button className="experience-form-input" onClick={() => setLocationPickerOpen(true)} type="button">{world.experienceLocation || __msg("fanWeb.location")}</button>
          {locationPickerOpen ? <UniversalLocationPicker onClose={() => setLocationPickerOpen(false)} onSelect={(experienceLocation) => updateWorld({ experienceLocation })} value={world.experienceLocation || ""} /> : null}
        </div>

        <p className="experience-field-label">{__msg("creator.content")}</p>
        <div className="experience-content-cards">
          <button onClick={addChapter} type="button"><strong>{__msg("creator.chapters")}</strong><small>{chapters.length} {__msg("creator.added")}</small></button>
          <button onClick={() => coverInputRef.current?.click()} type="button"><strong>{__msg("profile.photos")}</strong><small>{coverUrl ? "1 / 20" : "0 / 20"}</small></button>
          <button onClick={() => coverInputRef.current?.click()} type="button"><strong>{__msg("profile.video")}</strong><small>{world.coverMedia?.mediaType === "VIDEO" ? __msg("system.previewUsage", { count: 1 }) : __msg("system.previewUsage", { count: 0 })}</small></button>
        </div>
        <div className="experience-chapter-list">
          {chapters.map((chapter, index) => <button key={chapter.stableChapterId || chapter.localId || index} onClick={() => openChapterEditor(index)} type="button"><span>{index + 1}</span><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong><small>{__msg("creator.lockedUntilPurchase")}</small><i>›</i></button>)}
        </div>
        <p className="experience-preview-note">{__msg("creator.everyChapterUnlocksAfterTheOneTimePurchase")}</p>

        <p className="experience-field-label">{__msg("creator.price")}</p>
        <div className="experience-price-input"><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" /><input min="10" onChange={(event) => { const price = Math.max(10, Number(event.target.value) || 10); updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${price}`, starsAmount: price } }); }} placeholder={__msg("creator.priceInCoins")} type="number" value={world.pricing?.starsAmount || 190} /></div>
        <p className="experience-price-hint">{__msg("creator.suggested")} <strong><img alt="coins" className="inline-block h-[1em] w-[1em] shrink-0 object-contain align-[-0.12em]" src="/brand/goldcoin.png" />190–500</strong> {__msg("creator.basedOnSimilarExperiences")}</p>
        <label className="experience-world-toggle"><span><strong>{__msg("creator.includeInMyWorld")}</strong><small>{__msg("creator.optionalAccessForActiveWorldMembersThisExperienceRemains")}</small></span><input checked={Boolean(world.includedInWorld)} onChange={(event) => updateWorld({ includedInWorld: event.target.checked })} type="checkbox" /></label>
        {error ? <p aria-live="assertive" className="world-publish-error">{__systemMessage(error)}</p> : null}
        <div className="experience-create-actions"><button disabled={saving} onClick={saveDraft} type="button">{saving ? __msg("financial.saving") : __msg("publication.saveDraft")}</button><button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button">{submitting ? __msg("creator.publishing_74f811") : __msg("posts.publish")}</button></div>
      </main>
    </article>
  );

  if (!creationStarted) return (
    <article className="planet-create-entry">
      <header><button aria-label={__msg("discover.back")} onClick={() => nav(-1)} type="button"><FiArrowLeft /></button><div><span>{experience ? __msg("creator.experienceCreation") : __msg("creator.worldCreation")}</span><h1>{__msg("fanWeb.create")} {experience ? __msg("creator.anExperience") : __msg("creator.aWorld")}</h1></div></header>
      <p className="planet-create-intro">{experience ? __msg("creator.experiencesArePremiumStructuredJourneysMadeOfChaptersUnlocked") : __msg("creator.aWorldIsYourPrivateSpaceOnYourProfile")}</p>
      <button className="planet-choice-card is-selected" onClick={() => setCreationStarted(true)} type="button">
        <span className="planet-choice-orbit"><i>✦</i><b>{experience ? STAR : PLANET}</b></span>
        <span><strong>{experience ? __msg("contentEntities.experience") : __msg("profile.yourWorld")}</strong><small>{experience ? __msg("creator.unlimitedPremiumExperiencesOneTimeUnlock") : __msg("creator.onePerCreatorMonthlySubscriptionProfileOnly")}</small><em>{experience ? __msg("creator.aFocusedPremiumJourneyThatUnlocksPermanentlyAfterPurchase") : __msg("creator.premiumChaptersPrivateStoriesAndCloserAccessAllTogether")}</em></span>
        <FiArrowUpRight />
      </button>
      <div className="planet-create-principles"><span><FiCheck /> {experience ? __msg("creator.publishesImmediately") : __msg("creator.oneClearMonthlyPrice")}</span><span><FiCheck /> {experience ? __msg("creator.oneTimePremiumUnlock") : __msg("creator.1FreePreviewChapter")}</span><span><FiCheck /> {experience ? __msg("creator.youChooseThePrice") : __msg("creator.upTo3PreviewStories")}</span></div>
      <button className="planet-create-continue" onClick={() => setCreationStarted(true)} type="button">{__msg("creator.buildMy")} {experience ? __msg("contentEntities.experience") : __msg("admin.world")} <FiArrowUpRight /></button>
      <small className="planet-create-footnote">{experience ? __msg("creator.experiencesLiveInTheirOwnProfileSectionWorldInclusion") : __msg("creator.worldsLiveOnYourProfileOnlyTheyNeverAppear")}</small>
    </article>
  );

  return (
    <>
    {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
    <article className="world-prototype-page world-publish-page">
      <header className="world-prototype-top">
        <button aria-label={__msg("discover.back")} onClick={() => nav(-1)} type="button"><FiArrowLeft /></button>
        <div>
        {world.id ? <button aria-label={__msg("creator.openPublic", { value0: experience ? "experience" : "world" })} onClick={() => window.open(`/${experience ? "experience" : "world"}/${world.id}`, "_blank", "noopener,noreferrer")} type="button"><FiExternalLink /></button> : null}
          <button aria-label={__msg("creator.moreWorldActions")} type="button"><FiMoreHorizontal /></button>
        </div>
      </header>

      {!experience ? (
        <section className="world-prototype-planet world-publish-planet world-create-brand">
          <MinimalWorldIcon size={72} />
          <p>{__msg("profile.yourWorld")}</p>
        </section>
      ) : null}

      {paidWorldRestricted ? <aside className="world-seller-readiness" role="note">
        <FiLock aria-hidden="true" />
        <span><b>{monetization.sellerReady ? __msg("social.verification") : __msg("system.SellerVerificationPage.f730c577bc")}</b><small>{monetization.sellerReady ? __msg("Paid items stay Only you until Verification") : __msg("Seller info once — takes a minute")}</small><em>{__msg("Your draft remains Only you until you can sell")}</em></span>
        <button onClick={() => nav("/settings/monetization", { state: { returnTo: window.location.pathname } })} type="button">{__msg("Set up")}</button>
      </aside> : null}

      {!experience ? (
        <section className={`world-top-cover-preview ${coverUrl ? "has-cover" : ""}`}>
          {coverUrl
            ? (world.coverMedia?.mediaType === "VIDEO" || world.coverMedia?.resourceType === "video" ? <video controls playsInline preload="metadata" src={coverUrl} /> : <img alt={__msg("creator.coverPreview", { value0: world.title || __msg("admin.world") })} src={coverUrl} />)
            : <div><FiPlus /><strong>{__msg("creator.addACoverImage")}</strong><small>{__msg("creator.previewHowYourWorldWillAppear")}</small></div>}
          <span className="world-top-cover-actions">
            <button disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button"><FiEdit3 /> {coverUrl ? __msg("creator.change") : __msg("creator.addCover")}</button>
            {coverUrl ? <button className="is-remove" disabled={uploading} onClick={removeCover} type="button"><FiTrash2 /> {__msg("profile.remove")}</button> : null}
          </span>
        </section>
      ) : null}

      {!experience ? <>
      <section className="world-prototype-story-previews" id="world-preview-stories">
        <div className="world-prototype-section-head is-compact">
          <h2>{__msg("admin.stories")}</h2>
          <span>{__msg("creator.upTo3SeenBeforePurchase")}</span>
        </div>
        <div>
          {freeStories.map((story) => (
            <span className="world-prototype-story-thumb" key={story.id}>
              <button aria-label={__msg("creator.openStoryPreview")} className="world-prototype-story-open" onClick={() => setActiveStoryId(story.id)} type="button">
                <img alt={__msg("creator.worldStoryPreview")} src={story.url} />
                <small>{story.label}</small>
              </button>
              <button aria-label={__msg("creator.removeStoryPreview")} onClick={() => removeStoryPreview(story.id)} type="button"><FiX /></button>
            </span>
          ))}
          {freeStories.length < STORY_PREVIEW_LIMIT ? (
          <button className="world-prototype-story-add" onClick={() => { setStoryAudience("FREE"); setStoryComposerOpen(true); }} type="button">
            <FiPlus />
            <span>{__msg("creator.add_58d1bb")}</span>
          </button>
          ) : null}
        </div>
      </section>

      <section className="world-prototype-story-rings world-create-legacy-stories" hidden>
        <h2><FiLock /> {__msg("creator.subscriberStories")}</h2>
        <p className="world-prototype-story-access-note">{__msg("creator.onlyActiveSubscribersCanOpenTheseStories")}</p>
        <div>
          {subscriberStories.map((story) => (
            <span className="world-prototype-story-ring-item" key={story.id}>
              <button className="is-active" onClick={() => setActiveStoryId(story.id)} type="button"><FiLock /><span>{story.label}</span></button>
              <button aria-label={__msg("creator.removeSubscriberStory", { value0: story.label })} className="world-prototype-story-ring-remove" onClick={() => removeStoryPreview(story.id)} type="button"><FiX /></button>
            </span>
          ))}
          {subscriberStories.length < SUBSCRIBER_STORY_LIMIT ? <button onClick={() => { setStoryAudience("SUBSCRIBER"); setStoryComposerOpen(true); }} type="button"><FiPlus /><span>{__msg("discover.new")}</span></button> : null}
        </div>
      </section>

      <StoryCreator isOpen={storyComposerOpen} mode="compose" onClose={() => setStoryComposerOpen(false)} onSave={addStoryPreview} />

      {activeStory ? (
        <div aria-label={__msg("creator.worldStoryPreview")} aria-modal="true" className="world-story-preview-viewer" onClick={() => setActiveStoryId("")} role="dialog">
          <button aria-label={__msg("creator.closeStoryPreview")} onClick={() => setActiveStoryId("")} type="button"><FiX /></button>
          <img alt={__msg("creator.selectedWorldStoryPreview")} src={activeStory.url} />
          <span>{activeStory.label}</span>
        </div>
      ) : null}</> : null}

      <section className="world-prototype-creator">
        <span>{ownerName.split(" ")[0]} <b>✓</b> - <strong>{Number(world.steppedInside || world.viewCount || 0).toLocaleString(__uiLocale())}</strong> {__msg("discover.steppedInside")}</span>
        {!experience ? <>
          <span>{ownerName.split(" ")[0]} <b>✓</b> · <strong>0</strong> {__msg("creator.residents_f012b0")}</span>
          <span className="world-prototype-seat-row is-create-preview">
            <i><u style={{ width: "0%" }} /></i>
            <small>{__msg("creator.0250Seats")} {STAR}{world.pricing?.starsAmount || 190}{__msg("system.perMonth")}</small>
          </span>
        </> : null}
      </section>

      {experience ? <div className="world-prototype-premium-pill">{__msg("creator.premiumExperienceAllChaptersUnlockFor")} {STAR}{world.pricing?.starsAmount || 190} {__msg("profile.once")}</div> : (
        <button className="world-prototype-premium-pill world-create-price-trigger" onClick={() => setWorldCreateSheet("price")} type="button">
          {PLANET} {__msg("creator.premiumWorldUpTo3PreviewStories")} {STAR}{world.pricing?.starsAmount || 190}{__msg("system.perMonth")} <FiEdit3 />
        </button>
      )}

      {experience ? <input
        aria-label={__msg("creator.experienceTitle")}
        className={inputClass("world-publish-title")}
        maxLength={120}
        onChange={(event) => updateWorld({ title: event.target.value })}
        placeholder={__msg("creator.nameYourPremiumExperience")}
        value={world.title}
      /> : <div className="world-prototype-title-row">
        <button aria-label={__msg("creator.nameYourWorld")} className="world-prototype-title-button world-create-title-button" onClick={() => setWorldCreateSheet("name")} type="button">
          <span className={`world-prototype-title ${world.title ? "" : "is-placeholder"}`}>{world.title || __msg("creator.nameYourWorld")}</span>
          <FiEdit3 />
        </button>
      </div>}

      <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />

      {experience ? <textarea
        aria-label={__msg("creator.experienceDescription")}
        className={inputClass("world-publish-summary")}
        maxLength={300}
        onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })}
        placeholder={experience ? __msg("creator.describeTheJourneyFromBeginningToOutcome") : __msg("creator.describeWhatMembersWillExperience")}
        value={world.description}
      /> : null}

      {experience ? <section className="planet-create-fieldset planet-price-section">
        <div className="world-prototype-section-head"><h2>{experience ? __msg("creator.unlockPrice") : __msg("creator.subscriptionPrice")}</h2><span>{experience ? __msg("creator.oneTimePermanentAccess") : __msg("creator.oneHonestMonthlyPrice")}</span></div>
        <div className="planet-price-options">{MONTHLY_PRICES.map((price) => <button className={Number(world.pricing?.starsAmount) === price ? "is-selected" : ""} key={price} onClick={() => updateWorld({ pricing: { mode: experience ? "ONE_TIME" : "MONTHLY", presetId: `${experience ? "ONE_TIME" : "MONTHLY"}_${price}`, starsAmount: price } })} type="button"><strong>{STAR}{price}</strong><small>{experience ? __msg("profile.once") : __msg("system.perMonthFull")}</small>{price === 490 ? <em>{__msg("discover.recommended")}</em> : null}</button>)}</div>
        <div className="planet-price-preview"><span>10 {experience ? __msg("creator.unlocks") : __msg("discover.members")} <b>{STAR}{(world.pricing?.starsAmount || 190) * 10}{experience ? "" : __msg("system.perMonth")}</b></span><span>50 {experience ? __msg("creator.unlocks") : __msg("discover.members")} <b>{STAR}{(world.pricing?.starsAmount || 190) * 50}{experience ? "" : __msg("system.perMonth")}</b></span></div>
      </section> : null}

      {experience ? <label className="experience-world-toggle"><span><strong>{__msg("creator.includeInMyWorld")}</strong><small>{__msg("creator.worldMembersCanAccessThisWhileSubscribedSeparateBuyers")}</small></span><input checked={Boolean(world.includedInWorld)} onChange={(event) => updateWorld({ includedInWorld: event.target.checked })} type="checkbox" /></label> : null}

      {!experience ? <section className="world-prototype-owner-settings">
        <span className="world-prototype-direct-access world-create-direct-access">
          <span><FiZap /></span><b>Direct Access</b><small>{__msg("creator.membersFirst1FreeReplyIncluded")}</small><i><FiArrowUpRight /></i>
        </span>
        <button className="world-create-welcome-row" onClick={() => setWorldCreateSheet("welcome")} type="button">
          <span className="world-create-welcome-icon" aria-hidden="true">∞</span>
          <span><b>{__msg("admin.welcomeMessage")}</b><small>{world.ownerWelcomeNote || world.worldWelcomeVoiceMedia ? __msg("system.WorldPublishingPage.52a176d87e") : __msg("system.WorldPublishingPage.427def9395")}</small></span>
          <strong>{world.ownerWelcomeNote || world.worldWelcomeVoiceMedia ? __msg("profile.edit") : __msg("publication.add")} <FiArrowUpRight /></strong>
        </button>
        <button aria-controls="world-create-settings-list" aria-expanded={worldCreateSheet === "settings"} className={`world-prototype-settings-row ${worldCreateSheet === "settings" ? "is-expanded" : ""}`} onClick={() => setWorldCreateSheet((current) => current === "settings" ? "" : "settings")} type="button">
          <FiSettings /><b>{__msg("creator.worldSettings")}</b><FiArrowUpRight className="world-settings-chevron" />
        </button>
        {worldCreateSheet === "settings" ? <div className="world-settings-list" id="world-create-settings-list">
          <p>{__msg("creator.insideYourWorld")}</p>
          <button className="world-settings-item is-add" onClick={() => { setWorldCreateSheet(""); openWorldManagement("include"); }} type="button"><span className="world-settings-status"><FiPlus /></span><span className="world-settings-copy"><b>{__msg("system.WorldPublishingPage.8e1574fd3c")}</b><small>{__msg("system.WorldPublishingPage.ba83921ecd")}</small></span><FiArrowUpRight className="world-settings-row-chevron" /></button>
          <span className="world-settings-item is-complete"><span className="world-settings-status"><FiCheck /></span><span className="world-settings-copy"><b>{__msg("creator.directAccessForMembers")}</b><small>{__msg("creator.1FreeReplyMonthEachThenFirstInLine")}</small></span></span>
          <span className="world-settings-item is-complete"><span className="world-settings-status"><FiCheck /></span><span className="world-settings-copy"><b>{__msg("creator.priceLockedForMembers")}</b><small>{__msg("creator.earlyMembersKeepTheirJoiningPriceForever")}</small></span></span>
          <button aria-pressed={Boolean(world.firstMonthOfferEnabled)} className="world-settings-item is-switch" onClick={() => updateWorld({ firstMonthOfferEnabled: !world.firstMonthOfferEnabled })} type="button"><span className="world-settings-status" /><span className="world-settings-copy"><b>{__msg("creator.firstMonth50")}</b><small>{__msg("creator.convertsTheHesitantSmarterThanRefunds")}</small></span><i aria-hidden="true" className={world.firstMonthOfferEnabled ? "is-on" : ""}><u /></i></button>
        </div> : null}
      </section> : null}

      {!experience ? <button aria-label={__msg("creator.addWorldDescription")} className="world-prototype-summary is-editable world-create-summary" onClick={() => setWorldCreateSheet("description")} type="button">
        <span className={world.description ? "" : "is-placeholder"}>{world.description || __msg("creator.addADescriptionForYourWorld")}</span><FiEdit3 />
      </button> : null}

      <section className="world-prototype-inside world-create-experiences">
        <h2>{__msg("system.WorldPublishingPage.42e808ac2e")}</h2>
        <p>{__msg("system.WorldPublishingPage.5999fa9849")}</p>
        <button className="world-prototype-include-experience" disabled={saving || uploading} onClick={() => openWorldManagement("include")} type="button"><FiPlus /> {__msg("system.WorldPublishingPage.b20715185b")}</button>
      </section>

      {!experience ? <section className="world-prototype-comments world-create-comments-preview">
        <h2>{__msg("admin.comments")}</h2>
        {world.commentsEnabled !== false ? <form onSubmit={(event) => event.preventDefault()}><input disabled placeholder={__msg("creator.commentsBecomeAvailableAfterPublishing")} /><button aria-label={__msg("creator.postComment")} disabled type="button"><FiArrowUpRight /></button></form> : <p className="world-prototype-empty-comments">{__msg("creator.commentsAreTurnedOff")}</p>}
      </section> : null}

      {worldCreateSheet === "name" ? <WorldCreateTextSheet busy={saving} description={__msg("creator.oneWorldPerCreatorTheNameCarriesYourStories")} label={__msg("creator.name")} maxLength={30} onClose={() => setWorldCreateSheet("")} onSave={(title) => { updateWorld({ title }); setWorldCreateSheet(""); }} placeholder={__msg("creator.nameYourWorld")} title={__msg("creator.nameYourWorld")} value={world.title} /> : null}
      {worldCreateSheet === "description" ? <WorldCreateTextSheet busy={saving} description={__msg("creator.oneHonestParagraphPeopleSeeItRightUnderYour")} label={__msg("creator.description")} maxLength={300} onClose={() => setWorldCreateSheet("")} onSave={(description) => { updateWorld({ description, summary: description }); setWorldCreateSheet(""); }} placeholder={__msg("creator.describeWhatMembersWillExperience")} title={__msg("creator.describeYourWorld")} value={world.description} /> : null}
      {worldCreateSheet === "welcome" ? <WorldWelcomeMessageSheet busy={welcomeMessageBusy} error={error} onClose={() => !welcomeMessageBusy && !welcomeVoiceBusy && setWorldCreateSheet("")} onRemoveVoice={removeWelcomeVoice} onSave={saveWelcomeMessage} onUploadVoice={uploadWelcomeVoice} value={world.ownerWelcomeNote} voiceBusy={welcomeVoiceBusy} voiceMedia={world.worldWelcomeVoiceMedia} /> : null}
      {locationPickerOpen ? <UniversalLocationPicker onClose={() => setLocationPickerOpen(false)} onSelect={(experienceLocation) => updateWorld({ experienceLocation })} value={world.experienceLocation || ""} /> : null}

      {worldCreateSheet === "price" ? (
        <WorldCreatePriceSheet busy={saving} currentPrice={world.pricing?.starsAmount} onClose={() => setWorldCreateSheet("")} onSave={(price) => { updateWorld({ pricing: { mode: "MONTHLY", presetId: `MONTHLY_${price}`, starsAmount: price } }); setWorldCreateSheet(""); }} />
      ) : null}

      <div className="world-publish-actionbar">
        {error ? <p aria-live="assertive" className="world-publish-error">{__systemMessage(error)}</p> : null}
        <button disabled={saving || submitting} onClick={leaveComposer} type="button">{__msg("admin.cancel")}</button>
        <button disabled={saving || uploading || submitting} onClick={() => saveDraft()} type="button">{saving ? __msg("financial.saving") : __msg("publication.saveDraft")}</button>
        <button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button"><FiCheck /> {submitting ? __msg("creator.publishing_74f811") : __msg("creator.publishWorld")}</button>
      </div>
    </article>
    </>
  );
}
