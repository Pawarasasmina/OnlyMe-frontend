import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCamera,
  FiCheck,
  FiChevronLeft,
  FiEdit3,
  FiImage,
  FiMinus,
  FiPlus,
  FiRotateCcw,
  FiSend,
  FiSlash,
  FiType,
  FiUpload,
  FiX,
} from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useCreateStory } from "../../hooks/useStories";
import { canCreateStory } from "../../utils/storyPermissions";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_VIDEO_DURATION = 60;
const TEXT_COLORS = ["#FFFFFF", "#8AB8FF", "#6ECF97", "#F17878", "#FACC15"];
const STICKERS = ["✦", "👁", "📍", "@", "#", "Now", new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), new Date().toLocaleDateString()];

const initialEditor = {
  transform: { scale: 1, translateX: 0, translateY: 0, rotation: 0 },
  textOverlays: [],
  stickers: [],
  drawing: [],
};

function fileExtension(file) {
  const name = file?.name?.toLowerCase() || "";
  const match = name.match(/\.[^.]+$/);
  return match?.[0] || "";
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This video could not be read."));
    };
    video.src = url;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalPoint(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    y: clamp(((event.clientY - rect.top) / rect.height) * 177.777, 0, 177.777),
  };
}

function StoryUploadProgress({ error, onRetry, progress, step }) {
  return (
    <div className="rounded-2xl border border-atseen-line bg-atseen-surface p-4" role="status">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-atseen-text">{step}</span>
        <span className="text-atseen-muted">{progress}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-atseen-blue transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      {error ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-atseen-danger/25 bg-atseen-danger/10 p-3 text-sm text-atseen-danger">
          <span>{error}</span>
          <button className="font-bold text-white" onClick={onRetry} type="button">Retry</button>
        </div>
      ) : null}
    </div>
  );
}

