import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiEye, FiImage, FiRefreshCw, FiRepeat, FiTrash2, FiType, FiUsers, FiX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useCreateStory } from "../../hooks/useStories";
import { canCreateStory } from "../../utils/storyPermissions";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ProfileImageCropper from "../profile/ProfileImageCropper";

const STORY_COLORS = ["#FFFFFF", "#D6EAFF", "#9CCBFF", "#0A0C0F", "#6ECF97", "#F17878"];
const STORY_TEXT_STYLES = [
  { label: "Classic", value: 0 },
  { label: "Strong", value: 1 },
  { label: "Plate", value: 2 },
  { label: "Serif", value: 3 },
  { label: "Mono", value: 4 },
];
const STORY_AUDIENCES = [
  { icon: FiEye, label: "Everyone", value: "everyone" },
  { icon: FiUsers, label: "Friends", value: "friends" },
  { icon: FiEye, label: "My World", value: "world" },
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
    text,
    x: position.x ?? 0.5,
    y: position.y ?? 0.42,
  };
}

function freshStory(initialContent = null) {
  const sharedCard = initialContent?.sharedCard ? { x: 50, y: 50, ...initialContent.sharedCard } : null;
  const initialText = sharedCard ? "" : String(initialContent?.caption || "").slice(0, 300);
  const imageUrl = sharedCard ? "" : initialContent?.imageUrl || "";
  return {
    audience: "everyone",
    gradient: 0,
    photo: Boolean(imageUrl),
    sharedCard,
    texts: [newTextOverlay(initialText)],
    uploadedUrl: imageUrl,
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
    image.onerror = () => reject(new Error("Story image could not be loaded."));
    image.src = src;
  });
}

