/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiEye, FiFilm, FiImage, FiPlus, FiSave, FiX, FiZap } from "react-icons/fi";
import { publicationService as api } from "../../services/publicationService";
import { normalizeTags, publicationError, seenCompleteness } from "../../utils/publicationValidation";

const empty = { kind: "SEEN", title: "", summary: "", description: "", category: "", tags: [], chapters: [] };
const categories = ["Places", "Moving", "Business", "Growth", "Lifestyle"];
const defaultSeries = ["Gym Life"];

function statusLabel(status, uploading) {
  if (uploading) return "Uploading media...";
  if (status === "Saved") return "";
  return status;
}

function seriesFromTags(tags = []) {
  const raw = tags.find((tag) => String(tag).startsWith("series:"));
  return raw ? raw.replace(/^series:/, "").replace(/-/g, " ") : "";
}

function tagsWithSeries(tags = [], series = "") {
  const base = normalizeTags(tags).filter((tag) => !String(tag).startsWith("series:"));
  const value = series.trim().toLowerCase().replace(/\s+/g, "-");
  return value ? [...base, `series:${value}`] : base;
}

export default function SeenComposerPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const replyToSeenId = id ? "" : searchParams.get("replyToSeenId") || "";
  const coverInput = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);
  const pendingCoverKind = useRef("IMAGE");
  const [p, setP] = useState(() => ({ ...empty, replyToSeen: replyToSeenId || null }));
  const [replySeen, setReplySeen] = useState(null);
  const [series, setSeries] = useState("");
  const [newSeries, setNewSeries] = useState("");
  const [savedSeries, setSavedSeries] = useState(defaultSeries);
  const [introOpen, setIntroOpen] = useState(() => !localStorage.getItem("atseen_seen_intro_dismissed"));
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");

  const refresh = async (publicationId = id) => {
    const response = await api.getMyPublication(publicationId);
    const publication = response.data.data.publication;
    setP(publication);
    setSeries(seriesFromTags(publication.tags));
    dirty.current = false;
    return publication;
  };

  useEffect(() => {
    if (id) refresh().catch((requestError) => setError(publicationError(requestError)));
  }, [id]);

  useEffect(() => {
    if (!replyToSeenId) return undefined;
    let active = true;
    api.getPublicPublication(replyToSeenId)
      .then((response) => {
        if (active) setReplySeen(response.data.data.publication);
      })
      .catch(() => {
        if (active) setReplySeen(null);
      });
    return () => {
      active = false;
    };
  }, [replyToSeenId]);

  const change = (values) => {
    dirty.current = true;
    setStatus("Unsaved changes");
    setError("");
    setP((current) => ({ ...current, ...values }));
  };

  const ensure = async () => {
    if (p.id) return p;
    const response = await api.createPublicationDraft({
      kind: "SEEN",
      title: p.title,
      summary: p.summary || p.description,
      description: p.description,
      category: p.category,
      tags: tagsWithSeries(p.tags, series),
      replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
    });
    const publication = response.data.data.publication;
    setP(publication);
    history.replaceState({}, "", `/studio/seens/${publication.id}/edit`);
    return publication;
  };

  const save = async () => {
    if (busy.current) return null;
    busy.current = true;
    setStatus("Saving...");
    setError("");
    try {
      let publication = await ensure();
      publication = (await api.updatePublicationDraft(publication.id, {
        title: p.title,
        summary: p.summary || p.description,
        description: p.description,
        category: p.category,
        tags: tagsWithSeries(p.tags, series),
        replyToSeenId: p.replyToSeen || replyToSeenId || undefined,
        statusVersion: publication.statusVersion,
      })).data.data.publication;
      setP(publication);
      dirty.current = false;
      setStatus("Saved");
      return publication;
    } catch (requestError) {
      setStatus("Save failed");
      setError(publicationError(requestError));
      return null;
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (!dirty.current || !p.id || uploading) return undefined;
    const timer = setTimeout(save, 1800);
    return () => clearTimeout(timer);
  }, [p, series, uploading]);

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const publication = await ensure();
      setUploading(pendingCoverKind.current);
      setStatus("Uploading media...");
      await api.uploadMedia(publication.id, file, { purpose: "COVER", statusVersion: publication.statusVersion });
      await refresh(publication.id);
      setStatus("Media saved");
    } catch (requestError) {
      setStatus("Upload failed");
      setError(publicationError(requestError));
    } finally {
      setUploading("");
    }
  };

  const chooseMedia = (kind) => {
    pendingCoverKind.current = kind;
    coverInput.current?.click();
  };

  const addChapter = async () => {
    if (p.chapters.length >= 3) {
      setError("Maximum three chapters.");
      return;
    }
    const publication = dirty.current ? await save() : await ensure();
    if (!publication) return;
    try {
      const title = p.chapters.length ? `Chapter ${p.chapters.length + 1}` : "Chapter 1 - where it starts";
      await api.addChapter(publication.id, {
        title,
        blocks: [],
        isPreview: true,
        releaseMode: "IMMEDIATE",
        statusVersion: publication.statusVersion,
      });
      await refresh(publication.id);
      setStatus("Chapter added");
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const removeChapter = async (chapter) => {
    if (!p.id || !chapter?.stableChapterId) return;
    try {
      await api.deleteChapter(p.id, chapter.stableChapterId, p.statusVersion);
      await refresh(p.id);
      setStatus("Chapter removed");
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const submit = async () => {
    const publication = await save();
    if (!publication) return;
    const errors = seenCompleteness(publication);
    if (errors.length) {
      setError(errors.join(" \u00b7 "));
      return;
    }
    try {
      await api[publication.status === "CHANGES_REQUESTED" ? "resubmitPublication" : "submitPublication"](publication.id, publication.statusVersion);
      nav(`/studio/seens/${publication.id}`);
    } catch (requestError) {
      setError(publicationError(requestError));
    }
  };

  const addNewSeries = () => {
    const value = newSeries.trim().slice(0, 24);
    if (!value) return;
    setSavedSeries((current) => [...new Set([...current, value])]);
    setSeries(value);
    setNewSeries("");
    dirty.current = true;
    setStatus("Unsaved changes");
  };

  if (p.id && !["DRAFT", "CHANGES_REQUESTED"].includes(p.status)) {
    return <p>This Seen is read-only while {p.status.replaceAll("_", " ")}.</p>;
  }

  const mediaPreview = p.coverMedia?.secureUrl;
  const mediaKind = p.coverMedia?.mediaType === "VIDEO" ? "VIDEO" : "IMAGE";
  const statusText = statusLabel(status, uploading);

  return (
    <section className="seen-compose-page">
      <header className="seen-compose-header">
        <button aria-label="Back" className="seen-compose-back" onClick={() => nav(-1)} type="button"><FiChevronLeft /></button>
        <div className="seen-compose-heading">
          <h1>New Seen</h1>
          {introOpen ? (
            <p>
              <span>Seen {"\u2014"} a post made of chapters. People walk it like a small story.</span>
              <button
                aria-label="Dismiss Seen intro"
                onClick={() => {
                  localStorage.setItem("atseen_seen_intro_dismissed", "1");
                  setIntroOpen(false);
                }}
                type="button"
              >
                <FiX />
              </button>
            </p>
          ) : null}
        </div>
        <button className="seen-compose-save" onClick={save} type="button"><FiSave aria-hidden="true" />Save for later</button>
      </header>

      <div className="seen-compose-body">
        {mediaPreview ? (
          <div className="seen-compose-cover">
            {mediaKind === "VIDEO" ? <video controls preload="metadata" src={mediaPreview} /> : <img alt="Seen cover" src={mediaPreview} />}
            <button aria-label="Remove selected cover" onClick={() => change({ coverMedia: null })} type="button"><FiX /></button>
            {mediaKind === "VIDEO" ? <span>Video</span> : null}
          </div>
        ) : (
          <div className="seen-compose-media-grid">
            <button onClick={() => chooseMedia("VIDEO")} type="button"><FiZap /><b>Video {"\u00b7"} 0:15</b></button>
            <button onClick={() => chooseMedia("VIDEO")} type="button"><FiFilm /><b>Video {"\u00b7"} 0:30</b></button>
            <button onClick={() => chooseMedia("IMAGE")} type="button"><FiImage /><b>Photo</b></button>
          </div>
        )}
        <input
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="sr-only"
          onChange={uploadCover}
          ref={coverInput}
          type="file"
        />

        <p className="seen-compose-counter"><FiEye aria-hidden="true" /><b>0</b> saw this {"\u2014"} the counter comes alive after you publish</p>
        {replyToSeenId ? <p className="seen-compose-reply-context">Replying to {replySeen?.title ? `\u201c${replySeen.title}\u201d` : "this Seen"}</p> : null}

        <label className="seen-compose-field seen-compose-title">
          <span className="sr-only">Title</span>
          <input
            maxLength={120}
            onChange={(event) => change({ title: event.target.value })}
            placeholder={"Title \u2014 e.g. \u201c8-Week Transformation\u201d"}
            value={p.title}
          />
        </label>

        <label className="seen-compose-field">
          <span className="sr-only">Description</span>
          <textarea
            maxLength={300}
            onChange={(event) => change({ description: event.target.value, summary: event.target.value })}
            placeholder={"About this experience \u2014 what happens inside, honestly"}
            value={p.description || p.summary}
          />
        </label>

        <div aria-label="Seen category" className="seen-compose-chips" role="group">
          {categories.map((category) => (
            <button
              aria-pressed={p.category === category}
              className={p.category === category ? "is-selected" : ""}
              key={category}
              onClick={() => change({ category })}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>

        <div className="seen-compose-section-title">
          <span>CHAPTERS</span>
          <small>{p.chapters.length}/3 {"\u00b7"} like a post {"\u2014"} short</small>
        </div>

        <div className="seen-compose-chapters">
          {p.chapters.map((chapter, index) => (
            <div className="seen-compose-chapter" key={chapter.stableChapterId || index}>
              <span>{index + 1}</span>
              <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
              <button aria-label={`Remove chapter ${index + 1}`} onClick={() => removeChapter(chapter)} type="button"><FiX /></button>
            </div>
          ))}
          {p.chapters.length < 3 ? (
            <button className="seen-compose-add-chapter" onClick={addChapter} type="button">
              <FiPlus aria-hidden="true" /> {p.chapters.length ? "Add chapter" : "Chapter 1 - where it starts"}
            </button>
          ) : null}
        </div>

        <div className="seen-compose-section-title seen-compose-series-title">
          <span>SERIES</span>
          <small>{"\u00b7"} optional</small>
        </div>
        <div className="seen-compose-series">
          {savedSeries.map((item) => (
            <button
              className={series === item ? "is-selected" : ""}
              key={item}
              onClick={() => {
                setSeries((current) => current === item ? "" : item);
                dirty.current = true;
                setStatus("Unsaved changes");
              }}
              type="button"
            >
              {item}
            </button>
          ))}
          <label>
            <span className="sr-only">New series</span>
            <input
              onChange={(event) => setNewSeries(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addNewSeries();
                }
              }}
              placeholder={"+ New series..."}
              value={newSeries}
            />
          </label>
        </div>
        <p className="seen-compose-series-help">Parts of a series live together on your profile {"\u2014"} people watch them like episodes</p>

        {error ? <p className="seen-compose-error" role="alert">{error}</p> : null}
        {statusText ? <p className="seen-compose-status" role="status">{statusText}</p> : null}

        <button className="seen-compose-publish" disabled={Boolean(uploading)} onClick={submit} type="button">Publish</button>
      </div>
    </section>
  );
}