function StoryCreator({ isOpen, onClose, onPublished }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const canCreate = canCreateStory(user);
  const fileInputRef = useRef(null);
  const previewRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const dragRef = useRef(null);
  const drawRef = useRef(null);
  const streamRef = useRef(null);
  const [stage, setStage] = useState("select");
  const [media, setMedia] = useState(null);
  const [editor, setEditor] = useState(initialEditor);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("everyone");
  const [settings, setSettings] = useState({ allowReactions: true, allowReplies: false, allowSharing: true });
  const [error, setError] = useState("");
  const [tool, setTool] = useState("move");
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState("user");
  const [recording, setRecording] = useState(false);
  const [upload, setUpload] = useState({ error: "", progress: 0, step: "" });
  const createMutation = useCreateStory();

  const selectedText = useMemo(() => editor.textOverlays.find((item) => item.id === selectedTextId), [editor.textOverlays, selectedTextId]);

  const stopCamera = useCallback(() => {
    mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
  }, []);

  const reset = useCallback(() => {
    setStage("select");
    setError("");
    setEditor(initialEditor);
    setCaption("");
    setAudience("everyone");
    setSettings({ allowReactions: true, allowReplies: false, allowSharing: true });
    setTool("move");
    setSelectedTextId(null);
    setUpload({ error: "", progress: 0, step: "" });
    setCameraOpen(false);
    stopCamera();
    setMedia((current) => {
      if (current?.url?.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  useEffect(() => () => {
    stopCamera();
    setMedia((current) => {
      if (current?.url?.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [stopCamera]);

  const validateFile = async (file) => {
    const extension = fileExtension(file);
    const isImage = IMAGE_TYPES.includes(file.type) || IMAGE_EXTENSIONS.includes(extension);
    const isVideo = VIDEO_TYPES.includes(file.type) || VIDEO_EXTENSIONS.includes(extension);

    if (!isImage && !isVideo) {
      throw new Error("Choose a supported image or video file.");
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      throw new Error("Images must be 20 MB or smaller.");
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      throw new Error("Videos must be 200 MB or smaller.");
    }

    const duration = isVideo ? await getVideoDuration(file) : 5;
    if (isVideo && duration > MAX_VIDEO_DURATION) {
      throw new Error("Story videos must be 60 seconds or shorter.");
    }

    return { duration, mediaType: isVideo ? "video" : "image" };
  };

  const setFile = async (file) => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }

    setError("");
    try {
      const details = await validateFile(file);
      const url = URL.createObjectURL(file);
      setMedia((current) => {
        if (current?.url?.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return { ...details, file, name: file.name, url };
      });
      setStage("edit");
    } catch (validationError) {
      setError(validationError.message);
      showToast(validationError.message);
    }
  };

  const openPicker = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }
    fileInputRef.current?.click();
  };

  const openCamera = async () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera capture is not supported in this browser.");
      return;
    }

    setCameraError("");
    setCameraOpen(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode } });
      streamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera permission was denied or no camera is available.");
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      openCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `story-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      setCameraOpen(false);
      setFile(file);
    }, "image/jpeg", 0.9);
  };

  const toggleRecord = () => {
    if (!streamRef.current) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    const chunks = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => event.data?.size && chunks.push(event.data);
    recorder.onstop = () => {
      const file = new File([new Blob(chunks, { type: "video/webm" })], `story-video-${Date.now()}.webm`, { type: "video/webm" });
      stopCamera();
      setCameraOpen(false);
      setFile(file);
    };
    recorder.start();
    setRecording(true);
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_VIDEO_DURATION * 1000);
  };

  const updateTransform = (patch) => {
    setEditor((current) => ({
      ...current,
      transform: { ...current.transform, ...patch },
    }));
  };

  const addText = () => {
    const id = `text-${Date.now()}`;
    setEditor((current) => ({
      ...current,
      textOverlays: [
        ...current.textOverlays,
        {
          id,
          align: "center",
          background: "pill",
          color: "#FFFFFF",
          fontSize: 28,
          fontWeight: 800,
          text: "New text",
          x: 50,
          y: 45,
        },
      ],
    }));
    setSelectedTextId(id);
    setTool("text");
  };

  const updateText = (id, patch) => {
    setEditor((current) => ({
      ...current,
      textOverlays: current.textOverlays.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const deleteText = (id) => {
    setEditor((current) => ({ ...current, textOverlays: current.textOverlays.filter((item) => item.id !== id) }));
    setSelectedTextId(null);
  };

  const addSticker = (value) => {
    setEditor((current) => ({
      ...current,
      stickers: [...current.stickers, { id: `sticker-${Date.now()}-${value}`, value, x: 50, y: 55, scale: 1, rotation: 0 }],
    }));
    setTool("sticker");
  };

  const startDrag = (event, mode, id = null) => {
    const element = previewRef.current;
    if (!element || tool === "draw") return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const start = { x: event.clientX, y: event.clientY };
    dragRef.current = { id, mode, start, transform: editor.transform };
  };

  const moveDrag = (event) => {
    const active = dragRef.current;
    if (!active || !previewRef.current || tool === "draw") return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = ((event.clientX - active.start.x) / rect.width) * 100;
    const dy = ((event.clientY - active.start.y) / rect.height) * 100;

    if (active.mode === "media") {
      updateTransform({
        translateX: clamp((active.transform.translateX || 0) + dx, -35, 35),
        translateY: clamp((active.transform.translateY || 0) + dy, -35, 35),
      });
      return;
    }

    const point = normalPoint(event, previewRef.current);
    if (active.mode === "text") {
      updateText(active.id, { x: point.x, y: (point.y / 177.777) * 100 });
    } else if (active.mode === "sticker") {
      setEditor((current) => ({
        ...current,
        stickers: current.stickers.map((item) => (item.id === active.id ? { ...item, x: point.x, y: (point.y / 177.777) * 100 } : item)),
      }));
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const startDrawing = (event) => {
    if (tool !== "draw" || !previewRef.current) return;
    event.preventDefault();
    const point = normalPoint(event, previewRef.current);
    const stroke = { id: `stroke-${Date.now()}`, color: "#8AB8FF", size: 1.5, points: [point] };
    drawRef.current = stroke.id;
    setEditor((current) => ({ ...current, drawing: [...current.drawing, stroke] }));
  };

  const moveDrawing = (event) => {
    if (tool !== "draw" || !drawRef.current || !previewRef.current) return;
    event.preventDefault();
    const point = normalPoint(event, previewRef.current);
    setEditor((current) => ({
      ...current,
      drawing: current.drawing.map((stroke) => (stroke.id === drawRef.current ? { ...stroke, points: [...stroke.points, point] } : stroke)),
    }));
  };

  const endDrawing = () => {
    drawRef.current = null;
  };

  const publish = () => {
    if (!canCreate) {
      showToast("Story publishing is not available for this account.");
      return;
    }

    if (!media?.file) {
      showToast("Add photo or video first.");
      return;
    }

    const trimmedCaption = caption.trim();
    if (caption && !trimmedCaption) {
      showToast("Caption cannot be only spaces.");
      return;
    }

    const formData = new FormData();
    formData.append("media", media.file);
    formData.append("mediaType", media.mediaType);
    formData.append("duration", String(media.duration || 5));
    formData.append("caption", trimmedCaption);
    formData.append("audience", audience);
    formData.append("allowReactions", String(settings.allowReactions));
    formData.append("allowReplies", String(settings.allowReplies));
    formData.append("allowSharing", String(settings.allowSharing));
    formData.append("editorMetadata", JSON.stringify(editor));
    formData.append("owner", JSON.stringify({
      id: user?.id || user?._id || "me",
      name: user?.name || user?.displayName || "You",
      username: user?.username || "you",
      avatar: user?.avatar || user?.profileImage || "",
      verified: Boolean(user?.verified),
      role: user?.role,
    }));

    setStage("publish");
    setUpload({ error: "", progress: 8, step: "Preparing" });
    createMutation.mutate(
      {
        formData,
        onUploadProgress: (event) => {
          const next = event.total ? Math.round((event.loaded / event.total) * 100) : 45;
          setUpload({ error: "", progress: next, step: next >= 100 ? "Publishing" : "Uploading" });
        },
      },
      {
        onSuccess: (story) => {
          setUpload({ error: "", progress: 100, step: "Published" });
          showToast("Your Story is live.");
          onPublished?.(story);
          onClose();
        },
        onError: (publishError) => {
          const message = publishError?.response?.status === 403 ? "You do not have permission to publish Stories." : publishError?.message || "Story upload failed.";
          setUpload((current) => ({ ...current, error: message, step: "Failed" }));
          showToast(message);
        },
      }
    );
  };

  const close = () => {
    onClose();
  };

  if (!isOpen || !canCreate) {
    return null;
  }

  return (
    <FanModal className="max-h-[96dvh] max-w-[1040px] overflow-y-auto p-0 sm:p-0" isOpen={isOpen} onClose={close} title="Create Story">
      <div className="grid min-h-[min(780px,88dvh)] bg-[#06080B] text-atseen-text lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="flex min-h-[520px] flex-col items-center justify-center gap-5 p-4 sm:p-6"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) setFile(file);
          }}
          onPaste={(event) => {
            const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/"));
            if (file) setFile(file);
          }}
        >
          {stage === "select" ? (
            <div className="w-full max-w-[520px] rounded-[22px] border border-atseen-line bg-white/[0.03] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-atseen-line bg-white/[0.05] text-2xl text-atseen-blue">
                <FiImage aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-2xl font-black">Add a Story</h3>
              <p className="mt-2 text-sm text-atseen-muted">Upload, drag, paste, or capture vertical media. Images up to 20 MB, videos up to 60 seconds.</p>
              {error ? <p className="mt-4 rounded-2xl border border-atseen-danger/25 bg-atseen-danger/10 p-3 text-sm text-atseen-danger">{error}</p> : null}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-4 py-3 font-bold text-atseen-bg" onClick={openPicker} type="button"><FiUpload /> Upload media</button>
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-atseen-line bg-white/[0.03] px-4 py-3 font-bold" onClick={openCamera} type="button"><FiCamera /> Camera</button>
              </div>
              <input accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")} className="sr-only" onChange={(event) => event.target.files?.[0] && setFile(event.target.files[0])} ref={fileInputRef} type="file" />
            </div>
          ) : null}

          {stage !== "select" && media ? (
            <div className="flex w-full flex-col items-center gap-4">
              <div className="flex w-full max-w-[430px] items-center justify-between">
                <button className="inline-flex items-center gap-2 rounded-full border border-atseen-line px-3 py-2 text-sm font-bold" onClick={() => setStage("select")} type="button"><FiChevronLeft /> Replace</button>
                <span className="text-xs font-semibold text-atseen-muted">9:16 Story preview</span>
              </div>
              <div
                className="relative aspect-[9/16] w-full max-w-[390px] touch-none overflow-hidden rounded-[28px] border border-atseen-line bg-black shadow-glow"
                onPointerCancel={endDrawing}
                onPointerDown={(event) => {
                  startDrag(event, "media");
                  startDrawing(event);
                }}
                onPointerMove={(event) => {
                  moveDrag(event);
                  moveDrawing(event);
                }}
                onPointerUp={() => {
                  endDrag();
                  endDrawing();
                }}
                ref={previewRef}
              >
                <div className="absolute inset-0 scale-110 bg-black/70 blur-2xl">
                  {media.mediaType === "video" ? <video className="h-full w-full object-cover" muted src={media.url} /> : <img alt="" className="h-full w-full object-cover" src={media.url} />}
                </div>
                {media.mediaType === "video" ? (
                  <video autoPlay className="absolute inset-0 h-full w-full object-cover" loop muted playsInline src={media.url} style={{ transform: `translate(${editor.transform.translateX}%, ${editor.transform.translateY}%) scale(${editor.transform.scale})` }} />
                ) : (
                  <img alt="" className="absolute inset-0 h-full w-full object-cover" src={media.url} style={{ transform: `translate(${editor.transform.translateX}%, ${editor.transform.translateY}%) scale(${editor.transform.scale})` }} />
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-center gap-2">
                  <FanAvatar name={user?.name || "You"} size="h-8 w-8" src={user?.avatar || user?.profileImage} />
                  <span className="truncate text-sm font-bold text-white">Your Story</span>
                </div>
                {editor.textOverlays.map((overlay) => (
                  <button
                    className={`absolute max-w-[82%] rounded-xl px-3 py-1.5 text-center font-bold text-white outline-none ring-atseen-blue focus:ring-2 ${
                      overlay.background === "pill" ? "rounded-full bg-black/45" : overlay.background === "solid" ? "bg-black/65" : overlay.background === "translucent" ? "bg-black/30" : ""
                    }`}
                    key={overlay.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedTextId(overlay.id);
                      setTool("text");
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      startDrag(event, "text", overlay.id);
                    }}
                    style={{ color: overlay.color, fontSize: `${overlay.fontSize}px`, left: `${overlay.x}%`, textAlign: overlay.align, top: `${overlay.y}%`, transform: "translate(-50%, -50%)" }}
                    type="button"
                  >
                    {overlay.text}
                  </button>
                ))}
                {editor.stickers.map((sticker) => (
                  <button
                    className="absolute rounded-2xl bg-black/25 px-3 py-1.5 text-2xl backdrop-blur"
                    key={sticker.id}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      startDrag(event, "sticker", sticker.id);
                    }}
                    style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)` }}
                    type="button"
                  >
                    {sticker.value}
                  </button>
                ))}
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 177.777">
                  {editor.drawing.map((stroke) => <polyline fill="none" key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.size} />)}
                </svg>
                {caption.trim() ? <p className="absolute bottom-16 left-4 right-4 rounded-2xl bg-black/35 px-3 py-2 text-center text-base font-bold leading-6 text-white backdrop-blur">{caption.trim()}</p> : null}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="border-t border-atseen-line bg-white/[0.03] p-4 lg:border-l lg:border-t-0">
          {cameraOpen ? (
            <div className="mb-4 rounded-2xl border border-atseen-line bg-black p-3">
              <video autoPlay className="aspect-[9/16] w-full rounded-xl object-cover" muted playsInline ref={cameraVideoRef} />
              {cameraError ? <p className="mt-3 text-sm text-atseen-danger">{cameraError}</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-xl border border-atseen-line px-3 py-2 text-sm font-bold" onClick={() => setFacingMode((current) => (current === "user" ? "environment" : "user"))} type="button">Switch</button>
                <button className="rounded-xl border border-atseen-line px-3 py-2 text-sm font-bold" onClick={capturePhoto} type="button">Photo</button>
                <button className={`col-span-2 rounded-xl px-3 py-2 text-sm font-bold ${recording ? "bg-atseen-danger text-white" : "bg-atseen-blue text-atseen-bg"}`} onClick={toggleRecord} type="button">{recording ? "Stop recording" : "Record video"}</button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {[
              ["move", FiImage, "Move"],
              ["text", FiType, "Text"],
              ["sticker", FiPlus, "Sticker"],
              ["draw", FiEdit3, "Draw"],
            ].map(([value, Icon, label]) => (
              <button className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${tool === value ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line text-atseen-muted"}`} key={value} onClick={() => setTool(value)} type="button">
                <Icon aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {stage !== "select" && media ? (
            <div className="mt-5 space-y-5">
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Media</h3>
                  <button className="text-xs font-bold text-atseen-blue" onClick={() => updateTransform({ scale: 1, translateX: 0, translateY: 0 })} type="button"><FiRotateCcw className="inline" /> Reset</button>
                </div>
                <label className="mt-3 block text-xs font-semibold text-atseen-muted">Zoom</label>
                <input className="mt-2 w-full accent-atseen-blue" max="2.2" min="1" onChange={(event) => updateTransform({ scale: Number(event.target.value) })} step="0.05" type="range" value={editor.transform.scale} />
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Text</h3>
                  <button className="rounded-full bg-atseen-blue px-3 py-1.5 text-xs font-bold text-atseen-bg" onClick={addText} type="button">Add text</button>
                </div>
                {selectedText ? (
                  <div className="space-y-3 rounded-2xl border border-atseen-line p-3">
                    <input className="w-full rounded-xl border border-atseen-line bg-black/25 px-3 py-2 text-sm outline-none focus:border-atseen-blue" maxLength={80} onChange={(event) => updateText(selectedText.id, { text: event.target.value })} value={selectedText.text} />
                    <div className="flex items-center gap-2">
                      <button className="rounded-full border border-atseen-line p-2" onClick={() => updateText(selectedText.id, { fontSize: clamp(selectedText.fontSize - 2, 16, 54) })} type="button"><FiMinus /></button>
                      <span className="text-xs text-atseen-muted">{selectedText.fontSize}px</span>
                      <button className="rounded-full border border-atseen-line p-2" onClick={() => updateText(selectedText.id, { fontSize: clamp(selectedText.fontSize + 2, 16, 54) })} type="button"><FiPlus /></button>
                      <button className="ml-auto rounded-full border border-atseen-danger/40 p-2 text-atseen-danger" onClick={() => deleteText(selectedText.id)} type="button"><FiX /></button>
                    </div>
                    <div className="flex gap-2">
                      {TEXT_COLORS.map((color) => <button aria-label={`Set text color ${color}`} className="h-7 w-7 rounded-full border border-white/20" key={color} onClick={() => updateText(selectedText.id, { color })} style={{ backgroundColor: color }} type="button" />)}
                    </div>
                  </div>
                ) : <p className="text-xs text-atseen-muted">Select a text layer to edit it.</p>}
              </section>

              <section>
                <h3 className="text-sm font-bold">Stickers</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STICKERS.map((sticker) => <button className="rounded-full border border-atseen-line bg-black/20 px-3 py-2 text-sm font-bold" key={sticker} onClick={() => addSticker(sticker)} type="button">{sticker}</button>)}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Drawing</h3>
                  <div className="flex gap-2">
                    <button className="rounded-full border border-atseen-line p-2" onClick={() => setEditor((current) => ({ ...current, drawing: current.drawing.slice(0, -1) }))} type="button"><FiChevronLeft /></button>
                    <button className="rounded-full border border-atseen-line p-2" onClick={() => setEditor((current) => ({ ...current, drawing: [] }))} type="button"><FiSlash /></button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-atseen-muted">Choose Draw, then drag on the preview.</p>
              </section>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">Caption</span>
                <textarea className="h-24 w-full resize-none rounded-2xl border border-atseen-line bg-black/25 px-3 py-2 text-sm outline-none focus:border-atseen-blue" maxLength={300} onChange={(event) => setCaption(event.target.value)} placeholder="Write a caption..." value={caption} />
                <span className="mt-1 block text-right text-xs text-atseen-muted">{caption.length}/300</span>
              </label>

              <section>
                <h3 className="text-sm font-bold">Audience</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["everyone", "followers", "close_circle", "only_me"].map((value) => <button className={`rounded-xl border px-3 py-2 text-xs font-bold capitalize ${audience === value ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line text-atseen-muted"}`} key={value} onClick={() => setAudience(value)} type="button">{value.replace("_", " ")}</button>)}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold">Settings</h3>
                {[
                  ["allowReactions", "Allow reactions"],
                  ["allowReplies", "Allow replies"],
                  ["allowSharing", "Allow sharing"],
                ].map(([key, label]) => <label className="flex items-center justify-between rounded-xl border border-atseen-line px-3 py-2 text-sm" key={key}><span>{label}</span><input checked={settings[key]} className="accent-atseen-blue" onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} type="checkbox" /></label>)}
              </section>

              {stage === "publish" ? <StoryUploadProgress error={upload.error} onRetry={publish} progress={upload.progress} step={upload.step} /> : null}

              <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-atseen-blue px-4 py-3 font-black text-atseen-bg disabled:opacity-60" disabled={createMutation.isPending} onClick={publish} type="button">
                {createMutation.isPending ? <FiCheck /> : <FiSend />} {createMutation.isPending ? "Publishing..." : "Publish Story"}
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </FanModal>
  );
}

export default StoryCreator;
