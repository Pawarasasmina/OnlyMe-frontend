/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicationService as api } from "../../services/publicationService";
import {
  BLOCK_TYPES,
  chapterTextCount,
  normalizeTags,
  publicationError,
} from "../../utils/publicationValidation";
import {
  WORLD_CONFIG,
  worldCompletenessBySection,
} from "../../utils/worldValidation";
import PricingSelector from "./PricingSelector";
import PlanetAppearanceSelector from "./PlanetAppearanceSelector";
import PreviewChapterSelector from "./PreviewChapterSelector";

const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "VOICE"];
// Voice supports both live recording and audio-file upload. Keep AUDIO readable
// for older drafts, but do not offer it when adding a new chapter block.
const ADDABLE_BLOCK_TYPES = BLOCK_TYPES.filter((type) => type !== "AUDIO");
const emptyBlock = (type, order) => ({
  id: crypto.randomUUID(),
  type,
  order,
  ...(MEDIA_TYPES.includes(type)
    ? {}
    : type === "LINK"
      ? { url: "", label: "" }
      : { text: "" }),
});

const VOICE_RECORDING_LIMIT_SECONDS = 5 * 60;

const formatRecordingTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function VoiceRecorder({ block, busy, onRemove, onUpload }) {
  const input = useRef(null);
  const recorder = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState(null);
  const [recordingError, setRecordingError] = useState("");

  const releaseStream = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };

  const clearPreview = () => {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  useEffect(
    () => () => {
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      releaseStream();
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview?.url],
  );

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        if (current >= VOICE_RECORDING_LIMIT_SECONDS - 1) {
          recorder.current?.stop();
          return VOICE_RECORDING_LIMIT_SECONDS;
        }
        return current + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Live recording is not supported by this browser. You can upload a voice file instead.");
      return;
    }
    try {
      clearPreview();
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const nextRecorder = new MediaRecorder(
        stream.current,
        mimeType ? { mimeType } : undefined,
      );
      chunks.current = [];
      nextRecorder.ondataavailable = ({ data }) => {
        if (data.size) chunks.current.push(data);
      };
      nextRecorder.onstop = () => {
        const type = nextRecorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        const extension = type.includes("ogg") ? "ogg" : type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${extension}`, {
          type: type.split(";")[0],
        });
        setPreview({ file, url: URL.createObjectURL(blob) });
        setIsRecording(false);
        releaseStream();
      };
      nextRecorder.onerror = () => {
        setRecordingError("The recording stopped unexpectedly. Please try again.");
        setIsRecording(false);
        releaseStream();
      };
      recorder.current = nextRecorder;
      setElapsed(0);
      setIsRecording(true);
      nextRecorder.start(250);
    } catch (error) {
      releaseStream();
      setRecordingError(
        error?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow microphone access or upload a voice file."
          : "The microphone could not be started. Please try again or upload a file.",
      );
    }
  };

  useEffect(() => {
    if (block.media?.assetId) clearPreview();
  }, [block.media?.assetId]);

  return (
    <div className="chapter-media-editor chapter-voice-recorder mt-3">
      <div className={`voice-recording-panel${isRecording ? " is-recording" : ""}`}>
        <div className="voice-recording-status">
          <span className="voice-recording-icon" aria-hidden="true">{isRecording ? "●" : "MIC"}</span>
          <div>
            <strong>{isRecording ? "Recording voice" : "Record your voice"}</strong>
            <small>{isRecording ? `${formatRecordingTime(elapsed)} / 05:00` : "Record, listen to the preview, then save it."}</small>
          </div>
        </div>

        {isRecording ? (
          <button className="voice-action voice-action-stop" onClick={() => recorder.current?.stop()} type="button">Stop recording</button>
        ) : (
          <button className="voice-action voice-action-primary" disabled={busy} onClick={startRecording} type="button">Start recording</button>
        )}
      </div>

      {preview ? (
        <div className="voice-preview-panel">
          <div><strong>Recording preview</strong><small>Listen before adding it to this chapter.</small></div>
          <audio controls preload="metadata" src={preview.url} />
          <div className="voice-preview-actions">
            <button className="voice-action" disabled={busy} onClick={startRecording} type="button">Retake</button>
            <button className="voice-action voice-action-primary" disabled={busy} onClick={() => onUpload(preview.file)} type="button">{busy ? "Uploading..." : "Use recording"}</button>
          </div>
        </div>
      ) : block.media?.secureUrl ? (
        <div className="voice-preview-panel">
          <div><strong>Saved voice</strong><small>Your uploaded voice is ready to play.</small></div>
          <audio controls preload="metadata" src={block.media.secureUrl} />
          <div className="chapter-media-meta">
            <span>{block.media.format?.toUpperCase() || "VOICE"}</span>
            {block.media.duration ? <span>{Math.round(block.media.duration)} sec</span> : null}
          </div>
        </div>
      ) : null}

      {recordingError ? <p className="voice-recording-error" role="alert">{recordingError}</p> : null}
      <div className="voice-upload-row">
        <span>Or choose an existing recording</span>
        <button className="voice-action" disabled={busy || isRecording} onClick={() => input.current?.click()} type="button">Upload voice file</button>
        {(block.media || preview) ? <button className="voice-action voice-action-danger" disabled={busy || isRecording} onClick={() => { clearPreview(); onRemove(); }} type="button">Remove</button> : null}
      </div>
      <input accept="audio/mpeg,audio/wav,audio/aac,audio/flac,audio/webm,audio/ogg,audio/mp4,audio/x-m4a" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) { clearPreview(); onUpload(file); } event.target.value = ""; }} ref={input} type="file" />
    </div>
  );
}

function MediaPreview({ block, busy, onRemove, onUpload }) {
  const input = useRef(null);
  const media = block.media;
  const accept =
    block.type === "IMAGE"
      ? "image/jpeg,image/png,image/webp"
      : block.type === "VIDEO"
        ? "video/mp4,video/quicktime"
        : "audio/mpeg,audio/wav,audio/aac,audio/flac,audio/webm,audio/ogg,audio/mp4,audio/x-m4a";
  return (
    <div className="chapter-media-editor mt-3">
      {media?.secureUrl ? (
        <div className="chapter-media-preview">
          {block.type === "IMAGE" ? (
            <img alt="Uploaded chapter preview" src={media.secureUrl} />
          ) : block.type === "VIDEO" ? (
            <video controls preload="metadata" src={media.secureUrl} />
          ) : (
            <audio controls preload="metadata" src={media.secureUrl} />
          )}
          <div className="chapter-media-meta">
            <span>{media.format?.toUpperCase() || block.type}</span>
            {media.bytes ? (
              <span>{(media.bytes / 1024 / 1024).toFixed(1)} MB</span>
            ) : null}
            {media.duration ? (
              <span>{Math.round(media.duration)} sec</span>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          className="chapter-upload-empty"
          disabled={busy}
          onClick={() => input.current?.click()}
          type="button"
        >
          <span>
            {block.type === "IMAGE"
              ? "🖼️"
              : block.type === "VIDEO"
                ? "🎬"
                : "🎙️"}
          </span>
          <strong>Add {block.type.toLowerCase()}</strong>
          <small>The uploaded file will appear here before you submit.</small>
        </button>
      )}
      <input
        accept={accept}
        className="sr-only"
        onChange={(event) =>
          event.target.files?.[0] && onUpload(event.target.files[0])
        }
        ref={input}
        type="file"
      />
      {media ? (
        <div className="mt-3 flex gap-2">
          <button
            className="rounded-full border border-atseen-line px-3 py-2 text-xs"
            onClick={() => input.current?.click()}
            type="button"
          >
            {busy ? "Uploading..." : "Replace"}
          </button>
          <button
            className="rounded-full border border-red-300/20 px-3 py-2 text-xs text-red-300"
            onClick={onRemove}
            type="button"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FanWorldPreview({ publication, onClose }) {
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState(0);
  const chapters = publication.chapters || [];
  const chapter = chapters[active];
  const locked = chapter && !chapter.isPreview;

  const previewBlock = (block) => {
    if (["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(block.type))
      return (
        <p className="whitespace-pre-wrap text-sm leading-6 text-white/85">
          {block.text || "Empty text block"}
        </p>
      );
    if (block.type === "LINK")
      return (
        <span className="inline-flex rounded-full border border-atseen-blue/30 px-4 py-2 text-sm font-bold text-atseen-blue">
          {block.label || block.url || "Link"}
        </span>
      );
    if (!block.media?.secureUrl)
      return <p className="text-sm text-atseen-muted">Media not added yet</p>;
    if (block.type === "IMAGE")
      return (
        <img
          alt="Chapter preview"
          className="w-full rounded-2xl"
          src={block.media.secureUrl}
        />
      );
    if (block.type === "VIDEO")
      return (
        <video
          className="w-full rounded-2xl"
          controls
          src={block.media.secureUrl}
        />
      );
    return <audio className="w-full" controls src={block.media.secureUrl} />;
  };

  return (
    <div
      aria-label="Fan preview"
      aria-modal="true"
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#03070c]/95 p-4 backdrop-blur-md sm:p-8"
      role="dialog"
    >
      <div className="mx-auto max-w-3xl">
        <header className="sticky top-0 z-10 mb-5 flex items-center justify-between rounded-2xl border border-atseen-line bg-atseen-surface/95 px-4 py-3 shadow-xl backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-atseen-blue">
              Preview as fan
            </p>
            <p className="text-xs text-atseen-muted">
              Draft preview only · purchases are disabled
            </p>
          </div>
          <button
            className="rounded-full border border-atseen-line px-4 py-2 text-xs font-bold"
            onClick={onClose}
            type="button"
          >
            Close preview
          </button>
        </header>

        {!entered ? (
          <section className="grid min-h-[70vh] place-items-center overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(91,155,230,.16),transparent_48%)] p-8 text-center shadow-2xl">
            <div>
              <span className="text-7xl drop-shadow-[0_0_28px_rgba(110,170,240,.35)]">
                {publication.planet?.emoji || "🪐"}
              </span>
              <h1 className="mt-7 text-4xl font-black">
                {publication.title || "Untitled world"}
              </h1>
              <p className="mt-2 text-sm text-atseen-muted">
                This is how your planet entrance appears to fans.
              </p>
              <button
                className="mt-8 min-h-12 rounded-full border border-atseen-blue/50 px-8 text-sm font-black text-atseen-blue"
                onClick={() => setEntered(true)}
                type="button"
              >
                Step inside
              </button>
            </div>
          </section>
        ) : (
          <main className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-8">
            <div className="flex items-center gap-3 border-b border-atseen-line pb-4">
              <button
                aria-label="Back to planet entrance"
                className="grid h-10 w-10 place-items-center rounded-full border border-atseen-line"
                onClick={() => setEntered(false)}
                type="button"
              >
                ←
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-atseen-muted">
                  Chapter {chapters.length ? active + 1 : 0} of {chapters.length}
                </p>
                <h2 className="truncate text-xl font-black">
                  {chapter?.title || "No chapters added"}
                </h2>
              </div>
              <span className="text-3xl">{publication.planet?.emoji || "🪐"}</span>
            </div>

            {chapters.length ? (
              <div className="mt-4 flex gap-1">
                {chapters.map((item, index) => (
                  <span
                    className={`h-1 flex-1 rounded-full ${index <= active ? "bg-atseen-blue" : "bg-white/10"}`}
                    key={item.stableChapterId}
                  />
                ))}
              </div>
            ) : null}

            {active === 0 && publication.coverMedia?.secureUrl ? (
              <img
                alt="World cover"
                className="mt-6 aspect-video w-full rounded-3xl object-cover"
                src={publication.coverMedia.secureUrl}
              />
            ) : null}
            {active === 0 && publication.summary ? (
              <p className="mt-5 text-sm leading-6 text-atseen-muted">
                {publication.summary}
              </p>
            ) : null}

            {locked ? (
              <section className="mt-8 rounded-3xl border border-atseen-line bg-atseen-surface p-8 text-center">
                <span className="text-3xl">🔒</span>
                <h3 className="mt-4 font-black">{chapter.title}</h3>
                <p className="mt-2 text-sm text-atseen-muted">
                  Fans must unlock this world to continue the journey.
                </p>
                <span className="mt-5 inline-flex rounded-full bg-atseen-blue px-6 py-3 text-sm font-black text-atseen-bg">
                  {publication.kind === "PREMIUM_WORLD" ? "Join" : "Unlock once"} · ✦
                  {publication.pricing?.starsAmount || 0}
                </span>
              </section>
            ) : chapter ? (
              <section className="mt-8 space-y-5">
                {chapter.blocks.map((block) => (
                  <div key={block.id}>{previewBlock(block)}</div>
                ))}
              </section>
            ) : (
              <p className="mt-10 text-center text-sm text-atseen-muted">
                Add a chapter to preview the fan journey.
              </p>
            )}

            {chapters.length ? (
              <nav className="mt-10 flex gap-3 border-t border-atseen-line pt-5">
                <button
                  className="rounded-full border border-atseen-line px-4 py-3 disabled:invisible"
                  disabled={active === 0}
                  onClick={() => setActive((current) => current - 1)}
                  type="button"
                >
                  ← Back
                </button>
                <button
                  className="min-h-12 flex-1 rounded-2xl bg-atseen-blue px-5 text-sm font-black text-atseen-bg disabled:opacity-40"
                  disabled={active === chapters.length - 1}
                  onClick={() => setActive((current) => current + 1)}
                  type="button"
                >
                  Next chapter →
                </button>
              </nav>
            ) : null}
          </main>
        )}
      </div>
    </div>
  );
}

export default function PublicationComposerShell({ kind }) {
  const { id } = useParams();
  const nav = useNavigate();
  const cfg = WORLD_CONFIG[kind];
  const [p, setP] = useState({
    kind,
    title: "",
    summary: "",
    description: "",
    category: "",
    tags: [],
    planet: {
      emoji: kind === "PREMIUM_WORLD" ? "💠" : "🪐",
      accent: kind === "PREMIUM_WORLD" ? "ice-white" : "ice-blue",
    },
    pricing: {
      mode: cfg.pricingMode,
      starsAmount: cfg.defaultPrice,
      presetId: kind === "PREMIUM_WORLD" ? "MONTHLY_90" : null,
    },
    chapters: [],
  });
  const [active, setActive] = useState(0);
  const [saveState, setSaveState] = useState("Draft saved");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const [fanPreviewOpen, setFanPreviewOpen] = useState(false);
  const [cancelingRevision, setCancelingRevision] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const busy = useRef(false);
  const dirty = useRef(false);
  const editRevision = useRef(0);
  const conflictRetries = useRef(0);
  const refresh = async (publicationId = id, applyToEditor = true) => {
    const response = await api.getMyPublication(publicationId);
    if (applyToEditor) {
      setP(response.data.data.publication);
      dirty.current = false;
    }
    return response.data.data.publication;
  };
  useEffect(() => {
    if (id)
      refresh().catch((requestError) =>
        setError(publicationError(requestError)),
      );
  }, [id]);
  const ensure = async () => {
    if (p.id) return p;
    const response = await api.createPublicationDraft({
      kind,
      title: p.title,
      summary: p.summary,
      description: p.description,
      category: p.category,
      tags: normalizeTags(p.tags),
      planet: { emoji: p.planet.emoji, accent: p.planet.accent },
      pricing: p.pricing,
    });
    const publication = response.data.data.publication;
    setP(publication);
    history.replaceState({}, "", `/studio/worlds/${publication.id}/edit`);
    return publication;
  };
  const save = async () => {
    if (busy.current) return null;
    const snapshot = p;
    const startedRevision = editRevision.current;
    if (
      snapshot.chapters.some((item) =>
        item.blocks.some(
          (block) => MEDIA_TYPES.includes(block.type) && !block.media?.assetId,
        ),
      )
    ) {
      setSaveState("Media required");
      setError(
        "Choose a file for every media block, or delete the empty media block before saving.",
      );
      return null;
    }
    busy.current = true;
    setSaveState("Saving…");
    try {
      let publication = await ensure();
      publication = (
        await api.updatePublicationDraft(publication.id, {
          title: snapshot.title,
          summary: snapshot.summary,
          description: snapshot.description,
          category: snapshot.category,
          tags: normalizeTags(snapshot.tags),
          planet: {
            emoji: snapshot.planet?.emoji || "",
            accent: snapshot.planet?.accent || "",
          },
          pricing: snapshot.pricing,
          statusVersion: publication.statusVersion,
        })
      ).data.data.publication;
      for (const chapter of snapshot.chapters) {
        await api.updateChapter(publication.id, chapter.stableChapterId, {
          title: chapter.title || "Untitled",
          blocks: chapter.blocks,
          isPreview: Boolean(chapter.isPreview),
          releaseMode: "IMMEDIATE",
          statusVersion: publication.statusVersion,
        });
        publication = await refresh(publication.id, false);
      }
      const hasNewerEdits = editRevision.current !== startedRevision;
      dirty.current = hasNewerEdits;
      setP((current) =>
        hasNewerEdits
          ? { ...current, id: publication.id, statusVersion: publication.statusVersion }
          : publication,
      );
      setSaveState(
        hasNewerEdits ? "Newer changes waiting to save…" : "Saved",
      );
      conflictRetries.current = 0;
      setError("");
      return publication;
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        conflictRetries.current += 1;
        const latest = await refresh(snapshot.id, false).catch(() => null);
        if (latest) {
          dirty.current = true;
          setP((current) => ({
            ...current,
            statusVersion: latest.statusVersion,
          }));
          setSaveState("Changes queued with the latest version…");
          if (conflictRetries.current < 3) setError("");
          else
            setError(
              "Autosave could not synchronize after several attempts. Your local changes are still preserved; pause editing and try Save draft again.",
            );
        } else {
          setSaveState("Save paused");
          setError(
            "Unable to refresh the latest draft version. Your local changes are still preserved.",
          );
        }
      } else {
        setSaveState("Save failed");
        setError(publicationError(requestError));
      }
      return null;
    } finally {
      busy.current = false;
    }
  };
  const hasPendingMedia = p.chapters.some((item) =>
    item.blocks.some(
      (block) => MEDIA_TYPES.includes(block.type) && !block.media?.assetId,
    ),
  );
  useEffect(() => {
    if (!dirty.current || !p.id || uploading || hasPendingMedia) return;
    const timer = setTimeout(save, 2500);
    return () => clearTimeout(timer);
  }, [p, uploading, hasPendingMedia]);
  const change = (values) => {
    editRevision.current += 1;
    dirty.current = true;
    setSaveState("Unsaved changes · autosaving after you pause");
    setP((current) => ({ ...current, ...values }));
  };
  const waitUntilIdle = async () => {
    while (busy.current)
      await new Promise((resolve) => setTimeout(resolve, 80));
  };
  const addChapter = async () => {
    if (p.chapters.length >= cfg.max)
      return setError(`Maximum ${cfg.max} chapters.`);
    if (hasPendingMedia)
      return setError(
        "Upload or remove the empty media block before adding another chapter.",
      );
    setSaveState("Preparing new chapter…");
    try {
      await waitUntilIdle();
      if (dirty.current && p.id) {
        const saved = await save();
        if (!saved) return;
      }
      const publication = p.id
        ? (await api.getMyPublication(p.id)).data.data.publication
        : await ensure();
      await api.addChapter(publication.id, {
        title: `Chapter ${publication.chapters.length + 1}`,
        blocks: [],
        isPreview: publication.chapters.length === 0,
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      const next = await refresh(publication.id);
      setActive(next.chapters.length - 1);
      setSaveState("New chapter added · draft saved");
    } catch (requestError) {
      setSaveState("Could not add chapter");
      setError(publicationError(requestError));
    }
  };
  const chapter = p.chapters[active];
  const update = (next) =>
    change({
      chapters: p.chapters.map((item, index) =>
        index === active ? next : item,
      ),
    });
  const removeChapter = async () => {
    if (!confirm(`Delete ${chapter.title}?`)) return;
    if (hasPendingMedia)
      return setError(
        "Upload or remove the empty media block before deleting a chapter.",
      );
    setSaveState("Deleting chapter…");
    try {
      await waitUntilIdle();
      if (dirty.current) {
        const saved = await save();
        if (!saved) return;
      }
      const latest = (await api.getMyPublication(p.id)).data.data.publication;
      await api.deleteChapter(
        p.id,
        chapter.stableChapterId,
        latest.statusVersion,
      );
      await refresh();
      setActive(0);
      setSaveState("Chapter deleted · draft saved");
    } catch (requestError) {
      setSaveState("Could not delete chapter");
      setError(publicationError(requestError));
    }
  };
  const move = async (delta) => {
    const target = active + delta;
    if (target < 0 || target >= p.chapters.length) return;
    if (hasPendingMedia)
      return setError(
        "Upload or remove the empty media block before moving chapters.",
      );
    setSaveState("Moving chapter…");
    try {
      await waitUntilIdle();
      if (dirty.current) {
        const saved = await save();
        if (!saved) return;
      }
      const latest = (await api.getMyPublication(p.id)).data.data.publication;
      const currentIndex = latest.chapters.findIndex(
          (item) => item.stableChapterId === chapter.stableChapterId,
        ),
        destination = currentIndex + delta;
      if (destination < 0 || destination >= latest.chapters.length) return;
      const next = [...latest.chapters];
      [next[currentIndex], next[destination]] = [
        next[destination],
        next[currentIndex],
      ];
      await api.reorderChapters(
        p.id,
        next.map((item) => item.stableChapterId),
        latest.statusVersion,
      );
      await refresh();
      setActive(destination);
      setSaveState("Chapter moved · draft saved");
    } catch (requestError) {
      setSaveState("Could not move chapter");
      setError(publicationError(requestError));
    }
  };
  const uploadBlock = async (block, file) => {
    if (busy.current) {
      setError(
        "A save is finishing. Wait a moment, then choose the file again.",
      );
      return;
    }
    busy.current = true;
    setUploading(block.id);
    setSaveState("Uploading media…");
    setError("");
    try {
      const targetChapterId = chapter.stableChapterId;
      const draft = await ensure();
      let server = (await api.getMyPublication(draft.id)).data.data.publication;
      server = (
        await api.updatePublicationDraft(server.id, {
          title: p.title,
          summary: p.summary,
          description: p.description,
          category: p.category,
          tags: normalizeTags(p.tags),
          planet: {
            emoji: p.planet?.emoji || "",
            accent: p.planet?.accent || "",
          },
          pricing: p.pricing,
          statusVersion: server.statusVersion,
        })
      ).data.data.publication;
      const uploaded = (
        await api.uploadMedia(server.id, file, {
          purpose: "BLOCK",
          mediaType: block.type,
          chapterId: targetChapterId,
          blockId: block.id,
        })
      ).data.data;
      const targetChapter = p.chapters.find(
        (item) => item.stableChapterId === targetChapterId,
      );
      const updatedTarget = {
        ...targetChapter,
        blocks: targetChapter.blocks.map((candidate) =>
          candidate.id === block.id
            ? { ...candidate, media: uploaded }
            : candidate,
        ),
      };
      await api.updateChapter(server.id, targetChapterId, {
        title: updatedTarget.title || "Untitled",
        blocks: updatedTarget.blocks,
        isPreview: Boolean(updatedTarget.isPreview),
        releaseMode: "IMMEDIATE",
        statusVersion: server.statusVersion,
      });
      server = (await api.getMyPublication(server.id)).data.data.publication;
      const savedTarget =
        server.chapters.find(
          (item) => item.stableChapterId === targetChapterId,
        ) || updatedTarget;
      const chapters = p.chapters.map((item) =>
        item.stableChapterId === targetChapterId ? savedTarget : item,
      );
      const comparable = (item) =>
        JSON.stringify({
          title: item.title || "Untitled",
          blocks: item.blocks,
          isPreview: Boolean(item.isPreview),
        });
      const hasOtherChanges = chapters.some(
        (item) =>
          item.stableChapterId !== targetChapterId &&
          comparable(item) !==
            comparable(
              server.chapters.find(
                (candidate) =>
                  candidate.stableChapterId === item.stableChapterId,
              ) || item,
            ),
      );
      setP({ ...p, ...server, chapters });
      dirty.current = hasOtherChanges;
      setSaveState(
        hasOtherChanges ? "Media saved - other changes pending" : "Media saved",
      );
    } catch (requestError) {
      setSaveState("Upload not saved");
      setError(publicationError(requestError));
    } finally {
      busy.current = false;
      setUploading("");
    }
  };
  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const publication = await ensure();
      await api.uploadMedia(publication.id, file, {
        purpose: "COVER",
        statusVersion: publication.statusVersion,
      });
      await refresh(publication.id);
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };
  const submit = async () => {
    const publication = await save();
    if (!publication) return;
    const errors = worldCompletenessBySection(publication);
    setShowValidation(true);
    if (Object.values(errors).some((items) => items.length)) {
      setError("");
      return;
    }
    if (!confirm(`Submit ${cfg.label} for moderation?`)) return;
    try {
      await api[
        publication.status === "CHANGES_REQUESTED"
          ? "resubmitPublication"
          : "submitPublication"
      ](publication.id, publication.statusVersion);
      nav(`/studio/worlds/${publication.id}`);
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };
  const cancelRevision = async () => {
    if (busy.current || uploading) {
      setError("Wait for the current save or upload to finish before canceling.");
      return;
    }
    if (!confirm("Discard every change in this revision and keep the currently published planet? This cannot be undone.")) return;
    setCancelingRevision(true);
    setError("");
    dirty.current = false;
    try {
      await api.cancelPublishedRevision(p.id, p.statusVersion);
      nav("/profile");
    } catch (requestError) {
      dirty.current = true;
      setError(publicationError(requestError));
      setCancelingRevision(false);
    }
  };
  const validation = showValidation
    ? worldCompletenessBySection(p)
    : {
        general: [],
        details: [],
        cover: [],
        chapters: [],
        preview: [],
        pricing: [],
      };
  const ValidationMessages = ({ messages }) =>
    messages.length ? (
      <ul
        className="mt-3 space-y-1 text-xs font-semibold text-red-300"
        role="alert"
      >
        {messages.map((message) => (
          <li key={message}>• {message}</li>
        ))}
      </ul>
    ) : null;
  if (p.id && !["DRAFT", "CHANGES_REQUESTED"].includes(p.status))
    return (
      <p>
        This {cfg.label} is read-only while{" "}
        {p.status.replaceAll("_", " ").toLowerCase()}.
      </p>
    );
  return (
    <div className="space-y-5 pb-24">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-atseen-blue">
            {kind === "PREMIUM_WORLD" ? "Premium planet" : "Planet"}
          </p>
          <h1 className="text-3xl font-black">{cfg.label} composer</h1>
          <p aria-live="polite" className="text-xs text-atseen-muted">
            {uploading ? "Uploading chapter media…" : saveState}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-atseen-blue/40 px-4 py-2 font-bold text-atseen-blue"
            onClick={() => setFanPreviewOpen(true)}
            type="button"
          >
            Preview as fan
          </button>
          <button
            className="rounded-full bg-atseen-blue px-4 py-2 font-bold text-atseen-bg"
            onClick={save}
            type="button"
          >
            Save draft
          </button>
        </div>
      </header>
      {fanPreviewOpen ? (
        <FanWorldPreview
          onClose={() => setFanPreviewOpen(false)}
          publication={p}
        />
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-400/10 p-4 text-red-200" role="alert">
          {error}
        </p>
      ) : null}
      <ValidationMessages messages={validation.general} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-atseen-line p-5">
          <h2 className="font-black">Publication details</h2>
          {[
            ["title", 120],
            ["summary", 300],
            ["description", 2000],
            ["category", 40],
          ].map(([field, max]) => (
            <label className="block" key={field}>
              {field}
              <textarea
                className="mt-1 w-full rounded-xl border border-atseen-line bg-atseen-bg p-3"
                maxLength={max}
                onChange={(event) => change({ [field]: event.target.value })}
                value={p[field]}
              />
              <small>
                {p[field].length}/{max}
              </small>
            </label>
          ))}
          <label>
            Tags
            <input
              className="w-full rounded-xl border border-atseen-line bg-atseen-bg p-3"
              onChange={(event) =>
                change({ tags: event.target.value.split(",") })
              }
              value={p.tags.join(", ")}
            />
          </label>
          <ValidationMessages messages={validation.details} />
        </section>
        <div className="space-y-5">
          <section className="rounded-2xl border border-atseen-line p-5">
            <PlanetAppearanceSelector
              kind={kind}
              onChange={(planet) => change({ planet })}
              planet={p.planet}
            />
          </section>
          <section className="rounded-2xl border border-atseen-line p-5">
            <PricingSelector
              kind={kind}
              onChange={(pricing) => change({ pricing })}
              pricing={p.pricing}
            />
            <ValidationMessages messages={validation.pricing} />
          </section>
          <section className="rounded-2xl border border-atseen-line p-5">
            <h2 className="font-black">Verified cover</h2>
            {p.coverMedia?.secureUrl ? (
              <img
                alt={`${cfg.label} cover`}
                className="my-3 aspect-video w-full rounded-2xl object-cover"
                src={p.coverMedia.secureUrl}
              />
            ) : null}
            <input
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadCover}
              type="file"
            />
            <ValidationMessages messages={validation.cover} />
          </section>
        </div>
      </div>
      <section className="rounded-2xl border border-atseen-line p-5">
        <PreviewChapterSelector
          chapters={p.chapters}
          kind={kind}
          onChange={(chapters) => change({ chapters })}
        />
        <ValidationMessages messages={validation.preview} />
      </section>
      <nav className="flex flex-wrap gap-2">
        {p.chapters.map((item, index) => (
          <button
            className={index === active ? "text-atseen-blue" : ""}
            key={item.stableChapterId}
            onClick={() => setActive(index)}
          >
            {index + 1}. {item.title} {item.isPreview ? "Preview" : "🔒"}
          </button>
        ))}
        <button disabled={p.chapters.length >= cfg.max} onClick={addChapter}>
          + Add chapter
        </button>
      </nav>
      <ValidationMessages messages={validation.chapters} />
      {chapter ? (
        <section className="rounded-2xl border border-atseen-line p-5">
          <div className="flex flex-wrap gap-3">
            <button disabled={!active} onClick={() => move(-1)}>
              Move up
            </button>
            <button
              disabled={active === p.chapters.length - 1}
              onClick={() => move(1)}
            >
              Move down
            </button>
            <button className="text-red-300" onClick={removeChapter}>
              Delete chapter
            </button>
          </div>
          <input
            aria-label="Chapter title"
            className="mt-4 w-full border p-3"
            onChange={(event) =>
              update({ ...chapter, title: event.target.value })
            }
            value={chapter.title}
          />
          <p className="mt-2 text-xs text-atseen-muted">
            {chapterTextCount(chapter)}/2000 characters ·{" "}
            {chapter.isPreview ? "Free preview" : "Locked"}
          </p>
          {chapter.blocks.map((block) => (
            <article
              className="my-4 rounded-2xl border border-atseen-line bg-atseen-bg/50 p-4"
              key={block.id}
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs uppercase tracking-wider text-atseen-blue">
                  {block.type.replaceAll("_", " ")}
                </strong>
                <button
                  className="text-xs text-red-300"
                  onClick={() =>
                    update({
                      ...chapter,
                      blocks: chapter.blocks.filter(
                        (item) => item.id !== block.id,
                      ),
                    })
                  }
                >
                  Delete block
                </button>
              </div>
              {["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(block.type) ? (
                <textarea
                  className="mt-3 min-h-28 w-full border p-3"
                  onChange={(event) =>
                    update({
                      ...chapter,
                      blocks: chapter.blocks.map((item) =>
                        item.id === block.id
                          ? { ...item, text: event.target.value }
                          : item,
                      ),
                    })
                  }
                  value={block.text}
                />
              ) : block.type === "LINK" ? (
                <div>
                  <input
                    className="mt-3 w-full border p-3"
                    placeholder="https://"
                    onChange={(event) =>
                      update({
                        ...chapter,
                        blocks: chapter.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, url: event.target.value }
                            : item,
                        ),
                      })
                    }
                    value={block.url}
                  />
                  <input
                    className="mt-2 w-full border p-3"
                    placeholder="Link label"
                    onChange={(event) =>
                      update({
                        ...chapter,
                        blocks: chapter.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                    value={block.label}
                  />
                </div>
              ) : block.type === "VOICE" ? (
                  <VoiceRecorder
                    block={block}
                    busy={uploading === block.id}
                    onRemove={() =>
                      update({
                        ...chapter,
                        blocks: chapter.blocks.map((item) =>
                          item.id === block.id
                            ? { ...item, media: undefined }
                            : item,
                        ),
                      })
                    }
                    onUpload={(file) => uploadBlock(block, file)}
                  />
                ) : (
                <MediaPreview
                  block={block}
                  busy={uploading === block.id}
                  onRemove={() =>
                    update({
                      ...chapter,
                      blocks: chapter.blocks.map((item) =>
                        item.id === block.id
                          ? { ...item, media: undefined }
                          : item,
                      ),
                    })
                  }
                  onUpload={(file) => uploadBlock(block, file)}
                />
              )}
            </article>
          ))}
          <div className="flex flex-wrap gap-2">
            {ADDABLE_BLOCK_TYPES.map((type) => (
              <button
                key={type}
                onClick={() =>
                  update({
                    ...chapter,
                    blocks: [
                      ...chapter.blocks,
                      emptyBlock(type, chapter.blocks.length),
                    ],
                  })
                }
              >
                + {type.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="fixed bottom-16 right-4 z-20 flex flex-wrap justify-end gap-2">
        {p.status === "CHANGES_REQUESTED" && p.publishedVersion ? (
          <button
            className="rounded-full border border-red-300/35 bg-atseen-bg/95 px-5 py-3 text-sm font-black text-red-200 shadow-xl backdrop-blur"
            disabled={Boolean(uploading) || cancelingRevision}
            onClick={cancelRevision}
            type="button"
          >
            {cancelingRevision ? "Canceling…" : "Cancel revision"}
          </button>
        ) : null}
        <button
          className="rounded-full bg-atseen-blue px-6 py-3 font-black text-atseen-bg shadow-xl"
          disabled={Boolean(uploading) || cancelingRevision}
          onClick={submit}
          type="button"
        >
          {p.status === "CHANGES_REQUESTED" ? "Resubmit" : "Submit for review"}
        </button>
      </div>
    </div>
  );
}
