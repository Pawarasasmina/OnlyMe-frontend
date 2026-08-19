import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiEdit3,
  FiExternalLink,
  FiLock,
  FiMoreHorizontal,
  FiPlus,
  FiScissors,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { publicationService as api } from "../../services/publicationService";
import { normalizeTags, publicationError } from "../../utils/publicationValidation";
import { worldCompletenessBySection } from "../../utils/worldValidation";

const PLANET = "\uD83E\uDE90";
const FLEX = "\uD83D\uDCAA";
const STAR = "\u2726";
const STORY_PREVIEW_LIMIT = 3;
const MEDIA_BLOCK_TYPES = new Set(["IMAGE", "VIDEO", "AUDIO", "VOICE"]);
const TEXT_BLOCK_TYPES = new Set(["TEXT", "KEY_POINT", "HIGHLIGHT"]);

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

function readChapterText(chapter) {
  return chapter?.blocks?.find((block) => block.type === "TEXT")?.text || "";
}

function applyChapterText(chapter, text) {
  const blocks = chapter.blocks?.length ? chapter.blocks : [{ id: crypto.randomUUID(), order: 0, text: "", type: "TEXT" }];
  let used = false;
  return {
    ...chapter,
    blocks: blocks.map((block, order) => {
      if (block.type !== "TEXT" || used) return { ...block, order };
      used = true;
      return { ...block, order, text };
    }),
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
        media: block.media,
        saved: true,
        url: block.media.secureUrl,
      })))
    .slice(0, STORY_PREVIEW_LIMIT);
}

function revokePreviewUrl(story) {
  if (story?.url?.startsWith("blob:")) URL.revokeObjectURL(story.url);
}

