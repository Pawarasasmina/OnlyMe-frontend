import { useEffect, useMemo, useRef, useState } from "react";
import { FiMapPin, FiMic, FiPlus, FiX } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { useWallStories } from "../../../hooks/useStories";
import { useCreateFeedPost } from "../../../hooks/useFeedPosts";
import { canCreateFeedPost } from "../../../utils/postPermissions";
import {
  POST_CONTEXTS,
  POST_IMAGE_TYPES,
  POST_MAX_IMAGE_SIZE,
  POST_MAX_IMAGES,
  POST_TEXT_MAX_LENGTH,
} from "../../../data/postOptions";
import StatusPicker from "../../stories/StatusPicker";
import ProfileImageCropper from "../../profile/ProfileImageCropper";

const noteContextOptions = [
  { icon: "⚡", label: "Right now", value: "Right now" },
  { icon: "☕", label: "Coffee", value: "Coffee" },
  { icon: "SOS", label: "Need help", value: "Need help" },
  { icon: "📍", label: "Place", value: "" },
  { icon: "🍽️", label: "Restaurant", value: "Restaurant" },
  { icon: "📚", label: "Book", value: "Book" },
  { icon: "🎬", label: "Movie", value: "Things to do" },
  { icon: "✈️", label: "Travel", value: "Travel" },
  { icon: "💼", label: "Business", value: "Business" },
  { icon: "💪", label: "Fitness", value: "Fitness" },
  { icon: "🌿", label: "Wellness", value: "Other" },
  { icon: "✨", label: "Lifestyle", value: "Other" },
  { icon: "💄", label: "Beauty", value: "Other" },
];

function fileError(file) {
  if (!POST_IMAGE_TYPES.includes(file.type)) return "Only JPEG, PNG, or WebP images are allowed.";
  if (file.size > POST_MAX_IMAGE_SIZE) return "Images must be 15 MB or smaller.";
  return "";
}

function previewFile(file) {
  return {
    file,
    id: `${file.name}-${file.size}-${file.lastModified}`,
    url: URL.createObjectURL(file),
  };
}

