import { transcriptAlreadyShown } from "../../../utils/wallVoiceDisplay";
import { canLookupLocation, geolocationErrorMessage } from "../../../utils/locationLookup";
import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiMic, FiNavigation, FiImage, FiSearch, FiTrash2, FiX, FiArrowLeft, FiChevronRight, FiTag, FiGrid, FiGlobe, FiCheck, FiLink, FiBriefcase, FiHelpCircle, FiCalendar, FiHeart, FiCompass, FiShoppingBag, FiCoffee, FiBookOpen, FiUsers, FiStar, FiZap } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { useCreateFeedPost } from "../../../hooks/useFeedPosts";
import { canCreateFeedPost } from "../../../utils/postPermissions";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import WallVoiceRecorder from "../../voice/WallVoiceRecorder";
import { formatVoiceTime } from "../../../hooks/useVoiceRecorder";
import {
  POST_IMAGE_TYPES,
  POST_MAX_IMAGE_SIZE,
  POST_MAX_IMAGES,
  POST_TEXT_MAX_LENGTH,
} from "../../../data/postOptions";
import ProfileImageCropper from "../../profile/ProfileImageCropper";
import { searchService } from "../../../services/searchService";

const POST_TYPES = [
  { value: "Looking for", context: "Looking for", icon: FiLink, color: "blue", description: "Find people, places or recommendations" },
  { value: "Offering", context: "Buy/Sell", icon: FiBriefcase, color: "amber", description: "Share what you offer: services, items or help" },
  { value: "Need Help", context: "Need help", icon: FiHeart, color: "rose", description: "Ask your community for a helping hand" },
  { value: "Question", context: "Advice", icon: FiHelpCircle, color: "purple", description: "Get advice from the community" },
  { value: "Recommendation", context: "Recommendation", icon: FiStar, color: "green", description: "Recommend a place, service or person" },
  { value: "Right Now", context: "Right now", icon: FiZap, color: "amber", description: "Share something useful happening nearby" },
  { value: "Event", context: "Events", icon: FiCalendar, color: "rose", description: "Create or share a community event" },
];
const POST_TOPICS = [
  { value: "Buy / Sell", icon: FiShoppingBag, color: "rose" },
  { value: "Places", icon: FiMapPin, color: "blue" },
  { value: "Food", icon: FiCoffee, color: "amber" },
  { value: "Travel", icon: FiCompass, color: "blue" },
  { value: "Work", icon: FiBriefcase, color: "amber" },
  { value: "Wellness", icon: FiHeart, color: "green" },
  { value: "Learning", icon: FiBookOpen, color: "purple" },
  { value: "Lifestyle", icon: FiStar, color: "amber" },
  { value: "Services", icon: FiTag, color: "blue" },
  { value: "Community", icon: FiUsers, color: "blue" },
];

