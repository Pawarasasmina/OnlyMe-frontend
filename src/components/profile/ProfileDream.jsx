import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronRight, FiEdit2, FiMoreHorizontal, FiShare2, FiTrash2, FiX } from "react-icons/fi";
import { dreamService } from "../../services/dreamService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

const GOALS = [500, 900, 1500, 2500, 5000];
const SPARKLE = String.fromCharCode(10024);
const STAR = String.fromCharCode(10022);
const giftImageTransform = (gift) => `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})`;
const celebrationParticles = Array.from({ length: 28 }, (_, index) => ({ angle: index * (360 / 28), delay: (index % 7) * 34, distance: 92 + (index % 5) * 18, size: 8 + (index % 4) * 3 }));
async function croppedDreamPhoto(file, url, crop) {
  const image = await new Promise((resolve, reject) => { const value = new Image(); value.onload = () => resolve(value); value.onerror = reject; value.src = url; });
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 720;
  const context = canvas.getContext("2d"); const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * crop.zoom;
  const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2 + crop.x * canvas.width, (canvas.height - height) / 2 + crop.y * canvas.height, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
  if (!blob) throw new Error("Could not prepare Dream photo");
  return new File([blob], "dream-photo.jpg", { type: "image/jpeg" });
}

export function GiftCelebration({ detail, gift, message = "You're part of this Dream now" }) {
  return <div aria-live="polite" className="gift-celebration-layer">
    <div className="gift-celebration-veil" />
    <div className="gift-success-toast"><span className="gift-success-check">✓</span><span><strong>{message}</strong><small>{detail || `${gift.name} · ${STAR}${gift.stars.toLocaleString()} sent`}</small></span></div>
    <div className="gift-celebration-stage">
      <div className="gift-celebration-glow" />
      <i className="gift-celebration-ring is-outer" />
      <i className="gift-celebration-ring is-inner" />
      {celebrationParticles.map((particle, index) => <i className="gift-celebration-particle" key={index} style={{ "--angle": `${particle.angle}deg`, "--delay": `${particle.delay}ms`, "--distance": `${particle.distance}px`, "--size": `${particle.size}px` }} />)}
      <div className="gift-celebration-image"><img alt={gift.name} src={gift.imageUrl} style={{ transform: giftImageTransform(gift) }} /></div>
      <strong className="gift-celebration-name">{gift.name}</strong>
    </div>
  </div>;
}
const giftEmoji = {
  rain: "💙",
  iloveyou: "❤️",
  selfie: "✨",
  glow: "🌟",
  shopping: "🛍️",
  fit: "💪",
  ufo: "🛸",
  pop: "🎉",
  rocket: "🚀",
  gold: "🏆",
  bath: "💎",
  summit: "🏔️",
  bugatti: "🏎️",
  lambo: "🔥",
  throne: "👑",
  crown: "♛",
};

