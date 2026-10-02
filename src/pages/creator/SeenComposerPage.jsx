/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  FiPause,
  FiPlay,
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
import { profileService } from "../../services/profileService";
import { voiceService } from "../../services/voiceService";
import { searchService } from "../../services/searchService";
import EntityAttachmentPicker from "../../components/contentEntities/EntityAttachmentPicker";
import { normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import { resolveMediaUrl } from "../../utils/media";

const empty = { allowDownload: false, attachedEntities: [], entityRefs: [], experienceLocation: "", kind: "SEEN", taggedPeople: [], title: "", summary: "", description: "", category: "", series: null, seriesId: null, visibility: "PUBLIC", tags: [], chapters: [] };
const fallbackCategories = ["Travel", "Fitness", "Lifestyle", "Business", "Tech", "Psychology", "Fashion", "Beauty", "Wellness", "Food"];
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
const RICH_TEXT_COLORS = [
  "#ffffff",
  "#f6e85f",
  "#c7ff5f",
  "#6ecf97",
  "#9ccbff",
  "#b8a7ff",
  "#ff78b6",
  "#ff8a55",
  "#111820",
];
const MUTED_TEXT_COLORS = [
  "#9aa3ad",
  "#9b8f3a",
  "#6f8d44",
  "#4b8662",
  "#5d7896",
  "#675a9a",
  "#914870",
  "#9a5b3e",
  "#242b35",
];

function normalizeColorValue(value = "") {
  const color = String(value || "").trim().toLowerCase();
  if (!color || ["transparent", "initial", "inherit", "currentcolor"].includes(color)) return "";
  if (color.startsWith("#")) {
    if (color.length === 4) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    return color;
  }
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgb) return color;
  return `#${rgb.slice(1, 4).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

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
      || publication.taggedPeople?.length
      || publication.experienceLocation?.trim()
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
  const numeric = Number(seconds);
  const rounded = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 0;
  const minutes = Math.floor(rounded / 60);
  const rest = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function safeUrlMeta(value = "") {
  try {
    const url = new URL(value);
    const protocolAllowed = url.protocol === "http:" || url.protocol === "https:";
    const hostname = url.hostname.toLowerCase();
    const validHostname = hostname === "localhost"
      || hostname.includes(".")
      || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
    if (!protocolAllowed || !validHostname) return { domain: "", href: "" };
    return {
      domain: hostname.replace(/^www\./i, ""),
      href: url.href,
    };
  } catch {
    return { domain: "", href: "" };
  }
}

function keyPointItems(block = {}) {
  const metadataItems = Array.isArray(block.metadata?.listItems)
    ? block.metadata.listItems
    : [];
  return (metadataItems.length ? metadataItems : String(block.text || "").split("\n"))
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function listBlockItems(block = {}) {
  const metadataItems = Array.isArray(block.metadata?.listItems)
    ? block.metadata.listItems
    : Array.isArray(block.metadata?.items)
      ? block.metadata.items
      : [];
  return (metadataItems.length ? metadataItems : String(block.text || "").split("\n"))
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function voiceTranscript(block = {}) {
  return String(block.metadata?.transcript || block.media?.transcript || block.metadata?.caption || block.metadata?.label || "").trim();
}

function imageOverlayText(block = {}) {
  return String(block.metadata?.overlayText || block.metadata?.caption || "").trim();
}

function imageOverlayColor(block = {}) {
  return block.metadata?.overlayColor || "#ffffff";
}

function imageOverlayFillColor(block = {}) {
  return block.metadata?.overlayFillColor || "";
}

function imageOverlayStyle(block = {}) {
  return {
    bold: block.metadata?.overlayBold !== false,
    italic: Boolean(block.metadata?.overlayItalic),
    size: block.metadata?.overlaySize || "",
    strike: Boolean(block.metadata?.overlayStrike),
  };
}

function ChapterVoiceBlock({ block, busy = false, onUpdateBlock }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [measuredDuration, setMeasuredDuration] = useState(Number(block.media?.duration) || 0);
  const [elapsed, setElapsed] = useState(0);
  const [playError, setPlayError] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const transcript = voiceTranscript(block);

  const measureVoiceDuration = (audio) => {
    const nextDuration = Number(audio.duration);
    if (Number.isFinite(nextDuration) && nextDuration > 0) {
      setMeasuredDuration(nextDuration);
      return;
    }
    if (nextDuration === Infinity && !audio.dataset.durationProbe) {
      audio.dataset.durationProbe = "true";
      const resolveDuration = () => {
        const resolved = Number(audio.duration);
        if (Number.isFinite(resolved) && resolved > 0) setMeasuredDuration(resolved);
        audio.currentTime = 0;
      };
      audio.addEventListener("timeupdate", resolveDuration, { once: true });
      audio.currentTime = 1e10;
    }
  };

  useEffect(() => {
    setTranscriptDraft(transcript);
    setEditingTranscript(false);
  }, [block.id, transcript]);

  const saveTranscript = async () => {
    const nextTranscript = transcriptDraft.trim().slice(0, 2000);
    if (!nextTranscript || nextTranscript === transcript) {
      setEditingTranscript(false);
      return;
    }
    const saved = await Promise.resolve(onUpdateBlock?.(block.id, {
      metadata: {
        ...(block.metadata || {}),
        transcript: nextTranscript,
      },
    })).catch(() => false);
    if (saved !== false) setEditingTranscript(false);
  };

  const togglePlayback = async (event) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setPlayError(false);
      await audio.play().catch(() => setPlayError(true));
    } else {
      audio.pause();
    }
  };

  return (
    <div className="seen-chapter-voice-wrap">
      <div className="seen-chapter-voice-block">
        <audio
          onDurationChange={(event) => measureVoiceDuration(event.currentTarget)}
          onEnded={() => { setElapsed(0); setPlaying(false); }}
          onLoadedMetadata={(event) => measureVoiceDuration(event.currentTarget)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onTimeUpdate={(event) => setElapsed(Number(event.currentTarget.currentTime) || 0)}
          preload="metadata"
          ref={audioRef}
          src={block.media.secureUrl}
        />
        <button aria-label={playing ? "Pause voice" : "Play voice"} className="seen-chapter-voice-play" onClick={togglePlayback} type="button">
          {playing ? <FiPause /> : <FiPlay />}
        </button>
        <div aria-hidden="true" className="seen-chapter-waveform">
          {Array.from({ length: 24 }, (_, index) => (
            <i key={index} style={{ height: `${10 + ((index * 7) % 26)}px` }} />
          ))}
        </div>
        <b>{formatDuration(measuredDuration || elapsed)}</b>
        {editingTranscript ? (
          <div className="seen-chapter-voice-transcript-edit">
            <textarea
              autoFocus
              maxLength={2000}
              onChange={(event) => setTranscriptDraft(event.target.value)}
              placeholder="Write the transcript..."
              value={transcriptDraft}
            />
            <button disabled={busy || !transcriptDraft.trim()} onClick={saveTranscript} type="button">Save transcript</button>
          </div>
        ) : transcript ? (
          <p className="seen-chapter-voice-transcript" onDoubleClick={() => setEditingTranscript(true)}>{transcript}</p>
        ) : (
          <p className="seen-chapter-voice-transcript is-muted">
            {playError ? "Audio could not be played. Try reloading the page." : "Transcript unavailable for this voice."}
            <button disabled={busy} onClick={() => setEditingTranscript(true)} type="button">Add transcript</button>
          </p>
        )}
      </div>
    </div>
  );
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

function CoverSheet({ hasCover, onClose, onUpload }) {
  return (
    <SelectionSheet onClose={onClose} subtitle="4:5 - shown in the feed and on the title page" title="Cover">
      <div className="seen-cover-sheet-body">
        <div className="seen-cover-sheet-preview">{hasCover ? <FiCheck /> : <FiImage />}</div>
        <div>
          <button className="seen-cover-upload" onClick={onUpload} type="button"><FiUpload /> {hasCover ? "Replace" : "Upload"}</button>
          <small>{hasCover ? "Cover selected" : "Choose a photo from your device"}</small>
        </div>
      </div>
      <button className="seen-settings-done" onClick={onClose} type="button">Done</button>
    </SelectionSheet>
  );
}

function PeopleSheet({ onChange, onClose, selectedIds, selectedPeople }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(selectedPeople);
  const [results, setResults] = useState(selectedPeople);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      profileService.getOwnConnections("followers"),
      profileService.getOwnConnections("following"),
    ]).then(([followersResponse, followingResponse]) => {
      if (!active) return;
      const followers = followersResponse.data?.data?.accounts || [];
      const following = followingResponse.data?.data?.accounts || [];
      const followerIds = new Set(followers.map((person) => String(person.id)));
      const followingIds = new Set(following.map((person) => String(person.id)));
      const people = [...followers, ...following].reduce((items, person) => {
        const id = String(person.id);
        if (items.some((item) => item.id === id)) return items;
        const mutual = followerIds.has(id) && followingIds.has(id);
        items.push({
          ...person,
          id,
          subtitle: mutual ? "You follow each other" : followerIds.has(id) ? "Follows you" : "You follow them",
          title: person.name || person.username,
        });
        return items;
      }, []).slice(0, 24);
      const merged = [...selectedPeople, ...people].filter((person, index, all) => all.findIndex((item) => item.id === person.id) === index);
      setSuggestions(merged);
      setResults(merged);
    }).catch(() => {
      if (active) { setSuggestions(selectedPeople); setResults(selectedPeople); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setResults(suggestions); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchService.search({ q: value, type: "people", limit: 20 }, controller.signal)
        .then((data) => setResults(data.items || []))
        .catch(() => setResults([]))
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, suggestions]);
  const toggle = (person) => {
    const selected = selectedIds.includes(person.id);
    if (!selected && selectedIds.length >= 5) return;
    onChange(selected ? selectedIds.filter((id) => id !== person.id) : [...selectedIds, person.id], person);
  };
  const initials = (person) => String(person.title || person.name || person.username || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <SelectionSheet onClose={onClose} subtitle="Up to 5. They're notified and appear on the title page." title="Tag people">
      <input className="seen-settings-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search people" value={query} />
      <div className="seen-settings-options seen-people-results">
        {loading ? <p className="seen-settings-empty">Searching people...</p> : null}
        {!loading && query.trim().length < 2 && !results.length ? <p className="seen-settings-empty">No followers or followed people yet.</p> : null}
        {!loading && query.trim().length >= 2 && !results.length ? <p className="seen-settings-empty">No people found.</p> : null}
        {results.map((person) => {
          const selected = selectedIds.includes(person.id);
          const avatar = resolveMediaUrl(person.image || person.avatar);
          return <button aria-pressed={selected} className={`seen-person-option ${selected ? "is-selected" : ""}`} key={person.id} onClick={() => toggle(person)} type="button">
            <span className="seen-person-avatar">{avatar ? <img alt="" src={avatar} /> : initials(person)}</span>
            <span className="seen-person-copy"><b>{person.title || person.name || person.username}</b><small>{person.subtitle || (person.following ? "You follow them" : `@${person.metadata?.username || person.username || ""}`)}</small></span>
            {selected ? <FiCheck aria-hidden="true" /> : null}
          </button>;
        })}
      </div>
      <button className="seen-settings-done is-primary" onClick={onClose} type="button">Done</button>
    </SelectionSheet>
  );
}

function LocationSheet({ onClose, onSelect, value }) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const search = query.trim();
    if (search.length < 2 || search === value) { setResults([]); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchService.searchLocations({ q: search, language: navigator.language || "en" }, controller.signal)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, value]);
  return (
    <SelectionSheet onClose={onClose} title="Location">
      <input className="seen-settings-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search a country or city" value={query} />
      <div className="seen-settings-options">
        {value ? <SheetRow Icon={FiMapPin} label={value} onClick={() => onSelect("")} selected /> : null}
        {loading ? <p className="seen-settings-empty">Searching locations...</p> : null}
        {results.map((place) => <SheetRow description={place.subtitle} Icon={FiMapPin} key={place.id} label={place.name || place.label} onClick={() => onSelect(place.label)} />)}
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

function SettingsRow({ Icon, label, onClick, toggle = false, value }) {
  return (
    <button aria-pressed={toggle ? value === "On" : undefined} className={`seen-compose-settings-row ${toggle ? "is-toggle" : ""}`} onClick={onClick} type="button">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <b>{value}</b>
      {toggle ? <i aria-hidden="true" className={value === "On" ? "is-on" : ""}><em /></i> : <FiChevronRight aria-hidden="true" />}
    </button>
  );
}

export function SeenChapterEditor({ busy, chapter, error, onAddBlocks, onAddPlace, onDone, onMediaUpload, onRemoveBlock, onReorderBlocks, onStoryChange, onUpdateBlock, story, status }) {
  const photoInput = useRef(null);
  const voiceInput = useRef(null);
  const textareaRef = useRef(null);
  const imageTextRefs = useRef({});
  const structuredFormRef = useRef(null);
  const textToolsRef = useRef(null);
  const addMenuRef = useRef(null);
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
  const [editorHintVisible, setEditorHintVisible] = useState(true);
  const [textToolsOpen, setTextToolsOpen] = useState(false);
  const [activeTextFormats, setActiveTextFormats] = useState({
    bold: false,
    fontSize: "",
    foreColor: "",
    hiliteColor: "",
    italic: false,
  });
  const [activeImageTextBlockId, setActiveImageTextBlockId] = useState("");
  const [imageOverlayDrafts, setImageOverlayDrafts] = useState({});
  const [imageOverlayColorDrafts, setImageOverlayColorDrafts] = useState({});
  const [imageOverlayFillColorDrafts, setImageOverlayFillColorDrafts] = useState({});
  const [imageOverlayStyleDrafts, setImageOverlayStyleDrafts] = useState({});
  const [textToolPosition, setTextToolPosition] = useState({
    left: 32,
    top: 120,
  });
  const [pendingPhoto, setPendingPhoto] = useState(null);
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
      !["TEXT", "KEY_POINT", "LINK", "LIST", "POLL"].includes(block.type) &&
      !block.metadata?.location,
  );
  const structuredBlocks = editorBlocks.filter(
    (block) =>
      ["KEY_POINT", "LINK", "LIST", "POLL"].includes(block.type) &&
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
    setEditorHintVisible(true);
    setImageOverlayDrafts({});
    setImageOverlayColorDrafts({});
    setImageOverlayFillColorDrafts({});
    setImageOverlayStyleDrafts({});
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

  useEffect(
    () => () => {
      if (pendingPhoto?.url) URL.revokeObjectURL(pendingPhoto.url);
    },
    [pendingPhoto?.url],
  );

  useEffect(() => {
    if (!textToolsOpen && !actionsOpen && !pendingPhoto && !activeImageTextBlockId) return undefined;
    const closeFloatingTools = (event) => {
      const target = event.target;
      if (
        textToolsOpen &&
        textToolsRef.current &&
        !textToolsRef.current.contains(target) &&
        !textareaRef.current?.contains(target)
      ) {
        setTextToolsOpen(false);
      }
      if (
        actionsOpen &&
        addMenuRef.current &&
        !addMenuRef.current.contains(target) &&
        !target.closest?.(".seen-chapter-editor-add")
      ) {
        setActionsOpen(false);
      }
      if (
        activeImageTextBlockId &&
        !target.closest?.(".seen-chapter-image-stage") &&
        !target.closest?.(".seen-chapter-image-color-panel")
      ) {
        setActiveImageTextBlockId("");
      }
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setTextToolsOpen(false);
      setActionsOpen(false);
      setActiveImageTextBlockId("");
      setPendingPhoto((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return null;
      });
    };
    document.addEventListener("mousedown", closeFloatingTools);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeFloatingTools);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionsOpen, activeImageTextBlockId, pendingPhoto, textToolsOpen]);

  useLayoutEffect(() => {
    if (!textToolsOpen || !textToolsRef.current) return undefined;
    const margin = 12;
    const keepTextToolsInViewport = () => {
      const box = textToolsRef.current?.getBoundingClientRect();
      if (!box) return;
      setTextToolPosition((current) => {
        const nextLeft = Math.max(
          margin,
          Math.min(current.left, window.innerWidth - box.width - margin),
        );
        const nextTop = Math.max(
          margin,
          Math.min(current.top, window.innerHeight - box.height - margin),
        );
        if (Math.abs(nextLeft - current.left) < 1 && Math.abs(nextTop - current.top) < 1)
          return current;
        return { left: nextLeft, top: nextTop };
      });
    };
    keepTextToolsInViewport();
    window.addEventListener("resize", keepTextToolsInViewport);
    return () => window.removeEventListener("resize", keepTextToolsInViewport);
  }, [textToolsOpen, textToolPosition.left, textToolPosition.top]);

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

  const transcribeVoiceFile = async (file) => {
    if (!file) return {};
    setVoiceError("");
    try {
      const result = await voiceService.transcribeWallVoice(file);
      const transcript = String(result.transcript || "").trim();
      return {
        transcript,
        transcriptConfidence: result.confidence ?? null,
        transcriptLanguage: result.detectedLanguage || result.language || "",
        transcriptProvider: result.provider || "",
      };
    } catch (requestError) {
      const message = requestError?.response?.data?.message || "";
      if (message && !/not configured|no speech/i.test(message)) {
        setVoiceError(`${message} You can still use the voice.`);
      }
      return {};
    }
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
    setActiveTextFormats({
      bold: document.queryCommandState("bold"),
      fontSize: String(document.queryCommandValue("fontSize") || ""),
      foreColor: normalizeColorValue(document.queryCommandValue("foreColor")),
      hiliteColor: normalizeColorValue(document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor")),
      italic: document.queryCommandState("italic"),
    });
    setTextToolPosition({
      left: Math.max(12, box.left),
      top: Math.max(76, box.bottom + 10),
    });
    setTextToolsOpen(true);
  };

  const rememberImageTextSelection = (blockId, element) => {
    const selection = window.getSelection();
    if (
      !selection?.rangeCount ||
      !element?.contains(selection.anchorNode) ||
      !element.contains(selection.focusNode)
    ) {
      setActiveImageTextBlockId("");
      return;
    }
    setActiveImageTextBlockId(blockId);
  };

  const closePendingPhoto = () => {
    setPendingPhoto((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const addPendingPhoto = () => {
    if (!pendingPhoto?.file) return;
    const file = pendingPhoto.file;
    closePendingPhoto();
    onMediaUpload("IMAGE", file);
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
    setActiveTextFormats({
      bold: document.queryCommandState("bold"),
      fontSize: String(document.queryCommandValue("fontSize") || ""),
      foreColor: normalizeColorValue(document.queryCommandValue("foreColor")),
      hiliteColor: normalizeColorValue(document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor")),
      italic: document.queryCommandState("italic"),
    });
  };
  const toggleTextFormat = (command, value = null) => {
    const active =
      command === "fontSize"
        ? activeTextFormats.fontSize === String(value)
        : Boolean(activeTextFormats[command]);
    applyTextFormat(active ? "removeFormat" : command, active ? null : value);
  };
  const toggleTextColor = (command, color) => {
    const formatKey = command === "hiliteColor" ? "hiliteColor" : "foreColor";
    const activeColor = normalizeColorValue(activeTextFormats[formatKey]);
    const nextColor = normalizeColorValue(color);
    applyTextFormat(activeColor === nextColor ? "removeFormat" : command, color);
  };
  const textPaletteRows = [
    { command: "foreColor", colors: RICH_TEXT_COLORS, label: "Aa", shape: "round" },
    { command: "hiliteColor", colors: RICH_TEXT_COLORS, label: "Fill", shape: "soft" },
    { command: "foreColor", colors: MUTED_TEXT_COLORS, label: "Tone", shape: "muted" },
  ];
  const saveImageOverlayText = (block, rawText) => {
    const overlayText = String(rawText || "")
      .trim()
      .slice(0, 180);
    const overlayColor = imageOverlayColorDrafts[block.id] || block.metadata?.overlayColor || "";
    const overlayFillColor = imageOverlayFillColorDrafts[block.id] || block.metadata?.overlayFillColor || "";
    const overlayStyle = imageOverlayStyleDrafts[block.id] || imageOverlayStyle(block);
    if (
      overlayText === imageOverlayText(block) &&
      normalizeColorValue(overlayColor) === normalizeColorValue(block.metadata?.overlayColor || "") &&
      normalizeColorValue(overlayFillColor) === normalizeColorValue(block.metadata?.overlayFillColor || "")
    ) return Promise.resolve(true);
    return Promise.resolve(
      onUpdateBlock(block.id, {
        metadata: {
          ...(block.metadata || {}),
          overlayText,
          ...(overlayColor ? { overlayColor } : {}),
          ...(overlayFillColor ? { overlayFillColor } : {}),
          overlayBold: overlayStyle.bold,
          overlayItalic: overlayStyle.italic,
          overlaySize: overlayStyle.size,
          overlayStrike: overlayStyle.strike,
        },
      }),
    ).catch(() => false);
  };
  const updateImageOverlayStyle = (block, patch = {}) => {
    const currentStyle = imageOverlayStyleDrafts[block.id] || imageOverlayStyle(block);
    const nextStyle = { ...currentStyle, ...patch };
    const overlayText = imageTextRefs.current[block.id]?.textContent || imageOverlayDrafts[block.id] || imageOverlayText(block);
    const overlayColor = imageOverlayColorDrafts[block.id] || block.metadata?.overlayColor || "";
    const overlayFillColor = imageOverlayFillColorDrafts[block.id] || block.metadata?.overlayFillColor || "";
    const nextMetadata = {
      ...(block.metadata || {}),
      overlayBold: nextStyle.bold,
      overlayItalic: nextStyle.italic,
      overlaySize: nextStyle.size,
      overlayStrike: nextStyle.strike,
    };
    if (overlayText.trim()) nextMetadata.overlayText = overlayText.trim().slice(0, 180);
    if (overlayColor) nextMetadata.overlayColor = overlayColor;
    if (overlayFillColor) nextMetadata.overlayFillColor = overlayFillColor;
    setImageOverlayStyleDrafts((current) => ({ ...current, [block.id]: nextStyle }));
    return Promise.resolve(onUpdateBlock(block.id, { metadata: nextMetadata })).catch(() => false);
  };
  const currentImageOverlayStyle = (block) =>
    imageOverlayStyleDrafts[block.id] || imageOverlayStyle(block);
  const flushImageOverlayText = async () => {
    const saves = attachmentBlocks
      .filter((block) => block.type === "IMAGE")
      .map((block) => {
        const element = imageTextRefs.current[block.id];
        return element ? saveImageOverlayText(block, element.textContent) : true;
      });
    await Promise.all(saves);
  };
  const finishChapterEditing = async () => {
    await flushImageOverlayText();
    if (structuredEditor) {
      await saveStructuredBlock();
      return;
    }
    onDone();
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
        : type === "LIST"
          ? {
              label: "",
              url: "",
              items: block ? listBlockItems(block) : ["", "", ""],
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
      const urlMeta = safeUrlMeta(structuredDraft.url.trim());
      const block = {
        id: structuredEditor.blockId || newBlockId(),
        type: "LINK",
        label: structuredDraft.label.trim() || urlMeta.domain,
        url: urlMeta.href,
      };
      if (!urlMeta.href)
        return setVoiceError("Add a full http or https link.");
      const saved = await (structuredEditor.blockId
        ? onUpdateBlock(block.id, block)
        : onAddBlocks([block]));
      if (saved === false) return;
    } else if (structuredEditor.type === "LIST") {
      const renderedItems = structuredFormRef.current
        ? [...structuredFormRef.current.querySelectorAll('input[name="keyPoint"]')].map((input) => input.value)
        : structuredDraft.items;
      const items = renderedItems
        .map((item) => item.trim())
        .filter(Boolean);
      if (!items.length) return setVoiceError("Add at least one list item.");
      let saved;
      if (structuredEditor.blockId)
        saved = await onUpdateBlock(structuredEditor.blockId, {
          metadata: { listItems: items },
          text: items.join("\n"),
          type: "LIST",
        });
      else
        saved = await onAddBlocks([
          {
            id: newBlockId(),
            metadata: { listItems: items },
            text: items.join("\n"),
            type: "LIST",
          },
        ]);
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
            drag a block - move - double-tap - edit
          </p>
        </div>
        <button disabled={busy} onClick={finishChapterEditing} type="button">
          {busy ? "Saving" : "Done"}
        </button>
      </header>

      {textToolsOpen ? (
        <div
          className="seen-chapter-text-tools"
          role="toolbar"
          aria-label="Text formatting"
          ref={textToolsRef}
          onMouseDown={(event) => event.preventDefault()}
          style={{ left: textToolPosition.left, top: textToolPosition.top }}
        >
          <div className="seen-chapter-text-format-row">
            <button
              aria-label="Bold"
              className={activeTextFormats.bold ? "is-selected" : ""}
              onClick={() => applyTextFormat("bold")}
              type="button"
            >
              <b>B</b>
            </button>
            <button
              aria-label="Italic"
              className={activeTextFormats.italic ? "is-selected" : ""}
              onClick={() => applyTextFormat("italic")}
              type="button"
            >
              <i>I</i>
            </button>
            <button
              aria-label="Small text"
              className={activeTextFormats.fontSize === "3" ? "is-selected" : ""}
              onClick={() => toggleTextFormat("fontSize", "3")}
              type="button"
            >
              S
            </button>
            <button
              aria-label="Large text"
              className={activeTextFormats.fontSize === "6" ? "is-selected" : ""}
              onClick={() => toggleTextFormat("fontSize", "6")}
              type="button"
            >
              L
            </button>
            <button
              aria-label="Clear text formatting"
              onClick={() => applyTextFormat("removeFormat")}
              type="button"
            >
              Tx
            </button>
          </div>
          <div className="seen-chapter-color-rows">
            {textPaletteRows.map((row) => (
              <div className="seen-chapter-color-row" key={`${row.command}-${row.label}`}>
                <b>{row.label}</b>
                {row.colors.map((color) => (
                  <button
                    aria-label={`${row.command === "hiliteColor" ? "Highlight" : "Use"} ${color}`}
                    className={`is-color is-${row.shape} ${
                      normalizeColorValue(activeTextFormats[row.command === "hiliteColor" ? "hiliteColor" : "foreColor"]) === normalizeColorValue(color)
                        ? "is-selected"
                        : ""
                    }`}
                    key={color}
                    onClick={() => toggleTextColor(row.command, color)}
                    style={{ "--text-color": color }}
                    type="button"
                  />
                ))}
              </div>
            ))}
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
          data-placeholder={"Just write.\n\nSelect text - color appears."}
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
              className={`seen-chapter-attachment seen-chapter-sortable-block is-${String(block.type || "media").toLowerCase()} ${draggingBlockId === block.id ? "is-dragging" : ""}`}
              draggable={activeImageTextBlockId !== block.id}
              key={block.id}
              onDragEnd={() => setDraggingBlockId("")}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(event) => {
                if (activeImageTextBlockId === block.id) {
                  event.preventDefault();
                  return;
                }
                setDraggingBlockId(block.id);
              }}
              onDrop={() => dropBlock(block.id)}
              style={{ order: visualOrder(block.id) }}
            >
              <button
                aria-label={`Drag ${mediaLabel(block)} to reorder`}
                className="seen-chapter-attachment-drag"
                draggable
                onDragEnd={() => setDraggingBlockId("")}
                onDragStart={(event) => {
                  event.stopPropagation();
                  setDraggingBlockId(block.id);
                }}
                type="button"
              >⋮⋮</button>
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
                <div className="seen-chapter-image-stage">
                  <img alt="Chapter attachment" src={block.media.secureUrl} />
                  {!imageOverlayText(block) && !imageOverlayDrafts[block.id]?.trim() && activeImageTextBlockId !== block.id ? (
                    <button
                      className="seen-chapter-image-write-prompt"
                      onClick={(event) => {
                        event.stopPropagation();
                        const stage = event.currentTarget.parentElement;
                        setActiveImageTextBlockId(block.id);
                        window.requestAnimationFrame(() => {
                          stage?.querySelector(".seen-chapter-image-text")?.focus();
                        });
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      Write on it...
                    </button>
                  ) : null}
                  <div
                    className={`seen-chapter-image-text ${imageOverlayText(block) ? "" : "is-empty"}`}
                    contentEditable
                    data-placeholder="Write on it..."
                    draggable={false}
                    aria-label="Write on photo"
                    onBlur={(event) => {
                      const nextText = event.currentTarget.textContent || "";
                      setImageOverlayDrafts((current) => ({ ...current, [block.id]: nextText }));
                      saveImageOverlayText(block, nextText);
                      if (!nextText.trim()) {
                        setActiveImageTextBlockId("");
                      }
                    }}
                    onClick={() => setActiveImageTextBlockId(block.id)}
                    onDragStart={(event) => event.stopPropagation()}
                    onFocus={() => setActiveImageTextBlockId(block.id)}
                    onInput={(event) => {
                      const nextText = event.currentTarget.textContent || "";
                      setActiveImageTextBlockId(block.id);
                      setImageOverlayDrafts((current) => ({ ...current, [block.id]: nextText }));
                    }}
                    onKeyUp={(event) =>
                      rememberImageTextSelection(block.id, event.currentTarget)
                    }
                    onMouseUp={(event) =>
                      rememberImageTextSelection(block.id, event.currentTarget)
                    }
                    onPointerDown={(event) => event.stopPropagation()}
                    ref={(node) => {
                      if (node) imageTextRefs.current[block.id] = node;
                      else delete imageTextRefs.current[block.id];
                    }}
                    role="textbox"
                    style={{
                      "--overlay-text-color": imageOverlayColorDrafts[block.id] || imageOverlayColor(block),
                      backgroundColor: imageOverlayFillColorDrafts[block.id] || imageOverlayFillColor(block) || undefined,
                      fontSize:
                        currentImageOverlayStyle(block).size === "small"
                          ? "13px"
                          : currentImageOverlayStyle(block).size === "large"
                            ? "20px"
                            : undefined,
                      fontStyle: currentImageOverlayStyle(block).italic ? "italic" : undefined,
                      fontWeight: currentImageOverlayStyle(block).bold ? 900 : 650,
                      textDecoration: currentImageOverlayStyle(block).strike ? "line-through" : undefined,
                    }}
                    suppressContentEditableWarning
                  >
                    {imageOverlayText(block)}
                  </div>
                  {activeImageTextBlockId === block.id ? (
                    <div
                      aria-label="Image text colors"
                      className="seen-chapter-text-tools seen-chapter-image-color-panel"
                      role="toolbar"
                      onMouseDown={(event) => event.preventDefault()}
                    >
                      <div className="seen-chapter-text-format-row">
                        <button
                          aria-label="Bold image text"
                          className={currentImageOverlayStyle(block).bold ? "is-selected" : ""}
                          onClick={() => updateImageOverlayStyle(block, { bold: !currentImageOverlayStyle(block).bold })}
                          type="button"
                        >
                          <b>B</b>
                        </button>
                        <button
                          aria-label="Italic image text"
                          className={currentImageOverlayStyle(block).italic ? "is-selected" : ""}
                          onClick={() => updateImageOverlayStyle(block, { italic: !currentImageOverlayStyle(block).italic })}
                          type="button"
                        >
                          <i>I</i>
                        </button>
                        <button
                          aria-label="Small image text"
                          className={currentImageOverlayStyle(block).size === "small" ? "is-selected" : ""}
                          onClick={() => updateImageOverlayStyle(block, { size: currentImageOverlayStyle(block).size === "small" ? "" : "small" })}
                          type="button"
                        >
                          S
                        </button>
                        <button
                          aria-label="Large image text"
                          className={currentImageOverlayStyle(block).size === "large" ? "is-selected" : ""}
                          onClick={() => updateImageOverlayStyle(block, { size: currentImageOverlayStyle(block).size === "large" ? "" : "large" })}
                          type="button"
                        >
                          L
                        </button>
                        <button
                          aria-label="Clear image text formatting"
                          onClick={() => updateImageOverlayStyle(block, { bold: true, italic: false, size: "", strike: false })}
                          type="button"
                        >
                          Tx
                        </button>
                      </div>
                      <div className="seen-chapter-color-rows">
                        {textPaletteRows.map((row) => (
                          <div className="seen-chapter-color-row" key={`image-${row.command}-${row.label}`}>
                            <b>{row.label}</b>
                            {row.colors.map((color) => (
                              <button
                                aria-label={`Use ${color} image text`}
                                className={`is-color is-${row.shape} ${
                                  normalizeColorValue(
                                    row.command === "hiliteColor"
                                      ? imageOverlayFillColorDrafts[block.id] || imageOverlayFillColor(block)
                                      : imageOverlayColorDrafts[block.id] || imageOverlayColor(block),
                                  ) === normalizeColorValue(color) ? "is-selected" : ""
                                }`}
                                key={`${row.label}-${color}`}
                                onClick={() => {
                                  const isFillColor = row.command === "hiliteColor";
                                  const currentColor = isFillColor
                                    ? imageOverlayFillColorDrafts[block.id] || imageOverlayFillColor(block)
                                    : imageOverlayColorDrafts[block.id] || imageOverlayColor(block);
                                  const sameColor = normalizeColorValue(currentColor) === normalizeColorValue(color);
                                  const overlayText = imageTextRefs.current[block.id]?.textContent || imageOverlayDrafts[block.id] || imageOverlayText(block);
                                  const nextMetadata = { ...(block.metadata || {}) };
                                  if (overlayText.trim()) nextMetadata.overlayText = overlayText.trim().slice(0, 180);
                                  if (isFillColor) {
                                    if (sameColor) delete nextMetadata.overlayFillColor;
                                    else nextMetadata.overlayFillColor = color;
                                    setImageOverlayFillColorDrafts((current) => ({ ...current, [block.id]: sameColor ? "" : color }));
                                  } else {
                                    if (sameColor) delete nextMetadata.overlayColor;
                                    else nextMetadata.overlayColor = color;
                                    setImageOverlayColorDrafts((current) => ({ ...current, [block.id]: sameColor ? "#ffffff" : color }));
                                  }
                                  Promise.resolve(
                                    onUpdateBlock(block.id, {
                                      metadata: nextMetadata,
                                    }),
                                  ).catch(() => {});
                                }}
                                style={{ "--text-color": color }}
                                type="button"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                      <button
                        aria-label="Close image text colors"
                        className="seen-chapter-text-tools-close"
                        onClick={() => setActiveImageTextBlockId("")}
                        type="button"
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : null}
                </div>
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
                <ChapterVoiceBlock block={block} busy={busy} onUpdateBlock={onUpdateBlock} />
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
                onClick={() => openStructuredEditor(block.type === "KEY_POINT" ? "LIST" : block.type, block)}
                type="button"
              >
                {block.type === "LIST" || (block.type === "KEY_POINT" && keyPointItems(block).length) ? <ul className="seen-list-preview">{(listBlockItems(block).length ? listBlockItems(block) : keyPointItems(block)).map((item, itemIndex) => <li key={`${block.id}-${itemIndex}`}>{item}</li>)}</ul> : null}
                {block.type === "LINK" ? <><span><FiLink /></span><span><small>LINK</small><b>{block.label || safeUrlMeta(block.url).domain || "Open link"}</b><em>{safeUrlMeta(block.url).domain || block.url}</em><i>Open link <FiArrowRight /></i></span></> : null}
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
        <p className="seen-chapter-editor-status" key={status} role="status">
          {status}
        </p>
      ) : null}
      {voiceOpen ? (
        <section
          className="seen-chapter-voice-recorder"
          aria-label="Voice recorder"
        >
          <span className="seen-chapter-sheet-handle" aria-hidden="true" />
          <button
            aria-label={voiceState === "recording" ? "Stop recording" : "Start recording"}
            className={`seen-chapter-voice-main ${voiceState === "recording" ? "is-recording" : ""}`}
            onClick={voiceState === "recording" ? stopVoiceRecording : startVoiceRecording}
            type="button"
          >
            {voiceState === "recording" ? <i /> : <FiMic />}
          </button>
          <h2>{voiceState === "recording" ? formatDuration(voiceSeconds) : recordedVoice ? "Ready to add" : "Just talk"}</h2>
          <p className="seen-chapter-voice-copy">You’ll get both — your voice and the text. Remove either with one tap.</p>
          {voiceState === "recording" ? (
            <p className="seen-chapter-recording-label">Recording… tap the square when you’re done.</p>
          ) : null}
          {recordedVoice ? (
            <audio controls preload="metadata" src={recordedVoice.url} />
          ) : null}
          {voiceError ? <p>{voiceError}</p> : null}
          <div className="seen-chapter-voice-actions">
            <button
              className="is-primary"
              disabled={!recordedVoice || voiceState === "recording"}
              onClick={() => {
                const file = recordedVoice.file;
                setVoiceOpen(false);
                transcribeVoiceFile(file).then((metadata) => onMediaUpload("VOICE", file, metadata));
                discardVoice();
              }}
              type="button"
            >Done</button>
            <button onClick={() => { if (voiceState === "recording") stopVoiceRecording(); discardVoice(); setVoiceOpen(false); }} type="button">Cancel</button>
            <button className="seen-chapter-voice-upload" disabled={voiceState === "recording"} onClick={() => voiceInput.current?.click()} type="button"><FiUpload /> Upload instead</button>
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
              onKeyDown={(event) => {
                if (event.key === "Enter" && placeQuery.trim()) {
                  onAddPlace(placeQuery.trim());
                  setPlaceOpen(false);
                  setPlaceQuery("");
                }
              }}
              placeholder="Place — e.g. Lisbon, Alfama"
              value={placeQuery}
            />
          </label>
          <button
            className="seen-chapter-place-add"
            disabled={!placeQuery.trim()}
            onClick={() => {
              onAddPlace(placeQuery.trim());
              setPlaceOpen(false);
              setPlaceQuery("");
            }}
            type="button"
          >
            Add
          </button>
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
          className={`seen-chapter-structured-editor is-${structuredEditor.type.toLowerCase()}-editor`}
          aria-label={`Add ${structuredEditor.type.toLowerCase()}`}
          ref={structuredFormRef}
        >
          {structuredEditor.type === "POLL" ? null : <header>
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
                {structuredEditor.type === "LIST"
                  ? "list"
                  : structuredEditor.type.toLowerCase()}
              </strong>
              <small>
                {structuredEditor.type === "LINK"
                  ? "Share a useful destination"
                  : structuredEditor.type === "POLL"
                    ? "Let members choose one answer"
                  : "Turn ideas into a clear list"}
              </small>
            </div>
            <button
              aria-label="Close editor"
              onClick={() => setStructuredEditor(null)}
              type="button"
            >
              <FiX />
            </button>
          </header>}
          {structuredEditor.type === "LINK" ? (
            <div className="seen-chapter-structured-fields">
              <label>
                <input
                  autoFocus
                  maxLength={1000}
                  onChange={(event) =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      url: event.target.value,
                    }))
                  }
                  placeholder="Paste a link…"
                  type="url"
                  value={structuredDraft.url}
                />
              </label>
            </div>
          ) : structuredEditor.type === "LIST" ? (
            <div className="seen-chapter-structured-fields">
              <p>List</p>
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (structuredDraft.items.length >= 8) return;
                        setStructuredDraft((draft) => ({
                          ...draft,
                          items: [
                            ...draft.items.slice(0, index + 1),
                            "",
                            ...draft.items.slice(index + 1),
                          ],
                        }));
                        window.requestAnimationFrame(() => {
                          structuredFormRef.current?.querySelectorAll('input[name="keyPoint"]')?.[index + 1]?.focus();
                        });
                      } else if (event.key === "Backspace" && !event.currentTarget.value && structuredDraft.items.length > 1) {
                        event.preventDefault();
                        setStructuredDraft((draft) => ({
                          ...draft,
                          items: draft.items.filter((_, itemIndex) => itemIndex !== index),
                        }));
                        window.requestAnimationFrame(() => {
                          const inputs = structuredFormRef.current?.querySelectorAll('input[name="keyPoint"]');
                          inputs?.[Math.max(0, index - 1)]?.focus();
                        });
                      }
                    }}
                    placeholder={`Option ${index + 1}`}
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
                  <FiPlus /> Option
                </button>
              ) : null}
            </div>
          ) : (
            <div className="seen-poll-prototype-editor">
              <div className="seen-poll-prototype-question">
                <FiBarChart2 aria-hidden="true" />
                <input
                  autoFocus
                  aria-label="Poll question"
                  maxLength={180}
                  onChange={(event) =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      question: event.target.value,
                    }))
                  }
                  placeholder="Ask something..."
                  value={structuredDraft.question}
                />
                <button
                  aria-label="Close poll editor"
                  onClick={() => setStructuredEditor(null)}
                  type="button"
                >
                  <FiX />
                </button>
              </div>
              {structuredDraft.options.map((option, index) => (
                <label className="seen-poll-prototype-option" key={index}>
                  <input
                    aria-label={`Poll option ${index + 1}`}
                    maxLength={80}
                    onChange={(event) =>
                      setStructuredDraft((draft) => ({
                        ...draft,
                        options: draft.options.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      }))
                    }
                    placeholder={`Option ${index + 1}`}
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
                  className="seen-poll-prototype-add"
                  onClick={() =>
                    setStructuredDraft((draft) => ({
                      ...draft,
                      options: [...draft.options, ""],
                    }))
                  }
                  type="button"
                >
                  + Option
                </button>
              ) : null}
            </div>
          )}
          {voiceError ? (
            <p className="seen-chapter-structured-error">{voiceError}</p>
          ) : null}
          <footer className={structuredEditor.type === "POLL" ? "is-poll-footer" : ""}>
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
                  : structuredEditor.type === "LINK" ? "Add" : "Add block"}
            </button>
          </footer>
        </section>
      ) : null}
      {actionsOpen ? (
        <div
          aria-label="Story block types"
          className="seen-chapter-add-menu"
          ref={addMenuRef}
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
            onClick={() => openStructuredEditor("LIST")}
            type="button"
          >
            <FiList />
            List
          </button>
          <button onClick={() => openStructuredEditor("POLL")} type="button">
            <FiBarChart2 />
            Poll
          </button>
        </div>
      ) : null}
      {pendingPhoto ? (
        <section
          aria-label="Add photo preview"
          className="seen-chapter-photo-modal"
          role="dialog"
        >
          <div className="seen-chapter-photo-card">
            <button
              aria-label="Close photo preview"
              className="seen-chapter-photo-close"
              onClick={closePendingPhoto}
              type="button"
            >
              <FiX />
            </button>
            <img alt="Selected chapter attachment" src={pendingPhoto.url} />
            <footer>
              <button onClick={closePendingPhoto} type="button">
                Cancel
              </button>
              <button disabled={busy} onClick={addPendingPhoto} type="button">
                <FiCheck />
                Add photo
              </button>
            </footer>
          </div>
        </section>
      ) : null}
      {editorHintVisible ? <div className="seen-chapter-editor-tools" role="note">
        <span>select - color - drag a block - + adds the rest</span>
        <button aria-label="Hide editor hint" onClick={() => setEditorHintVisible(false)} type="button">
          <FiX />
        </button>
      </div> : null}
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
            setPendingPhoto((current) => {
              if (current?.url) URL.revokeObjectURL(current.url);
              return { file, url: URL.createObjectURL(file) };
            });
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
            transcribeVoiceFile(file).then((metadata) => onMediaUpload("VOICE", file, metadata));
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromDrafts = searchParams.get("from") === "drafts";
  const fromSeen = searchParams.get("from") === "seen";
  const draftSuffix = fromDrafts ? "?from=drafts" : "";
  const backTarget = id
    ? fromSeen
      ? "/seen"
      : fromDrafts
        ? "/profile"
        : `/studio/seens/${id}${draftSuffix}`
    : fromDrafts
      ? "/profile"
      : "/profile";
  const replyToSeenId = id ? "" : searchParams.get("replyToSeenId") || "";
  const coverInput = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);
  const pendingCoverKind = useRef("IMAGE");
  const pendingVideoLimit = useRef(15);
  const chapterTitleInputs = useRef(new Map());
  const [p, setP] = useState(() => ({
    ...empty,
    replyToSeen: replyToSeenId || null,
  }));
  const [replySeen, setReplySeen] = useState(null);
  const [newSeries, setNewSeries] = useState("");
  const [savedSeries, setSavedSeries] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(fallbackCategories.map((name) => ({ id: name, name })));
  const [settingsSheet, setSettingsSheet] = useState("");
  const [taggedPeopleDetails, setTaggedPeopleDetails] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesCreating, setSeriesCreating] = useState(false);
  const [seriesError, setSeriesError] = useState("");
  const [linkOnlyShare, setLinkOnlyShare] = useState(null);
  const [introOpen, setIntroOpen] = useState(() => !localStorage.getItem("atseen_seen_intro_dismissed"));
  const [status, setStatus] = useState("Saved");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [uploading, setUploading] = useState("");
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoToTrim, setVideoToTrim] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState("");
  const [chapterStory, setChapterStory] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterAdding, setChapterAdding] = useState(false);
  const [chapterTitleFocusId, setChapterTitleFocusId] = useState(() => location.state?.focusChapterId || "");
  const [chapterStatus, setChapterStatus] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const [loadingPublication, setLoadingPublication] = useState(Boolean(id));

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!error) return undefined;
    const visibleError = error;
    const timer = window.setTimeout(() => {
      setError((current) => current === visibleError ? "" : current);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!status || status === "Saved" || status.endsWith("...")) return undefined;
    const visibleStatus = status;
    const timer = window.setTimeout(() => {
      setStatus((current) => current === visibleStatus ? "Saved" : current);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [status]);

  const refresh = async (publicationId = id, { preserveLocalChanges = false } = {}) => {
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
        ? publication.chapters.map((chapter) => chapter.title === "Chapter name" ? { ...chapter, title: "" } : chapter)
        : [],
      tags: Array.isArray(publication?.tags) ? publication.tags : [],
      series: publication?.series || null,
      seriesId: publication?.seriesId || publication?.series?.id || null,
      visibility: publication?.visibility || "PUBLIC",
    };
    if (preserveLocalChanges) {
      setP((current) => {
        const localChapters = new Map((current.chapters || []).map((chapter) => [chapter.stableChapterId, chapter]));
        return {
          ...normalizedPublication,
          title: current.title,
          summary: current.summary,
          description: current.description,
          category: current.category,
          series: current.series,
          seriesId: current.seriesId,
          visibility: current.visibility,
          allowDownload: current.allowDownload,
          experienceLocation: current.experienceLocation,
          taggedPeople: current.taggedPeople,
          attachedEntities: current.attachedEntities,
          entityRefs: current.entityRefs,
          tags: current.tags,
          replyToSeen: current.replyToSeen,
          chapters: normalizedPublication.chapters.map((chapter) => {
            const local = localChapters.get(chapter.stableChapterId);
            return local ? { ...chapter, title: local.title, blocks: local.blocks } : chapter;
          }),
        };
      });
    } else {
      setP(normalizedPublication);
      dirty.current = false;
    }
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

  useEffect(() => {
    if (!chapterTitleFocusId || !(p.chapters || []).some((chapter) => chapter.stableChapterId === chapterTitleFocusId)) return undefined;
    dirty.current = true;
    setP((current) => {
      const target = current.chapters.find((chapter) => chapter.stableChapterId === chapterTitleFocusId);
      if (!target?.title) return current;
      return {
        ...current,
        chapters: current.chapters.map((chapter) => chapter.stableChapterId === chapterTitleFocusId
          ? { ...chapter, title: "" }
          : chapter),
      };
    });
    const timer = window.setTimeout(() => {
      chapterTitleInputs.current.get(chapterTitleFocusId)?.focus();
      setChapterTitleFocusId("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chapterTitleFocusId, p.chapters]);

  const change = (values) => {
    dirty.current = true;
    setStatus("Unsaved changes - click Save for later");
    setError("");
    setLinkOnlyShare(null);
    setP((current) => ({ ...current, ...values }));
  };

  const ensure = async ({ navigateToDraft = true } = {}) => {
    if (p.id) return p;
    const response = await api.createPublicationDraft({
      kind: "SEEN",
      title: p.title,
      summary: p.summary || p.description,
      description: p.description,
      category: p.category,
      seriesId: p.seriesId || p.series?.id || null,
      visibility: p.visibility || "PUBLIC",
      allowDownload: Boolean(p.allowDownload),
      experienceLocation: p.experienceLocation || "",
      taggedPeople: p.taggedPeople || [],
      entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
      tags: tagsWithoutSeries(p.tags),
      replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
    });
    const publication = response.data.data.publication;
    sessionStorage.setItem("atseen_new_seen_draft", publication.id);
    setP(publication);
    if (navigateToDraft) {
      nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, {
        replace: true,
      });
    }
    return publication;
  };

  const save = async ({ allowEmpty = false } = {}) => {
    if (busy.current) return null;
    if (!p.id && !allowEmpty && !hasDraftContent(p)) {
      setStatus("Saved");
      setToast("Nothing to save yet");
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
        allowDownload: Boolean(p.allowDownload),
        experienceLocation: p.experienceLocation || "",
        taggedPeople: p.taggedPeople || [],
        entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
        tags: tagsWithoutSeries(p.tags),
        replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
        statusVersion: publication.statusVersion,
      })).data.data.publication;

      for (const chapter of p.chapters || []) {
        if (!chapter.stableChapterId) continue;
        await api.updateChapter(publication.id, chapter.stableChapterId, {
          title: (chapter.title || "").trim() || "Chapter name",
          blocks: chapter.blocks || [],
          isPreview: true,
          releaseMode: chapter.releaseMode || "IMMEDIATE",
          statusVersion: publication.statusVersion,
        });
        publication = await refresh(publication.id);
      }

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

  const saveForLater = async () => {
    const publication = await save();
    if (!publication) return;
    sessionStorage.removeItem("atseen_new_seen_draft");
    const response = await api.listMyPublications({ kind: "SEEN", status: "DRAFT", limit: 10 }).catch(() => null);
    const draftCount = Math.min(3, response ? response.data?.data?.items?.length || 0 : 1);
    nav(draftCount ? `/profile?draftSaved=${draftCount}` : "/profile", { replace: true });
  };

  const cancelCreation = async () => {
    if (uploading || submitting || canceling) return;
    setCanceling(true);
    setError("");
    try {
      if (p.id) {
        const latest = (await api.getMyPublication(p.id)).data.data.publication;
        if (latest.status === "DRAFT") await api.deleteSeen(latest.id, latest.statusVersion);
      }
      sessionStorage.removeItem("atseen_new_seen_draft");
      nav(fromSeen ? "/seen" : "/profile", { replace: true });
    } catch (requestError) {
      setError(publicationError(requestError, "Could not cancel this Seen"));
      setCanceling(false);
    }
  };

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
      const publication = await ensure();
      if (!publication) return;
      setUploading(kind);
      setStatus("Uploading media...");
      await api.uploadMedia(publication.id, file, {
        purpose: "COVER",
        statusVersion: publication.statusVersion,
      });
      await refresh(publication.id, { preserveLocalChanges: dirty.current });
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
    if (chapterAdding) return;
    if (p.chapters.length >= 5) {
      setError("Maximum five chapters.");
      return;
    }
    const creatingDraft = !p.id;
    setChapterAdding(true);
    setError("");
    try {
      const publication = await ensure({ navigateToDraft: false });
      if (!publication) return;
      const title = p.chapters.length
        ? `Chapter ${p.chapters.length + 1}`
        : "Chapter name";
      const response = await api.addChapter(publication.id, {
        title,
        blocks: [],
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      const addedChapterId = response.data?.data?.chapter?.stableChapterId || "";
      await refresh(publication.id, { preserveLocalChanges: dirty.current });
      if (addedChapterId) setChapterTitleFocusId(addedChapterId);
      setStatus("Chapter added");
      if (creatingDraft) {
        nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, {
          replace: true,
          state: { focusChapterId: addedChapterId },
        });
      }
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setChapterAdding(false);
    }
  };

  const openChapterEditor = (chapter) => {
    setActiveChapterId(chapter.stableChapterId);
    setChapterStory(chapterStoryText(chapter));
    setChapterStatus("");
    setError("");
  };

  const changeChapterTitle = (chapterId, title) => {
    dirty.current = true;
    setP((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.stableChapterId === chapterId ? { ...chapter, title } : chapter,
      ),
    }));
    setStatus("Unsaved changes - click Save for later");
    setError("");
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

  const uploadChapterMedia = async (mediaType, file, metadata = {}) => {
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
          ...(Object.keys(metadata || {}).length ? { metadata } : {}),
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

  const requestChapterMedia = (mediaType, file, metadata = {}) => {
    if (mediaType !== "IMAGE") return uploadChapterMedia(mediaType, file, metadata);
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
      sessionStorage.removeItem("atseen_new_seen_draft");
      if (published?.visibility === "LINK_ONLY" && published.shareUrl) {
        setP((current) => ({ ...current, ...published, chapters: current.chapters }));
        dirty.current = false;
        setLinkOnlyShare({ copied: false, url: published.shareUrl });
        setStatus("Link-only Seen published");
        return;
      }
      nav(fromSeen ? "/seen" : fromDrafts ? "/profile" : `/studio/seens/${publication.id}${draftSuffix}`, { replace: fromSeen || fromDrafts });
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
      {toast ? <p className="seen-compose-toast" role="status">{toast}</p> : null}
      {error || statusText ? (
        <div className="seen-compose-feedback-stack" aria-live="polite">
          {error ? <p className="seen-compose-feedback is-error" role="alert">{error}</p> : null}
          {statusText ? <p className="seen-compose-feedback is-status" role="status">{statusText}</p> : null}
        </div>
      ) : null}
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
        <button className="seen-compose-save" onClick={saveForLater} type="button">
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

        <div className="seen-compose-section-title">
          <span>CHAPTERS</span>
          <small>
            {p.chapters.length}/5 {"\u00b7"} like a post {"\u2014"} short
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
                        ref={(node) => {
                          if (node) chapterTitleInputs.current.set(chapter.stableChapterId, node);
                          else chapterTitleInputs.current.delete(chapter.stableChapterId);
                        }}
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
          {p.chapters.length < 5 ? (
            <button
              className="seen-compose-add-chapter"
              disabled={chapterAdding}
              onClick={addChapter}
              type="button"
            >
              <FiPlus aria-hidden="true" />{" "}
              {chapterAdding
                ? "Adding chapter..."
                : p.chapters.length
                ? "Add chapter"
                : "Chapter 1 - where it starts"}
            </button>
          ) : null}
        </div>

        <div className="seen-compose-settings" aria-label="Seen settings">
          <SettingsRow Icon={FiTag} label="Category" onClick={() => setSettingsSheet("category")} value={p.category || "-"} />
          <SettingsRow Icon={FiImage} label="Cover" onClick={() => setSettingsSheet("cover")} value={p.coverMedia ? "Added" : "Add"} />
          <SettingsRow Icon={FiGrid} label="Series" onClick={() => { setSeriesError(""); setSettingsSheet("series"); }} value={selectedSeriesLabel} />
          <SettingsRow Icon={FiUsers} label="Tag people" onClick={() => setSettingsSheet("people")} value={p.taggedPeople?.length ? `${p.taggedPeople.length} tagged` : "None"} />
          <SettingsRow Icon={FiMapPin} label="Location" onClick={() => setSettingsSheet("location")} value={p.experienceLocation || "Add"} />
          <SettingsRow Icon={AudienceIcon} label="Audience" onClick={() => setSettingsSheet("audience")} value={selectedAudience.label} />
          <SettingsRow Icon={FiUpload} label="Allow download" onClick={() => change({ allowDownload: !p.allowDownload })} toggle value={p.allowDownload ? "On" : "Off"} />
          <SettingsRow Icon={FiFilm} label="Part of an Experience" onClick={() => setSettingsSheet("experience")} value={(p.attachedEntities || []).find((item) => item.type === "experience")?.title || "None"} />
        </div>
        {linkOnlyShare?.url ? (
          <div className="seen-compose-share-link">
            <span>{linkOnlyShare.url}</span>
            <button onClick={copyShareLink} type="button"><FiCopy aria-hidden="true" />{linkOnlyShare.copied ? "Copied" : "Copy link"}</button>
          </div>
        ) : null}

        <button className="seen-compose-publish" disabled={Boolean(uploading || submitting)} onClick={submit} type="button">{submitting ? "Publishing..." : p.publishedVersion ? "Republish" : "Publish"}</button>
        <button className="seen-compose-cancel" disabled={Boolean(uploading || submitting || canceling)} onClick={cancelCreation} type="button">{canceling ? "Canceling..." : "Cancel"}</button>
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
      {settingsSheet === "cover" ? (
        <CoverSheet hasCover={Boolean(p.coverMedia)} onClose={() => setSettingsSheet("")} onUpload={() => chooseMedia("IMAGE")} />
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
      {settingsSheet === "people" ? (
        <PeopleSheet
          onChange={(taggedPeople, person) => {
            change({ taggedPeople });
            setTaggedPeopleDetails((current) => taggedPeople.map((personId) => personId === person.id ? person : current.find((item) => item.id === personId)).filter(Boolean));
          }}
          onClose={() => setSettingsSheet("")}
          selectedIds={p.taggedPeople || []}
          selectedPeople={taggedPeopleDetails}
        />
      ) : null}
      {settingsSheet === "location" ? (
        <LocationSheet onClose={() => setSettingsSheet("")} onSelect={(experienceLocation) => { change({ experienceLocation }); setSettingsSheet(""); }} value={p.experienceLocation || ""} />
      ) : null}
      {settingsSheet === "experience" ? (
        <SelectionSheet onClose={() => setSettingsSheet("")} subtitle="Connect this Seen to an existing Experience" title="Part of an Experience">
          <EntityAttachmentPicker context="experience" disabled={Boolean(uploading)} fixedType="experience" onChange={(attachedEntities) => change({ attachedEntities: attachedEntities.filter((item) => item.type === "experience").slice(-1) })} value={(p.attachedEntities || []).filter((item) => item.type === "experience")} />
          <button className="seen-settings-done" onClick={() => setSettingsSheet("")} type="button">Done</button>
        </SelectionSheet>
      ) : null}
    </section>
  );
}
