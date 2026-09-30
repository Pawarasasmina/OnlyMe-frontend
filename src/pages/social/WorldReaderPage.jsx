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
  FiGift,
  FiImage,
  FiLink,
  FiLock,
  FiMapPin,
  FiMic,
  FiMessageCircle,
  FiMessageSquare,
  FiMoreHorizontal,
  FiPlay,
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
import ChapterVoicePlayer from "../../components/publication/ChapterVoicePlayer";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import StoryGiftPicker from "../../components/stories/StoryGiftPicker";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useShareRecipients } from "../../hooks/share/useShareRecipients";
import { useSendSharedContent } from "../../hooks/share/useSendSharedContent";
import { membershipService } from "../../services/membershipService";
import { publicationService as api } from "../../services/publicationService";
import { savedService } from "../../services/savedService";
import { walletService } from "../../services/walletService";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";
import { createIdempotencyKey } from "../../utils/idempotencyKey";

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

function firstWorldMedia(publication, chapters) {
  return publication?.introMedia || publication?.coverMedia || chapters
    .flatMap((chapter) => chapter.blocks || [])
    .map((block) => block.media)
    .find((media) => media?.secureUrl) || null;
}

function chapterDescription(chapter = {}) {
  const textBlock = (chapter.blocks || []).find((block) => String(block.text || "").trim());
  return String(textBlock?.text || "").trim().replace(/\s+/g, " ").slice(0, 92);
}

