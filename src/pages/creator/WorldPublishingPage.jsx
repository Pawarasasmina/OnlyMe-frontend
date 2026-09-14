import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit3,
  FiEye,
  FiExternalLink,
  FiLock,
  FiLoader,
  FiMic,
  FiMoreHorizontal,
  FiPause,
  FiPlay,
  FiPlus,
  FiSquare,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { formatVoiceTime, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import StoryCreator from "../../components/stories/StoryCreator";
import { publicationService as api } from "../../services/publicationService";
import { normalizeTags, publicationError } from "../../utils/publicationValidation";
import { worldCompletenessBySection } from "../../utils/worldValidation";
import { SeenChapterEditor, VideoTrimSheet, chapterBlocksWithStory, chapterStoryText } from "./SeenComposerPage";

const PLANET = "\uD83E\uDE90";
const FLEX = "\uD83D\uDCAA";
const STAR = "\u2726";
const STORY_PREVIEW_LIMIT = 3;
const SUBSCRIBER_STORY_LIMIT = 3;
const MEDIA_BLOCK_TYPES = new Set(["IMAGE", "VIDEO", "AUDIO", "VOICE"]);
const TEXT_BLOCK_TYPES = new Set(["TEXT", "KEY_POINT", "HIGHLIGHT"]);
const WORLD_CATEGORIES = ["Places", "Moving", "Business", "Growth", "Lifestyle"];
const MONTHLY_PRICES = [90, 190, 290];

function freshWorld(experience = false) {
  return {
    category: "",
    chapters: [],
    coverMedia: null,
    description: "",
    includedInWorld: false,
    allowDownload: false,
    experiencePath: "",
    experienceLocation: "",
    kind: experience ? "EXPERIENCE" : "PREMIUM_WORLD",
    ...(experience ? {} : { planet: { accent: "ice-white", emoji: PLANET } }),
    pricing: experience ? { mode: "FREE", presetId: null, starsAmount: null } : { mode: "MONTHLY", presetId: "MONTHLY_190", starsAmount: 190 },
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
    payload.label = block.label || "Open link";
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

function statusLabel(world) {
  if (!world?.id) return "New draft";
  return String(world.status || "DRAFT").replaceAll("_", " ");
}

function isStoryPreviewBlock(block = {}) {
  return Boolean(block.metadata?.storyPreview && ["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl);
}

function storyPreviewsFromWorld(publication = {}) {
  return (publication.chapters || [])
    .flatMap((chapter) => (chapter.blocks || [])
      .filter(isStoryPreviewBlock)
      .map((block) => ({
        blockId: block.id,
        chapterId: chapter.stableChapterId,
        id: block.media.assetId || `${chapter.stableChapterId}-${block.id}`,
        label: block.metadata?.label || chapter.title || "Story",
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
    <button aria-label="Close voice recorder" className="experience-voice-dim" disabled={saving} onClick={onClose} type="button" />
    <section className="experience-voice-sheet">
      <header><div><strong>Voice hello</strong><small>Record live or choose an audio file</small></div><button aria-label="Close voice recorder" disabled={saving} onClick={onClose} type="button"><FiX /></button></header>
      <div className={`experience-voice-timer ${isRecording ? "is-live" : ""}`}><i />{formatVoiceTime(recorder.elapsedMs / 1000)}<small>/ 02:00</small></div>
      {recorder.levels.length ? <div aria-hidden="true" className="experience-voice-levels">{recorder.levels.slice(-32).map((level, index) => <i key={index} style={{ height: `${Math.max(12, level * 100)}%` }} />)}</div> : null}
      {recorder.audioUrl ? <audio controls src={recorder.audioUrl} /> : null}
      {recorder.error ? <p className="experience-voice-error" role="alert">{recorder.error}</p> : null}
      <div className="experience-voice-record-actions">
        {recorder.status === "idle" || recorder.status === "error" ? <button disabled={saving} onClick={recorder.startRecording} type="button"><FiMic /> Start recording</button> : null}
        {isStarting ? <button disabled type="button"><FiLoader className="world-story-upload-spinner" /> Allow microphone…</button> : null}
        {isRecording ? <><button onClick={recorder.pauseRecording} type="button"><FiPause /> Pause</button><button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> Stop</button></> : null}
        {isPaused ? <><button onClick={recorder.resumeRecording} type="button"><FiPlay /> Resume</button><button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> Finish</button></> : null}
        {recorder.status === "preview" ? <><button disabled={saving} onClick={recorder.resetRecording} type="button"><FiMic /> Record again</button><button className="is-save" disabled={saving} onClick={saveRecording} type="button">{saving ? <FiLoader className="world-story-upload-spinner" /> : <FiCheck />} Use recording</button></> : null}
      </div>
      <div className="experience-voice-divider"><span>or</span></div>
      <button className="experience-voice-upload" disabled={isRecording || isPaused || isStarting || saving} onClick={onUploadFile} type="button"><FiArrowUpRight /> Upload audio file</button>
      <small className="experience-voice-hint">MP3, WAV, M4A, OGG or WebM · maximum 2 minutes recommended</small>
    </section>
  </div>;
}

function ExperienceProgress({ step }) {
  const stages = ["Experience", "Chapters", "Publish"];
  return <div aria-label={`Step ${step} of 3: ${stages[step - 1]}`} className="experience-progress" role="progressbar" aria-valuemax="3" aria-valuemin="1" aria-valuenow={step}>
    {stages.map((label, index) => { const stage = index + 1; return <i aria-hidden="true" className={stage < step ? "is-complete" : stage === step ? "is-active" : ""} key={label} />; })}
  </div>;
}

export default function WorldPublishingPage({ experience = false, publicationId = "" }) {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const coverInputRef = useRef(null);
  const previewInputRef = useRef(null);
  const previewPhotoSlotRef = useRef(null);
  const videoInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const storyPreviewsRef = useRef([]);
  const autoSaveAttemptedStoryIds = useRef(new Set());
  const draftAutoSaveTimer = useRef(null);
  const pendingDraftSaveRef = useRef(false);
  const saveDraftRef = useRef(null);
  const worldEditVersionRef = useRef(0);
  const storySaveResolvers = useRef(new Map());
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
  const [creationStarted, setCreationStarted] = useState(experience);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, setNotice] = useState("");
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [experienceStep, setExperienceStep] = useState(1);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [videoTrimFile, setVideoTrimFile] = useState(null);
  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const chapters = world.chapters || [];
  const ownerName = user?.name || user?.displayName || user?.username || "Max";
  const coverUrl = world.coverMedia?.secureUrl;
  const validation = useMemo(() => worldCompletenessBySection(world), [world]);
  const validationMessages = Object.values(validation).flat();
  const readyToSubmit = world.id && !validationMessages.length && !saving && !uploading && !storyAutoSaving;
  const activeStory = useMemo(() => storyPreviews.find((story) => story.id === activeStoryId), [activeStoryId, storyPreviews]);
  const freeStories = useMemo(() => storyPreviews.filter((story) => story.audience !== "SUBSCRIBER"), [storyPreviews]);
  const subscriberStories = useMemo(() => storyPreviews.filter((story) => story.audience === "SUBSCRIBER"), [storyPreviews]);

  const loadWorld = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let existing;
      if (publicationId) {
        existing = (await api.getMyPublication(publicationId)).data.data.publication;
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
        setNotice("Start creating your premium world.");
        setCreationStarted(experience);
        return;
      }
      let publication = publicationId ? existing : (await api.getMyPublication(existing.id)).data.data.publication;
      if (publication.status === "PUBLISHED") publication = (await api.startPublishedRevision(publication.id, publication.statusVersion)).data.data.publication;
      publication = { ...freshWorld(experience), ...publication };
      setWorld(publication);
      setCreationStarted(true);
      setStoryPreviews((current) => {
        current.forEach(revokePreviewUrl);
        return storyPreviewsFromWorld(publication);
      });
      setNotice(`${statusLabel(publication)} opened.`);
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setLoading(false);
    }
  }, [experience, publicationId]);

  useEffect(() => {
    loadWorld();
  }, [loadWorld]);

  useEffect(() => {
    storyPreviewsRef.current = storyPreviews;
  }, [storyPreviews]);

  useEffect(() => () => {
    storyPreviewsRef.current.forEach(revokePreviewUrl);
    window.clearTimeout(draftAutoSaveTimer.current);
  }, []);

  const scheduleDraftSave = () => {
    window.clearTimeout(draftAutoSaveTimer.current);
    draftAutoSaveTimer.current = window.setTimeout(() => saveDraftRef.current?.(), 700);
  };

  const updateWorld = (patch) => {
    worldEditVersionRef.current += 1;
    setWorld((current) => ({ ...current, ...patch }));
    setNotice("Saving...");
    setError("");
    scheduleDraftSave();
  };

  const preserveNewerLocalEdits = (current, next, requestEditVersion) => {
    if (worldEditVersionRef.current <= requestEditVersion) return next;
    return {
      ...next,
      category: current.category,
      chapters: current.chapters,
      description: current.description,
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
    const draft = { ...snapshot, ...response.data.data.publication, chapters: snapshot.chapters };
    setWorld((current) => preserveNewerLocalEdits(current, draft, requestEditVersion));
    history.replaceState({}, "", experience ? "/create/experience" : "/create/premium-world");
    return draft;
  };

  const refreshWorld = async (id, requestEditVersion = worldEditVersionRef.current) => {
    const response = await api.getMyPublication(id);
    const next = response.data.data.publication;
    setWorld((current) => preserveNewerLocalEdits(
      current,
      { ...current, ...next, coverMedia: next.coverMedia || null },
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
          title: audience === "FREE" ? "Chapter 1" : "Subscriber stories",
        });
        next = await refreshWorld(next.id, requestEditVersion);
        targetChapter = experience ? next.chapters?.[0] : next.chapters?.find((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview);
      }
      if (!targetChapter?.stableChapterId) throw new Error("A story chapter could not be prepared.");

      const limit = experience ? 5 : audience === "FREE" ? STORY_PREVIEW_LIMIT : SUBSCRIBER_STORY_LIMIT;
      const existingStoryCount = (targetChapter.blocks || []).filter(isStoryPreviewBlock).length;
      const uploadQueue = audienceStories.slice(0, Math.max(0, limit - existingStoryCount));
      if (!uploadQueue.length) continue;

      setNotice(audience === "FREE" ? "Saving free preview stories..." : "Saving subscriber stories...");
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
        title: targetChapter.title || (audience === "FREE" ? "Chapter 1" : "Subscriber stories"),
      });
      next = await refreshWorld(next.id, requestEditVersion);
    }

    setStoryPreviews((current) => {
      current.forEach(revokePreviewUrl);
      return storyPreviewsFromWorld(next);
    });
    return next;
  };

  const saveDraft = async () => {
    if (saving || uploading) {
      pendingDraftSaveRef.current = true;
      return null;
    }
    setSaving(true);
    setError("");
    setNotice("Saving...");
    const snapshot = world;
    const requestEditVersion = worldEditVersionRef.current;
    try {
      let draft = await ensureDraft(snapshot, requestEditVersion);
      draft = (await api.updatePublicationDraft(draft.id, {
        category: snapshot.category,
        description: snapshot.description,
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
          title: "Chapter 1",
        });
        draft = await refreshWorld(draft.id, requestEditVersion);
      }

      draft = await attachStoryPreviews(draft, storyPreviews, requestEditVersion);
      setNotice("Draft saved");
      return draft;
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Save paused");
      return null;
    } finally {
      setSaving(false);
      if (pendingDraftSaveRef.current) {
        pendingDraftSaveRef.current = false;
        scheduleDraftSave();
      }
    }
  };

  saveDraftRef.current = saveDraft;

  useEffect(() => {
    if (!creationStarted) return undefined;
    const pendingIds = storyPreviews
      .filter((preview) => preview.file && !preview.saved && !autoSaveAttemptedStoryIds.current.has(preview.id))
      .map((preview) => preview.id);
    if (!pendingIds.length) return undefined;

    pendingIds.forEach((storyId) => autoSaveAttemptedStoryIds.current.add(storyId));
    const timer = window.setTimeout(async () => {
      try {
        const saved = await saveDraftRef.current?.();
        for (const resolver of storySaveResolvers.current.values()) {
          if (saved) resolver.resolve(saved);
          else resolver.reject(new Error("Story upload could not be saved."));
        }
      } finally {
        storySaveResolvers.current.clear();
        setStoryAutoSaving(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [creationStarted, storyPreviews]);

  const uploadCover = async (file) => {
    if (!file) return;
    const requestEditVersion = worldEditVersionRef.current;
    setUploading(true);
    setError("");
    setNotice("Uploading cover...");
    try {
      const draft = await ensureDraft(world, requestEditVersion);
      await api.uploadMedia(draft.id, file, { purpose: "COVER", statusVersion: draft.statusVersion });
      await refreshWorld(draft.id, requestEditVersion);
      setNotice("Cover saved");
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Cover upload failed");
    } finally {
      setUploading(false);
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
      setNotice(`Only ${limit} ${storyAudience === "SUBSCRIBER" ? "subscriber" : "free preview"} stories can be shown.`);
      return;
    }
    const nextStory = {
      audience: storyAudience,
      caption,
      editorMetadata,
      file,
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      label: caption || new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
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
      setNotice(`Uploading ${storyAudience === "SUBSCRIBER" ? "subscriber" : "free preview"} story...`);
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
    if (!window.confirm("Remove this cover image?")) return;
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
      setNotice("Removing story...");
      scheduleDraftSave();
    }
    if (activeStoryId === storyId) setActiveStoryId("");
    setNotice("Story preview removed.");
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
      setError("This chapter could not be opened yet. Please try again.");
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

  const updateActiveChapterBlocks = async (blocks, status) => {
    if (!activePlanetChapter?.stableChapterId || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus(status);
    setError("");
    try {
      const previewBlocks = (activePlanetChapter.blocks || []).filter((block) => block.metadata?.storyPreview);
      const mergedBlocks = [...previewBlocks, ...blocks].map((block, order) => ({ ...block, order }));
      await api.updateChapter(world.id, activePlanetChapter.stableChapterId, {
        blocks: mergedBlocks,
        isPreview: Boolean(activePlanetChapter.isPreview || activeChapter === 0),
        releaseMode: activePlanetChapter.releaseMode || "IMMEDIATE",
        statusVersion: world.statusVersion,
        title: activePlanetChapter.title || `Chapter ${activeChapter + 1}`,
      });
      await refreshChapterEditor();
      setChapterStatus("Chapter saved");
      return true;
    } catch (requestError) {
      setError(publicationError(requestError));
      setChapterStatus("Chapter update failed");
      return false;
    } finally {
      setChapterSaving(false);
    }
  };

  const saveChapterStory = async () => {
    if (!activePlanetEditorChapter) return;
    const saved = await updateActiveChapterBlocks(chapterBlocksWithStory(activePlanetEditorChapter, chapterStory), "Saving chapter...");
    if (saved) {
      setActiveChapter(null);
      setChapterStatus("");
    }
  };

  const uploadChapterMedia = async (mediaType, file) => {
    if (!activePlanetChapter?.stableChapterId || chapterSaving) return;
    const blockId = crypto.randomUUID();
    setChapterSaving(true);
    setChapterStatus(`Uploading ${mediaType.toLowerCase()}...`);
    setError("");
    try {
      const uploaded = (await api.uploadMedia(world.id, file, {
        blockId,
        chapterId: activePlanetChapter.stableChapterId,
        mediaType,
        purpose: "BLOCK",
      })).data.data;
      const blocks = chapterBlocksWithStory(activePlanetEditorChapter, chapterStory);
      const previewBlocks = (activePlanetChapter.blocks || []).filter((block) => block.metadata?.storyPreview);
      await api.updateChapter(world.id, activePlanetChapter.stableChapterId, {
        blocks: [...previewBlocks, ...blocks, { id: blockId, media: uploaded, order: previewBlocks.length + blocks.length, type: mediaType }].map((block, order) => ({ ...block, order })),
        isPreview: Boolean(activePlanetChapter.isPreview || activeChapter === 0),
        releaseMode: activePlanetChapter.releaseMode || "IMMEDIATE",
        statusVersion: world.statusVersion,
        title: activePlanetChapter.title || `Chapter ${activeChapter + 1}`,
      });
      await refreshChapterEditor();
      setChapterStatus(`${mediaType === "IMAGE" ? "Photo" : "Voice"} added`);
    } catch (requestError) {
      setError(publicationError(requestError));
      setChapterStatus("Media upload failed");
    } finally {
      setChapterSaving(false);
    }
  };

  const requestChapterMedia = (mediaType, file) => {
    if (mediaType === "IMAGE") setCropTarget({ kind: "chapter", url: URL.createObjectURL(file) });
    else uploadChapterMedia(mediaType, file);
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
    updateActiveChapterBlocks([...blocks, { id: crypto.randomUUID(), metadata: { location: { label: locationLabel } }, order: blocks.length, text: locationLabel, type: "KEY_POINT" }], "Adding place...");
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
      chapters: (saved.chapters || []).map((chapter, index) => ({
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
    setNotice("Submitting...");
    try {
      const response = await api[saved.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](saved.id, saved.statusVersion);
      const submitted = response.data.data.publication;
      setWorld((current) => ({ ...current, ...submitted }));
      setNotice(experience ? "Experience published" : "Submitted for review");
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      nav(experience ? `/experience/${submitted.id}` : "/profile", { replace: true });
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const addChapter = () => {
    const chapterLimit = experience ? null : 5;
    if (chapterLimit && chapters.length >= chapterLimit) {
      setError(`${experience ? "Premium Experience" : "Premium World"} can have up to ${chapterLimit} chapters.`);
      return;
    }
    updateWorld({
      chapters: [
        ...chapters,
        {
          blocks: [],
          isPreview: false,
          localId: crypto.randomUUID(),
          title: `Chapter ${chapters.length + 1}`,
        },
      ],
    });
    setNotice("New chapter added. Open it to start writing.");
  };

  const previewExperience = async () => {
    const saved = await saveDraft();
    if (saved?.id) window.open(`/experience/${saved.id}`, "_blank", "noopener,noreferrer");
  };

  const addNamedExperienceChapter = () => {
    const title = newChapterTitle.trim();
    if (!title) {
      setError("Enter a chapter title first.");
      return;
    }
    updateWorld({ chapters: [...chapters, {
      blocks: [],
        isPreview: world.pricing?.mode === "FREE",
      localId: crypto.randomUUID(),
      title,
    }] });
    setNewChapterTitle("");
    setError("");
    setNotice("Chapter added. Tap it to write your story.");
  };

  const removeChapter = async (index) => {
    const chapter = chapters[index];
    if (!chapter || removingChapterId) return;
    const label = chapter.title || `Chapter ${index + 1}`;
    if (!window.confirm(`Remove “${label}”? This also removes everything saved inside this chapter.`)) return;

    if (!chapter.stableChapterId) {
      updateWorld({ chapters: chapters.filter((_, chapterIndex) => chapterIndex !== index) });
      setNotice("Chapter removed.");
      return;
    }

    setRemovingChapterId(chapter.stableChapterId);
    setError("");
    setNotice("Removing chapter...");
    try {
      const saved = await saveDraft();
      if (!saved) return;
      await api.deleteChapter(saved.id, chapter.stableChapterId, saved.statusVersion);
      const next = await refreshWorld(saved.id);
      setStoryPreviews((current) => {
        current.forEach(revokePreviewUrl);
        return storyPreviewsFromWorld(next);
      });
      setNotice("Chapter removed.");
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Chapter removal failed");
    } finally {
      setRemovingChapterId("");
    }
  };

  const draftExperienceWithAi = () => {
    const prompt = aiPrompt.trim() || "8 week home workout plan for beginners";
    setAiPrompt(prompt);
    setAiBusy(true);
    window.setTimeout(() => {
      const fitness = /workout|fitness|gym|training/i.test(prompt);
      updateWorld({
        title: fitness ? "8-Week Home Fitness Kickstart" : prompt.replace(/^\w/, (letter) => letter.toUpperCase()),
        description: fitness ? "A structured 8-week program for people starting their fitness journey at home — no gym required. Weekly goals, form guidance, and progress check-ins to keep you accountable." : `A structured Experience built around ${prompt}, with a clear beginning, practical chapters, and a result people can carry forward.`,
        summary: fitness ? "A structured 8-week program for people starting their fitness journey at home — no gym required." : `A structured Experience built around ${prompt}.`,
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
    context.fillStyle = "rgba(156,203,255,.9)"; context.font = "700 30px sans-serif"; context.fillText("@seen · EXPERIENCE", 70, 90);
    context.fillStyle = "white"; context.font = "800 68px sans-serif";
    context.fillText((world.title || "Untitled Experience").slice(0, 28), 70, 570);
    canvas.toBlob((blob) => blob && uploadCover(new File([blob], "generated-experience-cover.jpg", { type: "image/jpeg" })), "image/jpeg", .86);
  };

  if (loading) return <div className="world-prototype-state">Opening {experience ? "experience" : "world"}...</div>;

  if (activePlanetEditorChapter) return (
    <>
      {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} source={cropTarget.url} /> : null}
      <SeenChapterEditor
        busy={chapterSaving}
        chapter={activePlanetEditorChapter}
        error={error}
        onAddBlocks={addStructuredBlocks}
        onAddPlace={addPlaceBlock}
        onDone={saveChapterStory}
        onMediaUpload={requestChapterMedia}
        onRemoveBlock={removeChapterBlock}
        onReorderBlocks={reorderChapterBlocks}
        onStoryChange={setChapterStory}
        onUpdateBlock={updateStructuredBlock}
        status={chapterStatus}
        story={chapterStory}
      />
    </>
  );

  if (experience && creationStarted && experienceStep === 1) return (
    <article className="experience-first-step">
      {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
      {videoTrimFile ? <VideoTrimSheet enableCrop file={videoTrimFile} limitSeconds={30} onCancel={() => { URL.revokeObjectURL(videoTrimFile.url); setVideoTrimFile(null); }} onUpload={async (file) => { await addStoryPreview({ file, caption: "Preview video", replaceId: videoTrimFile.replaceId }); URL.revokeObjectURL(videoTrimFile.url); setVideoTrimFile(null); }} /> : null}
      {voiceSheetOpen ? <ExperienceVoiceSheet onClose={() => setVoiceSheetOpen(false)} onSave={(file) => { const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); return addStoryPreview({ file, caption: "Voice hello", replaceId: voice?.id || "" }); }} onUploadFile={() => voiceInputRef.current?.click()} /> : null}
      <header><button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button><div><h1>Name your Experience</h1><p>A stage of life — with a beginning and a result</p></div></header>
      <ExperienceProgress step={1} />
      <main>
        <input className="experience-step-input" maxLength={120} onChange={(event) => updateWorld({ title: event.target.value })} placeholder={'Title — e.g. “Moving to Dubai”'} value={world.title} />
        <input className="experience-step-input" maxLength={300} onChange={(event) => updateWorld({ description: event.target.value, experiencePath: event.target.value, summary: event.target.value })} placeholder={'The path: from → to — “From office to my own business”'} value={world.experiencePath || ""} />

        <p className="experience-field-label">ACCESS</p>
        <div className="experience-access-pills"><button className={world.pricing?.mode === "FREE" ? "is-selected" : ""} onClick={() => updateWorld({ pricing: { mode: "FREE", presetId: null, starsAmount: null } })} type="button">Free</button><button className={world.pricing?.mode !== "FREE" ? "is-selected" : ""} onClick={() => updateWorld({ pricing: { mode: "ONE_TIME", presetId: "ONE_TIME_190", starsAmount: 190 } })} type="button">Premium · one-time</button></div>
        {world.pricing?.mode === "ONE_TIME" ? <div className="experience-premium-price">
          <div className="experience-premium-price-entry"><span>✦</span><input aria-label="One-time Experience price" min="10" onChange={(event) => { const amount = Math.max(10, Math.round(Number(event.target.value) || 10)); updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${amount}`, starsAmount: amount } }); }} type="number" value={world.pricing?.starsAmount || 190} /><small>one-time unlock · all chapters included after purchase</small></div>
          <div className="experience-premium-presets">{[150, 300, 500, 900].map((amount) => <button className={Number(world.pricing?.starsAmount) === amount ? "is-selected" : ""} key={amount} onClick={() => updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${amount}`, starsAmount: amount } })} type="button">🪙{amount}</button>)}</div>
          <p>≈ ${(Number(world.pricing?.starsAmount || 190) * .068).toFixed(2)} to you</p>
        </div> : null}
        <button className={`experience-download-row ${world.allowDownload ? "is-on" : ""}`} onClick={() => updateWorld({ allowDownload: !world.allowDownload })} type="button"><span>↥</span><span><strong>Allow download</strong><small>Watermarked PDF · text and photos only</small></span><em>{world.allowDownload ? "On" : "Off"}</em></button>

        <p className="experience-field-label">CATEGORY</p>
        <div className="experience-category-chips">{["Travel", "Fitness", "Lifestyle", "Business", "Tech", "Psychology", "Fashion", "Beauty", "Wellness", "Food"].map((category) => <button className={world.category === category ? "is-selected" : ""} key={category} onClick={() => updateWorld({ category })} type="button">{category}</button>)}</div>

        <p className="experience-field-label">COVER</p>
        <div className="experience-cover-line"><div className="experience-cover-wrap"><button className="experience-cover-preview" onClick={() => coverInputRef.current?.click()} type="button">{coverUrl ? <img alt="Experience cover" src={coverUrl} /> : uploading ? <FiLoader className="world-story-upload-spinner" /> : <FiPlus />}</button>{coverUrl ? <button aria-label="Remove cover image" className="experience-media-remove" disabled={uploading} onClick={removeCover} type="button"><FiX /></button> : null}</div><div><button className="experience-outline-pill" disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">{uploading ? "Uploading…" : coverUrl ? "↥ Replace" : "↥ Upload"}</button><small>{coverUrl ? "Cover added ✓ · shown on the card and inside" : "16:9 · 1280px+ · shown on the card and inside"}</small></div></div>
        <button className="experience-generate-cover" disabled={uploading} onClick={generateExperienceCover} type="button">↻ &nbsp; Generate from title</button><small className="experience-another-look">another tap — another look</small>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />

        <p className="experience-field-label">PREVIEW — THE TRUST LAYER</p>
        <p className="experience-trust-copy">One short video of you + real photos. Worlds with a video get stepped into 3× more.</p>
        {(() => { const video = storyPreviews.find((item) => item.file?.type?.startsWith("video/") || item.media?.mediaType === "VIDEO"); return <div className="experience-media-wrap"><button className={`experience-video-drop ${video ? "has-media" : ""}`} onClick={() => videoInputRef.current?.click()} type="button">{video?.url ? <><video muted playsInline preload="metadata" src={video.url} /><span>▶ Short video added · tap to replace</span></> : <span>🎞 &nbsp; Add a video · maximum 30 seconds</span>}</button>{video ? <button aria-label="Remove preview video" className="experience-media-remove" onClick={() => removeStoryPreview(video.id)} type="button"><FiX /></button> : null}</div>; })()}
        <div className="experience-photo-slots">{[0, 1, 2].map((index) => { const preview = storyPreviews.filter((item) => item.file?.type?.startsWith("image/") || item.media?.mediaType === "IMAGE")[index]; return <div className="experience-photo-slot" key={index}><button onClick={() => { previewPhotoSlotRef.current = { index, replaceId: preview?.id || "" }; previewInputRef.current?.click(); }} type="button">{preview?.url ? <img alt={`Preview ${index + 1}`} src={preview.url} /> : "▣"}</button>{preview ? <button aria-label={`Remove preview photo ${index + 1}`} className="experience-media-remove" onClick={() => removeStoryPreview(preview.id)} type="button"><FiX /></button> : null}</div>; })}</div>
        {(() => { const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); return <div className="experience-media-wrap"><button className={`experience-voice-drop ${voice ? "has-media" : ""}`} onClick={() => setVoiceSheetOpen(true)} type="button">🎙 {voice ? "Voice hello added ✓ · tap to review or replace" : "Add a voice hello · record live or upload audio"}</button>{voice ? <button aria-label="Remove voice hello" className="experience-media-remove" onClick={() => removeStoryPreview(voice.id)} type="button"><FiX /></button> : null}</div>; })()}
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const selection = previewPhotoSlotRef.current; event.target.value = ""; previewPhotoSlotRef.current = null; if (file) addStoryPreview({ file, caption: `Preview photo ${(selection?.index ?? 0) + 1}`, replaceId: selection?.replaceId || "" }); }} ref={previewInputRef} type="file" />
        <input accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const video = storyPreviews.find((item) => item.file?.type?.startsWith("video/") || item.media?.mediaType === "VIDEO"); event.target.value = ""; if (file) setVideoTrimFile({ file, replaceId: video?.id || "", url: URL.createObjectURL(file) }); }} ref={videoInputRef} type="file" />
        <input accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; const voice = storyPreviews.find((item) => item.file?.type?.startsWith("audio/") || ["AUDIO", "VOICE"].includes(item.media?.mediaType)); event.target.value = ""; if (file) { addStoryPreview({ file, caption: "Voice hello", replaceId: voice?.id || "" }); setVoiceSheetOpen(false); } }} ref={voiceInputRef} type="file" />
        <StoryCreator isOpen={storyComposerOpen} mode="compose" onClose={() => setStoryComposerOpen(false)} onSave={addStoryPreview} />
        {storyAutoSaving ? <p className="experience-media-status"><FiLoader className="world-story-upload-spinner" /> Saving preview media…</p> : storyPreviews.length ? <p className="experience-media-status is-saved"><FiCheck /> {storyPreviews.length} preview {storyPreviews.length === 1 ? "item" : "items"} saved</p> : null}
        {error ? <p aria-live="assertive" className="world-publish-error">{error}</p> : null}
        <button className="experience-first-continue" disabled={!world.title.trim() || !world.experiencePath?.trim() || !world.category || !coverUrl || uploading} onClick={async () => { const saved = await saveDraft(); if (saved) setExperienceStep(2); }} type="button">Continue</button>
      </main>
    </article>
  );

  if (experience && creationStarted && experienceStep === 2) return (
    <article className="experience-chapters-step">
      <header>
        <button aria-label="Back to Experience details" onClick={() => setExperienceStep(1)} type="button"><FiArrowLeft /></button>
        <div><h1>Build the<br />chapters</h1><p>{world.title}</p></div>
        <div className="experience-chapters-head-actions"><button disabled={saving || !chapters.length} onClick={previewExperience} type="button"><FiEye /> Preview</button><button disabled={saving} onClick={saveDraft} type="button">{saving ? "Saving…" : "Save for later"}</button></div>
      </header>
      <ExperienceProgress step={2} />
      <main>
        <p className="experience-chapters-intro">Photos, places, stories, lessons — each chapter is one step deeper into your Experience.</p>
        <small className="experience-chapters-tip">Tap a chapter to write inside: text, color, marker, photo and voice.</small>
        <div className="experience-builder-list">
          {chapters.map((chapter, index) => {
            const thumbnail = (chapter.blocks || []).find((block) => block.type === "IMAGE" && block.media?.secureUrl)?.media?.secureUrl || (index === 0 ? coverUrl : "");
            const storyText = chapterStoryText(chapter).trim();
            return <div className="experience-builder-chapter" key={chapter.stableChapterId || chapter.localId || index}>
              <button className="experience-builder-open" onClick={() => openChapterEditor(index)} type="button">
                <span className="experience-builder-thumb">{thumbnail ? <img alt="" src={thumbnail} /> : <b>{index + 1}</b>}</span>
                <span><strong>{chapter.title || `Chapter ${index + 1}`}</strong><small>{storyText ? storyText.slice(0, 70) : "Write about your story"}</small></span><i>›</i>
              </button>
              <button aria-label={`Remove ${chapter.title || `chapter ${index + 1}`}`} className="experience-builder-remove" disabled={Boolean(removingChapterId)} onClick={() => removeChapter(index)} type="button"><FiX /></button>
            </div>;
          })}
        </div>
        <div className="experience-new-chapter"><input maxLength={120} onChange={(event) => setNewChapterTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addNamedExperienceChapter(); }} placeholder="Next chapter…" value={newChapterTitle} /><button disabled={!newChapterTitle.trim()} onClick={addNamedExperienceChapter} type="button">Add</button></div>
        <p className={`experience-chapter-minimum ${chapters.length >= 2 ? "is-ready" : ""}`}>{chapters.length >= 2 ? `✓ ${chapters.length} chapters ready · add as many as you need` : `${2 - chapters.length} more chapter${2 - chapters.length === 1 ? "" : "s"} required`}</p>
        {error ? <p aria-live="assertive" className="world-publish-error">{error}</p> : null}
        <button className="experience-chapters-continue" disabled={chapters.length < 2 || saving} onClick={async () => { const saved = await saveDraft(); if (saved) setExperienceStep(3); }} type="button">{saving ? "Saving…" : `Continue (${chapters.length})`}</button>
      </main>
    </article>
  );

  if (experience && creationStarted && experienceStep === 3) return (
    <article className="experience-final-preview">
      <header><button aria-label="Back to chapters" onClick={() => setExperienceStep(2)} type="button"><FiArrowLeft /></button><div><span>FINAL PREVIEW</span><h1>Your Experience</h1></div><button disabled={saving} onClick={saveDraft} type="button">{saving ? "Saving…" : "Save for later"}</button></header>
      <ExperienceProgress step={3} />
      <main>
        <section className="experience-preview-hero">
          {coverUrl ? <img alt={`${world.title} cover`} src={coverUrl} /> : null}
          <div className="experience-preview-hero-shade" />
          <div className="experience-preview-hero-copy"><span>{world.category}</span><h2>{world.title}</h2><p>{world.experiencePath}</p><small>{chapters.length} chapters · {world.pricing?.mode === "FREE" ? "Free" : `✦${world.pricing?.starsAmount} one-time`}</small></div>
        </section>
        <div className="experience-preview-badges"><span><FiCheck /> {world.pricing?.mode === "FREE" ? "Every chapter is free" : "Every chapter unlocks after purchase"}</span>{world.allowDownload ? <span>Download enabled</span> : null}{world.includedInWorld ? <span>Included in World</span> : null}</div>
        <section className="experience-preview-chapters">
          <div className="experience-preview-section-title"><div><span>WHAT THEY’LL GET</span><h3>Inside this Experience</h3></div><small>{chapters.length} chapters</small></div>
          {chapters.map((chapter, index) => <article className="experience-preview-chapter" key={chapter.stableChapterId || chapter.localId || index}>
            <div className="experience-preview-chapter-head"><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{chapter.title || `Chapter ${index + 1}`}</strong><small>{world.pricing?.mode === "FREE" ? "FREE" : "UNLOCKED AFTER PURCHASE"}</small></span>{world.pricing?.mode !== "FREE" ? <FiLock /> : <FiCheck />}</div>
            <div className="experience-preview-chapter-content">{(chapter.blocks || []).filter((block) => !block.metadata?.storyPreview).slice(0, 4).map((block) => {
              if (["TEXT", "HIGHLIGHT", "KEY_POINT"].includes(block.type)) return <p key={block.id}>{block.text}</p>;
              if (block.type === "IMAGE" && block.media?.secureUrl) return <img alt="" key={block.id} src={block.media.secureUrl} />;
              if (block.type === "VIDEO" && block.media?.secureUrl) return <video controls key={block.id} playsInline preload="metadata" src={block.media.secureUrl} />;
              if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) return <audio controls key={block.id} preload="metadata" src={block.media.secureUrl} />;
              return null;
            })}</div>
          </article>)}
        </section>
        <section className="experience-preview-publish-card"><span>Ready to share?</span><h3>Publish your Experience</h3><p>Publish immediately on its own Experience page. Premium access is a one-time unlock.</p><button disabled={chapters.length < 2 || saving || uploading || submitting} onClick={submitWorld} type="button">{submitting ? <><FiLoader className="world-story-upload-spinner" /> Publishing…</> : "Publish Experience"}</button><small>Your Experience becomes available immediately after publishing.</small></section>
        {error ? <p aria-live="assertive" className="world-publish-error">{error}</p> : null}
      </main>
    </article>
  );

  if (experience && creationStarted) return (
    <article className="experience-create-page">
      <header className="experience-create-head">
        <button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button>
        <h1>New Experience</h1>
        {world.id ? <button className="experience-save-later" disabled={saving} onClick={saveDraft} type="button">Save for later</button> : <span />}
      </header>
      <main className="experience-create-body">
        <section className="experience-ai-builder">
          <h2><span>✦</span> AI Experience Builder</h2>
          <input onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe your Experience in a few words" value={aiPrompt} />
          <button disabled={aiBusy} onClick={draftExperienceWithAi} type="button">{aiBusy ? "Drafting…" : "Draft it for me"}</button>
          {aiDrafted ? <p>AI draft — edit as needed · <button onClick={draftExperienceWithAi} type="button">Try again</button></p> : null}
        </section>

        {aiDrafted ? <div className="experience-title-chips">
          {["8-Week Home Fitness Kickstart", "Beginner’s 8-Week Home Plan", "Home Fitness Foundations"].map((title) => <button className={world.title === title ? "is-selected" : ""} key={title} onClick={() => updateWorld({ title })} type="button">{title}</button>)}
        </div> : null}

        <p className="experience-field-label">DETAILS</p>
        <button className={`experience-cover-drop ${coverUrl ? "has-cover" : ""}`} disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">
          {coverUrl ? <img alt="Experience cover" src={coverUrl} /> : <><FiPlus /><span>Add cover · square crop recommended</span></>}
          {uploading ? <FiLoader className="world-story-upload-spinner" /> : null}
        </button>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />
        <input className="experience-form-input" maxLength={120} onChange={(event) => updateWorld({ title: event.target.value })} placeholder="Title" value={world.title} />
        <textarea className="experience-form-input" maxLength={300} onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })} placeholder="Description" value={world.description} />
        <div className="experience-inline-fields">
          <select className="experience-form-input" onChange={(event) => updateWorld({ category: event.target.value })} value={world.category}><option value="">Category</option>{WORLD_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
          <input className="experience-form-input" onChange={(event) => updateWorld({ experienceLocation: event.target.value })} placeholder="Location" value={world.experienceLocation || ""} />
        </div>

        <p className="experience-field-label">CONTENT</p>
        <div className="experience-content-cards">
          <button onClick={addChapter} type="button"><strong>Chapters</strong><small>{chapters.length} added</small></button>
          <button onClick={() => coverInputRef.current?.click()} type="button"><strong>Photos</strong><small>{coverUrl ? "1 / 20" : "0 / 20"}</small></button>
          <button onClick={() => coverInputRef.current?.click()} type="button"><strong>Video</strong><small>{world.coverMedia?.mediaType === "VIDEO" ? "1 / 1 · 60s" : "0 / 1 · 60s"}</small></button>
        </div>
        <div className="experience-chapter-list">
          {chapters.map((chapter, index) => <button key={chapter.stableChapterId || chapter.localId || index} onClick={() => openChapterEditor(index)} type="button"><span>{index + 1}</span><strong>{chapter.title || `Chapter ${index + 1}`}</strong><small>{world.pricing?.mode === "FREE" ? "FREE" : "LOCKED UNTIL PURCHASE"}</small><i>›</i></button>)}
        </div>
        <p className="experience-preview-note">Everything in Chapter 1 is the free preview.</p>

        <p className="experience-field-label">PRICE</p>
        <div className="experience-price-input"><span>✦</span><input min="10" onChange={(event) => { const price = Math.max(10, Number(event.target.value) || 10); updateWorld({ pricing: { mode: "ONE_TIME", presetId: `ONE_TIME_${price}`, starsAmount: price } }); }} placeholder="Price in coins" type="number" value={world.pricing?.starsAmount || 190} /></div>
        <p className="experience-price-hint">Suggested: <strong>✦190–500</strong> · based on similar Experiences</p>
        <label className="experience-world-toggle"><span><strong>Include in my World</strong><small>Optional access for active World members. This Experience remains separate.</small></span><input checked={Boolean(world.includedInWorld)} onChange={(event) => updateWorld({ includedInWorld: event.target.checked })} type="checkbox" /></label>
        {error ? <p aria-live="assertive" className="world-publish-error">{error}</p> : null}
        <div className="experience-create-actions"><button disabled={saving} onClick={saveDraft} type="button">{saving ? "Saving…" : "Save draft"}</button><button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button">{submitting ? "Publishing…" : "Publish"}</button></div>
      </main>
    </article>
  );

  if (!creationStarted) return (
    <article className="planet-create-entry">
      <header><button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button><div><span>{experience ? "Experience creation" : "World creation"}</span><h1>Create {experience ? "an experience" : "a world"}</h1></div></header>
      <p className="planet-create-intro">{experience ? "Premium Experiences are structured journeys made of chapters. Chapter one is free; fans unlock the rest once and keep access forever." : "A World is your private space on your profile. Members subscribe to step into your chapters, preview stories, and everything you share inside."}</p>
      <button className="planet-choice-card is-selected" onClick={() => setCreationStarted(true)} type="button">
        <span className="planet-choice-orbit"><i>{FLEX}</i><b>{experience ? STAR : PLANET}</b></span>
        <span><strong>{experience ? "Premium Experience" : "Your World"}</strong><small>{experience ? "Up to 3 active · one-time unlock · independent from World" : "One per creator · monthly subscription · profile only"}</small><em>{experience ? "A focused journey with a free opening chapter and permanent access after unlock." : "Premium chapters, private stories and closer access—all together."}</em></span>
        <FiArrowUpRight />
      </button>
      <div className="planet-create-principles"><span><FiCheck /> {experience ? "One-time unlock" : "One clear monthly price"}</span><span><FiCheck /> 1 free preview chapter</span><span><FiCheck /> {experience ? "Independent from World" : "Up to 3 preview stories"}</span></div>
      <button className="planet-create-continue" onClick={() => setCreationStarted(true)} type="button">Build my {experience ? "Experience" : "World"} <FiArrowUpRight /></button>
      <small className="planet-create-footnote">{experience ? "Experiences live in their own profile section. World inclusion is optional access, never ownership or placement." : "Worlds live on your profile only—they never appear as ordinary feed posts."}</small>
    </article>
  );

  return (
    <>
    {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
    <article className="world-prototype-page world-publish-page">
      <nav className="planet-create-progress" aria-label={`${experience ? "Experience" : "World"} creation progress`}>
        {(experience ? ["Identity", "Chapters", "Access"] : ["Identity", "Stories", "Chapters", "Access"]).map((label, index) => <span className={index === 0 ? "is-current" : ""} key={label}><b>{index + 1}</b>{label}</span>)}
      </nav>
      <header className="world-prototype-top">
        <button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button>
        <div>
        {world.id ? <button aria-label={`Open public ${experience ? "experience" : "world"}`} onClick={() => window.open(`/${experience ? "experience" : "world"}/${world.id}`, "_blank", "noopener,noreferrer")} type="button"><FiExternalLink /></button> : null}
          <button aria-label="More world actions" type="button"><FiMoreHorizontal /></button>
        </div>
      </header>

      {!experience ? <><section className="world-prototype-planet world-publish-planet">
        <button aria-label="Change planet face" onClick={() => updateWorld({ planet: { ...world.planet, emoji: world.planet?.emoji === PLANET ? "\uD83C\uDF0D" : PLANET } })} type="button">
          <span>{FLEX}</span>
          <span>{world.planet?.emoji || PLANET}</span>
        </button>
        <p>tap the planet to change its face</p>
      </section>

      <section className="world-prototype-story-previews">
        <div className="world-prototype-section-head is-compact">
          <h2>Free preview stories</h2>
          <span>up to 3 - visible before subscription</span>
        </div>
        <div>
          {freeStories.map((story) => (
            <span className="world-prototype-story-thumb" key={story.id}>
              <button aria-label="Open story preview" className="world-prototype-story-open" onClick={() => setActiveStoryId(story.id)} type="button">
                <img alt="World story preview" src={story.url} />
                <small>{story.label}</small>
              </button>
              <button aria-label="Remove story preview" onClick={() => removeStoryPreview(story.id)} type="button"><FiX /></button>
            </span>
          ))}
          {freeStories.length < STORY_PREVIEW_LIMIT ? (
          <button className="world-prototype-story-add" onClick={() => { setStoryAudience("FREE"); setStoryComposerOpen(true); }} type="button">
            <FiPlus />
            <span>add</span>
          </button>
          ) : null}
        </div>
      </section>

      <section className="world-prototype-story-rings">
        <h2><FiLock /> Subscriber stories</h2>
        <p className="world-prototype-story-access-note">Only active subscribers can open these stories.</p>
        <div>
          {subscriberStories.map((story) => (
            <span className="world-prototype-story-ring-item" key={story.id}>
              <button className="is-active" onClick={() => setActiveStoryId(story.id)} type="button"><FiLock /><span>{story.label}</span></button>
              <button aria-label={`Remove subscriber story ${story.label}`} className="world-prototype-story-ring-remove" onClick={() => removeStoryPreview(story.id)} type="button"><FiX /></button>
            </span>
          ))}
          {subscriberStories.length < SUBSCRIBER_STORY_LIMIT ? <button onClick={() => { setStoryAudience("SUBSCRIBER"); setStoryComposerOpen(true); }} type="button"><FiPlus /><span>New</span></button> : null}
        </div>
      </section>

      <StoryCreator isOpen={storyComposerOpen} mode="compose" onClose={() => setStoryComposerOpen(false)} onSave={addStoryPreview} />

      {activeStory ? (
        <div aria-label="World story preview" aria-modal="true" className="world-story-preview-viewer" onClick={() => setActiveStoryId("")} role="dialog">
          <button aria-label="Close story preview" onClick={() => setActiveStoryId("")} type="button"><FiX /></button>
          <img alt="Selected world story preview" src={activeStory.url} />
          <span>{activeStory.label}</span>
        </div>
      ) : null}</> : null}

      <section className="world-prototype-creator">
        <span>{ownerName.split(" ")[0]} <b>✓</b> - <strong>{Number(world.steppedInside || world.viewCount || 0).toLocaleString()}</strong> stepped inside</span>
      </section>

      <div className="world-prototype-premium-pill">{experience ? `Premium Experience - all chapters unlock for ${STAR}${world.pricing?.starsAmount || 190} once` : `${PLANET} Premium World - 1 free chapter - ${STAR}${world.pricing?.starsAmount || 190}/mo`}</div>

      <input
        aria-label={experience ? "Experience title" : "World title"}
        className={inputClass("world-publish-title")}
        maxLength={120}
        onChange={(event) => updateWorld({ title: event.target.value })}
        placeholder={experience ? "Name your premium experience" : "Name your premium world"}
        value={world.title}
      />

      <div className="world-prototype-media world-publish-cover">
        {coverUrl ? <img alt={`${world.title || "Premium world"} cover`} src={coverUrl} /> : <div className="world-prototype-media-empty">Add a cover</div>}
        <button aria-label={uploading ? "Uploading cover" : "Upload cover media"} className="world-prototype-media-edit" disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">{uploading ? <FiLoader className="world-story-upload-spinner" /> : <FiEdit3 />}</button>
        {coverUrl ? <button aria-label="Remove cover image" className="world-publish-cover-remove" disabled={uploading} onClick={removeCover} type="button"><FiTrash2 /></button> : null}
        <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />
      </div>

      <textarea
        aria-label={experience ? "Experience description" : "World description"}
        className={inputClass("world-publish-summary")}
        maxLength={300}
        onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })}
        placeholder={experience ? "Describe the journey from beginning to outcome" : "Describe what members will experience"}
        value={world.description}
      />

      <section className="planet-create-fieldset">
        <div className="world-prototype-section-head"><h2>Category</h2><span>help people understand your {experience ? "experience" : "world"}</span></div>
        <div className="planet-category-options">{WORLD_CATEGORIES.map((category) => <button className={world.category === category ? "is-selected" : ""} key={category} onClick={() => updateWorld({ category })} type="button">{category}</button>)}</div>
      </section>

      <section className="planet-create-fieldset planet-price-section">
        <div className="world-prototype-section-head"><h2>{experience ? "Unlock price" : "Subscription price"}</h2><span>{experience ? "one-time, permanent access" : "one honest monthly price"}</span></div>
        <div className="planet-price-options">{MONTHLY_PRICES.map((price) => <button className={Number(world.pricing?.starsAmount) === price ? "is-selected" : ""} key={price} onClick={() => updateWorld({ pricing: { mode: experience ? "ONE_TIME" : "MONTHLY", presetId: `${experience ? "ONE_TIME" : "MONTHLY"}_${price}`, starsAmount: price } })} type="button"><strong>{STAR}{price}</strong><small>{experience ? "once" : "/month"}</small>{price === 190 ? <em>Most chosen</em> : null}</button>)}</div>
        <div className="planet-price-preview"><span>10 {experience ? "unlocks" : "members"} <b>{STAR}{(world.pricing?.starsAmount || 190) * 10}{experience ? "" : "/mo"}</b></span><span>50 {experience ? "unlocks" : "members"} <b>{STAR}{(world.pricing?.starsAmount || 190) * 50}{experience ? "" : "/mo"}</b></span></div>
      </section>

      {experience ? <label className="experience-world-toggle"><span><strong>Include in my World</strong><small>World members can access this while subscribed. Separate buyers keep it permanently.</small></span><input checked={Boolean(world.includedInWorld)} onChange={(event) => updateWorld({ includedInWorld: event.target.checked })} type="checkbox" /></label> : null}

      <section className="world-prototype-experience">
        <div className="world-prototype-section-head">
          <h2>Experience</h2>
          <span>{experience ? `${chapters.length} chapters · unlimited` : `${chapters.length} / 5 chapters · ${PLANET} Premium`}</span>
        </div>
        <div className="world-prototype-chapters">
          {chapters.map((chapter, index) => {
            const locked = index > 0;
            return (
              <div className="world-prototype-chapter-item" key={chapter.stableChapterId || chapter.localId || index}>
                <button className="world-prototype-chapter-row" disabled={Boolean(removingChapterId)} onClick={() => openChapterEditor(index)} type="button">
                <span>{index + 1}</span>
                <span>
                  <b>{chapter.title || `Chapter ${index + 1}`}</b>
                  <small>
                    <strong>+ Write the story</strong>
                    {" - "}
                    {locked ? <><FiLock /> private - schedule</> : <em>free preview</em>}
                  </small>
                </span>
                <i>›</i>
                </button>
                <button
                aria-label={`Remove ${chapter.title || `Chapter ${index + 1}`}`}
                className="world-prototype-chapter-remove"
                disabled={Boolean(removingChapterId) || saving || uploading}
                onClick={() => removeChapter(index)}
                title="Remove chapter"
                type="button"
                >
                  <FiTrash2 />
                </button>
              </div>
            );
          })}
        </div>
        <button className="world-prototype-add-chapter" onClick={addChapter} type="button"><FiPlus /> Add a chapter</button>
      </section>

      {!experience ? <section className="world-prototype-comments">
        <h2>Comments</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <input placeholder="Add a comment..." readOnly />
          <button aria-label="Post comment" type="button"><FiArrowUpRight /></button>
        </form>
      </section> : null}

      <div className="world-publish-actionbar">
        {error ? <p aria-live="assertive" className="world-publish-error">{error}</p> : null}
        <button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button"><FiCheck /> {submitting ? "Submitting" : "Submit"}</button>
      </div>
    </article>
    </>
  );
}
