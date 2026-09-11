import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCamera, FiImage, FiMinus, FiRefreshCw, FiRepeat, FiTrash2, FiType, FiX } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useCreateStory } from "../../hooks/useStories";
import { canCreateStory } from "../../utils/storyPermissions";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import ProfileImageCropper from "../profile/ProfileImageCropper";

const STORY_COLORS = ["#FFFFFF", "#D6EAFF", "#9CCBFF", "#0A0C0F", "#6ECF97", "#F17878"];
const STORY_GRADIENTS = [
  ["#16233a", "#0b0e13"],
  ["#3d5f8f", "#0d1118"],
  ["#0f1f38", "#04060a"],
];
const STORY_STYLE_COUNT = 5;

function newTextOverlay() {
  return { id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, color: "#D6EAFF", size: 26, style: 0, text: "", x: 0.5, y: 0.42 };
}

function freshStory() {
  return {
    gradient: 0,
    photo: false,
    texts: [newTextOverlay()],
    uploadedUrl: "",
  };
}

function storyTextClass(style) {
  if (style === 2) return "story-composer-text is-boxed";
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

function StoryCreator({ isOpen, mode = "publish", onClose, onPublished, onSave }) {
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
  const draggingTextIdRef = useRef("");
  const deleteTargetRef = useRef(null);
  const deleteArmedRef = useRef(false);
  const uploadedUrlRef = useRef("");
  const createMutation = useCreateStory();
  const [story, setStory] = useState(freshStory);
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

  const activeText = useMemo(() => story.texts.find((item) => item.id === activeTextId) || story.texts[0], [activeTextId, story.texts]);
  const colorIndex = useMemo(() => STORY_COLORS.indexOf(activeText?.color), [activeText?.color]);
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
    startCamera("environment");
    return stopCamera;
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraStatus !== "live" || !videoRef.current || !cameraStreamRef.current) return;
    videoRef.current.srcObject = cameraStreamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraStatus, facingMode]);

  useEffect(() => {
    uploadedUrlRef.current = story.uploadedUrl;
  }, [story.uploadedUrl]);

  useEffect(() => () => {
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
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
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const close = () => {
    stopCamera();
    setUpload({ error: "", progress: 0, step: "" });
    const fresh = freshStory();
    setStory((current) => {
      if (current.uploadedUrl) URL.revokeObjectURL(current.uploadedUrl);
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
      if (current.uploadedUrl) URL.revokeObjectURL(current.uploadedUrl);
      return { ...current, photo: true, uploadedUrl: url };
    });
    stopCamera();
    setCameraStatus("captured");
  };

  const switchCamera = () => startCamera(facingMode === "environment" ? "user" : "environment");

  const useCroppedImage = (file) => {
    const url = URL.createObjectURL(file);
    setStory((current) => {
      if (current.uploadedUrl) URL.revokeObjectURL(current.uploadedUrl);
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
    draggingTextIdRef.current = textId;
    setActiveTextId(textId);
    setTextDragging(true);
  };

  const moveDrag = (event) => {
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width));
    const y = Math.min(0.85, Math.max(0.08, (event.clientY - rect.top) / rect.height));
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
    if (deleteArmedRef.current) {
      const deletedId = draggingTextIdRef.current;
      const remaining = story.texts.filter((item) => item.id !== deletedId);
      const texts = remaining.length ? remaining : [newTextOverlay()];
      setStory((current) => ({ ...current, texts }));
      setActiveTextId(texts.at(-1).id);
    }
    dragRef.current = null;
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
    if (!storyTexts.length && !story.photo) {
      showToast("Write something first.");
      return;
    }
    try {
      setUpload({ error: "", progress: 8, step: "Preparing" });
      const file = await renderStoryFile(story);
      const editorMetadata = {
        prototypeComposer: true,
        textOverlays: storyTexts.map((item) => ({ color: item.color, fontSize: item.size, style: item.style, text: item.text.trim(), x: item.x * 100, y: item.y * 100 })),
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
      formData.append("audience", "everyone");
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
    <div aria-label="Create Story" aria-modal="true" className="story-composer-overlay" role="dialog">
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
        <button aria-label="Focus story text" className="story-composer-focus" onClick={() => { enterTextMode(); inputRef.current?.focus(); }} type="button" />

        <header className="story-composer-head">
          <button aria-label="Close Story composer" onClick={close} type="button"><FiX /></button>
          <span />
          <button aria-label="Add another text" onClick={addText} type="button"><FiType /></button>
          <button
            aria-label={cameraStatus === "live" ? "Switch camera" : story.photo ? "Retake photo" : "Refresh background"}
            className={cameraStatus === "live" && !canSwitchCamera ? "invisible" : ""}
            onClick={() => {
              if (cameraStatus === "live") {
                if (canSwitchCamera) switchCamera();
                return;
              }
              if (story.uploadedUrl) {
                URL.revokeObjectURL(story.uploadedUrl);
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

        {hintOpen ? (
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

        {!story.photo && !story.texts.some((item) => item.text.trim()) && !["starting", "live", "text"].includes(cameraStatus) ? (
          <div className="story-composer-empty">
            <button onClick={() => uploadInputRef.current?.click()} type="button">
              <span><FiImage /></span>
              <strong>Add image to your story</strong>
            </button>
            <p>{cameraError || "Or add text using the field below"}</p>
          </div>
        ) : null}

        {cameraStatus === "text" && !story.texts.some((item) => item.text.trim()) ? <button className="story-composer-text-prompt" onClick={() => inputRef.current?.focus()} type="button">Type your story</button> : null}

        {cameraStatus === "starting" ? <div className="story-composer-camera-loading"><FiRefreshCw /> Opening camera…</div> : null}

        {story.texts.filter((item) => item.text).map((item) => (
          <button
            className={`${storyTextClass(item.style)} ${activeTextId === item.id ? "is-active" : ""}`}
            key={item.id}
            onPointerDown={(event) => beginDrag(event, item.id)}
            style={{
              color: item.style === 2 && item.color !== "#0A0C0F" ? "#0A0C0F" : item.color,
              fontSize: `${item.size}px`,
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              ...(item.style === 2 ? { backgroundColor: item.color } : null),
            }}
            type="button"
          >
            {item.text}
          </button>
        ))}

        {textDragging ? <div aria-label="Drag here to delete text" className={`story-composer-delete-target ${deleteArmed ? "is-armed" : ""}`} ref={deleteTargetRef} role="status"><FiTrash2 /><span>{deleteArmed ? "Release to delete" : "Drag here to delete"}</span></div> : null}

        <button aria-label="Add an image" className="story-composer-gallery-thumb" onClick={() => uploadInputRef.current?.click()} type="button">
          <FiImage />
        </button>

        {cameraStatus === "live" ? <div className="story-composer-camera-controls">
          <button aria-label="Take photo" className="story-composer-shutter" onClick={capturePhoto} type="button"><span><FiCamera /></span></button>
        </div> : null}

        <div className="story-composer-bottom">
          <div className="story-composer-toolbar">
            <button aria-label="Change text style" className={activeText?.style === 2 ? "is-selected" : ""} onClick={() => updateActiveText({ style: (activeText.style + 1) % STORY_STYLE_COUNT })} type="button">
              <FiType />
            </button>
            <button aria-label="Change text color" className="story-composer-color" onClick={() => updateActiveText({ color: STORY_COLORS[(colorIndex + 1 + STORY_COLORS.length) % STORY_COLORS.length] })} type="button">
              <span style={{ backgroundColor: activeText?.color }} />
            </button>
            <button aria-label="Decrease text size" onClick={() => updateActiveText({ size: Math.max(16, activeText.size - 3) })} type="button"><FiMinus /></button>
            <button aria-label="Increase text size" onClick={() => updateActiveText({ size: Math.min(44, activeText.size + 3) })} type="button">+</button>
            <input
              aria-label="Story text"
              onChange={(event) => updateActiveText({ text: event.target.value })}
              onFocus={enterTextMode}
              placeholder="Say it..."
              ref={inputRef}
              value={activeText?.text || ""}
            />
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
