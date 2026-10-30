/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiEdit3,
  FiEye,
  FiFilm,
  FiGlobe,
  FiGrid,
  FiImage,
  FiLink,
  FiList,
  FiLock,
  FiMapPin,
  FiMic,
  FiPause,
  FiPlay,
  FiPlus,
  FiScissors,
  FiTag,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";
import { profileService } from "../../services/profileService";
import { voiceService } from "../../services/voiceService";
import { searchService } from "../../services/searchService";
import { walletService } from "../../services/walletService";
import UniversalLocationPicker from "../../components/location/UniversalLocationPicker";
import EntityAttachmentPicker from "../../components/contentEntities/EntityAttachmentPicker";
import { normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";
import ProfileImageCropper from "../../components/profile/ProfileImageCropper";
import { resolveMediaUrl } from "../../utils/media";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import AiSeenGuide from "../../components/publication/AiSeenGuide";

const empty = { allowDownload: false, captionsEnabled: true, ownerWelcomeNote: "", attachedEntities: [], entityRefs: [], experienceLocation: "", kind: "SEEN", pricing: { mode: "FREE", starsAmount: null, presetId: null }, taggedPeople: [], title: "", summary: "", description: "", category: "", series: null, seriesId: null, visibility: "PUBLIC", tags: [], chapters: [] };
const fallbackCategories = ["Travel", "Fitness", "Lifestyle", "Business", "Tech", "Psychology", "Fashion", "Beauty", "Wellness", "Food"];
const usd = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
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

function PaidSeenBuyerView({ chapters = [], coverKind, coverUrl, creatorAvatar, creatorName, onClose, onUnlock, price, title }) {
  const previews = chapters.filter((chapter) => chapter.isPreview);
  const firstPreview = previews[0] || chapters[0];
  const [selectedChapterId, setSelectedChapterId] = useState(firstPreview?.stableChapterId || firstPreview?.id || "");
  const selectedChapter = chapters.find((chapter) => (chapter.stableChapterId || chapter.id) === selectedChapterId) || firstPreview;
  useEffect(() => { const closeOnEscape = (event) => event.key === "Escape" && onClose(); window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape); }, [onClose]);
  return <div className="seen-buyer-view-layer" role="presentation">
    <button aria-label="Close buyer view" className="seen-buyer-view-scrim" onClick={onClose} type="button" />
    <section aria-label="Paid Seen buyer view" aria-modal="true" className="seen-buyer-view-sheet" role="dialog">
      <button aria-label="Close buyer view" className="seen-buyer-view-handle" onClick={onClose} type="button"><span /></button>
      <p className="seen-buyer-view-label"><FiEye /> BUYER VIEW</p>
      <div className="seen-buyer-view-card"><header><span className="seen-buyer-view-avatar">{creatorAvatar ? <img alt="" src={creatorAvatar} /> : creatorName.slice(0, 1).toUpperCase()}</span><strong>{creatorName}</strong><small>tap Preview / Locked</small></header><div className="seen-buyer-view-cover">{coverUrl ? coverKind === "VIDEO" ? <video autoPlay loop muted playsInline src={coverUrl} /> : <img alt="" src={coverUrl} /> : <span><FiEye /><small>Paid Seen</small></span>}<div><small>PAID SEEN</small><h2>{title || "Untitled Seen"}</h2><p>{chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}</p></div></div></div>
      <p className="seen-buyer-view-new"><i /> New — be one of the first owners</p>
      <div className="seen-buyer-view-inside-head"><b>INSIDE</b><span>· chapter {chapters.length === 1 ? "1" : `1–${chapters.length}`}</span></div>
      <div className="seen-buyer-view-chapters">{chapters.map((chapter, index) => { const preview = Boolean(chapter.isPreview); const chapterId = chapter.stableChapterId || chapter.id || String(index); return <button className={selectedChapter === chapter ? "is-active" : ""} key={chapterId} onClick={() => preview ? setSelectedChapterId(chapterId) : onUnlock()} type="button"><span>{String(index + 1).padStart(2, "0")}</span><strong>{chapter.title?.trim() || `Chapter ${index + 1}`}</strong><em className={preview ? "is-preview" : "is-locked"}>{preview ? "Free preview" : <><FiLock /> Locked</>}</em></button>; })}</div>
      {selectedChapter ? <div className="seen-buyer-view-excerpt"><b>{selectedChapter.title || "Free preview"}</b><p>{chapterStoryText(selectedChapter) || "Open this free preview to see what is inside."}</p></div> : null}
      <div className="seen-buyer-view-benefits"><span><FiCheck /><small>Yours forever</small></span><span><FiArrowRight /><small>New chapters included</small></span></div>
      <button className="seen-buyer-view-unlock" onClick={onUnlock} type="button">Unlock <span>·</span> <b>✦ {Number(price || 0).toLocaleString()}</b></button>
      <small className="seen-buyer-view-footnote">One-time · yours forever · refund within 24h if it’s not for you</small>
    </section>
  </div>;
}