function drawCoverImage(context, image, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function fileFromCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not prepare this story."));
        return;
      }
      resolve(new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

async function renderStoryFile(story) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  const colors = STORY_GRADIENTS[story.gradient % STORY_GRADIENTS.length];
  gradient.addColorStop(0, story.photo ? "#263b60" : colors[0]);
  gradient.addColorStop(1, story.photo ? "#07090d" : colors[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (story.photo) {
    const image = await loadStoryImage(story.uploadedUrl);
    drawCoverImage(context, image, canvas.width, canvas.height);
  }

  const shade = context.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, "rgba(0,0,0,.28)");
  shade.addColorStop(0.22, "rgba(0,0,0,0)");
  shade.addColorStop(0.7, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.5)");
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (story.sharedCard) {
    const card = story.sharedCard;
    const isQuestionReply = card.kind === "question_reply";
    const cardWidth = isQuestionReply ? 700 : 650;
    const cardHeight = isQuestionReply ? 430 : 560;
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
      context.fillText(String(card.eyebrow || "Answered your question").slice(0, 42), cardX + 42, cardY + 40, cardWidth - 84);
      context.fillStyle = "rgba(255,255,255,.58)";
      context.font = "650 29px system-ui";
      drawWrappedText(context, String(card.subtitle || "Question").slice(0, 90), cardX + 42, cardY + 92, cardWidth - 84, 38, 2);
      context.fillStyle = "#FFFFFF";
      context.font = "850 45px system-ui";
      drawWrappedText(context, String(card.title || "").slice(0, 180), cardX + 42, cardY + 190, cardWidth - 84, 58, 3);
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
      context.fillText(String(card.title || "Shared post").slice(0, 42), cardX + 34, cardY + 425, cardWidth - 68);
      context.fillStyle = "rgba(255,255,255,.58)";
      context.font = "500 23px system-ui";
      context.fillText(String(card.subtitle || "Tap to open").slice(0, 60), cardX + 34, cardY + 480, cardWidth - 68);
    }
    context.strokeStyle = "rgba(255,255,255,.18)";
    context.lineWidth = 3;
    roundRect(context, cardX, cardY, cardWidth, cardHeight, 54);
    context.stroke();
  }

  story.texts.filter((item) => item.text.trim()).forEach((overlay) => {
    const text = overlay.text.trim();
    const fontSize = overlay.size * 3.1;
    const x = overlay.x * canvas.width;
    const y = overlay.y * canvas.height;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${overlay.style === 1 || overlay.style === 2 ? 800 : 650} ${fontSize}px ${
      overlay.style === 3 ? "Georgia" : overlay.style === 4 ? "Consolas" : "system-ui"
    }`;
    const width = Math.min(canvas.width * 0.82, context.measureText(text).width + 96);
    if (overlay.style === 2) {
      context.fillStyle = overlay.color;
      roundRect(context, x - width / 2, y - fontSize * 0.75, width, fontSize * 1.5, 42);
      context.fill();
      context.fillStyle = overlay.color === "#0A0C0F" ? "#FFFFFF" : "#0A0C0F";
    } else {
      context.shadowColor = "rgba(0,0,0,.55)";
      context.shadowBlur = 24;
      context.fillStyle = overlay.color;
    }
    context.fillText(text, x, y, canvas.width * 0.82);
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

function StoryCreator({ initialContent = null, isOpen, mode = "publish", onClose, onPublished, onSave }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const canCreate = canCreateStory(user);
  const inputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const dragRef = useRef(null);
  const dragMovedRef = useRef(false);
  const draggingTextIdRef = useRef("");
  const draggingCardRef = useRef(false);
  const deleteTargetRef = useRef(null);
  const deleteArmedRef = useRef(false);
  const uploadedUrlRef = useRef("");
  const createMutation = useCreateStory();
  const [story, setStory] = useState(() => freshStory(initialContent));
  const [activeTextId, setActiveTextId] = useState(() => story.texts[0].id);
  const [hintOpen, setHintOpen] = useState(() => !localStorage.getItem("atseen_story_comp_hint"));
  const [upload, setUpload] = useState({ error: "", progress: 0, step: "" });
  const [cropSource, setCropSource] = useState("");
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [textDragging, setTextDragging] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [composerPosition, setComposerPosition] = useState(undefined);
  const [editingTextId, setEditingTextId] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(true);

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
  const hasActiveTextSurface = Boolean(editingTextId || story.texts.some((item) => item.text.trim()));
  const backgroundStyle = story.photo
    ? { backgroundImage: `url("${story.uploadedUrl}")` }
    : { background: `linear-gradient(160deg,${STORY_GRADIENTS[story.gradient % STORY_GRADIENTS.length].join(",")})` };

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
      setCameraError("Camera is not available in this browser. Choose an image instead.");
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
      else if (error?.name === "NotFoundError") setCameraError("No camera was found. Choose an image instead.");
      else setCameraError("Could not open the camera. Choose an image instead.");
      setCameraStatus("unavailable");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return undefined;
    }
    const next = freshStory(initialContent);
    setStory(next);
    setActiveTextId(next.texts[0].id);
    if (next.sharedCard) {
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
    stopCamera();
    setUpload({ error: "", progress: 0, step: "" });
    setEditingTextId("");
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
    if (!file.type.startsWith("image/")) {
      showToast("Choose an image file.");
      return;
    }
    stopCamera();
    setCropSource(URL.createObjectURL(file));
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
      return { ...current, photo: true, uploadedUrl: url };
    });
    stopCamera();
    setCameraStatus("captured");
  };

  const switchCamera = () => startCamera(facingMode === "environment" ? "user" : "environment");

  const useCroppedImage = (file) => {
    const url = URL.createObjectURL(file);
    setStory((current) => {
      if (current.uploadedUrl?.startsWith("blob:")) URL.revokeObjectURL(current.uploadedUrl);
      return { ...current, photo: true, uploadedUrl: url };
    });
    URL.revokeObjectURL(cropSource);
    setCropSource("");
    setCameraStatus("captured");
  };

  const beginDrag = (event, textId) => {
    const overlay = story.texts.find((item) => item.id === textId);
    if (!overlay?.text.trim() || !stageRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = true;
    dragMovedRef.current = false;
    draggingTextIdRef.current = textId;
    setActiveTextId(textId);
    setEditingTextId("");
    setTextDragging(true);
  };

  const beginCardDrag = (event) => {
    if (!story.sharedCard || !stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingCardRef.current = true;
  };

  const moveDrag = (event) => {
    if (draggingCardRef.current && stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const x = finiteCardPosition(((event.clientX - rect.left) / rect.width) * 100, 50, 16, 84);
      const y = finiteCardPosition(((event.clientY - rect.top) / rect.height) * 100, 50, 20, 78);
      setStory((current) => ({ ...current, sharedCard: { ...current.sharedCard, x, y } }));
      return;
    }
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width));
    const y = Math.min(0.85, Math.max(0.08, (event.clientY - rect.top) / rect.height));
    dragMovedRef.current = true;
    setStory((current) => ({ ...current, texts: current.texts.map((item) => item.id === draggingTextIdRef.current ? { ...item, x, y } : item) }));
    const deleteRect = deleteTargetRef.current?.getBoundingClientRect();
    const isOverDelete = Boolean(deleteRect
      && event.clientX >= deleteRect.left
      && event.clientX <= deleteRect.right
      && event.clientY >= deleteRect.top
      && event.clientY <= deleteRect.bottom);
    deleteArmedRef.current = isOverDelete;
    setDeleteArmed(isOverDelete);
  };

  const endDrag = () => {
    draggingCardRef.current = false;
    if (deleteArmedRef.current) {
      const deletedId = draggingTextIdRef.current;
      const remaining = story.texts.filter((item) => item.id !== deletedId);
      const texts = remaining.length ? remaining : [newTextOverlay()];
      setStory((current) => ({ ...current, texts }));
      setActiveTextId(texts.at(-1).id);
      setEditingTextId("");
    } else if (dragRef.current && !dragMovedRef.current && draggingTextIdRef.current) {
      setEditingTextId(draggingTextIdRef.current);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
    dragRef.current = null;
    dragMovedRef.current = false;
    draggingTextIdRef.current = "";
    deleteArmedRef.current = false;
    setTextDragging(false);
    setDeleteArmed(false);
  };

  const publish = async () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }
    const storyTexts = story.texts.filter((item) => item.text.trim());
    const caption = storyTexts.map((item) => item.text.trim()).join(" ");
    if (!storyTexts.length && !story.photo && !story.sharedCard) {
      showToast("Write something first.");
      return;
    }
    try {
      setUpload({ error: "", progress: 8, step: "Preparing" });
      const file = await renderStoryFile(story);
      const editorMetadata = {
        prototypeComposer: true,
        ...(story.sharedCard ? { sharedCard: story.sharedCard } : {}),
        textOverlays: storyTexts.map((item) => ({
          color: item.color,
          fontSize: item.size,
          id: item.id,
          style: item.style,
          styleName: STORY_TEXT_STYLES.find((style) => style.value === item.style)?.label || "Classic",
          text: item.text.trim(),
          x: item.x * 100,
          y: item.y * 100,
        })),
      };
      if (mode === "compose") {
        setUpload({ error: "", progress: 70, step: "Adding preview" });
        await onSave?.({ caption, editorMetadata, file });
        setUpload({ error: "", progress: 100, step: "Added" });
        close();
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mediaType", "image");
      formData.append("duration", "5");
      formData.append("caption", caption);
      formData.append("audience", story.audience || "everyone");
      formData.append("allowReactions", "true");
      formData.append("allowReplies", "true");
      formData.append("allowSharing", "true");
      formData.append("editorMetadata", JSON.stringify(editorMetadata));
      formData.append("owner", JSON.stringify({
        id: user?.id || user?._id || "me",
        name: user?.name || user?.displayName || "You",
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
            showToast("Your story is live - 24h");
            onPublished?.(created);
            close();
          },
          onError: (error) => {
            const message = error?.response?.data?.message || error?.message || "Story upload failed.";
            setUpload({ error: message, progress: 0, step: "Failed" });
            showToast(message);
          },
        },
      );
    } catch (error) {
      setUpload({ error: error.message, progress: 0, step: "Failed" });
      showToast(error.message);
    }
  };

  if (!isOpen || !canCreate) return null;

  return (
    <div aria-label="Create Story" aria-modal="true" className="story-composer-overlay" role="dialog" style={composerPosition}>
      {cropSource ? <ProfileImageCropper kind="story" onCancel={() => { URL.revokeObjectURL(cropSource); setCropSource(""); }} onSave={useCroppedImage} source={cropSource} /> : null}
      <section
        className="story-composer-stage"
        onPointerMove={moveDrag}
        onPointerCancel={endDrag}
        onPointerUp={endDrag}
        ref={stageRef}
      >
        <div aria-hidden="true" className="story-composer-bg" style={backgroundStyle} />
        {!story.photo && ["starting", "live"].includes(cameraStatus) ? <video aria-label="Camera preview" autoPlay className={`story-composer-camera ${facingMode === "user" ? "is-mirrored" : ""}`} muted playsInline ref={videoRef} /> : null}
        <button aria-label="Focus story text" className="story-composer-focus" onClick={focusTextAt} type="button" />

        <header className="story-composer-head">
          <button aria-label="Close Story composer" onClick={close} type="button"><FiX /></button>
          <span />
          <button aria-label="Add text" className={editingTextId ? "is-selected" : ""} onClick={addText} type="button"><FiType /></button>
          <button
            aria-label={cameraStatus === "live" ? "Switch camera" : story.photo ? "Retake photo" : "Refresh background"}
            className={cameraStatus === "live" && !canSwitchCamera ? "invisible" : ""}
            onClick={() => {
              if (cameraStatus === "live") {
                if (canSwitchCamera) switchCamera();
                return;
              }
              if (story.uploadedUrl) {
                if (story.uploadedUrl.startsWith("blob:")) URL.revokeObjectURL(story.uploadedUrl);
                updateStory({ photo: false, uploadedUrl: "" });
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
        <input accept="image/*" className="sr-only" onChange={uploadDeviceImage} ref={uploadInputRef} type="file" />

        {hintOpen && !story.sharedCard ? (
          <div className="story-composer-hint">
            Tap to write {"\u00b7"} drag the text
            <button
              aria-label="Dismiss composer hint"
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
              <strong>Add image to your story</strong>
            </button>
            <p>{cameraError || "Or tap anywhere to write"}</p>
          </div>
        ) : null}

        {!story.sharedCard && cameraStatus === "text" && !story.texts.some((item) => item.text.trim()) && !editingTextId ? <button className="story-composer-text-prompt" onClick={addText} type="button">Say it...</button> : null}

        {cameraStatus === "starting" ? <div className="story-composer-camera-loading"><FiRefreshCw /> Opening camera…</div> : null}

        {story.sharedCard ? (
          <article
            className={`story-shared-card-preview ${story.sharedCard.kind === "question_reply" ? "is-question-response" : ""}`}
            aria-label={`Shared ${story.sharedCard.kind || "post"}: ${story.sharedCard.title}`}
            onPointerDown={beginCardDrag}
            style={{ left: `${story.sharedCard.x}%`, top: `${story.sharedCard.y}%` }}
          >
            {story.sharedCard.kind === "question_reply" ? (
              <div>{story.sharedCard.eyebrow ? <em>{story.sharedCard.eyebrow}</em> : null}<small>{story.sharedCard.subtitle || "Question"}</small><strong>{story.sharedCard.title}</strong></div>
            ) : (
              <>
                {story.sharedCard.imageUrl ? <img alt="" src={story.sharedCard.imageUrl} /> : story.sharedCard.kind === "post" ? null : <div className="story-shared-card-fallback" />}
                <div>{story.sharedCard.eyebrow ? <em>{story.sharedCard.eyebrow}</em> : null}<strong>{story.sharedCard.title}</strong><small>{story.sharedCard.subtitle || "Tap to open"}</small></div>
              </>
            )}
          </article>
        ) : null}

        {story.texts.filter((item) => item.text || editingTextId === item.id).map((item) => {
          const isEditing = editingTextId === item.id;
          const textStyle = {
            color: item.style === 2 && item.color !== "#0A0C0F" ? "#0A0C0F" : item.color,
            fontSize: `${item.size}px`,
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            ...(item.style === 2 ? { backgroundColor: item.color } : null),
          };
          return isEditing ? (
            <textarea
              aria-label="Story text"
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
              placeholder="Say it..."
              ref={inputRef}
              rows={1}
              style={textStyle}
              value={item.text}
            />
          ) : (
            <button
              className={`${storyTextClass(item.style)} ${activeTextId === item.id ? "is-active" : ""}`}
              key={item.id}
              onClick={() => {
                setActiveTextId(item.id);
                setEditingTextId(item.id);
                window.setTimeout(() => inputRef.current?.focus(), 40);
              }}
              onPointerDown={(event) => beginDrag(event, item.id)}
              style={textStyle}
              type="button"
            >
              {item.text}
            </button>
          );
        })}

        {textDragging ? <div aria-label="Drag here to delete text" className={`story-composer-delete-target ${deleteArmed ? "is-armed" : ""}`} ref={deleteTargetRef} role="status"><FiTrash2 /><span>{deleteArmed ? "Release to delete" : "Drag here to delete"}</span></div> : null}

        <button aria-label="Add an image" className="story-composer-gallery-thumb" onClick={() => uploadInputRef.current?.click()} type="button">
          <FiImage />
        </button>

        {cameraStatus === "live" ? <div className="story-composer-camera-controls">
          <button aria-label="Take photo" className="story-composer-shutter" onClick={capturePhoto} type="button"><span><FiCamera /></span></button>
        </div> : null}

        <div className="story-composer-bottom">
          {hasActiveTextSurface ? (
            <div className="story-composer-text-options">
              {paletteOpen ? (
                <div aria-label="Text colors" className="story-composer-color-dots" role="group">
                  {STORY_COLORS.map((color) => (
                    <button
                      aria-label={`Use ${color} text`}
                      className={activeText?.color === color ? "is-selected" : ""}
                      key={color}
                      onClick={() => updateActiveText({ color })}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}
              <div className="story-composer-style-row">
                <button aria-label="Toggle text colors" className={`story-composer-color-wheel ${paletteOpen ? "is-selected" : ""}`} onClick={() => setPaletteOpen((current) => !current)} type="button" />
                <div aria-label="Text styles" className="story-composer-style-scroll" role="group">
                  {STORY_TEXT_STYLES.map((style) => (
                    <button
                      className={`${activeText?.style === style.value ? "is-selected" : ""} is-style-${style.value}`}
                      key={style.value}
                      onClick={() => updateActiveText({ style: style.value })}
                      type="button"
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="story-composer-toolbar">
            <button aria-label={`Story audience: ${activeAudience.label}`} className={`story-composer-audience is-${activeAudience.value}`} onClick={cycleAudience} type="button">
              <ActiveAudienceIcon /> {activeAudience.label}
            </button>
            <span />
            <button className="story-composer-share" disabled={createMutation.isPending || ["Preparing", "Adding preview"].includes(upload.step)} onClick={publish} type="button">
              {createMutation.isPending || ["Preparing", "Adding preview"].includes(upload.step) ? <><FiRefreshCw className="story-composer-button-spinner" /> {mode === "compose" ? "Adding..." : "Sharing..."}</> : mode === "compose" ? "Add" : "Share"}
            </button>
          </div>
          {upload.step ? (
            <div className={upload.error ? "is-error story-composer-upload" : "story-composer-upload"}>
              <span>{upload.error || upload.step}</span>
              {!upload.error ? <i style={{ width: `${upload.progress}%` }} /> : null}
            </div>
          ) : null}
        </div>

      </section>
    </div>
  );
}

export default StoryCreator;
