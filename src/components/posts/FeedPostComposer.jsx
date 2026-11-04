import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiImage, FiMapPin, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import EntityAttachmentPicker from "../contentEntities/EntityAttachmentPicker";
import ProfileImageCropper from "../profile/ProfileImageCropper";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import {
  POST_CONTEXTS,
  POST_IMAGE_TYPES,
  POST_LOCATIONS,
  POST_MAX_IMAGE_SIZE,
  POST_MAX_IMAGES,
  POST_TEXT_MAX_LENGTH,
} from "../../data/postOptions";
import { useCreateFeedPost, useDeleteFeedPost, usePostDrafts, useSavePostDraft, useUpdateFeedPost } from "../../hooks/useFeedPosts";
import { canCreateFeedPost } from "../../utils/postPermissions";
import { useAuth } from "../../hooks/useAuth";

function readError(error) {
  return error?.response?.data?.message || error?.message || __msg("posts.somethingWentWrong");
}

function formatBytes(value) {
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function makeFilePreview(file) {
  return { file, id: `${file.name}-${file.size}-${file.lastModified}`, url: URL.createObjectURL(file), error: "" };
}

function validateFile(file) {
  if (!POST_IMAGE_TYPES.includes(file.type)) {
    return __msg("fanWeb.onlyJpegPngOrWebpImagesAreAllowed");
  }
  if (file.size > POST_MAX_IMAGE_SIZE) {
    return __msg("posts.imagesMustBeValue0OrSmaller", { value0: formatBytes(POST_MAX_IMAGE_SIZE) });
  }
  return "";
}

function ProgressState({ error, progress, step }) {
  __useUiLanguage();
  if (!step && !error) return null;
  return (
    <div className={`rounded-2xl border p-4 ${error ? "border-atseen-danger/25 bg-atseen-danger/10" : "border-atseen-line bg-atseen-surface"}`}>
      <div className="flex items-center justify-between text-sm">
        <span className={`font-bold ${error ? "text-atseen-danger" : "text-atseen-text"}`}>{error ? __msg("posts.failed") : step}</span>
        {!error ? <span className="text-atseen-muted">{progress}%</span> : null}
      </div>
      {!error ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-atseen-blue transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-atseen-danger">{__systemMessage(error)}</p>
      )}
    </div>
  );
}