function OwnerVoiceSheet({ busy, onClose, onSave }) {
  const recorder = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const fileInput = useRef(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voice, setVoice] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!recording) return undefined; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [recording]);
  useEffect(() => () => { stream.current?.getTracks().forEach((track) => track.stop()); if (voice?.url) URL.revokeObjectURL(voice.url); }, [voice?.url]);
  const start = async () => { try { const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"; const next = new MediaRecorder(mediaStream, { mimeType }); stream.current = mediaStream; recorder.current = next; chunks.current = []; next.ondataavailable = ({ data }) => data.size && chunks.current.push(data); next.onstop = () => { const blob = new Blob(chunks.current, { type: mimeType }); setVoice({ file: new File([blob], `owner-welcome-${Date.now()}.webm`, { type: mimeType }), url: URL.createObjectURL(blob) }); mediaStream.getTracks().forEach((track) => track.stop()); }; next.start(250); setSeconds(0); setRecording(true); setError(""); } catch { setError("Microphone access is needed to record. You can upload audio instead."); } };
  const stop = () => { if (recorder.current?.state === "recording") recorder.current.stop(); setRecording(false); };
  const chooseFile = (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (voice?.url) URL.revokeObjectURL(voice.url); setVoice({ file, url: URL.createObjectURL(file) }); };
  return <div className="owner-voice-layer"><button aria-label="Close voice recorder" className="owner-voice-scrim" onClick={onClose} type="button" /><section aria-modal="true" className="owner-voice-sheet" role="dialog"><span className="owner-voice-handle" /><header><div><h2>Voice hello</h2><p>Welcome owners in your own voice.</p></div><button aria-label="Close" onClick={onClose} type="button"><FiX /></button></header>{voice ? <div className="owner-voice-preview"><audio controls src={voice.url} /><button onClick={() => { URL.revokeObjectURL(voice.url); setVoice(null); setSeconds(0); }} type="button">Record again</button></div> : <button className={`owner-voice-record ${recording ? "is-recording" : ""}`} onClick={recording ? stop : start} type="button"><FiMic /><b>{recording ? "Stop recording" : "Start recording"}</b><small>{recording ? `${seconds}s` : "Tap when you’re ready"}</small></button>}{error ? <p className="owner-voice-error">{error}</p> : null}<button className="owner-voice-upload" onClick={() => fileInput.current?.click()} type="button"><FiUpload /> Upload audio</button><input accept="audio/*" className="sr-only" onChange={chooseFile} ref={fileInput} type="file" /><button className="owner-voice-use" disabled={!voice?.file || busy} onClick={() => onSave(voice.file)} type="button">{busy ? "Adding voice…" : "Add voice hello"}</button></section></div>;
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

function chapterHasContent(chapter = {}, storyOverride) {
  const title = String(chapter.title || "").trim();
  const hasCustomTitle = Boolean(title) && !/^chapter(?:\s+name|\s+\d+)?$/i.test(title);
  const blocks = storyOverride === undefined
    ? chapter.blocks || []
    : chapterBlocksWithStory(chapter, storyOverride);
  const hasBlockContent = blocks.some((block) => {
    if (String(block.text || block.label || "").trim()) return true;
    if (block.media?.secureUrl || block.media?.url || block.secureUrl || block.url) return true;
    if (Array.isArray(block.items) && block.items.some((item) => String(item?.text || item?.label || item || "").trim())) return true;
    if (Array.isArray(block.metadata?.listItems) && block.metadata.listItems.some((item) => String(item || "").trim())) return true;
    if (String(block.metadata?.question || "").trim()) return true;
    return false;
  });
  return hasCustomTitle || hasBlockContent;
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

export function VideoTrimSheet({ coverMode = false, enableCrop = false, file, limitSeconds, onCancel, onUpload }) {
  const videoRef = useRef(null);
  const cropGestureRef = useRef({ pointers: new Map() });
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [aspect, setAspect] = useState(coverMode ? "4:5" : "16:9");
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const maxStart = Math.max(0, duration - limitSeconds);
  const end = Math.min(duration, start + limitSeconds);
  const clipLength = Math.max(0, end - start);
  const canUploadOriginal = !enableCrop && duration > 0 && duration <= limitSeconds + 0.1;

  const beginCropGesture = (event) => {
    if (!enableCrop || busy) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const gesture = cropGestureRef.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    gesture.startX = positionX;
    gesture.startY = positionY;
    gesture.startZoom = zoom;
    gesture.origin = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    gesture.distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
  };
  const moveCropGesture = (event) => {
    const gesture = cropGestureRef.current;
    if (!enableCrop || !gesture.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    const center = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const bounds = event.currentTarget.getBoundingClientRect();
    setPositionX(Math.max(0, Math.min(100, gesture.startX - ((center.x - gesture.origin.x) / bounds.width) * 100)));
    setPositionY(Math.max(0, Math.min(100, gesture.startY - ((center.y - gesture.origin.y) / bounds.height) * 100)));
    if (points.length > 1 && gesture.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      setZoom(Math.max(1, Math.min(2, gesture.startZoom * (distance / gesture.distance))));
    }
  };
  const endCropGesture = (event) => {
    const gesture = cropGestureRef.current;
    gesture.pointers.delete(event.pointerId);
    const point = [...gesture.pointers.values()][0];
    if (point) {
      gesture.startX = positionX;
      gesture.startY = positionY;
      gesture.startZoom = zoom;
      gesture.origin = point;
      gesture.distance = 0;
    }
  };

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
        <div
          aria-label={enableCrop ? "Video crop preview. Drag to reposition and pinch with two fingers to zoom." : "Video preview"}
          className={`seen-video-crop-preview ${enableCrop ? `aspect-${aspect.replace(":", "-")}` : "is-original"}`}
          onPointerCancel={endCropGesture}
          onPointerDown={beginCropGesture}
          onPointerMove={moveCropGesture}
          onPointerUp={endCropGesture}
          style={enableCrop ? { touchAction: "none" } : undefined}
        ><video
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
        {enableCrop ? <p className="seen-video-gesture-hint">Drag to move · pinch with two fingers to zoom</p> : null}
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
          {!coverMode ? <div className="seen-video-aspects" aria-label="Video crop ratio" role="group">{["16:9", "4:5", "1:1"].map((value) => <button className={aspect === value ? "is-selected" : ""} disabled={busy} key={value} onClick={() => setAspect(value)} type="button">{value}</button>)}</div> : null}
          <label className="seen-video-desktop-adjust"><span>Zoom</span><input disabled={busy} max="2" min="1" onChange={(event) => setZoom(Number(event.target.value))} step="0.05" type="range" value={zoom} /></label>
          <label className="seen-video-desktop-adjust"><span>Horizontal</span><input disabled={busy} max="100" min="0" onChange={(event) => setPositionX(Number(event.target.value))} type="range" value={positionX} /></label>
          <label className="seen-video-desktop-adjust"><span>Vertical</span><input disabled={busy} max="100" min="0" onChange={(event) => setPositionY(Number(event.target.value))} type="range" value={positionY} /></label>
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
          <button className="seen-cover-upload" onClick={() => onUpload("IMAGE")} type="button"><FiImage /> {hasCover ? "Replace with photo" : "Upload photo"}</button>
          <button className="seen-cover-upload" onClick={() => onUpload("VIDEO")} type="button"><FiFilm /> {hasCover ? "Replace with video" : "Upload video"}</button>
          <small>{hasCover ? "Cover selected · photo or video supported" : "Choose a photo or a video up to 30 seconds"}</small>
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
  return <UniversalLocationPicker onClose={onClose} onSelect={onSelect} value={value} />;
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

export function SeenChapterEditor({ busy, chapter, error, flow = null, onAddBlocks, onAddPlace, onDone, onMediaUpload, onRemoveBlock, onReorderBlocks, onStoryChange, onTitleChange, onUpdateBlock, story, status }) {
  const flowEnabled = Boolean(flow);
  const pageRef = useRef(null);
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
  const swipeStart = useRef(null);
  const swipeCommitTimer = useRef(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [writingStarted, setWritingStarted] = useState(() => Boolean(String(story || "").trim() || (chapter?.blocks || []).length));
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [recordedVoice, setRecordedVoice] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeCommitting, setSwipeCommitting] = useState(false);
  const [flowFooterStyle, setFlowFooterStyle] = useState(undefined);

  useLayoutEffect(() => {
    if (!flowEnabled || !pageRef.current) return undefined;
    const center = pageRef.current.closest(".social-center-scroll");
    const positionFooter = () => {
      const bounds = center?.getBoundingClientRect();
      setFlowFooterStyle(bounds ? { left: bounds.left, width: bounds.width } : undefined);
    };
    positionFooter();
    const observer = typeof ResizeObserver === "function" && center
      ? new ResizeObserver(positionFooter)
      : null;
    observer?.observe(center);
    window.addEventListener("resize", positionFooter);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", positionFooter);
    };
  }, [flowEnabled]);

  useEffect(() => () => window.clearTimeout(swipeCommitTimer.current), []);
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
    setWritingStarted(Boolean(String(story || "").trim() || (chapter?.blocks || []).length));
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
  const finishChapterEditing = async (action = "done") => {
    await flushImageOverlayText();
    if (structuredEditor) {
      await saveStructuredBlock();
      return;
    }
    if (action === "back" && flow?.onBack) return flow.onBack();
    if (action === "next" && flow?.onNext) return flow.onNext();
    if (action === "add" && flow?.onAdd) return flow.onAdd();
    if (action === "finish" && flow?.onFinish) return flow.onFinish();
    return onDone();
  };
  const beginChapterSwipe = (x, y, target) => {
    if (!flow || target?.closest?.("button,input,textarea,select,audio,video")) return;
    swipeStart.current = { x, y };
    setSwipeCommitting(false);
    setSwipeOffset(0);
  };
  const moveChapterSwipe = (x, y) => {
    const start = swipeStart.current;
    if (!start || busy || swipeCommitting) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 8) return;
    setSwipeOffset(Math.max(-120, Math.min(120, dx * .56)));
  };
  const finishChapterSwipe = (x, y) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || busy) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.25) {
      setSwipeOffset(0);
      return;
    }
    if (dx < 0 && flow && flow.index >= flow.total - 1) {
      setSwipeOffset(0);
      return;
    }
    const action = dx < 0 ? "next" : "back";
    setSwipeCommitting(true);
    setSwipeOffset(dx < 0 ? -180 : 180);
    window.clearTimeout(swipeCommitTimer.current);
    swipeCommitTimer.current = window.setTimeout(() => {
      void finishChapterEditing(action);
      setSwipeOffset(0);
      setSwipeCommitting(false);
    }, 150);
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
    <section
      className={`seen-chapter-editor-page ${flow ? "is-flow-editor" : ""} ${swipeOffset ? "is-swipe-dragging" : ""} ${swipeCommitting ? "is-swipe-committing" : ""}`}
      ref={pageRef}
      style={flow ? {
        "--chapter-column-left": flowFooterStyle ? `${flowFooterStyle.left}px` : undefined,
        "--chapter-column-right": flowFooterStyle && typeof window !== "undefined" ? `${window.innerWidth - flowFooterStyle.left - flowFooterStyle.width}px` : undefined,
        "--chapter-column-width": flowFooterStyle ? `${flowFooterStyle.width}px` : undefined,
        "--chapter-swipe-x": `${swipeOffset}px`,
      } : undefined}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" || event.pointerType === "touch") return;
        beginChapterSwipe(event.clientX, event.clientY, event.target);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "touch") return;
        finishChapterSwipe(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "touch") moveChapterSwipe(event.clientX, event.clientY);
      }}
      onTouchCancel={() => { swipeStart.current = null; }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches?.[0];
        if (touch) finishChapterSwipe(touch.clientX, touch.clientY);
      }}
      onTouchMove={(event) => {
        const touch = event.touches?.[0];
        if (touch) moveChapterSwipe(touch.clientX, touch.clientY);
      }}
      onTouchStart={(event) => {
        const touch = event.touches?.[0];
        if (touch) beginChapterSwipe(touch.clientX, touch.clientY, event.target);
      }}
    >
      {flow && swipeOffset ? <div aria-hidden="true" className={`seen-chapter-swipe-cue ${swipeOffset < 0 ? "is-next" : "is-back"}`} style={{ "--swipe-cue-progress": Math.min(1, Math.abs(swipeOffset) / 55), opacity: Math.min(1, .35 + Math.abs(swipeOffset) / 85) }}><FiChevronLeft /><span>{Math.abs(swipeOffset) >= 55 ? `Release for ${swipeOffset < 0 ? "next" : "previous"}` : `Swipe ${swipeOffset < 0 ? "left" : "right"}`}</span><FiChevronRight /></div> : null}
      <header className="seen-chapter-editor-header">
        {flow ? <button aria-label="Previous chapter" className="seen-chapter-flow-back" disabled={busy} onClick={() => finishChapterEditing("back")} type="button"><FiChevronLeft /></button> : null}
        <div>
          {flow ? <input aria-label="Chapter title" className="seen-chapter-flow-title" disabled={busy} maxLength={120} onChange={(event) => onTitleChange?.(event.target.value)} placeholder="Chapter name" value={chapter?.title || ""} /> : <h1>{chapter?.title?.trim() || "Chapter name"}</h1>}
        </div>
        <button disabled={busy} onClick={() => finishChapterEditing(flow ? "finish" : "done")} type="button">{busy ? "Saving" : flow ? "Continue" : "Done"}</button>
      </header>

      {flow ? <nav aria-label="Chapters" className="seen-chapter-flow-progress" style={{ "--chapter-progress-count": flow.total }}>
        <div>{Array.from({ length: flow.total }, (_, index) => <button aria-label={`Open chapter ${index + 1}`} aria-current={index === flow.index ? "step" : undefined} className={index === flow.index ? "is-active" : index < flow.index ? "is-complete" : ""} disabled={busy} key={index} onClick={() => flow.onSelect?.(index)} type="button" />)}</div>
        <span>{flow.index + 1}/{flow.total}</span>
      </nav> : null}

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

      {!writingStarted && !attachmentBlocks.length && !structuredBlocks.length && !locationBlocks.length ? <section className="seen-chapter-empty-state">
        <p>CHAPTER {flow ? flow.index + 1 : 1} OF {flow?.total || 1}</p>
        <h2>Start your story</h2>
        <div>
          <button onClick={() => { setWritingStarted(true); window.requestAnimationFrame(() => textareaRef.current?.focus()); }} type="button"><FiEdit3 /><b>Write something</b></button>
          <button onClick={() => photoInput.current?.click()} type="button"><FiImage /><b>Add photo or video</b></button>
          <button onClick={() => setVoiceOpen(true)} type="button"><FiMic /><b>Add voice</b></button>
        </div>
        <small>Lists, polls, links, places — under +</small>
      </section> : <div
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
      </div>}
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
      {placeOpen ? <UniversalLocationPicker onClose={() => setPlaceOpen(false)} onSelect={(location) => onAddPlace(location)} title="Place" /> : null}
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
        <><button aria-label="Close block menu" className="seen-chapter-add-menu-scrim" onClick={() => setActionsOpen(false)} type="button" /><div
          aria-label="Story block types"
          className="seen-chapter-add-menu"
          ref={addMenuRef}
          role="menu"
        >
          <span className="seen-chapter-sheet-handle" aria-hidden="true" />
          <button onClick={() => photoInput.current?.click()} type="button">
            <FiImage />
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
        </div></>
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
      {flow && (flow.index > 0 || flow.canAdd) ? <div className="seen-chapter-nav-actions">
        {flow.index > 0 ? <button aria-label="Previous chapter" className="seen-chapter-back-previous" disabled={busy} onClick={() => finishChapterEditing("back")} type="button"><FiChevronLeft /></button> : null}
        {flow.canAdd ? <button className="seen-chapter-add-next" disabled={busy} onClick={() => finishChapterEditing("add")} type="button"><FiPlus /> Chapter {flow.total + 1}</button> : null}
      </div> : null}
      {flow ? <footer className="seen-chapter-flow-footer" style={flowFooterStyle}>
        <button disabled={busy} onClick={() => finishChapterEditing("back")} type="button"><FiChevronLeft /> Back</button>
        <span aria-live="polite">{busy ? "Saving…" : status || (typeof navigator !== "undefined" && !navigator.onLine ? "Offline — changes pending" : "Saved as draft")}</span>
        <button className="is-primary" disabled={busy} onClick={() => finishChapterEditing("next")} type="button">{flow.nextLabel || "Next"} <FiChevronRight /></button>
      </footer> : null}
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
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            setActionsOpen(false);
            if (file.type.startsWith("video/")) {
              onMediaUpload("VIDEO", file);
              return;
            }
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromDrafts = searchParams.get("from") === "drafts";
  const fromSeen = searchParams.get("from") === "seen";
  const requestedReturnTo = searchParams.get("returnTo") || "";
  const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "";
  const composerSearch = new URLSearchParams();
  if (fromDrafts) composerSearch.set("from", "drafts");
  if (returnTo) composerSearch.set("returnTo", returnTo);
  const draftSuffix = composerSearch.size ? `?${composerSearch.toString()}` : "";
  const backTarget = returnTo || (id
    ? fromSeen
      ? "/seen"
      : fromDrafts
        ? "/profile"
        : "/profile"
    : fromDrafts
      ? "/profile"
      : "/profile");
  const replyToSeenId = id ? "" : searchParams.get("replyToSeenId") || "";
  const requestedSeenType = id ? "" : searchParams.get("type") || "";
  const coverInput = useRef(null);
  const ownerVoiceInput = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);
  const pendingCoverKind = useRef("IMAGE");
  const pendingVideoLimit = useRef(15);
  const chapterTitleInputs = useRef(new Map());
  const chapterAutoSaveTimer = useRef(null);
  const publicationAutoSaveTimer = useRef(null);
  const initialChapterStarted = useRef(false);
  const pageWasReloaded = useRef(
    window.performance?.getEntriesByType?.("navigation")?.[0]?.type === "reload"
      && !location.state?.composerStep,
  );
  const [p, setP] = useState(() => ({
    ...empty,
    pricing: requestedSeenType === "paid"
      ? { mode: "ONE_TIME", starsAmount: 190, presetId: "paid-seen" }
      : empty.pricing,
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
  const [starsPerUsd, setStarsPerUsd] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoToTrim, setVideoToTrim] = useState(null);
  const [buyerViewOpen, setBuyerViewOpen] = useState(false);
  const [ownerVoiceOpen, setOwnerVoiceOpen] = useState(false);

  useEffect(() => {
    let active = true;
    walletService.getWallet()
      .then((response) => {
        const rate = Number(response.data?.data?.wallet?.starsPerUsd);
        if (active && Number.isFinite(rate) && rate > 0) setStarsPerUsd(rate);
      })
      .catch(() => {
        if (active) setStarsPerUsd(null);
      });
    return () => { active = false; };
  }, []);
  const [activeChapterId, setActiveChapterId] = useState(() => pageWasReloaded.current ? "" : location.state?.openChapterId || "");
  const [chapterStory, setChapterStory] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterAdding, setChapterAdding] = useState(false);
  const [chapterTitleFocusId, setChapterTitleFocusId] = useState(() => pageWasReloaded.current ? "" : location.state?.focusChapterId || "");
  const [chapterStatus, setChapterStatus] = useState("");
  const [cropTarget, setCropTarget] = useState(null);
  const [loadingPublication, setLoadingPublication] = useState(Boolean(id));
  const [aboutStep, setAboutStep] = useState(() => !id);
  const [chaptersStep, setChaptersStep] = useState(() => !pageWasReloaded.current && location.state?.composerStep === "chapters");
  const [continuingToChapter, setContinuingToChapter] = useState(false);
  const [aiSeenOpen, setAiSeenOpen] = useState(false);

  useEffect(() => {
    if (!location.state?.openChapterId && !location.state?.focusChapterId && !location.state?.composerStep) return;
    nav(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, []);

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
      pricing: publication?.pricing || empty.pricing,
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
          pricing: current.pricing,
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
    // The opening About step is a live local preview. It is persisted when the
    // creator presses Continue, so do not show an indefinite autosave state
    // while they type. Later editor steps still surface their real autosave.
    setStatus(aboutStep ? "Saved" : "Saving...");
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
      pricing: p.pricing || empty.pricing,
      allowDownload: Boolean(p.allowDownload),
      ownerWelcomeNote: p.ownerWelcomeNote || "",
      captionsEnabled: p.captionsEnabled !== false,
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
      let publication = await ensure({ navigateToDraft: !aboutStep });
      publication = (await api.updatePublicationDraft(publication.id, {
        title: p.title,
        summary: p.summary || p.description || p.title,
        description: p.description,
        category: p.category,
        seriesId: p.seriesId || p.series?.id || null,
        visibility: p.visibility || "PUBLIC",
        pricing: p.pricing || empty.pricing,
        allowDownload: Boolean(p.allowDownload),
        ownerWelcomeNote: p.ownerWelcomeNote || "",
        captionsEnabled: p.captionsEnabled !== false,
        experienceLocation: p.experienceLocation || "",
        taggedPeople: p.taggedPeople || [],
        entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
        tags: tagsWithoutSeries(p.tags),
        replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
        statusVersion: publication.statusVersion,
      })).data.data.publication;

      for (const [chapterIndex, chapter] of (p.chapters || []).entries()) {
        if (!chapter.stableChapterId) continue;
        await api.updateChapter(publication.id, chapter.stableChapterId, {
          title: (chapter.title || "").trim() || "Chapter name",
          blocks: chapter.blocks || [],
          isPreview: p.pricing?.mode !== "ONE_TIME" || chapterIndex === 0,
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

  useEffect(() => {
    if (aboutStep || !dirty.current || activeChapterId || busy.current || !hasDraftContent(p)) return undefined;
    window.clearTimeout(publicationAutoSaveTimer.current);
    publicationAutoSaveTimer.current = window.setTimeout(() => void save(), 850);
    return () => window.clearTimeout(publicationAutoSaveTimer.current);
  }, [aboutStep, activeChapterId, p.allowDownload, p.category, p.description, p.experienceLocation, p.pricing, p.seriesId, p.summary, p.taggedPeople, p.title, p.visibility]);

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
      nav(returnTo || (fromSeen ? "/seen" : "/profile"), { replace: true });
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
    setChapterStatus((current) => (/^Write\s/i.test(current) ? current : ""));
    setError("");
  }, [activeChapterId]);

  useEffect(() => {
    if (!chapterStatus || (!/(saved|added|removed)$/i.test(chapterStatus) && !/^Write\s/i.test(chapterStatus)))
      return undefined;
    const timer = window.setTimeout(() => setChapterStatus(""), 2600);
    return () => window.clearTimeout(timer);
  }, [chapterStatus]);

  useEffect(
    () => () => {
      if (videoToTrim?.url) URL.revokeObjectURL(videoToTrim.url);
      window.clearTimeout(chapterAutoSaveTimer.current);
      window.clearTimeout(publicationAutoSaveTimer.current);
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
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { kind, url: previewUrl };
    });
    try {
      const publication = await ensure({ navigateToDraft: !aboutStep });
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
      setCoverPreview((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return null;
      });
    } finally {
      setUploading("");
    }
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (pendingCoverKind.current === "VIDEO" || (pendingCoverKind.current === "AUTO" && file.type.startsWith("video/"))) {
      if (!file.type.startsWith("video/")) {
        setError("Choose a video file for this option.");
        return;
      }
      setError("");
      const url = URL.createObjectURL(file);
      try {
        const duration = await readVideoDuration(url);
        if (duration < 5) {
          URL.revokeObjectURL(url);
          setError("Seen cover videos must be at least 5 seconds.");
          return;
        }
        setVideoToTrim((current) => {
          if (current?.url) URL.revokeObjectURL(current.url);
          return { file, limitSeconds: pendingVideoLimit.current, target: "cover", url };
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

  const uploadOwnerVoice = async (source) => {
    const file = source?.target?.files?.[0] || source;
    if (source?.target) source.target.value = "";
    if (!file) return;
    setUploading("VOICE");
    setError("");
    try {
      const publication = await ensure({ navigateToDraft: false });
      await api.uploadMedia(publication.id, file, { mediaType: "VOICE", purpose: "INTRO", statusVersion: publication.statusVersion });
      await refresh(publication.id, { preserveLocalChanges: dirty.current });
      setToast("Voice hello added");
      setOwnerVoiceOpen(false);
    } catch (requestError) {
      setError(publicationError(requestError, "Could not add the voice hello"));
    } finally {
      setUploading("");
    }
  };

  const removeOwnerVoice = async () => {
    if (!p.id || !p.introMedia || uploading) return;
    setUploading("VOICE");
    try { await api.deleteMedia(p.id, "INTRO", p.statusVersion); await refresh(p.id, { preserveLocalChanges: dirty.current }); setToast("Voice hello removed"); }
    catch (requestError) { setError(publicationError(requestError, "Could not remove the voice hello")); }
    finally { setUploading(""); }
  };

  const chooseMedia = (kind, limitSeconds = 15) => {
    pendingCoverKind.current = kind;
    pendingVideoLimit.current = limitSeconds;
    if (coverInput.current)
      coverInput.current.accept =
        kind === "VIDEO" ? VIDEO_ACCEPT : kind === "AUTO" ? `${IMAGE_ACCEPT},${VIDEO_ACCEPT}` : IMAGE_ACCEPT;
    coverInput.current?.click();
  };

  const addChapter = async () => {
    if (chapterAdding) return;
    const maxChapters = 5;
    if (p.chapters.length >= maxChapters) {
      setError(`Maximum ${maxChapters} chapters.`);
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
        isPreview: p.pricing?.mode !== "ONE_TIME" || p.chapters.length === 0,
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      const addedChapterId = response.data?.data?.chapter?.stableChapterId || "";
      await refresh(publication.id, { preserveLocalChanges: dirty.current });
      if (addedChapterId) setActiveChapterId(addedChapterId);
      setStatus("Chapter added");
      if (creatingDraft) {
        nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, {
          replace: true,
          state: { openChapterId: addedChapterId },
        });
      }
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setChapterAdding(false);
    }
  };

  const completeAiSeen = async ({ chapters, description, sessionId, title }) => {
    if (!chapters?.length || continuingToChapter) {
      if (!chapters?.length) setError("Answer at least one photo question to create your Seen");
      return;
    }
    setContinuingToChapter(true);
    setError("");
    setStatus("Saving...");
    try {
      const lowerWords = `${title} ${description}`.toLowerCase();
      const category = lowerWords.match(/travel|trip|city|beach|mountain/u) ? "Travel"
        : lowerWords.match(/work|business|client|career/u) ? "Business"
          : lowerWords.match(/food|cook|meal|coffee/u) ? "Food"
            : lowerWords.match(/fitness|gym|run|health/u) ? "Fitness"
              : "Lifestyle";
      let publication = (await api.createPublicationDraft({
        kind: "SEEN",
        title,
        summary: description || title,
        description,
        category,
        visibility: p.visibility || "PUBLIC",
        pricing: p.pricing || empty.pricing,
        tags: [],
      })).data.data.publication;
      sessionStorage.setItem("atseen_new_seen_draft", publication.id);
      await api.linkAiSeenPublication(sessionId, publication.id);
      for (const [chapterIndex, prepared] of chapters.entries()) {
        const added = await api.addChapter(publication.id, {
          title: prepared.heading || `Chapter ${chapterIndex + 1}`,
          blocks: [],
          isPreview: publication.pricing?.mode !== "ONE_TIME" || chapterIndex === 0,
          releaseMode: "IMMEDIATE",
          statusVersion: publication.statusVersion,
        });
        const chapterId = added.data?.data?.chapter?.stableChapterId;
        publication = await refresh(publication.id);
        const blockId = globalThis.crypto?.randomUUID?.() || `ai-photo-${Date.now()}-${chapterIndex}`;
        const uploaded = (await api.uploadMedia(publication.id, prepared.file, { chapterId, blockId, mediaType: "IMAGE" })).data?.data;
        await api.updateChapter(publication.id, chapterId, {
          title: prepared.heading || `Chapter ${chapterIndex + 1}`,
          blocks: [
            { id: blockId, type: "IMAGE", order: 0, media: uploaded, metadata: { label: prepared.caption || "", aiGeneratedCaption: true } },
            { id: `${blockId}-text`, type: "TEXT", order: 1, text: prepared.text },
          ],
          isPreview: publication.pricing?.mode !== "ONE_TIME" || chapterIndex === 0,
          releaseMode: "IMMEDIATE",
          statusVersion: publication.statusVersion,
        });
        publication = await refresh(publication.id);
      }
      setAiSeenOpen(false);
      setAboutStep(false);
      setChaptersStep(true);
      setStatus("Saved");
      nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, { replace: true, state: { composerStep: "chapters", aiGenerated: true } });
    } catch (requestError) {
      setError(publicationError(requestError, "Could not create this AI Seen"));
    } finally {
      setContinuingToChapter(false);
    }
  };

  const continueToFirstChapter = async () => {
    const title = p.title.trim();
    if (!title) {
      setError("Give it a title");
      document.querySelector(".seen-about-title")?.focus();
      return;
    }
    if (continuingToChapter || uploading) return;
    setContinuingToChapter(true);
    setError("");
    setStatus("Saving...");
    try {
      let publication = p.id ? p : await ensure({ navigateToDraft: false });
      publication = (await api.updatePublicationDraft(publication.id, {
        title,
        summary: p.summary || p.description || title,
        description: p.description,
        category: p.category,
        seriesId: p.seriesId || p.series?.id || null,
        visibility: p.visibility || "PUBLIC",
        pricing: p.pricing || empty.pricing,
        allowDownload: Boolean(p.allowDownload),
        experienceLocation: p.experienceLocation || "",
        taggedPeople: p.taggedPeople || [],
        entityRefs: (p.attachedEntities || []).map((entity) => ({ entityId: entity.id, entityType: entity.type })),
        tags: tagsWithoutSeries(p.tags),
        replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
        statusVersion: publication.statusVersion,
      })).data.data.publication;

      let chapterId = publication.chapters?.[0]?.stableChapterId || "";
      if (!chapterId) {
        const response = await api.addChapter(publication.id, {
          title: "Chapter name",
          blocks: [],
          isPreview: true,
          releaseMode: "IMMEDIATE",
          statusVersion: publication.statusVersion,
        });
        chapterId = response.data?.data?.chapter?.stableChapterId || "";
      }
      const latest = await refresh(publication.id);
      const firstChapter = latest.chapters.find((chapter) => chapter.stableChapterId === chapterId) || latest.chapters[0];
      initialChapterStarted.current = true;
      setAboutStep(false);
      setChaptersStep(p.pricing?.mode === "ONE_TIME");
      if (p.pricing?.mode !== "ONE_TIME" && firstChapter?.stableChapterId) {
        setActiveChapterId(firstChapter.stableChapterId);
        setChapterStory(chapterStoryText(firstChapter));
      } else {
        setActiveChapterId("");
        setChapterStory("");
      }
      dirty.current = false;
      setStatus("Saved");
      if (String(id || "") !== String(publication.id)) {
        nav(`/studio/seens/${publication.id}/edit${draftSuffix}`, {
          replace: true,
          state: p.pricing?.mode === "ONE_TIME"
            ? { composerStep: "chapters" }
            : { openChapterId: firstChapter?.stableChapterId || chapterId },
        });
      }
    } catch (requestError) {
      setStatus("Save failed");
      setError(publicationError(requestError, "Could not start the first chapter"));
    } finally {
      setContinuingToChapter(false);
    }
  };

  useEffect(() => {
    if (aboutStep || id || loadingPublication || p.id || p.chapters.length || initialChapterStarted.current) return;
    initialChapterStarted.current = true;
    void addChapter();
  }, [aboutStep, id, loadingPublication, p.chapters.length, p.id]);

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
    setStatus("Saving...");
    setError("");
  };

  const saveChapterStory = async ({ close = true } = {}) => {
    if (!activeChapter || !p.id || chapterSaving) return;
    window.clearTimeout(chapterAutoSaveTimer.current);
    setChapterSaving(true);
    setChapterStatus("Saving chapter...");
    setError("");
    try {
      await api.updateChapter(p.id, activeChapter.stableChapterId, {
        title: activeChapter.title || "Chapter name",
        blocks: chapterBlocksWithStory(activeChapter, chapterStory),
        isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
        releaseMode: "IMMEDIATE",
        statusVersion: p.statusVersion,
      });
      const publication = await refresh(p.id);
      if (close) setActiveChapterId("");
      setChapterStatus("Draft saved");
      setStatus("Chapter saved");
      return publication;
    } catch (requestError) {
      setChapterStatus("Chapter save failed");
      setError(publicationError(requestError));
      if (requestError.response?.status === 409 && p.id)
        await refresh(p.id).catch(() => {});
      return null;
    } finally {
      setChapterSaving(false);
    }
  };

  const previewSeen = async () => {
    if (!activeChapter || !p.id || chapterSaving) return;
    window.clearTimeout(chapterAutoSaveTimer.current);
    setChapterSaving(true);
    setChapterStatus("Preparing preview...");
    setError("");
    try {
      let publication = p;
      if (chapterHasContent(activeChapter, chapterStory)) {
        await api.updateChapter(p.id, activeChapter.stableChapterId, {
          title: activeChapter.title?.trim() || "Chapter name",
          blocks: chapterBlocksWithStory(activeChapter, chapterStory),
          isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
          releaseMode: activeChapter.releaseMode || "IMMEDIATE",
          statusVersion: p.statusVersion,
        });
        publication = await refresh(p.id);
      }

      const chapters = publication.chapters || [];
      const hasCompletedChapter = chapters.some((chapter) => chapterHasContent(chapter));
      const firstBlankIndex = chapters.findIndex((chapter) => !chapterHasContent(chapter));
      if (!hasCompletedChapter && firstBlankIndex >= 0) {
        const firstBlank = publication.chapters[firstBlankIndex];
        setActiveChapterId(firstBlank.stableChapterId);
        setChapterStory(chapterStoryText(firstBlank));
        setChapterStatus(firstBlankIndex === 0 ? "Write the first chapter" : `Write chapter ${firstBlankIndex + 1}`);
        setStatus("Saved");
        dirty.current = false;
        return;
      }

      if (hasCompletedChapter && firstBlankIndex >= 0) {
        const blankChapterIds = chapters
          .filter((chapter) => !chapterHasContent(chapter))
          .map((chapter) => chapter.stableChapterId);
        for (const chapterId of blankChapterIds) {
          await api.deleteChapter(p.id, chapterId, publication.statusVersion);
          publication = await refresh(p.id);
        }
      }

      setActiveChapterId("");
      setChapterStory("");
      dirty.current = false;
      setIntroOpen(true);
      setChapterStatus("");
      setStatus("Saved");
    } catch (requestError) {
      setChapterStatus("Preview could not be prepared");
      setError(publicationError(requestError, "Could not prepare the Seen preview"));
      if (requestError.response?.status === 409) await refresh(p.id).catch(() => {});
    } finally {
      setChapterSaving(false);
    }
  };

  useEffect(() => {
    if (!activeChapterId || !p.id || chapterSaving) return undefined;
    window.clearTimeout(chapterAutoSaveTimer.current);
    chapterAutoSaveTimer.current = window.setTimeout(() => {
      void saveChapterStory({ close: false });
    }, 900);
    return () => window.clearTimeout(chapterAutoSaveTimer.current);
  }, [activeChapter?.title, activeChapterId, chapterStory]);

  const selectSeenChapter = async (index) => {
    const publication = await saveChapterStory({ close: false });
    const target = publication?.chapters?.[index] || p.chapters?.[index];
    if (target?.stableChapterId) {
      setActiveChapterId(target.stableChapterId);
      setChapterStory(chapterStoryText(target));
      setChapterStatus("Draft saved");
    }
  };

  const nextSeenChapter = async () => {
    const currentIndex = p.chapters.findIndex((chapter) => chapter.stableChapterId === activeChapterId);
    const publication = await saveChapterStory({ close: false });
    if (!publication) return;
    const existingNext = publication.chapters?.[currentIndex + 1];
    if (existingNext?.stableChapterId) {
      setActiveChapterId(existingNext.stableChapterId);
      setChapterStory(chapterStoryText(existingNext));
      setChapterStatus("Draft saved");
      return;
    }
    if ((publication.chapters?.length || 0) >= 5) {
      setActiveChapterId("");
      return;
    }
    setChapterSaving(true);
    setChapterStatus("Creating next chapter...");
    try {
      const response = await api.addChapter(publication.id, {
        title: `Chapter ${(publication.chapters?.length || 0) + 1}`,
        blocks: [],
        isPreview: publication.pricing?.mode !== "ONE_TIME",
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      const chapterId = response.data?.data?.chapter?.stableChapterId;
      await refresh(publication.id);
      if (chapterId) {
        setActiveChapterId(chapterId);
        setChapterStory("");
      }
      setChapterStatus("Draft saved");
    } catch (requestError) {
      setError(publicationError(requestError));
    } finally {
      setChapterSaving(false);
    }
  };

  const previousSeenChapter = async () => {
    const currentIndex = p.chapters.findIndex((chapter) => chapter.stableChapterId === activeChapterId);
    if (currentIndex <= 0) {
      await saveChapterStory();
      return;
    }
    await selectSeenChapter(currentIndex - 1);
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
        isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
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

  const requestChapterMedia = async (mediaType, file, metadata = {}) => {
    if (mediaType === "VIDEO") {
      const limitSeconds = p.pricing?.mode === "ONE_TIME" ? 120 : 60;
      const url = URL.createObjectURL(file);
      try {
        const duration = await readVideoDuration(url);
        if (duration > limitSeconds + 0.1) {
          setVideoToTrim({ file, limitSeconds, metadata, target: "chapter", url });
          return;
        }
      } catch (durationError) {
        setError(durationError.message);
        URL.revokeObjectURL(url);
        return;
      }
      URL.revokeObjectURL(url);
      return uploadChapterMedia(mediaType, file, metadata);
    }
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
        isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
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
        isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
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
        isPreview: p.pricing?.mode !== "ONE_TIME" || Boolean(activeChapter.isPreview),
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
      nav(returnTo || (fromSeen ? "/seen" : "/profile"), {
        replace: true,
        state: returnTo || fromSeen ? undefined : { publishedSeen: { id: published?.id || publication.id, title: published?.title || publication.title } },
      });
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

  const mediaPreview = coverPreview?.url || p.coverMedia?.secureUrl || p.coverMedia?.url;
  const coverMediaDescriptor = [
    p.coverMedia?.mediaType,
    p.coverMedia?.resourceType,
    p.coverMedia?.type,
    p.coverMedia?.mimeType,
    p.coverMedia?.format,
  ].filter(Boolean).join(" ").toLowerCase();
  const mediaKind =
    coverPreview?.kind ||
    (coverMediaDescriptor.includes("video")
      || /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(String(mediaPreview || ""))
      || Number(p.coverMedia?.durationSeconds ?? p.coverMedia?.duration) > 0
      ? "VIDEO"
      : "IMAGE");
  const statusText = statusLabel(status, uploading);
  const selectedAudience = audienceOptions.find((option) => option.value === (p.visibility || "PUBLIC")) || audienceOptions[0];
  const selectedSeriesLabel = p.series?.name || savedSeries.find((item) => item.id === p.seriesId)?.name || "None";
  const AudienceIcon = selectedAudience.icon;
  const creatorName = user?.name || user?.displayName || user?.username || "Creator";
  const creatorAvatar = resolveMediaUrl(user?.avatar || user?.avatarUrl || user?.profilePhoto || "");
  const paidSeen = p.pricing?.mode === "ONE_TIME";
  const paidPriceStars = Number(p.pricing?.starsAmount) || 190;
  const paidPriceUsd = Number(starsPerUsd) > 0 ? paidPriceStars / Number(starsPerUsd) : null;
  const maxChapters = 5;
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

  if (aboutStep) {
    const description = p.description || p.summary || "";
    return (
      <section className="seen-compose-page seen-about-page">
        {toast ? <p className="seen-compose-toast" role="status">{toast}</p> : null}
        {error || statusText ? (
          <div className="seen-compose-feedback-stack" aria-live="polite">
            {error ? <p className="seen-compose-feedback is-error" role="alert">{error}</p> : null}
            {statusText ? <p className="seen-compose-feedback is-status" role="status">{statusText}</p> : null}
          </div>
        ) : null}
        {cropTarget ? <ProfileImageCropper kind="seen" onCancel={closeImageCrop} onSave={useCroppedImage} source={cropTarget.url} /> : null}
        {videoToTrim ? (
          <VideoTrimSheet
            coverMode
            enableCrop
            file={videoToTrim}
            limitSeconds={videoToTrim.limitSeconds}
            onCancel={() => setVideoToTrim((current) => {
              if (current?.url) URL.revokeObjectURL(current.url);
              return null;
            })}
            onUpload={(file) => uploadCoverFile(file, "VIDEO")}
          />
        ) : null}

        <header className="seen-about-header">
          <button aria-label="Back" className="seen-compose-back" onClick={() => p.id ? setAboutStep(false) : nav(backTarget)} type="button"><FiChevronLeft /></button>
          <div>
            <h1>{paidSeen ? "New paid Seen" : "New Seen"}</h1>
            <p>{paidSeen ? "A path you’ve walked — told in chapters" : "A short story told in up to 5 chapters"}</p>
          </div>
        </header>
        {paidSeen ? <div className="seen-paid-create-progress" aria-label="Step 1 of 3"><i /><i /><i /></div> : null}

        <div className="seen-about-body">
          <button className="seen-create-from-photos" onClick={() => setAiSeenOpen(true)} type="button"><span><FiEye /></span><span><b>Create from photos</b><small>Tell what happened — AI writes it up</small></span><FiChevronRight /></button>
          {!paidSeen ? <section className="seen-about-preview" aria-label="Live feed preview">
            <header>
              <span className="seen-about-avatar">{creatorAvatar ? <img alt="" src={creatorAvatar} /> : creatorName.slice(0, 1).toUpperCase()}</span>
              <strong>{creatorName.split(" ")[0]}</strong>
              <small>now</small>
              <em>FEED PREVIEW</em>
            </header>
            <div className="seen-about-preview-content">
              <button className={`seen-about-cover ${mediaPreview ? "has-media" : ""}`} disabled={Boolean(uploading)} onClick={() => mediaPreview ? setSettingsSheet("cover") : chooseMedia("AUTO", 15)} type="button">
                {mediaPreview ? mediaKind === "VIDEO" ? <video autoPlay loop muted playsInline preload="metadata" src={mediaPreview} /> : <img alt="Seen cover preview" src={mediaPreview} /> : <span><FiPlus /><b>Add cover</b><small>photo or video · optional</small></span>}
                {mediaPreview ? <i>{uploading ? "Uploading..." : "Adjust"}</i> : null}
              </button>
              <div className="seen-about-preview-copy">
                <strong className={p.title.trim() ? "" : "is-placeholder"}>{p.title.trim() || "Your title"}</strong>
                <small>up to {maxChapters} chapters{paidSeen ? ` · ✦${p.pricing?.starsAmount || 190}` : ""}</small>
                {description ? <p>{description}</p> : null}
              </div>
            </div>
          </section> : <section className="seen-paid-prototype-preview" aria-label="Paid Seen preview">
            <button className={`seen-paid-prototype-cover ${mediaPreview ? "has-media" : ""}`} disabled={Boolean(uploading)} onClick={() => mediaPreview ? setSettingsSheet("cover") : chooseMedia("AUTO", 15)} type="button">
              {mediaPreview ? mediaKind === "VIDEO" ? <video autoPlay loop muted playsInline preload="metadata" src={mediaPreview} /> : <img alt="Paid Seen cover preview" src={mediaPreview} /> : <span><FiPlus /><b>Add cover</b><small>photo or video · optional</small></span>}
            </button>
            <button className="seen-paid-prototype-edit" onClick={() => mediaPreview ? setSettingsSheet("cover") : chooseMedia("AUTO", 15)} type="button">Edit</button>
            <button className="seen-paid-prototype-video" onClick={() => chooseMedia("VIDEO", 15)} type="button"><FiPlay /><b>Add a video cover</b><span>· 5–15 sec, it plays in the feed</span></button>
            <div className="seen-paid-prototype-title"><small>Give it a title</small><strong>{p.title.trim() || "Your title"}</strong></div>
          </section>}

          {!paidSeen ? mediaPreview && mediaKind === "VIDEO" ? <div className="seen-about-video-nudge is-confirmed"><FiCheck /><span>Video cover · plays in the feed</span></div> : <button className="seen-about-video-nudge" onClick={() => chooseMedia("VIDEO", 15)} type="button"><FiPlay /><span><b>Add a video cover</b> · 5–15 sec, it plays in the feed</span></button> : null}

          <label className="seen-about-title-field">
            <span className="sr-only">Seen title</span>
            <input className="seen-about-title" maxLength={80} onChange={(event) => change({ title: event.target.value })} placeholder={paidSeen ? "Title — e.g. “Moving to Dubai”" : "Give it a title"} value={p.title} />
          </label>
          <label className="seen-about-description-field">
            <span className="sr-only">Seen description</span>
            <textarea maxLength={220} onChange={(event) => change({ description: event.target.value, summary: event.target.value })} placeholder={paidSeen ? "The path — from where to where. “From office job to my own studio”" : "What’s it about? A line or two — optional"} rows={3} value={description} />
          </label>
          {replyToSeenId ? <p className="seen-compose-reply-context">Replying to {replySeen?.title ? `“${replySeen.title}”` : "this Seen"}</p> : null}
          <button className="seen-about-continue" disabled={!p.title.trim() || Boolean(uploading || continuingToChapter)} onClick={continueToFirstChapter} type="button">{continuingToChapter ? "Opening chapter..." : t("Continue")}</button>
        </div>
        <input accept={`${IMAGE_ACCEPT},${VIDEO_ACCEPT}`} className="sr-only" onChange={uploadCover} ref={coverInput} type="file" />
        {settingsSheet === "cover" ? <CoverSheet hasCover={Boolean(p.coverMedia || coverPreview)} onClose={() => setSettingsSheet("")} onUpload={(kind) => chooseMedia(kind, 15)} /> : null}
      </section>
    );
  }

  if (activeChapter) {
    return (
      <>
        {videoToTrim?.target === "chapter" ? <VideoTrimSheet file={videoToTrim} limitSeconds={videoToTrim.limitSeconds} onCancel={() => setVideoToTrim((current) => { if (current?.url) URL.revokeObjectURL(current.url); return null; })} onUpload={(file) => { const metadata = videoToTrim.metadata || {}; setVideoToTrim(null); return uploadChapterMedia("VIDEO", file, metadata); }} /> : null}
        {cropTarget ? (
          <ProfileImageCropper
            kind="seen"
            onCancel={closeImageCrop}
            onSave={useCroppedImage}
            source={cropTarget.url}
          />
        ) : null}
        <SeenChapterEditor
          key={activeChapter.stableChapterId}
          busy={chapterSaving}
          chapter={activeChapter}
          error={error}
          flow={{
            canAdd: p.chapters.length < maxChapters,
            index: Math.max(0, p.chapters.findIndex((chapter) => chapter.stableChapterId === activeChapterId)),
            max: maxChapters,
            nextLabel: p.chapters.findIndex((chapter) => chapter.stableChapterId === activeChapterId) < p.chapters.length - 1 ? "Next" : p.chapters.length < maxChapters ? "New chapter" : "Review",
            onAdd: nextSeenChapter,
            onBack: previousSeenChapter,
            onFinish: previewSeen,
            onNext: nextSeenChapter,
            onSelect: selectSeenChapter,
            total: p.chapters.length,
          }}
          onAddBlocks={addStructuredBlocks}
          onAddPlace={addPlaceBlock}
          onDone={saveChapterStory}
          onMediaUpload={requestChapterMedia}
          onRemoveBlock={removeChapterBlock}
          onReorderBlocks={reorderChapterBlocks}
          onStoryChange={(value) => {
            setChapterStory(value);
            setChapterStatus("Saving…");
          }}
          onTitleChange={(title) => changeChapterTitle(activeChapter.stableChapterId, title)}
          onUpdateBlock={updateStructuredBlock}
          status={chapterStatus}
          story={chapterStory}
        />
      </>
    );
  }

  if (paidSeen && chaptersStep) {
    return (
      <section className="seen-compose-page seen-chapters-step">
        {toast ? <p className="seen-compose-toast" role="status">{toast}</p> : null}
        {error || statusText ? <div className="seen-compose-feedback-stack" aria-live="polite">{error ? <p className="seen-compose-feedback is-error" role="alert">{error}</p> : null}{statusText ? <p className="seen-compose-feedback is-status" role="status">{statusText}</p> : null}</div> : null}
        <header className="seen-compose-header seen-flow-step-header">
          <button aria-label="Back" className="seen-compose-back" onClick={() => setAboutStep(true)} type="button"><FiChevronLeft /></button>
          <div className="seen-compose-heading"><h1>{t("Chapters")}</h1><p>{p.title || "Your paid Seen"}</p></div>
        </header>
        <div className="seen-paid-create-progress is-step-two" aria-label="Step 2 of 3"><i /><i /><i /></div>
        <div className="seen-chapters-step-body">
          <p className="seen-chapters-step-intro">Each chapter is one step of the path. Write it, add photos, a voice note — the same way people will read it.</p>
          <div className="seen-compose-chapters is-page-grid">
            {p.chapters.map((chapter, index) => <div className="seen-compose-chapter is-page" key={chapter.stableChapterId || index}><span>{String(index + 1).padStart(2, "0")}</span><button aria-label={`Remove chapter ${index + 1}`} onClick={() => removeChapter(chapter)} type="button"><FiX /></button><button className="seen-compose-chapter-page-copy" onClick={() => openChapterEditor(chapter)} type="button"><strong>{chapter.title?.trim() || `Chapter ${index + 1}`}{p.aiAssistance?.generated ? <FiEdit3 aria-label="AI suggestion — editable" /> : null}</strong>{chapterStoryText(chapter) ? <small>{chapterStoryText(chapter)}</small> : null}</button><span className={`seen-chapter-access-toggle ${index === 0 ? "is-preview" : "is-locked"}`}>{index === 0 ? <FiEye /> : <FiLock />}{t(index === 0 ? "Preview" : "Locked")}</span></div>)}
            {p.chapters.length < maxChapters ? <button className="seen-compose-add-chapter is-page" disabled={chapterAdding} onClick={addChapter} type="button"><FiPlus /><span>{chapterAdding ? "Adding..." : `Chapter ${p.chapters.length + 1}`}</span></button> : null}
          </div>
          <p className="seen-chapters-step-count">{p.chapters.length}/{maxChapters} · you can add chapters after publishing — buyers get them free</p>
          <button className="seen-about-continue" disabled={!p.chapters.length || Boolean(chapterAdding || chapterSaving)} onClick={() => setChaptersStep(false)} type="button">{t("Continue")}</button>
        </div>
      </section>
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
          onClick={() => paidSeen ? setChaptersStep(true) : p.chapters.length ? openChapterEditor(p.chapters[p.chapters.length - 1]) : setAboutStep(true)}
          type="button"
        >
          <FiChevronLeft />
        </button>
        <div className="seen-compose-heading">
          <h1>{paidSeen ? t("Price & publish") : "Preview & publish"}</h1>
          {introOpen && !p.chapters.length ? (
            <p>
              <span>
                Seen - a post made of chapters. People walk it like a
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
        <button className="seen-compose-save" onClick={() => paidSeen ? setBuyerViewOpen(true) : saveForLater()} type="button">
          {paidSeen ? <><FiEye /> {t("Buyer view")}</> : "Save for later"}
        </button>
      </header>
      {paidSeen ? <div className="seen-paid-create-progress is-step-three" aria-label="Step 3 of 3"><i /><i /><i /></div> : null}

      <div className="seen-compose-body">
        <section className={`seen-review-feed-preview ${paidSeen ? "is-paid-publish" : ""}`} aria-label="Seen feed preview">
          <header>
            <span className="seen-about-avatar">{creatorAvatar ? <img alt="" src={creatorAvatar} /> : creatorName.slice(0, 1).toUpperCase()}</span>
            <strong>{creatorName.split(" ")[0]}</strong>
            <small>now</small>
            <button onClick={() => setAboutStep(true)} type="button">EDIT <FiChevronRight aria-hidden="true" /></button>
          </header>
          <div className="seen-review-feed-content">
            <button aria-label="Edit Seen cover" className={`seen-review-feed-cover ${mediaPreview ? "has-media" : ""}`} onClick={() => setAboutStep(true)} type="button">
              {mediaPreview ? mediaKind === "VIDEO" ? <video autoPlay loop muted playsInline preload="metadata" src={mediaPreview} /> : <img alt="Seen cover" src={mediaPreview} /> : <span><FiPlus /><b>Add cover</b></span>}
            </button>
            <div className="seen-review-feed-copy">
              <strong>{p.title || "Your title"}</strong>
              <small>{p.chapters.length} {p.chapters.length === 1 ? "chapter" : "chapters"}</small>
              {p.description || p.summary ? <p>{p.description || p.summary}</p> : null}
            </div>
          </div>
        </section>
        <input
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={uploadCover}
          ref={coverInput}
          type="file"
        />
        {videoToTrim ? (
          <VideoTrimSheet
            coverMode
            enableCrop
            file={videoToTrim}
            limitSeconds={videoToTrim.limitSeconds}
            onCancel={() =>
              setVideoToTrim((current) => {
                if (current?.url) URL.revokeObjectURL(current.url);
                return null;
              })
            }
            onUpload={(file) => videoToTrim.target === "chapter" ? uploadChapterMedia("VIDEO", file, videoToTrim.metadata || {}) : uploadCoverFile(file, "VIDEO")}
          />
        ) : null}

        {replyToSeenId ? (
          <p className="seen-compose-reply-context">
            Replying to{" "}
            {replySeen?.title ? `\u201c${replySeen.title}\u201d` : "this Seen"}
          </p>
        ) : null}

        <div className="seen-compose-section-title">
          <span>CHAPTERS</span>
          <small>
            {paidSeen ? "Chapter 1 Preview / rest Locked" : `${p.chapters.length}/${maxChapters} \u00b7 tap a page to edit`}
          </small>
        </div>

        <div className="seen-compose-chapters is-page-grid">
          {p.chapters.map((chapter, index) => (
            <div
              className="seen-compose-chapter is-page"
              key={chapter.stableChapterId || index}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {paidSeen && index > 0 ? <span className="seen-compose-chapter-lock">🔒</span> : null}
              <button
                aria-label={`Remove chapter ${index + 1}`}
                onClick={() => removeChapter(chapter)}
                type="button"
              >
                <FiX />
              </button>
              <button className="seen-compose-chapter-page-copy" onClick={() => openChapterEditor(chapter)} type="button">
                <strong>{chapter.title?.trim() || `Chapter ${index + 1}`}{p.aiAssistance?.generated ? <FiEdit3 aria-label="AI suggestion — editable" /> : null}</strong>
                {chapterStoryText(chapter) ? <small>{chapterStoryText(chapter)}</small> : null}
              </button>
              {paidSeen ? <span className={`seen-chapter-access-toggle ${index === 0 ? "is-preview" : "is-locked"}`}>{index === 0 ? <FiEye /> : <FiLock />}{t(index === 0 ? "Preview" : "Locked")}</span> : null}
            </div>
          ))}
          {p.chapters.length < maxChapters ? (
            <button
              className="seen-compose-add-chapter is-page"
              disabled={chapterAdding}
              onClick={addChapter}
              type="button"
            >
              <FiPlus aria-hidden="true" />
              <span>{chapterAdding ? "Adding..." : p.chapters.length ? t("Add chapter") : "Chapter 1"}</span>
            </button>
          ) : null}
        </div>

        {paidSeen ? <p className="seen-paid-chapter-access-note"><FiEye /> Preview chapters are free for everyone — that’s how people decide to unlock the rest.</p> : null}

        {paidSeen ? <>
          <section className="seen-paid-pricing-panel" aria-label="Choose paid Seen price">
            <div className="seen-paid-price-presets">{[90, 190, 290, 490].map((amount) => <button className={(Number(p.pricing?.starsAmount) || 190) === amount ? "is-selected" : ""} key={amount} onClick={() => change({ pricing: { mode: "ONE_TIME", starsAmount: amount, presetId: `paid-seen-${amount}` } })} type="button"><span>✦</span>{amount}</button>)}</div>
            <p><b>SUGGESTED</b><span>Similar Seens sell best at 190–290</span></p>
            <div className="seen-paid-earnings"><span><small>You get from each unlock</small><strong>{paidPriceUsd == null ? "—" : usd(paidPriceUsd)}</strong></span><span><b>100 owners <strong>{paidPriceUsd == null ? "—" : usd(paidPriceUsd * 100)}</strong></b><small>{starsPerUsd ? `${Number(starsPerUsd).toLocaleString()} Stars = $1` : "Loading exchange rate…"}</small></span></div>
          </section>
          <section className="seen-paid-owner-note">
            <span>NOTE FOR OWNERS</span>
            <p>Everyone who unlocks gets this — on the “It’s yours” screen and in their chat with you.</p>
            <textarea maxLength={500} onChange={(event) => change({ ownerWelcomeNote: event.target.value })} placeholder="Welcome them in — where should they start?" value={p.ownerWelcomeNote || ""} />
            {p.introMedia?.secureUrl || p.introMedia?.url ? <div className="seen-owner-voice-attached"><audio controls src={p.introMedia.secureUrl || p.introMedia.url} /><button disabled={uploading === "VOICE"} onClick={removeOwnerVoice} type="button">Remove</button></div> : null}
            <button disabled={uploading === "VOICE"} onClick={() => setOwnerVoiceOpen(true)} type="button"><FiMic /> {uploading === "VOICE" ? "Adding voice…" : p.introMedia ? "Replace voice hello" : "Add a voice hello"}</button>
          </section>
        </> : null}
        <div className={`seen-compose-settings ${paidSeen ? "is-paid-publish" : ""}`} aria-label="Seen settings">
          {paidSeen ? <label className="seen-review-paid-price"><span><FiLock /><b>One-time price</b><small>Chapter 1 stays free</small></span><span>✦ <input aria-label="Paid Seen price" min="10" onChange={(event) => change({ pricing: { mode: "ONE_TIME", starsAmount: Math.max(10, Math.round(Number(event.target.value) || 10)), presetId: "paid-seen" } })} type="number" value={Number(p.pricing?.starsAmount) || 190} /></span></label> : null}
          <SettingsRow Icon={FiTag} label="Category" onClick={() => setSettingsSheet("category")} value={p.category || (paidSeen ? "Choose" : "-")} />
          {!paidSeen ? <SettingsRow Icon={FiGrid} label="Series" onClick={() => { setSeriesError(""); setSettingsSheet("series"); }} value={selectedSeriesLabel} /> : null}
          {!paidSeen ? <SettingsRow Icon={FiUsers} label="Tag people" onClick={() => setSettingsSheet("people")} value={p.taggedPeople?.length ? `${p.taggedPeople.length} tagged` : "None"} /> : null}
          <SettingsRow Icon={FiMapPin} label="Location" onClick={() => setSettingsSheet("location")} value={p.experienceLocation || "Add"} />
          {paidSeen ? <SettingsRow Icon={FiFilm} label="Captions & AI label" onClick={() => change({ captionsEnabled: p.captionsEnabled === false })} value={p.captionsEnabled === false ? "Off" : "Captions"} /> : null}
          {paidSeen ? <SettingsRow Icon={FiUpload} label="PDF copy for owners" onClick={() => change({ allowDownload: !p.allowDownload })} toggle value={p.allowDownload ? "On" : "Off"} /> : null}
          {!paidSeen ? <SettingsRow Icon={AudienceIcon} label="Audience" onClick={() => setSettingsSheet("audience")} value={selectedAudience.label} /> : null}
          {!paidSeen ? <SettingsRow Icon={FiUpload} label="Allow download" onClick={() => change({ allowDownload: !p.allowDownload })} toggle value={p.allowDownload ? "On" : "Off"} /> : null}
          {!paidSeen ? <SettingsRow Icon={FiFilm} label="Part of an Experience" onClick={() => setSettingsSheet("experience")} value={(p.attachedEntities || []).find((item) => item.type === "experience")?.title || "None"} /> : null}
        </div>
        {linkOnlyShare?.url ? (
          <div className="seen-compose-share-link">
            <span>{linkOnlyShare.url}</span>
            <button onClick={copyShareLink} type="button"><FiCopy aria-hidden="true" />{linkOnlyShare.copied ? "Copied" : "Copy link"}</button>
          </div>
        ) : null}

        <button className="seen-compose-publish" disabled={Boolean(uploading || submitting)} onClick={submit} type="button">{submitting ? "Publishing..." : p.publishedVersion ? "Republish" : "Publish"}</button>
        {paidSeen ? <small className="seen-paid-publish-footnote">Owners keep it forever — new chapters reach them free</small> : <button className="seen-compose-cancel" disabled={Boolean(uploading || submitting || canceling)} onClick={cancelCreation} type="button">{canceling ? "Canceling..." : "Cancel"}</button>}
      </div>
      {ownerVoiceOpen ? <OwnerVoiceSheet busy={uploading === "VOICE"} onClose={() => !uploading && setOwnerVoiceOpen(false)} onSave={uploadOwnerVoice} /> : null}
      {paidSeen && buyerViewOpen ? <PaidSeenBuyerView chapters={p.chapters} coverKind={mediaKind} coverUrl={mediaPreview} creatorAvatar={creatorAvatar} creatorName={creatorName.split(" ")[0]} onClose={() => setBuyerViewOpen(false)} onUnlock={() => setToast("Buyer preview only — publishing makes this unlock available to fans")} price={paidPriceStars} title={p.title} /> : null}
      <AiSeenGuide onClose={() => setAiSeenOpen(false)} onComplete={completeAiSeen} open={aiSeenOpen} />
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
        <CoverSheet hasCover={Boolean(p.coverMedia)} onClose={() => setSettingsSheet("")} onUpload={(kind) => chooseMedia(kind, 30)} />
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
