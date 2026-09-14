import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiFlag, FiHeart, FiImage, FiMoreHorizontal, FiPlay, FiPlus, FiRefreshCw, FiSend, FiTrash2, FiVideo, FiX } from "react-icons/fi";
import LoadingSkeleton from "../fanWeb/shared/LoadingSkeleton";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const ALL_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;
const PREVIEW_LIMIT = 5;
const OWNER_PREVIEW_LIMIT = 4;
const CROP_WIDTH = 1024;
const CROP_HEIGHT = 1280;

function formatDuration(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function isVideo(item) {
  return item?.type === "video" || item?.mediaType === "video";
}

function mediaSrc(item) {
  return resolveMediaUrl(item?.url || item?.mediaUrl || "");
}

function thumbSrc(item) {
  return resolveMediaUrl(item?.thumbnailUrl || item?.url || item?.mediaUrl || "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read selected photo."));
    image.src = src;
  });
}

async function cropImageFile(file, previewUrl, crop) {
  const image = await loadImage(previewUrl);
  const canvas = document.createElement("canvas");
  canvas.width = CROP_WIDTH;
  canvas.height = CROP_HEIGHT;
  const context = canvas.getContext("2d");
  const baseScale = Math.max(CROP_WIDTH / image.naturalWidth, CROP_HEIGHT / image.naturalHeight);
  const drawScale = baseScale * crop.scale;
  const drawWidth = image.naturalWidth * drawScale;
  const drawHeight = image.naturalHeight * drawScale;
  const offsetX = (CROP_WIDTH - drawWidth) / 2 + crop.x * CROP_WIDTH;
  const offsetY = (CROP_HEIGHT - drawHeight) / 2 + crop.y * CROP_HEIGHT;
  context.fillStyle = "#05070a";
  context.fillRect(0, 0, CROP_WIDTH, CROP_HEIGHT);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Could not prepare selected photo.");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg") || "profile-media.jpg", { type: "image/jpeg" });
}

function ProfileMediaTile({ item, isOwner, onOpen, onRemove }) {
  const video = isVideo(item);
  const duration = formatDuration(item.duration);
  return (
    <span className="profile-media-tile-wrap">
      <button aria-label={`Open ${video ? "video" : "photo"} in Media`} className="profile-photo-tile profile-media-tile" onClick={() => onOpen(item)} type="button">
        {video ? (
          thumbSrc(item) ? <img alt={item.caption || "Profile video"} loading="lazy" src={thumbSrc(item)} /> : <span className="profile-media-video-fallback"><FiVideo /></span>
        ) : (
          <img alt={item.caption || "Profile photo"} loading="lazy" src={mediaSrc(item)} />
        )}
        {video ? <small className="profile-media-video-badge"><FiPlay />{duration || "Video"}</small> : null}
      </button>
      {isOwner ? <button aria-label="Remove from Profile Media" className="profile-media-remove" onClick={() => onRemove(item)} type="button"><FiTrash2 /></button> : null}
    </span>
  );
}