export function DreamEditor({ dream, fullPage = false, onClose, onSaved }) {
  const photoInput = useRef(null);
  const [form, setForm] = useState({
    emoji: dream?.emoji || SPARKLE,
    title: dream?.title || "",
    reason: dream?.reason || "",
    goalStars: dream?.goalStars || 900,
    version: dream?.version,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(dream?.photo?.url || "");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => { if (!photoFile) return undefined; const url = URL.createObjectURL(photoFile); setPhotoUrl(url); return () => URL.revokeObjectURL(url); }, [photoFile]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await dreamService.saveMine(form);
      const saved = response.data.data.dream;
      if (photoFile) await dreamService.savePhoto(saved.id, await croppedDreamPhoto(photoFile, photoUrl, crop));
      else if (removePhoto && dream?.id) await dreamService.removePhoto(dream.id);
      onSaved(saved);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save Dream");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`profile-dream-editor-layer ${fullPage ? "is-page" : ""}`} role="presentation">
      <form aria-label="My Dream Experience" className={`profile-dream-editor-sheet ${fullPage ? "is-page" : ""}`} onSubmit={save}>
        <button aria-label="Close Dream Experience" className="profile-dream-editor-close" onClick={onClose} type="button">
          {fullPage ? <FiArrowLeft /> : <FiX />}
        </button>
        <span className="profile-dream-editor-handle" />
        <div className="profile-dream-editor-title">
          <span aria-hidden="true">{SPARKLE}</span>
          <div>
            <h2>My Dream Experience</h2>
            <p>One real thing you dream of. People who feel it help it happen - then it becomes your next experience.</p>
          </div>
        </div>

        <label className="profile-dream-label" htmlFor="dream-title">What&apos;s the dream</label>
        <div className="profile-dream-input-row">
          <input
            aria-label="Dream emoji"
            className="profile-dream-emoji-input"
            maxLength={16}
            onChange={(event) => setForm({ ...form, emoji: event.target.value })}
            value={form.emoji}
          />
          <input
            className="profile-dream-text-input"
            id="dream-title"
            maxLength={40}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Learn Surfing, A month in Tokyo..."
            required
            value={form.title}
          />
        </div>

        <label className="profile-dream-label" htmlFor="dream-reason">Why it matters</label>
        <textarea
          className="profile-dream-text-input profile-dream-textarea"
          id="dream-reason"
          maxLength={120}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          placeholder="One honest line..."
          required
          rows={2}
          value={form.reason}
        />

        <span className="profile-dream-label">Dream photo</span>
        <div className="dream-photo-editor">
          {photoUrl && !removePhoto ? <div className="dream-photo-crop"><img alt="Dream crop preview" src={photoUrl} style={{ transform: `translate(${crop.x * 100}%, ${crop.y * 100}%) scale(${crop.zoom})` }} /></div> : <span className="dream-photo-empty">Add one photo</span>}
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { setPhotoFile(event.target.files?.[0] || null); setRemovePhoto(false); setCrop({ zoom: 1, x: 0, y: 0 }); }} ref={photoInput} type="file" />
          <div className="dream-photo-actions"><button onClick={() => photoInput.current?.click()} type="button">{photoUrl && !removePhoto ? "Replace" : "Upload"}</button>{photoUrl && !removePhoto ? <button onClick={() => { setPhotoFile(null); setPhotoUrl(""); setRemovePhoto(true); }} type="button">Remove</button> : null}</div>
          {photoFile ? <div className="dream-photo-adjust"><label>Zoom <input max="2.5" min="1" onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) })} step="0.05" type="range" value={crop.zoom} /></label><label>Left / right <input max="0.4" min="-0.4" onChange={(e) => setCrop({ ...crop, x: Number(e.target.value) })} step="0.02" type="range" value={crop.x} /></label><label>Up / down <input max="0.4" min="-0.4" onChange={(e) => setCrop({ ...crop, y: Number(e.target.value) })} step="0.02" type="range" value={crop.y} /></label></div> : null}
        </div>

        <span className="profile-dream-label">Goal</span>
        <div className="profile-dream-goals" role="radiogroup" aria-label="Dream star goal">
          {GOALS.map((goal) => (
            <button
              aria-checked={form.goalStars === goal}
              className={form.goalStars === goal ? "is-selected" : ""}
              key={goal}
              onClick={() => setForm({ ...form, goalStars: goal })}
              role="radio"
              type="button"
            >
              {STAR}{goal.toLocaleString()}
            </button>
          ))}
        </div>

        <p className="profile-dream-helper">Supporters send gifts - every coin goes toward the goal</p>
        {error ? <p className="profile-dream-error">{error}</p> : null}
        {fullPage ? <button className="profile-dream-preview-button" onClick={() => setPreviewOpen(true)} type="button">Preview</button> : null}
        <button className="profile-dream-submit" disabled={saving} type="submit">
          {saving ? "Saving..." : fullPage ? "Save" : dream ? "Save Dream" : `Light the dream ${SPARKLE}`}
        </button>
        {previewOpen ? <div className="dream-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreviewOpen(false)}><section className="dream-preview-card"><small>PREVIEW — as guests see it</small><div><h3>Dream</h3><article>{photoUrl && !removePhoto ? <img alt="" src={photoUrl} /> : <span>{form.emoji}</span>}<h4>{form.title || "Your Dream"}</h4><p>{form.reason || "Why this dream matters"}</p><b>{STAR}{Number(dream?.receivedStars || 0).toLocaleString()} of {STAR}{Number(form.goalStars).toLocaleString()}</b><strong>Help make it happen ›</strong></article></div><p>tap outside to close</p></section></div> : null}
      </form>
    </div>
  );
}

