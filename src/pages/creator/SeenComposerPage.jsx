/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicationService as api } from "../../services/publicationService";
import { BLOCK_TYPES, chapterTextCount, normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";

const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "VOICE"];
const empty = { kind: "SEEN", title: "", summary: "", description: "", category: "", tags: [], chapters: [] };

function SeenMediaEditor({ block, disabled, onRemove, onUpload }) {
  const input = useRef(null);
  const media = block.media;
  const accept = block.type === "IMAGE" ? "image/jpeg,image/png,image/webp" : block.type === "VIDEO" ? "video/mp4,video/quicktime" : "audio/mpeg,audio/wav,audio/aac,audio/flac";

  return <div className="chapter-media-editor mt-3">
    {media?.secureUrl ? <div className="chapter-media-preview">
      {block.type === "IMAGE" ? <img alt="Uploaded chapter media" src={media.secureUrl} /> : block.type === "VIDEO" ? <video controls preload="metadata" src={media.secureUrl} /> : <audio controls preload="metadata" src={media.secureUrl} />}
      <div className="chapter-media-meta"><span>{media.format?.toUpperCase() || block.type}</span>{media.bytes ? <span>{(media.bytes / 1024 / 1024).toFixed(1)} MB</span> : null}</div>
    </div> : <button className="chapter-upload-empty" disabled={disabled} onClick={() => input.current?.click()} type="button"><strong>Add {block.type.toLowerCase()}</strong><small>Select a file and wait until “Media saved” appears.</small></button>}
    <input accept={accept} className="sr-only" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} ref={input} type="file" />
    {media ? <div className="mt-3 flex gap-2"><button disabled={disabled} onClick={() => input.current?.click()} type="button">Replace</button><button disabled={disabled} onClick={onRemove} type="button">Remove</button></div> : null}
  </div>;
}

