import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";
import PhotoCropSheet from "./PhotoCropSheet";
import ProfilePhotoViewer from "./ProfilePhotoViewer";
import "./ProfilePhotos.css";

export default function ProfilePhotosSection({ initialMedia = [], isOwner, username, profile = {} }) {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [file, setFile] = useState(null);
  const [activeId, setActiveId] = useState("");
  const openedLink = useRef("");
  const [error, setError] = useState("");
  const input = useRef(null);
  const key = ["profile-media", isOwner ? "me" : username];
  const query = useQuery({ queryKey: key, queryFn: () => (isOwner ? profileService.getOwnMedia() : profileService.getProfileMedia(username)).then(response => response.data.data), initialData: { media: initialMedia }, staleTime: 0, enabled: isOwner || Boolean(username), retry: false });
  const items = useMemo(() => (query.data?.media || []).filter(item => (item.type || item.mediaType || "image") !== "video").sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [query.data]);
  useEffect(() => { const photo = params.get("photo"); if (!photo) openedLink.current = ""; else if (openedLink.current !== photo && items.some(item => item.id === photo)) { openedLink.current = photo; setActiveId(photo); } }, [params, items]);
  const refresh = () => { client.invalidateQueries({ queryKey: key }); client.invalidateQueries({ queryKey: ["unified-profile"] }); };
  const upload = useMutation({ mutationFn: nextFile => profileService.addProfileMedia(nextFile), onSuccess: () => { setFile(null); setError(""); refresh(); }, onError: failure => setError(failure.response?.data?.message || "Could not add your photo. Please try again.") });
  const remove = useMutation({ mutationFn: photo => profileService.removeProfileMedia(photo.id), onSuccess: (_response, photo) => {
    const index = items.findIndex(item => item.id === photo.id);
    const remaining = items.filter(item => item.id !== photo.id);
    client.setQueryData(key, current => ({ ...current, media: (current?.media || []).filter(item => item.id !== photo.id) }));
    setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id || ""); refresh();
  }, onError: failure => setError(failure.response?.data?.message || "Could not delete the photo.") });
  const close = () => { setActiveId(""); if (params.has("photo")) { const next = new URLSearchParams(params); next.delete("photo"); setParams(next, { replace: true }); } };
  if (!isOwner && !items.length && !query.isError) return null;
  return <section className="profile-photos-prototype">
    <h2>Photos</h2>
    <input accept="image/jpeg,image/png,image/webp" aria-label="Upload profile photo" className="sr-only" onChange={event => { const next = event.target.files?.[0]; event.target.value = ""; if (!next) return; if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) { setError("Choose a JPEG, PNG, or WebP photo."); return; } setError(""); setFile(next); }} ref={input} type="file" />
    <div className="profile-photos-strip">
      {isOwner ? <button aria-label="Add photo" className="profile-photos-add" onClick={() => input.current?.click()} type="button"><FiPlus /></button> : null}
      {items.map((item, index) => <button aria-label={`Open photo ${index + 1}`} className="profile-photos-tile" key={item.id} onClick={() => setActiveId(item.id)} type="button"><img alt={item.caption || "Profile photo"} loading="lazy" src={resolveMediaUrl(item.thumbnailUrl || item.url || item.mediaUrl)} /></button>)}
    </div>
    {query.isError ? <p className="photo-error">Unable to load photos. <button onClick={() => query.refetch()} type="button">Retry</button></p> : null}
    {error && !file ? <p className="photo-error" role="alert">{error}</p> : null}
    {file ? <PhotoCropSheet error={error} file={file} onClose={() => { if (!upload.isPending) { setFile(null); setError(""); } }} onSave={nextFile => upload.mutateAsync(nextFile)} saving={upload.isPending} /> : null}
    <ProfilePhotoViewer active={items.find(item => item.id === activeId)} error={error} isOwner={isOwner} items={items} onClose={close} onRemove={photo => remove.mutate(photo)} onSelect={photo => setActiveId(photo.id)} profile={{ ...profile, username }} />
  </section>;
}
