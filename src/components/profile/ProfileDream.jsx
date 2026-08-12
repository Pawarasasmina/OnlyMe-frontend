import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiCheck, FiChevronRight, FiGift, FiTrash2, FiX } from "react-icons/fi";
import { dreamService } from "../../services/dreamService";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

const GOALS = [500, 900, 1500, 2500, 5000];
const SPARKLE = String.fromCharCode(10024);
const STAR = String.fromCharCode(10022);
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

function Editor({ dream, onClose, onSaved }) {
  const [form, setForm] = useState({
    emoji: dream?.emoji || SPARKLE,
    title: dream?.title || "",
    reason: dream?.reason || "",
    goalStars: dream?.goalStars || 900,
    version: dream?.version,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await dreamService.saveMine(form);
      onSaved(response.data.data.dream);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save Dream");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-dream-editor-layer" role="presentation">
      <form aria-label="My Dream Experience" className="profile-dream-editor-sheet" onSubmit={save}>
        <button aria-label="Close Dream Experience" className="profile-dream-editor-close" onClick={onClose} type="button">
          <FiX />
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
        <button className="profile-dream-submit" disabled={saving} type="submit">
          {saving ? "Saving..." : dream ? "Save Dream" : `Light the dream ${SPARKLE}`}
        </button>
      </form>
    </div>
  );
}

function GiftPicker({ dream, gifts, onClose, onSent }) {
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
      setSent(gift);
      onSent(result.dream);
      setTimeout(onClose, 1100);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send gift");
    } finally {
      setSending("");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 sm:place-items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <div className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-atseen-line bg-atseen-surface p-6 sm:rounded-3xl">
        {sent ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-atseen-surface/95 p-8 text-center">
            <div>
              <span className="text-6xl">{giftEmoji[sent.key] || STAR}</span>
              <h2 className="mt-4 text-xl font-black">{sent.name} sent!</h2>
              <p className="mt-2 text-sm text-atseen-muted">{STAR}{sent.stars.toLocaleString()} was added to this Dream.</p>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Help Make It Happen</h2>
            <p className="mt-1 text-xs text-atseen-muted">Tap a gift to send it instantly to {dream.title}.</p>
          </div>
          <button disabled={Boolean(sending)} onClick={onClose} type="button"><FiX /></button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {gifts.map((gift) => (
            <button
              className={`rounded-2xl bg-white/[.035] p-3 text-center transition active:scale-95 disabled:opacity-40 ${sending === gift.key ? "border border-atseen-blue bg-atseen-blue/10" : ""}`}
              disabled={Boolean(sending)}
              key={gift.key}
              onClick={() => send(gift)}
              type="button"
            >
              <span className="text-2xl">{giftEmoji[gift.key] || STAR}</span>
              <strong className="mt-2 block truncate text-[10px]">{sending === gift.key ? "Sending..." : gift.name}</strong>
              <small className="mt-1 block text-atseen-muted">{STAR}{gift.stars.toLocaleString()}</small>
            </button>
          ))}
        </div>
        <label className="mt-5 flex items-center gap-3 text-xs text-atseen-muted">
          <input checked={privateSupport} disabled={Boolean(sending)} onChange={(event) => setPrivateSupport(event.target.checked)} type="checkbox" />
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

function DreamEntryRow({ dream, isOwner, onCreate, onGift }) {
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
    <div className="profile-dream-live">
      <div className="profile-dream-head">
        <p>My Dream</p>
        {isOwner ? <button onClick={onCreate} type="button">Edit</button> : null}
      </div>
      <div className="profile-dream-main">
        <span>{dream.emoji || SPARKLE}</span>
        <div>
          <h2>{dream.title}</h2>
          <p>{dream.reason}</p>
        </div>
      </div>
      {!isOwner && dream.status === "ACTIVE" ? (
        <button className="profile-dream-gift" onClick={onGift} type="button"><FiGift /> Help Make It Happen</button>
      ) : null}
    </div>
  );
}

export default function ProfileDream({ capabilities, profile, role }) {
  const [editor, setEditor] = useState(false);
  const [picker, setPicker] = useState(false);
  const query = useQuery({
    queryKey: ["creator-dream", profile?.username],
    queryFn: () => dreamService.getCreatorDream(profile.username).then((response) => response.data.data),
    enabled: role === "creator" && Boolean(profile?.username),
    retry: false,
  });

  if (role !== "creator" || query.isLoading || query.isError) return null;

  const dream = query.data?.dream;
  const gifts = query.data?.gifts || [];

  if (!dream && !capabilities.isOwner) return null;

  const progress = dream ? Math.min(100, Math.round((dream.receivedStars / dream.goalStars) * 100)) : 0;
  const update = () => {
    query.refetch();
    setEditor(false);
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

  return (
    <section className={`profile-dream-card ${dream ? "" : "is-empty"}`}>
      <DreamEntryRow dream={dream} isOwner={capabilities.isOwner} onCreate={() => setEditor(true)} onGift={() => setPicker(true)} />

      {dream ? (
        <>
          <div className="profile-dream-progress"><i style={{ width: `${progress}%` }} /></div>
          <div className="profile-dream-meta">
            <span>{STAR}{dream.receivedStars.toLocaleString()} of {STAR}{dream.goalStars.toLocaleString()}</span>
            <span>{dream.supporterCount} supporters - {progress}%</span>
          </div>
          {dream.status === "COMPLETED" ? (
            <p className="profile-dream-complete"><FiCheck /> Dream completed</p>
          ) : capabilities.isOwner ? (
            <div className="profile-dream-actions">
              <button onClick={() => status("complete")} type="button"><FiCheck /> Mark completed</button>
              <button onClick={() => status("remove")} type="button"><FiTrash2 /> Remove</button>
            </div>
          ) : null}
          {dream.supporters?.length ? (
            <div className="profile-dream-supporters">
              <p>Recent supporters</p>
              <div>
                {dream.supporters.slice(0, 6).map((supporter, index) => (
                  supporter.avatar
                    ? <img alt={supporter.name} key={`${supporter.username}-${index}`} src={supporter.avatar} />
                    : <span key={`${supporter.username}-${index}`}>{supporter.name?.slice(0, 1)}</span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {editor ? <Editor dream={dream?.status === "ACTIVE" ? dream : null} onClose={() => setEditor(false)} onSaved={update} /> : null}
      {picker ? <GiftPicker dream={dream} gifts={gifts} onClose={() => setPicker(false)} onSent={update} /> : null}
    </section>
  );
}
