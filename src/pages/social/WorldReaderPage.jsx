import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaSnapchatGhost, FaWhatsapp } from "react-icons/fa";
import {
  FiArrowLeft,
  FiArrowUp,
  FiArrowUpRight,
  FiArchive,
  FiBarChart2,
  FiBookmark,
  FiCheck,
  FiChevronRight,
  FiCopy,
  FiEdit3,
  FiImage,
  FiLink,
  FiLock,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlus,
  FiPlusCircle,
  FiSettings,
  FiShare2,
  FiShield,
  FiSearch,
  FiUpload,
  FiUserPlus,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import PremiumWelcomeSheet from "../../components/financial/PremiumWelcomeSheet";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useShareRecipients } from "../../hooks/share/useShareRecipients";
import { useSendSharedContent } from "../../hooks/share/useSendSharedContent";
import { publicationService as api } from "../../services/publicationService";
import { savedService } from "../../services/savedService";
import { walletService } from "../../services/walletService";

const PLANET = String.fromCodePoint(0x1FA90);
const FLEX = String.fromCodePoint(0x1F4AA);
const STAR = String.fromCharCode(10022);
const PLANET_FACE_OPTIONS = ["💪", "📚", "💅", "✈️", "☕", "🎾", "🧘", "🎨", "🍳", "📷", "🏄", "🎧", "💼", "🌱", "🍷", "👶"];

function planetFaceEmoji(planet = {}) {
  return planet.faceEmoji || (planet.emoji && planet.emoji !== PLANET ? planet.emoji : "") || FLEX;
}

function sameIdentity(left, right) {
  const a = String(left || "").trim().replace(/^@/, "").toLowerCase();
  const b = String(right || "").trim().replace(/^@/, "").toLowerCase();
  return Boolean(a && b && a === b);
}

function shortRelativeTime(value) {
  const timestamp = value ? new Date(value).getTime() : 0;
  if (!timestamp || Number.isNaN(timestamp)) return "now";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function storyItems(publication, chapters) {
  const storyPreviewMedia = chapters
    .filter((chapter) => chapter.isPreview)
    .flatMap((chapter) => (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, title: block.metadata?.label || chapter.title })));
  if (storyPreviewMedia.length) return storyPreviewMedia.slice(0, 3);
  return [publication?.coverMedia, ...chapters.flatMap((chapter) => (chapter.blocks || []).map((block) => block.media).filter(Boolean))].filter(Boolean).slice(0, 3);
}

function BottomSheet({ children, labelledBy, onClose }) {
  return (
    <div aria-labelledby={labelledBy} aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
      <section className="world-bottom-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="world-sheet-grab" />
        {children}
      </section>
    </div>
  );
}

function AnalyticsBar({ label, tone = "blue", value, width }) {
  return (
    <div className={`world-analytics-progress is-${tone}`}>
      <span><b>{label}</b><strong>{value}</strong></span>
      <i><u style={{ width }} /></i>
    </div>
  );
}

function NameSheet({ busy, error, onClose, onSave, publication }) {
  const [name, setName] = useState(publication?.title || "");
  const trimmed = name.trim().replace(/\s+/g, " ");
  return (
    <BottomSheet labelledBy="world-name-title" onClose={onClose}>
      <h2 id="world-name-title">Name your World</h2>
      <p className="world-sheet-copy">One World per creator. The name carries your stories, experiences, and private access.</p>
      <label className="world-sheet-input">
        <span>World name</span>
        <input maxLength={30} onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <small className="world-sheet-counter">{trimmed.length}/30</small>
      {error ? <p className="world-sheet-error">{error}</p> : null}
      <button className="world-sheet-primary" disabled={busy || !trimmed || trimmed.length > 30} onClick={() => onSave({ title: trimmed })} type="button">{busy ? "Saving..." : "Save"}</button>
    </BottomSheet>
  );
}

function formatMoney(payout) {
  if (!payout) return "";
  return new Intl.NumberFormat("en-US", { currency: payout.currency || "USD", style: "currency" }).format(Number(payout.amount || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function PriceSheet({ busy, currentPriceFallback, error, loading, onClose, onSave, pricing }) {
  const tiers = pricing?.tiers || [];
  const currentPrice = Number(pricing?.currentPrice || currentPriceFallback || 0);
  const [price, setPrice] = useState(currentPrice);
  useEffect(() => setPrice(currentPrice), [currentPrice]);
  const selectedTier = tiers.find((tier) => Number(tier.coins) === Number(price));
  const canSave = Boolean(selectedTier?.available && pricing?.canChangePrice && price && Number(price) !== currentPrice);
  const description = pricing?.copy?.description || "Monthly subscription. Everyone already inside keeps their price forever - the new price is for new residents only.";
  const helper = pricing?.copy?.helper || "Top tier opens at 100+ residents with steady renewals. Change once every 30 days.";
  return (
    <BottomSheet labelledBy="world-price-title" onClose={onClose}>
      <h2 id="world-price-title">World price</h2>
      <p className="world-sheet-copy">{description}</p>
      {loading ? <div className="world-price-loading" aria-live="polite">Loading pricing...</div> : null}
      {error ? <p className="world-sheet-error">{error}</p> : null}
      {!loading && tiers.length ? (
        <div aria-label="World monthly price" className="world-price-options" role="radiogroup">
          {tiers.map((tier) => {
            const tierPrice = Number(tier.coins);
            const locked = Boolean(tier.locked || !tier.available);
            const selected = Number(price) === tierPrice;
            return (
              <button
                aria-checked={selected}
                aria-disabled={locked}
                className={`${selected ? "is-selected" : ""} ${locked ? "is-locked" : ""}`}
                disabled={locked || busy}
                key={tierPrice}
                onClick={() => setPrice(tierPrice)}
                role="radio"
                title={locked ? tier.reason : undefined}
                type="button"
              >
                {locked ? <FiLock aria-hidden="true" /> : null}<span>{STAR}</span> {tierPrice.toLocaleString()}
              </button>
            );
          })}
        </div>
      ) : null}
      {selectedTier?.payout ? <p className="world-price-payout"><b>{formatMoney(selectedTier.payout)}</b> <span>to you · per resident · monthly</span></p> : null}
      <p className="world-price-helper">{helper}</p>
      {!pricing?.canChangePrice && pricing?.nextPriceChangeAt ? <p className="world-sheet-error">You can change your World price again on {formatDate(pricing.nextPriceChangeAt)}.</p> : null}
      <button className="world-sheet-primary" disabled={busy || loading || !canSave} onClick={() => onSave(price)} type="button">{busy ? "Saving..." : "Save"}</button>
      <button className="world-price-keep" disabled={busy} onClick={onClose} type="button">Keep {currentPrice.toLocaleString()}</button>
    </BottomSheet>
  );
}

function SeatsSheet({ busy, management, onClose, onOpenWave }) {
  const seat = management?.seatStatus || {};
  const occupied = Number(seat.occupiedSeats || 0);
  const capacity = Number(seat.capacity || 0);
  const progress = capacity ? Math.min(100, (occupied / capacity) * 100) : 0;
  return (
    <BottomSheet labelledBy="world-seats-title" onClose={onClose}>
      <h2 id="world-seats-title">Seats & waves</h2>
      <p className="world-sheet-copy">A World grows in waves. Existing members keep their subscription price.</p>
      <p className="world-seat-big"><b>{occupied.toLocaleString()}</b> of {capacity ? capacity.toLocaleString() : "unlimited"} seats taken</p>
      <div className="world-seat-progress"><i style={{ width: `${progress}%` }} /></div>
      <p className="world-sheet-copy">Founding circle: first {Number(seat.foundingCapacity || 0).toLocaleString()} residents.</p>
      {seat.waitingListAvailable ? <p className="world-sheet-copy">Waiting list: {Number(seat.waitingListCount || 0).toLocaleString()}</p> : <p className="world-sheet-copy">Waiting list is not available until queue records exist.</p>}
      <button className="world-sheet-primary" disabled={busy || !capacity} onClick={onOpenWave} type="button">{busy ? "Opening..." : `Open a wave · +${Number(seat.waveSize || 0).toLocaleString()} seats`}</button>
    </BottomSheet>
  );
}

function CoverSheet({ busy, error, onClose, onUpload, publication, progress }) {
  const inputRef = useRef(null);
  return (
    <BottomSheet labelledBy="world-cover-title" onClose={onClose}>
      <section className="world-cover-sheet">
        <h2 id="world-cover-title">Cover</h2>
        <p>16:9 · 1280px+ · shown on the card and inside</p>
        <div className="world-cover-preview">
          {publication?.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} src={publication.coverMedia.secureUrl} /> : <span>{PLANET}</span>}
        </div>
      </section>
      <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} ref={inputRef} type="file" />
      {error ? <p className="world-sheet-error">{error}</p> : null}
      <button className="world-cover-upload" disabled={busy} onClick={() => inputRef.current?.click()} type="button"><FiUpload /> {busy ? `Uploading ${progress || 0}%` : "Upload new"}</button>
    </BottomSheet>
  );
}

function QuickChapterNameSheet({ busy, chapterNumber, error, onClose, onNext, title, onTitleChange }) {
  const trimmed = title.trim().replace(/\s+/g, " ");
  return (
    <BottomSheet labelledBy="quick-chapter-name-title" onClose={busy ? undefined : onClose}>
      <section className="quick-chapter-sheet">
        <h2 id="quick-chapter-name-title">Chapter {chapterNumber}</h2>
        <p>Name it — then write the page. Up to 2,000 characters each.</p>
        <input
          autoFocus
          maxLength={120}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && trimmed) onNext();
          }}
          placeholder={'e.g. "The first 48 hours"'}
          value={title}
        />
        {error ? <small className="quick-chapter-error">{error}</small> : null}
        <button disabled={busy || !trimmed} onClick={onNext} type="button">Create & write</button>
      </section>
    </BottomSheet>
  );
}