function ProfileMediaUploader({ isOpen, onClose, onUpload, status }) {
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const pointersRef = useRef(new Map());
  const [accept, setAccept] = useState(ALL_ACCEPT);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [crop, setCrop] = useState({ scale: 1, x: 0, y: 0 });
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState("");
  const busy = status === "uploading" || status === "saving";
  const isSelectedVideo = file?.type?.startsWith("video/");
  const isSelectedImage = file && !isSelectedVideo;
  const working = busy || preparing;

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCaption("");
      setAccept(ALL_ACCEPT);
      setCrop({ scale: 1, x: 0, y: 0 });
      setLocalError("");
      setPreparing(false);
      dragRef.current = null;
      pinchRef.current = null;
      pointersRef.current.clear();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const choose = (nextAccept) => {
    setAccept(nextAccept);
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const selectFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setCrop({ scale: 1, x: 0, y: 0 });
    setLocalError("");
  };

  const beginDrag = (event) => {
    if (!isSelectedImage || working) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
      pinchRef.current = { distance, scale: crop.scale };
      dragRef.current = null;
      return;
    }
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, crop };
  };

  const drag = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const points = [...pointersRef.current.values()].slice(0, 2);
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
      setCrop((current) => ({ ...current, scale: clamp(pinchRef.current.scale * (distance / pinchRef.current.distance), 1, 3) }));
      return;
    }
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const start = dragRef.current;
    const width = event.currentTarget.clientWidth || 1;
    const height = event.currentTarget.clientHeight || 1;
    setCrop({
      ...start.crop,
      x: clamp(start.crop.x + (event.clientX - start.startX) / width, -0.5, 0.5),
      y: clamp(start.crop.y + (event.clientY - start.startY) / height, -0.5, 0.5),
    });
  };

  const endDrag = (event) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const zoom = (event) => {
    if (!isSelectedImage || working) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setCrop((current) => ({ ...current, scale: clamp(current.scale + delta, 1, 3) }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file || working) return;
    setPreparing(true);
    setLocalError("");
    try {
      const uploadFile = isSelectedImage ? await cropImageFile(file, previewUrl, crop) : file;
      onUpload({ caption, file: uploadFile });
    } catch (error) {
      setLocalError(error.message || "Could not prepare Media.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div aria-modal="true" className="profile-media-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} role="dialog">
      <form className="profile-media-sheet" onSubmit={submit}>
        <span className="profile-share-handle" />
        <div className="profile-media-sheet-head">
          <div>
            <h2>{isSelectedVideo ? "Video — choose what shows" : "Photo — choose what shows"}</h2>
            <p>{isSelectedImage ? "Drag with a finger, pinch to zoom — the frame is what people will see" : file ? "Preview the video before it becomes permanent on your profile" : "Choose a photo or short video for your permanent Media"}</p>
          </div>
          <button aria-label="Close Add Media" disabled={working} onClick={onClose} type="button"><FiX /></button>
        </div>
        <input accept={accept} className="sr-only" disabled={working} onChange={selectFile} ref={inputRef} type="file" />
        {!file ? (
          <div className="profile-media-picker-actions">
            <button disabled={working} onClick={() => choose(IMAGE_ACCEPT)} type="button"><FiImage /><span>Photo</span></button>
            <button disabled={working} onClick={() => choose(VIDEO_ACCEPT)} type="button"><FiVideo /><span>Video</span></button>
          </div>
        ) : null}
        {file ? (
          <div className={isSelectedImage ? "profile-media-crop-stage" : "profile-media-video-stage"}>
            {isSelectedImage ? (
              <div
                aria-label="Reposition selected photo"
                className="profile-media-crop-frame"
                onPointerCancel={endDrag}
                onPointerDown={beginDrag}
                onPointerMove={drag}
                onPointerUp={endDrag}
                onWheel={zoom}
                role="img"
              >
                <img
                  alt="Selected Media preview"
                  draggable="false"
                  src={previewUrl}
                  style={{ transform: `translate(${crop.x * 100}%, ${crop.y * 100}%) scale(${crop.scale})` }}
                />
              </div>
            ) : (
              <video controls playsInline preload="metadata" src={previewUrl} />
            )}
          </div>
        ) : null}
        {file ? <button className="profile-media-change-file" disabled={working} onClick={() => choose(ALL_ACCEPT)} type="button">Choose another</button> : null}
        {localError ? <p className="profile-media-notice is-error" role="alert">{localError}</p> : null}
        <input aria-label="Media caption" className="profile-media-caption sr-only" disabled={working} maxLength={160} onChange={(event) => setCaption(event.target.value)} value={caption} />
        <button className="profile-media-submit" disabled={!file || working} type="submit">
          {working ? <FiRefreshCw className="animate-spin" /> : null}
          {preparing ? "Preparing..." : status === "saving" ? "Saving..." : status === "uploading" ? "Uploading..." : "Done"}
        </button>
      </form>
    </div>
  );
}

function ProfileMediaViewer({ active, isOwner, items, onClose, onPatchActive, onRemove, onSelect, queryKey, username }) {
  const queryClient = useQueryClient();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const likeMutation = useMutation({
    mutationFn: (item) => profileService.toggleProfileMediaLike(username, item.id).then((response) => response.data.data),
    onSuccess: (result, item) => {
      const apply = (current) => {
        if (!current?.media) return current;
        return {
          ...current,
          media: current.media.map((entry) => entry.id === item.id ? { ...entry, likeCount: result.likeCount, viewerLiked: result.liked } : entry),
        };
      };
      onPatchActive?.((current) => current?.id === item.id ? { ...current, likeCount: result.likeCount, viewerLiked: result.liked } : current);
      queryClient.setQueryData(queryKey, apply);
      queryClient.setQueriesData({ queryKey: ["profile-media"] }, apply);
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
    },
    onError: (error) => setNotice(error.response?.data?.message || "Could not update like."),
  });
  const reportMutation = useMutation({
    mutationFn: (item) => profileService.reportProfileMedia(username, item.id, { reason: "OTHER" }),
    onSuccess: () => {
      setOptionsOpen(false);
      setNotice("Report received.");
    },
    onError: (error) => setNotice(error.response?.data?.message || "Could not report Media."),
  });
  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        const index = items.findIndex((item) => item.id === active.id);
        if (index > 0) onSelect(items[index - 1]);
      }
      if (event.key === "ArrowRight") {
        const index = items.findIndex((item) => item.id === active.id);
        if (index >= 0 && index < items.length - 1) onSelect(items[index + 1]);
      }
    };
    document.body.classList.add("profile-media-lock");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("profile-media-lock");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, items, onClose, onSelect]);

  useEffect(() => {
    setOptionsOpen(false);
    setNotice("");
  }, [active?.id]);

  if (!active) return null;
  const index = items.findIndex((item) => item.id === active.id);
  const src = mediaSrc(active);
  const video = isVideo(active);
  const share = async () => {
    const url = typeof window === "undefined" ? src : `${window.location.origin}/profile/${encodeURIComponent(username || "")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Profile Media", url });
      else await navigator.clipboard?.writeText(url);
      setOptionsOpen(false);
      setNotice("Share link copied.");
    } catch {
      setNotice("Share cancelled.");
    }
  };
  const report = () => {
    if (!active || reportMutation.isPending) return;
    if (!window.confirm(`Report this ${video ? "video" : "photo"}?\n\nA human reviewer will look at it.`)) return;
    reportMutation.mutate(active);
  };
  return (
    <div aria-modal="true" className="profile-media-viewer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog">
      <button aria-label="Close Media viewer" className="profile-media-viewer-close" onClick={onClose} type="button"><FiX /></button>
      <button aria-expanded={optionsOpen} aria-label="Open Media options" className="profile-media-viewer-more" onClick={() => setOptionsOpen((value) => !value)} type="button"><FiMoreHorizontal /></button>
      {items.length > 1 && index > 0 ? <button aria-label="Previous Media item" className="profile-media-viewer-nav is-prev" onClick={() => onSelect(items[index - 1])} type="button">‹</button> : null}
      {video ? (
        <video className="profile-media-viewer-video" controls playsInline preload="metadata" src={src} />
      ) : (
        <img alt={active.caption || "Profile Media"} className="profile-media-viewer-image" src={src} />
      )}
      {items.length > 1 && index < items.length - 1 ? <button aria-label="Next Media item" className="profile-media-viewer-nav is-next" onClick={() => onSelect(items[index + 1])} type="button">›</button> : null}
      <button
        aria-label={active.viewerLiked ? "Unlike Media" : "Like Media"}
        aria-pressed={Boolean(active.viewerLiked)}
        className={active.viewerLiked ? "profile-media-viewer-like is-liked" : "profile-media-viewer-like"}
        disabled={likeMutation.isPending || !username}
        onClick={() => likeMutation.mutate(active)}
        type="button"
      >
        <FiHeart fill={active.viewerLiked ? "currentColor" : "none"} />
        {active.likeCount ? <span>{active.likeCount}</span> : null}
      </button>
      {optionsOpen ? (
        <div className="profile-media-options">
          <button onClick={share} type="button"><FiSend /> Share</button>
          {isOwner ? (
            <button className="is-danger" onClick={() => { setOptionsOpen(false); onRemove(active); }} type="button"><FiTrash2 /> Delete {video ? "video" : "photo"}</button>
          ) : (
            <button className="is-danger" disabled={reportMutation.isPending} onClick={report} type="button"><FiFlag /> {reportMutation.isPending ? "Reporting..." : `Report ${video ? "video" : "photo"}`}</button>
          )}
        </div>
      ) : null}
      {notice ? <p className="profile-media-viewer-notice" role="status">{notice}</p> : null}
      <div className="profile-media-viewer-footer">
        {active.caption ? <p>{active.caption}</p> : <span />}
      </div>
    </div>
  );
}

function ProfileMediaGallery({ isOpen, isOwner, items, onClose, onOpen, onRemove }) {
  if (!isOpen) return null;
  return (
    <div aria-modal="true" className="profile-media-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog">
      <section className="profile-media-sheet profile-media-gallery-sheet">
        <span className="profile-share-handle" />
        <div className="profile-media-sheet-head">
          <h2>Media</h2>
          <button aria-label="Close Media gallery" onClick={onClose} type="button"><FiX /></button>
        </div>
        <div className="profile-media-gallery-grid">
          {items.map((item) => <ProfileMediaTile isOwner={isOwner} item={item} key={item.id} onOpen={onOpen} onRemove={onRemove} />)}
        </div>
      </section>
    </div>
  );
}

export default function ProfileMediaSection({ initialMedia = [], isOwner, username }) {
  const queryClient = useQueryClient();
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState("");
  const queryKey = useMemo(() => ["profile-media", isOwner ? "me" : username], [isOwner, username]);
  const mediaQuery = useQuery({
    enabled: isOwner || Boolean(username),
    initialData: { media: initialMedia || [] },
    queryFn: () => (isOwner ? profileService.getOwnMedia() : profileService.getProfileMedia(username)).then((response) => response.data.data),
    queryKey,
    retry: false,
  });
  const items = mediaQuery.data?.media || [];
  const previewLimit = isOwner ? OWNER_PREVIEW_LIMIT : PREVIEW_LIMIT;
  const previewItems = items.slice(0, previewLimit);
  const hasOverflow = items.length > previewLimit;
  const uploadMutation = useMutation({
    mutationFn: ({ caption, file }) => profileService.addProfileMedia(file, caption).then((response) => response.data.data.media),
    onMutate: () => setNotice("Uploading..."),
    onSuccess: async () => {
      setNotice("Media added.");
      setUploaderOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
    },
    onError: (error) => setNotice(error.response?.data?.message || "Could not add Media."),
  });
  const removeMutation = useMutation({
    mutationFn: (item) => profileService.removeProfileMedia(item.id),
    onSuccess: async (_response, item) => {
      setNotice("Removed from Media.");
      if (active?.id === item.id) setActive(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
    },
    onError: (error) => setNotice(error.response?.data?.message || "Could not remove Media."),
  });

  const remove = (item) => {
    if (!window.confirm(`Remove from Media?\n\nThis ${isVideo(item) ? "video" : "photo"} will no longer appear in your profile Media.`)) return;
    removeMutation.mutate(item);
  };

  if (!items.length && !isOwner && !mediaQuery.isLoading && !mediaQuery.isError) return null;

  return (
    <section className="profile-section profile-photos-section profile-media-section">
      <div className="profile-media-heading">
        <h2>Photos</h2>
        <span>
          {hasOverflow ? <button className="profile-media-see-all" onClick={() => setGalleryOpen(true)} type="button">See all</button> : null}
        </span>
      </div>
      {mediaQuery.isLoading ? <LoadingSkeleton className="h-[108px]" count={1} /> : null}
      {mediaQuery.isError ? <p className="profile-media-state">Media could not load. <button onClick={() => mediaQuery.refetch()} type="button">Retry</button></p> : null}
      {!mediaQuery.isLoading && !mediaQuery.isError && (items.length || isOwner) ? (
        <div className="profile-photo-row">
          {previewItems.map((item) => <ProfileMediaTile isOwner={isOwner} item={item} key={item.id} onOpen={setActive} onRemove={remove} />)}
          {isOwner ? <button aria-label="Add Media" className="profile-photo-add profile-media-inline-add" onClick={() => setUploaderOpen(true)} type="button"><FiPlus /></button> : null}
          {hasOverflow ? <button className="profile-photo-add profile-media-overflow" onClick={() => setGalleryOpen(true)} type="button">+{items.length - previewLimit}</button> : null}
        </div>
      ) : null}
      {notice ? <p className="profile-media-notice" role="status">{notice}</p> : null}
      <ProfileMediaUploader isOpen={uploaderOpen} onClose={() => setUploaderOpen(false)} onUpload={(payload) => uploadMutation.mutate(payload)} status={uploadMutation.isPending ? "uploading" : ""} />
      <ProfileMediaGallery isOpen={galleryOpen} isOwner={isOwner} items={items} onClose={() => setGalleryOpen(false)} onOpen={setActive} onRemove={remove} />
      <ProfileMediaViewer active={active} isOwner={isOwner} items={items} onClose={() => setActive(null)} onPatchActive={setActive} onRemove={remove} onSelect={setActive} queryKey={queryKey} username={username} />
    </section>
  );
}