function PostComposer({ currentUser, onStatusChange, onComposeOpened, openSignal = "", status }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const textRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesRef = useRef([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedContext, setSelectedContext] = useState(noteContextOptions[0]);
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [cropQueue, setCropQueue] = useState([]);
  const canPostToHome = canCreateFeedPost(user);
  const viewerId = user?.id || user?._id;
  const wallStoriesQuery = useWallStories({ fallbackUser: { ...currentUser, ...user }, viewerId });
  const createMutation = useCreateFeedPost();
  const activeStatus = wallStoriesQuery.data?.viewer?.activeStatus || user?.activeStatus || null;
  const trimmedText = text.trim();
  const validContextValue = POST_CONTEXTS.includes(selectedContext?.value) ? selectedContext.value : "";
  const canPublish = canPostToHome && trimmedText.length > 0 && trimmedText.length <= POST_TEXT_MAX_LENGTH && !createMutation.isPending;
  const hasDraft = Boolean(trimmedText || location.trim() || files.length);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => {
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  useEffect(() => {
    if (!openSignal) return;
    setComposerOpen(true);
    onComposeOpened?.();
    window.setTimeout(() => textRef.current?.focus(), 80);
  }, [onComposeOpened, openSignal]);

  const resetComposer = () => {
    files.forEach((item) => URL.revokeObjectURL(item.url));
    setText("");
    setSelectedContext(noteContextOptions[0]);
    setLocation("");
    setFiles([]);
    setError("");
    setUploadLabel("");
  };

  const openComposer = () => {
    if (!canPostToHome) {
      showToast("Home note creation is only available for creator accounts.");
      return;
    }
    setComposerOpen(true);
    window.setTimeout(() => textRef.current?.focus(), 60);
  };

  const closeComposer = () => {
    resetComposer();
    setComposerOpen(false);
  };

  const addFiles = (incoming) => {
    const next = [...incoming];
    const remaining = POST_MAX_IMAGES - files.length;
    const accepted = [];
    let nextError = "";

    next.slice(0, remaining).forEach((file) => {
      const problem = fileError(file);
      if (problem) nextError = problem;
      else accepted.push({ file, url: URL.createObjectURL(file) });
    });

    if (next.length > remaining) nextError = `You can attach up to ${POST_MAX_IMAGES} images.`;
    setError(nextError);
    if (accepted.length) setCropQueue((current) => [...current, ...accepted]);
  };

  const finishCrop = (file) => {
    const [current] = cropQueue;
    if (current?.url) URL.revokeObjectURL(current.url);
    setFiles((items) => [...items, previewFile(file)]);
    setCropQueue((items) => items.slice(1));
  };

  const skipCrop = () => {
    const [current] = cropQueue;
    if (current?.url) URL.revokeObjectURL(current.url);
    setCropQueue((items) => items.slice(1));
  };

  const removeFile = (id) => {
    setFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const publish = () => {
    if (!canPublish) {
      setError(trimmedText ? "This note is too long." : "Write something before publishing.");
      return;
    }

    const formData = new FormData();
    formData.append("text", trimmedText);
    formData.append("context", validContextValue);
    formData.append("location", location.trim());
    files.forEach((item) => formData.append("media", item.file));
    setError("");
    setUploadLabel("Publishing");

    createMutation.mutate(
      {
        formData,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.max(8, Math.round((event.loaded / event.total) * 90));
          setUploadLabel(percent < 90 ? `Uploading ${percent}%` : "Publishing");
        },
      },
      {
        onError: (mutationError) => {
          setUploadLabel("");
          setError(mutationError?.response?.data?.message || "Could not publish this note.");
        },
        onSuccess: () => {
          showToast("Note published.");
          resetComposer();
          setComposerOpen(false);
        },
      }
    );
  };

  const suggestedLocation = useMemo(() => currentUser?.location || user?.city || user?.location?.city || "", [currentUser?.location, user?.city, user?.location?.city]);
  const locationLabel = location.trim() || suggestedLocation || "Location";

  return (
    <>
      {cropQueue[0] ? <ProfileImageCropper kind="feed" onCancel={skipCrop} onSave={finishCrop} source={cropQueue[0].url} /> : null}
      {composerOpen ? (
        <section
          aria-label="Create a wall note"
          className="home-note-composer"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files || []);
          }}
        >
          <textarea
            aria-label="Note text"
            maxLength={POST_TEXT_MAX_LENGTH}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            placeholder="Share what you've seen..."
            ref={textRef}
            value={text}
          />
          <div className="home-note-chip-row" aria-label="Note context">
            {noteContextOptions.map((option) => (
              <button
                aria-pressed={selectedContext.label === option.label}
                className={selectedContext.label === option.label ? "is-selected" : ""}
                key={option.label}
                onClick={() => setSelectedContext(option)}
                type="button"
              >
                <span aria-hidden="true">{option.icon}</span>{option.label}
              </button>
            ))}
          </div>

          {files.length ? (
            <div className="home-note-preview-grid">
              {files.map((item) => (
                <span key={item.id}>
                  <img alt="" src={item.url} />
                  <button aria-label="Remove image" onClick={() => removeFile(item.id)} type="button"><FiX /></button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="home-note-footer">
            <div className="home-note-tools">
              <button aria-label="Attach image" onClick={() => fileInputRef.current?.click()} type="button"><FiPlus /></button>
              <button aria-label="Record voice note" onClick={() => showToast("Voice notes for wall posts are coming soon.")} type="button"><FiMic /></button>
              <button
                className="home-note-location"
                onClick={() => {
                  if (location) setLocation("");
                  else if (suggestedLocation) setLocation(suggestedLocation);
                  else showToast("Add a city on your profile to tag location.");
                }}
                type="button"
              >
                <FiMapPin />{locationLabel}
              </button>
              <input accept={POST_IMAGE_TYPES.join(",")} className="sr-only" multiple onChange={(event) => addFiles(event.target.files || [])} ref={fileInputRef} type="file" />
            </div>
            <div className="home-note-actions">
              {error ? <span role="status">{error}</span> : uploadLabel ? <span role="status">{uploadLabel}</span> : hasDraft ? <small>{text.length}/{POST_TEXT_MAX_LENGTH}</small> : null}
              <button disabled={createMutation.isPending} onClick={closeComposer} type="button">Cancel</button>
              <button disabled={!canPublish} onClick={publish} type="button">{createMutation.isPending ? "Publishing" : "Publish"}</button>
            </div>
          </div>
        </section>
      ) : (
        <div className="home-composer-trigger">
          <button
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={openComposer}
            type="button"
          >
            <FanAvatar name={currentUser.name} size="h-[34px] w-[34px]" src={currentUser.avatar} />
            <span className="truncate">Share what you&apos;ve seen...</span>
          </button>
          <button
            aria-label={activeStatus ? `Change status badge, currently ${activeStatus.label}` : "Set status badge"}
            className={`home-composer-status ${activeStatus ? "" : "is-empty"}`}
            onClick={() => setStatusOpen(true)}
            type="button"
          >
            {activeStatus?.emoji ? <span aria-hidden="true">{activeStatus.emoji}</span> : null}
            {activeStatus?.label || status || "Set status"}
          </button>
        </div>
      )}

      <StatusPicker
        activeStatus={activeStatus}
        isOpen={statusOpen}
        onClose={() => setStatusOpen(false)}
        onStatusChange={(nextStatusLabel) => {
          onStatusChange?.(nextStatusLabel);
          wallStoriesQuery.refetch();
        }}
      />
    </>
  );
}

export default PostComposer;
