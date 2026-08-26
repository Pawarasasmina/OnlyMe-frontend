import { useEffect, useMemo, useRef, useState } from "react";
import { FiImage, FiMinus, FiRefreshCw, FiType, FiX } from "react-icons/fi";
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

function freshStory() {
  return {
    color: "#D6EAFF",
    gradient: 0,
    photo: false,
    size: 26,
    style: 0,
    text: "",
    uploadedUrl: "",
    x: 0.5,
    y: 0.42,
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

  const text = story.text.trim();
  if (text) {
    const fontSize = story.size * 3.1;
    const x = story.x * canvas.width;
    const y = story.y * canvas.height;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `${story.style === 1 || story.style === 2 ? 800 : 650} ${fontSize}px ${
      story.style === 3 ? "Georgia" : story.style === 4 ? "Consolas" : "system-ui"
    }`;
    const width = Math.min(canvas.width * 0.82, context.measureText(text).width + 96);
    if (story.style === 2) {
      context.fillStyle = story.color;
      roundRect(context, x - width / 2, y - fontSize * 0.75, width, fontSize * 1.5, 42);
      context.fill();
      context.fillStyle = story.color === "#0A0C0F" ? "#FFFFFF" : "#0A0C0F";
    } else {
      context.shadowColor = "rgba(0,0,0,.55)";
      context.shadowBlur = 24;
      context.fillStyle = story.color;
    }
    context.fillText(text, x, y, canvas.width * 0.82);
  }

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
  const dragRef = useRef(null);
  const uploadedUrlRef = useRef("");
  const createMutation = useCreateStory();
  const [story, setStory] = useState(freshStory);
  const [hintOpen, setHintOpen] = useState(() => !localStorage.getItem("atseen_story_comp_hint"));
  const [upload, setUpload] = useState({ error: "", progress: 0, step: "" });
  const [cropSource, setCropSource] = useState("");

  const colorIndex = useMemo(() => STORY_COLORS.indexOf(story.color), [story.color]);
  const backgroundStyle = story.photo
    ? { backgroundImage: `url("${story.uploadedUrl}")` }
    : { background: `linear-gradient(160deg,${STORY_GRADIENTS[story.gradient % STORY_GRADIENTS.length].join(",")})` };

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    uploadedUrlRef.current = story.uploadedUrl;
  }, [story.uploadedUrl]);

  useEffect(() => () => {
    if (uploadedUrlRef.current) URL.revokeObjectURL(uploadedUrlRef.current);
  }, []);

  const updateStory = (patch) => setStory((current) => ({ ...current, ...patch }));

  const close = () => {
    setUpload({ error: "", progress: 0, step: "" });
    setStory((current) => {
      if (current.uploadedUrl) URL.revokeObjectURL(current.uploadedUrl);
      return freshStory();
    });
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
    setCropSource(URL.createObjectURL(file));
  };

  const useCroppedImage = (file) => {
    const url = URL.createObjectURL(file);
    setStory((current) => {
      if (current.uploadedUrl) URL.revokeObjectURL(current.uploadedUrl);
      return { ...current, photo: true, uploadedUrl: url };
    });
    URL.revokeObjectURL(cropSource);
    setCropSource("");
  };

  const beginDrag = (event) => {
    if (!story.text.trim() || !stageRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = true;
  };

  const moveDrag = (event) => {
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    updateStory({
      x: Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width)),
      y: Math.min(0.85, Math.max(0.08, (event.clientY - rect.top) / rect.height)),
    });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const publish = async () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }
    if (!story.text.trim() && !story.photo) {
      showToast("Write something first.");
      return;
    }
    try {
      setUpload({ error: "", progress: 8, step: "Preparing" });
      const file = await renderStoryFile(story);
      const editorMetadata = {
        prototypeComposer: true,
        textOverlays: story.text.trim() ? [{ color: story.color, fontSize: story.size, style: story.style, text: story.text.trim(), x: story.x * 100, y: story.y * 100 }] : [],
      };
      if (mode === "compose") {
        setUpload({ error: "", progress: 70, step: "Adding preview" });
        await onSave?.({ caption: story.text.trim(), editorMetadata, file });
        setUpload({ error: "", progress: 100, step: "Added" });
        close();
        return;
      }
      const formData = new FormData();
      formData.append("image", file);
      formData.append("mediaType", "image");
      formData.append("duration", "5");
      formData.append("caption", story.text.trim());
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
        onPointerUp={endDrag}
        ref={stageRef}
      >
        <div aria-hidden="true" className="story-composer-bg" style={backgroundStyle} />
        <button aria-label="Focus story text" className="story-composer-focus" onClick={() => inputRef.current?.focus()} type="button" />

        <header className="story-composer-head">
          <button aria-label="Close Story composer" onClick={close} type="button"><FiX /></button>
          <span />
          <button aria-label="Upload image from device" onClick={() => uploadInputRef.current?.click()} type="button">
            <FiImage />
          </button>
          <button
            aria-label="Refresh background"
            onClick={() => {
              if (story.uploadedUrl) {
                URL.revokeObjectURL(story.uploadedUrl);
                updateStory({ photo: false, uploadedUrl: "" });
              } else {
                updateStory({ gradient: story.gradient + 1 });
              }
            }}
            type="button"
          >
            <FiRefreshCw />
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

        {!story.photo && !story.text.trim() ? (
          <div className="story-composer-empty">
            <button onClick={() => uploadInputRef.current?.click()} type="button">
              <span><FiImage /></span>
              <strong>Add image to your story</strong>
            </button>
            <p>Or add text using the field below</p>
          </div>
        ) : null}

        {story.text ? (
          <button
            className={storyTextClass(story.style)}
            onPointerDown={beginDrag}
            style={{
              color: story.style === 2 && story.color !== "#0A0C0F" ? "#0A0C0F" : story.color,
              fontSize: `${story.size}px`,
              left: `${story.x * 100}%`,
              top: `${story.y * 100}%`,
              ...(story.style === 2 ? { backgroundColor: story.color } : null),
            }}
            type="button"
          >
            {story.text}
          </button>
        ) : null}

        <button aria-label="Add an image" className="story-composer-gallery-thumb" onClick={() => uploadInputRef.current?.click()} type="button">
          <FiImage />
        </button>

        <div className="story-composer-bottom">
          <div className="story-composer-toolbar">
            <button aria-label="Change text style" className={story.style === 2 ? "is-selected" : ""} onClick={() => updateStory({ style: (story.style + 1) % STORY_STYLE_COUNT })} type="button">
              <FiType />
            </button>
            <button aria-label="Change text color" className="story-composer-color" onClick={() => updateStory({ color: STORY_COLORS[(colorIndex + 1 + STORY_COLORS.length) % STORY_COLORS.length] })} type="button">
              <span style={{ backgroundColor: story.color }} />
            </button>
            <button aria-label="Decrease text size" onClick={() => updateStory({ size: Math.max(16, story.size - 3) })} type="button"><FiMinus /></button>
            <button aria-label="Increase text size" onClick={() => updateStory({ size: Math.min(44, story.size + 3) })} type="button">+</button>
            <input
              aria-label="Story text"
              onChange={(event) => updateStory({ text: event.target.value })}
              placeholder="Say it..."
              ref={inputRef}
              value={story.text}
            />
            <button className="story-composer-share" disabled={createMutation.isPending || upload.step === "Adding preview"} onClick={publish} type="button">
              {createMutation.isPending || upload.step === "Adding preview" ? "..." : mode === "compose" ? "Add" : "Share"}
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
