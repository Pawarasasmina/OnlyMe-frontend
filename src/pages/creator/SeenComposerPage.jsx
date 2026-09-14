/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCamera,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiEye,
  FiFilm,
  FiGlobe,
  FiGrid,
  FiImage,
  FiLink,
  FiList,
  FiMapPin,
  FiMic,
  FiPlus,
  FiSave,
  FiScissors,
  FiTag,
  FiTrash2,
  FiType,
  FiUpload,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";
import { searchService } from "../../services/searchService";
import EntityAttachmentPicker from "../../components/contentEntities/EntityAttachmentPicker";
import { normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";

const empty = { attachedEntities: [], entityRefs: [], kind: "SEEN", title: "", summary: "", description: "", category: "", series: null, seriesId: null, visibility: "PUBLIC", tags: [], chapters: [] };
const fallbackCategories = ["Places", "Moving", "Business", "Growth", "Lifestyle"];
const audienceOptions = [
  { icon: FiGlobe, label: "Everyone", value: "PUBLIC" },
  { description: "Only mutual friends", icon: FiUsers, label: "Friends", value: "FRIENDS" },
  { description: "Hidden from your profile and Seen", icon: FiLink, label: "Anyone with the link", value: "LINK_ONLY" },
];
const VIDEO_RECORDER_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
const VIDEO_RECORDING_PAD_MS = 350;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";

function statusLabel(status, uploading) {
  if (uploading) return "Uploading media...";
  if (status === "Saved") return "";
  return status;
}

const tagsWithoutSeries = (tags = []) => normalizeTags(tags).filter((tag) => !String(tag).startsWith("series:"));

function hasDraftContent(publication = {}) {
  return Boolean(
    publication.title?.trim()
      || publication.summary?.trim()
      || publication.description?.trim()
      || publication.category?.trim()
      || publication.attachedEntities?.length
      || normalizeTags(publication.tags).length
      || publication.seriesId
      || publication.series?.id
      || publication.coverMedia
      || publication.chapters?.length,
  );
}

function newBlockId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export function chapterStoryText(chapter = {}) {
  return (chapter.blocks || [])
    .filter((block) => block.type === "TEXT" && !block.metadata?.location)
    .map((block) => block.text || "")
    .join("\n\n");
}

export function chapterBlocksWithStory(chapter = {}, story = "") {
  const trimmed = story.trim();
  const source = chapter.blocks || [];
  const storyBlock = source.find(
    (block) => block.type === "TEXT" && !block.metadata?.location,
  );
  const preserved = source.filter(
    (block) => block.type !== "TEXT" || block.metadata?.location,
  );
  const blocks = trimmed
    ? [
        ...preserved,
        {
          id: storyBlock?.id || newBlockId(),
          order: storyBlock?.order ?? -1,
          text: trimmed,
          type: "TEXT",
        },
      ]
    : preserved;
  return blocks
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((block, order) => ({ ...block, order }));
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
  return (
    VIDEO_RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ||
    ""
  );
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

function readVideoDuration(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(Number(video.duration) || 0);
    video.onerror = () => reject(new Error("Unable to read this video."));
    video.src = url;
  });
}

