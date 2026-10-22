import { voiceService } from "../../../services/voiceService";
import { inferWallTopic as autoTopic } from "../../../utils/wallTopic";
import { readWallDraft, saveWallDraft, clearWallDraft } from "../../../services/wallDraftStore";
import WallSheetFrame from "./WallSheetFrame";
import WallTopicSheet from "./WallTopicSheet";
import WallNeedPicker from "./WallNeedPicker";
import { canLookupLocation, geolocationErrorMessage } from "../../../utils/locationLookup";
import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiMic, FiNavigation, FiImage, FiSearch, FiMoreHorizontal, FiX, FiArrowLeft, FiLink, FiBriefcase, FiHelpCircle, FiCalendar, FiHeart, FiShoppingBag, FiStar, FiZap } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import { useFanToast } from "../shared/FanToastContext";
import { useAuth } from "../../../hooks/useAuth";
import { useCreateFeedPost } from "../../../hooks/useFeedPosts";
import { canCreateFeedPost } from "../../../utils/postPermissions";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import WallVoiceRecorder from "../../voice/WallVoiceRecorder";
import {
  POST_IMAGE_TYPES,
  POST_MAX_IMAGE_SIZE,
  POST_TEXT_MAX_LENGTH,
} from "../../../data/postOptions";
import ProfileImageCropper from "../../profile/ProfileImageCropper";
import { searchService } from "../../../services/searchService";

const POST_TYPES = [
  { value: "Buy & Sell", context: "Buy/Sell", icon: FiShoppingBag, color: "blue", description: "Sell or find something second-hand" },
  { value: "Looking for", context: "Looking for", icon: FiLink, color: "blue", description: "Find people, places or recommendations" },
  { value: "Offering", context: "Buy/Sell", icon: FiBriefcase, color: "amber", description: "Share what you offer: services, items or help" },
  { value: "Need Help", context: "Need help", icon: FiHeart, color: "rose", description: "Ask your community for a helping hand" },
  { value: "Question", context: "Advice", icon: FiHelpCircle, color: "purple", description: "Get advice from the community" },
  { value: "Recommendation", context: "Recommendation", icon: FiStar, color: "green", description: "Recommend a place, service or person" },
  { value: "Right Now", context: "Right now", icon: FiZap, color: "amber", description: "Share something useful happening nearby" },
  { value: "Event", context: "Events", icon: FiCalendar, color: "rose", description: "Create or share a community event" },
];
const NEED_PLACEHOLDERS = {
  "Need Help": "What happened — and how can people help?",
  "Looking for": "What are you looking for? What, where, when",
  Offering: "What are you offering? Price, condition, where",
  Question: "Ask it — the more detail, the better the answers",
  Recommendation: "What do you recommend — and why?",
  Event: "What, where, when — and who should come",
};

function LocationPicker({ onClose, onSelect, selected, anchorRef, suggestions = [] }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState(null);
  const [positioning, setPositioning] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.stopImmediatePropagation(); onClose(); }
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
        .then((items) => { if (!controller.signal.aborted) setResults(items); })
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
  }, [position, search, retry]);

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
    <WallSheetFrame anchorRef={anchorRef} title="Location" onClose={onClose}>
      <section className="home-note-location-sheet">
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
          {loading ? <p aria-live="polite">Searching locations...</p> : null}
          {!loading && searchError ? <p role="alert">{searchError} <button onClick={() => setRetry((value) => value + 1)} type="button">Retry</button></p> : null}
          {!positioning && !loading && !searchError && !position && search.trim().length < 2 ? [...new Set(suggestions.filter(Boolean))].map((value) => <button key={value} onClick={() => { onSelect(value); onClose(); }} type="button"><FiMapPin /><strong>{value}</strong></button>) : null}
          {!positioning && !loading && !searchError && !position && search.trim().length < 2 ? <p>Type at least 2 letters to find any city, country, address, landmark, or venue.</p> : null}
          {!loading && results.map((item) => (
            <button aria-pressed={selected === item.label} className={selected === item.label ? "is-selected" : ""} key={item.code + item.label} onClick={() => { onSelect(item.label); onClose(); }} type="button">
              <span>{item.code || <FiMapPin aria-hidden="true" />}</span><span className="home-note-location-result-copy"><strong>{item.name}</strong>{item.subtitle ? <small>{item.subtitle}</small> : null}</span>
            </button>
          ))}
          {!positioning && !loading && !searchError && canLookupLocation(search, position) && !results.length ? <p>No locations found.</p> : null}
        </div>
      </section>
    </WallSheetFrame>
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