function chapterPreviewBlocks(chapter = {}) {
  return [...(chapter.blocks || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .filter((block) => String(block.text || "").trim() || block.media?.secureUrl || block.url)
    .slice(0, 5);
}

function creatorFirstName(creator = {}) {
  return (creator.name || creator.username || "this creator").trim().split(/\s+/)[0] || "this creator";
}

function canReadChapter(chapter = {}, canViewMemberContent = false) {
  return Boolean(canViewMemberContent || chapter.isPreview || !chapter.locked);
}

function isActivePremiumMembership(membership = {}) {
  const status = membership.storedStatus || membership.status;
  const periodEnd = membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).getTime() : 0;
  return ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(status) && (!periodEnd || periodEnd > Date.now());
}

function formatMediaTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function worldMediaItems(publication, chapters) {
  const seen = new Set();
  const add = (media, title = "") => {
    const key = media?.assetId || media?.secureUrl;
    if (!media?.secureUrl || seen.has(key)) return null;
    seen.add(key);
    return { ...media, title: title || media.title || "" };
  };
  return [
    add(publication?.introMedia, "Intro"),
    add(publication?.coverMedia, "Cover"),
    ...chapters.flatMap((chapter) => (chapter.blocks || []).map((block) => add(block.media, block.metadata?.label || chapter.title)).filter(Boolean)),
  ].filter(Boolean);
}

function includedWorldExperiences(publication = {}) {
  const candidates = [
    publication.includedExperiences,
    publication.experiences,
    publication.worldExperiences,
    publication.includedExperienceIds,
  ].find((items) => Array.isArray(items) && items.some((item) => item && typeof item === "object"));
  const hydrated = (candidates || []).filter((item) => item && typeof item === "object");
  if (hydrated.length) return hydrated;
  return (publication.includedExperienceIds || [])
    .filter((item) => item && typeof item !== "object")
    .map((id, index) => ({ id: String(id), title: `Included Experience ${index + 1}`, included: true }));
}

function privateStoryItems(chapters) {
  return chapters
    .flatMap((chapter) => (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && block.media?.secureUrl)
      .map((block) => ({ ...block.media, title: block.metadata?.label || chapter.title || "Story" })));
}

function joinPriceText(offer = {}) {
  const regular = Number(offer.regularPrice || offer.pricing?.starsAmount || 0);
  const firstMonthEnabled = Boolean(offer.firstMonthOfferEnabled);
  const intro = Number(offer.introPrice || (regular ? Math.max(1, Math.ceil(regular / 2)) : 0));
  if ((firstMonthEnabled || !offer.introPrice) && intro && regular) {
    return (
      <span className="world-join-price">
        <span className="world-join-price-icon" aria-hidden="true" />
        <span>{intro.toLocaleString()} first month</span>
        <span className="world-join-old-price"><s>{regular.toLocaleString()}</s><b>/mo</b></span>
      </span>
    );
  }
  return regular ? (
    <span className="world-join-price">
      <span className="world-join-price-icon" aria-hidden="true" />
      <span>{regular.toLocaleString()}/mo</span>
    </span>
  ) : <span className="world-join-price">Free</span>;
}

function BottomSheet({ children, labelledBy, onClose, sheetClassName = "" }) {
  return (
    <div aria-labelledby={labelledBy} aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
      <section className={`world-bottom-sheet ${sheetClassName}`.trim()} onMouseDown={(event) => event.stopPropagation()}>
        <span className="world-sheet-grab" />
        {children}
      </section>
    </div>
  );
}

function PremiumWorldPreviewPage({ activeMembership, canViewMemberContent, chapters, creator, joinPending, memberPreview, onBack, onJoin, onOpenChapter, onShare, owner, publication }) {
  const [expandedPreviewChapter, setExpandedPreviewChapter] = useState(null);
  const media = firstWorldMedia(publication, chapters);
  const stories = storyItems(publication, chapters);
  const displayName = creator.name || creator.username || "Creator";
  const firstName = creatorFirstName(creator);
  const offer = { ...(publication || {}), ...(publication?.membershipOffer || {}) };
  const lockedCount = chapters.filter((chapter) => chapter.locked || !chapter.isPreview).length;
  const hasIncludedExperiences = (publication?.includedExperienceIds || []).length > 0;
  const memberCount = Math.max(Number(publication?.members?.count || 0), Number(memberPreview?.pagination?.total || 0), 0);
  const memberAvatars = (publication?.members?.previewAvatars?.length ? publication.members.previewAvatars : (memberPreview?.items || []).map((item) => item.user))
    .filter(Boolean)
    .slice(0, 4);
  const foundingCapacity = Number(publication?.worldFoundingCapacity || 0);
  const nextMemberNumber = Number(publication?.viewer?.memberNumber || offer.nextMemberNumber || memberCount + 1);
  const memberState = canViewMemberContent || activeMembership || publication?.viewer?.isMember;
  const storiesUnlocked = owner || memberState;
  const benefits = [
    { icon: <FiZap />, text: `The whole of ${firstName}'s world opens to you - every corner`, show: lockedCount > 0 },
    { icon: <span>✦</span>, text: "Private experiences and chapters for members", show: hasIncludedExperiences || lockedCount > 0 },
    { icon: <FiCheck />, text: `Stories ${firstName} does not post publicly`, show: stories.length > 0 },
    { icon: <span className="world-preview-ring-icon" />, text: `One personal reply a month${publication?.directAccessIncluded ? " - included; more, first in line" : ""}`, show: publication?.directAccessIncluded },
  ].filter((item) => item.show);
  const valueRows = [
    { title: "Your price is locked", detail: "while your membership remains active", show: publication?.memberPriceLocked !== false },
    { title: "Everything future lands inside", detail: "new chapters are included with your active membership", show: true },
    { title: `You become #${nextMemberNumber.toLocaleString()}`, detail: `first ${foundingCapacity.toLocaleString()} are the founding circle`, show: Boolean(foundingCapacity && nextMemberNumber <= foundingCapacity) },
  ].filter((item) => item.show);

  return (
    <article className="world-preview-page world-page">
      <header className="world-preview-media world-hero">
        {media?.secureUrl ? (
          media.resourceType === "video" || media.mediaType === "VIDEO"
            ? <video controls playsInline preload="metadata" src={media.secureUrl} />
            : <img alt={`${publication.title} preview`} src={media.secureUrl} />
        ) : <div className="world-preview-media-empty"><span>{PLANET}</span></div>}
        {(media?.resourceType === "video" || media?.mediaType === "VIDEO") && media?.duration ? <span className="world-preview-duration">▶ {Math.round(Number(media.duration || 0))}s</span> : null}
        <button aria-label="Back to profile" className="world-preview-close" onClick={onBack} type="button"><FiX /></button>
      </header>

      <section className="world-preview-intro world-header">
        <p>{`${displayName}'s World`}</p>
        <h1>{publication.title}</h1>
        <span>{`The ${firstName} only a few people get to see.`}</span>
      </section>

      {stories.length ? (
        <section aria-label="Private story previews" className="world-preview-stories world-private-previews">
          {stories.slice(0, 3).map((story, index) => (
            <button
              aria-disabled={!storiesUnlocked}
              className="world-private-item"
              disabled={!storiesUnlocked}
              key={`${story.assetId || story.secureUrl || index}-${index}`}
              onClick={() => storiesUnlocked && onShare(story)}
              type="button"
            >
              <span className="world-private-ring">
                {story.resourceType === "video" ? <video muted playsInline preload="metadata" src={story.secureUrl} /> : <img alt={story.title || "World preview"} src={story.secureUrl} />}
                <i className="world-private-lock"><FiLock /></i>
              </span>
              <span>private</span>
            </button>
          ))}
        </section>
      ) : null}

      <section className="world-preview-inside">
        <h2>What&apos;s inside</h2>
        <div className="world-chapter-list">
        {chapters.length ? chapters.map((chapter, index) => {
          const readable = canReadChapter(chapter, memberState);
          const locked = !readable;
          const previewTeaser = readable && chapter.isPreview && !memberState;
          const expanded = previewTeaser && expandedPreviewChapter === index;
          const previewBlocks = expanded ? chapterPreviewBlocks(chapter) : [];
          const description = locked ? chapterDescription(chapter) : "";
          const openChapter = () => {
            if (locked) {
              onJoin();
              return;
            }
            if (previewTeaser) {
              setExpandedPreviewChapter((current) => current === index ? null : index);
              return;
            }
            onOpenChapter(index);
          };
          return (
            <button className={`world-chapter-card ${readable ? "world-chapter-card--free is-free" : "world-chapter-card--locked is-locked"} ${expanded ? "is-expanded" : ""}`} key={chapter.stableChapterId || index} onClick={openChapter} type="button">
              <b className="world-chapter-number">{index + 1}</b>
              <span className="world-chapter-copy">
                <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
                {description ? <small>{description}...</small> : null}
              </span>
              {readable ? <em className="world-chapter-action">{chapter.isPreview && !memberState ? "Read free \u203a" : "Open \u203a"}</em> : <FiLock className="world-chapter-lock" />}
              {expanded ? (
                <span className="world-chapter-preview-panel">
                  <span className="world-chapter-preview-copy">You unlock everything about {firstName} - and this chapter is open right now. The rest of the world is one tap away.</span>
                  {previewBlocks.length ? (
                    <span className="world-chapter-preview-content">
                      {previewBlocks.map((block, blockIndex) => {
                        const key = block.id || `${chapter.stableChapterId || index}-${blockIndex}`;
                        if (block.media?.secureUrl && block.type === "IMAGE") return <img alt="" key={key} src={block.media.secureUrl} />;
                        if (block.media?.secureUrl && block.type === "VIDEO") return <video key={key} muted playsInline preload="metadata" src={block.media.secureUrl} />;
                        if (block.media?.secureUrl && ["VOICE", "AUDIO"].includes(block.type)) return <span className="world-chapter-preview-media-label" key={key}>Audio note</span>;
                        if (block.type === "LINK" && block.url) return <span className="world-chapter-preview-media-label" key={key}>{block.label || block.url}</span>;
                        return <span className="world-chapter-preview-text" key={key}>{String(block.text || "").trim()}</span>;
                      })}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        }) : <p>No chapters have been published yet.</p>}
        </div>
      </section>

      {benefits.length ? (
        <section className="world-preview-benefits world-benefits">
          {benefits.map((benefit, index) => (
            <div className="world-benefit-row" key={`${benefit.text}-${index}`}>
              <span>{benefit.icon}</span>
              <b>{benefit.text}</b>
            </div>
          ))}
        </section>
      ) : null}

      {valueRows.length ? (
        <section className="world-preview-value world-membership-card">
          {valueRows.map((row) => <p className="world-membership-row" key={row.title}><FiCheck /><span className="world-membership-copy"><b>{row.title}</b><small>{row.detail}</small></span></p>)}
        </section>
      ) : null}

      <section className="world-preview-social-proof world-members-social-proof">
        {memberAvatars.length ? (
          <span className="world-member-avatars">
            {memberAvatars.map((member, index) => <FanAvatar key={`${member.id || member.username || index}-${index}`} name={member.displayName || member.name || member.username} size="h-6 w-6" src={member.avatarUrl || member.avatar} />)}
          </span>
        ) : null}
        <b>{memberCount ? `${memberCount.toLocaleString()} ${memberCount === 1 ? "person is" : "people are"} already closer` : "Be the first to step closer"}</b>
      </section>

      {owner ? (
        <Link className="world-preview-cta world-join-button" to={`/studio/worlds/${publication.id}/edit`}>Manage World</Link>
      ) : memberState ? (
        <button className="world-preview-cta world-join-button" onClick={() => chapters[0] && onOpenChapter(chapters.findIndex((chapter) => !chapter.locked))} type="button">{`You're inside - open ${firstName}'s World`}</button>
      ) : (
        <button className="world-preview-cta world-join-button" disabled={joinPending || !publication?.id || offer.enabled === false} onClick={onJoin} type="button">
          {joinPending ? <span className="world-join-label">Confirming...</span> : <><span className="world-join-label">Join {firstName}&rsquo;s World</span>
          <span className="world-join-dot" aria-hidden="true">·</span>
          {joinPriceText(offer)}</>}
        </button>
      )}
      {!owner ? <p className="world-preview-terms world-join-footer">Cancel anytime · {firstName} sees every new member</p> : null}
    </article>
  );
}

function WorldMemberInsidePage({ activeMembership, chapters, creator, onOpenChapter, onOpenMessages, publication }) {
  const [worldDoorOpen, setWorldDoorOpen] = useState(false);
  const firstName = creatorFirstName(creator);
  const creatorId = creator.id || creator._id || publication?.creatorId || "";
  const chapterCount = chapters.length;
  const memberNumber = publication?.viewer?.memberNumber || activeMembership?.memberNumber;
  const worldIcon = PLANET;
  const renewalCopy = activeMembership?.cancelAtPeriodEnd
    ? "Cancels at period end"
    : activeMembership?.autoRenew === false
      ? "Active until period end"
      : "Renews monthly · cancel anytime";
  const directReplies = Number(publication?.directAccessIncludedReplies || 1);
  const openMessages = () => onOpenMessages(creatorId);
  const firstUnlockedChapterIndex = Math.max(0, chapters.findIndex((chapter) => !chapter.locked));
  const openWorld = () => setWorldDoorOpen(true);
  const stepInsideWorld = () => onOpenChapter(firstUnlockedChapterIndex);

  if (worldDoorOpen) {
    return (
      <WorldMemberDoorPage
        chapters={chapters}
        creator={creator}
        onBack={() => setWorldDoorOpen(false)}
        onStepInside={stepInsideWorld}
        publication={publication}
      />
    );
  }

  return (
    <article className="world-member-inside-page">
      <section className="world-member-inside-content">
        <span className="world-member-sheet-handle" aria-hidden="true" />
        <header className="world-member-welcome">
          <span className="world-member-planet" aria-hidden="true">{worldIcon}</span>
          <h1>You&apos;re inside</h1>
          {memberNumber ? <span className="world-member-badge">Member #{Number(memberNumber).toLocaleString()}</span> : null}
          <p>Welcome to {firstName}&apos;s World</p>
        </header>

        <div className="world-member-access-list">
          <button className="world-member-access-row" onClick={openMessages} type="button">
            <span className="world-member-access-icon is-chat"><FiMessageSquare /></span>
            <span className="world-member-access-copy">
              <b>Direct Access to {firstName}</b>
              <small>A private window is ready · {directReplies} message{directReplies === 1 ? "" : "s"} / 48h — included every month</small>
            </span>
            <span className="world-member-open">OPEN &gt;</span>
          </button>

          <button className="world-member-access-row" onClick={openWorld} type="button">
            <span className="world-member-access-icon is-planet">{worldIcon}</span>
            <span className="world-member-access-copy">
              <b>&ldquo;{publication.title}&rdquo;</b>
              <small>All {chapterCount.toLocaleString()} chapter{chapterCount === 1 ? "" : "s"} unlocked — and every new one lands first</small>
            </span>
            <span className="world-member-open">OPEN &gt;</span>
          </button>

          <button className="world-member-access-row" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">
            <span className="world-member-access-icon is-ring" aria-hidden="true" />
            <span className="world-member-access-copy">
              <b>Private stories &amp; highlights</b>
              <small>Members only — fans never see these</small>
            </span>
            <span className="world-member-open">OPEN &gt;</span>
          </button>
        </div>

        <button className="world-member-primary" onClick={openMessages} type="button">Say hi to {firstName} <FiMessageCircle /></button>
        <p className="world-member-renewal">{renewalCopy}</p>
      </section>
    </article>
  );
}

function WorldMemberDoorPage({ chapters, creator, onBack, onStepInside, publication }) {
  const firstName = creatorFirstName(creator);
  const media = firstWorldMedia(publication, chapters);

  return (
    <article className="world-member-door-page">
      {media?.secureUrl ? (
        media.resourceType === "video" || media.mediaType === "VIDEO"
          ? <video aria-hidden="true" autoPlay loop muted playsInline preload="metadata" src={media.secureUrl} />
          : <img alt="" aria-hidden="true" src={media.secureUrl} />
      ) : null}
      <span className="world-member-door-fallback" aria-hidden="true" />
      <span className="world-member-door-shade" aria-hidden="true" />
      <button aria-label="Back to member access" className="world-member-door-control is-back" onClick={onBack} type="button"><FiArrowLeft /></button>
      <button aria-label="More world options" className="world-member-door-control is-more" type="button"><FiMoreHorizontal /></button>
      <section className="world-member-door-copy">
        <span className="world-member-door-planet" aria-hidden="true">{PLANET}</span>
        <h1>{publication.title}</h1>
        <p>a world by {firstName}</p>
        <button className="world-member-door-cta" onClick={onStepInside} type="button">Step inside</button>
      </section>
    </article>
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

function PriceSheet({ busy, currentPriceFallback, error, loading, onClose, onSave, pricing }) {
  const tiers = pricing?.tiers || [];
  const currentPrice = Number(pricing?.currentPrice || currentPriceFallback || 0);
  const [price, setPrice] = useState(currentPrice);
  useEffect(() => setPrice(currentPrice), [currentPrice]);
  const selectedTier = tiers.find((tier) => Number(tier.coins) === Number(price));
  const canSave = Boolean(selectedTier?.available && pricing?.canChangePrice && price && Number(price) !== currentPrice);
  const currentSelection = Boolean(selectedTier?.available && Number(price) === currentPrice);
  const description = pricing?.copy?.description || "Monthly subscription. Everyone already inside keeps their price forever - the new price is for new residents only.";
  const helper = pricing?.copy?.helper || "Top tier opens at 100+ residents with steady renewals. Change once every 30 days.";
  return (
    <BottomSheet labelledBy="world-price-title" onClose={onClose} sheetClassName="is-price-sheet">
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
                {locked ? <FiLock aria-hidden="true" /> : null}<span>🪙</span> {tierPrice.toLocaleString()}
              </button>
            );
          })}
        </div>
      ) : null}
      {selectedTier?.payout ? <p className="world-price-payout"><b>{formatMoney(selectedTier.payout)}</b> <span>to you · per resident · monthly</span></p> : null}
      <p className="world-price-helper">{helper}</p>
      <button className="world-sheet-primary" disabled={busy || loading || (!canSave && !currentSelection)} onClick={() => currentSelection ? onClose() : onSave(price)} type="button">{busy ? "Saving..." : "Save"}</button>
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

function ExperienceAccessSheet({ data, error, loading, onClose, onCopy, onDecide, onRetry, pendingId }) {
  const requests = data?.requests || [];
  return <BottomSheet labelledBy="experience-access-title" onClose={onClose}>
    <section className="experience-access-sheet">
      <h2 id="experience-access-title">Access by link</h2>
      <p>Send this link to a friend. When they open it, you get a request — confirm, and the Experience is theirs forever. Free, from the author.</p>
      <div><input aria-label="Experience access link" readOnly value={loading ? "Loading…" : error ? "Access link unavailable" : data?.url || ""} /><button disabled={loading || !data?.url} onClick={onCopy} type="button">Copy</button></div>
      {error ? <p className="world-sheet-error">{error} <button onClick={onRetry} type="button">Retry</button></p> : loading ? <small>Loading requests…</small> : requests.length ? requests.map((item) => <article key={item.id}><FanAvatar name={item.requester?.name} size="h-9 w-9" src={item.requester?.avatar} /><span><b>{item.requester?.name || item.requester?.username || "User"}</b><small>{item.status.toLowerCase()}</small></span>{item.status === "PENDING" ? <><button disabled={pendingId === item.id} onClick={() => onDecide(item.id, true)} type="button">Confirm</button><button disabled={pendingId === item.id} onClick={() => onDecide(item.id, false)} type="button">Decline</button></> : null}</article>) : <small>No requests yet — they appear here.</small>}
    </section>
  </BottomSheet>;
}

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard unavailable");
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
  const shareNoun = publication?.kind === "EXPERIENCE" ? "Experience" : "World";
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
      await copyToClipboard(url);
      setCopied(true);
      showToast(`${shareNoun} link copied.`);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError("Could not copy this link.");
      showToast(`Could not copy the ${shareNoun.toLowerCase()} link.`);
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

function PollBlock({ block, chapterId, publicationId }) {
  const options = Array.isArray(block.metadata?.options) ? block.metadata.options : [];
  const queryClient = useQueryClient();
  const pollQuery = useQuery({
    queryKey: ["publication-poll", publicationId, chapterId, block.id],
    queryFn: () => api.getPoll(publicationId, chapterId, block.id).then((response) => response.data.data),
    enabled: Boolean(publicationId && chapterId && block.id && options.length),
    retry: false,
  });
  const voteMutation = useMutation({
    mutationFn: (optionIndex) => api.votePoll(publicationId, chapterId, block.id, optionIndex).then((response) => response.data.data),
    onSuccess: (data) => queryClient.setQueryData(["publication-poll", publicationId, chapterId, block.id], data),
  });
  const data = pollQuery.data || {};
  const counts = Array.isArray(data.counts) ? data.counts : [];
  const total = Number(data.totalVotes || 0);
  const selected = data.viewerChoice ?? null;
  const error = pollQuery.error || voteMutation.error;

  return <section className="world-chapter-reader-poll">
    <h3>{block.metadata?.question || "Poll"}</h3>
    <div>
      {options.map((option, index) => {
        const count = Number(counts[index] || 0);
        const percent = total ? Math.round((count / total) * 100) : 0;
        return <button className={selected === index ? "is-selected" : ""} disabled={voteMutation.isPending} key={`${block.id}-${option}-${index}`} onClick={() => voteMutation.mutate(index)} type="button">
          {data.resultsVisible ? <span className="world-poll-fill" style={{ width: `${percent}%` }} /> : null}
          <span>{option}</span>
          {data.resultsVisible ? <b>{percent}%</b> : selected === index ? <b>Chosen</b> : null}
        </button>;
      })}
    </div>
    <p>{error ? (error.response?.data?.message || "Unable to save your vote.") : data.resultsVisible ? `${total.toLocaleString()} vote${total === 1 ? "" : "s"}` : selected == null ? "Choose one answer" : "Your answer is saved"}</p>
  </section>;
}

function ChapterBlock({ block, chapterId, publicationId }) {
  const listItems = Array.isArray(block.metadata?.listItems) ? block.metadata.listItems.filter(Boolean) : [];
  const overlayText = String(block.metadata?.overlayText || block.metadata?.caption || "").trim();
  if (block.metadata?.location?.label) return <span className="chapter-location-prototype"><FiMapPin />{block.metadata.location.label}</span>;
  if (block.type === "LIST" || (block.type === "KEY_POINT" && listItems.length)) return <ul className="world-chapter-reader-list">{(listItems.length ? listItems : String(block.text || "").split("\n").filter(Boolean)).map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}</ul>;
  if (["TEXT", "HIGHLIGHT", "KEY_POINT"].includes(block.type)) return <p className={`world-chapter-reader-text ${block.type === "HIGHLIGHT" ? "is-highlight" : ""}`}>{block.text}</p>;
  if (block.type === "IMAGE" && block.media?.secureUrl) return <figure className={overlayText ? "world-chapter-reader-image-frame has-overlay" : "world-chapter-reader-image-frame"}>
    <img alt="Chapter attachment" className="world-chapter-reader-image" src={block.media.secureUrl} />
    {overlayText ? <figcaption style={{ "--overlay-fill-color": block.metadata?.overlayFillColor || "", "--overlay-text-color": block.metadata?.overlayColor || "#ffffff" }}>{overlayText}</figcaption> : null}
  </figure>;
  if (block.type === "VIDEO" && block.media?.secureUrl) return <video className="world-chapter-reader-video" controls playsInline preload="metadata" src={block.media.secureUrl} />;
  if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) {
    const transcript = String(block.metadata?.transcript || "").trim();
    return <ChapterVoicePlayer duration={block.media?.duration} transcript={transcript} url={block.media.secureUrl} />;
  }
  if (block.type === "POLL") return <PollBlock block={block} chapterId={chapterId} publicationId={publicationId} />;
  if (block.type === "LINK" && block.url) return <a className="chapter-link-prototype" href={block.url} rel="noreferrer" target="_blank"><FiLink /><span><b>{block.label || "Open link"}</b><small>{block.url}</small></span></a>;
  return null;
}

function ChapterExperience({ chapter, chapterIndex, chapters, experienceTitle, onBack, onSelect, publicationId }) {
  const blocks = [...(chapter.blocks || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const nextChapter = () => {
    if (chapterIndex < chapters.length - 1) onSelect(chapterIndex + 1);
    else onBack();
  };
  const handleScreenClick = (event) => {
    if (event.target.closest?.("a, button, input, textarea, select, video, audio")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX - bounds.left < bounds.width * 0.3 && chapterIndex > 0) onSelect(chapterIndex - 1);
    else nextChapter();
  };
  return (
    <article className="experience-chapter-preview experience-public-chapter">
      <header>
        <button aria-label="Back to Experience overview" onClick={onBack} type="button"><FiX /></button>
        <div><small>CHAPTER {chapterIndex + 1} OF {chapters.length} {"\u00b7"} {experienceTitle}</small><h1>{chapter.title || `Chapter ${chapterIndex + 1}`}</h1></div>
        <span>EXPERIENCE</span>
      </header>
      <div className="experience-chapter-preview-progress">{chapters.map((item, index) => <button aria-label={`Open chapter ${index + 1}`} className={index <= chapterIndex ? "is-active" : ""} key={item.stableChapterId || item.id || index} onClick={() => onSelect(index)} type="button" />)}</div>
      <main onClick={handleScreenClick}>
        <section className="experience-chapter-preview-content">{blocks.length ? blocks.map((block, index) => <ChapterBlock block={block} chapterId={chapter.stableChapterId} key={block.id || index} publicationId={publicationId} />) : <p>This chapter has no published content yet.</p>}</section>
        <div className="experience-chapter-preview-adjacent"><button disabled={chapterIndex === 0} onClick={() => chapterIndex > 0 && onSelect(chapterIndex - 1)} type="button">{chapterIndex > 0 ? `‹ ${chapters[chapterIndex - 1]?.title}` : ""}</button><button disabled={chapterIndex === chapters.length - 1} onClick={() => chapterIndex < chapters.length - 1 && onSelect(chapterIndex + 1)} type="button">{chapterIndex < chapters.length - 1 ? `${chapters[chapterIndex + 1]?.title} ›` : "Experience complete"}</button></div>
        <div className="experience-chapter-preview-actions"><button aria-label="Back to Experience overview" onClick={onBack} type="button">←</button><button onClick={nextChapter} type="button">{chapterIndex < chapters.length - 1 ? "Next →" : "Back to overview"}</button></div>
      </main>
    </article>
  );
}

function WorldPrimaryMedia({ media, title }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(Number(media?.duration || 0));
  if (!media?.secureUrl) return null;
  const playable = ["VIDEO", "AUDIO", "VOICE"].includes(media.mediaType) || ["video", "audio"].includes(media.resourceType);
  const syncTime = (event) => {
    setCurrentTime(event.currentTarget.currentTime || 0);
    setDuration(event.currentTarget.duration || duration || 0);
  };
  if (media.mediaType === "VIDEO" || media.resourceType === "video") {
    return <section className="world-inside-detail__primary">
      <video controls onLoadedMetadata={syncTime} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onTimeUpdate={syncTime} playsInline preload="metadata" src={media.secureUrl} />
      <p className="world-inside-detail__playback"><FiPlay /> {duration ? `${formatMediaTime(currentTime || duration)} ${playing ? "● playing" : "ready"}` : playing ? "playing" : "ready"}</p>
    </section>;
  }
  if (["AUDIO", "VOICE"].includes(media.mediaType)) {
    return <section className="world-inside-detail__primary is-audio">
      <audio controls onLoadedMetadata={syncTime} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onTimeUpdate={syncTime} preload="metadata" src={media.secureUrl} />
      <p className="world-inside-detail__playback"><FiPlay /> {duration ? `${formatMediaTime(currentTime || duration)} ${playing ? "● playing" : "ready"}` : playing ? "playing" : "ready"}</p>
    </section>;
  }
  return <section className="world-inside-detail__primary">
    <img alt={`${title} media`} loading="lazy" src={media.secureUrl} />
    {playable ? <p className="world-inside-detail__playback"><FiPlay /> ready</p> : null}
  </section>;
}

function WorldInsideMoreSheet({ onClose, onCopy, onShare }) {
  return <BottomSheet labelledBy="world-inside-more-title" onClose={onClose}>
    <header className="world-inside-detail__sheet-head">
      <h2 id="world-inside-more-title">World actions</h2>
      <button aria-label="Close World actions" onClick={onClose} type="button"><FiX /></button>
    </header>
    <div className="world-inside-detail__sheet-actions">
      <button onClick={onShare} type="button"><FiShare2 /><span>Share</span></button>
      <button onClick={onCopy} type="button"><FiCopy /><span>Copy link</span></button>
    </div>
  </BottomSheet>;
}

function WorldInsideComments({ engagement, mutationBusy, onCommentReact, onReply, replyTarget }) {
  const comments = engagement?.comments || [];
  if (!comments.length) return <p className="world-inside-detail__comments-empty">No comments yet. Be the first to leave a note.</p>;
  const renderComment = (item, isReply = false) => {
    const active = Boolean(item.viewerReaction);
    return <article className={`world-inside-detail__comment ${isReply ? "is-reply" : ""}`} key={item.id}>
      <FanAvatar name={item.author?.name || item.author?.username || "User"} size="h-7 w-7" src={item.author?.avatar} />
      <div>
        <p><Link to={item.author?.username ? `/profile/${item.author.username}` : "#"}>{item.author?.name || item.author?.username || "User"}</Link> {item.text}</p>
        <div>
          <button className={active ? "is-active" : ""} disabled={mutationBusy === item.id} onClick={() => onCommentReact(item)} type="button">🤝 <span>{Number(item.reactionCount || 0).toLocaleString()}</span></button>
          {!isReply ? <button className={replyTarget?.id === item.id ? "is-active" : ""} onClick={() => onReply(item)} type="button">Reply</button> : null}
        </div>
        {(item.replies || []).map((reply) => renderComment(reply, true))}
      </div>
    </article>;
  };
  return <div className="world-inside-detail__comment-list">{comments.map((item) => renderComment(item))}</div>;
}

function WorldInsideDetailPage({ canViewMemberContent, chapters, creator, engagementQuery, experiences = [], onBack, onGift, onOpenChapter, onOpenStory, publication }) {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [commentBusy, setCommentBusy] = useState("");
  const [posting, setPosting] = useState(false);
  const mediaItems = useMemo(() => worldMediaItems(publication, chapters), [publication, chapters]);
  const primaryMedia = mediaItems[0] || null;
  const storyPreviews = useMemo(() => privateStoryItems(chapters), [chapters]);
  const includedExperiences = useMemo(() => {
    const supplied = experiences.filter((item) => item && typeof item === "object");
    return supplied.length ? supplied : includedWorldExperiences(publication);
  }, [experiences, publication]);
  const gallery = mediaItems.filter((item) => item.secureUrl !== primaryMedia?.secureUrl).slice(0, 8);
  const engagement = engagementQuery.data || {};
  const memberCount = Number(publication?.members?.count || 0);
  const steppedInside = Math.max(memberCount, Number(engagement.viewCount || 0));
  const shownChapters = [];
  const hiddenChapterCount = 0;
  const expanded = false;
  const setExpanded = () => undefined;
  const creatorName = creator.name || creator.username || "Creator";
  const firstName = creatorFirstName(creator);
  const chapterWord = chapters.length === 1 ? "chapter" : "chapters";
  const saved = Boolean(engagement.viewerSaved);
  const worldUrl = typeof window === "undefined" ? "" : `${window.location.origin}/world/${publication.id || publication._id}/inside?view=detail`;
  const canPostComment = commentText.trim() && !posting && publication.commentsEnabled !== false;

  useEffect(() => {
    if (canViewMemberContent && publication?.id) api.markWorldWalked(publication.id).then(() => engagementQuery.refetch()).catch(() => null);
  }, [canViewMemberContent, engagementQuery, publication?.id]);

  const toggleSave = async () => {
    try {
      const response = await api.toggleSeenSave(publication.id);
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
      showToast(response.data.message || (saved ? "Removed from Saved." : "Saved."));
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not update Saved.");
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!canPostComment) return;
    setPosting(true);
    try {
      const response = await api.commentOnSeen(publication.id, commentText.trim(), "", replyTarget?.id || "");
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
      setCommentText("");
      setReplyTarget(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Comment could not be posted.");
    } finally {
      setPosting(false);
    }
  };

  const toggleCommentReaction = async (comment) => {
    setCommentBusy(comment.id);
    try {
      const request = comment.viewerReaction
        ? api.removeSeenCommentReaction(publication.id, comment.id)
        : api.reactToSeenComment(publication.id, comment.id, "LIKE");
      const response = await request;
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
    } catch (error) {
      showToast(error?.response?.data?.message || "Reaction could not be saved.");
    } finally {
      setCommentBusy("");
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(worldUrl);
    setMoreOpen(false);
    showToast("World link copied.");
  };

  const shareWorld = async () => {
    setMoreOpen(false);
    if (navigator.share) {
      await navigator.share({ title: publication.title || "World", url: worldUrl }).catch(() => null);
      return;
    }
    await copyLink();
  };

  return <article className="world-inside-detail">
    <header className="world-inside-detail__header">
      <button aria-label="Back to member access" className="world-inside-detail__round" onClick={onBack} type="button"><FiArrowLeft /></button>
      <div className="world-inside-detail__title">
        <h1>{publication.title || "World"}</h1>
        <p>{creatorName} {publication.creator?.verified || creator.verified ? "✓" : ""} · {chapters.length} {chapterWord} · {steppedInside.toLocaleString()} stepped inside</p>
      </div>
      <div className="world-inside-detail__actions">
        <button aria-label={`Send ${firstName} a gift`} className="world-inside-detail__round" onClick={onGift} type="button"><FiGift /></button>
        <button aria-label={saved ? "Remove World from Saved" : "Save World"} aria-pressed={saved} className={`world-inside-detail__round ${saved ? "is-active" : ""}`} onClick={toggleSave} type="button"><FiBookmark fill={saved ? "currentColor" : "none"} /></button>
        <button aria-label="More World actions" className="world-inside-detail__round" onClick={() => setMoreOpen(true)} type="button"><FiMoreHorizontal /></button>
      </div>
    </header>

    <section className="world-inside-detail__hero">
      {publication.coverMedia?.secureUrl ? <img alt={`${publication.title} cover`} src={publication.coverMedia.secureUrl} /> : <span aria-hidden="true">{planetFaceEmoji(publication.planet)}</span>}
      <p>{chapters.length} {chapterWord} · {publication.category || "World"}</p>
    </section>

    <WorldPrimaryMedia media={primaryMedia} title={publication.title || "World"} />

    <section className="world-inside-detail__creator">
      <FanAvatar name={creatorName} size="h-8 w-8" src={creator.avatar} />
      <div>
        <Link to={creator.username ? `/profile/${creator.username}` : "#"}>{creatorName} {creator.verified ? "✓" : ""}</Link>
        <small>{primaryMedia?.duration ? `${formatMediaTime(primaryMedia.duration)} — ` : ""}why this world exists</small>
      </div>
    </section>

    {publication.description || publication.summary ? <p className="world-inside-detail__description">{publication.description || publication.summary}</p> : null}

    {storyPreviews.length ? <section className="world-inside-detail__stories" aria-label="Private stories">
      <h2>PRIVATE STORIES <span>you&apos;re in</span></h2>
      <div>
        {storyPreviews.map((story, index) => <button aria-label={`Open ${story.title || "private story"}`} key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => onOpenStory(story)} type="button">
          <span>{story.mediaType === "VIDEO" || story.resourceType === "video" ? <video muted playsInline preload="metadata" src={story.secureUrl} /> : <img alt="" src={story.secureUrl} />}</span>
          <small>{story.title || "Story"}</small>
        </button>)}
      </div>
    </section> : null}

    {gallery.length ? <section className="world-inside-detail__gallery" aria-label="World media gallery">
      {gallery.map((item, index) => <button aria-label={`Open ${item.title || `World image ${index + 1}`} as a story`} key={`${item.assetId || item.secureUrl}-${index}`} onClick={() => onOpenStory(item)} type="button">
        {item.mediaType === "VIDEO" || item.resourceType === "video" ? <video muted playsInline preload="metadata" src={item.secureUrl} /> : <img alt="" loading="lazy" src={item.secureUrl} />}
      </button>)}
    </section> : null}

    <section className="world-inside-detail__journey">
      <h2>THE JOURNEY</h2>
      {includedExperiences.length ? <div>
        {shownChapters.map((chapter, index) => <button className="world-inside-detail__chapter" key={chapter.stableChapterId || chapter.id || index} onClick={() => onOpenChapter(chapters.indexOf(chapter))} type="button">
          <span>{chapters.indexOf(chapter) + 1}</span>
          <b>{chapter.title || `Chapter ${chapters.indexOf(chapter) + 1}`}</b>
          <i>›</i>
        </button>)}
        {includedExperiences.map((item) => {
          const experienceId = item.id || item._id;
          const chapterCount = Number(item.chapterCount ?? item.chapters?.length ?? 0);
          const price = Number(item.pricing?.starsAmount || 0);
          const meta = [
            `${chapterCount} ${chapterCount === 1 ? "chapter" : "chapters"}`,
            item.pricing?.mode === "FREE" ? "free" : price ? `${STAR}${price} included` : "included",
          ].filter(Boolean).join(" · ");
          return (
            <Link className="world-inside-detail__experience" key={experienceId || item.title} to={experienceId ? `/experience/${experienceId}` : "#"}>
              <span className="world-inside-detail__experience-cover">
                {item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i aria-hidden="true">{STAR}</i>}
              </span>
              <span className="world-inside-detail__experience-copy">
                <small>{item.category || "Experience"}</small>
                <b>{item.title || "Untitled Experience"}</b>
                <em>{meta}</em>
              </span>
              <i aria-hidden="true">{"\u203a"}</i>
            </Link>
          );
        })}
      </div> : <p className="world-inside-detail__empty">No experiences have been included yet.</p>}
      {hiddenChapterCount ? <button className="world-inside-detail__expand" onClick={() => setExpanded(true)} type="button">+{hiddenChapterCount} {hiddenChapterCount === 1 ? "chapter" : "chapters"} ▼</button> : expanded && chapters.length > 3 ? <button className="world-inside-detail__expand" onClick={() => setExpanded(false)} type="button">Show less ↑</button> : null}
    </section>

    <section className="world-inside-detail__comments">
      <h2>Comments · {Number(engagement.commentCount || 0).toLocaleString()}</h2>
      <WorldInsideComments engagement={engagement} mutationBusy={commentBusy} onCommentReact={toggleCommentReaction} onReply={setReplyTarget} replyTarget={replyTarget} />
      {publication.commentsEnabled === false ? <p className="world-inside-detail__comments-empty">Comments are turned off for this World.</p> : <form onSubmit={submitComment}>
        <FanAvatar name={user?.name || user?.username || "You"} size="h-7 w-7" src={user?.avatar} />
        <div>
          {replyTarget ? <span>Replying to {replyTarget.author?.name || "comment"} <button onClick={() => setReplyTarget(null)} type="button">Cancel</button></span> : null}
          <input aria-label="Add a comment" maxLength={500} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment..." value={commentText} />
        </div>
        <button aria-label="Voice comments are not available here" disabled type="button"><FiMic /></button>
        <button disabled={!canPostComment} type="submit">{posting ? "Posting..." : "Post"}</button>
      </form>}
    </section>

    {moreOpen ? <WorldInsideMoreSheet onClose={() => setMoreOpen(false)} onCopy={copyLink} onShare={shareWorld} /> : null}
  </article>;
}

function ExperienceVisitorOverview({ canView, chapters, onBack, onOpenChapter, onShare, onUnlock, publication }) {
  const cover = publication.coverMedia?.secureUrl || publication.coverMedia?.thumbnailUrl;
  const creatorName = publication.creator?.name || publication.creator?.username || "Creator";
  const chapterWord = chapters.length === 1 ? "chapter" : "chapters";
  return <article className="experience-viewer-page experience-public-viewer">
    <header className="experience-viewer-head">
      <button aria-label="Back to profile" onClick={onBack} type="button"><FiX /></button>
      <button aria-label="Share Experience" className="experience-public-share" onClick={onShare} type="button"><FiArrowUpRight /></button>
    </header>
    <main>
      <button aria-label={!chapters[0]?.locked ? `Preview ${publication.title}` : `Unlock ${publication.title}`} className="experience-viewer-media" onClick={() => !chapters[0]?.locked ? onOpenChapter(0) : onUnlock()} type="button">{cover ? <img alt={`${publication.title} cover`} src={cover} /> : <span aria-hidden="true">{PLANET}</span>}</button>
      <h1>{publication.title}</h1>
      {publication.description || publication.summary ? <p>{publication.description || publication.summary}</p> : null}
      <span className="experience-viewer-category">{publication.category || "Experience"}</span>
      <p className="experience-public-creator">By {creatorName} {publication.creator?.verified ? <FiCheck aria-label="Verified creator" /> : null} {"\u00b7"} {chapters.length} {chapterWord}</p>
      <div className="experience-viewer-chapters">
        {chapters.map((chapter, index) => { const locked = Boolean(chapter.locked && !canView); return <button aria-label={locked ? `${chapter.title} is locked` : `Open ${chapter.title}`} key={chapter.stableChapterId || chapter.id || index} onClick={() => locked ? onUnlock() : onOpenChapter(index)} type="button"><i>{index + 1}</i><strong>{chapter.title || `Chapter ${index + 1}`}</strong>{locked ? <FiLock aria-hidden="true" /> : index === 0 && !canView ? <small>FREE</small> : null}<b>›</b></button>; })}
      </div>
      {!chapters.length ? <p>No chapters yet.</p> : null}
      {!canView ? <section className="experience-unlock-panel"><span>ONE-TIME PURCHASE</span><p>Unlock every chapter permanently, including future updates.</p><button onClick={onUnlock} type="button">Unlock Experience {"\u00b7"} {STAR}{publication.pricing?.starsAmount}</button></section> : <footer className="seen-detail-engagement"><div className="seen-detail-start-meta"><span>{chapters.length} {chapterWord} {"\u00b7"} ~{Math.max(1, chapters.length)} min</span><span>Tap a chapter to start {"\u203a"}</span></div></footer>}
    </main>
  </article>;
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
  const [joinKey, setJoinKey] = useState("");
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
  const [giftOpen, setGiftOpen] = useState(false);
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
  const accessToken = new URLSearchParams(location.search).get("access") || "";
  const canFetchMemberWorld = Boolean(user && publicationId && premium && (owner || publication?.access === "ACTIVE_PREMIUM_MEMBER"));
  const managementQuery = useQuery({
    queryKey: ["world-management", publicationId],
    queryFn: () => api.getWorldManagement(publicationId).then((response) => response.data.data),
    enabled: Boolean(owner && publicationId),
    retry: false,
  });
  const memberWorldQuery = useQuery({
    queryKey: ["member-world", publicationId],
    queryFn: () => api.getMemberWorld(publicationId).then((response) => response.data.data),
    enabled: canFetchMemberWorld,
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
    enabled: Boolean(user && publicationId && !experience && (walkersOpen || (premium && !owner))),
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
  const accessLinkQuery = useQuery({ queryKey: ["experience-access-link", publicationId], queryFn: () => api.getExperienceAccessLink(publicationId).then((response) => response.data.data), enabled: Boolean(owner && experience && sheet === "access"), retry: false });
  const accessRequest = useMutation({ mutationFn: () => api.requestExperienceAccess(publicationId, accessToken), onSuccess: async (response) => { showToast(response.data.message); if (response.data.data?.request?.status === "APPROVED") await query.refetch(); }, onError: (error) => showToast(error?.response?.data?.message || "Access request could not be sent.") });
  const accessDecision = useMutation({ mutationFn: ({ requestId, approved }) => api.decideExperienceAccess(publicationId, requestId, approved), onSuccess: async (response) => { await accessLinkQuery.refetch(); showToast(response.data.message); } });
  useEffect(() => { if (experience && accessToken && user && !owner && !accessRequest.isPending && !accessRequest.isSuccess && !accessRequest.isError) accessRequest.mutate(); }, [accessToken, experience, owner, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const joinPremium = useMutation({
    mutationFn: () => {
      const key = joinKey || createIdempotencyKey("premium-join");
      setJoinKey(key);
      return membershipService.joinPremiumWorld(publicationId, key);
    },
    onSuccess: async (response) => {
      const payload = response?.data?.data || {};
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["world", id] }),
        queryClient.invalidateQueries({ queryKey: ["member-world", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["world-walkers", publicationId] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      if (payload?.membership) {
        queryClient.setQueryData(["memberships"], (current = []) => {
          const next = {
            ...payload.membership,
            premiumPublication: { id: publicationId, _id: publicationId, title: publication?.title, planet: publication?.planet },
          };
          return [next, ...current.filter((item) => String(item.id || item._id) !== String(next.id))];
        });
      }
      await Promise.all([query.refetch(), memberships.refetch(), walkersQuery.refetch()]);
      setJoinKey("");
      navigate(`/world/${publicationId}/inside`, { replace: true });
    },
    onError: async (error) => {
      if (financialErrorCode(error) === "MEMBERSHIP_ALREADY_ACTIVE") {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["memberships"] }),
          queryClient.invalidateQueries({ queryKey: ["world", id] }),
          queryClient.invalidateQueries({ queryKey: ["member-world", publicationId] }),
        ]);
        await Promise.all([query.refetch(), memberships.refetch()]);
        setJoinKey("");
        navigate(`/world/${publicationId}/inside`, { replace: true });
        return;
      }
      setJoinKey("");
      showToast(financialErrorMessage(error, "Could not join this World. Please try again."));
    },
  });

  const management = managementQuery.data?.management || {};
  const managedPublication = managementQuery.data?.publication || publication;
  const memberWorldPublication = memberWorldQuery.data?.world || null;
  const memberWorldExperiences = includedWorldExperiences(memberWorldPublication || {}).length
    ? includedWorldExperiences(memberWorldPublication || {})
    : management.includedExperiences || [];
  const experienceArchived = managedPublication?.status === "ARCHIVED";
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
    mutationFn: () => experienceArchived
      ? api.restorePublication(publicationId, managedPublication.statusVersion)
      : api.archivePublication(publicationId, managedPublication.statusVersion),
    onSuccess: async () => {
      await Promise.all([
        query.refetch(),
        managementQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-experiences"] }),
      ]);
      showToast(experienceArchived ? "Experience is back on sale." : "Experience removed from sale.");
    },
    onError: (error) => showToast(error?.response?.data?.message || (experienceArchived ? "Experience could not be put back on sale." : "Experience could not be removed from sale.")),
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

  const insideRequested = location.pathname.endsWith("/inside");
  const insideDetailRequested = insideRequested && new URLSearchParams(location.search).get("view") === "detail";
  const canViewMemberContent = owner || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_EXPERIENCE"].includes(publication?.access);
  const activeMembership = memberships.data?.find((item) => String(item.premiumPublication?._id || item.premiumPublication?.id) === String(publicationId) && isActivePremiumMembership(item));
  const openPremiumJoin = () => {
    if (joinPremium.isPending) return;
    if (owner || canViewMemberContent) {
      navigate(`/world/${publicationId}/inside`);
      return;
    }
    if (!user) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    joinPremium.mutate();
  };
  const openCreatorMessages = (creatorUserId = creatorId) => {
    if (!creatorUserId) return;
    navigate(`/messages?with=${encodeURIComponent(creatorUserId)}&directAccess=1`);
  };
  if (insideRequested && premium && !owner && !canViewMemberContent) {
    return (
      <div className="world-member-inside-page">
        <section className="world-member-inside-content world-member-denied">
          <span className="world-member-planet" aria-hidden="true">{planetFaceEmoji(publication?.planet)}</span>
          <h1>Members only</h1>
          <p>Join {creatorFirstName(creator)}&apos;s World to enter this space.</p>
          <button className="world-member-primary" disabled={joinPremium.isPending} onClick={openPremiumJoin} type="button">
            {joinPremium.isPending ? "Confirming..." : `Join ${creatorFirstName(creator)}'s World`}
          </button>
        </section>
      </div>
    );
  }
  if (insideDetailRequested && premium && canViewMemberContent) {
    if (activeChapterIndex !== null && experienceChapters[activeChapterIndex]) {
      return <ChapterExperience
        chapter={experienceChapters[activeChapterIndex]}
        chapterIndex={activeChapterIndex}
        chapters={experienceChapters}
        experienceTitle={managedPublication.title}
        onBack={() => setActiveChapterIndex(null)}
        onSelect={setActiveChapterIndex}
        publicationId={publicationId}
      />;
    }
    return <>
      <WorldInsideDetailPage
        canViewMemberContent={canViewMemberContent}
        chapters={memberWorldPublication?.chapters || chapters}
        creator={creator}
        engagementQuery={engagement}
        experiences={memberWorldExperiences}
        onBack={() => navigate(`/world/${publicationId}/inside`)}
        onGift={() => setGiftOpen(true)}
        onOpenChapter={(index) => setActiveChapterIndex(index)}
        onOpenStory={setActiveStory}
        publication={memberWorldPublication || publication}
      />
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={publication.title} /> : null}
      {giftOpen ? <StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast("Gift sent in Messages.")} recipient={{ id: creatorId, name: creator.name || creator.username }} sourceType="DIRECT" /> : null}
    </>;
  }
  if (insideRequested && premium && canViewMemberContent) {
    return (
      <WorldMemberInsidePage
        activeMembership={activeMembership}
        chapters={chapters}
        creator={creator}
        onOpenChapter={() => navigate(`/world/${publicationId}/inside?view=detail`)}
        onOpenMessages={openCreatorMessages}
        publication={publication}
      />
    );
  }
  if (!insideRequested && premium && canViewMemberContent && !owner && activeChapterIndex === null) {
    return <>
      <WorldInsideDetailPage
        canViewMemberContent={canViewMemberContent}
        chapters={memberWorldPublication?.chapters || chapters}
        creator={creator}
        engagementQuery={engagement}
        experiences={memberWorldExperiences}
        onBack={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
        onGift={() => setGiftOpen(true)}
        onOpenChapter={(index) => setActiveChapterIndex(index)}
        onOpenStory={setActiveStory}
        publication={memberWorldPublication || publication}
      />
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={publication.title} /> : null}
      {giftOpen ? <StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast("Gift sent in Messages.")} recipient={{ id: creatorId, name: creator.name || creator.username }} sourceType="DIRECT" /> : null}
    </>;
  }
  const selectedPreviewChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  if (premium && !owner && !(selectedPreviewChapter && canReadChapter(selectedPreviewChapter, canViewMemberContent))) {
    return (
      <>
        <PremiumWorldPreviewPage
          activeMembership={activeMembership}
          canViewMemberContent={canViewMemberContent}
          chapters={chapters}
          creator={creator}
          joinPending={joinPremium.isPending}
          memberPreview={walkersQuery.data}
          onBack={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
          onJoin={openPremiumJoin}
          onOpenChapter={setActiveChapterIndex}
          onShare={setActiveStory}
          owner={owner}
          publication={publication}
        />
        {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={publication.title} /> : null}
      </>
    );
  }

  if (activeChapterIndex !== null && experienceChapters[activeChapterIndex]) {
    const selectExperienceChapter = (index) => {
      if (!canReadChapter(experienceChapters[index], canViewMemberContent)) {
        setActiveChapterIndex(null);
        if (premium) openPremiumJoin();
        else setShowExperienceUnlock(true);
        return;
      }
      setActiveChapterIndex(index);
    };
    return <ChapterExperience
      chapter={experienceChapters[activeChapterIndex]}
      chapterIndex={activeChapterIndex}
      chapters={experienceChapters}
      experienceTitle={managedPublication.title}
      onBack={() => setActiveChapterIndex(null)}
      onSelect={selectExperienceChapter}
      publicationId={publicationId}
    />;
  }

  if (experience && !owner) {
    return <>
      <ExperienceVisitorOverview
        canView={canViewMemberContent}
        chapters={experienceChapters}
        onBack={() => navigate(creator.username ? `/profile/${creator.username}` : -1)}
        onOpenChapter={setActiveChapterIndex}
        onShare={() => setSheet("share")}
        onUnlock={() => user ? setShowExperienceUnlock(true) : navigate("/login", { state: { from: { pathname: location.pathname } } })}
        publication={managedPublication}
      />
      {sheet === "share" ? <ShareSheet onClose={() => setSheet("")} publication={managedPublication} viewerId={viewerId} /> : null}
      <PurchaseWorldModal
        onClose={() => setShowExperienceUnlock(false)}
        onSuccess={() => query.refetch()}
        open={showExperienceUnlock}
        publication={publication}
      />
    </>;
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
        queryClient.invalidateQueries({ queryKey: ["member-world", publicationId] }),
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
        <button onClick={() => setSheet("access")} type="button"><FiLink /><span><b>Access by link</b><small>send a link — you confirm who enters</small></span></button>
        <button onClick={() => navigate(`/studio/experiences/${publicationId}/edit`)} type="button"><FiEdit3 /><span><b>Edit</b><small>title, path, price, chapters</small></span></button>
        <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>Change cover</b></span></button>
        <button disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? "Turn comments off" : "Turn comments on"}</b></span></button>
        <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>Moderators</b><small>this product’s own cleanup team</small></span></button>
        <button className={experienceArchived ? "" : "is-remove"} disabled={archiveExperience.isPending} onClick={() => window.confirm(experienceArchived ? "Put this Experience back on sale? Other users will be able to see and purchase it again." : "Remove this Experience from sale? Buyers keep their permanent access.") && archiveExperience.mutate()} type="button"><FiTrash2 /><span><b>{archiveExperience.isPending ? (experienceArchived ? "Restoring…" : "Removing…") : (experienceArchived ? "Back on sale" : "Remove from sale")}</b><small>{experienceArchived ? "archived" : "buyers keep it forever"}</small></span></button>
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
                <button className={experienceArchived ? "" : "is-danger-muted"} disabled={archiveExperience.isPending} onClick={() => window.confirm(experienceArchived ? "Put this Experience back on sale?" : "Remove this Experience from sale?") && archiveExperience.mutate()} type="button"><FiArchive /><span>{archiveExperience.isPending ? (experienceArchived ? "Restoring…" : "Removing…") : (experienceArchived ? "Back on sale" : "Remove from sale")}</span></button>
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
              <b>Direct Access{management.directAccess?.waiting ? ` · ${management.directAccess.waiting} waiting` : ""}</b>
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
                <Link className={`world-settings-item ${stories.length ? "is-complete" : "is-add"}`} to={`/studio/worlds/${publicationId}/edit`}>
                  <span className="world-settings-status">{stories.length ? <FiCheck /> : <FiPlus />}</span>
                  <span className="world-settings-copy"><b>Private stories</b><small>{stories.length ? `${stories.length} · 15s — fans see them blurred outside` : "add the first — blurred teasers pull people in"}</small></span>
                  {!stories.length ? <FiChevronRight className="world-settings-row-chevron" /> : null}
                </Link>
                <button className={`world-settings-item ${includedExperiences.length ? "is-complete" : "is-add"}`} onClick={() => setSheet("include")} type="button">
                  <span className="world-settings-status">{includedExperiences.length ? <FiCheck /> : <FiPlus />}</span>
                  <span className="world-settings-copy"><b>Experiences included</b><small>{includedExperiences.length ? `${includedExperiences.length} · included for members` : "add one — “included” sells the World"}</small></span>
                  {!includedExperiences.length ? <FiChevronRight className="world-settings-row-chevron" /> : null}
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

        {!experience ? <p className="world-prototype-summary">{managedPublication.description || managedPublication.summary}</p> : null}

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
      {sheet === "access" ? <ExperienceAccessSheet data={accessLinkQuery.data} error={accessLinkQuery.error?.response?.data?.message || (accessLinkQuery.isError ? "The access-link service could not be reached." : "")} loading={accessLinkQuery.isLoading || accessLinkQuery.isFetching} onClose={() => setSheet("")} onCopy={async () => { try { await copyToClipboard(accessLinkQuery.data?.url || ""); showToast("Access link copied."); } catch { showToast("Access link could not be copied."); } }} onDecide={(requestId, approved) => accessDecision.mutate({ requestId, approved })} onRetry={() => accessLinkQuery.refetch()} pendingId={accessDecision.isPending ? accessDecision.variables?.requestId : ""} /> : null}
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
      <PurchaseWorldModal onClose={() => setShowExperienceUnlock(false)} onSuccess={() => query.refetch()} open={showExperienceUnlock} publication={publication} />
    </>
  );
}