export default function SeenComposerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(empty);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const dirty = useRef(false);
  const busy = useRef(false);

  const refresh = async (publicationId = id) => {
    const response = await api.getMyPublication(publicationId);
    const publication = response.data.data.publication;
    setP(publication);
    dirty.current = false;
    return publication;
  };

  useEffect(() => { if (id) refresh().catch((requestError) => setError(publicationError(requestError))); }, [id]);

  const ensure = async () => {
    if (p.id) return p;
    const response = await api.createPublicationDraft({ kind: "SEEN", title: p.title, summary: p.summary, description: p.description, category: p.category, tags: normalizeTags(p.tags) });
    const publication = response.data.data.publication;
    setP(publication);
    history.replaceState({}, "", `/studio/seens/${publication.id}/edit`);
    return publication;
  };

  const hasPendingMedia = p.chapters.some((chapter) => chapter.blocks.some((block) => MEDIA_TYPES.includes(block.type) && !block.media?.assetId));

  const save = async () => {
    if (busy.current) return null;
    if (hasPendingMedia) { setStatus("Media required"); setError("Choose a file for every media block, or delete the empty media block before saving."); return null; }
    busy.current = true; setStatus("Saving…"); setError("");
    try {
      let publication = await ensure();
      publication = (await api.updatePublicationDraft(publication.id, { title: p.title, summary: p.summary, description: p.description, category: p.category, tags: normalizeTags(p.tags), statusVersion: publication.statusVersion })).data.data.publication;
      for (const chapter of p.chapters) {
        await api.updateChapter(publication.id, chapter.stableChapterId, { title: chapter.title || "Untitled", blocks: chapter.blocks, isPreview: true, releaseMode: "IMMEDIATE", statusVersion: publication.statusVersion });
        publication = (await api.getMyPublication(publication.id)).data.data.publication;
      }
      setP(publication); dirty.current = false; setStatus("Saved"); return publication;
    } catch (requestError) {
      setStatus("Save failed"); setError(publicationError(requestError)); return null;
    } finally { busy.current = false; }
  };

  useEffect(() => { if (!dirty.current || !p.id || uploading || hasPendingMedia) return; const timer = setTimeout(save, 1800); return () => clearTimeout(timer); }, [p, uploading, hasPendingMedia]);

  const change = (values) => { dirty.current = true; setStatus("Unsaved changes"); setError(""); setP((current) => ({ ...current, ...values })); };
  const chapter = p.chapters[active];
  const update = (next) => change({ chapters: p.chapters.map((item, index) => index === active ? next : item) });
  const addBlock = (type) => update({ ...chapter, blocks: [...chapter.blocks, { id: crypto.randomUUID(), type, order: chapter.blocks.length, ...(MEDIA_TYPES.includes(type) ? {} : type === "LINK" ? { url: "", label: "" } : { text: "" }) }] });

  const addChapter = async () => {
    if (p.chapters.length >= 3) return setError("Maximum three chapters.");
    if (hasPendingMedia) return setError("Upload or delete the empty media block before adding another chapter.");
    const publication = dirty.current ? await save() : await ensure();
    if (!publication) return;
    await api.addChapter(publication.id, { title: `Chapter ${publication.chapters.length + 1}`, blocks: [], isPreview: true, releaseMode: "IMMEDIATE", statusVersion: publication.statusVersion });
    const next = await refresh(publication.id); setActive(next.chapters.length - 1);
  };

  const uploadCover = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const publication = await ensure(); await api.uploadMedia(publication.id, file, { purpose: "COVER", statusVersion: publication.statusVersion }); await refresh(publication.id); } catch (requestError) { setError(publicationError(requestError)); } };

  const uploadBlock = async (block, file) => {
    if (busy.current) return setError("Wait for the current save to finish, then select the file again.");
    busy.current = true; setUploading(block.id); setStatus("Uploading media…"); setError("");
    try {
      const targetChapterId = chapter.stableChapterId;
      const draft = await ensure();
      let server = (await api.getMyPublication(draft.id)).data.data.publication;
      server = (await api.updatePublicationDraft(server.id, { title: p.title, summary: p.summary, description: p.description, category: p.category, tags: normalizeTags(p.tags), statusVersion: server.statusVersion })).data.data.publication;
      const uploaded = (await api.uploadMedia(server.id, file, { purpose: "BLOCK", mediaType: block.type, chapterId: targetChapterId, blockId: block.id })).data.data;
      const target = p.chapters.find((item) => item.stableChapterId === targetChapterId);
      const updatedTarget = { ...target, blocks: target.blocks.map((item) => item.id === block.id ? { ...item, media: uploaded } : item) };
      await api.updateChapter(server.id, targetChapterId, { title: updatedTarget.title || "Untitled", blocks: updatedTarget.blocks, isPreview: true, releaseMode: "IMMEDIATE", statusVersion: server.statusVersion });
      server = (await api.getMyPublication(server.id)).data.data.publication;
      const savedTarget = server.chapters.find((item) => item.stableChapterId === targetChapterId) || updatedTarget;
      const chapters = p.chapters.map((item) => item.stableChapterId === targetChapterId ? savedTarget : item);
      const comparable = (item) => JSON.stringify({ title: item.title || "Untitled", blocks: item.blocks, isPreview: true });
      const hasOtherChanges = chapters.some((item) => item.stableChapterId !== targetChapterId && comparable(item) !== comparable(server.chapters.find((candidate) => candidate.stableChapterId === item.stableChapterId) || item));
      setP({ ...p, ...server, chapters });
      dirty.current = hasOtherChanges; setStatus(hasOtherChanges ? "Media saved · other changes pending" : "Media saved");
    } catch (requestError) { setStatus("Upload failed"); setError(publicationError(requestError)); }
    finally { busy.current = false; setUploading(""); }
  };

  const submit = async () => { const publication = await save(); if (!publication) return; const errors = seenCompleteness(publication); if (errors.length) return setError(errors.join(" · ")); if (!confirm("Submit this Seen for review?")) return; await api[publication.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](publication.id, publication.statusVersion); nav(`/studio/seens/${publication.id}`); };

  if (p.id && !["DRAFT", "CHANGES_REQUESTED"].includes(p.status)) return <p>This Seen is read-only while {p.status.replaceAll("_", " ")}.</p>;
  return <div className="space-y-5 pb-24">
    <header className="flex justify-between"><div><h1 className="text-3xl font-black">Seen composer</h1><p aria-live="polite">{uploading ? "Uploading chapter media…" : status}</p></div><button onClick={save}>Save draft</button></header>
    {p.creatorVisibleFeedback ? <p className="rounded-xl bg-orange-400/10 p-4">{p.creatorVisibleFeedback}</p> : null}{error ? <p className="rounded-xl bg-red-400/10 p-4" role="alert">{error}</p> : null}
    <section className="space-y-3 rounded-2xl border border-atseen-line p-5">{[["title", 120], ["summary", 300], ["description", 2000], ["category", 40]].map(([field, max]) => <label className="block" key={field}>{field}<textarea className="mt-1 w-full rounded-xl border border-atseen-line bg-atseen-bg p-3" maxLength={max} onChange={(event) => change({ [field]: event.target.value })} value={p[field]} /><small>{p[field].length}/{max}</small></label>)}<label>Tags<input className="w-full rounded-xl border p-3" onChange={(event) => change({ tags: event.target.value.split(",") })} value={p.tags.join(", ")} /></label></section>
    <section className="rounded-2xl border border-atseen-line p-5"><h2>Verified cover</h2>{p.coverMedia?.secureUrl ? <img alt="Seen cover" className="my-3 aspect-video w-full object-cover" src={p.coverMedia.secureUrl} /> : null}<input accept="image/jpeg,image/png,image/webp" onChange={uploadCover} type="file" /></section>
    <nav className="flex gap-2">{p.chapters.map((item, index) => <button className={index === active ? "text-atseen-blue" : ""} disabled={Boolean(uploading)} key={item.stableChapterId} onClick={() => setActive(index)}>{index + 1}. {item.title}</button>)}<button disabled={p.chapters.length >= 3 || Boolean(uploading)} onClick={addChapter}>+ Chapter</button></nav>
    {chapter ? <section className="rounded-2xl border border-atseen-line p-5"><input aria-label="Chapter title" className="w-full border p-3" onChange={(event) => update({ ...chapter, title: event.target.value })} value={chapter.title} /><p>{chapterTextCount(chapter)}/2000 characters</p>{chapter.blocks.map((block) => <div className="my-3 rounded-xl border p-3" key={block.id}><strong>{block.type}</strong><button className="float-right" onClick={() => update({ ...chapter, blocks: chapter.blocks.filter((item) => item.id !== block.id) })}>Delete</button>{["TEXT", "KEY_POINT", "HIGHLIGHT"].includes(block.type) ? <textarea className="mt-2 w-full border p-3" onChange={(event) => update({ ...chapter, blocks: chapter.blocks.map((item) => item.id === block.id ? { ...item, text: event.target.value } : item) })} value={block.text} /> : block.type === "LINK" ? <div><input className="mt-2 w-full border p-3" placeholder="https://" onChange={(event) => update({ ...chapter, blocks: chapter.blocks.map((item) => item.id === block.id ? { ...item, url: event.target.value } : item) })} value={block.url} /><input className="mt-2 w-full border p-3" placeholder="Label" onChange={(event) => update({ ...chapter, blocks: chapter.blocks.map((item) => item.id === block.id ? { ...item, label: event.target.value } : item) })} value={block.label} /></div> : <SeenMediaEditor block={block} disabled={uploading === block.id} onRemove={() => update({ ...chapter, blocks: chapter.blocks.map((item) => item.id === block.id ? { ...item, media: undefined } : item) })} onUpload={(file) => uploadBlock(block, file)} />}</div>)}<div className="flex flex-wrap gap-2">{BLOCK_TYPES.map((type) => <button key={type} onClick={() => addBlock(type)}>+ {type}</button>)}</div></section> : null}
    <button className="fixed bottom-16 right-4 rounded-full bg-atseen-blue px-6 py-3 font-black text-atseen-bg" disabled={Boolean(uploading)} onClick={submit}>{p.status === "CHANGES_REQUESTED" ? "Resubmit" : "Submit for review"}</button>
  </div>;
}