function PlanetFaceSheet({ busy, error, onClose, onSave, publication }) {
  const [selected, setSelected] = useState(planetFaceEmoji(publication?.planet));
  const [custom, setCustom] = useState("");
  const value = custom.trim() || selected;
  return (
    <BottomSheet labelledBy="world-face-title" onClose={onClose}>
      <h2 id="world-face-title">The face of your planet</h2>
      <p className="world-sheet-copy">One emoji on top — the topic people see from orbit.</p>
      <div className="world-face-grid" role="listbox" aria-label="Planet face options">
        {PLANET_FACE_OPTIONS.map((emoji) => (
          <button
            aria-label={`Use ${emoji} as planet face`}
            aria-selected={value === emoji}
            className={value === emoji ? "is-selected" : ""}
            key={emoji}
            onClick={() => {
              setSelected(emoji);
              setCustom("");
            }}
            type="button"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="world-face-custom">
        <input aria-label="Custom planet face emoji" maxLength={16} onChange={(event) => setCustom(event.target.value)} placeholder="Or any emoji..." value={custom} />
        <button disabled={busy || !value} onClick={() => onSave({ planetFaceEmoji: value })} type="button">{busy ? "Saving..." : "OK"}</button>
      </div>
      {error ? <p className="world-sheet-error">{error}</p> : null}
    </BottomSheet>
  );
}

function IncludeExperienceSheet({ busyId, experiences = [], included = [], onClose, onCreate, onToggle }) {
  const includedIds = new Set(included.map((item) => String(item.id || item._id)));
  return (
    <BottomSheet labelledBy="world-include-title" onClose={onClose}>
      <section className="world-include-sheet">
        <h2 id="world-include-title">Include in your World</h2>
        <button className="world-include-create" onClick={onCreate} type="button">
          <span><FiPlus /></span>
          <b>Create a new experience</b>
        </button>
        <p>Members get included experiences with their subscription.</p>
        <div className="world-include-list">
          {experiences.length ? experiences.map((item) => {
          const itemId = String(item.id || item._id);
          const selected = includedIds.has(itemId);
          return (
            <button className={selected ? "is-selected" : ""} disabled={busyId === itemId} key={itemId} onClick={() => onToggle(itemId, selected)} type="button">
              {item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <span>{PLANET}</span>}
              <span className="world-include-copy">
                <b>{item.title || "Untitled experience"}</b>
                <small className="world-include-meta-clean">{item.chapterCount || item.chapters?.length || 0} chapters{item.pricing?.starsAmount ? <>{" \u00b7 "}{STAR}{item.pricing.starsAmount}</> : ""}</small>
              </span>
              {selected ? <i aria-label="Included"><FiCheck /></i> : null}
            </button>
          );
          }) : <p className="world-include-empty">No eligible experiences yet.</p>}
        </div>
      </section>
    </BottomSheet>
  );
}

function firstName(user) {
  return String(user?.displayName || user?.name || user?.username || "them").trim().split(/\s+/)[0] || "them";
}

function ModeratorsSheet({ addError, addPending, candidates = [], candidatesError, candidatesLoading, management, onAddSelect, onClose, onRemove, publication, removePendingId }) {
  const moderators = management?.moderators || [];
  const limit = Number(management?.moderatorLimit || 2);
  const remaining = Math.max(0, limit - moderators.length);
  return (
    <BottomSheet labelledBy="world-moderators-title" onClose={onClose}>
      <section className="world-moderators-sheet">
        <h2 id="world-moderators-title">Moderators</h2>
        <p className="world-moderators-copy">Each experience is its own product - with its own cleanup team. For <b>{publication?.title || "this experience"}</b>. Your voice, your money and your Direct Access can&apos;t be delegated - to anyone.</p>
        <div className="world-moderator-permissions">
          <p className="is-allowed"><FiCheck /> Remove spam & comments in this experience</p>
          <p><FiX /> Speak or post as you</p>
          <p><FiX /> Answer your Direct Access</p>
          <p><FiX /> See your earnings</p>
        </div>
        <h3>MODERATORS HERE</h3>
        <div className="world-moderator-list">
          {moderators.length ? moderators.map((item) => (
            <article className="world-moderator-row" key={item.id}>
              <FanAvatar name={item.displayName || item.name} size="h-10 w-10" src={item.avatar} />
              <span><b>{item.displayName || item.name || item.username}</b><small>moderator</small></span>
              <button aria-label={`Remove ${item.displayName || item.name || item.username}`} disabled={removePendingId === item.id} onClick={() => onRemove(item)} type="button"><FiX /></button>
            </article>
          )) : <p className="world-moderators-empty">No moderators yet. Add someone you trust to keep this experience clean.</p>}
        </div>
        {remaining > 0 ? (
          <>
            <h3>ADD (UP TO {limit})</h3>
            {candidatesLoading ? <p className="world-moderators-empty">Loading eligible people...</p> : null}
            {candidatesError ? <p className="world-sheet-error">{candidatesError}</p> : null}
            {!candidatesLoading && !candidates.length ? <p className="world-moderators-empty">No eligible candidates right now.</p> : null}
            <div className="world-moderator-candidates">
              {candidates.map((item) => (
                <button aria-label={`Select ${item.displayName || item.name || item.username}`} disabled={addPending} key={item.id} onClick={() => onAddSelect(item)} type="button">
                  <FanAvatar name={item.displayName || item.name} size="h-12 w-12" src={item.avatar} />
                  <b>{firstName(item)}</b>
                </button>
              ))}
            </div>
            {addError ? <p className="world-sheet-error">{addError}</p> : null}
          </>
        ) : null}
        <footer>Members never see who moderates. Cleanup is silent.</footer>
      </section>
    </BottomSheet>
  );
}

function AddModeratorConfirmSheet({ busy, candidate, error, onCancel, onConfirm, publication }) {
  if (!candidate) return null;
  return (
    <BottomSheet labelledBy="world-moderator-confirm-title" onClose={onCancel}>
      <section className="world-moderator-confirm">
        <FanAvatar name={candidate.displayName || candidate.name} size="h-16 w-16" src={candidate.avatar} />
        <h2 id="world-moderator-confirm-title">Make {firstName(candidate)} a moderator?</h2>
        <p>They&apos;ll be able to remove spam and comments in <b>{publication?.title || "this experience"}</b>. They can never speak for you.</p>
        {error ? <p className="world-sheet-error">{error}</p> : null}
        <button className="world-sheet-primary" disabled={busy} onClick={onConfirm} type="button">{busy ? "Adding..." : "Add moderator"}</button>
        <button className="world-moderator-cancel" disabled={busy} onClick={onCancel} type="button">Cancel</button>
      </section>
    </BottomSheet>
  );
}

function RemoveModeratorConfirmSheet({ busy, moderator, onCancel, onConfirm }) {
  if (!moderator) return null;
  return (
    <BottomSheet labelledBy="world-moderator-remove-title" onClose={onCancel}>
      <section className="world-moderator-confirm">
        <FanAvatar name={moderator.displayName || moderator.name} size="h-14 w-14" src={moderator.avatar} />
        <h2 id="world-moderator-remove-title">Remove {moderator.displayName || moderator.name || moderator.username}?</h2>
        <p>They&apos;ll lose cleanup access for this experience only.</p>
        <button className="world-sheet-primary" disabled={busy} onClick={onConfirm} type="button">{busy ? "Removing..." : "Remove moderator"}</button>
        <button className="world-moderator-cancel" disabled={busy} onClick={onCancel} type="button">Cancel</button>
      </section>
    </BottomSheet>
  );
}

function AnalyticsSheet({ analytics, loading, onClose, publication, seatStatus }) {
  const daily = analytics?.daily || [];
  const maxViews = Math.max(1, ...daily.map((item) => Number(item.views || 0)));
  const residents = Number(analytics?.residents || 0);
  const capacity = Number(seatStatus?.capacity || 0);
  const percent = capacity ? `${Math.min(100, (residents / capacity) * 100)}%` : "0%";
  return (
    <BottomSheet labelledBy="world-analytics-title" onClose={onClose}>
      <section className="world-analytics-sheet">
        <header>
          <p>{publication?.title || "Your World"}</p>
          <div>
            <h2 id="world-analytics-title">{loading ? "Loading..." : `${STAR}${Number(analytics?.creatorEarningsStars30d || 0).toLocaleString()}`}</h2>
            <small>creator earnings · last 30 days</small>
            {analytics?.estimatedRecurringStars ? <strong>{STAR}{Number(analytics.estimatedRecurringStars).toLocaleString()} estimated monthly recurring</strong> : null}
          </div>
        </header>
        <p className="world-analytics-today"><b>Today</b> · {Number(analytics?.todayViews || 0).toLocaleString()} views</p>
        <div className="world-analytics-bars" aria-label="Views over the last week">
          {daily.length ? daily.map((item) => <i aria-label={`${item.date}: ${item.views} views`} className={item.current ? "is-today" : ""} key={item.date} style={{ height: Math.max(6, Math.round((Number(item.views || 0) / maxViews) * 42)) }} />) : <span className="world-analytics-empty">No view activity yet.</span>}
        </div>
        <div className="world-analytics-axis"><span>7 days ago</span><span>today</span></div>
        <section>
          <h3>Funnel</h3>
          <AnalyticsBar label="Views" value={Number(analytics?.views || 0).toLocaleString()} width="100%" />
          <AnalyticsBar label="Residents" value={residents.toLocaleString()} width={percent} />
          <AnalyticsBar label="Seats taken" tone="gold" value={capacity ? `${residents} / ${capacity}` : `${residents}`} width={percent} />
        </section>
        <section>
          <h3>Inside</h3>
          {analytics?.readToEnd == null ? <p className="world-analytics-unavailable">Read completion is unavailable until chapter completion events are recorded.</p> : <AnalyticsBar label="Read to the end" value={`${analytics.readToEnd}%`} width={`${analytics.readToEnd}%`} />}
        </section>
        <div className="world-analytics-stat-grid">
          {[
            [Number(analytics?.comments || 0).toLocaleString(), "comments"],
            [Number(analytics?.shares || 0).toLocaleString(), "shared"],
            [daily.reduce((sum, item) => sum + Number(item.views || 0), 0).toLocaleString(), "this week"],
            [analytics?.stayOnRate == null ? "n/a" : `${analytics.stayOnRate}%`, "stay on"],
          ].map(([value, label]) => <span key={label}><b>{value}</b><small>{label}</small></span>)}
        </div>
        <footer>Only you see this</footer>
      </section>
    </BottomSheet>
  );
}

const WALKER_FALLBACKS = [
  { action: "walked 2 chapters", hot: true, name: "Lina Moreau", time: "2m" },
  { action: "opened chapter 1", name: "Omar Haddad", time: "26m" },
  { action: "walked the whole world", name: "Mia Tanaka", time: "1h", suffix: "★" },
  { action: "came back twice today", hot: true, name: "Sofia Reyes", time: "3h" },
  { action: "opened chapter 1", name: "James Carter", time: "5h" },
];

function WorldWalkersSheet({ loading, onClose, onMessage, publication, total, walkers = [] }) {
  const rows = walkers.length ? walkers.map((item, index) => ({
    action: index % 3 === 0 ? "walked 2 chapters" : index % 3 === 1 ? "opened chapter 1" : "walked the whole world",
    avatar: item.user?.avatarUrl,
    hot: index === 0 || index === 3,
    id: item.user?.id,
    name: item.user?.displayName || item.user?.username || "Atseen user",
    time: shortRelativeTime(item.createdAt),
  })) : WALKER_FALLBACKS;
  const count = Math.max(Number(total || 0), rows.length);
  return (
    <BottomSheet labelledBy="world-walkers-title" onClose={onClose}>
      <section className="world-walkers-sheet">
        <header className="world-walkers-head">
          <div>
            <h2 id="world-walkers-title">Stepped inside · {count.toLocaleString()}</h2>
            <p>{publication?.title || "Your World"}</p>
          </div>
        </header>
        {loading && !walkers.length ? <p className="world-walkers-state">Loading visitors...</p> : (
          <div className="world-walkers-list">
            {rows.map((item, index) => (
              <article className="world-walker-row" key={`${item.id || item.name}-${index}`}>
                <FanAvatar name={item.name} size="h-10 w-10" src={item.avatar} />
                <span className="world-walker-copy">
                  <b>{item.name}</b>
                  <small>{item.action}{item.suffix ? ` ${item.suffix}` : ""} · {item.time}</small>
                </span>
                {item.hot ? <span className="world-walker-status">{PLANET} premium interest</span> : <span className="world-walker-status-placeholder" />}
                <button aria-label={`Message ${item.name}`} className="world-walker-message" onClick={() => onMessage(item)} type="button"><FiMessageCircle /></button>
              </article>
            ))}
          </div>
        )}
        <p className="world-walkers-note">Only you see this — like story viewers. Visitors know the creator sees them.</p>
      </section>
    </BottomSheet>
  );
}

function shareUrlFor(publication) {
  const route = publication?.kind === "EXPERIENCE" ? "experience" : "world";
  return `${window.location.origin}/${route}/${publication?.id || publication?._id}`;
}

const SHARE_REACTIONS = ["💖", "😂", "🔥", "😍", "👏", "😮", "🙏", "🤝"];

function WorldSharePerson({ onToggle, person, selected }) {
  const name = person.displayName || person.name || person.username || "Atseen";
  const badges = ["👁", "🏃", "🏠", "☕", "✈"];
  const badge = person.statusEmoji || badges[Math.abs(String(person.id || name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % badges.length];
  return (
    <button aria-label={`${selected ? "Remove" : "Send to"} ${name}`} aria-pressed={selected} className={selected ? "is-selected" : ""} onClick={() => onToggle(person)} type="button">
      <span className="world-share-avatar">
        <FanAvatar name={name} size="h-[62px] w-[62px]" src={person.avatarUrl || person.avatar} />
        <i aria-hidden="true">{selected ? <FiCheck /> : badge}</i>
      </span>
      <b>{firstName({ displayName: name })}</b>
    </button>
  );
}

function WorldShareAction({ children, label, onClick }) {
  return (
    <button onClick={onClick} type="button">
      <span>{children}</span>
      <b>{label}</b>
    </button>
  );
}

function ShareSheet({ onClose, publication, viewerId }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const { showToast } = useFanToast();
  const url = shareUrlFor(publication);
  const recipients = useShareRecipients({ enabled: true, query: search, viewerId });
  const sendMutation = useSendSharedContent();
  const selectedRecipients = useMemo(() => [...selected.values()], [selected]);
  const sharedContent = useMemo(() => ({
    contentType: publication?.kind === "EXPERIENCE" ? "experience" : "world",
    contentId: String(publication?.id || publication?._id || ""),
    title: publication?.title || "World",
  }), [publication]);
  const toggleRecipient = (person) => {
    setSent(false);
    setSendError("");
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(person.id)) next.delete(person.id);
      else next.set(person.id, person);
      return next;
    });
  };
  const addReaction = (emoji) => {
    setSent(false);
    setSendError("");
    setMessage((current) => current ? `${emoji} ${current}`.slice(0, 2000) : `${emoji} `);
  };
  const send = async (event) => {
    event.preventDefault();
    if (!selectedRecipients.length || !sharedContent.contentId || sendMutation.isPending) return;
    setSendError("");
    try {
      const data = await sendMutation.mutateAsync({ message: message.trim(), recipients: selectedRecipients, sharedContent });
      if (data.failed?.length) {
        const messageText = data.sent?.length ? "Some shares could not be sent." : data.failed[0]?.message || "Could not send this share.";
        setSendError(messageText);
        showToast(messageText);
        return;
      }
      showToast(`Sent to ${selectedRecipients.map((item) => firstName({ displayName: item.displayName || item.name || item.username })).join(", ")}.`);
      setMessage("");
      setSent(true);
    } catch (requestError) {
      const messageText = requestError?.response?.data?.message || "Could not send this share.";
      setSendError(messageText);
      showToast(messageText);
    }
  };
  const copy = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast("World link copied.");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("Could not copy this link.");
      showToast("Could not copy the world link.");
    }
  };
  const shareToStory = async () => {
    await copy();
    showToast("Link copied - add it to your story.");
  };
  const shareWhatsApp = () => {
    const text = `Check this out on @seen: ${publication?.title || "World"} ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    showToast("Opening WhatsApp...");
  };
  const shareSnapchat = async () => {
    await copy();
    showToast("Link copied - paste it into Snapchat.");
  };
  const more = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share({ title: publication?.title || "World", url }); }
    catch (requestError) { if (requestError?.name !== "AbortError") showToast("Could not open sharing."); }
  };
  const visiblePeople = (recipients.data || []).slice(0, 8);
  return (
    <BottomSheet labelledBy="world-share-title" onClose={onClose}>
      <section className="world-share-sheet">
        <header>
          <h2 id="world-share-title">Send to</h2>
          <p>{publication?.title || "World"}</p>
        </header>
        <label className="world-share-search">
          <FiSearch aria-hidden="true" />
          <input autoComplete="off" onChange={(event) => setSearch(event.target.value)} placeholder="Search" value={search} />
        </label>
        <div className="world-share-people">
          {recipients.isLoading ? Array.from({ length: 8 }).map((_, index) => <span className="world-share-person-skeleton" key={index} />) : null}
          {!recipients.isLoading && visiblePeople.map((person) => <WorldSharePerson key={person.id} onToggle={toggleRecipient} person={person} selected={selected.has(person.id)} />)}
        </div>
        {!recipients.isLoading && !visiblePeople.length ? <p className="world-share-empty">No people found.</p> : null}
        {selectedRecipients.length ? (
          <form className="world-share-message-panel" onSubmit={send}>
            <div className="world-share-reactions">
              {SHARE_REACTIONS.map((emoji) => <button aria-label={`Add ${emoji}`} key={emoji} onClick={() => addReaction(emoji)} type="button">{emoji}</button>)}
            </div>
            <div className="world-share-message-row">
              <input maxLength={2000} onChange={(event) => { setSent(false); setSendError(""); setMessage(event.target.value); }} placeholder="Write a message..." value={message} />
              <button className={sent ? "is-sent" : ""} disabled={sendMutation.isPending || !selectedRecipients.length || sent} type="submit">{sendMutation.isPending ? "Sending" : sent ? "Sent" : "Send"}</button>
            </div>
            {sent ? <p className="world-share-sent" role="status"><FiCheck /> Sent</p> : null}
            {sendError ? <p className="world-share-send-error" role="alert">{sendError}</p> : null}
          </form>
        ) : (
          <div className="world-share-actions">
            <WorldShareAction label="Story" onClick={shareToStory}><FiPlusCircle /></WorldShareAction>
            <WorldShareAction label={copied ? "Copied" : "Copy link"} onClick={copy}>{copied ? <FiCheck /> : <FiCopy />}</WorldShareAction>
            <WorldShareAction label="WhatsApp" onClick={shareWhatsApp}><FaWhatsapp /></WorldShareAction>
            <WorldShareAction label="Snapchat" onClick={shareSnapchat}><FaSnapchatGhost /></WorldShareAction>
            <WorldShareAction label="More" onClick={more}><FiMoreHorizontal /></WorldShareAction>
          </div>
        )}
        {error ? <p className="world-sheet-error">{error}</p> : null}
      </section>
    </BottomSheet>
  );
}

function StoryUploadSheet({ error, onClose, onPick }) {
  const inputRef = useRef(null);
  return (
    <BottomSheet labelledBy="world-story-upload-title" onClose={onClose}>
      <section className="world-story-upload-sheet">
        <h2 id="world-story-upload-title">New story</h2>
        <p>15 sec · seen before purchase, blurred</p>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onPick(file); }} ref={inputRef} type="file" />
        <button className="world-story-upload-choice" onClick={() => inputRef.current?.click()} type="button">
          <FiUpload />
          <span><b>Upload</b><small>photo · 15 sec</small></span>
        </button>
        {error ? <p className="world-sheet-error">{error}</p> : null}
      </section>
    </BottomSheet>
  );
}

function WorldStorySharePreview({ busy, error, onClose, onShare, progress, url }) {
  return (
    <div aria-label="Preview World story" aria-modal="true" className="world-story-share-preview" role="dialog">
      <img alt="Selected story preview" src={url} />
      <button aria-label="Close story preview" className="world-story-preview-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
      <span className="world-story-preview-duration">15s</span>
      <button aria-label="Edit story" className="world-story-preview-tool" disabled type="button"><FiEdit3 /></button>
      <button aria-label="Story help" className="world-story-preview-help" disabled type="button">?</button>
      <div className="world-story-preview-gallery"><FiImage /></div>
      <button className="world-story-preview-audience" disabled type="button">Everyone</button>
      <button className="world-story-preview-share" disabled={busy} onClick={onShare} type="button">{busy ? `Sharing ${progress || 0}%` : "Share"}</button>
      {error ? <p className="world-story-preview-error">{error}</p> : null}
    </div>
  );
}

function WorldStoryViewer({ creator, onClose, story, title }) {
  useEffect(() => {
    if (!story?.secureUrl) return undefined;
    const timer = window.setTimeout(onClose, 15000);
    return () => window.clearTimeout(timer);
  }, [onClose, story?.secureUrl]);

  if (!story?.secureUrl) return null;
  const isVideo = story.resourceType === "video" || story.type === "VIDEO";
  const creatorName = creator?.name || creator?.username || "Creator";
  const avatar = creator?.avatar || creator?.avatarUrl || creator?.profileImage || creator?.photoUrl || "";
  return (
    <div aria-label="World story" aria-modal="true" className="world-story-share-preview is-viewing" role="dialog">
      {isVideo
        ? <video autoPlay muted playsInline src={story.secureUrl} />
        : <img alt={story.title || "World story"} src={story.secureUrl} />}
      <div aria-hidden="true" className="world-story-viewer-progress"><span /></div>
      <header className="world-story-viewer-head">
        <span className="world-story-viewer-avatar">
          {avatar ? <img alt="" src={avatar} /> : <FiImage />}
        </span>
        <span>
          <b>{creatorName}</b>
          <small>{story.title || title || "Story"}</small>
        </span>
      </header>
      <button aria-label="Close story" className="world-story-preview-close" onClick={onClose} type="button"><FiX /></button>
    </div>
  );
}

function ChapterBlock({ block }) {
  if (["TEXT", "HIGHLIGHT", "KEY_POINT"].includes(block.type)) return <p className={`world-chapter-reader-text ${block.type === "HIGHLIGHT" ? "is-highlight" : ""}`}>{block.text}</p>;
  if (block.type === "IMAGE" && block.media?.secureUrl) return <img alt="Chapter attachment" className="world-chapter-reader-image" src={block.media.secureUrl} />;
  if (block.type === "VIDEO" && block.media?.secureUrl) return <video className="world-chapter-reader-video" controls playsInline preload="metadata" src={block.media.secureUrl} />;
  if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) return <audio className="world-chapter-reader-audio" controls preload="metadata" src={block.media.secureUrl} />;
  if (block.type === "LINK" && block.url) return <a className="world-chapter-reader-link" href={block.url} rel="noreferrer" target="_blank">{block.label || "Open link"}</a>;
  return null;
}

function ChapterExperience({ chapter, chapterIndex, chapters, onBack, onSelect }) {
  const blocks = [...(chapter.blocks || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return (
    <article className="world-chapter-reader">
      <header className="world-chapter-reader-head">
        <button aria-label="Back to World" onClick={onBack} type="button"><FiArrowLeft /></button>
        <div><small>Chapter {chapterIndex + 1} of {chapters.length}</small><h1>{chapter.title || `Chapter ${chapterIndex + 1}`}</h1></div>
      </header>
      <nav aria-label="Chapter progress" className="world-chapter-reader-progress">
        {chapters.map((item, index) => <button aria-label={`Open chapter ${index + 1}`} className={index === chapterIndex ? "is-current" : ""} key={item.stableChapterId || index} onClick={() => onSelect(index)} type="button" />)}
      </nav>
      <section className="world-chapter-reader-content">
        {blocks.length ? blocks.map((block, index) => <ChapterBlock block={block} key={block.id || index} />) : <p className="world-chapter-reader-empty">This chapter has no published content yet.</p>}
      </section>
    </article>
  );
}

export default function WorldReaderPage() {
  const { id } = useParams();
  const { loading: authLoading, user } = useAuth();
  const { showToast } = useFanToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [commentPostPending, setCommentPostPending] = useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = useState(null);
  const [experienceChaptersOpen, setExperienceChaptersOpen] = useState(true);
  const [experienceSettingsOpen, setExperienceSettingsOpen] = useState(false);
  const [tagPeopleOpen, setTagPeopleOpen] = useState(false);
  const [sheet, setSheet] = useState(new URLSearchParams(location.search).get("worldPanel") || "");
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [showExperienceUnlock, setShowExperienceUnlock] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [commentSavePending, setCommentSavePending] = useState("");
  const [experienceBusyId, setExperienceBusyId] = useState("");
  const [optimisticPlanetFaceEmoji, setOptimisticPlanetFaceEmoji] = useState("");
  const [optimisticFirstMonthOfferEnabled, setOptimisticFirstMonthOfferEnabled] = useState(null);
  const [optimisticCommentsEnabled, setOptimisticCommentsEnabled] = useState(null);
  const [introPriceToast, setIntroPriceToast] = useState("");
  const [commentStatusToast, setCommentStatusToast] = useState("");
  const [storyDraft, setStoryDraft] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyUploadError, setStoryUploadError] = useState("");
  const [storyUploadSheetOpen, setStoryUploadSheetOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [quickChapterStep, setQuickChapterStep] = useState("");
  const [quickChapterTitle, setQuickChapterTitle] = useState("");
  const [quickChapterSaving, setQuickChapterSaving] = useState(false);
  const [quickChapterError, setQuickChapterError] = useState("");
  const [worldSettingsOpen, setWorldSettingsOpen] = useState(false);
  const [walkersOpen, setWalkersOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState(null);
  const [removeModerator, setRemoveModerator] = useState(null);
  const query = useQuery({ queryKey: ["world", id], queryFn: () => api.getPublicPublication(id).then((response) => response.data.data.publication), retry: false });
  const memberships = useQuery({ queryKey: ["memberships"], queryFn: () => walletService.getMemberships().then((response) => response.data.data.items), enabled: Boolean(user), retry: false });
  const engagement = useQuery({ queryKey: ["world-engagement", id], queryFn: () => api.getSeenEngagement(id).then((response) => response.data.data.engagement), retry: false });

  const publication = query.data;
  const publicationId = publication?.id || publication?._id;
  const chapters = useMemo(() => publication?.chapters || [], [publication]);
  const premium = publication?.kind === "PREMIUM_WORLD";
  const experience = publication?.kind === "EXPERIENCE";
  const creator = publication?.creator || {};
  const viewerId = user?.id || user?._id || "";
  const creatorId = creator.id || creator._id || publication?.creatorId || "";
  const owner = sameIdentity(viewerId, creatorId) || sameIdentity(user?.username, creator.username);
  const managementQuery = useQuery({
    queryKey: ["world-management", publicationId],
    queryFn: () => api.getWorldManagement(publicationId).then((response) => response.data.data),
    enabled: Boolean(owner && publicationId),
    retry: false,
  });
  const ownerExperiences = useQuery({
    queryKey: ["world-owner-experiences", publicationId],
    queryFn: () => api.listMyPublications({ kind: "EXPERIENCE", limit: 30 }).then((response) => response.data.data.items || []),
    enabled: Boolean(owner && publicationId && !experience && sheet === "include"),
    retry: false,
  });
  const walkersQuery = useQuery({
    queryKey: ["world-walkers", publicationId],
    queryFn: () => api.listWorldWalkers(publicationId, { limit: 20 }).then((response) => response.data.data),
    enabled: Boolean(owner && publicationId && walkersOpen && !experience),
    retry: false,
  });
  const moderatorCandidates = useQuery({
    queryKey: ["world-moderator-candidates", publicationId],
    queryFn: () => api.getWorldModeratorCandidates(publicationId).then((response) => response.data.data.candidates || []),
    enabled: Boolean(owner && publicationId && (sheet === "moderators" || (experience && experienceSettingsOpen && tagPeopleOpen))),
    retry: false,
  });
  const pricingQuery = useQuery({
    queryKey: ["world-pricing", publicationId],
    queryFn: () => api.getWorldPricing(publicationId).then((response) => response.data.data.pricing),
    enabled: Boolean(owner && publicationId && sheet === "price" && premium),
    retry: false,
  });

  const management = managementQuery.data?.management || {};
  const managedPublication = managementQuery.data?.publication || publication;
  const experienceChapters = managedPublication?.chapters?.length ? managedPublication.chapters : chapters;
  const updateWorld = useMutation({
    mutationFn: (payload) => api.updateWorldManagement(publicationId, payload),
    onMutate: (payload) => {
      if (payload?.planetFaceEmoji) setOptimisticPlanetFaceEmoji(payload.planetFaceEmoji);
      if (payload && "firstMonthOfferEnabled" in payload) setOptimisticFirstMonthOfferEnabled(Boolean(payload.firstMonthOfferEnabled));
    },
    onError: (_error, payload) => {
      if (payload?.planetFaceEmoji) setOptimisticPlanetFaceEmoji("");
      if (payload && "firstMonthOfferEnabled" in payload) setOptimisticFirstMonthOfferEnabled(null);
      if (payload && "commentsEnabled" in payload) {
        setOptimisticCommentsEnabled(null);
        setCommentStatusToast("");
        showToast(_error?.response?.data?.message || "World comments setting could not be updated.");
      }
    },
    onSuccess: async (response, payload) => {
      const nextEmoji = planetFaceEmoji(response?.data?.data?.publication?.planet);
      if (nextEmoji) setOptimisticPlanetFaceEmoji(nextEmoji);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world", id] }),
        queryClient.invalidateQueries({ queryKey: ["world-management", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      setOptimisticFirstMonthOfferEnabled(null);
      setOptimisticCommentsEnabled(null);
      if (payload && "commentsEnabled" in payload) {
        setCommentStatusToast(payload.commentsEnabled ? "Comments on" : "Comments off");
      }
      setSheet("");
    },
  });
  const updateWorldPrice = useMutation({
    mutationFn: (monthlyStars) => api.updateWorldPricing(publicationId, monthlyStars),
    onSuccess: async (response) => {
      const payload = response?.data?.data;
      if (payload?.publication || payload?.management) {
        queryClient.setQueryData(["world-management", publicationId], { publication: payload.publication, management: payload.management });
      }
      if (payload?.pricing) queryClient.setQueryData(["world-pricing", publicationId], payload.pricing);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world", id] }),
        queryClient.invalidateQueries({ queryKey: ["world-management", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["world-pricing", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["world-owner-experiences", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      showToast("World price updated.");
      setSheet("");
    },
    onError: (error) => showToast(error?.response?.data?.message || "World price could not be updated."),
  });
  const archiveExperience = useMutation({
    mutationFn: () => api.archivePublication(publicationId, managedPublication.statusVersion),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      showToast("Experience removed from sale.");
      navigate(creator.username ? `/profile/${creator.username}` : "/profile", { replace: true });
    },
    onError: (error) => showToast(error?.response?.data?.message || "Experience could not be removed from sale."),
  });
  const coverUpload = useMutation({
    mutationFn: (file) => api.uploadWorldCover(publicationId, file, setCoverProgress),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      setSheet("");
      setCoverProgress(0);
    },
  });
  const waveMutation = useMutation({ mutationFn: () => api.openWorldWave(publicationId), onSuccess: () => managementQuery.refetch() });
  const moderatorAdd = useMutation({
    mutationFn: (userId) => api.addWorldModerator(publicationId, userId),
    onSuccess: async (_response, userId) => {
      await Promise.all([
        managementQuery.refetch(),
        moderatorCandidates.refetch(),
        queryClient.invalidateQueries({ queryKey: ["world", id] }),
      ]);
      setSelectedModerator(null);
      const added = moderatorCandidates.data?.find((item) => String(item.id) === String(userId));
      showToast(`${added?.displayName || added?.name || "Moderator"} added.`);
    },
    onError: (error) => showToast(error?.response?.data?.message || "Moderator could not be added."),
  });
  const moderatorRemove = useMutation({
    mutationFn: (userId) => api.removeWorldModerator(publicationId, userId),
    onSuccess: async () => {
      await Promise.all([managementQuery.refetch(), moderatorCandidates.refetch()]);
      showToast("Moderator removed.");
      setRemoveModerator(null);
    },
    onError: (error) => showToast(error?.response?.data?.message || "Moderator could not be removed."),
  });
  const storyUpload = useMutation({
    mutationFn: ({ file }) => api.uploadWorldStory(publicationId, file, { label: "Story" }, setStoryProgress),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      setStoryDraft((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return null;
      });
      setStoryProgress(0);
      setStoryUploadError("");
    },
    onError: (error) => {
      setStoryUploadError(error?.response?.data?.message || error?.message || "Could not upload this story.");
      setStoryProgress(0);
    },
  });

  useEffect(() => () => {
    if (storyDraft?.url) URL.revokeObjectURL(storyDraft.url);
  }, [storyDraft?.url]);

  useEffect(() => {
    if (!introPriceToast) return undefined;
    const timer = window.setTimeout(() => setIntroPriceToast(""), 1600);
    return () => window.clearTimeout(timer);
  }, [introPriceToast]);

  useEffect(() => {
    if (!commentStatusToast) return undefined;
    const timer = window.setTimeout(() => setCommentStatusToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [commentStatusToast]);

  if (authLoading || query.isLoading) return <div className="world-prototype-state">Opening World...</div>;
  if (query.isError || !publication) return <div className="world-prototype-state"><h1>World unavailable</h1><p>It may be unpublished, archived, or missing.</p></div>;

  const canViewMemberContent = owner || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_EXPERIENCE"].includes(publication?.access);
  if (premium && !owner && !canViewMemberContent) {
    return (
      <article className="premium-locked-page">
        <JoinPremiumModal
          authenticated={Boolean(user)}
          onClose={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
          onRequireAuth={() => navigate("/login", { state: { from: { pathname: location.pathname } } })}
          onSuccess={async () => { await Promise.all([query.refetch(), memberships.refetch()]); setShowPremiumWelcome(true); }}
          open
          publication={publication}
        />
      </article>
    );
  }

  if (activeChapterIndex !== null && experienceChapters[activeChapterIndex]) {
    return <ChapterExperience chapter={experienceChapters[activeChapterIndex]} chapterIndex={activeChapterIndex} chapters={experienceChapters} onBack={() => setActiveChapterIndex(null)} onSelect={setActiveChapterIndex} />;
  }

  const stories = storyItems(managedPublication, chapters);
  const seat = management.seatStatus || {};
  const residents = Number(seat.occupiedSeats ?? management.analytics?.residents ?? 0);
  const capacity = Number(seat.capacity || 0);
  const seatProgress = capacity ? Math.min(100, Math.round((residents / capacity) * 100)) : 0;
  const steppedInside = Number(management.analytics?.views || managedPublication?.viewCount || managedPublication?.views || publication?.viewCount || publication?.views || residents || 0);
  const priceStars = Number(managedPublication?.pricing?.starsAmount || management.subscription?.priceStars || 0);
  const faceEmoji = optimisticPlanetFaceEmoji || planetFaceEmoji(managedPublication.planet);
  const includedExperiences = management.includedExperiences || [];
  const activeMembership = memberships.data?.find((item) => String(item.premiumPublication?._id || item.premiumPublication?.id) === String(publicationId));
  const commentsEnabled = optimisticCommentsEnabled ?? (managedPublication?.commentsEnabled !== false && management.comments?.enabled !== false);
  const firstMonthOfferEnabled = optimisticFirstMonthOfferEnabled ?? Boolean(management.subscription?.firstMonthOfferEnabled);

  const addComment = async (event) => {
    event.preventDefault();
    const value = comment.trim();
    if (!value || commentPostPending) return;
    setCommentPostPending(true);
    try {
      await api.commentOnSeen(publicationId, value);
      setComment("");
      engagement.refetch();
    } catch (error) {
      if (error?.response?.data?.code === "WORLD_COMMENTS_DISABLED") {
        setOptimisticCommentsEnabled(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["world", id] }),
          queryClient.invalidateQueries({ queryKey: ["world-management", publicationId] }),
        ]);
      }
      showToast(error?.response?.data?.message || "Comment could not be posted.");
    } finally {
      setCommentPostPending(false);
    }
  };

  const toggleCommentSave = async (targetComment) => {
    if (!targetComment?.id || commentSavePending) return;
    setCommentSavePending(targetComment.id);
    try {
      const action = targetComment.viewerSaved ? savedService.unsaveComment : savedService.saveComment;
      const response = await action(targetComment.id);
      const nextSaved = Boolean(response.data?.data?.saved);
      queryClient.setQueryData(["world-engagement", id], (current) => current ? {
        ...current,
        comments: (current.comments || []).map((item) => item.id === targetComment.id ? { ...item, viewerSaved: nextSaved } : item),
      } : current);
    } finally {
      setCommentSavePending("");
    }
  };

  const toggleExperience = async (experienceId, included) => {
    setExperienceBusyId(experienceId);
    try {
      const response = included
        ? await api.removeWorldExperience(publicationId, experienceId)
        : await api.includeWorldExperience(publicationId, experienceId);
      const payload = response?.data?.data;
      if (payload?.publication || payload?.management) {
        queryClient.setQueryData(["world-management", publicationId], {
          publication: payload.publication,
          management: payload.management,
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["world", id] }),
        queryClient.invalidateQueries({ queryKey: ["world-management", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["world-owner-experiences", publicationId] }),
      ]);
      setSheet("");
      setCommentStatusToast(included ? "Removed from the World" : "Included ✓ — members get it free");
    } catch (error) {
      showToast(error?.response?.data?.message || "Experience could not be updated.");
    } finally {
      setExperienceBusyId("");
    }
  };

  const pickStoryFile = (file) => {
    setStoryUploadError("");
    setStoryUploadSheetOpen(false);
    setStoryDraft((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const closeStoryDraft = () => {
    if (storyUpload.isPending) return;
    setStoryDraft((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setStoryUploadError("");
    setStoryProgress(0);
  };

  const resetQuickChapterFlow = () => {
    setQuickChapterStep("");
    setQuickChapterTitle("");
    setQuickChapterError("");
  };

  const startQuickChapterFlow = () => {
    setQuickChapterTitle("");
    setQuickChapterError("");
    setQuickChapterStep("name");
  };

  const saveQuickChapter = async () => {
    const title = quickChapterTitle.trim().replace(/\s+/g, " ");
    if (!title) {
      setQuickChapterError("Name this chapter first.");
      setQuickChapterStep("name");
      return;
    }
    setQuickChapterSaving(true);
    setQuickChapterError("");
    try {
      let editable = await api.getMyPublication(publicationId).then((response) => response.data.data.publication);
      if (editable.status === "PUBLISHED") {
        editable = await api.startPublishedRevision(publicationId, editable.statusVersion).then((response) => response.data.data.publication);
      }
      const added = await api.addChapter(publicationId, {
        blocks: [],
        isPreview: editable.pricing?.mode === "FREE",
        releaseMode: "IMMEDIATE",
        statusVersion: editable.statusVersion,
        title,
      }).then((response) => response.data.data.chapter);
      resetQuickChapterFlow();
      navigate(`/studio/experiences/${publicationId}/edit?chapter=${encodeURIComponent(added.stableChapterId)}`);
    } catch (error) {
      setQuickChapterError(error?.response?.data?.message || error?.message || "Chapter could not be added.");
    } finally {
      setQuickChapterSaving(false);
    }
  };

  const toggleIntroPrice = () => {
    const nextEnabled = !firstMonthOfferEnabled;
    setIntroPriceToast(nextEnabled ? "Intro price is live ✓" : "Intro price off");
    updateWorld.mutate({ firstMonthOfferEnabled: nextEnabled });
  };

  const toggleCommentsEnabled = () => {
    const nextEnabled = !commentsEnabled;
    updateWorld.mutate({ commentsEnabled: nextEnabled });
  };

  const completeWorld = async () => {
    if (user && publicationId) await api.markWorldWalked(publicationId).catch(() => null);
    navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : "/seen");
  };
  const experiencePriceLabel = managedPublication.pricing?.mode === "FREE"
    ? "Free Experience · every chapter is open"
    : `Premium Experience · ${STAR}${priceStars || managedPublication.pricing?.starsAmount || 0} · one-time`;

  if (experience && owner && sheet === "actions") return (
    <article className="experience-actions-page">
      <header>
        <button aria-label="Back to Experience" onClick={() => setSheet("")} type="button"><FiArrowLeft /></button>
        <h1>{managedPublication.title}</h1>
        <p>{managedPublication.pricing?.mode === "FREE" ? "Free Experience" : `Premium Experience · ${STAR}${priceStars || managedPublication.pricing?.starsAmount || 0} · one-time`}</p>
      </header>
      <nav aria-label="Experience actions">
        <button onClick={() => setSheet("share")} type="button"><FiShare2 /><span><b>Share</b></span></button>
        <button onClick={async () => { await navigator.clipboard.writeText(window.location.href); showToast("Experience link copied."); }} type="button"><FiLink /><span><b>Access by link</b><small>send a link — you confirm who enters</small></span></button>
        <button onClick={() => navigate(`/studio/experiences/${publicationId}/edit`)} type="button"><FiEdit3 /><span><b>Edit</b><small>title, path, price, chapters</small></span></button>
        <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>Change cover</b></span></button>
        <button disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? "Turn comments off" : "Turn comments on"}</b></span></button>
        <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>Moderators</b><small>this product’s own cleanup team</small></span></button>
        <button className="is-remove" disabled={archiveExperience.isPending} onClick={() => window.confirm("Remove this Experience from sale? Buyers keep their permanent access.") && archiveExperience.mutate()} type="button"><FiTrash2 /><span><b>{archiveExperience.isPending ? "Removing…" : "Remove from sale"}</b><small>buyers keep it forever</small></span></button>
      </nav>
    </article>
  );

  return (
    <>
      <article className={`world-prototype-page ${experience ? "is-experience-detail" : ""}`}>
        <header className="world-prototype-top">
          <button aria-label="Back to profile" onClick={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)} type="button"><FiArrowLeft /></button>
          <div>
            {owner ? <button aria-label="Open world analytics" onClick={() => setSheet("analytics")} type="button"><FiBarChart2 /></button> : null}
            <button aria-label="Share world" onClick={() => setSheet("share")} type="button"><FiArrowUpRight /></button>
            {owner ? <button aria-label="More world actions" onClick={() => setSheet("actions")} type="button"><FiMoreHorizontal /></button> : null}
          </div>
        </header>

        {!experience ? (
          <section className="world-prototype-planet">
            {commentStatusToast ? <div className="world-comment-status-pill" role="status">{commentStatusToast}</div> : null}
            <button aria-label={owner ? "Change planet face" : "World icon"} onClick={() => owner && setSheet("face")} type="button">
              <span>{faceEmoji}</span>
              <span>{PLANET}</span>
            </button>
          </section>
        ) : null}

        {experience ? (
          <section className="experience-detail-cover">
            {managedPublication.coverMedia?.secureUrl ? <img alt={`${managedPublication.title} cover`} src={managedPublication.coverMedia.secureUrl} /> : <span>{PLANET}</span>}
            {owner ? (
              <div>
                <button onClick={() => chapters[0] && setActiveChapterIndex(0)} type="button"><FiSearch /> Preview</button>
                <button onClick={() => setSheet("cover")} type="button"><FiEdit3 /> Cover</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (
          <section className="world-prototype-owner-stories">
            <div className="world-prototype-owner-story-head"><h2>Stories</h2><span>up to 3 · seen before purchase</span></div>
            <div className="world-prototype-owner-story-row">
              {stories.map((story, index) => (
                <button className="world-prototype-owner-story-thumb" key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => setActiveStory(story)} type="button">
                  {story.resourceType === "video" ? <video muted playsInline src={story.secureUrl} /> : <img alt={story.title || "World story"} src={story.secureUrl} />}
                </button>
              ))}
              {owner && stories.length < 3 ? <button aria-label="Add a free preview story" className="world-prototype-owner-story-add" onClick={() => setStoryUploadSheetOpen(true)} type="button"><FiPlus /><span>add</span></button> : null}
            </div>
          </section>
        ) : null}

        {experience ? (
          <section className={`experience-detail-settings-panel ${experienceSettingsOpen ? "is-open" : ""}`}>
            <button aria-expanded={experienceSettingsOpen} className="experience-detail-settings" onClick={() => owner && setExperienceSettingsOpen((open) => !open)} type="button">
              <span><FiSettings /> Settings</span>
              <FiChevronRight />
            </button>
            {owner && experienceSettingsOpen ? (
              <div className="experience-detail-settings-list">
                <button onClick={() => setStoryUploadSheetOpen(true)} type="button"><FiPlus /><span>Add to your story</span></button>
                <button disabled={updateWorld.isPending} onClick={() => updateWorld.mutate({ allowDownload: !managedPublication.allowDownload })} type="button"><FiUpload /><span>Allow download</span><b>{managedPublication.allowDownload ? "✓" : "Off"}</b></button>
                <button aria-expanded={tagPeopleOpen} onClick={() => setTagPeopleOpen((open) => !open)} type="button"><FiUserPlus /><span>Tag people</span><b>{managedPublication.taggedPeople?.length || "None"}</b></button>
                {tagPeopleOpen ? <div className="experience-tag-people-list">
                  {moderatorCandidates.isLoading ? <small>Loading people…</small> : (moderatorCandidates.data || []).map((person) => {
                    const personId = String(person.id || person._id);
                    const selected = (managedPublication.taggedPeople || []).map(String).includes(personId);
                    return <button className={selected ? "is-selected" : ""} disabled={updateWorld.isPending} key={personId} onClick={() => updateWorld.mutate({ taggedPeople: selected ? managedPublication.taggedPeople.filter((taggedId) => String(taggedId) !== personId) : [...(managedPublication.taggedPeople || []), personId] })} type="button"><FanAvatar user={person} /><span><b>{person.name || person.username}</b><small>@{person.username}</small></span><i>{selected ? "✓" : "+"}</i></button>;
                  })}
                </div> : null}
                <button className="is-danger-muted" disabled={archiveExperience.isPending} onClick={() => window.confirm("Remove this Experience from sale?") && archiveExperience.mutate()} type="button"><FiArchive /><span>{archiveExperience.isPending ? "Removing…" : "Remove from sale"}</span></button>
                <button className="experience-premium-world-setting" disabled={updateWorld.isPending} onClick={() => updateWorld.mutate({ includedInWorld: !managedPublication.includedInWorld })} type="button">
                  <i>{PLANET}</i>
                  <span><strong>Include in my Premium World</strong><small>World members get it with their subscription</small></span>
                  <b>{managedPublication.includedInWorld ? "✓" : "Off"}</b>
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (
          <section className="world-prototype-creator">
            <button className="world-prototype-walkers-trigger" disabled={!owner} onClick={() => owner && setWalkersOpen(true)} type="button">
              {creator.name || creator.username || "Creator"} <b>✓</b> · <strong>{steppedInside.toLocaleString()}</strong> stepped inside
            </button>
            <span>{creator.name || creator.username || "Creator"} <b>✓</b> · <strong>{residents.toLocaleString()}</strong> residents</span>
            <button className="world-prototype-seat-row" onClick={() => owner && setSheet("seats")} type="button">
              <i><u style={{ width: `${seatProgress}%` }} /></i>
              <small>{capacity ? `${residents.toLocaleString()} / ${capacity.toLocaleString()} seats` : `${residents.toLocaleString()} seats`} {priceStars ? `· ${STAR}${priceStars}/mo` : ""}{seat.waitingListAvailable && seat.waitingListCount ? ` · queue ${seat.waitingListCount}` : ""}</small>
            </button>
          </section>
        ) : null}

        {experience ? (
          <p className="experience-detail-creator">{creator.name || creator.username || "Creator"} <b>✓</b> · <span>{managedPublication.category || "New world"}</span></p>
        ) : null}

        {experience ? <button className="world-prototype-premium-pill is-experience" type="button">{experiencePriceLabel}</button> : null}

        {!experience ? (
          <button className="world-prototype-premium-pill" onClick={() => owner && setSheet("price")} type="button">
          {experience ? (managedPublication.pricing?.mode === "FREE" ? "Free Experience · every chapter is open" : `Premium Experience · all chapters unlock for ${STAR}${priceStars} once`) : `${PLANET} ${premium ? "Premium World" : "Free World"} · ${management.stories?.freePreviewCount || 1} free chapter${priceStars ? ` · ${STAR}${priceStars}/mo` : ""}`}
          {owner && !experience ? <FiEdit3 /> : null}
        </button>
        ) : null}

        <div className="world-prototype-title-row">
          {owner && !experience ? (
            <button aria-label="Edit world name" className="world-prototype-title-button" onClick={() => setSheet("name")} type="button">
              <span className="world-prototype-title">{managedPublication.title}</span>
              <FiEdit3 />
            </button>
          ) : <h1 className="world-prototype-title">{managedPublication.title}</h1>}
        </div>

        {experience ? <p className="experience-detail-description">{managedPublication.description || managedPublication.summary}</p> : null}

        {!experience ? (
          <section className="world-prototype-owner-settings">
            <button className="world-prototype-direct-access" onClick={() => navigate("/messages?tab=direct")} type="button">
              <span><FiZap /></span>
              <b>Direct Access</b>
              <small>members first · {management.directAccess?.includedReplies || 0} free reply included</small>
              <i><FiChevronRight /></i>
            </button>
            <button
              aria-controls="world-settings-list"
              aria-expanded={worldSettingsOpen}
              className={`world-prototype-settings-row ${worldSettingsOpen ? "is-expanded" : ""}`}
              onClick={() => owner && setWorldSettingsOpen((open) => !open)}
              type="button"
            >
              <FiSettings />
              <b>World settings</b>
              <FiChevronRight className="world-settings-chevron" />
            </button>
            {owner && worldSettingsOpen ? (
              <div className="world-settings-list" id="world-settings-list">
                <p>INSIDE YOUR WORLD</p>
                {introPriceToast ? <div className="world-settings-toast" role="status">{introPriceToast}</div> : null}
                <Link className="world-settings-item is-complete" to={`/studio/worlds/${publicationId}/edit`}>
                  <span className="world-settings-status"><FiCheck /></span>
                  <span className="world-settings-copy"><b>Private stories</b><small>1 · 15s — fans see them blurred outside</small></span>
                </Link>
                <button className="world-settings-item is-add" onClick={() => setSheet("include")} type="button">
                  <span className="world-settings-status"><FiPlus /></span>
                  <span className="world-settings-copy"><b>Experiences included</b><small>add one — “included” sells the World</small></span>
                  <FiChevronRight className="world-settings-row-chevron" />
                </button>
                <span className="world-settings-item is-complete">
                  <span className="world-settings-status"><FiCheck /></span>
                  <span className="world-settings-copy"><b>Direct Access for members</b><small>1 free reply / month each · then first in line</small></span>
                </span>
                <span className="world-settings-item is-complete">
                  <span className="world-settings-status"><FiCheck /></span>
                  <span className="world-settings-copy"><b>Price locked for members</b><small>raise it later — early members keep theirs forever</small></span>
                </span>
                <button aria-pressed={firstMonthOfferEnabled} className="world-settings-item is-switch" disabled={updateWorld.isPending} onClick={toggleIntroPrice} type="button">
                  <span className="world-settings-status" />
                  <span className="world-settings-copy"><b>First month -50%</b><small>converts the hesitant — smarter than refunds</small></span>
                  <i aria-hidden="true" className={firstMonthOfferEnabled ? "is-on" : ""}><u /></i>
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (
          <section className="world-prototype-inside">
            <h2>Experiences inside {includedExperiences.length ? <span>{includedExperiences.length}</span> : null}</h2>
            {includedExperiences.length ? includedExperiences.map((item) => (
              <Link className="world-prototype-inside-row" key={item.id} to={`/experience/${item.id}`}>
                <span>{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : PLANET}</span>
                <b>{item.title}</b>
                <small className="world-prototype-inside-meta-clean">{item.chapterCount || 0} chapters{" \u00b7 "}included for members</small>
                <FiChevronRight aria-hidden="true" />
              </Link>
            )) : <p>Attach an experience — members get it with the subscription.</p>}
            {owner ? <button className="world-prototype-include-experience" onClick={() => setSheet("include")} type="button"><FiPlus /> Include an experience</button> : null}
          </section>
        ) : null}

        {experience ? (
          <section className="experience-detail-chapters">
            <header>
              <h2>Experience</h2>
              <span>{experienceChapters.length} chapter{experienceChapters.length === 1 ? "" : "s"} · {managedPublication.pricing?.mode === "FREE" ? "Free" : `${PLANET} Premium`}</span>
            </header>
            {experienceChaptersOpen ? (
              <div className="experience-detail-chapter-list">
                {experienceChapters.map((chapter, index) => {
                  const locked = Boolean(chapter.locked && !owner && !canViewMemberContent);
                  const blocks = chapter.blocks || [];
                  return (
                    <button
                      className="world-prototype-chapter-row"
                      key={chapter.stableChapterId || chapter.id || index}
                      onClick={() => owner
                        ? navigate(`/studio/experiences/${publicationId}/edit?chapter=${encodeURIComponent(chapter.stableChapterId)}`)
                        : locked ? setShowExperienceUnlock(true) : setActiveChapterIndex(index)}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      <span>
                        <b>{chapter.title || `Chapter ${index + 1}`}</b>
                        <small>
                          {owner ? <strong>{blocks.length ? `${blocks.length} item${blocks.length === 1 ? "" : "s"}` : "+ Write the story"}</strong> : null}
                          {owner ? " · " : null}
                          {locked ? <><FiLock /> private</> : <em>{managedPublication.pricing?.mode === "FREE" || chapter.isPreview ? "free preview" : "unlocked"}</em>}
                        </small>
                      </span>
                      <i>›</i>
                    </button>
                  );
                })}
                {!experienceChapters.length ? <p className="experience-detail-empty-chapters">No chapters have been added yet.</p> : null}
                <button className="experience-detail-hide-chapters" onClick={() => setExperienceChaptersOpen(false)} type="button">Hide <FiChevronRight /></button>
              </div>
            ) : (
              <button className="experience-detail-chapter-pill" onClick={() => setExperienceChaptersOpen(true)} type="button">Chapters · {experienceChapters.length || 0} <FiChevronRight /></button>
            )}
            {owner ? <button className="world-prototype-add-chapter" onClick={startQuickChapterFlow} type="button"><FiPlus /> Add a chapter</button> : null}
          </section>
        ) : null}

        <section className="world-prototype-comments">
          <h2>Comments</h2>
          {commentsEnabled ? (
            <form onSubmit={addComment}>
              <input maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment..." value={comment} />
              <button aria-label="Post comment" disabled={!comment.trim() || commentPostPending} type="submit"><FiArrowUp /></button>
            </form>
          ) : <p className="world-prototype-empty-comments"><FiMessageCircle /> Comments are turned off.</p>}
          {engagement.data?.comments?.length ? (
            <div className="world-prototype-comment-list">
              {engagement.data.comments.slice(0, 3).map((item) => (
                <article key={item.id}>
                  <b>{item.author?.name || "Fan"}</b>
                  <p>{item.text}</p>
                  <button aria-label={item.viewerSaved ? "Remove saved comment" : "Save comment"} disabled={commentSavePending === item.id} onClick={() => toggleCommentSave(item)} type="button"><FiBookmark fill={item.viewerSaved ? "currentColor" : "none"} /></button>
                </article>
              ))}
            </div>
          ) : commentsEnabled ? <p className="world-prototype-empty-comments"><FiMessageCircle /> No comments yet.</p> : null}
        </section>

        {!experience && chapters.length ? <button className="world-prototype-complete" onClick={completeWorld} type="button"><FiCheck /> Continue</button> : null}
        {activeMembership ? <p className="world-prototype-membership">Member · window renews {new Date(activeMembership.currentPeriodEnd).toLocaleDateString()} · <Link to="/memberships">Manage</Link></p> : null}
      </article>

      {sheet === "name" ? <NameSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message} onClose={() => setSheet("")} onSave={(payload) => updateWorld.mutate(payload)} publication={managedPublication} /> : null}
      {sheet === "price" ? (
        <PriceSheet
          busy={updateWorldPrice.isPending}
          currentPriceFallback={priceStars}
          error={pricingQuery.error?.response?.data?.message || updateWorldPrice.error?.response?.data?.message}
          loading={pricingQuery.isLoading}
          onClose={() => setSheet("")}
          onSave={(monthlyStars) => updateWorldPrice.mutate(monthlyStars)}
          pricing={pricingQuery.data}
        />
      ) : null}
      {sheet === "seats" ? <SeatsSheet busy={waveMutation.isPending} management={management} onClose={() => setSheet("")} onOpenWave={() => waveMutation.mutate()} /> : null}
      {sheet === "face" ? <PlanetFaceSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message} onClose={() => setSheet("")} onSave={(payload) => updateWorld.mutate(payload)} publication={{ ...managedPublication, planet: { ...(managedPublication.planet || {}), faceEmoji } }} /> : null}
      {sheet === "cover" ? <CoverSheet busy={coverUpload.isPending} error={coverUpload.error?.response?.data?.message} onClose={() => setSheet("")} onUpload={(file) => coverUpload.mutate(file)} progress={coverProgress} publication={managedPublication} /> : null}
      {sheet === "include" ? <IncludeExperienceSheet busyId={experienceBusyId} experiences={ownerExperiences.data || []} included={includedExperiences} onClose={() => setSheet("")} onCreate={() => navigate("/create/experience")} onToggle={toggleExperience} /> : null}
      {sheet === "moderators" ? (
        <ModeratorsSheet
          addError={moderatorAdd.error?.response?.data?.message}
          addPending={moderatorAdd.isPending}
          candidates={moderatorCandidates.data || []}
          candidatesError={moderatorCandidates.error?.response?.data?.message}
          candidatesLoading={moderatorCandidates.isLoading}
          management={management}
          onAddSelect={setSelectedModerator}
          onClose={() => setSheet("")}
          onRemove={setRemoveModerator}
          publication={managedPublication}
          removePendingId={moderatorRemove.isPending ? removeModerator?.id : ""}
        />
      ) : null}
      {selectedModerator ? (
        <AddModeratorConfirmSheet
          busy={moderatorAdd.isPending}
          candidate={selectedModerator}
          error={moderatorAdd.error?.response?.data?.message}
          onCancel={() => !moderatorAdd.isPending && setSelectedModerator(null)}
          onConfirm={() => moderatorAdd.mutate(selectedModerator.id)}
          publication={managedPublication}
        />
      ) : null}
      {removeModerator ? (
        <RemoveModeratorConfirmSheet
          busy={moderatorRemove.isPending}
          moderator={removeModerator}
          onCancel={() => !moderatorRemove.isPending && setRemoveModerator(null)}
          onConfirm={() => moderatorRemove.mutate(removeModerator.id)}
        />
      ) : null}
      {sheet === "analytics" ? <AnalyticsSheet analytics={management.analytics} loading={managementQuery.isLoading} onClose={() => setSheet("")} publication={managedPublication} seatStatus={management.seatStatus} /> : null}
      {sheet === "share" ? <ShareSheet onClose={() => setSheet("")} publication={managedPublication} viewerId={viewerId} /> : null}
      {walkersOpen ? <WorldWalkersSheet loading={walkersQuery.isLoading} onClose={() => setWalkersOpen(false)} onMessage={() => { setWalkersOpen(false); navigate("/messages?tab=direct"); }} publication={managedPublication} total={walkersQuery.data?.pagination?.total || steppedInside} walkers={walkersQuery.data?.items || []} /> : null}
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={managedPublication.title} /> : null}
      {storyUploadSheetOpen ? <StoryUploadSheet error={storyUploadError} onClose={() => setStoryUploadSheetOpen(false)} onPick={pickStoryFile} /> : null}
      {storyDraft ? <WorldStorySharePreview busy={storyUpload.isPending} error={storyUploadError} onClose={closeStoryDraft} onShare={() => storyUpload.mutate({ file: storyDraft.file })} progress={storyProgress} url={storyDraft.url} /> : null}
      {quickChapterStep === "name" ? (
        <QuickChapterNameSheet
          busy={quickChapterSaving}
          chapterNumber={experienceChapters.length + 1}
          error={quickChapterError}
          onClose={resetQuickChapterFlow}
          onNext={() => {
            if (!quickChapterTitle.trim()) {
              setQuickChapterError("Name this chapter first.");
              return;
            }
            saveQuickChapter();
          }}
          onTitleChange={setQuickChapterTitle}
          title={quickChapterTitle}
        />
      ) : null}
      {sheet === "actions" ? (
        <BottomSheet labelledBy="world-actions-title" onClose={() => setSheet("")}>
          <header className="world-actions-head"><button aria-label="Back to world" onClick={() => setSheet("")} type="button"><FiArrowLeft /></button><div><h1 id="world-actions-title">{managedPublication.title}</h1><p>Your World · subscription</p></div></header>
          <section className="world-actions-list">
            <button onClick={() => setSheet("share")} type="button"><FiShare2 /><span><b>Share</b></span></button>
            <button onClick={() => setSheet("name")} type="button"><FiEdit3 /><span><b>Edit</b><small>title, chapters, access</small></span></button>
            <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>Change cover</b></span></button>
            <button aria-label={commentsEnabled ? "Turn comments off" : "Turn comments on"} disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? "Turn comments off" : "Turn comments on"}</b></span></button>
            <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>Moderators</b><small>{(management.moderators || []).length} &middot; for this experience only</small></span></button>
          </section>
        </BottomSheet>
      ) : null}
      {showPremiumWelcome ? <PremiumWelcomeSheet onClose={() => setShowPremiumWelcome(false)} publication={publication} /> : null}
      <PurchaseWorldModal onClose={() => setShowExperienceUnlock(false)} onSuccess={() => query.refetch()} open={showExperienceUnlock} publication={publication} />
    </>
  );
}