export function VideoTrimSheet({ enableCrop = false, file, limitSeconds, onCancel, onUpload }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [aspect, setAspect] = useState("16:9");
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const maxStart = Math.max(0, duration - limitSeconds);
  const end = Math.min(duration, start + limitSeconds);
  const clipLength = Math.max(0, end - start);
  const canUploadOriginal = !enableCrop && duration > 0 && duration <= limitSeconds + 0.1;

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
      setError(
        `This browser cannot crop the video here. Try Chrome or upload a ${formatDuration(limitSeconds)} clip.`,
      );
      return;
    }
    if (duration > limitSeconds + 0.1 && clipLength < limitSeconds - 0.5) {
      setError(`Choose a video at least ${limitSeconds} seconds long.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      video.pause();
      video.muted = false;
      await seekVideo(video, start);
      const sourceStream = captureStream.call(video);
      let stream = sourceStream;
      let stopDrawing = null;
      if (enableCrop) {
        const [ratioWidth, ratioHeight] = aspect.split(":").map(Number);
        const ratio = ratioWidth / ratioHeight;
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        let cropWidth = sourceWidth;
        let cropHeight = cropWidth / ratio;
        if (cropHeight > sourceHeight) {
          cropHeight = sourceHeight;
          cropWidth = cropHeight * ratio;
        }
        cropWidth /= zoom;
        cropHeight /= zoom;
        const sourceX = (sourceWidth - cropWidth) * (positionX / 100);
        const sourceY = (sourceHeight - cropHeight) * (positionY / 100);
        const outputWidth = Math.min(1280, Math.max(2, Math.round(cropWidth / 2) * 2));
        const outputHeight = Math.max(2, Math.round((outputWidth / ratio) / 2) * 2);
        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext("2d", { alpha: false });
        let animationFrame = 0;
        const draw = () => {
          context.drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
          animationFrame = window.requestAnimationFrame(draw);
        };
        draw();
        stream = canvas.captureStream(30);
        sourceStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        stopDrawing = () => window.cancelAnimationFrame(animationFrame);
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      const stopped = new Promise((resolve, reject) => {
        recorder.ondataavailable = ({ data }) => {
          if (data.size) chunks.push(data);
        };
        recorder.onerror = () =>
          reject(new Error("The crop failed while recording."));
        recorder.onstop = resolve;
      });
      recorder.start(250);
      await video.play();
      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          Math.max(500, clipLength * 1000 - VIDEO_RECORDING_PAD_MS),
        ),
      );
      video.pause();
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      stopDrawing?.();
      stream.getTracks().forEach((track) => track.stop());
      if (stream !== sourceStream) sourceStream.getTracks().forEach((track) => track.stop());
      const type = mimeType.split(";")[0] || "video/webm";
      const blob = new Blob(chunks, { type });
      if (!blob.size) throw new Error("The cropped clip was empty.");
      const trimmed = new File(
        [blob],
        `seen-${limitSeconds}s-${Date.now()}.webm`,
        { type },
      );
      await onUpload(trimmed);
    } catch (trimError) {
      setError(
        trimError.message ||
          "Unable to crop this video. Please try another file.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div aria-modal="true" className="seen-video-trim-layer" role="dialog">
      <button
        aria-label="Close video crop"
        className="seen-video-trim-dim"
        disabled={busy}
        onClick={onCancel}
        type="button"
      />
      <section className="seen-video-trim-sheet">
        <div className="seen-video-trim-head">
          <span>
            <FiScissors aria-hidden="true" /> Crop video
          </span>
          <button
            aria-label="Close video crop"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <FiX />
          </button>
        </div>
        <div className={`seen-video-crop-preview ${enableCrop ? `aspect-${aspect.replace(":", "-")}` : "is-original"}`}><video
          controls
          onLoadedMetadata={(event) => {
            const nextDuration = Number(event.currentTarget.duration) || 0;
            setDuration(nextDuration);
            setStart(0);
            setError("");
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src={file.url}
            style={enableCrop ? { objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom})`, transformOrigin: `${positionX}% ${positionY}%` } : undefined}
        /></div>
        <div className="seen-video-trim-copy">
          <strong>{formatDuration(limitSeconds)} video</strong>
          <small>
            {duration
              ? `${formatDuration(start)} - ${formatDuration(end)} of ${formatDuration(duration)}`
              : "Loading video..."}
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
        {enableCrop ? <div className="seen-video-adjust-controls">
          <div className="seen-video-aspects" aria-label="Video crop ratio" role="group">{["16:9", "4:5", "1:1"].map((value) => <button className={aspect === value ? "is-selected" : ""} disabled={busy} key={value} onClick={() => setAspect(value)} type="button">{value}</button>)}</div>
          <label><span>Zoom</span><input disabled={busy} max="2" min="1" onChange={(event) => setZoom(Number(event.target.value))} step="0.05" type="range" value={zoom} /></label>
          <label><span>Horizontal</span><input disabled={busy} max="100" min="0" onChange={(event) => setPositionX(Number(event.target.value))} type="range" value={positionX} /></label>
          <label><span>Vertical</span><input disabled={busy} max="100" min="0" onChange={(event) => setPositionY(Number(event.target.value))} type="range" value={positionY} /></label>
        </div> : null}
        {error ? (
          <p className="seen-video-trim-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="seen-video-trim-actions">
          <button
            disabled={!duration || busy}
            onClick={previewClip}
            type="button"
          >
            Preview
          </button>
          <button
            disabled={!duration || busy}
            onClick={canUploadOriginal ? uploadOriginal : uploadTrimmed}
            type="button"
          >
            <FiUpload aria-hidden="true" />{" "}
            {busy ? "Preparing..." : canUploadOriginal ? `Upload ${formatDuration(duration)}` : enableCrop ? "Apply crop & upload" : `Trim & upload ${formatDuration(limitSeconds)}`}
          </button>
        </div>
      </section>
    </div>
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function SelectionSheet({ children, onClose, subtitle, title }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusables = [...(panelRef.current?.querySelectorAll("button:not(:disabled),input:not(:disabled)") || [])];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => panelRef.current?.querySelector("button,input")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div aria-modal="true" className="seen-settings-sheet-layer" role="dialog">
      <button aria-label={`Close ${title}`} className="seen-settings-sheet-dim" onClick={onClose} type="button" />
      <section className="seen-settings-sheet" ref={panelRef}>
        <span className="seen-settings-sheet-handle" aria-hidden="true" />
        <header>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
        {children}
      </section>
    </div>
  );
}

function SheetRow({ description = "", Icon, label, onClick, selected }) {
  return (
    <button className={`seen-settings-option ${selected ? "is-selected" : ""}`} onClick={onClick} type="button">
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span>
        <b>{label}</b>
        {description ? <small>{description}</small> : null}
      </span>
      {selected ? <FiCheck aria-hidden="true" /> : null}
    </button>
  );
}

function CategorySheet({ categories: categoryOptions, onClose, onSelect, value }) {
  return (
    <SelectionSheet onClose={onClose} title="Category">
      <div className="seen-settings-options">
        {categoryOptions.map((category) => (
          <SheetRow
            Icon={FiTag}
            key={category.id || category.name || category}
            label={category.name || category}
            onClick={() => onSelect(category.name || category)}
            selected={value === (category.name || category)}
          />
        ))}
      </div>
    </SelectionSheet>
  );
}

function AudienceSheet({ onClose, onSelect, value }) {
  return (
    <SelectionSheet onClose={onClose} title="Audience">
      <div className="seen-settings-options">
        {audienceOptions.map((option) => (
          <SheetRow
            Icon={option.icon}
            description={option.description}
            key={option.value}
            label={option.label}
            onClick={() => onSelect(option.value)}
            selected={value === option.value}
          />
        ))}
      </div>
    </SelectionSheet>
  );
}

function SeriesSheet({ creating, error, items, loading, newSeries, onClose, onCreate, onInput, onRemove, onSelect, selectedId }) {
  return (
    <SelectionSheet onClose={onClose} subtitle="Episodes that live together on your profile" title="Series">
      <div className="seen-settings-options">
        {loading ? <p className="seen-settings-empty">Loading Series...</p> : null}
        {!loading && !items.length ? <p className="seen-settings-empty">No Series yet. Create one below.</p> : null}
        {items.map((item) => (
          <SheetRow
            Icon={FiGrid}
            key={item.id}
            label={item.name}
            onClick={() => onSelect(item)}
            selected={selectedId === item.id}
          />
        ))}
      </div>
      <form className="seen-series-create" onSubmit={onCreate}>
        <input
          aria-label="New series name"
          maxLength={24}
          onChange={(event) => onInput(event.target.value)}
          placeholder="New series..."
          value={newSeries}
        />
        <button aria-label="Create series" disabled={creating || !newSeries.trim()} type="submit"><FiPlus /></button>
      </form>
      {error ? <p className="seen-settings-error" role="alert">{error}</p> : null}
      <button className="seen-settings-remove" disabled={!selectedId} onClick={onRemove} type="button">Remove from series</button>
    </SelectionSheet>
  );
}

function SettingsRow({ Icon, label, onClick, value }) {
  return (
    <button className="seen-compose-settings-row" onClick={onClick} type="button">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <b>{value}</b>
      <FiChevronRight aria-hidden="true" />
    </button>
  );
}

export function SeenChapterEditor({ busy, chapter, error, onAddBlocks, onAddPlace, onDone, onMediaUpload, onRemoveBlock, onReorderBlocks, onStoryChange, onUpdateBlock, story, status }) {
  const photoInput = useRef(null);
  const voiceInput = useRef(null);
  const textareaRef = useRef(null);
  const structuredFormRef = useRef(null);
  const voiceRecorder = useRef(null);
  const voiceStream = useRef(null);
  const voiceTimer = useRef(null);
  const voiceChunks = useRef([]);
  const selectedRange = useRef(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [recordedVoice, setRecordedVoice] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [draggingBlockId, setDraggingBlockId] = useState("");
  const [textToolsOpen, setTextToolsOpen] = useState(false);
  const [textToolPosition, setTextToolPosition] = useState({
    left: 32,
    top: 120,
  });
  const [structuredEditor, setStructuredEditor] = useState(null);
  const [structuredDraft, setStructuredDraft] = useState({
    label: "",
    url: "",
    items: ["", ""],
    question: "",
    options: ["", ""],
    resultsVisibility: "SUBSCRIBERS",
  });
  const storyBlock = (chapter?.blocks || []).find(
    (block) => block.type === "TEXT" && !block.metadata?.location,
  );
  const editorBlocks = [
    {
      ...(storyBlock || {}),
      id: storyBlock?.id || "__story__",
      order: storyBlock?.order ?? -1,
      type: "TEXT",
    },
    ...(chapter?.blocks || []).filter(
      (block) => block.type !== "TEXT" || block.metadata?.location,
    ),
  ].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const attachmentBlocks = editorBlocks.filter(
    (block) =>
      !["TEXT", "KEY_POINT", "LINK", "POLL"].includes(block.type) &&
      !block.metadata?.location,
  );
  const structuredBlocks = editorBlocks.filter(
    (block) =>
      ["KEY_POINT", "LINK", "POLL"].includes(block.type) &&
      !block.metadata?.location,
  );
  const locationBlocks = editorBlocks.filter(
    (block) => block.metadata?.location?.label,
  );
  const visualOrder = (blockId) =>
    editorBlocks.findIndex((block) => block.id === blockId) + 1;
  const dropBlock = (targetId) => {
    if (draggingBlockId && draggingBlockId !== targetId)
      onReorderBlocks(draggingBlockId, targetId);
    setDraggingBlockId("");
  };

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.innerText = story || "";
  }, [chapter?.stableChapterId]);

  useEffect(
    () => () => {
      if (voiceTimer.current) window.clearInterval(voiceTimer.current);
      if (voiceRecorder.current?.state === "recording")
        voiceRecorder.current.stop();
      voiceStream.current?.getTracks().forEach((track) => track.stop());
      if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
    },
    [recordedVoice?.url],
  );

  useEffect(() => {
    if (!placeOpen || placeQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      setPlaceLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPlaceLoading(true);
      searchService
        .getSuggestions(placeQuery.trim(), controller.signal)
        .then((data) =>
          setPlaceSuggestions(
            (data.suggestions || []).filter((item) => item.type === "place"),
          ),
        )
        .catch(() => setPlaceSuggestions([]))
        .finally(() => setPlaceLoading(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [placeOpen, placeQuery]);

  const discardVoice = () => {
    if (recordedVoice?.url) URL.revokeObjectURL(recordedVoice.url);
    setRecordedVoice(null);
    setVoiceSeconds(0);
    setVoiceState("idle");
  };

  const startVoiceRecording = async () => {
    setVoiceError("");
    discardVoice();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      voiceStream.current = stream;
      voiceRecorder.current = recorder;
      voiceChunks.current = [];
      recorder.ondataavailable = ({ data }) => {
        if (data.size) voiceChunks.current.push(data);
      };
      recorder.onstop = () => {
        const blob = new Blob(voiceChunks.current, { type: mimeType });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setRecordedVoice({ file, url: URL.createObjectURL(blob) });
        setVoiceState("ready");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(250);
      setVoiceState("recording");
      setVoiceSeconds(0);
      voiceTimer.current = window.setInterval(
        () => setVoiceSeconds((seconds) => seconds + 1),
        1000,
      );
    } catch {
      setVoiceError(
        "Microphone access was not available. You can upload an audio file instead.",
      );
      setVoiceState("idle");
    }
  };

  const stopVoiceRecording = () => {
    if (voiceTimer.current) window.clearInterval(voiceTimer.current);
    voiceTimer.current = null;
    if (voiceRecorder.current?.state === "recording")
      voiceRecorder.current.stop();
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (
      !selection?.rangeCount ||
      selection.isCollapsed ||
      !textareaRef.current?.contains(selection.anchorNode)
    )
      return;
    const range = selection.getRangeAt(0).cloneRange();
    const box = range.getBoundingClientRect();
    selectedRange.current = range;
    setTextToolPosition({
      left: Math.max(12, Math.min(window.innerWidth - 300, box.left)),
      top: Math.max(76, box.bottom + 10),
    });
    setTextToolsOpen(true);
  };

  const applyTextFormat = (command, value = null) => {
    if (!selectedRange.current) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectedRange.current);
    document.execCommand(command, false, value);
    onStoryChange(textareaRef.current?.innerText || "");
    selectedRange.current = selection.rangeCount
      ? selection.getRangeAt(0).cloneRange()
      : null;
  };
  const openStructuredEditor = (type, block = null) => {
    setStructuredEditor({ type, blockId: block?.id || null });
    setStructuredDraft(
      type === "LINK"
        ? {
            label: block?.label || "",
            url: block?.url || "",
            items: ["", ""],
            question: "",
            options: ["", ""],
          }
        : type === "KEY_POINT"
          ? {
              label: "",
              url: "",
              items: block ? [block.text || ""] : ["", ""],
              question: "",
              options: ["", ""],
            }
          : {
              label: "",
              url: "",
              items: ["", ""],
              question: block?.metadata?.question || "",
              options: block?.metadata?.options || ["", ""],
              resultsVisibility:
                block?.metadata?.resultsVisibility || "SUBSCRIBERS",
            },
    );
    setActionsOpen(false);
  };
  const saveStructuredBlock = async () => {
    if (structuredEditor.type === "LINK") {
      const block = {
        id: structuredEditor.blockId || newBlockId(),
        type: "LINK",
        label: structuredDraft.label.trim(),
        url: structuredDraft.url.trim(),
      };
      if (!block.label || !/^https?:\/\//i.test(block.url))
        return setVoiceError("Add a label and a full http or https link.");
      const saved = await (structuredEditor.blockId
        ? onUpdateBlock(block.id, block)
        : onAddBlocks([block]));
      if (saved === false) return;
    } else if (structuredEditor.type === "KEY_POINT") {
      const renderedItems = structuredFormRef.current
        ? [...structuredFormRef.current.querySelectorAll('input[name="keyPoint"]')].map((input) => input.value)
        : structuredDraft.items;
      const items = renderedItems
        .map((item) => item.trim())
        .filter(Boolean);
      if (!items.length) return setVoiceError("Add at least one key point.");
      let saved;
      if (structuredEditor.blockId)
        saved = await onUpdateBlock(structuredEditor.blockId, {
          text: items[0],
          type: "KEY_POINT",
        });
      else
        saved = await onAddBlocks(
          items.map((text) => ({ id: newBlockId(), text, type: "KEY_POINT" })),
        );
      if (saved === false) return;
    } else {
      const options = structuredDraft.options
        .map((item) => item.trim())
        .filter(Boolean);
      if (!structuredDraft.question.trim() || options.length < 2)
        return setVoiceError("Add a question and at least two choices.");
      const block = {
        id: structuredEditor.blockId || newBlockId(),
        type: "POLL",
        metadata: {
          question: structuredDraft.question.trim(),
          options,
          resultsVisibility: structuredDraft.resultsVisibility,
        },
      };
      const saved = await (structuredEditor.blockId
        ? onUpdateBlock(block.id, block)
        : onAddBlocks([block]));
      if (saved === false) return;
    }
    setVoiceError("");
    setStructuredEditor(null);
  };

  return (
    <section className="seen-chapter-editor-page">
      <header className="seen-chapter-editor-header">
        <div>
          <h1>{chapter?.title?.trim() || "Chapter name"}</h1>
          <p>
            drag a block {"\u2014"} move {"\u00b7"} double-tap {"\u2014"} edit
          </p>
        </div>
        <button disabled={busy} onClick={onDone} type="button">
          {busy ? "Saving" : "Done"}
        </button>
      </header>

      {textToolsOpen ? (
        <div
          className="seen-chapter-text-tools"
          role="toolbar"
          aria-label="Text formatting"
          style={{ left: textToolPosition.left, top: textToolPosition.top }}
        >
          <div>
            <button
              aria-label="Bold"
              onClick={() => applyTextFormat("bold")}
              type="button"
            >
              <b>B</b>
            </button>
            <button
              aria-label="Italic"
              onClick={() => applyTextFormat("italic")}
              type="button"
            >
              <i>I</i>
            </button>
            <button
              aria-label="Small text"
              onClick={() => applyTextFormat("fontSize", "3")}
              type="button"
            >
              S
            </button>
            <button
              aria-label="Large text"
              onClick={() => applyTextFormat("fontSize", "6")}
              type="button"
            >
              L
            </button>
          </div>
          <div>
            {["#ffffff", "#9CCBFF", "#F6C85F", "#F17878", "#6ECF97"].map(
              (color) => (
                <button
                  aria-label={`Use ${color} text`}
                  className="is-color"
                  key={color}
                  onClick={() => applyTextFormat("foreColor", color)}
                  style={{ "--text-color": color }}
                  type="button"
                />
              ),
            )}
          </div>
          <button
            aria-label="Close text tools"
            className="seen-chapter-text-tools-close"
            onClick={() => setTextToolsOpen(false)}
            type="button"
          >
            <FiX />
          </button>
        </div>
      ) : null}

      <div
        className="seen-chapter-writing-surface seen-chapter-sortable-block"
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => dropBlock(storyBlock?.id || "__story__")}
        style={{ order: visualOrder(storyBlock?.id || "__story__") }}
      >
        <button
          aria-label="Drag text block"
          className="seen-chapter-drag-handle"
          draggable
          onDragStart={() => setDraggingBlockId(storyBlock?.id || "__story__")}
          type="button"
        >
          ⋮⋮
        </button>
        <span className="sr-only">Write the story</span>
        <div
          autoFocus
          contentEditable
          data-placeholder={"Just write.\n\nSelect text — color appears."}
          onBlur={(event) => onStoryChange(event.currentTarget.innerText)}
          onInput={(event) => onStoryChange(event.currentTarget.innerText)}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          ref={textareaRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
      {attachmentBlocks.length ? (
        <div className="seen-chapter-block-strip">
          {attachmentBlocks.map((block) => (
            <figure
              className={`seen-chapter-attachment seen-chapter-sortable-block is-${String(block.type || "media").toLowerCase()}`}
              draggable
              key={block.id}
              onDragEnd={() => setDraggingBlockId("")}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingBlockId(block.id)}
              onDrop={() => dropBlock(block.id)}
              style={{ order: visualOrder(block.id) }}
            >
              <button
                aria-label={`Remove ${mediaLabel(block)}`}
                className="seen-chapter-attachment-remove"
                disabled={busy}
                onClick={() => onRemoveBlock(block.id)}
                type="button"
              >
                <FiX />
              </button>
              {block.type === "IMAGE" && block.media?.secureUrl ? (
                <img alt="Chapter attachment" src={block.media.secureUrl} />
              ) : null}
              {block.type === "VIDEO" && block.media?.secureUrl ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={block.media.secureUrl}
                />
              ) : null}
              {["VOICE", "AUDIO"].includes(block.type) &&
              block.media?.secureUrl ? (
                <audio
                  controls
                  preload="metadata"
                  src={block.media.secureUrl}
                />
              ) : null}
              {!block.media?.secureUrl ? (
                <div className="seen-chapter-attachment-fallback">
                  {mediaLabel(block)}
                </div>
              ) : null}
              <figcaption>
                {mediaLabel(block)}
                {block.media?.duration
                  ? ` · ${Math.round(block.media.duration)}s`
                  : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {structuredBlocks.length ? (
        <div className="seen-chapter-structured-list">
          {structuredBlocks.map((block) => (
            <article
              className={`seen-chapter-preview-block is-${block.type.toLowerCase()} ${draggingBlockId === block.id ? "is-dragging" : ""}`}
              draggable
              key={block.id}
              onDragEnd={() => setDraggingBlockId("")}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingBlockId(block.id)}
              onDrop={() => dropBlock(block.id)}
              style={{ order: visualOrder(block.id) }}
            >
              <button aria-label="Drag to reorder" className="seen-chapter-preview-drag" type="button">⋮⋮</button>
              <button
                aria-label={`Edit ${mediaLabel(block)}`}
                className="seen-chapter-structured-main"
                onClick={() => openStructuredEditor(block.type, block)}
                type="button"
              >
                {block.type === "KEY_POINT" ? <><span className="seen-key-point-number">{structuredBlocks.filter((item) => item.type === "KEY_POINT").findIndex((item) => item.id === block.id) + 1}</span><span><small>KEY POINT</small><b>{block.text}</b></span></> : null}
                {block.type === "LINK" ? <><span><FiLink /></span><span><small>USEFUL LINK</small><b>{block.label}</b><em>{block.url}</em><i>Open link <FiArrowRight /></i></span></> : null}
                {block.type === "POLL" ? <><span><FiBarChart2 /></span><span className="seen-poll-preview"><small>POLL · {block.metadata?.resultsVisibility === "CREATOR" ? "results private" : "results visible"}</small><b>{block.metadata?.question}</b><span>{(block.metadata?.options || []).map((option) => <i key={option}><u />{option}</i>)}</span><em>Tap to edit · subscribers can choose one answer</em></span></> : null}
              </button>
              <button
                aria-label="Remove block"
                className="seen-chapter-structured-remove"
                disabled={busy}
                onClick={() => onRemoveBlock(block.id)}
                type="button"
              >
                <FiTrash2 />
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {locationBlocks.length ? (
        <div className="seen-chapter-location-chips">
          {locationBlocks.map((block) => (
            <span
              className="seen-chapter-sortable-block"
              draggable
              key={block.id}
              onDragEnd={() => setDraggingBlockId("")}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingBlockId(block.id)}
              onDrop={() => dropBlock(block.id)}
              style={{ order: visualOrder(block.id) }}
            >
              <b className="seen-chapter-drag-handle">⋮⋮</b>
              <FiMapPin />
              {block.metadata.location.label}
              <button
                aria-label={`Remove ${block.metadata.location.label}`}
                onClick={() => onRemoveBlock(block.id)}
                type="button"
              >
                <FiX />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="seen-chapter-editor-error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="seen-chapter-editor-status" role="status">
          {status}
        </p>
      ) : null}
      {voiceOpen ? (
        <section
          className="seen-chapter-voice-recorder"
          aria-label="Voice recorder"
        >
          <div className="seen-chapter-voice-head">
            <strong>Voice</strong>
            <button
              onClick={() => {
                if (voiceState === "recording") stopVoiceRecording();
                setVoiceOpen(false);
              }}
              type="button"
            >
              <FiX />
            </button>
          </div>
          {voiceState === "recording" ? (
            <div className="seen-chapter-recording-live">
              <i />
              <b>{formatDuration(voiceSeconds)}</b>
              <span>Recording...</span>
            </div>
          ) : null}
          {recordedVoice ? (
            <audio controls preload="metadata" src={recordedVoice.url} />
          ) : null}
          {voiceError ? <p>{voiceError}</p> : null}
          <div className="seen-chapter-voice-actions">
            {voiceState !== "recording" ? (
              <button onClick={startVoiceRecording} type="button">
                <FiMic />
                {recordedVoice ? "Re-record" : "Record live"}
              </button>
            ) : (
              <button
                className="is-stop"
                onClick={stopVoiceRecording}
                type="button"
              >
                Stop
              </button>
            )}
            <button
              disabled={voiceState === "recording"}
              onClick={() => voiceInput.current?.click()}
              type="button"
            >
              <FiUpload />
              Upload file
            </button>
            {recordedVoice ? (
              <button onClick={discardVoice} type="button">
                <FiX />
                Discard
              </button>
            ) : null}
            {recordedVoice ? (
              <button
                className="is-primary"
                onClick={() => {
                  onMediaUpload("VOICE", recordedVoice.file);
                  setVoiceOpen(false);
                  discardVoice();
                }}
                type="button"
              >
                Add voice
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {placeOpen ? (
        <section
          className="seen-chapter-place-picker"
          aria-label="Add a location"
        >
          <div className="seen-chapter-place-head">
            <strong>Add location</strong>
            <button onClick={() => setPlaceOpen(false)} type="button">
              <FiX />
            </button>
          </div>
          <label>
            <FiMapPin />
            <input
              autoFocus
              onChange={(event) => setPlaceQuery(event.target.value)}
              placeholder="Search city, place, or country"
              value={placeQuery}
            />
          </label>
          <div className="seen-chapter-place-results">
            {placeLoading ? <p>Searching locations...</p> : null}
            {placeSuggestions.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onAddPlace(item.value || item.label);
                  setPlaceOpen(false);
                  setPlaceQuery("");
                }}
                type="button"
              >
                <FiMapPin />
                <span>
                  <b>{item.label}</b>
                  <small>Place</small>
                </span>
              </button>
            ))}
            {!placeLoading && placeQuery.trim().length >= 2 ? (
              <button
                onClick={() => {
                  onAddPlace(placeQuery.trim());
                  setPlaceOpen(false);
                  setPlaceQuery("");
                }}
                type="button"
              >
                <FiPlus />
                <span>
                  <b>Add “{placeQuery.trim()}”</b>
                  <small>Use this location</small>
                </span>
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {structuredEditor ? (
        <section
          className="seen-chapter-structured-editor"
          aria-label={`Add ${structuredEditor.type.toLowerCase()}`}
          ref={structuredFormRef}
        >
          <header>
            <span>
              {structuredEditor.type === "LINK" ? (
                <FiLink />
              ) : structuredEditor.type === "POLL" ? (
                <FiBarChart2 />
              ) : (
                <FiList />
              )}
            </span>
            <div>
              <strong>
                {structuredEditor.blockId ? "Edit" : "Add"}{" "}
                {structuredEditor.type === "KEY_POINT"
                  ? "key points"
                  : structuredEditor.type.toLowerCase()}
              </strong>
              <small>
                {structuredEditor.type === "LINK"
                  ? "Share a useful destination"
                  : structuredEditor.type === "POLL"
                    ? "Let members choose one answer"
                    : "Turn ideas into a clear checklist"}
              </small>
            </div>
            <button
              aria-label="Close editor"
              onClick={() => setStructuredEditor(null)}
              type="button"
            >
              <FiX />
            </button>
          </header>
          {structuredEditor.type === "LINK" ? (
            <div className="seen-chapter-structured-fields">
              <label>
                Button label
                <input
                  autoFocus
                  maxLength={120}
                  onChange={(event) =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Read the full guide"
                  value={structuredDraft.label}
                />
              </label>
              <label>
                Web address
                <input
                  maxLength={1000}
                  onChange={(event) =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      url: event.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                  type="url"
                  value={structuredDraft.url}
                />
              </label>
            </div>
          ) : structuredEditor.type === "KEY_POINT" ? (
            <div className="seen-chapter-structured-fields">
              <p>Key points</p>
              {structuredDraft.items.map((item, index) => (
                <label className="is-row" key={index}>
                  <span>{index + 1}</span>
                  <input
                    autoFocus={index === 0}
                    maxLength={240}
                    name="keyPoint"
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setVoiceError("");
                      setStructuredDraft((draft) => ({
                        ...draft,
                        items: draft.items.map((currentItem, itemIndex) =>
                          itemIndex === index ? value : currentItem,
                        ),
                      }));
                    }}
                    placeholder={`Point ${index + 1}`}
                    value={item}
                  />
                  {structuredDraft.items.length > 1 ? (
                    <button
                      aria-label={`Remove point ${index + 1}`}
                      onClick={() =>
                        setStructuredDraft((draft) => ({
                          ...draft,
                          items: draft.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                      type="button"
                    >
                      <FiX />
                    </button>
                  ) : null}
                </label>
              ))}
              {!structuredEditor.blockId && structuredDraft.items.length < 8 ? (
                <button
                  className="seen-chapter-add-choice"
                  onClick={() =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      items: [...draft.items, ""],
                    }))
                  }
                  type="button"
                >
                  <FiPlus /> Add another point
                </button>
              ) : null}
            </div>
          ) : (
            <div className="seen-chapter-structured-fields">
              <label>
                Question
                <input
                  autoFocus
                  maxLength={180}
                  onChange={(event) =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      question: event.target.value,
                    }))
                  }
                  placeholder="What should we explore next?"
                  value={structuredDraft.question}
                />
              </label>
              <p>Choices</p>
              {structuredDraft.options.map((option, index) => (
                <label className="is-row" key={index}>
                  <span>{index + 1}</span>
                  <input
                    maxLength={80}
                    onChange={(event) =>
                      setStructuredDraft((draft) => ({
                        ...draft,
                        options: draft.options.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      }))
                    }
                    placeholder={`Choice ${index + 1}`}
                    value={option}
                  />
                  {structuredDraft.options.length > 2 ? (
                    <button
                      aria-label={`Remove choice ${index + 1}`}
                      onClick={() =>
                        setStructuredDraft((draft) => ({
                          ...draft,
                          options: draft.options.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }))
                      }
                      type="button"
                    >
                      <FiX />
                    </button>
                  ) : null}
                </label>
              ))}
              {structuredDraft.options.length < 4 ? (
                <button
                  className="seen-chapter-add-choice"
                  onClick={() =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      options: [...draft.options, ""],
                    }))
                  }
                  type="button"
                >
                  <FiPlus /> Add choice
                </button>
              ) : null}
              <fieldset className="seen-poll-visibility">
                <legend>Who can see results?</legend>
                <label className={structuredDraft.resultsVisibility === "SUBSCRIBERS" ? "is-selected" : ""}>
                  <input checked={structuredDraft.resultsVisibility === "SUBSCRIBERS"} name="poll-results-visibility" onChange={() => setStructuredDraft((draft) => ({ ...draft, resultsVisibility: "SUBSCRIBERS" }))} type="radio" />
                  <span><b>Subscribers</b><small>Members can see totals and percentages</small></span>
                </label>
                <label className={structuredDraft.resultsVisibility === "CREATOR" ? "is-selected" : ""}>
                  <input checked={structuredDraft.resultsVisibility === "CREATOR"} name="poll-results-visibility" onChange={() => setStructuredDraft((draft) => ({ ...draft, resultsVisibility: "CREATOR" }))} type="radio" />
                  <span><b>Only me</b><small>Members can vote, but results stay private</small></span>
                </label>
              </fieldset>
            </div>
          )}
          {voiceError ? (
            <p className="seen-chapter-structured-error">{voiceError}</p>
          ) : null}
          <footer>
            <button onClick={() => setStructuredEditor(null)} type="button">
              Cancel
            </button>
            <button
              className="is-primary"
              disabled={busy}
              onClick={saveStructuredBlock}
              type="button"
            >
              {busy
                ? "Saving…"
                : structuredEditor.blockId
                  ? "Save changes"
                  : "Add block"}
            </button>
          </footer>
        </section>
      ) : null}
      {actionsOpen ? (
        <div
          aria-label="Story block types"
          className="seen-chapter-add-menu"
          role="menu"
        >
          <button
            onClick={() => {
              setTextToolsOpen((open) => !open);
              textareaRef.current?.focus();
              setActionsOpen(false);
            }}
            type="button"
          >
            <FiType />
            Text
          </button>
          <button onClick={() => photoInput.current?.click()} type="button">
            <FiCamera />
            Photo
          </button>
          <button
            onClick={() => {
              setVoiceOpen(true);
              setActionsOpen(false);
            }}
            type="button"
          >
            <FiMic />
            Voice
          </button>
          <button
            onClick={() => {
              setPlaceOpen(true);
              setActionsOpen(false);
            }}
            type="button"
          >
            <FiMapPin />
            Place
          </button>
          <button onClick={() => openStructuredEditor("LINK")} type="button">
            <FiLink />
            Link
          </button>
          <button
            onClick={() => openStructuredEditor("KEY_POINT")}
            type="button"
          >
            <FiList />
            Key points
          </button>
          <button onClick={() => openStructuredEditor("POLL")} type="button">
            <FiBarChart2 />
            Poll
          </button>
        </div>
      ) : null}
      <button
        aria-expanded={actionsOpen}
        aria-label={actionsOpen ? "Close block menu" : "Add story block"}
        className={`seen-chapter-editor-add ${actionsOpen ? "is-open" : ""}`}
        disabled={busy}
        onClick={() => setActionsOpen((open) => !open)}
        type="button"
      >
        <FiPlus />
      </button>
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
            setVoiceOpen(false);
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
  const fromDrafts = searchParams.get("from") === "drafts";
  const draftSuffix = fromDrafts ? "?from=drafts" : "";
  const backTarget = id
    ? `/studio/seens/${id}${draftSuffix}`
    : fromDrafts
      ? "/studio/seens?status=drafts"
      : "/profile";
  const replyToSeenId = id ? "" : searchParams.get("replyToSeenId") || "";
  const coverInput = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);
  const pendingCoverKind = useRef("IMAGE");
  const pendingVideoLimit = useRef(15);
  const [p, setP] = useState(() => ({
    ...empty,
    replyToSeen: replyToSeenId || null,
  }));
  const [replySeen, setReplySeen] = useState(null);
  const [newSeries, setNewSeries] = useState("");
  const [savedSeries, setSavedSeries] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(fallbackCategories.map((name) => ({ id: name, name })));
  const [settingsSheet, setSettingsSheet] = useState("");
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesCreating, setSeriesCreating] = useState(false);
  const [seriesError, setSeriesError] = useState("");
  const [linkOnlyShare, setLinkOnlyShare] = useState(null);
  const [introOpen, setIntroOpen] = useState(() => !localStorage.getItem("atseen_seen_intro_dismissed"));
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState("");
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoToTrim, setVideoToTrim] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [chapterStory, setChapterStory] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterStatus, setChapterStatus] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const [loadingPublication, setLoadingPublication] = useState(Boolean(id));

  const refresh = async (publicationId = id) => {
    const response = await api.getMyPublication(publicationId);
    let publication = response.data.data.publication;
    if (publication.status === "PUBLISHED") {
      const revision = await api.startPublishedRevision(
        publication.id,
        publication.statusVersion,
      );
      publication = revision.data.data.publication;
    }
    const normalizedPublication = {
      ...empty,
      ...publication,
      chapters: Array.isArray(publication?.chapters)
        ? publication.chapters
        : [],
      tags: Array.isArray(publication?.tags) ? publication.tags : [],
      series: publication?.series || null,
      seriesId: publication?.seriesId || publication?.series?.id || null,
      visibility: publication?.visibility || "PUBLIC",
    };
    setP(normalizedPublication);
    dirty.current = false;
    return normalizedPublication;
  };

  const loadSeries = async () => {
    setSeriesLoading(true);
    setSeriesError("");
    try {
      const response = await api.listMySeries();
      setSavedSeries(response.data?.data?.items || []);
    } catch (requestError) {
      setSeriesError(publicationError(requestError, "Unable to load Series"));
    } finally {
      setSeriesLoading(false);
    }
  };

  useEffect(() => {
    api.listSeenCategories()
      .then((response) => {
        const next = response.data?.data?.categories || [];
        if (next.length) setCategoryOptions(next);
      })
      .catch(() => setCategoryOptions(fallbackCategories.map((name) => ({ id: name, name }))));
    loadSeries();
  }, []);

  useEffect(() => {
    if (!id) {
      setLoadingPublication(false);
      return;
    }
    setLoadingPublication(true);
    refresh()
      .catch((requestError) => setError(publicationError(requestError)))
      .finally(() => setLoadingPublication(false));
  }, [id]);

  useEffect(() => {
    if (!replyToSeenId) return undefined;
    let active = true;
    api
      .getPublicPublication(replyToSeenId)
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
    setLinkOnlyShare(null);
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
      seriesId: p.seriesId || p.series?.id || null,
      visibility: p.visibility || "PUBLIC",
      entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
      tags: tagsWithoutSeries(p.tags),
      replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
    });
    const publication = response.data.data.publication;
    setP(publication);
    nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, {
      replace: true,
    });
    return publication;
  };

  const save = async ({ allowEmpty = false } = {}) => {
    if (busy.current) return null;
    if (!p.id && !allowEmpty && !hasDraftContent(p)) {
      setStatus("Add something to save as a draft");
      return null;
    }
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
        seriesId: p.seriesId || p.series?.id || null,
        visibility: p.visibility || "PUBLIC",
        entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
        tags: tagsWithoutSeries(p.tags),
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
    if (!dirty.current || uploading || (!p.id && !hasDraftContent(p))) return undefined;
    const timer = setTimeout(save, 1800);
    return () => clearTimeout(timer);
  }, [p, uploading]);

  const activeChapter = (p.chapters || []).find(
    (chapter) => chapter.stableChapterId === activeChapterId,
  );

  useEffect(() => {
    if (!activeChapter) return;
    setChapterStory(chapterStoryText(activeChapter));
    setChapterStatus("");
    setError("");
  }, [activeChapterId]);

  useEffect(() => {
    if (!chapterStatus || !/(saved|added|removed)$/i.test(chapterStatus))
      return undefined;
    const timer = window.setTimeout(() => setChapterStatus(""), 2600);
    return () => window.clearTimeout(timer);
  }, [chapterStatus]);

  useEffect(
    () => () => {
      if (videoToTrim?.url) URL.revokeObjectURL(videoToTrim.url);
    },
    [videoToTrim?.url],
  );

  useEffect(
    () => () => {
      if (coverPreview?.url) URL.revokeObjectURL(coverPreview.url);
    },
    [coverPreview?.url],
  );

  const uploadCoverFile = async (file, kind = pendingCoverKind.current) => {
    if (!file) return;
    try {
      const publication = dirty.current
        ? await save({ allowEmpty: true })
        : await ensure();
      if (!publication) return;
      setUploading(kind);
      setStatus("Uploading media...");
      await api.uploadMedia(publication.id, file, {
        purpose: "COVER",
        statusVersion: publication.statusVersion,
      });
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
      if (!file.type.startsWith("video/")) {
        setError("Choose a video file for this option.");
        return;
      }
      setError("");
      const url = URL.createObjectURL(file);
      try {
        const duration = await readVideoDuration(url);
        if (duration <= pendingVideoLimit.current + 0.1) {
          URL.revokeObjectURL(url);
          await uploadCoverFile(file, "VIDEO");
          return;
        }
        setVideoToTrim((current) => {
          if (current?.url) URL.revokeObjectURL(current.url);
          return { file, limitSeconds: pendingVideoLimit.current, url };
        });
      } catch (durationError) {
        URL.revokeObjectURL(url);
        setError(durationError.message);
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the Photo option.");
      return;
    }
    setCropTarget({ kind: "cover", url: URL.createObjectURL(file) });
  };

  const chooseMedia = (kind, limitSeconds = 15) => {
    pendingCoverKind.current = kind;
    pendingVideoLimit.current = limitSeconds;
    if (coverInput.current)
      coverInput.current.accept =
        kind === "VIDEO" ? VIDEO_ACCEPT : IMAGE_ACCEPT;
    coverInput.current?.click();
  };

  const addChapter = async () => {
    if (p.chapters.length >= 3) {
      setError("Maximum three chapters.");
      return;
    }
    const publication = dirty.current
      ? await save({ allowEmpty: true })
      : await ensure();
    if (!publication) return;
    try {
      const title = p.chapters.length
        ? `Chapter ${p.chapters.length + 1}`
        : "Chapter name";
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
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
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
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const uploadChapterMedia = async (mediaType, file) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    const blockId = newBlockId();
    setChapterSaving(true);
    setChapterStatus(
      `Uploading ${mediaLabel({ type: mediaType }).toLowerCase()}...`,
    );
    setError("");
    try {
      const uploaded = (
        await api.uploadMedia(p.id, file, {
          purpose: "BLOCK",
          mediaType,
          chapterId: activeChapter.stableChapterId,
          blockId,
        })
      ).data.data;
      const storyBlocks = chapterBlocksWithStory(activeChapter, chapterStory);
      const blocks = [
        ...storyBlocks,
        {
          id: blockId,
          media: uploaded,
          order: storyBlocks.length,
          type: mediaType,
        },
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
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const closeImageCrop = () => {
    if (cropTarget?.url) URL.revokeObjectURL(cropTarget.url);
    setCropTarget(null);
  };

  const useCroppedImage = async (file) => {
    const target = cropTarget?.kind;
    closeImageCrop();
    if (target === "cover") await uploadCoverFile(file, "IMAGE");
    else await uploadChapterMedia("IMAGE", file);
  };

  const requestChapterMedia = (mediaType, file) => {
    if (mediaType !== "IMAGE") return uploadChapterMedia(mediaType, file);
    setCropTarget({ kind: "chapter", url: URL.createObjectURL(file) });
  };

  const addPlaceBlock = async (label) => {
    const locationLabel = String(label || "")
      .trim()
      .slice(0, 120);
    if (!locationLabel || !activeChapter || !p.id || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus("Adding place...");
    setError("");
    try {
      const storyBlocks = chapterBlocksWithStory(activeChapter, chapterStory);
      const blocks = [
        ...storyBlocks,
        {
          id: newBlockId(),
          metadata: { location: { label: locationLabel } },
          order: storyBlocks.length,
          text: locationLabel,
          type: "KEY_POINT",
        },
      ];
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus("Place added");
    } catch (requestError) {
      setChapterStatus("Place was not added");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const addStructuredBlocks = async (newBlocks) => {
    if (!activeChapter || !p.id || chapterSaving || !newBlocks?.length) return;
    setChapterSaving(true);
    setChapterStatus("Adding block...");
    setError("");
    try {
      const current = chapterBlocksWithStory(activeChapter, chapterStory);
      const blocks = [...current, ...newBlocks].map((block, order) => ({
        ...block,
        order,
      }));
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: activeChapter.isPreview,
        releaseMode: activeChapter.releaseMode || "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus("Block added");
    } catch (requestError) {
      setError(publicationError(requestError));
      setChapterStatus("Block was not added");
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
      throw requestError;
    } finally {
      setChapterSaving(false);
    }
  };

  const updateStructuredBlock = async (blockId, changes) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus("Saving block...");
    setError("");
    try {
      const blocks = chapterBlocksWithStory(activeChapter, chapterStory).map(
        (block, order) =>
          block.id === blockId
            ? { ...block, ...changes, id: blockId, order }
            : { ...block, order },
      );
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: activeChapter.isPreview,
        releaseMode: activeChapter.releaseMode || "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus("Block saved");
    } catch (requestError) {
      setError(publicationError(requestError));
      setChapterStatus("Block was not saved");
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
      throw requestError;
    } finally {
      setChapterSaving(false);
    }
  };

  const removeChapterBlock = async (blockId) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    setChapterSaving(true);
    setChapterStatus("Removing block...");
    setError("");
    try {
      const blocks = chapterBlocksWithStory(activeChapter, chapterStory)
        .filter((block) => block.id !== blockId)
        .map((block, order) => ({ ...block, order }));
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks,
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus("Block removed");
    } catch (requestError) {
      setChapterStatus("Block was not removed");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  const reorderChapterBlocks = async (sourceId, targetId) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    const blocks = chapterBlocksWithStory(activeChapter, chapterStory);
    const storyId = blocks.find(
      (block) => block.type === "TEXT" && !block.metadata?.location,
    )?.id;
    const resolvedSourceId = sourceId === "__story__" ? storyId : sourceId;
    const resolvedTargetId = targetId === "__story__" ? storyId : targetId;
    const sourceIndex = blocks.findIndex(
      (block) => block.id === resolvedSourceId,
    );
    const targetIndex = blocks.findIndex(
      (block) => block.id === resolvedTargetId,
    );
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
      return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setChapterSaving(true);
    setChapterStatus("Reordering blocks...");
    setError("");
    try {
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks: reordered.map((block, order) => ({ ...block, order })),
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      await refresh(p.id);
      setChapterStatus("Block order saved");
    } catch (requestError) {
      setChapterStatus("Block order was not saved");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
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
    setSubmitting(true);
    try {
      const response = await api[publication.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](publication.id, publication.statusVersion);
      const published = response.data?.data?.publication;
      if (published?.visibility === "LINK_ONLY" && published.shareUrl) {
        setP((current) => ({ ...current, ...published, chapters: current.chapters }));
        dirty.current = false;
        setLinkOnlyShare({ copied: false, url: published.shareUrl });
        setStatus("Link-only Seen published");
        return;
      }
      nav(`/studio/seens/${publication.id}${draftSuffix}`);
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const createNewSeries = async (event) => {
    event.preventDefault();
    const value = newSeries.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!value || seriesCreating) return;
    if (savedSeries.some((item) => item.name.toLowerCase() === value.toLowerCase())) {
      setSeriesError("You already have a Series with that name.");
      return;
    }
    setSeriesCreating(true);
    setSeriesError("");
    try {
      const response = await api.createSeries(value);
      const created = response.data?.data?.series;
      if (!created) throw new Error("Series was not created");
      setSavedSeries((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      change({ series: created, seriesId: created.id });
      setNewSeries("");
    } catch (requestError) {
      setSeriesError(publicationError(requestError, "Unable to create Series"));
    } finally {
      setSeriesCreating(false);
    }
  };

  if (p.id && !["DRAFT", "CHANGES_REQUESTED"].includes(p.status)) {
    return <p>This Seen is read-only while {p.status.replaceAll("_", " ")}.</p>;
  }

  if (loadingPublication) {
    return (
      <p className="p-6 text-sm font-bold text-atseen-muted">
        Loading draft...
      </p>
    );
  }

  const mediaPreview = coverPreview?.url || p.coverMedia?.secureUrl;
  const mediaKind =
    coverPreview?.kind ||
    (p.coverMedia?.mediaType === "VIDEO" ? "VIDEO" : "IMAGE");
  const statusText = statusLabel(status, uploading);
  const selectedAudience = audienceOptions.find((option) => option.value === (p.visibility || "PUBLIC")) || audienceOptions[0];
  const selectedSeriesLabel = p.series?.name || savedSeries.find((item) => item.id === p.seriesId)?.name || "None";
  const AudienceIcon = selectedAudience.icon;
  const copyShareLink = async () => {
    if (!linkOnlyShare?.url) return;
    try {
      await copyText(linkOnlyShare.url);
      setLinkOnlyShare((current) => current ? { ...current, copied: true } : current);
      window.setTimeout(() => setLinkOnlyShare((current) => current ? { ...current, copied: false } : current), 1600);
    } catch {
      setError("Could not copy link.");
    }
  };

  if (activeChapter) {
    return (
      <>
        {cropTarget ? (
          <ProfileImageCropper
            kind="seen"
            onCancel={closeImageCrop}
            onSave={useCroppedImage}
            source={cropTarget.url}
          />
        ) : null}
        <SeenChapterEditor
          busy={chapterSaving}
          chapter={activeChapter}
          error={error}
          onAddBlocks={addStructuredBlocks}
          onAddPlace={addPlaceBlock}
          onDone={saveChapterStory}
          onMediaUpload={requestChapterMedia}
          onRemoveBlock={removeChapterBlock}
          onReorderBlocks={reorderChapterBlocks}
          onStoryChange={(value) => {
            setChapterStory(value);
            setChapterStatus(value.trim() ? "Unsaved chapter" : "");
          }}
          onUpdateBlock={updateStructuredBlock}
          status={chapterStatus}
          story={chapterStory}
        />
      </>
    );
  }

  return (
    <section className="seen-compose-page">
      {cropTarget ? (
        <ProfileImageCropper
          kind="seen"
          onCancel={closeImageCrop}
          onSave={useCroppedImage}
          source={cropTarget.url}
        />
      ) : null}
      <header className="seen-compose-header">
        <button
          aria-label="Back"
          className="seen-compose-back"
          onClick={() => nav(backTarget)}
          type="button"
        >
          <FiChevronLeft />
        </button>
        <div className="seen-compose-heading">
          <h1>New Seen</h1>
          {introOpen ? (
            <p>
              <span>
                Seen {"\u2014"} a post made of chapters. People walk it like a
                small story.
              </span>
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
        <button className="seen-compose-save" onClick={save} type="button">
          <FiSave aria-hidden="true" />
          Save for later
        </button>
      </header>

      <div className="seen-compose-body">
        {mediaPreview ? (
          <div className="seen-compose-cover">
            {mediaKind === "VIDEO" ? (
              <video controls preload="metadata" src={mediaPreview} />
            ) : (
              <img alt="Seen cover" src={mediaPreview} />
            )}
            <button
              aria-label="Remove selected cover"
              onClick={() => change({ coverMedia: null })}
              type="button"
            >
              <FiX />
            </button>
            {uploading ? (
              <em>Uploading...</em>
            ) : mediaKind === "VIDEO" ? (
              <span>Video</span>
            ) : null}
          </div>
        ) : (
          <div className="seen-compose-media-grid">
            <button onClick={() => chooseMedia("VIDEO", 15)} type="button">
              <FiZap />
              <b>Video {"\u00b7"} 0:15</b>
            </button>
            <button onClick={() => chooseMedia("VIDEO", 30)} type="button">
              <FiFilm />
              <b>Video {"\u00b7"} 0:30</b>
            </button>
            <button onClick={() => chooseMedia("IMAGE")} type="button">
              <FiImage />
              <b>Photo</b>
            </button>
          </div>
        )}
        <input
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={uploadCover}
          ref={coverInput}
          type="file"
        />
        {videoToTrim ? (
          <VideoTrimSheet
            file={videoToTrim}
            limitSeconds={videoToTrim.limitSeconds}
            onCancel={() =>
              setVideoToTrim((current) => {
                if (current?.url) URL.revokeObjectURL(current.url);
                return null;
              })
            }
            onUpload={(file) => uploadCoverFile(file, "VIDEO")}
          />
        ) : null}

        <p className="seen-compose-counter">
          <FiEye aria-hidden="true" />
          <b>0</b> saw this {"\u2014"} the counter comes alive after you publish
        </p>
        {replyToSeenId ? (
          <p className="seen-compose-reply-context">
            Replying to{" "}
            {replySeen?.title ? `\u201c${replySeen.title}\u201d` : "this Seen"}
          </p>
        ) : null}

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
            onChange={(event) =>
              change({
                description: event.target.value,
                summary: event.target.value,
              })
            }
            placeholder={
              "About this experience \u2014 what happens inside, honestly"
            }
            value={p.description || p.summary}
          />
        </label>

        <div
          aria-label="Seen category"
          className="seen-compose-chips"
          role="group"
        >
          {fallbackCategories.map((category) => (
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
        <EntityAttachmentPicker context={p.category} disabled={Boolean(uploading)} onChange={(attachedEntities) => change({ attachedEntities })} value={p.attachedEntities || []} />

        <div className="seen-compose-section-title">
          <span>CHAPTERS</span>
          <small>
            {p.chapters.length}/3 {"\u00b7"} like a post {"\u2014"} short
          </small>
        </div>

        <div className="seen-compose-chapters">
          {p.chapters.map((chapter, index) => (
            <div
              className="seen-compose-chapter"
              key={chapter.stableChapterId || index}
            >
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
                        onChange={(event) =>
                          changeChapterTitle(
                            chapter.stableChapterId,
                            event.target.value,
                          )
                        }
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
                      <button
                        onClick={() => openChapterEditor(chapter)}
                        type="button"
                      >
                        {storyPreview
                          ? "Edit the story >"
                          : "+ Write the story >"}
                      </button>
                    </>
                  );
                })()}
              </div>
              <button
                aria-label={`Remove chapter ${index + 1}`}
                onClick={() => removeChapter(chapter)}
                type="button"
              >
                <FiX />
              </button>
            </div>
          ))}
          {p.chapters.length < 3 ? (
            <button
              className="seen-compose-add-chapter"
              onClick={addChapter}
              type="button"
            >
              <FiPlus aria-hidden="true" />{" "}
              {p.chapters.length
                ? "Add chapter"
                : "Chapter 1 - where it starts"}
            </button>
          ) : null}
        </div>

        <div className="seen-compose-settings" aria-label="Seen settings">
          <SettingsRow Icon={FiTag} label="Category" onClick={() => setSettingsSheet("category")} value={p.category || "-"} />
          <SettingsRow Icon={FiGrid} label="Series" onClick={() => { setSeriesError(""); setSettingsSheet("series"); }} value={selectedSeriesLabel} />
          <SettingsRow Icon={AudienceIcon} label="Audience" onClick={() => setSettingsSheet("audience")} value={selectedAudience.label} />
        </div>
        {error ? <p className="seen-compose-error" role="alert">{error}</p> : null}
        {statusText ? <p className="seen-compose-status" role="status">{statusText}</p> : null}
        {linkOnlyShare?.url ? (
          <div className="seen-compose-share-link">
            <span>{linkOnlyShare.url}</span>
            <button onClick={copyShareLink} type="button"><FiCopy aria-hidden="true" />{linkOnlyShare.copied ? "Copied" : "Copy link"}</button>
          </div>
        ) : null}

        <button className="seen-compose-publish" disabled={Boolean(uploading || submitting)} onClick={submit} type="button">{submitting ? "Publishing..." : p.publishedVersion ? "Republish" : "Publish"}</button>
      </div>
      {settingsSheet === "category" ? (
        <CategorySheet
          categories={categoryOptions}
          onClose={() => setSettingsSheet("")}
          onSelect={(category) => {
            change({ category });
            setSettingsSheet("");
          }}
          value={p.category}
        />
      ) : null}
      {settingsSheet === "series" ? (
        <SeriesSheet
          creating={seriesCreating}
          error={seriesError}
          items={savedSeries}
          loading={seriesLoading}
          newSeries={newSeries}
          onClose={() => setSettingsSheet("")}
          onCreate={createNewSeries}
          onInput={(value) => {
            setNewSeries(value.slice(0, 24));
            setSeriesError("");
          }}
          onRemove={() => {
            change({ series: null, seriesId: null });
            setSettingsSheet("");
          }}
          onSelect={(item) => {
            change({ series: item, seriesId: item.id });
            setSettingsSheet("");
          }}
          selectedId={p.seriesId || p.series?.id || ""}
        />
      ) : null}
      {settingsSheet === "audience" ? (
        <AudienceSheet
          onClose={() => setSettingsSheet("")}
          onSelect={(visibility) => {
            change({ visibility });
            setSettingsSheet("");
          }}
          value={p.visibility || "PUBLIC"}
        />
      ) : null}
    </section>
  );
}