function LocationPicker({ onClose, onSelect, selected }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [position, setPosition] = useState(null);
  const [positioning, setPositioning] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const query = search.trim();
    if (!canLookupLocation(query, position)) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setSearchError("");
      searchService.searchLocations({
        q: query,
        language: navigator.language || "en",
        latitude: position?.latitude,
        longitude: position?.longitude,
      }, controller.signal)
        .then(setResults)
        .catch((error) => {
          if (error?.code !== "ERR_CANCELED") {
            setResults([]);
            setSearchError(error?.response?.data?.message || "Could not search locations. Try again.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [position, search]);

  const useCurrentArea = () => {
    if (!navigator.geolocation) {
      setSearchError("Location access is not supported by this browser.");
      return;
    }
    setResults([]);
    setPositioning(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setSearch("");
        setLoading(true);
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setPositioning(false);
        inputRef.current?.focus();
      },
      (error) => {
        setPositioning(false);
        setSearchError(geolocationErrorMessage(error));
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    );
  };

  return (
    <div className="home-note-location-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-label="Choose a location" aria-modal="true" className="home-note-location-sheet" role="dialog">
        <div className="home-note-location-handle" aria-hidden="true" />
        <header><h2>Location</h2><button aria-label="Close location picker" onClick={onClose} type="button"><FiX /></button></header>
        <label className="home-note-location-search">
          <FiSearch aria-hidden="true" />
          <span className="sr-only">Search a country or city</span>
          <input onChange={(event) => setSearch(event.target.value)} placeholder="Search a country or city" ref={inputRef} value={search} />
        </label>
        <button className={`home-note-location-nearby ${position ? "is-active" : ""}`} disabled={positioning || (loading && !search.trim())} onClick={useCurrentArea} type="button">
          <FiNavigation aria-hidden="true" />{positioning || (loading && !search.trim()) ? "Finding your area..." : position ? "Refresh current area" : "Use my current area"}
        </button>
        {selected ? <button className="home-note-location-clear" onClick={() => { onSelect(""); onClose(); }} type="button">Remove location</button> : null}
        <div className="home-note-location-results">
          {loading ? <p aria-live="polite">Searching locations…</p> : null}
          {!loading && searchError ? <p role="alert">{searchError}</p> : null}
          {!positioning && !loading && !searchError && !position && search.trim().length < 2 ? <p>Type at least 2 letters to find any city, country, address, landmark, or venue.</p> : null}
          {!loading && results.map((item) => (
            <button aria-pressed={selected === item.label} className={selected === item.label ? "is-selected" : ""} key={item.code + item.label} onClick={() => { onSelect(item.label); onClose(); }} type="button">
              <span>{item.code || <FiMapPin aria-hidden="true" />}</span><span className="home-note-location-result-copy"><strong>{item.name}</strong>{item.subtitle ? <small>{item.subtitle}</small> : null}</span>
            </button>
          ))}
          {!positioning && !loading && !searchError && canLookupLocation(search, position) && !results.length ? <p>No locations found.</p> : null}
        </div>
      </section>
    </div>
  );
}

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

function PostComposer({ currentUser, onComposeOpened, openSignal = "" }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const textRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesRef = useRef([]);
  const voiceAttachmentRef = useRef(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedType, setSelectedType] = useState(POST_TYPES[0]);
  const [topic, setTopic] = useState("");
  const [screen, setScreen] = useState("compose");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState([]);
  const [voiceAttachment, setVoiceAttachment] = useState(null);
  const [error, setError] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [cropQueue, setCropQueue] = useState([]);
  const canPostToHome = canCreateFeedPost(user);
  const createMutation = useCreateFeedPost();
  const trimmedText = text.trim();
  const validContextValue = selectedType.context;
  const canPublish = canPostToHome && (trimmedText.length > 0 || voiceAttachment) && trimmedText.length <= POST_TEXT_MAX_LENGTH && !createMutation.isPending;
  const hasDraft = Boolean(trimmedText || location.trim() || files.length || voiceAttachment);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    voiceAttachmentRef.current = voiceAttachment;
  }, [voiceAttachment]);

  useEffect(() => () => {
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    if (voiceAttachmentRef.current?.url) URL.revokeObjectURL(voiceAttachmentRef.current.url);
  }, []);

  useEffect(() => {
    if (!openSignal) return;
    setComposerOpen(true);
    onComposeOpened?.();
    window.setTimeout(() => textRef.current?.focus(), 80);
  }, [onComposeOpened, openSignal]);

  useEffect(() => {
    if (!composerOpen) return;
    const center = textRef.current?.closest(".social-center-scroll");
    center?.scrollTo({ top: 0 });
    if (window.innerWidth <= 880) window.scrollTo({ top: 0 });
  }, [composerOpen]);

  const resetComposer = () => {
    files.forEach((item) => URL.revokeObjectURL(item.url));
    if (voiceAttachment?.url) URL.revokeObjectURL(voiceAttachment.url);
    setText("");
    setSelectedType(POST_TYPES[0]);
    setTopic("");
    setScreen("compose");
    setLocation("");
    setFiles([]);
    setVoiceAttachment(null);
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
    setLocationPickerOpen(false);
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

  const attachVoiceNote = (recording) => {
    if (!recording?.file) return;
    if (voiceAttachment?.url) URL.revokeObjectURL(voiceAttachment.url);
    const url = URL.createObjectURL(recording.file);
    setVoiceAttachment({
      ...recording,
      id: `${recording.file.name}-${recording.file.size}-${recording.file.lastModified}`,
      url,
    });
    setError("");
  };

  const removeVoiceNote = () => {
    setVoiceAttachment((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const publish = () => {
    if (!canPublish) {
      setError(trimmedText ? "This note is too long." : "Write something or attach a voice note before publishing.");
      return;
    }

    const formData = new FormData();
    formData.append("text", trimmedText);
    formData.append("context", validContextValue);
    formData.append("postType", selectedType.value);
    formData.append("topic", topic);
    formData.append("location", location.trim());
    formData.append("entityRefs", "[]");
    files.forEach((item) => formData.append("media", item.file));
    if (voiceAttachment?.file) {
      formData.append("voice", voiceAttachment.file);
      formData.append("voiceDuration", String(voiceAttachment.duration || ""));
      formData.append("voiceTranscript", voiceAttachment.transcript || "");
      formData.append("voiceTranscriptLanguage", voiceAttachment.transcriptLanguage || "");
      formData.append("voiceTranslations", JSON.stringify(voiceAttachment.translations || []));
      formData.append("voiceWaveform", JSON.stringify(voiceAttachment.waveform || []));
    }
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


  return (
    <div className={`wall-composer-host ${composerOpen ? "is-open" : ""}`}>
      {cropQueue[0] ? <ProfileImageCropper kind="feed" onCancel={skipCrop} onSave={finishCrop} source={cropQueue[0].url} /> : null}
      {composerOpen ? (
        <section
          aria-label="Create a wall note"
          className="home-note-composer wall-create-screen"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files || []);
          }}
        >
          <header className="wall-create-header">
            {screen !== "compose" ? <button aria-label="Back to post" onClick={() => setScreen("compose")} type="button"><FiArrowLeft /></button> : null}
            <h1>{screen === "type" ? "Select type" : screen === "topic" ? "Select topic" : screen === "visibility" ? "Visibility" : "Create a post"}</h1>
            {screen === "compose" ? <button aria-label="Close create post" disabled={createMutation.isPending} onClick={closeComposer} type="button"><FiX /></button> : null}
          </header>
          {screen === "type" || screen === "topic" ? (
            <div className={`wall-create-options ${screen === "type" ? "is-types" : ""}`} aria-label={screen === "type" ? "Post type" : "Post topic"}>
              {(screen === "type" ? POST_TYPES : POST_TOPICS).map(({ value, description, icon: Icon, color }) => {
                const selected = screen === "type" ? selectedType.value === value : topic === value;
                return <button aria-pressed={selected} className={selected ? "is-selected" : ""} key={value} onClick={() => { if (screen === "type") setSelectedType(POST_TYPES.find((item) => item.value === value)); else setTopic(value); setScreen("compose"); }} type="button">
                  <span className={`wall-create-option-icon is-${color}`}><Icon /></span>
                  <span className="wall-create-option-copy"><strong>{value}</strong>{description ? <small>{description}</small> : null}</span>
                  <span className={`wall-create-radio ${selected ? "is-selected" : ""}`}>{selected ? <FiCheck /> : null}</span>
                </button>;
              })}
            </div>
          ) : screen === "visibility" ? (
            <div className="wall-create-options"><button aria-pressed="true" onClick={() => setScreen("compose")} type="button"><span className="wall-create-option-icon is-blue"><FiGlobe /></span><span className="wall-create-option-copy"><strong>Public</strong><small>Visible to the community on Wall</small></span><span className="wall-create-radio is-selected"><FiCheck /></span></button></div>
          ) : <div className="wall-create-body">
          <textarea
            aria-label="Note text"
            maxLength={POST_TEXT_MAX_LENGTH}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            placeholder="What do you want to share?"
            ref={textRef}
            value={text}
          />
          <div className="wall-create-attachments home-note-tools">
            <button aria-label="Attach image" onClick={() => fileInputRef.current?.click()} type="button"><FiImage /></button>
            <button aria-label={voiceAttachment ? "Replace voice note" : "Record voice note"} className={voiceAttachment ? "is-selected" : ""} onClick={() => setVoiceRecorderOpen(true)} type="button"><FiMic /></button>
            <input accept={POST_IMAGE_TYPES.join(",")} className="sr-only" multiple onChange={(event) => { addFiles(event.target.files || []); event.target.value = ""; }} ref={fileInputRef} type="file" />
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

          {voiceAttachment ? (
            <div className="home-note-voice-card">
              <div className="home-note-voice-meta">
                <span><FiMic aria-hidden="true" /></span>
                <div>
                  <strong>Voice note</strong>
                  <small>{formatVoiceTime(voiceAttachment.duration)}</small>
                </div>
              </div>
              <VoiceMessageBubble audio={{ duration: voiceAttachment.duration, url: voiceAttachment.url, waveform: voiceAttachment.waveform }} label="Voice note" />
              {voiceAttachment.transcript && !transcriptAlreadyShown(text, voiceAttachment.transcript) ? <div className="wall-composer-voice-text"><details className="wall-composer-transcript"><summary>View transcript</summary><p dir="auto">{voiceAttachment.transcript}</p></details><button className="wall-transcript-toggle" onClick={() => setText((current) => [current.trim(), voiceAttachment.transcript.trim()].filter(Boolean).join("\n\n").slice(0, POST_TEXT_MAX_LENGTH))} type="button">Use as post text</button></div> : null}
              <button aria-label="Remove voice note" onClick={removeVoiceNote} type="button"><FiTrash2 /></button>
            </div>
          ) : null}

          <div className="wall-create-fields">
            <button onClick={() => setScreen("type")} type="button"><FiTag /><span>Type</span><strong>{selectedType.value}</strong><FiChevronRight /></button>
            <button onClick={() => setScreen("topic")} type="button"><FiGrid /><span>Topic</span><strong className={!topic ? "is-placeholder" : ""}>{topic || "Choose"}</strong><FiChevronRight /></button>
            <button onClick={() => setLocationPickerOpen(true)} type="button"><FiMapPin /><span>Location</span><strong className={!location ? "is-placeholder" : ""}>{location || "Choose location"}</strong><FiChevronRight /></button>
            <button onClick={() => setScreen("visibility")} type="button"><FiGlobe /><span>Visibility</span><strong>Public</strong><FiChevronRight /></button>
          </div>
          <div className="wall-create-submit">
            {error ? <p role="alert">{error}</p> : uploadLabel ? <p role="status">{uploadLabel}</p> : hasDraft ? <small>{text.length}/{POST_TEXT_MAX_LENGTH}</small> : null}
            <button disabled={!canPublish} onClick={publish} type="button">{createMutation.isPending ? "Posting..." : "Post"}</button>
          </div>
          </div>}
        </section>
      ) : (
        <div className="home-composer-trigger">
          <button
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={openComposer}
            type="button"
          >
            <FanAvatar name={currentUser.name} size="h-[34px] w-[34px]" src={currentUser.avatar} />
            <span className="truncate">Ask, offer, or share with your community...</span>
          </button>
        </div>
      )}
      {locationPickerOpen ? <LocationPicker onClose={() => setLocationPickerOpen(false)} onSelect={setLocation} selected={location} /> : null}
      <WallVoiceRecorder isOpen={voiceRecorderOpen} onClose={() => setVoiceRecorderOpen(false)} onUse={attachVoiceNote} />
    </div>
  );
}

export default PostComposer;
