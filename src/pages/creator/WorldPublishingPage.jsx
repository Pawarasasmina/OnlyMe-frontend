import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit3,
  FiExternalLink,
  FiLock,
  FiLoader,
  FiMoreHorizontal,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import StoryCreator from "../../components/stories/StoryCreator";
import { publicationService as api } from "../../services/publicationService";
import { normalizeTags, publicationError } from "../../utils/publicationValidation";
import { worldCompletenessBySection } from "../../utils/worldValidation";
import { SeenChapterEditor, chapterBlocksWithStory, chapterStoryText } from "./SeenComposerPage";

const PLANET = "\uD83E\uDE90";
const FLEX = "\uD83D\uDCAA";
const STAR = "\u2726";
const STORY_PREVIEW_LIMIT = 3;
const SUBSCRIBER_STORY_LIMIT = 3;
const MEDIA_BLOCK_TYPES = new Set(["IMAGE", "VIDEO", "AUDIO", "VOICE"]);
const TEXT_BLOCK_TYPES = new Set(["TEXT", "KEY_POINT", "HIGHLIGHT"]);
const WORLD_CATEGORIES = ["Places", "Moving", "Business", "Growth", "Lifestyle"];
const MONTHLY_PRICES = [90, 190, 290];

function freshWorld() {
  return {
    category: "",
    chapters: [],
    coverMedia: null,
    description: "",
    kind: "PREMIUM_WORLD",
    planet: { accent: "ice-white", emoji: PLANET },
    pricing: { mode: "MONTHLY", presetId: "MONTHLY_190", starsAmount: 190 },
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

function chapterPayload(chapter, index) {
  return {
    blocks: (chapter.blocks || []).map(blockPayload),
    isPreview: index === 0,
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
  return Boolean(block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl);
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
        < (story.audience === "FREE" ? STORY_PREVIEW_LIMIT : SUBSCRIBER_STORY_LIMIT)
    ));
}

function revokePreviewUrl(story) {
  if (story?.url?.startsWith("blob:")) URL.revokeObjectURL(story.url);
}

export default function WorldPublishingPage({ publicationId = "" }) {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const coverInputRef = useRef(null);
  const storyPreviewsRef = useRef([]);
  const autoSaveAttemptedStoryIds = useRef(new Set());
  const draftAutoSaveTimer = useRef(null);
  const pendingDraftSaveRef = useRef(false);
  const saveDraftRef = useRef(null);
  const worldEditVersionRef = useRef(0);
  const storySaveResolvers = useRef(new Map());
  const [world, setWorld] = useState(freshWorld);
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
  const [creationStarted, setCreationStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [, setNotice] = useState("");
  const [error, setError] = useState("");
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
        const response = await api.listMyPublications({ kind: "PREMIUM_WORLD", limit: 50 });
        existing = (response.data.data.items || []).find((item) => ["DRAFT", "CHANGES_REQUESTED", "PENDING_REVIEW", "PUBLISHED"].includes(item.status));
      }
      if (!existing) {
        setWorld(freshWorld());
        setStoryPreviews((current) => {
          current.forEach(revokePreviewUrl);
          return [];
        });
        setNotice("Start creating your premium world.");
        setCreationStarted(false);
        return;
      }
      let publication = publicationId ? existing : (await api.getMyPublication(existing.id)).data.data.publication;
      if (publication.status === "PUBLISHED") publication = (await api.startPublishedRevision(publication.id, publication.statusVersion)).data.data.publication;
      publication = { ...freshWorld(), ...publication };
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
  }, [publicationId]);

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
      kind: "PREMIUM_WORLD",
      planet: snapshot.planet,
      pricing: snapshot.pricing,
      summary: snapshot.summary,
      tags: normalizeTags(snapshot.tags),
      title: snapshot.title,
    });
    const draft = { ...snapshot, ...response.data.data.publication, chapters: snapshot.chapters };
    setWorld((current) => preserveNewerLocalEdits(current, draft, requestEditVersion));
    history.replaceState({}, "", "/create/premium-world");
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

      let targetChapter = next.chapters?.find((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview);
      if (!targetChapter?.stableChapterId) {
        await api.addChapter(next.id, {
          blocks: [],
          isPreview: audience === "FREE",
          releaseMode: "IMMEDIATE",
          statusVersion: next.statusVersion,
          title: audience === "FREE" ? "Chapter 1" : "Subscriber stories",
        });
        next = await refreshWorld(next.id, requestEditVersion);
        targetChapter = next.chapters?.find((chapter) => audience === "FREE" ? chapter.isPreview : !chapter.isPreview);
      }
      if (!targetChapter?.stableChapterId) throw new Error("A story chapter could not be prepared.");

      const limit = audience === "FREE" ? STORY_PREVIEW_LIMIT : SUBSCRIBER_STORY_LIMIT;
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
          mediaType: "IMAGE",
          purpose: "BLOCK",
        })).data.data;
        uploadedBlocks.push({
          id: blockId,
          media: uploaded,
          metadata: { label: preview.label, storyPreview: true },
          order: (targetChapter.blocks || []).length + uploadedBlocks.length,
          text: "",
          type: "IMAGE",
        });
      }

      await api.updateChapter(next.id, targetChapter.stableChapterId, {
        blocks: [...(targetChapter.blocks || []), ...uploadedBlocks].map((block, order) => ({ ...block, order })),
        isPreview: audience === "FREE",
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
        planet: snapshot.planet,
        pricing: snapshot.pricing,
        statusVersion: draft.statusVersion,
        summary: snapshot.summary,
        tags: normalizeTags(snapshot.tags),
        title: snapshot.title,
      })).data.data.publication;

      for (const [index, chapter] of snapshot.chapters.entries()) {
        if (chapter.stableChapterId) {
          await api.updateChapter(draft.id, chapter.stableChapterId, {
            ...chapterPayload(chapter, index),
            statusVersion: draft.statusVersion,
          });
        } else {
          await api.addChapter(draft.id, {
            ...chapterPayload(chapter, index),
            statusVersion: draft.statusVersion,
          });
        }
        draft = await refreshWorld(draft.id, requestEditVersion);
      }

      if (storyPreviews.some((preview) => preview.file && !preview.saved) && !draft.chapters?.length) {
        await api.addChapter(draft.id, {
          blocks: [],
          isPreview: true,
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

  const addStoryPreview = ({ caption = "", editorMetadata = null, file }) => {
    if (!file) return;
    const audienceStories = storyAudience === "SUBSCRIBER" ? subscriberStories : freeStories;
    const limit = storyAudience === "SUBSCRIBER" ? SUBSCRIBER_STORY_LIMIT : STORY_PREVIEW_LIMIT;
    const remaining = Math.max(0, limit - audienceStories.length);
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

    setStoryAutoSaving(true);
    setStoryPreviews((current) => {
      setNotice(`Uploading ${storyAudience === "SUBSCRIBER" ? "subscriber" : "free preview"} story...`);
      return [...current, nextStory];
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
    const messages = Object.values(worldCompletenessBySection(saved)).flat();
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
      setNotice("Submitted for review");
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      nav("/profile", { replace: true });
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const addChapter = () => {
    if (chapters.length >= 5) {
      setError("Premium World can have up to 5 chapters.");
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

  if (loading) return <div className="world-prototype-state">Opening planet...</div>;

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

  if (!creationStarted) return (
    <article className="planet-create-entry">
      <header><button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button><div><span>Planet creation</span><h1>Create a world</h1></div></header>
      <p className="planet-create-intro">A World is your private space on your profile. Members subscribe to step into your chapters, preview stories, and everything you share inside.</p>
      <button className="planet-choice-card is-selected" onClick={() => setCreationStarted(true)} type="button">
        <span className="planet-choice-orbit"><i>{FLEX}</i><b>{PLANET}</b></span>
        <span><strong>Your World</strong><small>One per creator · monthly subscription · profile only</small><em>Premium chapters, private stories and closer access—all together.</em></span>
        <FiArrowUpRight />
      </button>
      <div className="planet-create-principles"><span><FiCheck /> One clear monthly price</span><span><FiCheck /> 1 free preview chapter</span><span><FiCheck /> Up to 3 preview stories</span></div>
      <button className="planet-create-continue" onClick={() => setCreationStarted(true)} type="button">Build my World <FiArrowUpRight /></button>
      <small className="planet-create-footnote">Worlds live on your profile only—they never appear as ordinary feed posts.</small>
    </article>
  );

  return (
    <>
    {cropTarget ? <ProfileImageCropper kind={cropTarget.kind} onCancel={closeImageCrop} onSave={useAdjustedImage} saving={uploading} source={cropTarget.url} /> : null}
    <article className="world-prototype-page world-publish-page">
      <nav className="planet-create-progress" aria-label="World creation progress">
        {["Identity", "Stories", "Chapters", "Access"].map((label, index) => <span className={index === 0 ? "is-current" : ""} key={label}><b>{index + 1}</b>{label}</span>)}
      </nav>
      <header className="world-prototype-top">
        <button aria-label="Back" onClick={() => nav(-1)} type="button"><FiArrowLeft /></button>
        <div>
          {world.id ? <button aria-label="Open public world" onClick={() => window.open(`/world/${world.id}`, "_blank", "noopener,noreferrer")} type="button"><FiExternalLink /></button> : null}
          <button aria-label="More world actions" type="button"><FiMoreHorizontal /></button>
        </div>
      </header>

      <section className="world-prototype-planet world-publish-planet">
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
      ) : null}

      <section className="world-prototype-creator">
        <span>{ownerName.split(" ")[0]} <b>✓</b> - <strong>{Number(world.steppedInside || world.viewCount || 0).toLocaleString()}</strong> stepped inside</span>
      </section>

      <div className="world-prototype-premium-pill">{PLANET} Premium World - 1 free chapter - {STAR}{world.pricing?.starsAmount || 190}/mo</div>

      <input
        aria-label="World title"
        className={inputClass("world-publish-title")}
        maxLength={120}
        onChange={(event) => updateWorld({ title: event.target.value })}
        placeholder="Name your premium world"
        value={world.title}
      />

      <div className="world-prototype-media world-publish-cover">
        {coverUrl ? <img alt={`${world.title || "Premium world"} cover`} src={coverUrl} /> : <div className="world-prototype-media-empty">Add a cover</div>}
        <button aria-label={uploading ? "Uploading cover" : "Upload cover media"} className="world-prototype-media-edit" disabled={uploading} onClick={() => coverInputRef.current?.click()} type="button">{uploading ? <FiLoader className="world-story-upload-spinner" /> : <FiEdit3 />}</button>
        {coverUrl ? <button aria-label="Remove cover image" className="world-publish-cover-remove" disabled={uploading} onClick={removeCover} type="button"><FiTrash2 /></button> : null}
        <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="sr-only" onChange={requestCoverUpload} ref={coverInputRef} type="file" />
      </div>

      <textarea
        aria-label="World description"
        className={inputClass("world-publish-summary")}
        maxLength={300}
        onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })}
        placeholder="Describe what members will experience"
        value={world.description}
      />

      <section className="planet-create-fieldset">
        <div className="world-prototype-section-head"><h2>Category</h2><span>help people understand your world</span></div>
        <div className="planet-category-options">{WORLD_CATEGORIES.map((category) => <button className={world.category === category ? "is-selected" : ""} key={category} onClick={() => updateWorld({ category })} type="button">{category}</button>)}</div>
      </section>

      <section className="planet-create-fieldset planet-price-section">
        <div className="world-prototype-section-head"><h2>Subscription price</h2><span>one honest monthly price</span></div>
        <div className="planet-price-options">{MONTHLY_PRICES.map((price) => <button className={Number(world.pricing?.starsAmount) === price ? "is-selected" : ""} key={price} onClick={() => updateWorld({ pricing: { mode: "MONTHLY", presetId: `MONTHLY_${price}`, starsAmount: price } })} type="button"><strong>{STAR}{price}</strong><small>/month</small>{price === 190 ? <em>Most chosen</em> : null}</button>)}</div>
        <div className="planet-price-preview"><span>10 members <b>{STAR}{(world.pricing?.starsAmount || 190) * 10}/mo</b></span><span>50 members <b>{STAR}{(world.pricing?.starsAmount || 190) * 50}/mo</b></span></div>
      </section>

      <section className="world-prototype-experience">
        <div className="world-prototype-section-head">
          <h2>Experience</h2>
          <span>{chapters.length} / 5 chapters - {PLANET} Premium</span>
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

      <section className="world-prototype-comments">
        <h2>Comments</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <input placeholder="Add a comment..." readOnly />
          <button aria-label="Post comment" type="button"><FiArrowUpRight /></button>
        </form>
      </section>

      <div className="world-publish-actionbar">
        <button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button"><FiCheck /> {submitting ? "Submitting" : "Submit"}</button>
      </div>
    </article>
    </>
  );
}