function FeedPostComposer({ currentUser, initialPost = null, isOpen, mode = "create", onClose }) {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const textRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesRef = useRef([]);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [location, setLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [files, setFiles] = useState([]);
  const [attachedEntities, setAttachedEntities] = useState([]);
  const [serverMedia, setServerMedia] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [progress, setProgress] = useState({ error: "", progress: 0, step: "" });
  const [loadedDraftId, setLoadedDraftId] = useState("");
  const [cropQueue, setCropQueue] = useState([]);

  const draftsQuery = usePostDrafts({ enabled: isOpen && canCreateFeedPost(user) && mode === "create" });
  const createMutation = useCreateFeedPost();
  const saveDraftMutation = useSavePostDraft();
  const updateMutation = useUpdateFeedPost();
  const deleteMutation = useDeleteFeedPost();
  const canCreate = canCreateFeedPost(user);
  const isEditing = mode === "edit" && initialPost?.id;

  useEffect(() => {
    if (!isOpen) return undefined;
    setText(initialPost?.text || "");
    setContext(initialPost?.context || "");
    setLocation(initialPost?.location || "");
    setLocationSearch("");
    setFiles([]);
    setAttachedEntities(initialPost?.attachedEntities || []);
    setServerMedia(initialPost?.media || []);
    setErrors({});
    setConfirmClose(false);
    setProgress({ error: "", progress: 0, step: "" });
    setLoadedDraftId(initialPost?.status === "draft" ? initialPost.id : "");
    window.setTimeout(() => textRef.current?.focus(), 80);
    return undefined;
  }, [initialPost, isOpen]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => () => {
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const hasUnsaved = Boolean(text.trim() || context || location || files.length || serverMedia.length || attachedEntities.length || loadedDraftId);
  const trimmedText = text.trim();
  const isValid = trimmedText.length > 0 && trimmedText.length <= POST_TEXT_MAX_LENGTH && !Object.values(errors).some(Boolean);
  const busy = createMutation.isPending || saveDraftMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const filteredLocations = POST_LOCATIONS.filter((item) => item.toLowerCase().includes(locationSearch.toLowerCase())).slice(0, 6);

  const existingMedia = useMemo(() => serverMedia.filter((item) => item?.url), [serverMedia]);

  const resetAndClose = () => {
    setConfirmClose(false);
    onClose();
  };

  const requestClose = () => {
    if (busy) return;
    if (hasUnsaved) {
      setConfirmClose(true);
      return;
    }
    resetAndClose();
  };

  const addFiles = (incoming) => {
    if (!canCreate) {
      showToast(__msg("posts.homePostCreationIsOnlyAvailableForCreatorAccounts"));
      return;
    }

    const nextErrors = {};
    const accepted = [];
    const remaining = POST_MAX_IMAGES - files.length - serverMedia.length;
    if (remaining <= 0) {
      setErrors((current) => ({ ...current, media: __msg("posts.youCanAttachUpToValue0Images", { value0: POST_MAX_IMAGES }) }));
      return;
    }

    [...incoming].slice(0, remaining).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        nextErrors.media = error;
      } else {
        accepted.push({ file, url: URL.createObjectURL(file) });
      }
    });

    if (incoming.length > remaining) {
      nextErrors.media = __msg("posts.youCanAttachUpToValue0Images", { value0: POST_MAX_IMAGES });
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    setCropQueue((current) => [...current, ...accepted]);
  };

  const finishCrop = (file) => {
    const [current] = cropQueue;
    if (current?.url) URL.revokeObjectURL(current.url);
    setFiles((items) => [...items, makeFilePreview(file)]);
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

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("text", trimmedText);
    formData.append("context", context);
    formData.append("location", location);
    formData.append("entityRefs", JSON.stringify(attachedEntities.map((entity) => ({ entityId: entity.id, entityType: entity.type }))));
    files.forEach((item) => formData.append("media", item.file));
    return formData;
  };

  const onUploadProgress = (event) => {
    const percent = event.total ? Math.max(8, Math.round((event.loaded / event.total) * 85)) : 45;
    setProgress({ error: "", progress: percent, step: percent < 85 ? __msg("posts.uploadingMedia") : __msg("fanWeb.publishing") });
  };

  const publish = () => {
    if (!canCreate) {
      setErrors({ form: __msg("posts.homePostCreationIsOnlyAvailableForCreatorAccounts") });
      return;
    }
    if (!isValid) {
      setErrors((current) => ({ ...current, text: trimmedText ? "" : __msg("posts.writeSomethingBeforePublishing") }));
      return;
    }

    setProgress({ error: "", progress: 8, step: __msg("posts.preparing") });
    const onSuccess = () => {
      setProgress({ error: "", progress: 100, step: __msg("social.complete") });
      showToast(isEditing ? __msg("posts.postUpdated") : __msg("posts.postPublished"));
      resetAndClose();
    };
    const onError = (error) => {
      setProgress({ error: readError(error), progress: 0, step: "" });
    };

    if (isEditing || (loadedDraftId && !files.length)) {
      updateMutation.mutate(
        {
          postId: initialPost?.id || loadedDraftId,
          payload: { context, entityRefs: attachedEntities.map((entity) => ({ entityId: entity.id, entityType: entity.type })), location, publish: loadedDraftId ? "true" : undefined, text: trimmedText },
        },
        { onError, onSuccess }
      );
      return;
    }

    createMutation.mutate({ formData: buildFormData(), onUploadProgress }, { onError, onSuccess });
  };

  const saveDraft = () => {
    if (!canCreate) {
      setErrors({ form: __msg("posts.homePostDraftsAreOnlyAvailableForCreator") });
      return;
    }
    if (!trimmedText && !files.length && !serverMedia.length) {
      setErrors({ text: __msg("posts.addTextOrImagesBeforeSavingADraft") });
      return;
    }

    setProgress({ error: "", progress: 8, step: __msg("posts.savingDraft") });
    saveDraftMutation.mutate(
      { formData: buildFormData(), onUploadProgress },
      {
        onError: (error) => setProgress({ error: readError(error), progress: 0, step: "" }),
        onSuccess: (draft) => {
          setProgress({ error: "", progress: 100, step: "Draft saved" });
          setLoadedDraftId(draft.id);
          showToast(__msg("posts.draftSaved"));
          resetAndClose();
        },
      }
    );
  };

  const loadDraft = (draft) => {
    setText(draft.text || "");
    setContext(draft.context || "");
    setLocation(draft.location || "");
    setFiles([]);
    setAttachedEntities(draft.attachedEntities || []);
    setServerMedia(draft.media || []);
    setLoadedDraftId(draft.id);
    setErrors({});
    window.setTimeout(() => textRef.current?.focus(), 40);
  };

  const discardDraft = (draftId) => {
    deleteMutation.mutate(draftId, {
      onError: (error) => showToast(readError(error)),
      onSuccess: () => showToast(__msg("posts.draftDiscarded")),
    });
  };

  if (!isOpen) return null;

  return (
    <FanModal className="max-h-[94dvh] max-w-[920px] p-0 sm:p-0" isOpen={isOpen} onClose={requestClose} title={isEditing ? __msg("posts.editHomePost") : __msg("posts.createHomePost")}>
      {cropQueue[0] ? <ProfileImageCropper kind="feed" onCancel={skipCrop} onSave={finishCrop} source={cropQueue[0].url} /> : null}
      <div className="grid bg-[#0B0E13] lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          className="min-w-0 p-5 sm:p-6"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files || []);
          }}
        >
          {!canCreate ? (
            <div className="rounded-2xl border border-atseen-danger/25 bg-atseen-danger/10 p-4 text-sm text-atseen-danger">{__msg("posts.homePostCreationIsOnlyAvailableForCreatorAccounts")}</div>
          ) : null}

          <div className="flex items-center gap-3">
            <FanAvatar name={currentUser?.name || user?.name || "Creator"} size="h-11 w-11" src={currentUser?.avatar || user?.avatar} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{currentUser?.name || user?.name || __msg("discover.creator")}</p>
              <p className="text-xs text-atseen-muted">{isEditing ? __msg("posts.editingHomePost") : __msg("posts.publishingToHome")}</p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="sr-only">{__msg("posts.postText")}</span>
            <textarea
              aria-describedby="post-text-count post-text-error"
              className="max-h-[320px] min-h-[156px] w-full resize-y rounded-2xl border border-atseen-line bg-atseen-surface px-4 py-4 text-base leading-7 text-atseen-text outline-none transition focus:border-atseen-blue"
              maxLength={POST_TEXT_MAX_LENGTH}
              onChange={(event) => {
                setText(event.target.value);
                setErrors((current) => ({ ...current, text: "" }));
              }}
              placeholder={__msg("posts.shareWhatYouVeSeen")}
              ref={textRef}
              value={text}
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <p className="text-atseen-danger" id="post-text-error" role="status">{errors.text || errors.form || ""}</p>
            <p className={text.length > POST_TEXT_MAX_LENGTH ? "text-atseen-danger" : "text-atseen-muted"} id="post-text-count">{text.length}/{POST_TEXT_MAX_LENGTH}</p>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{__msg("posts.context")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {POST_CONTEXTS.map((item) => (
                <button
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${context === item ? "border-atseen-blue bg-atseen-blue/15 text-atseen-blue" : "border-atseen-line bg-atseen-surface text-atseen-muted hover:text-white"}`}
                  key={item}
                  onClick={() => setContext((current) => (current === item ? "" : item))}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{__msg("fanWeb.location")}</p>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-atseen-line bg-atseen-surface px-3 py-2">
              <FiMapPin className="text-atseen-blue" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                onChange={(event) => {
                  setLocationSearch(event.target.value);
                  setLocation(event.target.value);
                }}
                placeholder={__msg("posts.searchCityOrCountry")}
                value={locationSearch || location}
              />
              {location ? <button aria-label={__msg("posts.clearLocation")} className="text-atseen-muted" onClick={() => { setLocation(""); setLocationSearch(""); }} type="button"><FiX /></button> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredLocations.map((item) => (
                <button className="rounded-full border border-atseen-line px-3 py-1.5 text-xs text-atseen-muted hover:text-white" key={item} onClick={() => { setLocation(item); setLocationSearch(""); }} type="button">
                  {item}
                </button>
              ))}
            </div>
          </div>

          <EntityAttachmentPicker context={context} disabled={busy} onChange={setAttachedEntities} value={attachedEntities} />

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{__msg("posts.images")}</p>
              <button className="inline-flex items-center gap-2 rounded-full border border-atseen-line px-3 py-2 text-xs font-bold text-atseen-muted hover:text-white" onClick={() => fileInputRef.current?.click()} type="button">
                <FiImage />{__msg("contentEntities.attach")}</button>
            </div>
            <input accept={POST_IMAGE_TYPES.join(",")} className="sr-only" multiple onChange={(event) => addFiles(event.target.files || [])} ref={fileInputRef} type="file" />
            {errors.media ? <p className="mt-2 text-xs text-atseen-danger">{errors.media}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {existingMedia.map((item) => (
                <img alt="" className="aspect-square rounded-2xl border border-atseen-line object-cover opacity-80" key={item.id || item.url} src={item.url} />
              ))}
              {files.map((item) => (
                <div className="relative" key={item.id}>
                  <img alt="" className="aspect-square w-full rounded-2xl border border-atseen-line object-cover" src={item.url} />
                  <button aria-label={__msg("fanWeb.removeImage")} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" onClick={() => removeFile(item.id)} type="button"><FiX /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <ProgressState {...progress} />
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="rounded-xl border border-atseen-line px-4 py-3 text-sm font-bold text-atseen-muted hover:text-white" disabled={busy} onClick={requestClose} type="button">{__msg("admin.cancel")}</button>
            {!isEditing ? <button className="rounded-xl border border-atseen-line px-4 py-3 text-sm font-bold text-atseen-text disabled:opacity-60" disabled={busy || (!trimmedText && !files.length && !serverMedia.length)} onClick={saveDraft} type="button">{__msg("posts.saveDraft")}</button> : null}
            <button className="rounded-xl bg-atseen-blue px-5 py-3 text-sm font-black text-atseen-bg disabled:opacity-60" disabled={busy || !isValid} onClick={publish} type="button">
              {busy ? __msg("posts.working") : isEditing ? __msg("posts.saveChanges") : __msg("posts.publish")}
            </button>
            {progress.error ? <button className="inline-flex items-center gap-2 rounded-xl border border-atseen-line px-4 py-3 text-sm font-bold text-atseen-text" onClick={publish} type="button"><FiRefreshCw /> {__msg("activity.retry")}</button> : null}
          </div>
        </section>

        <aside className="border-t border-atseen-line bg-white/[0.025] p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{__msg("admin.preview")}</p>
          <div className="mt-3 rounded-2xl border border-atseen-line bg-atseen-surface p-4">
            <div className="flex items-center gap-2.5">
              <FanAvatar name={currentUser?.name || user?.name || "Creator"} size="h-9 w-9" src={currentUser?.avatar || user?.avatar} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{currentUser?.name || user?.name || __msg("discover.creator")}</p>
                <p className="text-[10px] text-atseen-muted">{__msg("posts.now")}</p>
              </div>
            </div>
            {context || location ? <p className="mt-3 inline-flex rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">{[context, location].filter(Boolean).join(" - ")}</p> : null}
            {attachedEntities.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachedEntities.map((entity) => (
                  <span dir="auto" className="rounded-[13px] border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1.5 text-[11px] font-bold text-atseen-blue" key={`${entity.type}-${entity.id}`}>
                    {entity.title}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/85">{trimmedText || __msg("posts.yourPostPreviewWillAppearHere")}</p>
            {existingMedia.length || files.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {existingMedia.slice(0, 4).map((item) => (
                  <img alt="" className="aspect-square rounded-xl object-cover" key={item.id || item.url} src={item.url} />
                ))}
                {files.slice(0, Math.max(0, 4 - existingMedia.length)).map((item) => (
                  <img alt="" className="aspect-square rounded-xl object-cover" key={item.id} src={item.url} />
                ))}
              </div>
            ) : null}
          </div>

          {mode === "create" ? (
            <div className="mt-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-atseen-dim">{__msg("posts.drafts")}</p>
              {draftsQuery.isLoading ? <p className="mt-3 text-xs text-atseen-muted">{__msg("posts.loadingDrafts")}</p> : null}
              {draftsQuery.data?.items?.length ? (
                <div className="mt-2 space-y-2">
                  {draftsQuery.data.items.slice(0, 4).map((draft) => (
                    <div className="rounded-2xl border border-atseen-line p-3" key={draft.id}>
                      <button className="flex w-full gap-3 text-start text-xs leading-5 text-atseen-muted" onClick={() => loadDraft(draft)} type="button">
                        {draft.media?.[0]?.url ? (
                          <img alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" src={draft.media[0].url} />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <strong className="block text-atseen-text">{__msg("posts.homePostDraft")}</strong>
                          <span className="line-clamp-2">{draft.text?.slice(0, 90) || __msg("posts.attachedImage", { value0: draft.media?.length || 0, value1: draft.media?.length === 1 ? "" : "s" })}</span>
                        </span>
                      </button>
                      <button className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-atseen-danger" onClick={() => discardDraft(draft.id)} type="button"><FiTrash2 /> {__msg("posts.delete")}</button>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-xs text-atseen-muted">{__msg("posts.noSavedHomeDraftsYet")}</p>}
            </div>
          ) : null}
        </aside>
      </div>

      {confirmClose ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-[22px] border border-atseen-line bg-[#0B0E13] p-5">
            <h3 className="text-base font-bold">{__msg("posts.saveThisDraft")}</h3>
            <p className="mt-2 text-sm leading-6 text-atseen-muted">{__msg("posts.youHaveUnsavedHomePostChanges")}</p>
            <div className="mt-5 grid gap-2">
              <button className="rounded-xl bg-atseen-blue px-4 py-3 text-sm font-black text-atseen-bg" onClick={saveDraft} type="button">{__msg("posts.saveAsDraft")}</button>
              <button className="rounded-xl border border-atseen-danger/40 px-4 py-3 text-sm font-bold text-atseen-danger" onClick={resetAndClose} type="button">{__msg("posts.discard")}</button>
              <button className="rounded-xl border border-atseen-line px-4 py-3 text-sm font-bold text-atseen-text" onClick={() => setConfirmClose(false)} type="button">{__msg("posts.continueEditing")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </FanModal>
  );
}

export default FeedPostComposer;