function PostComposer({ initialQuestion = null, currentUser, onComposeOpened, openSignal = "", defaultLocation = "", onPublished }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const owner = String(user?.id || user?._id || "");
  const initialDraft = useRef(readWallDraft(owner)).current;
  const publishingRef = useRef(false);
  const attemptRef = useRef(initialDraft?.attempt || null);
  const textRef = useRef(null);
  const hostRef = useRef(null);
  const returnFocusRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesRef = useRef([]);
  const voiceAttachmentRef = useRef(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [voiceReview, setVoiceReview] = useState(false);
  const voiceTranscriptRequestRef = useRef(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [text, setText] = useState(initialDraft?.text || initialQuestion || "");
  const [selectedType, setSelectedType] = useState(initialDraft?.selectedType || (initialQuestion !== null ? POST_TYPES.find((item) => item.value === "Question") : POST_TYPES[1]));
  const [topic, setTopic] = useState(initialDraft?.topic || "");
  const [rightNow, setRightNow] = useState(initialDraft?.rightNow || false);
  const [needLabel, setNeedLabel] = useState(initialDraft?.needLabel || (initialQuestion !== null ? "Question" : ""));
  const [screen, setScreen] = useState("needs");
  const [location, setLocation] = useState(initialDraft?.location ?? defaultLocation);
  const [files, setFiles] = useState(() => (initialDraft?.files || []).map(previewFile));
  const [voiceAttachment, setVoiceAttachment] = useState(() => initialDraft?.voice?.file ? { ...initialDraft.voice, url: URL.createObjectURL(initialDraft.voice.file) } : null);
  const [error, setError] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [cropQueue, setCropQueue] = useState([]);
  const cropQueueRef = useRef([]);
  const canPostToHome = canCreateFeedPost(user);
  const createMutation = useCreateFeedPost();
  const trimmedText = text.trim();
  const validContextValue = selectedType.context;
  const categoryLabel = needLabel || selectedType.value;
  const effectiveTopic = topic || autoTopic(text);
  const canPublish = canPostToHome && !cropQueue.length && !voiceRecorderOpen && (trimmedText.length > 0 || voiceAttachment) && trimmedText.length <= POST_TEXT_MAX_LENGTH && !createMutation.isPending;
  const hasDraft = Boolean(trimmedText || files.length || voiceAttachment);

  useEffect(() => {
    saveWallDraft(owner, { text, selectedType, topic, rightNow, needLabel, location, files: files.map((item) => item.file), voice: voiceAttachment, attempt: attemptRef.current });
  }, [owner, text, selectedType, topic, rightNow, needLabel, location, files, voiceAttachment, uploadLabel]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    voiceAttachmentRef.current = voiceAttachment;
  }, [voiceAttachment]);

  useEffect(() => () => {
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    cropQueueRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    voiceTranscriptRequestRef.current?.abort();
    if (voiceAttachmentRef.current?.url) URL.revokeObjectURL(voiceAttachmentRef.current.url);
  }, []);

  useEffect(() => {
    if (!openSignal) return;
    setScreen(readWallDraft(owner)?.needLabel || readWallDraft(owner)?.text || readWallDraft(owner)?.files?.length || readWallDraft(owner)?.voice || initialQuestion !== null ? "compose" : "needs");
    setComposerOpen(true);
    onComposeOpened?.();
    window.setTimeout(() => textRef.current?.focus(), 80);
  }, [onComposeOpened, openSignal, owner, initialQuestion]);

  useEffect(() => {
    if (!composerOpen) return;
    const center = hostRef.current?.closest(".social-center-scroll");
    center?.scrollTo({ top: 0 });
    if (window.innerWidth <= 880) window.scrollTo({ top: 0 });
  }, [composerOpen]);

  const resetComposer = () => {
    files.forEach((item) => URL.revokeObjectURL(item.url));
    if (voiceAttachment?.url) URL.revokeObjectURL(voiceAttachment.url);
    setText("");
    setSelectedType(POST_TYPES[0]);
    setTopic("");
    setRightNow(false);
    setNeedLabel("");
    setScreen("needs");
    setLocation(defaultLocation);
    cropQueueRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    cropQueueRef.current = [];
    setCropQueue([]);
    filesRef.current = [];
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
    setScreen((needLabel || text.trim() || files.length || voiceAttachment) ? "compose" : "needs");
    setComposerOpen(true);
    window.setTimeout(() => textRef.current?.focus(), 60);
  };

  useEffect(() => {
    if (!composerOpen || topicPickerOpen || locationPickerOpen || voiceRecorderOpen || cropQueue.length) return undefined;
    if (!returnFocusRef.current) returnFocusRef.current = document.activeElement;
    const target = screen === "needs"
      ? document.querySelector(".wall-need-close")
      : textRef.current;
    target?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !topicPickerOpen && !locationPickerOpen && !voiceRecorderOpen && !createMutation.isPending) {
        setComposerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composerOpen, screen, topicPickerOpen, locationPickerOpen, voiceRecorderOpen, createMutation.isPending, cropQueue.length]);

  useEffect(() => {
    if (!voiceRecorderOpen) return undefined;
    const host = hostRef.current;
    const previous = host?.inert;
    if (host) host.inert = true;
    return () => { if (host) host.inert = previous; };
  }, [voiceRecorderOpen]);

  useEffect(() => {
    if (!cropQueue.length) return undefined;
    const composer = hostRef.current?.querySelector(".wall-create-screen");
    const discard = hostRef.current?.querySelector(".wall-draft-discard");
    if (composer) composer.inert = true;
    if (discard) discard.inert = true;
    return () => { if (composer) composer.inert = false; if (discard) discard.inert = false; };
  }, [cropQueue.length]);

  useEffect(() => {
    if (!composerOpen && returnFocusRef.current) {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target?.isConnected) target.focus();
      else hostRef.current?.querySelector("button")?.focus();
    }
  }, [composerOpen]);

  const addFiles = (incoming) => {
    const next = [...incoming];
    const remaining = 3 - filesRef.current.length - cropQueueRef.current.length;
    const accepted = [];
    let nextError = "";

    next.slice(0, Math.max(0, remaining)).forEach((file) => {
      const problem = fileError(file);
      if (problem) nextError = problem;
      else accepted.push({ file, url: URL.createObjectURL(file) });
    });

    if (next.length > remaining) nextError = `You can attach up to 3 images.`;
    setError(nextError);
    if (accepted.length) { cropQueueRef.current = [...cropQueueRef.current, ...accepted]; setCropQueue(cropQueueRef.current); }
  };

  const finishCrop = (file) => {
    const [current] = cropQueueRef.current;
    if (current?.url) URL.revokeObjectURL(current.url);
    const nextFiles = [...filesRef.current, previewFile(file)];
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    cropQueueRef.current = cropQueueRef.current.slice(1);
    setCropQueue(cropQueueRef.current);
  };

  const skipCrop = () => {
    const [current] = cropQueueRef.current;
    if (current?.url) URL.revokeObjectURL(current.url);
    cropQueueRef.current = cropQueueRef.current.slice(1);
    setCropQueue(cropQueueRef.current);
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
    voiceTranscriptRequestRef.current?.abort();
    if (voiceAttachment?.url) URL.revokeObjectURL(voiceAttachment.url);
    const id = crypto.randomUUID();
    setVoiceAttachment({ ...recording, id, url: URL.createObjectURL(recording.file), transcriptStatus: recording.transcript ? "ready" : "loading" });
    setError("");
    if (!recording.transcript) {
      const controller = new AbortController();
      voiceTranscriptRequestRef.current = controller;
      voiceService.transcribeWallVoice(recording.file, { signal: controller.signal }).then((result) => {
        if (controller.signal.aborted) return;
        setVoiceAttachment((current) => current?.id === id ? { ...current, transcript: result.transcript || "", transcriptLanguage: result.detectedLanguage || "", transcriptStatus: "ready" } : current);
      }).catch((error) => {
        if (controller.signal.aborted) return;
        setVoiceAttachment((current) => current?.id === id ? { ...current, transcriptStatus: "error", transcriptError: error?.response?.data?.message || "Text unavailable. Your recording is kept." } : current);
      });
    }
  };

  const removeVoiceNote = () => {
    voiceTranscriptRequestRef.current?.abort();
    setVoiceAttachment((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const publish = () => {
    if (publishingRef.current) return;
    if (!canPublish) {
      setError(trimmedText ? "This note is too long." : "Write something or attach a voice note before publishing.");
      return;
    }

    const formData = new FormData();
    formData.append("text", trimmedText);
    formData.append("context", validContextValue);
    formData.append("postType", selectedType.value);
    formData.append("topic", effectiveTopic);
    formData.append("rightNow", String(rightNow));
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
    const signature = JSON.stringify([...formData.entries()].map(([key, value]) => [key, value instanceof File ? [value.name, value.size, value.lastModified] : value]));
    if (attemptRef.current?.signature !== signature) attemptRef.current = { signature, key: crypto.randomUUID() };
    publishingRef.current = true;
    setError("");
    setUploadLabel("Publishing");

    createMutation.mutate(
      {
        formData,
        idempotencyKey: attemptRef.current.key,
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.max(8, Math.round((event.loaded / event.total) * 90));
          setUploadLabel(percent < 90 ? `Uploading ${percent}%` : "Publishing");
        },
      },
      {
        onError: (mutationError) => {
          publishingRef.current = false;
          setUploadLabel("");
          setError(mutationError?.response?.data?.message || "Could not publish this note.");
        },
        onSuccess: () => {
          publishingRef.current = false;
          attemptRef.current = null;
          clearWallDraft();
          showToast("Note published.");
          resetComposer();
          setComposerOpen(false);
          onPublished?.();
        },
      }
    );
  };


  return (
    <div className={`wall-composer-host ${composerOpen ? "is-open" : ""}`} ref={hostRef}>
      {composerOpen && !createMutation.isPending ? <button className="wall-draft-discard" onClick={() => { resetComposer(); clearWallDraft(); attemptRef.current = null; setComposerOpen(false); }} type="button">Discard draft</button> : null}
      {cropQueue[0] ? <ProfileImageCropper kind="feed" onCancel={skipCrop} onSave={finishCrop} source={cropQueue[0].url} /> : null}
      {composerOpen && screen === "needs" ? (
        <WallNeedPicker location={defaultLocation} viewerId={user?.id || user?._id} onClose={() => { setComposerOpen(false); }} onSelect={(need) => {
          if (!location) setLocation(defaultLocation);
          setSelectedType(POST_TYPES.find((item) => item.value === need.type));

          setNeedLabel(need.label);
          setScreen("compose");
        }} />
      ) : composerOpen ? (
        <section
          aria-busy={createMutation.isPending}
          aria-label="Create a wall note"
          className={`home-note-composer wall-create-screen ${screen === "compose" ? "wall-prototype-compose" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!publishingRef.current) addFiles(event.dataTransfer.files || []);
          }}
        >
          <header className="wall-create-header">
            <button aria-label="Back to needs" disabled={createMutation.isPending} onClick={() => setScreen("needs")} type="button"><FiArrowLeft /></button>
            <h1>{categoryLabel}</h1>
            <button className="wall-prototype-post" disabled={!canPublish} onClick={publish} type="button">{createMutation.isPending ? "Posting..." : "Post"}</button>
          </header>
          <fieldset disabled={createMutation.isPending} className="wall-create-body">
          <div className="wall-compose-author"><FanAvatar name={currentUser.name} src={currentUser.avatar} size="h-[38px] w-[38px]" /><div><strong>{currentUser.name}</strong><small><b>{categoryLabel}</b> · {location || "Worldwide"}</small></div></div>
          {effectiveTopic === "Meet people" ? <p className="wall-meet-safety">Meet in public places · get to know each other in replies first</p> : null}
          <textarea
            aria-label="Note text"
            maxLength={POST_TEXT_MAX_LENGTH}
            onChange={(event) => {
              setText(event.target.value);
              setError("");
            }}
            placeholder={categoryLabel === "Buy & Sell" ? "What are you selling or looking to buy? Price, condition, area" : NEED_PLACEHOLDERS[selectedType.value] || "What do you want to share?"}
            ref={textRef}
            value={text}
          />
          {voiceAttachment ? <div className="wall-composer-voice-chip">
            <VoiceMessageBubble compact variant="chip" audio={{ duration: voiceAttachment.duration, url: voiceAttachment.url, waveform: voiceAttachment.waveform }} label="Voice note" />
            <button aria-label="Review voice text and translations" onClick={() => { setVoiceReview(true); setVoiceRecorderOpen(true); }} type="button"><FiMoreHorizontal /></button>
            <button aria-label="Remove voice note" onClick={removeVoiceNote} type="button"><FiX /></button>
            <span className="sr-only" role="status">{voiceAttachment.transcriptStatus === "loading" ? "Generating transcript" : voiceAttachment.transcriptStatus === "error" ? voiceAttachment.transcriptError : "Voice added. Text is available behind show text after publishing."}</span>
          </div> : null}

          <div className="wall-create-attachments home-note-tools">
            <button aria-label="Attach image" onClick={() => fileInputRef.current?.click()} type="button"><FiImage /><span>Photo</span></button>
            {!voiceAttachment ? <button aria-label="Record voice note" onClick={() => { setVoiceReview(false); setVoiceRecorderOpen(true); }} type="button"><FiMic /><span>Voice</span></button> : null}
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

          <div className="wall-compose-settings">
            <button onClick={() => setTopicPickerOpen(true)} type="button"><span>TOPIC</span><strong>{!topic ? <FiStar aria-hidden="true" /> : null}{effectiveTopic || "Auto"}</strong></button>
            <button onClick={() => setLocationPickerOpen(true)} type="button"><span>PLACE</span><strong>{location || "Worldwide"}</strong></button>
            <button aria-pressed={rightNow} onClick={() => setRightNow((value) => !value)} type="button"><span>RIGHT NOW</span><strong className={rightNow ? "is-on" : "is-off"}><i aria-hidden="true" />{rightNow ? "On" : "Off"}</strong></button>
          </div>
          <div className="wall-create-submit">
            {error ? <p role="alert">{error}</p> : uploadLabel ? <p role="status">{uploadLabel}</p> : hasDraft ? <small>{text.length}/{POST_TEXT_MAX_LENGTH}</small> : null}

          </div>
          </fieldset>
        </section>
      ) : (
        <div className="home-composer-trigger">
          <button
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={openComposer}
            type="button"
          >
            <FanAvatar name={currentUser.name} size="h-[34px] w-[34px]" src={currentUser.avatar} />
            <span className="truncate">What do you need today?</span><span aria-hidden="true" className="wall-need-trigger-plus">+</span>
          </button>
        </div>
      )}
      {topicPickerOpen ? <WallTopicSheet selected={topic} inferred={autoTopic(text)} location={location || defaultLocation} viewerId={user?.id || user?._id} anchorRef={hostRef} onClose={() => setTopicPickerOpen(false)} onSelect={(value) => { setTopic(value); setTopicPickerOpen(false); }} /> : null}
      {locationPickerOpen ? <LocationPicker anchorRef={hostRef} suggestions={[defaultLocation, currentUser.location]} onClose={() => setLocationPickerOpen(false)} onSelect={setLocation} selected={location} /> : null}
      <WallVoiceRecorder onDelete={removeVoiceNote} quick={!voiceReview} initialRecording={voiceReview ? voiceAttachment : null} isOpen={voiceRecorderOpen} onClose={() => setVoiceRecorderOpen(false)} onUse={attachVoiceNote} />
    </div>
  );
}

export default PostComposer;