export function GiftPicker({ creatorName, dream, gifts, onClose, onSent }) {
  const queryClient = useQueryClient();
  const [privateSupport, setPrivateSupport] = useState(false);
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");

  const send = async (gift) => {
    if (sending || sent) return;
    setSending(gift.key);
    setError("");

    try {
      const response = await dreamService.sendGift(dream.id, {
        giftKey: gift.key,
        privateSupport,
        idempotencyKey: createIdempotencyKey("dream-gift"),
      });
      const result = response.data.data;
      queryClient.setQueryData(["wallet"], result.wallet);
      await queryClient.invalidateQueries({ queryKey: ["wallet-ledger"] });
      setSent({ ...gift, ...result.gift, key: gift.key });
      onSent(result.dream);
      setTimeout(onClose, 2600);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send gift");
    } finally {
      setSending("");
    }
  };

  return (
    <div className="dream-gift-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <div className="dream-gift-sheet">
        {sent ? <GiftCelebration gift={sent} /> : null}
        <span className="dream-gift-handle" />
        <div className="dream-gift-header">
          <div>
            <h2>Help Make It Happen</h2>
            <p>{creatorName} dreams of <strong>{dream.title}</strong></p>
          </div>
          <button aria-label="Close gift picker" disabled={Boolean(sending)} onClick={onClose} type="button"><FiX /></button>
        </div>
        <div className="dream-gift-progress"><i style={{ width: `${Math.min(100, Math.round((dream.receivedStars / dream.goalStars) * 100))}%` }} /></div>
        <p className="dream-gift-progress-copy">{STAR}{dream.receivedStars.toLocaleString()} / {STAR}{dream.goalStars.toLocaleString()} · every gift goes toward the dream</p>
        {gifts.length ? <div className="dream-gift-grid">
          {gifts.map((gift) => (
            <button
              className={`dream-gift-tile ${sending === gift.key ? "is-sending" : ""}`}
              disabled={Boolean(sending) || Boolean(sent)}
              key={gift.key}
              onClick={() => send(gift)}
              type="button"
            >
              <span>
                <img alt={gift.name} src={gift.imageUrl} style={{ transform: giftImageTransform(gift) }} />
              </span>
              <strong>{sending === gift.key ? "Sending..." : gift.name}</strong>
              <small>{STAR}{gift.stars.toLocaleString()}</small>
            </button>
          ))}
        </div> : <p className="dream-gift-empty">No gifts are currently available.</p>}
        <p className="dream-gift-supporters">Made possible by {dream.supporterCount} {dream.supporterCount === 1 ? "person" : "people"}</p>
        <label className="dream-gift-private">
          <input checked={privateSupport} disabled={Boolean(sending) || Boolean(sent)} onChange={(event) => setPrivateSupport(event.target.checked)} type="checkbox" />
          Support privately
        </label>
        {error ? (
          <div className="mt-4 rounded-xl bg-red-400/10 p-3 text-xs text-red-300">
            {error}
            {error.toLowerCase().includes("insufficient") ? <Link className="ml-2 font-bold underline" to="/wallet">Open wallet</Link> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DreamEntryRow({ dream, isOwner, onCreate, onMenu }) {
  if (!dream) {
    return (
      <button className="profile-dream-entry" onClick={onCreate} type="button">
        <span aria-hidden="true">{SPARKLE}</span>
        <b>Dream Experience</b>
        <strong>Create <FiChevronRight /></strong>
      </button>
    );
  }

  return (
    <div className={`profile-dream-live ${isOwner ? "is-owner" : "is-supportable"}`}>
      <div className={`profile-dream-story ${dream.photo?.url ? "has-photo" : ""}`}>
        {dream.photo?.url ? <img alt="" className="profile-dream-thumbnail" src={dream.photo.url} /> : null}
        <div className="profile-dream-story-copy">
          <div className="profile-dream-main">
            <h2><span aria-hidden="true">{dream.emoji || SPARKLE}</span>{dream.title}</h2>
            {isOwner ? <button aria-label="Open Dream menu" className="profile-dream-menu-trigger" onClick={onMenu} type="button"><FiMoreHorizontal /></button> : null}
          </div>
          <p className="profile-dream-reason">“{dream.reason}”</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfileDream({ capabilities, profile, role }) {
  const navigate = useNavigate();
  const [picker, setPicker] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(undefined);
  const query = useQuery({
    queryKey: ["creator-dream", profile?.username],
    queryFn: () => dreamService.getCreatorDream(profile.username).then((response) => response.data.data),
    enabled: role === "creator" && Boolean(profile?.username),
    retry: false,
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setMenuPosition({
        "--dream-menu-center-x": `${bounds.left + bounds.width / 2}px`,
        "--dream-menu-column-width": `${bounds.width}px`,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [menuOpen]);

  if (role !== "creator" || query.isLoading || query.isError) return null;

  const dream = query.data?.dream;
  const gifts = query.data?.gifts || [];

  if (!dream && !capabilities.isOwner) return null;

  const progress = dream ? Math.min(100, Math.round((dream.receivedStars / dream.goalStars) * 100)) : 0;
  const update = () => {
    query.refetch();
    setPicker(false);
  };
  const status = async (action) => {
    if (!confirm(action === "complete" ? "Mark this Dream as completed?" : "Remove this Dream?")) return;
    try {
      await (action === "complete" ? dreamService.completeMine(dream.id, dream.version) : dreamService.removeMine(dream.id, dream.version));
      update();
    } catch {
      query.refetch();
    }
  };

  const shareDream = async () => {
    const url = window.location.href;
    const shareData = { title: dream?.title || "My Dream", text: dream?.reason || "See this Dream on @seen", url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(url);
    } catch (error) {
      if (error?.name !== "AbortError") return;
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <section className={`profile-dream-card ${dream ? "" : "is-empty"}`}>
      <div className="profile-dream-section-head">
        <h2>Dream</h2>
        {dream?.cameTrueCount > 0 ? <span>{dream.cameTrueCount} CAME TRUE</span> : null}
      </div>
      <div className="profile-dream-panel">
        <DreamEntryRow dream={dream} isOwner={capabilities.isOwner} onCreate={() => navigate("/profile/dream")} onMenu={() => setMenuOpen(true)} />

        {dream ? (
          <>
            <div className="profile-dream-progress-row"><div className="profile-dream-progress"><i style={{ width: `${progress}%` }} /></div><b>{progress}%</b></div>
            <div className="profile-dream-meta">
              <span>{dream.supporterCount} in this story</span>
              {capabilities.isOwner
                ? <button onClick={() => navigate("/profile/dream")} type="button">Edit <FiChevronRight /></button>
                : dream.status === "ACTIVE" ? <button onClick={() => setPicker(true)} type="button">Help make it happen <FiChevronRight /></button> : null}
            </div>
            {dream.status === "COMPLETED" && capabilities.isOwner ? (
              <p className="profile-dream-complete"><FiCheck /> Dream completed</p>
            ) : null}
          </>
        ) : null}
      </div>

      {picker ? <GiftPicker creatorName={profile?.displayName || profile?.username || "This creator"} dream={dream} gifts={gifts} onClose={() => setPicker(false)} onSent={() => query.refetch()} /> : null}
      {menuOpen && dream ? (
        <div className="profile-dream-menu-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)} style={menuPosition}>
          <section aria-label="Dream actions" aria-modal="true" className="profile-dream-menu-sheet" role="dialog">
            <span className="profile-dream-menu-handle" />
            <button onClick={shareDream} type="button"><FiShare2 /><span>Share</span></button>
            <button onClick={() => { setMenuOpen(false); navigate("/profile/dream"); }} type="button"><FiEdit2 /><span>Edit</span></button>
            {dream.status !== "COMPLETED" ? <button onClick={() => { setMenuOpen(false); status("complete"); }} type="button"><FiCheck className="is-success" /><span>Mark as done</span></button> : null}
            <button className="is-danger" onClick={() => { setMenuOpen(false); status("remove"); }} type="button"><FiTrash2 /><span>Delete</span></button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
