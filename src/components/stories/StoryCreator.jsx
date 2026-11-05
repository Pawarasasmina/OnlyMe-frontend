import FanAvatar from "../fanWeb/shared/FanAvatar";
import "./WallNoteStory.css";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiEdit3, FiEye, FiHelpCircle, FiImage, FiRefreshCw, FiRepeat, FiTrash2, FiType, FiUsers, FiX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useCreateStory } from "../../hooks/useStories";
import { canCreateStory } from "../../utils/storyPermissions";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import StoryReshareCard from "./StoryReshareCard";
import StoryMentionPicker from "./StoryMentionPicker";
import { storyTextStyle } from "../../utils/storyPresentation";

const STORY_COLORS = ["#FFFFFF", "#D6EAFF", "#9CCBFF", "#0A0C0F", "#6ECF97", "#F17878"];
const STORY_TEXT_STYLES = [
  { get label() { return __msg("stories.classic"); }, value: 0 },
  { get label() { return __msg("fanWeb.strong"); }, value: 1 },
  { get label() { return __msg("stories.serif"); }, value: 3 },
  { get label() { return __msg("stories.mono"); }, value: 4 },
  { get label() { return __msg("stories.neon"); }, value: 5 },
];
const STORY_AUDIENCES = [
  { icon: FiEye, get label() { return __msg("onboarding.everyone"); }, value: "everyone" },
  { icon: FiUsers, get label() { return __msg("stories.friends_c11d5e"); }, value: "close_circle" },
  { icon: FiEye, get label() { return __msg("stories.myWorld"); }, value: "world" },
];
const STORY_GRADIENTS = [
  ["#16233a", "#0b0e13"],
  ["#3d5f8f", "#0d1118"],
  ["#0f1f38", "#04060a"],
];
function newTextOverlay(text = "", position = {}) {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    color: "#FFFFFF",
    size: 28,
    style: 0,
    align: "center",
    backgroundMode: 0,
    rotation: 0,
    text,
    x: position.x ?? 0.5,
    y: position.y ?? 0.42,
  };
}

function freshStory(initialContent = null) {
  const sharedCard = initialContent?.sharedCard ? { x: 50, y: 50, scale: 1, ...initialContent.sharedCard } : null;
  const initialText = sharedCard ? "" : String(initialContent?.caption || "").slice(0, 300);
  const imageUrl = sharedCard ? "" : initialContent?.imageUrl || "";
  return {
    audience: "everyone",
    publishKey: crypto.randomUUID(),
    mentions: [],
    sourceStoryId: initialContent?.sourceStoryId || "",
    drawing: Array.isArray(initialContent?.drawing) ? initialContent.drawing : [],
    gradient: sharedCard?.kind === "story" ? 1 : 0,
    photo: Boolean(imageUrl),
    questionSticker: initialContent?.questionSticker || null,
    sharedCard,
    texts: [newTextOverlay(initialText)],
    transform: { scale: 1, x: 0, y: 0 },
    uploadedUrl: imageUrl,
    mediaType: "image",
    uploadedFile: null,
    mediaDimensions: null,
  };
}

function storyTextClass(style) {
  if (style === 2) return "story-composer-text is-plate";
  if (style === 3) return "story-composer-text is-serif";
  if (style === 4) return "story-composer-text is-mono";
  if (style === 1) return "story-composer-text is-bold";
  return "story-composer-text";
}

function loadStoryImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(__msg("stories.storyImageCouldNotBeLoaded")));
    image.src = src;
  });
}

function drawCoverImage(context, image, width, height, transform = {}) {
  const fill = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  context.save();
  context.filter = "blur(32px) brightness(.6)";
  const backdropScale = fill * 1.12;
  context.drawImage(image, (width - image.naturalWidth * backdropScale) / 2, (height - image.naturalHeight * backdropScale) / 2, image.naturalWidth * backdropScale, image.naturalHeight * backdropScale);
  context.restore();
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight) * (Number(transform.scale) || 1);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2 + (Number(transform.x) || 0) / 100 * width, (height - drawHeight) / 2 + (Number(transform.y) || 0) / 100 * height, drawWidth, drawHeight);
}

function fileFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(__msg("stories.couldNotPrepareThisStory")));
        return;
      }
      resolve(new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

async function renderStoryFile(story, includeInteractive = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  const colors = story.sharedCard?.kind === "note" && story.gradient % STORY_GRADIENTS.length === 0 ? ["#0c1118", "#050608"] : STORY_GRADIENTS[story.gradient % STORY_GRADIENTS.length];
  gradient.addColorStop(0, story.photo ? "#263b60" : colors[0]);
  gradient.addColorStop(1, story.photo ? "#07090d" : colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (story.photo) {
    const image = await loadStoryImage(story.uploadedUrl);
    drawCoverImage(context, image, canvas.width, canvas.height, story.transform);
  }

  const shade = context.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, "rgba(0,0,0,.28)");
  shade.addColorStop(0.22, "rgba(0,0,0,0)");
  shade.addColorStop(0.7, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.5)");
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (includeInteractive && story.sharedCard) {
    const card = story.sharedCard;
    const isQuestionReply = card.kind === "question_reply";
    const isTextOnly = isTextOnlySharedCard(card);
    const originalTranscript = String(card.originalTranscript || card.title || "").trim();
    const translationText = String(card.translationText || "").trim();
    const translationLabel = String(card.translationLabel || __msg("stories.translation")).trim();
    const cardWidth = isQuestionReply ? 700 : 650;
    const cardHeight = isQuestionReply ? 430 : isTextOnly ? (translationText ? 500 : 360) : 560;
    const cardX = (finiteCardPosition(card.x, 50, 16, 84) / 100) * canvas.width - cardWidth / 2;
    const cardY = (finiteCardPosition(card.y, 50, 20, 78) / 100) * canvas.height - cardHeight / 2;
    context.fillStyle = isQuestionReply ? "rgba(17,22,31,.94)" : "#0d1015";
    roundRect(context, cardX, cardY, cardWidth, cardHeight, 54);
    context.fill();
    if (isQuestionReply) {
      context.fillStyle = "#9CCBFF";
      context.font = "800 27px system-ui";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(String(card.eyebrow || __msg("fan.answeredYourQuestion")).slice(0, 42), cardX + 42, cardY + 40, cardWidth - 84);
      context.fillStyle = "rgba(255,255,255,.58)";
      context.font = "650 29px system-ui";
      drawWrappedText(context, String(card.subtitle || __msg("fanWeb.question")).slice(0, 90), cardX + 42, cardY + 92, cardWidth - 84, 38, 2);
      context.fillStyle = "#FFFFFF";
      context.font = "850 45px system-ui";
      drawWrappedText(context, String(card.title || "").slice(0, 180), cardX + 42, cardY + 190, cardWidth - 84, 58, 3);
    } else if (isTextOnly) {
      context.fillStyle = "#9CCBFF";
      context.font = "800 27px system-ui";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(String(card.eyebrow || "NOTE").slice(0, 42), cardX + 42, cardY + 42, cardWidth - 84);
      context.fillStyle = "#FFFFFF";
      context.font = "850 40px system-ui";
      drawWrappedText(context, originalTranscript.slice(0, 190), cardX + 42, cardY + 96, cardWidth - 84, 54, translationText ? 2 : 3);
      if (translationText) {
        context.fillStyle = "rgba(255,255,255,.45)";
        context.font = "800 22px system-ui";
        context.fillText(`TRANSLATED${translationLabel ? ` TO ${translationLabel.toUpperCase()}` : ""}`.slice(0, 46), cardX + 42, cardY + 236, cardWidth - 84);
        context.fillStyle = "#FFFFFF";
        context.font = "750 34px system-ui";
        drawWrappedText(context, translationText.slice(0, 150), cardX + 42, cardY + 276, cardWidth - 84, 46, 2);
      }
      context.fillStyle = "rgba(156,203,255,.9)";
      context.font = "650 23px system-ui";
      context.fillText(String(card.subtitle || "from my Wall - tap >").slice(0, 64), cardX + 42, cardY + cardHeight - 72, cardWidth - 84);
    } else {
      context.save();
      roundRect(context, cardX, cardY, cardWidth, cardHeight, 54);
      context.clip();
      if (card.imageUrl) {
        try {
          const image = await loadStoryImage(card.imageUrl);
          context.save();
          context.beginPath();
          context.rect(cardX, cardY, cardWidth, 390);
          context.clip();
          const scale = Math.max(cardWidth / image.naturalWidth, 390 / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          context.drawImage(image, cardX + (cardWidth - width) / 2, cardY + (390 - height) / 2, width, height);
          context.restore();
        } catch {
          context.fillStyle = "#18202b";
          context.fillRect(cardX, cardY, cardWidth, 390);
        }
      }
      context.restore();
      context.fillStyle = "#fff";
      context.font = "800 34px system-ui";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(String(card.title || __msg("fan.sharedPost")).slice(0, 42), cardX + 34, cardY + 425, cardWidth - 68);
      context.fillStyle = "rgba(255,255,255,.58)";
      context.font = "500 23px system-ui";
      context.fillText(String(card.subtitle || __msg("stories.tapToOpen")).slice(0, 60), cardX + 34, cardY + 480, cardWidth - 68);
    }
    context.strokeStyle = "rgba(255,255,255,.18)";
    context.lineWidth = 3;
    roundRect(context, cardX, cardY, cardWidth, cardHeight, 54);
    context.stroke();
  }

  story.texts.filter((item) => item.text.trim()).forEach((overlay) => {
    context.save();
    const text = overlay.text.trim();
    const fontSize = overlay.size * 3.1;
    const x = overlay.x * canvas.width;
    const y = overlay.y * canvas.height;
    context.translate(x, y);
    context.rotate((overlay.rotation || 0) * Math.PI / 180);
    const backgroundMode = overlay.backgroundMode ?? (overlay.style === 2 ? 1 : 0);
    context.textAlign = overlay.align || "center";
    context.textBaseline = "middle";
    context.font = `${overlay.style === 3 ? "italic " : ""}${overlay.style === 1 || overlay.style === 2 ? 800 : 650} ${fontSize}px ${
      overlay.style === 3 ? __msg("stories.georgia") : overlay.style === 4 ? __msg("stories.consolas") : "system-ui"
    }`;
    const lines = text.split("\n").flatMap((paragraph) => {
      const result = []; let line = "";
      for (const character of paragraph) {
        if (context.measureText(line + character).width > canvas.width * .76 && line) { result.push(line); line = ""; }
        line += character;
      }
      return [...result, line];
    });
    const width = Math.min(canvas.width * 0.82, Math.max(...lines.map((line) => context.measureText(line).width)) + 64);
    if (backgroundMode) {
      context.fillStyle = backgroundMode === 2 ? `${overlay.color}66` : overlay.color;
      roundRect(context, -width / 2, -fontSize * lines.length * .6, width, fontSize * lines.length * 1.2, 42);
      context.fill();
      context.fillStyle = backgroundMode === 2 || overlay.color === "#0A0C0F" ? "#FFFFFF" : "#0A0C0F";
    } else {
      context.shadowColor = "rgba(0,0,0,.55)";
      context.shadowBlur = 24;
      context.fillStyle = overlay.color;
    }
    if (overlay.style === 5 && !backgroundMode) { context.shadowColor = overlay.color; context.shadowBlur = 28; context.fillStyle = "#fff"; }
    const textX = overlay.align === "left" ? -width / 2 + 32 : overlay.align === "right" ? width / 2 - 32 : 0;
    lines.forEach((line, index) => context.fillText(line, textX, (index - (lines.length - 1) / 2) * fontSize * 1.2, canvas.width * .76));
    context.restore();
  });

  if (includeInteractive && (story.photo || story.sharedCard) && story.questionSticker) {
    const sticker = story.questionSticker;
    const x = (Number(sticker.x) || 50) / 100 * canvas.width;
    const y = (Number(sticker.y) || 63) / 100 * canvas.height;
    const prompt = String(sticker.prompt || __msg("stories.askMeAnything")).slice(0, 80);
    const boxWidth = Math.min(760, Math.max(520, prompt.length * 19));
    const boxHeight = 180;
    context.save();
    context.shadowColor = "rgba(0,0,0,.38)";
    context.shadowBlur = 30;
    context.shadowOffsetY = 12;
    context.fillStyle = "rgba(17,22,31,.9)";
    roundRect(context, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 34);
    context.fill();
    context.restore();
    context.strokeStyle = "rgba(156,203,255,.42)";
    context.lineWidth = 3;
    roundRect(context, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 34);
    context.stroke();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = "850 42px system-ui";
    context.fillText(prompt, x, y - 22, boxWidth - 60);
    context.fillStyle = "rgba(255,255,255,.5)";
    context.font = "650 22px system-ui";
    context.fillText(__msg("stories.answersGoToYourInboxTapToReply"), x, y + 42, boxWidth - 60);
  }

  (story.drawing || []).forEach((stroke) => {
    if (!stroke.points?.length) return;
    context.save();
    context.strokeStyle = stroke.color || "#9CCBFF";
    context.lineWidth = (Number(stroke.size) || 1.5) * 10;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = (Number(point.x) || 0) / 100 * canvas.width;
      const y = (Number(point.y) || 0) / 177.777 * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  });

  return fileFromCanvas(canvas);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => {
    const value = index === maxLines - 1 && lines.length > maxLines ? `${item.replace(/\s+\S*$/, "")}...` : item;
    context.fillText(value, x, y + index * lineHeight, maxWidth);
  });
}

function finiteCardPosition(value, fallback, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

function isTextOnlySharedCard(card = {}) {
  return card.kind === "voice_note" || card.displayMode === "text_only";
}

function StoryCreator({ initialContent = null, isOpen, mode = "publish", onClose, onPublished, onSave }) {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const canCreate = canCreateStory(user);
  const inputRef = useRef(null);
  const questionInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const dragRef = useRef(null);
  const dragMovedRef = useRef(false);
  const draggingTextIdRef = useRef("");
  const objectGesture = useRef({ pointers: new Map(), pinch: null, origin: null });
  const draggingMentionIdRef = useRef("");
  const draggingCardRef = useRef(false);
  const sharedCardRef = useRef(null);
  const cardTapRef = useRef(null);
  const toggleNoteCard = () => setStory(current => ({ ...current, sharedCard: { ...current.sharedCard, variant: current.sharedCard?.variant === "long" ? "compact" : "long" } }));
  const draggingQuestionRef = useRef(false);
  const drawingRef = useRef(null);
  const photoGestureRef = useRef({ pointers: new Map() });
  const deleteTargetRef = useRef(null);
  const deleteArmedRef = useRef(false);
  const uploadedUrlRef = useRef("");
  const createMutation = useCreateStory();
  const [story, setStory] = useState(() => freshStory(initialContent));
  const [activeTextId, setActiveTextId] = useState(() => story.texts[0].id);
  const [hintOpen, setHintOpen] = useState(() => !localStorage.getItem("atseen_story_comp_hint"));
  const [upload, setUpload] = useState({ error: "", progress: 0, step: "" });
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [textDragging, setTextDragging] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [photoGuides, setPhotoGuides] = useState({ x: false, y: false });
  const [composerPosition, setComposerPosition] = useState(undefined);
  const [editingTextId, setEditingTextId] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState("#9CCBFF");
  const [mentionOpen, setMentionOpen] = useState(false);
  const publishBusy = useRef(false);

  useEffect(() => {
    const element = sharedCardRef.current;
    if (!isOpen || !element) return undefined;
    const zoom = (event) => {
      event.preventDefault(); event.stopPropagation();
      setStory((current) => ({ ...current, sharedCard: { ...current.sharedCard, scale: Math.max(.4, Math.min(3, (current.sharedCard.scale || 1) * Math.exp(-event.deltaY * .002))) } }));
    };
    element.addEventListener("wheel", zoom, { passive: false });
    return () => element.removeEventListener("wheel", zoom);
  }, [isOpen, story.sharedCard?.kind]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setComposerPosition({
        "--story-composer-center-x": `${bounds.left + bounds.width / 2}px`,
        "--story-composer-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [isOpen]);

  const activeText = useMemo(() => story.texts.find((item) => item.id === activeTextId) || story.texts[0], [activeTextId, story.texts]);
  const activeAudience = STORY_AUDIENCES.find((item) => item.value === story.audience) || STORY_AUDIENCES[0];
  const ActiveAudienceIcon = activeAudience.icon;
  const photoScale = story.transform?.scale || 1;
  const photoTranslateLimit = ((photoScale - 1) / (2 * photoScale)) * 100;
  const photoTranslateX = -((story.transform?.x || 0) / 100) * photoTranslateLimit;
  const photoTranslateY = -((story.transform?.y || 0) / 100) * photoTranslateLimit;
  const mediaAspect = story.mediaDimensions ? story.mediaDimensions.width / story.mediaDimensions.height : 9 / 16;
  const photoWidth = Math.min(1, mediaAspect / (9 / 16)) * photoScale;
  const photoHeight = Math.min(1, (9 / 16) / mediaAspect) * photoScale;
  const backgroundStyle = story.photo
    ? { background: "#0A0C0F" }
    : { background: `linear-gradient(160deg,${STORY_GRADIENTS[story.gradient % STORY_GRADIENTS.length].join(",")})` };
  useEffect(() => {
    const stage = stageRef.current;
    if (!isOpen || !stage || !story.photo || story.mediaType === "video" || drawingMode || editingTextId) return undefined;
    const wheel = (event) => {
      if (!event.target.closest(".story-composer-focus")) return;
      event.preventDefault();
      const bounds = stage.getBoundingClientRect();
      const anchorX = (event.clientX - bounds.left) / bounds.width * 100 - 50;
      const anchorY = (event.clientY - bounds.top) / bounds.height * 100 - 50;
      setStory((current) => {
        const start = current.transform;
        const scale = Math.max(.4, Math.min(4, start.scale * Math.exp(-event.deltaY * (event.deltaMode === 1 ? .032 : .002))));
        const ratio = scale / start.scale;
        return { ...current, transform: { scale, x: anchorX - (anchorX - start.x) * ratio, y: anchorY - (anchorY - start.y) * ratio } };
      });
    };
    stage.addEventListener("wheel", wheel, { passive: false });
    return () => stage.removeEventListener("wheel", wheel);
  }, [isOpen, story.photo, story.mediaType, drawingMode, editingTextId]);
  useEffect(() => {
    if (!isOpen || !story.photo || story.mediaType === "video" || !story.uploadedUrl) return undefined;
    let active = true;
    const image = new Image();
    image.onload = () => { if (active && image.naturalWidth) setStory((current) => ({ ...current, mediaDimensions: { width: image.naturalWidth, height: image.naturalHeight } })); };
    image.src = story.uploadedUrl;
    return () => { active = false; };
  }, [isOpen, story.photo, story.uploadedUrl, story.mediaType]);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (nextFacingMode = "environment") => {
    stopCamera();
    const requestId = ++cameraRequestRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unavailable");
      setCameraError(__msg("stories.cameraIsNotAvailableInThisBrowserChoose"));
      return;
    }
    setCameraStatus("starting");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: nextFacingMode }, height: { ideal: 1920 }, width: { ideal: 1080 } },
      });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setFacingMode(nextFacingMode);
      setCameraStatus("live");
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCanSwitchCamera(devices.filter((device) => device.kind === "videoinput").length > 1);
      window.requestAnimationFrame(() => {
        if (!videoRef.current || cameraStreamRef.current !== stream) return;
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      });
    } catch (error) {
      if (error?.name === "NotAllowedError") setCameraError("Camera access was blocked. Allow camera permission or choose an image.");
      else if (error?.name === "NotFoundError") setCameraError(__msg("stories.noCameraWasFoundChooseAnImageInstead"));
      else setCameraError(__msg("stories.couldNotOpenTheCameraChooseAnImage"));
      setCameraStatus("unavailable");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return undefined;
    }
    const next = freshStory(initialContent);
    publishBusy.current = false;
    setMentionOpen(false);
    setStory(next);
    setDrawingMode(false);
    setDrawingColor("#9CCBFF");
    setActiveTextId(next.texts[0].id);
    if (next.sharedCard || next.photo) {
      stopCamera();
      setCameraStatus("captured");
    } else {
      startCamera("environment");
    }
    return stopCamera;
  }, [initialContent, isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraStatus !== "live" || !videoRef.current || !cameraStreamRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraStatus, facingMode]);

  useEffect(() => {
    uploadedUrlRef.current = story.uploadedUrl;
  }, [story.uploadedUrl]);

  useEffect(() => () => {
    if (uploadedUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(uploadedUrlRef.current);
  }, []);
  useEffect(() => {
    if (!isOpen) return undefined;
    const restore = document.activeElement;
    const frame = requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
    return () => { cancelAnimationFrame(frame); if (restore?.isConnected) restore.focus?.({ preventScroll: true }); };
  }, [isOpen]);

  const updateStory = (patch) => setStory((current) => ({ ...current, ...patch }));
  const updateActiveText = (patch) => setStory((current) => ({
    ...current,
    texts: current.texts.map((item) => item.id === activeTextId ? { ...item, ...patch } : item),
  }));

  const enterTextMode = () => {
    if (story.photo || cameraStatus === "text") return;
    if (["starting", "live"].includes(cameraStatus)) stopCamera();
    setCameraStatus("text");
    setCameraError("");
  };

  const addText = () => {
    enterTextMode();
    const overlay = newTextOverlay();
    setStory((current) => ({ ...current, texts: [...current.texts, overlay] }));
    setActiveTextId(overlay.id);
    setEditingTextId(overlay.id);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const focusTextAt = (event) => {
    if (story.sharedCard || textDragging || draggingCardRef.current) return;
    enterTextMode();
    const rect = stageRef.current?.getBoundingClientRect();
    const position = rect ? {
      x: Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width)),
      y: Math.min(0.85, Math.max(0.08, (event.clientY - rect.top) / rect.height)),
    } : { x: 0.5, y: 0.42 };
    if (activeText) {
      setStory((current) => ({
        ...current,
        texts: current.texts.map((item) => item.id === activeTextId ? { ...item, ...position } : item),
      }));
      setEditingTextId(activeText.id);
    } else {
      const overlay = newTextOverlay("", position);
      setStory((current) => ({ ...current, texts: [...current.texts, overlay] }));
      setActiveTextId(overlay.id);
      setEditingTextId(overlay.id);
    }
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const cycleAudience = () => {
    const currentIndex = STORY_AUDIENCES.findIndex((item) => item.value === story.audience);
    updateStory({ audience: STORY_AUDIENCES[(currentIndex + 1 + STORY_AUDIENCES.length) % STORY_AUDIENCES.length].value });
  };

  const close = () => {
    publishBusy.current = false;
    objectGesture.current.pointers.clear();
    objectGesture.current.pinch = null;
    dragRef.current = null;
    draggingTextIdRef.current = "";
    draggingMentionIdRef.current = "";
    draggingQuestionRef.current = false;
    draggingCardRef.current = false;
    drawingRef.current = null;
    photoGestureRef.current.pointers.clear();
    deleteArmedRef.current = false;
    setTextDragging(false);
    setDeleteArmed(false);
    setPhotoGuides({ x: false, y: false });
    setMentionOpen(false);
    stopCamera();
    setUpload({ error: "", progress: 0, step: "" });
    setEditingTextId("");
    setDrawingMode(false);
    const fresh = freshStory(initialContent);
    setStory((current) => {
      if (current.uploadedUrl?.startsWith("blob:")) URL.revokeObjectURL(current.uploadedUrl);
      return fresh;
    });
    setActiveTextId(fresh.texts[0].id);
    onClose();
  };

  const uploadDeviceImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (mode === "compose" && file.type.startsWith("video/")) { showToast(__msg("stories.chooseAnImageForThisSharedCardBackground")); return; }
    if (!/^(image|video)\//.test(file.type)) {
      showToast(__msg("stories.chooseAnImageOrVideoFile"));
      return;
    }
    if (file.type.startsWith("video/") && file.size > 60 * 1024 * 1024) { showToast(__msg("stories.chooseAVideoUpTo60Mb")); return; }
    stopCamera();
    const url = URL.createObjectURL(file);
    setStory((current) => {
      if (current.uploadedUrl?.startsWith("blob:")) URL.revokeObjectURL(current.uploadedUrl);
      return { ...current, drawing: [], photo: true, mediaType: file.type.startsWith("video/") ? "video" : "image", uploadedFile: file, transform: { scale: 1, x: 0, y: 0 }, uploadedUrl: url };
    });
    setCameraStatus("captured");
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || cameraStatus !== "live") return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const file = await fileFromCanvas(canvas);
    const url = URL.createObjectURL(file);
    setStory((current) => {
      if (current.uploadedUrl?.startsWith("blob:")) URL.revokeObjectURL(current.uploadedUrl);
      return { ...current, photo: true, mediaType: "image", uploadedFile: file, uploadedUrl: url };
    });
    stopCamera();
    setCameraStatus("captured");
  };

  const switchCamera = () => startCamera(facingMode === "environment" ? "user" : "environment");

  const beginPhotoGesture = (event) => {
    if (!story.photo || story.mediaType === "video" || drawingMode || event.target.closest("input,button:not(.story-composer-focus)")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const gesture = photoGestureRef.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size === 1) { gesture.tapStart = { x: event.clientX, y: event.clientY }; gesture.moved = false; }
    else gesture.moved = true;
    const points = [...gesture.pointers.values()];
    gesture.start = { ...story.transform };
    gesture.origin = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    gesture.distance = points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0;
  };

  const movePhotoGesture = (event) => {
    const gesture = photoGestureRef.current;
    if (!gesture.pointers.has(event.pointerId) || !stageRef.current) return false;
    if (gesture.tapStart && Math.hypot(event.clientX-gesture.tapStart.x, event.clientY-gesture.tapStart.y) > 6) gesture.moved = true;
    if (!gesture.moved) return true;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    const center = points.length === 1 ? points[0] : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const bounds = stageRef.current.getBoundingClientRect();
    let scale = gesture.start.scale || 1;
    if (points.length > 1 && gesture.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      scale = Math.max(0.4, Math.min(4, scale * (distance / gesture.distance)));
    }
    const ratio = scale / (gesture.start.scale || 1);
    const originX = (gesture.origin.x - bounds.left) / bounds.width * 100 - 50;
    const originY = (gesture.origin.y - bounds.top) / bounds.height * 100 - 50;
    const rawX = originX - (originX - (gesture.start.x || 0)) * ratio + (center.x - gesture.origin.x) / bounds.width * 100;
    const rawY = originY - (originY - (gesture.start.y || 0)) * ratio + (center.y - gesture.origin.y) / bounds.height * 100;
    const snapX = Math.abs(rawX) < 3;
    const snapY = Math.abs(rawY) < 3;
    const x = snapX ? 0 : rawX;
    const y = snapY ? 0 : rawY;
    setPhotoGuides({ x: snapX, y: snapY });
    updateStory({ transform: { scale, x, y } });
    return true;
  };

  const endPhotoGesture = (event) => {
    const gesture = photoGestureRef.current;
    const tap = gesture.pointers.has(event.pointerId) && !gesture.moved && event.type !== "pointercancel";
    gesture.pointers.delete(event.pointerId);
    const point = [...gesture.pointers.values()][0];
    if (point) {
      gesture.start = { ...story.transform };
      gesture.origin = point;
      gesture.distance = 0;
    } else {
      if (tap) focusTextAt(event);
      setPhotoGuides({ x: false, y: false });
      setStory((current) => ({
        ...current,
        transform: {
          ...current.transform,
          scale: Math.abs((current.transform?.scale || 1) - 1) < 0.06 ? 1 : current.transform.scale,
        },
      }));
    }
  };

  const beginDrag = (event, textId, kind = "text") => {
    const mention = kind === "mention";
    const question = kind === "question";
    const overlay = question ? story.questionSticker : mention ? story.mentions.find((item) => item.userId === textId) : story.texts.find((item) => item.id === textId);
    if (!overlay || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const gesture = objectGesture.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...gesture.pointers.values()];
    if (points.length === 2) {
      const [a, b] = points;
      gesture.pinch = { distance: Math.max(1, Math.hypot(a.x-b.x, a.y-b.y)), angle: Math.atan2(b.y-a.y, b.x-a.x), size: mention || question ? overlay.scale || 1 : overlay.size, rotation: overlay.rotation || 0 };
      dragMovedRef.current = true;
      return;
    }
    gesture.origin = { x: event.clientX, y: event.clientY, overlayX: mention || question ? overlay.x / 100 : overlay.x, overlayY: mention || question ? overlay.y / 100 : overlay.y };
    dragRef.current = true;
    dragMovedRef.current = false;
    draggingTextIdRef.current = mention || question ? "" : textId;
    draggingMentionIdRef.current = mention ? textId : "";
    draggingQuestionRef.current = question;
    if (!mention && !question) setActiveTextId(textId);
    setEditingTextId("");
    setTextDragging(true);
  };

  const beginCardDrag = (event) => {
    if (!story.sharedCard || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (cardTapRef.current) cardTapRef.current.moved = true;
    else cardTapRef.current = { x: event.clientX, y: event.clientY, moved: false };
    draggingCardRef.current = true;
    const gesture = objectGesture.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.origin = { x: event.clientX, y: event.clientY, overlayX: story.sharedCard.x / 100, overlayY: story.sharedCard.y / 100 };
    if (gesture.pointers.size === 2) {
      const [a, b] = [...gesture.pointers.values()];
      gesture.pinch = { distance: Math.max(1, Math.hypot(a.x-b.x, a.y-b.y)), size: story.sharedCard.scale || 1 };
    }
  };

  const toggleQuestionSticker = () => {
    setStory((current) => ({
      ...current,
      questionSticker: current.questionSticker ? null : { id: `question-${Date.now()}`, prompt: __msg("stories.askMeAnything"), x: 50, y: 63 },
    }));
    window.setTimeout(() => {
      questionInputRef.current?.focus();
      questionInputRef.current?.select();
    }, 0);
  };

  const beginQuestionDrag = (event) => {
    if (event.target.closest("input")) return;
    beginDrag(event, "question", "question");
  };

  const moveDrag = (event) => {
    const gesture = objectGesture.current;
    if (gesture.pointers.has(event.pointerId)) gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gesture.pointers.size >= 2 && gesture.pinch) {
      dragMovedRef.current = true;
      const [a,b] = [...gesture.pointers.values()];
      const pinch = gesture.pinch;
      const ratio = Math.hypot(a.x-b.x,a.y-b.y) / pinch.distance;
      if (draggingCardRef.current) {
        setStory((current) => ({ ...current, sharedCard: { ...current.sharedCard, scale: Math.max(.4, Math.min(3, pinch.size * ratio)) } }));
        return;
      }
      const rotation = Math.max(-180, Math.min(180, pinch.rotation + (Math.atan2(b.y-a.y,b.x-a.x)-pinch.angle)*180/Math.PI));
      setStory((current) => draggingQuestionRef.current ? { ...current, questionSticker: { ...current.questionSticker, rotation, scale: Math.max(.5, Math.min(3, pinch.size*ratio)) } } : draggingMentionIdRef.current
        ? { ...current, mentions: current.mentions.map((item) => item.userId === draggingMentionIdRef.current ? { ...item, rotation, scale: Math.max(.5, Math.min(3, pinch.size*ratio)) } : item) }
        : { ...current, texts: current.texts.map((item) => item.id === draggingTextIdRef.current ? { ...item, rotation, size: Math.max(12, Math.min(96, pinch.size*ratio)) } : item) });
      return;
    }
    if (movePhotoGesture(event)) return;
    if (drawingRef.current && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const point = {
        x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(177.777, ((event.clientY - rect.top) / rect.height) * 177.777)),
      };
      setStory((current) => ({ ...current, drawing: current.drawing.map((stroke) => stroke.id === drawingRef.current ? { ...stroke, points: [...stroke.points, point] } : stroke) }));
      return;
    }
    if (draggingCardRef.current && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      if (!gesture.origin) { gesture.origin = { x: event.clientX, y: event.clientY, overlayX: story.sharedCard.x / 100, overlayY: story.sharedCard.y / 100 }; return; }
      const x = finiteCardPosition((gesture.origin.overlayX + (event.clientX - gesture.origin.x) / rect.width) * 100, 50, 16, 84);
      const y = finiteCardPosition((gesture.origin.overlayY + (event.clientY - gesture.origin.y) / rect.height) * 100, 50, 20, 78);
      setStory((current) => ({ ...current, sharedCard: { ...current.sharedCard, x, y } }));
      return;
    }
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const origin = gesture.origin;
    if (!origin || Math.hypot(event.clientX-origin.x, event.clientY-origin.y) < 6 && !dragMovedRef.current) return;
    let x = Math.min(1.05, Math.max(-0.05, origin.overlayX + (event.clientX-origin.x) / rect.width));
    let y = Math.min(1.02, Math.max(-0.02, origin.overlayY + (event.clientY-origin.y) / rect.height));
    const guides = { x: Math.abs(x-.5) < .015, y: Math.abs(y-.5) < .015 };
    if (guides.x) x = .5;
    if (guides.y) y = .5;
    setPhotoGuides(guides);
    dragMovedRef.current = true;
    setStory((current) => draggingQuestionRef.current ? { ...current, questionSticker: { ...current.questionSticker, x: x*100, y: y*100 } } : draggingMentionIdRef.current
      ? { ...current, mentions: current.mentions.map((item) => item.userId === draggingMentionIdRef.current ? { ...item, x: x*100, y: y*100 } : item) }
      : { ...current, texts: current.texts.map((item) => item.id === draggingTextIdRef.current ? { ...item, x, y } : item) });
    const deleteRect = deleteTargetRef.current?.getBoundingClientRect();
    const isOverDelete = Boolean(deleteRect
      && event.clientX >= deleteRect.left
      && event.clientX <= deleteRect.right
      && event.clientY >= deleteRect.top
      && event.clientY <= deleteRect.bottom);
    deleteArmedRef.current = isOverDelete;
    setDeleteArmed(isOverDelete);
  };

  const endDrag = (event) => {
    if (photoGestureRef.current.pointers.size) return;
    const gesture = objectGesture.current;
    gesture.pointers.delete(event?.pointerId);
    if (gesture.pointers.size) { gesture.pinch = null; gesture.origin = null; return; }
    gesture.pinch = null;
    setPhotoGuides({ x: false, y: false });
    photoGestureRef.current.pointers.clear();
    draggingCardRef.current = false;
    drawingRef.current = null;
    if (deleteArmedRef.current && draggingQuestionRef.current) {
      updateStory({ questionSticker: null });
    } else if (deleteArmedRef.current && draggingMentionIdRef.current) {
      const id = draggingMentionIdRef.current;
      setStory((current) => ({ ...current, mentions: current.mentions.filter((item) => item.userId !== id) }));
    } else if (deleteArmedRef.current) {
      const deletedId = draggingTextIdRef.current;
      const remaining = story.texts.filter((item) => item.id !== deletedId);
      const texts = remaining.length ? remaining : [newTextOverlay()];
      setStory((current) => ({ ...current, texts }));
      setActiveTextId(texts.at(-1).id);
      setEditingTextId("");
    } else if (event?.type !== "pointercancel" && dragRef.current && !dragMovedRef.current && draggingMentionIdRef.current) {
      const id = draggingMentionIdRef.current;
      setStory((current) => ({ ...current, mentions: current.mentions.map((item) => item.userId === id ? { ...item, st: item.st === 1 ? 0 : 1 } : item) }));
    } else if (event?.type !== "pointercancel" && dragRef.current && !dragMovedRef.current && draggingTextIdRef.current) {
      setEditingTextId(draggingTextIdRef.current);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
    dragRef.current = null;
    dragMovedRef.current = false;
    draggingTextIdRef.current = "";
    draggingMentionIdRef.current = "";
    draggingQuestionRef.current = false;
    deleteArmedRef.current = false;
    setTextDragging(false);
    setDeleteArmed(false);
  };

  const beginDrawing = (event) => {
    if (!drawingMode || !(story.photo || story.sharedCard) || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = stageRef.current.getBoundingClientRect();
    const id = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const point = {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(177.777, ((event.clientY - rect.top) / rect.height) * 177.777)),
    };
    drawingRef.current = id;
    setStory((current) => ({ ...current, drawing: [...current.drawing, { color: drawingColor, id, points: [point], size: 1.5 }] }));
  };

  const publish = async () => {
    if (publishBusy.current) return;
    if (!canCreate) {
      showToast(__msg("stories.storyPublishingIsNotAvailableForThisAccount"));
      return;
    }
    const storyTexts = story.texts.filter((item) => item.text.trim());
    const caption = storyTexts.map((item) => item.text.trim()).join(" ").slice(0, 300);
    if (!storyTexts.length && !story.photo && !story.sharedCard) {
      showToast(__msg("stories.writeSomethingFirst"));
      return;
    }
    try {
      publishBusy.current = true;
      setUpload({ error: "", progress: 8, step: __msg("posts.preparing") });
      const file = story.mediaType === "video" ? story.uploadedFile : await renderStoryFile(story);
      const editorMetadata = {
        flattened: story.mediaType !== "video",
        ...(story.mediaType === "video" ? { transform: { scale: photoScale, translateX: photoTranslateX, translateY: photoTranslateY, rotation: 0 } } : {}),
        mentions: story.mentions,
        ...(story.photo ? {
          mediaFraming: {
            fitMode: (story.transform?.scale || 1) < 1 ? "fit" : "fill",
            scale: story.transform?.scale || 1,
            translateX: story.transform?.x || 0,
            translateY: story.transform?.y || 0,
          },
        } : {}),
        ...((story.photo || story.sharedCard) && story.questionSticker ? { questionSticker: story.questionSticker } : {}),
        ...(story.drawing.length ? { drawing: story.drawing } : {}),
        ...(story.sharedCard ? { sharedCard: story.sharedCard } : {}),
        textOverlays: storyTexts.map((item) => ({
          color: item.color,
          fontSize: item.size,
          fontWeight: storyTextStyle(item).fontWeight,
          id: item.id,
          style: item.style,
          backgroundMode: item.backgroundMode,
          background: "none",
          rotation: item.rotation,
          align: item.align,
          styleName: STORY_TEXT_STYLES.find((style) => style.value === item.style)?.label || __msg("stories.classic"),
          text: item.text.trim(),
          x: item.x * 100,
          y: item.y * 100,
        })),
      };
      if (mode === "compose") {
        setUpload({ error: "", progress: 70, step: __msg("stories.addingPreview") });
        await onSave?.({ caption, editorMetadata, file });
        setUpload({ error: "", progress: 100, step: __msg("stories.added") });
        close();
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      formData.append("publishKey", story.publishKey);
      if (story.sourceStoryId) formData.append("sourceStoryId", story.sourceStoryId);
      formData.append("mediaType", story.mediaType);
      formData.append("duration", story.mediaType === "video" ? "15" : "5");
      formData.append("caption", caption);
      formData.append("audience", story.audience || "everyone");
      formData.append("allowReactions", "true");
      formData.append("allowReplies", "true");
      formData.append("allowSharing", "true");
      formData.append("editorMetadata", JSON.stringify(editorMetadata));
      formData.append("owner", JSON.stringify({
        id: user?.id || user?._id || "me",
        name: user?.name || user?.displayName || __msg("fanWeb.you"),
        username: user?.username || "you",
        avatar: user?.avatar || user?.profileImage || "",
        verified: Boolean(user?.verified || user?.isVerified),
        role: user?.role,
      }));
      createMutation.mutate(
        {
          formData,
          onUploadProgress: (event) => {
            const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 45;
            setUpload({ error: "", progress, step: progress >= 100 ? "Publishing" : "Uploading" });
          },
        },
        {
          onSuccess: (created) => {
            setUpload({ error: "", progress: 100, step: "Published" });
            showToast(__msg("stories.yourStoryIsLive24h"));
            close();
            onPublished?.(created);
          },
          onError: (error) => {
            publishBusy.current = false;
            const message = error?.response?.data?.message || error?.message || "Story upload failed.";
            setUpload({ error: message, progress: 0, step: "Failed" });
            showToast(message);
          },
        },
      );
    } catch (error) {
      publishBusy.current = false;
      setUpload({ error: error.message, progress: 0, step: __msg("posts.failed") });
      showToast(error.message);
    }
  };

  if (!isOpen || !canCreate) return null;

  return (
    <div aria-label={__msg("stories.createStory")} aria-modal="true" className="story-composer-overlay" role="dialog" style={composerPosition} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); if (editingTextId) setEditingTextId(""); else close(); }
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not([type="file"]), textarea, a[href]')].filter((element) => element.getClientRects().length);
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && (document.activeElement === controls.at(-1) || document.activeElement === stageRef.current)) { event.preventDefault(); controls[0].focus(); }
    }}>
      <section
        className={`story-composer-stage ${story.sharedCard?.kind === "note" ? `is-wall-note ${story.gradient % STORY_GRADIENTS.length === 0 ? "is-note-default-background" : ""}` : ""} ${story.sharedCard?.kind === "story" && !story.photo ? "is-story-reshare" : ""}`}
        onPointerMove={(event) => { if (cardTapRef.current && Math.hypot(event.clientX - cardTapRef.current.x, event.clientY - cardTapRef.current.y) > 6) cardTapRef.current.moved = true; moveDrag(event); }}
        onPointerCancel={endDrag}
        onPointerUp={endDrag}
        ref={stageRef}
        tabIndex={-1}
      >
        {story.mediaType === "video" ? <video aria-label={__msg("stories.storyVideoPreview")} autoPlay className="story-composer-camera" loop muted onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 15) event.currentTarget.currentTime = 0; }} playsInline src={story.uploadedUrl} style={{ transform: backgroundStyle.transform }} /> : <div aria-hidden="true" className="story-composer-bg" style={backgroundStyle}>{story.photo ? <><img alt="" className="story-composer-photo-blur" draggable={false} src={story.uploadedUrl} /><img alt="" className="story-composer-photo-image" draggable={false} src={story.uploadedUrl} style={{ width: `${photoWidth * 100}%`, height: `${photoHeight * 100}%`, left: `${50 + (story.transform.x || 0)}%`, top: `${50 + (story.transform.y || 0)}%` }} /></> : null}</div>}
        {photoGuides.x ? <span aria-hidden="true" className="story-composer-guide is-x" /> : null}
        {photoGuides.y ? <span aria-hidden="true" className="story-composer-guide is-y" /> : null}
        {editingTextId ? <button aria-label={__msg("stories.finishEditingText")} className="story-composer-scrim" onClick={() => setEditingTextId("")} type="button" /> : null}
        {!story.photo && ["starting", "live"].includes(cameraStatus) ? <video aria-label={__msg("stories.cameraPreview")} autoPlay className={`story-composer-camera ${facingMode === "user" ? "is-mirrored" : ""}`} muted playsInline ref={videoRef} /> : null}
        <button
          aria-label={story.photo ? __msg("stories.adjustStoryPhotoDragToMoveAndPinchTo") : __msg("stories.focusStoryText")}
          className="story-composer-focus"
          onClick={story.photo ? undefined : focusTextAt}
          onDoubleClick={story.photo ? () => { const fill = Math.max(mediaAspect / (9 / 16), (9 / 16) / mediaAspect); updateStory({ transform: { scale: Math.abs(photoScale - 1) < .06 ? Math.min(4, fill) : 1, x: 0, y: 0 } }); } : undefined}
          onPointerDown={beginPhotoGesture}
          onPointerCancel={endPhotoGesture}
          onPointerUp={endPhotoGesture}
          type="button"
        />

        <header className="story-composer-head" hidden={Boolean(editingTextId)}>
          <button aria-label={__msg("stories.closeStoryComposer")} onClick={close} type="button"><FiX /></button>
          <span className="story-composer-lifetime">{__msg("stories.24h")}</span>
          <button aria-label={__msg("stories.addText")} className={editingTextId ? "is-selected" : ""} onClick={addText} type="button">{["story", "note"].includes(story.sharedCard?.kind) ? <FiEdit3 /> : <FiType />}</button>
          <button aria-label={__msg("stories.mentionPeople")} onClick={() => { setEditingTextId(""); setMentionOpen(true); }} type="button">@</button>
          {(story.photo || story.sharedCard) && !["story", "note"].includes(story.sharedCard?.kind) ? <button aria-label={drawingMode ? __msg("stories.stopDrawing") : __msg("stories.drawOnStory")} className={drawingMode ? "is-selected" : ""} onClick={() => { setDrawingMode((current) => !current); setEditingTextId(""); setPaletteOpen(true); }} type="button"><FiEdit3 /></button> : null}
          {story.photo || story.sharedCard ? <button aria-label={story.questionSticker ? __msg("stories.removeQuestionSticker") : __msg("stories.addQuestionSticker")} className={story.questionSticker ? "is-selected" : ""} onClick={toggleQuestionSticker} type="button"><FiHelpCircle /></button> : null}
          <button
            aria-label={cameraStatus === "live" ? __msg("stories.switchCamera") : story.photo ? __msg("stories.retakePhoto") : __msg("stories.refreshBackground")}
            className={cameraStatus === "live" && !canSwitchCamera ? "invisible" : ""}
            onClick={() => {
              if (cameraStatus === "live") {
                if (canSwitchCamera) switchCamera();
                return;
              }
              if (story.uploadedUrl) {
                if (story.uploadedUrl.startsWith("blob:")) URL.revokeObjectURL(story.uploadedUrl);
                updateStory({ drawing: [], photo: false, mediaType: "image", uploadedFile: null, questionSticker: null, transform: { scale: 1, x: 0, y: 0 }, uploadedUrl: "" });
                startCamera(facingMode);
              } else {
                updateStory({ gradient: story.gradient + 1 });
              }
            }}
            type="button"
          >
            {cameraStatus === "live" ? <FiRepeat /> : <FiRefreshCw />}
          </button>
        </header>
        <input accept="image/*,video/*" className="sr-only" onChange={uploadDeviceImage} ref={uploadInputRef} type="file" />

        {hintOpen && (!story.sharedCard || story.sharedCard.kind === "note") && !editingTextId ? (
          <div className="story-composer-hint">{__msg("stories.tapToWriteDragToMovePinchToResize")}<button
              aria-label={__msg("stories.dismissComposerHint")}
              onClick={() => {
                localStorage.setItem("atseen_story_comp_hint", "1");
                setHintOpen(false);
              }}
              type="button"
            >
              <FiX />
            </button>
          </div>
        ) : null}

        {!story.sharedCard && !story.photo && !story.texts.some((item) => item.text.trim()) && !["starting", "live", "text"].includes(cameraStatus) ? (
          <div className="story-composer-empty">
            <button onClick={() => uploadInputRef.current?.click()} type="button">
              <span><FiImage /></span>
              <strong>{__msg("stories.addImageToYourStory")}</strong>
            </button>
            <p>{cameraError || __msg("stories.orTapAnywhereToWrite")}</p>
          </div>
        ) : null}

        {!story.sharedCard && cameraStatus === "text" && !story.texts.some((item) => item.text.trim()) && !editingTextId ? <button className="story-composer-text-prompt" onClick={addText} type="button">{__msg("stories.sayIt")}</button> : null}

        {cameraStatus === "starting" ? <div className="story-composer-camera-loading"><FiRefreshCw /> {__msg("stories.openingCamera")}</div> : null}

        {story.sharedCard ? (
          <article
            className={`story-shared-card-preview ${story.sharedCard.kind === "note" ? `is-note-${story.sharedCard.variant === "long" ? "long" : "compact"}` : ""} ${story.sharedCard.kind === "story" ? "is-story-reshare-card" : ""} ${story.sharedCard.kind === "question_reply" ? "is-question-response" : ""} ${isTextOnlySharedCard(story.sharedCard) ? "is-text-only" : ""}`}
            aria-label={__msg("stories.shared", { value0: story.sharedCard.kind || "post", value1: story.sharedCard.title })}
            onPointerDown={beginCardDrag}
            onPointerUp={() => { if (story.sharedCard.kind === "note" && cardTapRef.current && !cardTapRef.current.moved) toggleNoteCard(); cardTapRef.current = null; }}
            onPointerCancel={() => { cardTapRef.current = null; }}
            aria-expanded={story.sharedCard.kind === "note" ? story.sharedCard.variant === "long" : undefined}
            ref={sharedCardRef}
            tabIndex={0}
            role={story.sharedCard.kind === "note" ? "button" : "group"}
            onKeyDown={(event) => { if (story.sharedCard.kind === "note" && ["Enter", " "].includes(event.key)) { event.preventDefault(); toggleNoteCard(); return; } if (["+", "=", "-"].includes(event.key)) { event.preventDefault(); setStory((current) => ({ ...current, sharedCard: { ...current.sharedCard, scale: Math.max(.4, Math.min(3, (current.sharedCard.scale || 1) + (event.key === "-" ? -.1 : .1))) } })); } }}
            style={{ left: `${story.sharedCard.x}%`, top: `${story.sharedCard.y}%`, transform: `translate(-50%,-50%) scale(${story.sharedCard.scale || 1})` }}
          >
            {story.sharedCard.kind === "story" ? <StoryReshareCard card={story.sharedCard} /> : story.sharedCard.kind === "question_reply" ? (
              <div>{story.sharedCard.eyebrow ? <em>{story.sharedCard.eyebrow}</em> : null}<small>{story.sharedCard.subtitle || __msg("fanWeb.question")}</small><strong dir="auto">{story.sharedCard.title}</strong></div>
            ) : isTextOnlySharedCard(story.sharedCard) ? (
              <div>
                {story.sharedCard.kind === "note" ? <span className="wall-note-story-byline"><FanAvatar name={story.sharedCard.authorName || "Creator"} src={story.sharedCard.authorAvatar} size="h-[15px] w-[15px]" /><em>{story.sharedCard.eyebrow}</em></span> : story.sharedCard.eyebrow ? <em>{story.sharedCard.eyebrow}</em> : null}
                <strong>{story.sharedCard.kind === "note" && story.sharedCard.variant !== "long" ? `${String(story.sharedCard.originalTranscript || story.sharedCard.title).slice(0, 140)}${String(story.sharedCard.originalTranscript || story.sharedCard.title).length > 140 ? "\u2026" : ""}` : story.sharedCard.originalTranscript || story.sharedCard.title}</strong>
                {story.sharedCard.translationText ? (
                  <span className="story-shared-card-translation">
                    <b>{story.sharedCard.translationLabel ? __msg("stories.translatedTo", { value0: story.sharedCard.translationLabel }) : __msg("stories.translation")}</b>
                    <i>{story.sharedCard.translationText}</i>
                  </span>
                ) : null}
                <small>{story.sharedCard.subtitle || __msg("stories.tapToOpen")}</small>
              </div>
            ) : (
              <>
                {story.sharedCard.imageUrl ? story.sharedCard.mediaType === "video" ? <video autoPlay loop muted onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 15) event.currentTarget.currentTime = 0; }} playsInline src={story.sharedCard.imageUrl} /> : <img alt="" src={story.sharedCard.imageUrl} /> : story.sharedCard.kind === "post" ? null : <div className="story-shared-card-fallback" />}
                <div>{story.sharedCard.eyebrow ? <em>{story.sharedCard.eyebrow}</em> : null}<strong dir="auto">{story.sharedCard.title}</strong><small>{story.sharedCard.subtitle || __msg("stories.tapToOpen")}</small></div>
              </>
            )}
          </article>
        ) : null}

        {(story.photo || story.sharedCard) && story.questionSticker ? (
          <label
            className="share-seen-story-question"
            onPointerDown={beginQuestionDrag}
            style={{ left: `${story.questionSticker.x}%`, top: `${story.questionSticker.y}%`, transform: `translate(-50%,-50%) scale(${story.questionSticker.scale || 1}) rotate(${story.questionSticker.rotation || 0}deg)` }}
          >
            <input
              aria-label={__msg("stories.storyQuestion")}
              maxLength={80}
              onChange={(event) => setStory((current) => ({ ...current, questionSticker: { ...current.questionSticker, prompt: event.target.value } }))}
              placeholder={__msg("stories.askMeAnything")}
              ref={questionInputRef}
              value={story.questionSticker.prompt}
            />
            <span>{__msg("stories.answersGoToYourInboxTapToReply")}</span>
          </label>
        ) : null}

        {(story.drawing || []).length || drawingMode ? <svg aria-label={__msg("stories.storyDrawingCanvas")} className={`story-composer-drawing ${drawingMode ? "is-active" : ""}`} onPointerDown={beginDrawing} viewBox="0 0 100 177.777">
          {(story.drawing || []).map((stroke) => <polyline fill="none" key={stroke.id} points={(stroke.points || []).map((point) => `${point.x},${point.y}`).join(" ")} stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.size || 1.5} />)}
        </svg> : null}

        {story.mentions.map((mention) => <button className={`story-composer-mention ${mention.st === 1 ? "is-solid" : ""}`} key={mention.userId}
          aria-label={__msg("stories.mentionUseArrowsToMoveDeleteToRemove", { value0: mention.username })}
          onPointerDown={(event) => beginDrag(event, mention.userId, "mention")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); updateStory({ mentions: story.mentions.map((item) => item.userId === mention.userId ? { ...item, st: item.st === 1 ? 0 : 1 } : item) }); return; }
            if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); updateStory({ mentions: story.mentions.map((item) => item.userId === mention.userId ? { ...item, rotation: Math.max(-180, Math.min(180, (item.rotation || 0) + (event.key === "ArrowRight" ? 5 : -5))) } : item) }); return; }
            if (["+", "=", "-"].includes(event.key)) { event.preventDefault(); updateStory({ mentions: story.mentions.map((item) => item.userId === mention.userId ? { ...item, scale: Math.max(.5, Math.min(3, (item.scale || 1) + (event.key === "-" ? -.1 : .1))) } : item) }); return; }
            if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); updateStory({ mentions: story.mentions.filter((item) => item.userId !== mention.userId) }); }
            if (event.key.startsWith("Arrow")) { event.preventDefault(); updateStory({ mentions: story.mentions.map((item) => item.userId === mention.userId ? { ...item, x: Math.max(-5, Math.min(105, item.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0))), y: Math.max(-2, Math.min(102, item.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0))) } : item) }); }
          }}
          style={{ left: `${mention.x}%`, top: `${mention.y}%`, transform: `translate(-50%,-50%) scale(${mention.scale || 1}) rotate(${mention.rotation || 0}deg)` }} type="button"><span>@</span>{mention.username}</button>)}

        {story.texts.filter((item) => item.text || editingTextId === item.id).map((item) => {
          const isEditing = editingTextId === item.id;
          const textStyle = {
            ...storyTextStyle(item),
            fontSize: `${item.size / 3.5}cqw`,
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            transform: `translate(-50%,-50%) rotate(${isEditing ? 0 : item.rotation || 0}deg)`,
          };
          return isEditing ? (
            <textarea
              aria-label={__msg("stories.storyText")}
              className={`${storyTextClass(item.style)} is-editing ${activeTextId === item.id ? "is-active" : ""}`}
              key={item.id}
              maxLength={300}
              onBlur={() => {
                if (!item.text.trim()) setEditingTextId("");
              }}
              onChange={(event) => updateActiveText({ text: event.target.value })}
              onFocus={enterTextMode}
              onWheel={(event) => {
                event.preventDefault();
                updateActiveText({ size: Math.min(64, Math.max(14, item.size + (event.deltaY < 0 ? 2 : -2))) });
              }}
              placeholder={__msg("stories.sayIt")}
              ref={inputRef}
              rows={1}
              style={textStyle}
              value={item.text}
            />
          ) : (
            <button
              className={`${storyTextClass(item.style)} ${activeTextId === item.id && textDragging ? "is-active" : ""}`}
              key={item.id}
              onClick={(event) => {
                if (event.detail !== 0) return;
                setActiveTextId(item.id);
                setEditingTextId(item.id);
                window.setTimeout(() => inputRef.current?.focus(), 40);
              }}
              onPointerDown={(event) => beginDrag(event, item.id)}
              onKeyDown={(event) => {
                if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); setStory((current) => ({ ...current, texts: current.texts.map((text) => text.id === item.id ? { ...text, rotation: Math.max(-180, Math.min(180, (text.rotation || 0) + (event.key === "ArrowRight" ? 5 : -5))) } : text) })); return; }
                if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); setStory((current) => ({ ...current, texts: current.texts.filter((text) => text.id !== item.id) })); }
                if (event.key.startsWith("Arrow")) { event.preventDefault(); setStory((current) => ({ ...current, texts: current.texts.map((text) => text.id === item.id ? { ...text, x: Math.max(-.05, Math.min(1.05, text.x + (event.key === "ArrowRight" ? .01 : event.key === "ArrowLeft" ? -.01 : 0))), y: Math.max(-.02, Math.min(1.02, text.y + (event.key === "ArrowDown" ? .01 : event.key === "ArrowUp" ? -.01 : 0))) } : text) })); }
              }}
              style={textStyle}
              type="button"
            >
              {item.text}
            </button>
          );
        })}

        {textDragging ? <div aria-label={deleteArmed ? __msg("stories.releaseToDelete") : __msg("stories.deleteSticker")} className={`story-composer-delete-target ${deleteArmed ? "is-armed" : ""}`} ref={deleteTargetRef} role="status"><FiTrash2 aria-hidden="true" /></div> : null}

        <button aria-label={__msg("stories.addAnImage")} className="story-composer-gallery-thumb" hidden={Boolean(editingTextId)} onClick={() => uploadInputRef.current?.click()} type="button">
          <FiImage />
        </button>

        {cameraStatus === "live" ? <div className="story-composer-camera-controls">
          <button aria-label={__msg("stories.takePhoto")} className="story-composer-shutter" onClick={capturePhoto} type="button"><span><FiCamera /></span></button>
        </div> : null}

        <div className="story-composer-bottom">
          {editingTextId ? <div className="story-text-edit-controls">
            <button aria-label={__msg("stories.changeTextAlignment")} onClick={() => updateActiveText({ align: { center: "left", left: "right", right: "center" }[activeText?.align || "center"] })} type="button">{__msg("stories.align")}</button>
            <button aria-label={__msg("stories.changeTextBackground")} onClick={() => updateActiveText({ backgroundMode: ((activeText?.backgroundMode || 0) + 1) % 3 })} type="button">{__msg("stories.background")} {activeText?.backgroundMode || 0}</button>
            <label>{__msg("stories.size")}<input aria-label={__msg("stories.textSize")} max="96" min="12" onChange={(event) => updateActiveText({ size: Number(event.target.value) })} type="range" value={activeText?.size || 28} /></label>
            <button onClick={() => setEditingTextId("")} type="button">{__msg("comments.done")}</button>
          </div> : null}
          {editingTextId || drawingMode ? (
            <div className="story-composer-text-options">
              {paletteOpen ? (
                <div aria-label={drawingMode ? __msg("stories.drawingColors") : __msg("stories.textColors")} className="story-composer-color-dots" role="group">
                  {STORY_COLORS.map((color) => (
                    <button
                      aria-label={drawingMode ? __msg("stories.useDrawingColor", { value0: color }) : __msg("stories.useText", { value0: color })}
                      className={(drawingMode ? drawingColor : activeText?.color) === color ? "is-selected" : ""}
                      key={color}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => { setDrawingColor(color); if (!drawingMode) updateActiveText({ color }); }}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}
              {!drawingMode ? <div className="story-composer-style-row">
                <button aria-label={__msg("stories.toggleTextColors")} className={`story-composer-color-wheel ${paletteOpen ? "is-selected" : ""}`} onClick={() => setPaletteOpen((current) => !current)} type="button" />
                <div aria-label={__msg("stories.textStyles")} className="story-composer-style-scroll" role="group">
                  {STORY_TEXT_STYLES.map((style) => (
                    <button
                      className={`${activeText?.style === style.value ? "is-selected" : ""} is-style-${style.value}`}
                      key={style.value}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => updateActiveText({ style: style.value })}
                      type="button"
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div> : null}
            </div>
          ) : null}
          <div className="story-composer-toolbar" hidden={Boolean(editingTextId)}>
            <button aria-label={__msg("stories.storyAudience", { value0: activeAudience.label })} className={`story-composer-audience is-${activeAudience.value}`} onClick={cycleAudience} type="button">
              <ActiveAudienceIcon /> {activeAudience.label}
            </button>
            <span />
            <button className="story-composer-share" disabled={createMutation.isPending || ["Preparing", "Adding preview"].includes(upload.step)} onClick={publish} type="button">
              {createMutation.isPending || ["Preparing", "Adding preview"].includes(upload.step) ? <><FiRefreshCw className="story-composer-button-spinner" /> {mode === "compose" ? __msg("stories.adding") : __msg("fanWeb.sharing")}</> : mode === "compose" ? __msg("publication.add") : __msg("admin.share")}
            </button>
          </div>
          {upload.step ? (
            <div className={upload.error ? "is-error story-composer-upload" : "story-composer-upload"}>
              <span>{upload.error || upload.step}</span>
              {!upload.error ? <i style={{ width: `${upload.progress}%` }} /> : null}
            </div>
          ) : null}
        </div>

        {mentionOpen ? <StoryMentionPicker onClose={() => setMentionOpen(false)} selectedIds={story.mentions.map((item) => item.userId)} onSelect={(person) => {
          if (story.mentions.length >= 10) { showToast(__msg("stories.youCanMentionUpTo10People")); return; }
          if (story.mentions.some((item) => item.userId === person.id)) return;
          updateStory({ mentions: [...story.mentions, { userId: person.id, username: person.username, name: person.name, x: 50, y: 45 + story.mentions.length * 4, scale: 1, rotation: 0 }] });
          setMentionOpen(false);
        }} /> : null}

      </section>
    </div>
  );
}

export default StoryCreator;