export default function WorldPublishingPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const coverInputRef = useRef(null);
  const storyInputRef = useRef(null);
  const storyPreviewsRef = useRef([]);
  const [world, setWorld] = useState(freshWorld);
  const [storyPreviews, setStoryPreviews] = useState([]);
  const [activeStoryId, setActiveStoryId] = useState("");
  const [activeChapter, setActiveChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const chapters = world.chapters || [];
  const ownerName = user?.name || user?.displayName || user?.username || "Max";
  const coverUrl = world.coverMedia?.secureUrl;
  const validation = useMemo(() => worldCompletenessBySection(world), [world]);
  const validationMessages = Object.values(validation).flat();
  const readyToSubmit = world.id && !validationMessages.length && !saving && !uploading;
  const activeStory = useMemo(() => storyPreviews.find((story) => story.id === activeStoryId), [activeStoryId, storyPreviews]);

  const loadWorld = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.listMyPublications({ kind: "PREMIUM_WORLD", limit: 50 });
      const existing = (response.data.data.items || []).find((item) => ["DRAFT", "CHANGES_REQUESTED", "PENDING_REVIEW", "PUBLISHED"].includes(item.status));
      if (!existing) {
        setWorld(freshWorld());
        setStoryPreviews((current) => {
          current.forEach(revokePreviewUrl);
          return [];
        });
        setNotice("Start creating your premium world.");
        return;
      }
      const full = await api.getMyPublication(existing.id);
      const publication = { ...freshWorld(), ...full.data.data.publication };
      setWorld(publication);
      setStoryPreviews((current) => {
        current.forEach(revokePreviewUrl);
        return storyPreviewsFromWorld(publication);
      });
      setNotice(`${statusLabel(full.data.data.publication)} opened.`);
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorld();
  }, [loadWorld]);

  useEffect(() => {
    storyPreviewsRef.current = storyPreviews;
  }, [storyPreviews]);

  useEffect(() => () => {
    storyPreviewsRef.current.forEach(revokePreviewUrl);
  }, []);

  const updateWorld = (patch) => {
    setWorld((current) => ({ ...current, ...patch }));
    setNotice("Unsaved changes");
    setError("");
  };

  const updateChapter = (index, patch) => {
    setWorld((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, chapterIndex) => (chapterIndex === index ? { ...chapter, ...patch } : chapter)),
    }));
    setNotice("Unsaved changes");
    setError("");
  };

  const ensureDraft = async (snapshot = world) => {
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
    setWorld(draft);
    history.replaceState({}, "", "/create/premium-world");
    return draft;
  };

  const refreshWorld = async (id) => {
    const response = await api.getMyPublication(id);
    const next = response.data.data.publication;
    setWorld((current) => ({ ...current, ...next }));
    return next;
  };

  const attachStoryPreviews = async (draft, previews) => {
    const unsaved = previews.filter((preview) => preview.file && !preview.saved);
    if (!unsaved.length) return draft;

    const targetChapter = draft.chapters?.find((chapter) => chapter.isPreview) || draft.chapters?.[0];
    if (!targetChapter?.stableChapterId) {
      throw new Error("Save a preview chapter before adding story photos.");
    }

    const existingStoryCount = (targetChapter.blocks || []).filter(isStoryPreviewBlock).length;
    const uploadQueue = unsaved.slice(0, Math.max(0, STORY_PREVIEW_LIMIT - existingStoryCount));
    if (!uploadQueue.length) return draft;

    setNotice("Saving story previews...");
    const uploadedBlocks = [];
    for (const preview of uploadQueue) {
      const blockId = preview.blockId || crypto.randomUUID();
      const uploaded = (await api.uploadMedia(draft.id, preview.file, {
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

    const nextBlocks = [...(targetChapter.blocks || []), ...uploadedBlocks].map((block, order) => ({ ...block, order }));
    await api.updateChapter(draft.id, targetChapter.stableChapterId, {
      blocks: nextBlocks,
      isPreview: Boolean(targetChapter.isPreview),
      releaseMode: targetChapter.releaseMode || "IMMEDIATE",
      statusVersion: draft.statusVersion,
      title: targetChapter.title || "Preview",
    });
    const next = await refreshWorld(draft.id);
    setStoryPreviews((current) => {
      current.forEach(revokePreviewUrl);
      return storyPreviewsFromWorld(next);
    });
    return next;
  };

  const saveDraft = async () => {
    if (saving || uploading) return null;
    setSaving(true);
    setError("");
    setNotice("Saving...");
    const snapshot = world;
    try {
      let draft = await ensureDraft(snapshot);
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
        draft = await refreshWorld(draft.id);
      }

      draft = await attachStoryPreviews(draft, storyPreviews);
      setNotice("Draft saved");
      return draft;
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Save paused");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("Uploading cover...");
    try {
      const draft = await ensureDraft(world);
      await api.uploadMedia(draft.id, file, { purpose: "COVER", statusVersion: draft.statusVersion });
      await refreshWorld(draft.id);
      setNotice("Cover saved");
    } catch (requestError) {
      setError(publicationError(requestError));
      setNotice("Cover upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addStoryPreview = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setError("Choose an image to add a story preview.");
      return;
    }

    const remaining = Math.max(0, STORY_PREVIEW_LIMIT - storyPreviews.length);
    if (!remaining) {
      setNotice("Only 3 story previews can be shown.");
      return;
    }
    const nextStories = imageFiles.slice(0, remaining).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      label: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      saved: false,
      url: URL.createObjectURL(file),
    }));

    setStoryPreviews((current) => {
      if (imageFiles.length > remaining) setNotice("Only 3 story previews can be shown.");
      else setNotice("Story preview added.");

      return [...current, ...nextStories];
    });
    setActiveStoryId(nextStories[0]?.id || "");
    setError("");
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
    }
    if (activeStoryId === storyId) setActiveStoryId("");
    setNotice("Story preview removed.");
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
      nav(`/studio/worlds/${submitted.id}`);
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
          title: "",
        },
      ],
    });
    setActiveChapter(chapters.length);
  };

  if (loading) return <div className="world-prototype-state">Opening planet...</div>;

  return (
    <article className="world-prototype-page world-publish-page">
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
          <h2>Stories</h2>
          <span>up to 3 - seen before purchase</span>
        </div>
        <div>
          {storyPreviews.map((story) => (
            <span className="world-prototype-story-thumb" key={story.id}>
              <button aria-label="Open story preview" className="world-prototype-story-open" onClick={() => setActiveStoryId(story.id)} type="button">
                <img alt="World story preview" src={story.url} />
                <small>{story.label}</small>
              </button>
              <button aria-label="Remove story preview" onClick={() => removeStoryPreview(story.id)} type="button"><FiX /></button>
            </span>
          ))}
          {storyPreviews.length < STORY_PREVIEW_LIMIT ? (
          <button className="world-prototype-story-add" onClick={() => storyInputRef.current?.click()} type="button">
            <FiPlus />
            <span>add</span>
          </button>
          ) : null}
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" multiple onChange={addStoryPreview} ref={storyInputRef} type="file" />
        </div>
      </section>

      <section className="world-prototype-story-rings">
        <h2><FiScissors /> Stories</h2>
        <div>
          {storyPreviews.map((story) => (
            <button className="is-active" key={story.id} onClick={() => setActiveStoryId(story.id)} type="button"><FiScissors /><span>{story.label}</span></button>
          ))}
          {storyPreviews.length < STORY_PREVIEW_LIMIT ? <button onClick={() => storyInputRef.current?.click()} type="button"><FiPlus /><span>New</span></button> : null}
        </div>
      </section>

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
        <button aria-label="Upload cover media" className="world-prototype-media-edit" onClick={() => coverInputRef.current?.click()} type="button"><FiEdit3 /></button>
        <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="sr-only" onChange={uploadCover} ref={coverInputRef} type="file" />
      </div>

      <textarea
        aria-label="World description"
        className={inputClass("world-publish-summary")}
        maxLength={300}
        onChange={(event) => updateWorld({ description: event.target.value, summary: event.target.value.slice(0, 300) })}
        placeholder="Describe what members will experience"
        value={world.description}
      />

      <div className="world-publish-meta-row">
        <label>
          Category
          <input maxLength={40} onChange={(event) => updateWorld({ category: event.target.value })} placeholder="Add a category" value={world.category} />
        </label>
        <label>
          Price
          <select onChange={(event) => updateWorld({ pricing: { mode: "MONTHLY", presetId: `MONTHLY_${event.target.value}`, starsAmount: Number(event.target.value) } })} value={world.pricing?.starsAmount || 190}>
            <option value="90">90/mo</option>
            <option value="190">190/mo</option>
            <option value="290">290/mo</option>
          </select>
        </label>
      </div>

      <section className="world-prototype-experience">
        <div className="world-prototype-section-head">
          <h2>Experience</h2>
          <span>{chapters.length} / 5 chapters - {PLANET} Premium</span>
        </div>
        <div className="world-prototype-chapters">
          {chapters.map((chapter, index) => {
            const locked = index > 0;
            return (
              <button className="world-prototype-chapter-row" key={chapter.stableChapterId || chapter.localId || index} onClick={() => setActiveChapter(activeChapter === index ? null : index)} type="button">
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
            );
          })}
        </div>
        <button className="world-prototype-add-chapter" onClick={addChapter} type="button"><FiPlus /> Add a chapter</button>
      </section>

      {activeChapter != null && chapters[activeChapter] ? (
        <section className="world-publish-chapter-editor">
          <div>
            <h2>Chapter {activeChapter + 1}</h2>
            <button aria-label="Close chapter editor" onClick={() => setActiveChapter(null)} type="button"><FiX /></button>
          </div>
          <input
            aria-label="Chapter title"
            maxLength={120}
            onChange={(event) => updateChapter(activeChapter, { title: event.target.value })}
            placeholder="Chapter title"
            value={chapters[activeChapter].title}
          />
          <textarea
            aria-label="Chapter story"
            maxLength={2000}
            onChange={(event) => {
              setWorld((current) => ({
                ...current,
                chapters: current.chapters.map((chapter, index) => (index === activeChapter ? applyChapterText(chapter, event.target.value) : chapter)),
              }));
              setNotice("Unsaved changes");
              setError("");
            }}
            placeholder="Write this chapter's story"
            value={readChapterText(chapters[activeChapter])}
          />
        </section>
      ) : null}

      <section className="world-prototype-comments">
        <h2>Comments</h2>
        <form onSubmit={(event) => event.preventDefault()}>
          <input placeholder="Add a comment..." readOnly />
          <button aria-label="Post comment" type="button"><FiArrowUpRight /></button>
        </form>
      </section>

      <div className="world-publish-actionbar">
        <span role={error ? "alert" : "status"}>{error || notice || statusLabel(world)}</span>
        <button disabled={saving || uploading || submitting} onClick={saveDraft} type="button"><FiUpload /> Save draft</button>
        <button disabled={!readyToSubmit || submitting} onClick={submitWorld} type="button"><FiCheck /> {submitting ? "Submitting" : "Submit"}</button>
      </div>
    </article>
  );
}
