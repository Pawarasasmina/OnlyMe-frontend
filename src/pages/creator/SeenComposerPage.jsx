/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiCamera, FiChevronLeft, FiEye, FiFilm, FiImage, FiMapPin, FiMic, FiPlus, FiSave, FiScissors, FiType, FiUpload, FiX, FiZap } from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";
import { normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";

const empty = { kind: "SEEN", title: "", summary: "", description: "", category: "", tags: [], chapters: [] };
const categories = ["Places", "Moving", "Business", "Growth", "Lifestyle"];
const defaultSeries = ["Gym Life"];
const VIDEO_RECORDER_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
const VIDEO_RECORDING_PAD_MS = 350;
const TEXT_BLOCK_TYPES = new Set(["TEXT", "KEY_POINT", "HIGHLIGHT"]);

function statusLabel(status, uploading) {
  if (uploading) return "Uploading media...";
  if (status === "Saved") return "";
  return status;
}

function seriesFromTags(tags = []) {
  const raw = tags.find((tag) => String(tag).startsWith("series:"));
  return raw ? raw.replace(/^series:/, "").replace(/-/g, " ") : "";
}

function tagsWithSeries(tags = [], series = "") {
  const base = normalizeTags(tags).filter((tag) => !String(tag).startsWith("series:"));
  const value = series.trim().toLowerCase().replace(/\s+/g, "-");
  return value ? [...base, `series:${value}`] : base;
}

function newBlockId() {
  return globalThis.crypto?.randomUUID?.() || `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function chapterStoryText(chapter = {}) {
  return (chapter.blocks || []).filter((block) => TEXT_BLOCK_TYPES.has(block.type)).map((block) => block.text || "").join("\n\n");
}

function chapterBlocksWithStory(chapter = {}, story = "") {
  const trimmed = story.trim();
  const mediaBlocks = (chapter.blocks || []).filter((block) => !TEXT_BLOCK_TYPES.has(block.type));
  if (!trimmed) return mediaBlocks.map((block, order) => ({ ...block, order }));
  return [
    { id: (chapter.blocks || []).find((block) => block.type === "TEXT")?.id || newBlockId(), order: 0, text: trimmed, type: "TEXT" },
    ...mediaBlocks.map((block, index) => ({ ...block, order: index + 1 })),
  ];
}

function mediaLabel(block = {}) {
  if (block.type === "IMAGE") return "Photo";
  if (block.type === "VOICE" || block.type === "AUDIO") return "Voice";
  if (block.type === "VIDEO") return "Video";
  return block.type?.replaceAll("_", " ").toLowerCase() || "Block";
}

function formatDuration(seconds = 0) {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function supportedRecorderType() {
  if (typeof MediaRecorder === "undefined") return "";
  return VIDEO_RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
      reject(new Error("Unable to read this video."));
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.currentTime = time;
  });
}

function VideoTrimSheet({ file, limitSeconds, onCancel, onUpload }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const maxStart = Math.max(0, duration - limitSeconds);
  const end = Math.min(duration, start + limitSeconds);
  const clipLength = Math.max(0, end - start);
  const canUploadOriginal = clipLength >= limitSeconds - 0.5 && duration <= limitSeconds + 0.5;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const stopAtEnd = () => {
      if (video.currentTime >= end) video.pause();
    };
    video.addEventListener("timeupdate", stopAtEnd);
    return () => video.removeEventListener("timeupdate", stopAtEnd);
  }, [end]);

  const previewClip = async () => {
    const video = videoRef.current;
    if (!video) return;
    setError("");
    try {
      video.pause();
      await seekVideo(video, start);
      await video.play();
    } catch {
      setError("Preview could not start for this video.");
    }
  };

  const uploadOriginal = async () => {
    setBusy(true);
    setError("");
    try {
      await onUpload(file.file);
    } finally {
      setBusy(false);
    }
  };

  const uploadTrimmed = async () => {
    const video = videoRef.current;
    const mimeType = supportedRecorderType();
    const captureStream = video?.captureStream || video?.mozCaptureStream;
    if (!video || !captureStream || !mimeType) {
      if (canUploadOriginal) {
        await uploadOriginal();
        return;
      }
      setError(`This browser cannot crop the video here. Try Chrome or upload a ${formatDuration(limitSeconds)} clip.`);
      return;
    }
    if (clipLength < limitSeconds - 0.5) {
      setError(`Choose a video at least ${limitSeconds} seconds long.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      video.pause();
      video.muted = false;
      await seekVideo(video, start);
      const stream = captureStream.call(video);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      const stopped = new Promise((resolve, reject) => {
        recorder.ondataavailable = ({ data }) => {
          if (data.size) chunks.push(data);
        };
        recorder.onerror = () => reject(new Error("The crop failed while recording."));
        recorder.onstop = resolve;
      });
      recorder.start(250);
      await video.play();
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(1000, limitSeconds * 1000 - VIDEO_RECORDING_PAD_MS)));
      video.pause();
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      const type = mimeType.split(";")[0] || "video/webm";
      const blob = new Blob(chunks, { type });
      if (!blob.size) throw new Error("The cropped clip was empty.");
      const trimmed = new File([blob], `seen-${limitSeconds}s-${Date.now()}.webm`, { type });
      await onUpload(trimmed);
    } catch (trimError) {
      setError(trimError.message || "Unable to crop this video. Please try another file.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div aria-modal="true" className="seen-video-trim-layer" role="dialog">
      <button aria-label="Close video crop" className="seen-video-trim-dim" disabled={busy} onClick={onCancel} type="button" />
      <section className="seen-video-trim-sheet">
        <div className="seen-video-trim-head">
          <span><FiScissors aria-hidden="true" /> Crop video</span>
          <button aria-label="Close video crop" disabled={busy} onClick={onCancel} type="button"><FiX /></button>
        </div>
        <video
          controls
          onLoadedMetadata={(event) => {
            const nextDuration = Number(event.currentTarget.duration) || 0;
            setDuration(nextDuration);
            setStart(0);
            if (nextDuration && nextDuration < limitSeconds - 0.5) {
              setError(`This video is ${formatDuration(nextDuration)}. Choose at least ${formatDuration(limitSeconds)} for this upload.`);
            }
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={file.url}
        />
        <div className="seen-video-trim-copy">
          <strong>{formatDuration(limitSeconds)} video</strong>
          <small>
            {duration ? `${formatDuration(start)} - ${formatDuration(end)} of ${formatDuration(duration)}` : "Loading video..."}
          </small>
        </div>
        <label className="seen-video-trim-range">
          <span>Start</span>
          <input
            disabled={!duration || busy}
            max={maxStart}
            min="0"
            onChange={(event) => setStart(Number(event.target.value))}
            step="0.1"
            type="range"
            value={Math.min(start, maxStart)}
          />
        </label>
        {error ? <p className="seen-video-trim-error" role="alert">{error}</p> : null}
        <div className="seen-video-trim-actions">
          <button disabled={!duration || busy} onClick={previewClip} type="button">Preview</button>
          <button disabled={!duration || busy || clipLength < limitSeconds - 0.5} onClick={uploadTrimmed} type="button">
            <FiUpload aria-hidden="true" /> {busy ? "Cropping..." : `Upload ${formatDuration(limitSeconds)}`}
          </button>
        </div>
      </section>
    </div>
  );
}

function SeenChapterEditor({ busy, chapter, error, onAddPlace, onDone, onMediaUpload, onStoryChange, story, status }) {
  const photoInput = useRef(null);
  const voiceInput = useRef(null);
  const textareaRef = useRef(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const attachmentBlocks = (chapter?.blocks || []).filter((block) => !TEXT_BLOCK_TYPES.has(block.type));

  return (
    <section className="seen-chapter-editor-page">
      <header className="seen-chapter-editor-header">
        <div>
          <h1>{chapter?.title?.trim() || "Chapter name"}</h1>
          <p>drag a block {"\u2014"} move {"\u00b7"} double-tap {"\u2014"} edit</p>
        </div>
        <button disabled={busy} onClick={onDone} type="button">{busy ? "Saving" : "Done"}</button>
      </header>

      <label className="seen-chapter-writing-surface">
        <span className="sr-only">Write the story</span>
        <textarea
          autoFocus
          ref={textareaRef}
          maxLength={2000}
          onChange={(event) => onStoryChange(event.target.value)}
          placeholder={"Just write.\n\nSelect text \u2014 color appears."}
          value={story}
        />
      </label>
      {attachmentBlocks.length ? (
        <div className="seen-chapter-block-strip">
          {attachmentBlocks.map((block) => (
            <span key={block.id}>
              {mediaLabel(block)}
              {block.media?.duration ? ` · ${Math.round(block.media.duration)}s` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <div className="seen-chapter-editor-tools">
        <span>select {"\u2014"} color {"\u00b7"} drag a block {"\u00b7"} double-tap {"\u2014"} edit {"\u00b7"} + photo, voice, place</span>
        <button aria-label="Dismiss editor hint" type="button"><FiX /></button>
      </div>

      {error ? <p className="seen-chapter-editor-error" role="alert">{error}</p> : null}
      {status ? <p className="seen-chapter-editor-status" role="status">{status}</p> : null}
      {actionsOpen ? (
        <div className="seen-chapter-add-menu">
          <button onClick={() => { textareaRef.current?.focus(); setActionsOpen(false); }} type="button"><FiType />Text</button>
          <button onClick={() => photoInput.current?.click()} type="button"><FiCamera />Photo</button>
          <button onClick={() => voiceInput.current?.click()} type="button"><FiMic />Voice</button>
          <button onClick={() => { onAddPlace(); setActionsOpen(false); }} type="button"><FiMapPin />Place</button>
        </div>
      ) : null}
      <button aria-label="Add story block" className={`seen-chapter-editor-add ${actionsOpen ? "is-open" : ""}`} disabled={busy} onClick={() => setActionsOpen((open) => !open)} type="button"><FiPlus /></button>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            setActionsOpen(false);
            onMediaUpload("IMAGE", file);
          }
        }}
        ref={photoInput}
        type="file"
      />
      <input
        accept="audio/mpeg,audio/wav,audio/aac,audio/flac,audio/webm,audio/ogg,audio/mp4,audio/x-m4a"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            setActionsOpen(false);
            onMediaUpload("VOICE", file);
          }
        }}
        ref={voiceInput}
        type="file"
      />
      <p className="sr-only">{chapter?.title || "Chapter name"}</p>
    </section>
  );
}

export default function SeenComposerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const replyToSeenId = id ? "" : searchParams.get("replyToSeenId") || "";
  const coverInput = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);
  const pendingCoverKind = useRef("IMAGE");
  const pendingVideoLimit = useRef(15);
  const [p, setP] = useState(() => ({ ...empty, replyToSeen: replyToSeenId || null }));
  const [replySeen, setReplySeen] = useState(null);
  const [series, setSeries] = useState("");
  const [newSeries, setNewSeries] = useState("");
  const [savedSeries, setSavedSeries] = useState(defaultSeries);
  const [introOpen, setIntroOpen] = useState(() => !localStorage.getItem("atseen_seen_intro_dismissed"));
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoToTrim, setVideoToTrim] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [chapterStory, setChapterStory] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterStatus, setChapterStatus] = useState("");

  const refresh = async (publicationId = id) => {
    const response = await api.getMyPublication(publicationId);
    const publication = response.data.data.publication;
    setP(publication);
    setSeries(seriesFromTags(publication.tags));
    dirty.current = false;
    return publication;
  };

  useEffect(() => {
    if (id) refresh().catch((requestError) => setError(publicationError(requestError)));
  }, [id]);

  useEffect(() => {
    if (!replyToSeenId) return undefined;
    let active = true;
    api.getPublicPublication(replyToSeenId)
      .then((response) => {
        if (active) setReplySeen(response.data.data.publication);
      })
      .catch(() => {
        if (active) setReplySeen(null);
      });
    return () => {
      active = false;
    };
  }, [replyToSeenId]);

  const change = (values) => {
    dirty.current = true;
    setStatus("Unsaved changes");
    setError("");
    setP((current) => ({ ...current, ...values }));
  };

  const ensure = async () => {
    if (p.id) return p;
    const response = await api.createPublicationDraft({
      kind: "SEEN",
      title: p.title,
      summary: p.summary || p.description,
      description: p.description,
      category: p.category,
      tags: tagsWithSeries(p.tags, series),
      replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
    });
    const publication = response.data.data.publication;
    setP(publication);
    history.replaceState({}, "", `/studio/seens/${publication.id}/edit`);
    return publication;
  };

  const save = async () => {
    if (busy.current) return null;
    busy.current = true;
    setStatus("Saving...");
    setError("");
    try {
      let publication = await ensure();
      publication = (await api.updatePublicationDraft(publication.id, {
        title: p.title,
        summary: p.summary || p.description,
        description: p.description,
        category: p.category,
        tags: tagsWithSeries(p.tags, series),
        replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
        statusVersion: publication.statusVersion,
      })).data.data.publication;
      setP(publication);
      dirty.current = false;
      setStatus("Saved");
      return publication;
    } catch (requestError) {
      setStatus("Save failed");
      setError(publicationError(requestError));
      return null;
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (!dirty.current || !p.id || uploading) return undefined;
    const timer = setTimeout(save, 1800);
    return () => clearTimeout(timer);
  }, [p, series, uploading]);

  const activeChapter = p.chapters.find((chapter) => chapter.stableChapterId === activeChapterId);

  useEffect(() => {
    if (!activeChapter) return;
    setChapterStory(chapterStoryText(activeChapter));
    setChapterStatus("");
    setError("");
  }, [activeChapterId]);

  useEffect(() => () => {
    if (videoToTrim?.url) URL.revokeObjectURL(videoToTrim.url);
  }, [videoToTrim?.url]);

  useEffect(() => () => {
    if (coverPreview?.url) URL.revokeObjectURL(coverPreview.url);
  }, [coverPreview?.url]);

  const uploadCoverFile = async (file, kind = pendingCoverKind.current) => {
    if (!file) return;
    try {
      const publication = dirty.current ? await save() : await ensure();
      if (!publication) return;
      setUploading(kind);
      setStatus("Uploading media...");
      await api.uploadMedia(publication.id, file, { purpose: "COVER", statusVersion: publication.statusVersion });
      await refresh(publication.id);
      setStatus("Media saved");
      setCoverPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return null;
      });
      setVideoToTrim((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return null;
      });
    } catch (requestError) {
      setStatus("Upload failed");
      setError(publicationError(requestError));
    } finally {
      setUploading("");
    }
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (pendingCoverKind.current === "VIDEO") {
      setError("");
      setVideoToTrim((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return { file, limitSeconds: pendingVideoLimit.current, url: URL.createObjectURL(file) };
      });
      return;
    }
    setCoverPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { kind: "IMAGE", url: URL.createObjectURL(file) };
    });
    await uploadCoverFile(file, "IMAGE");
  };

  const chooseMedia = (kind, limitSeconds = 15) => {
    pendingCoverKind.current = kind;
    pendingVideoLimit.current = limitSeconds;
    coverInput.current?.click();
  };

  const addChapter = async () => {
    if (p.chapters.length >= 3) {
      setError("Maximum three chapters.");
      return;
    }
    const publication = dirty.current ? await save() : await ensure();
    if (!publication) return;
    try {
      const title = p.chapters.length ? `Chapter ${p.chapters.length + 1}` : "Chapter name";
      await api.addChapter(publication.id, {
        title,
        blocks: [],
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      await refresh(publication.id);
      setStatus("Chapter added");
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const openChapterEditor = (chapter) => {
    setActiveChapterId(chapter.stableChapterId);
    setChapterStory(chapterStoryText(chapter));
    setChapterStatus("");
    setError("");
  };

  const changeChapterTitle = (chapterId, title) => {
    setP((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.stableChapterId === chapterId ? { ...chapter, title } : chapter,
      ),
    }));
    setStatus("Unsaved changes");
  };

  const saveChapterTitle = async (chapter) => {
    if (!p.id || !chapter?.stableChapterId || chapterSaving) return;
    const title = (chapter.title || "").trim() || "Chapter name";
    setChapterSaving(true);
    setStatus("Saving chapter...");
    setError("");
    try {
      await api.updateChapter(p.id, chapter.stableChapterId, {
        title,
        blocks: chapter.blocks || [],
        isPreview: true,
        releaseMode: chapter.releaseMode || "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setStatus("Chapter saved");
    } catch (requestError) {
      setStatus("Chapter save failed");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id) await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const saveChapterStory = async () => {
    if (!activeChapter || !p.id || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus("Saving chapter...");
    setError("");
    try {
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks: chapterBlocksWithStory(activeChapter, chapterStory),
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setActiveChapterId("");
      setChapterStatus("");
      setStatus("Chapter saved");
    } catch (requestError) {
      setChapterStatus("Chapter save failed");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id) await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const uploadChapterMedia = async (mediaType, file) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    const blockId = newBlockId();
    setChapterSaving(true);
    setChapterStatus(`Uploading ${mediaLabel({ type: mediaType }).toLowerCase()}...`);
    setError("");
    try {
      const uploaded = (await api.uploadMedia(p.id, file, {
        purpose: "BLOCK",
        mediaType,
        chapterId: activeChapter.stableChapterId,
        blockId,
      })).data.data;
      const storyBlocks = chapterBlocksWithStory(activeChapter, chapterStory);
      const blocks = [
        ...storyBlocks,
        { id: blockId, media: uploaded, order: storyBlocks.length, type: mediaType },
      ];
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus(`${mediaLabel({ type: mediaType })} added`);
    } catch (requestError) {
      setChapterStatus(`${mediaLabel({ type: mediaType })} upload failed`);
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id) await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const addPlaceBlock = async () => {
    if (!activeChapter || !p.id || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus("Adding place...");
    setError("");
    try {
      const storyBlocks = chapterBlocksWithStory(activeChapter, chapterStory);
      const blocks = [
        ...storyBlocks,
        { id: newBlockId(), order: storyBlocks.length, text: "Place: Add where this happened", type: "KEY_POINT" },
      ];
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStory((current) => `${current.trim() ? `${current.trim()}\n\n` : ""}Place: Add where this happened`);
      setChapterStatus("Place added");
    } catch (requestError) {
      setChapterStatus("Place was not added");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id) await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const removeChapter = async (chapter) => {
    if (!p.id || !chapter?.stableChapterId) return;
    try {
      await api.deleteChapter(p.id, chapter.stableChapterId, p.statusVersion);
      await refresh(p.id);
      setStatus("Chapter removed");
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const submit = async () => {
    const publication = await save();
    if (!publication) return;
    const errors = seenCompleteness(publication);
    if (errors.length) {
      setError(errors.join(" \u00b7 "));
      return;
    }
    try {
      await api[publication.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](publication.id, publication.statusVersion);
      nav(`/studio/seens/${publication.id}`);
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const addNewSeries = () => {
    const value = newSeries.trim().slice(0, 24);
    if (!value) return;
    setSavedSeries((current) => [...new Set([...current, value])]);
    setSeries(value);
    setNewSeries("");
    dirty.current = true;
    setStatus("Unsaved changes");
  };

  if (p.id && !["DRAFT", "CHANGES_REQUESTED"].includes(p.status)) {
    return <p>This Seen is read-only while {p.status.replaceAll("_", " ")}.</p>;
  }

  const mediaPreview = coverPreview?.url || p.coverMedia?.secureUrl;
  const mediaKind = coverPreview?.kind || (p.coverMedia?.mediaType === "VIDEO" ? "VIDEO" : "IMAGE");
  const statusText = statusLabel(status, uploading);

  if (activeChapter) {
    return (
      <SeenChapterEditor
        busy={chapterSaving}
        chapter={activeChapter}
        error={error}
        onAddPlace={addPlaceBlock}
        onDone={saveChapterStory}
        onMediaUpload={uploadChapterMedia}
        onStoryChange={(value) => {
          setChapterStory(value);
          setChapterStatus(value.trim() ? "Unsaved chapter" : "");
        }}
        status={chapterStatus}
        story={chapterStory}
      />
    );
  }

  return (
    <section className="seen-compose-page">
      <header className="seen-compose-header">
        <button aria-label="Back" className="seen-compose-back" onClick={() => nav(-1)} type="button"><FiChevronLeft /></button>
        <div className="seen-compose-heading">
          <h1>New Seen</h1>
          {introOpen ? (
            <p>
              <span>Seen {"\u2014"} a post made of chapters. People walk it like a small story.</span>
              <button
                aria-label="Dismiss Seen intro"
                onClick={() => {
                  localStorage.setItem("atseen_seen_intro_dismissed", "1");
                  setIntroOpen(false);
                }}
                type="button"
              >
                <FiX />
              </button>
            </p>
          ) : null}
        </div>
        <button className="seen-compose-save" onClick={save} type="button"><FiSave aria-hidden="true" />Save for later</button>
      </header>

      <div className="seen-compose-body">
        {mediaPreview ? (
          <div className="seen-compose-cover">
            {mediaKind === "VIDEO" ? <video controls preload="metadata" src={mediaPreview} /> : <img alt="Seen cover" src={mediaPreview} />}
            <button aria-label="Remove selected cover" onClick={() => change({ coverMedia: null })} type="button"><FiX /></button>
            {uploading ? <em>Uploading...</em> : mediaKind === "VIDEO" ? <span>Video</span> : null}
          </div>
        ) : (
          <div className="seen-compose-media-grid">
            <button onClick={() => chooseMedia("VIDEO", 15)} type="button"><FiZap /><b>Video {"\u00b7"} 0:15</b></button>
            <button onClick={() => chooseMedia("VIDEO", 30)} type="button"><FiFilm /><b>Video {"\u00b7"} 0:30</b></button>
            <button onClick={() => chooseMedia("IMAGE")} type="button"><FiImage /><b>Photo</b></button>
          </div>
        )}
        <input
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="sr-only"
          onChange={uploadCover}
          ref={coverInput}
          type="file"
        />
        {videoToTrim ? (
          <VideoTrimSheet
            file={videoToTrim}
            limitSeconds={videoToTrim.limitSeconds}
            onCancel={() => setVideoToTrim((current) => {
              if (current?.url) URL.revokeObjectURL(current.url);
              return null;
            })}
            onUpload={(file) => uploadCoverFile(file, "VIDEO")}
          />
        ) : null}

        <p className="seen-compose-counter"><FiEye aria-hidden="true" /><b>0</b> saw this {"\u2014"} the counter comes alive after you publish</p>
        {replyToSeenId ? <p className="seen-compose-reply-context">Replying to {replySeen?.title ? `\u201c${replySeen.title}\u201d` : "this Seen"}</p> : null}

        <label className="seen-compose-field seen-compose-title">
          <span className="sr-only">Title</span>
          <input
            maxLength={120}
            onChange={(event) => change({ title: event.target.value })}
            placeholder={"Title \u2014 e.g. \u201c8-Week Transformation\u201d"}
            value={p.title}
          />
        </label>

        <label className="seen-compose-field">
          <span className="sr-only">Description</span>
          <textarea
            maxLength={300}
            onChange={(event) => change({ description: event.target.value, summary: event.target.value })}
            placeholder={"About this experience \u2014 what happens inside, honestly"}
            value={p.description || p.summary}
          />
        </label>

        <div aria-label="Seen category" className="seen-compose-chips" role="group">
          {categories.map((category) => (
            <button
              aria-pressed={p.category === category}
              className={p.category === category ? "is-selected" : ""}
              key={category}
              onClick={() => change({ category })}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="seen-compose-section-title">
          <span>CHAPTERS</span>
          <small>{p.chapters.length}/3 {"\u00b7"} like a post {"\u2014"} short</small>
        </div>

        <div className="seen-compose-chapters">
          {p.chapters.map((chapter, index) => (
            <div className="seen-compose-chapter" key={chapter.stableChapterId || index}>
              <span>{index + 1}</span>
              <div className="seen-compose-chapter-copy">
                {(() => {
                  const storyPreview = chapterStoryText(chapter);
                  return (
                    <>
                <input
                  aria-label={`Chapter ${index + 1} name`}
                  disabled={chapterSaving}
                  maxLength={120}
                  onBlur={() => saveChapterTitle(chapter)}
                  onChange={(event) => changeChapterTitle(chapter.stableChapterId, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="Chapter name"
                  value={chapter.title || ""}
                />
                      {storyPreview ? <p>{storyPreview}</p> : null}
                      <button onClick={() => openChapterEditor(chapter)} type="button">{storyPreview ? "Edit the story >" : "+ Write the story >"}</button>
                    </>
                  );
                })()}
              </div>
              <button aria-label={`Remove chapter ${index + 1}`} onClick={() => removeChapter(chapter)} type="button"><FiX /></button>
            </div>
          ))}
          {p.chapters.length < 3 ? (
            <button className="seen-compose-add-chapter" onClick={addChapter} type="button">
              <FiPlus aria-hidden="true" /> {p.chapters.length ? "Add chapter" : "Chapter 1 - where it starts"}
            </button>
          ) : null}
        </div>

        <div className="seen-compose-section-title seen-compose-series-title">
          <span>SERIES</span>
          <small>{"\u00b7"} optional</small>
        </div>
        <div className="seen-compose-series">
          {savedSeries.map((item) => (
            <button
              className={series === item ? "is-selected" : ""}
              key={item}
              onClick={() => {
                setSeries((current) => current === item ? "" : item);
                dirty.current = true;
                setStatus("Unsaved changes");
              }}
              type="button"
            >
              {item}
            </button>
          ))}
          <label>
            <span className="sr-only">New series</span>
            <input
              onChange={(event) => setNewSeries(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addNewSeries();
                }
              }}
              placeholder={"+ New series..."}
              value={newSeries}
            />
          </label>
        </div>
        <p className="seen-compose-series-help">Parts of a series live together on your profile {"\u2014"} people watch them like episodes</p>

        {error ? <p className="seen-compose-error" role="alert">{error}</p> : null}
        {statusText ? <p className="seen-compose-status" role="status">{statusText}</p> : null}

        <button className="seen-compose-publish" disabled={Boolean(uploading)} onClick={submit} type="button">Publish</button>
      </div>
    </section>
  );
}
