import { getLocale as __uiLocale } from "../../i18n/runtime.js";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { msg as __msg } from "../../i18n/runtime.js";
import MemberCommentBadge from "../../components/comments/MemberCommentBadge";
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaSnapchatGhost, FaWhatsapp } from "react-icons/fa";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiArchive,
  FiBarChart2,
  FiBookmark,
  FiBookOpen,
  FiCheck,
  FiChevronRight,
  FiCopy,
  FiEdit3,
  FiFlag,
  FiGift,
  FiHeart,
  FiImage,
  FiLink,
  FiLock,
  FiMapPin,
  FiMessageCircle,
  FiMessageSquare,
  FiMic,
  FiMoreHorizontal,
  FiPlay,
  FiPlus,
  FiPlusCircle,
  FiSettings,
  FiShare2,
  FiShield,
  FiSlash,
  FiSearch,
  FiSquare,
  FiUpload,
  FiUsers,
  FiUserPlus,
  FiTrash2,
  FiX,
  FiZap,
} from "react-icons/fi";
import ChapterVoicePlayer from "../../components/publication/ChapterVoicePlayer";
import PublicationCoverMedia from "../../components/publication/PublicationCoverMedia";
import PurchaseWorldModal from "../../components/financial/PurchaseWorldModal";
import JoinPremiumModal from "../../components/financial/JoinPremiumModal";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import VoiceMessageBubble from "../../components/messaging/VoiceMessageBubble";
import VoiceCommentRecorder from "../../components/comments/VoiceCommentRecorder";
import MinimalWorldIcon from "../../components/world/MinimalWorldIcon";
import { JoinMoment, WorldOrb } from "../../components/publication/SuccessMoment";
import StoryGiftPicker from "../../components/stories/StoryGiftPicker";
import StoryCreator from "../../components/stories/StoryCreator";
import StoryViewer from "../../components/stories/StoryViewer";
import AppShareSheet from "../../components/share/ShareSheet";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { formatVoiceTime, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { useShareRecipients } from "../../hooks/share/useShareRecipients";
import { useSendSharedContent } from "../../hooks/share/useSendSharedContent";
import { membershipService } from "../../services/membershipService";
import { messageService } from "../../services/messageService";
import { publicationService as api } from "../../services/publicationService";
import { walletService } from "../../services/walletService";
import { financialErrorCode, financialErrorMessage } from "../../utils/financialErrorMessages";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import "./worldPurchasePrototype.css";

const PLANET = String.fromCodePoint(0x1FA90);
const FLEX = String.fromCodePoint(0x1F4AA);
const STAR = String.fromCharCode(10022);
const PLANET_FACE_OPTIONS = ["💪", "📚", "💅", "✈️", "☕", "🎾", "🧘", "🎨", "🍳", "📷", "🏄", "🎧", "💼", "🌱", "🍷", "👶"];

const WORLD_REPORT_REASONS = [
  { get label() { return __msg("social.spam"); }, value: "SPAM" },
  { get label() { return __msg("fan.harassmentOrBullying"); }, value: "HARASSMENT" }, { get label() { return __msg("social.hate"); }, value: "HATE" },
  { get label() { return __msg("system.SeenReaderPage.be4acdd0d2"); }, value: "DEFAMATION" }, { get label() { return __msg("system.SeenReaderPage.415eeccf09"); }, value: "SEXUAL_CONTENT" },
  { get label() { return __msg("discover.violence"); }, value: "VIOLENCE" }, { get label() { return __msg("system.SeenReaderPage.bea5831470"); }, value: "SELF_HARM" },
  { get label() { return __msg("fan.scamOrFraud"); }, value: "SCAM" }, { get label() { return __msg("system.SeenReaderPage.0d9eff1da0"); }, value: "COPYRIGHT" },
  { get label() { return __msg("system.SeenReaderPage.a66546f650"); }, value: "IMPERSONATION" }, { get label() { return __msg("system.SeenReaderPage.4873074e0d"); }, value: "CHILD_SAFETY" },
  { get label() { return __msg("admin.other"); }, value: "OTHER" },
];

const WORLD_SPAM_ACTIONS = [
  { defaultChecked: true, description: "", key: "reportSpam", get label() { return __msg("fanWeb.reportSpam"); } },
  { defaultChecked: true, get description() { return __msg("social.everyPostAndCommentByThisCreator"); }, key: "deleteMessages", get label() { return __msg("social.deleteAllMessages"); } },
  { defaultChecked: false, description: "", key: "deleteReactions", get label() { return __msg("social.deleteAllReactions"); } },
  { defaultChecked: false, get description() { return __msg("social.theyWonTSeeYouOrWriteToYou"); }, key: "banCreator", get label() { return __msg("social.banCreator"); } },
  { defaultChecked: false, get description() { return __msg("social.accessEndsNowNoRefundForViolations"); }, key: "removeFromWorld", get label() { return __msg("social.removeFromYourWorld"); } },
];

function planetFaceEmoji(planet = {}) {
  return planet.faceEmoji || (planet.emoji && planet.emoji !== PLANET ? planet.emoji : "") || FLEX;
}

function withOptimisticWorldCommentHeart(engagement = {}, commentId, active) {
  const update = (comment) => String(comment.id) === String(commentId)
    ? { ...comment, viewerReaction: active ? "LOVE" : null, reactionCount: Math.max(0, Number(comment.reactionCount || 0) + (active ? 1 : -1)) }
    : { ...comment, replies: (comment.replies || []).map(update) };
  return { ...engagement, comments: (engagement.comments || []).map(update) };
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

function storyItems(chapters) {
  return chapters
    .filter((chapter) => chapter.isPreview)
    .flatMap((chapter) => (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, blockId: block.id, chapterId: chapter.stableChapterId, title: block.metadata?.label || chapter.title })))
    .slice(0, 3);
}

function firstWorldMedia(publication, chapters) {
  return publication?.introMedia || publication?.coverMedia || chapters
    .flatMap((chapter) => chapter.blocks || [])
    .map((block) => block.media)
    .find((media) => media?.secureUrl) || null;
}

function creatorFirstName(creator = {}) {
  return (creator.name || creator.username || __msg("stories.thisCreator")).trim().split(/\s+/)[0] || __msg("stories.thisCreator");
}

function canReadChapter(chapter = {}, canViewMemberContent = false) {
  return Boolean(canViewMemberContent || chapter.isPreview || !chapter.locked);
}

function isActivePremiumMembership(membership = {}) {
  const status = membership.storedStatus || membership.status;
  const periodEnd = membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).getTime() : 0;
  return ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(status) && (!periodEnd || periodEnd > Date.now());
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
    .map((id, index) => ({ id: String(id), title: __msg("system.WorldReaderPage.fca0685c01", { value0: index + 1 }), included: true }));
}

function privateStoryItems(chapters) {
  return chapters
    .flatMap((chapter) => (chapter.blocks || [])
      .filter((block) => block.metadata?.storyPreview && ["IMAGE", "VIDEO"].includes(block.type) && block.media?.secureUrl)
      .map((block) => ({ ...block.media, title: block.metadata?.label || chapter.title || __msg("activity.story") })))
    .slice(0, 3);
}

function joinPriceText(offer = {}) {
  const regular = Number(offer.regularPrice || offer.pricing?.starsAmount || 0);
  const firstMonthEnabled = Boolean(offer.firstMonthOfferEnabled);
  const intro = Number(offer.introPrice || (regular ? Math.max(1, Math.ceil(regular / 2)) : 0));
  if (firstMonthEnabled && intro && regular) {
    return (
      <span className="world-join-price">
        <span className="world-join-price-icon" aria-hidden="true" />
        <span>{intro.toLocaleString(__uiLocale())} {__msg("social.firstMonth")}</span>
        <span className="world-join-old-price"><s>{regular.toLocaleString(__uiLocale())}</s><b>{__msg("system.perMonth")}</b></span>
      </span>
    );
  }
  return regular ? (
    <span className="world-join-price">
      <span className="world-join-price-icon" aria-hidden="true" />
      <span>{regular.toLocaleString(__uiLocale())}{__msg("system.perMonth")}</span>
    </span>
  ) : <span className="world-join-price">{__msg("profile.free")}</span>;
}

function BottomSheet({ children, labelledBy, onClose, sheetClassName = "" }) {
  __useUiLanguage();
  return (
    <div aria-labelledby={labelledBy} aria-modal="true" className="world-sheet-overlay" onMouseDown={onClose} role="dialog">
      <section className={`world-bottom-sheet ${sheetClassName}`.trim()} onMouseDown={(event) => event.stopPropagation()}>
        <span className="world-sheet-grab" />
        {children}
      </section>
    </div>
  );
}

// Kept temporarily as a reference while existing owner/member states still use its shared CSS vocabulary.
// eslint-disable-next-line no-unused-vars
function LegacyPremiumWorldPreviewPage({ activeMembership, canViewMemberContent, chapters, creator, joinPending, memberPreview, onBack, onCancelWaitlist, onJoin, onOpenWorld, onShare, owner, publication, waitingList, waitlistPending }) {
  __useUiLanguage();
  const media = firstWorldMedia(publication, chapters);
  const stories = storyItems(chapters);
  const displayName = creator.name || creator.username || __msg("discover.creator");
  const firstName = creatorFirstName(creator);
  const offer = { ...(publication || {}), ...(publication?.membershipOffer || {}) };
  const includedExperiences = includedWorldExperiences(publication);
  const hasIncludedExperiences = includedExperiences.length > 0;
  const memberCount = Math.max(Number(publication?.members?.count || 0), Number(memberPreview?.pagination?.total || 0), 0);
  const memberAvatars = (publication?.members?.previewAvatars?.length ? publication.members.previewAvatars : (memberPreview?.items || []).map((item) => item.user))
    .filter(Boolean)
    .slice(0, 4);
  const foundingCapacity = Number(publication?.worldFoundingCapacity || 0);
  const nextMemberNumber = Number(publication?.viewer?.memberNumber || offer.nextMemberNumber || memberCount + 1);
  const memberState = canViewMemberContent || activeMembership || publication?.viewer?.isMember;
  const storiesUnlocked = owner || memberState;
  const benefits = [
    { icon: <FiZap />, text: __msg("social.everyPaidSeenInValue0SWorld", { value0: firstName }), show: hasIncludedExperiences },
    { icon: <FiUsers />, text: __msg("social.yourMemberNumberAppearsBesideYourName"), show: true },
    { icon: <FiCheck />, text: __msg("social.storiesValue0DoesNotPostPublicly", { value0: firstName }), show: stories.length > 0 },
    { icon: <span className="world-preview-ring-icon" />, text: __msg("social.answersFirstOneDirectAccessReplyIncludedEach"), show: publication?.directAccessIncluded },
  ].filter((item) => item.show);
  const valueRows = [
    { title: __msg("social.yourPriceIsLocked"), detail: __msg("social.whileYourMembershipRemainsActive"), show: publication?.memberPriceLocked !== false },
    { title: __msg("social.everythingFutureAlreadyYours"), detail: __msg("system.WorldReaderPage.ea9244038b"), show: true },
    { title: `You become #${nextMemberNumber.toLocaleString(__uiLocale())}`, detail: __msg("social.firstValue0AreTheFoundingCircle", { value0: foundingCapacity.toLocaleString(__uiLocale()) }), show: Boolean(foundingCapacity && nextMemberNumber <= foundingCapacity) },
  ].filter((item) => item.show);

  return (
    <article className="world-preview-page world-page">
      <header className="world-preview-media world-hero">
        {media?.secureUrl ? (
          media.resourceType === "video" || media.mediaType === "VIDEO"
            ? <video controls playsInline preload="metadata" src={media.secureUrl} />
            : <img alt={__msg("admin.preview_c39702", { value0: publication.title })} src={media.secureUrl} />
        ) : <div className="world-preview-media-empty"><span>{PLANET}</span></div>}
        {(media?.resourceType === "video" || media?.mediaType === "VIDEO") && media?.duration ? <span className="world-preview-duration">▶ {Math.round(Number(media.duration || 0))}s</span> : null}
        <button aria-label={__msg("profile.backToProfile")} className="world-preview-close" onClick={onBack} type="button"><FiX /></button>
      </header>

      <section className="world-preview-intro world-header">
        <p>{__msg("profile.sWorld_9663ba", { value0: displayName })}</p>
        <h1>{publication.title}</h1>
        <span>{__msg("social.theOnlyAFewPeopleGetToSee", { value0: firstName })}</span>
      </section>

      {stories.length ? (
        <section aria-label={__msg("social.privateStoryPreviews")} className="world-preview-stories world-private-previews">
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
                {story.resourceType === "video" ? <video muted playsInline preload="metadata" src={story.secureUrl} /> : <img alt={story.title || __msg("social.worldPreview")} src={story.secureUrl} />}
                <i className="world-private-lock"><FiLock /></i>
              </span>
              <span>{__msg("social.private")}</span>
            </button>
          ))}
        </section>
      ) : null}

      <section className="world-preview-inside">
        <h2>{__msg("social.whatSInside")}</h2>
        <div className="world-experience-preview-list is-paid-seen-grid">
          {includedExperiences.length ? includedExperiences.map((item, index) => (
            <button className="world-experience-preview-card" key={item.id || item._id || `${item.title}-${index}`} onClick={memberState ? onOpenWorld : onJoin} type="button">
              {item.coverMedia?.secureUrl ? <PublicationCoverMedia alt="" className="world-paid-seen-cover" media={item.coverMedia} /> : <b className="world-chapter-number">{String(index + 1).padStart(2, "0")}</b>}
              <span className="world-chapter-copy">
                <strong>{item.title || __msg("system.WorldReaderPage.fca0685c01", { value0: index + 1 })}</strong>
                {item.summary ? <small>{item.summary}</small> : null}
              </span>
              {memberState ? <em className="world-chapter-action">{__msg("publication.open")}</em> : <FiLock className="world-chapter-lock" />}
            </button>
          )) : <p className="world-preview-inside-empty">{__msg("system.WorldReaderPage.e8f6ee39e9")}</p>}
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
        <b>{memberCount ? __msg("social.alreadyCloser", { value0: memberCount.toLocaleString(__uiLocale()), value1: memberCount === 1 ? __msg("social.personIs") : __msg("social.peopleAre") }) : __msg("social.beTheFirstToStepCloser")}</b>
      </section>

      {owner ? (
        <Link className="world-preview-cta world-join-button" to={`/studio/worlds/${publication.id}/edit`}>{__msg("social.manageWorld")}</Link>
      ) : memberState ? (
        <button className="world-preview-cta world-join-button" onClick={onOpenWorld} type="button">{__msg("social.youReInsideOpenSWorld", { value0: firstName })}</button>
      ) : waitingList ? (
        <button className="world-preview-cta world-join-button is-waiting" disabled={waitlistPending} onClick={onCancelWaitlist} type="button">
          <span className="world-join-label">{waitlistPending ? __msg("social.returningStars") : __msg("social.waitingListCancel", { value0: Number(waitingList.position || 1).toLocaleString(__uiLocale()) })}</span>
        </button>
      ) : (
        <button className="world-preview-cta world-join-button" disabled={joinPending || !publication?.id || offer.enabled === false} onClick={onJoin} type="button">
          {joinPending ? <span className="world-join-label">{__msg("social.confirming")}</span> : <><span className="world-join-label">{__msg("profile.join")} {firstName}{__msg("social.sWorld")}</span>
          <span className="world-join-dot" aria-hidden="true">·</span>
          {joinPriceText(offer)}</>}
        </button>
      )}
      {!owner ? <p className="world-preview-terms world-join-footer">{__msg("social.cancelAnytime")} {firstName} {__msg("social.seesEveryNewMember")}</p> : null}
    </article>
  );
}

function PremiumWorldPreviewPage({ activeMembership, canViewMemberContent, chapters, creator, joinPending, memberPreview, onBack, onCancelWaitlist, onJoin, onOpenWorld, owner, publication, waitingList, waitlistPending }) {
  __useUiLanguage();
  const media = publication?.coverMedia?.secureUrl ? publication.coverMedia : firstWorldMedia(publication, chapters);
  const stories = storyItems(chapters).slice(0, 3);
  const firstName = creatorFirstName(creator);
  const displayName = creator.name || creator.username || __msg("discover.creator");
  const offer = { ...(publication || {}), ...(publication?.membershipOffer || {}) };
  const includedExperiences = includedWorldExperiences(publication);
  const circles = publication?.privateCircles || [];
  const memberCount = Math.max(Number(publication?.members?.count || 0), Number(memberPreview?.pagination?.total || 0), 0);
  const memberAvatars = (publication?.members?.previewAvatars?.length ? publication.members.previewAvatars : (memberPreview?.items || []).map((item) => item.user)).filter(Boolean).slice(0, 5);
  const foundingCapacity = Number(publication?.worldFoundingCapacity || 250);
  const nextMemberNumber = Number(publication?.viewer?.memberNumber || offer.nextMemberNumber || memberCount + 1);
  const memberState = canViewMemberContent || activeMembership || publication?.viewer?.isMember;
  const regularPrice = Number(offer.regularPrice || publication?.pricing?.starsAmount || 0);
  const introPrice = Number(offer.introPrice || 0);
  const joinPrice = introPrice > 0 && introPrice < regularPrice ? introPrice : regularPrice;
  const action = owner ? <Link className="world-proto-buy" to={`/studio/worlds/${publication.id}/edit`}>{__msg("social.manageWorld")}</Link> : memberState ? <button className="world-proto-buy" onClick={onOpenWorld} type="button">{__msg("publication.stepInside")} {firstName}{__msg("profile.sWorld")}</button> : waitingList ? <button className="world-proto-buy" disabled={waitlistPending} onClick={onCancelWaitlist} type="button">{waitlistPending ? __msg("system.WorldReaderPage.bd9afadfb6") : __msg("system.WorldReaderPage.cb06562039", { value0: waitingList.position || 1 })}</button> : <button className="world-proto-buy" disabled={joinPending || offer.enabled === false} onClick={onJoin} type="button">{joinPending ? __msg("fan.opening") : <>{__msg("profile.join")} {firstName}{__msg("system.WorldReaderPage.2f855c48b0")} <span className="world-join-price-icon" />{joinPrice}{introPrice ? <> {__msg("social.firstMonth")} <s>{regularPrice}{__msg("system.perMonth")}</s></> : __msg("system.perMonth")}</>}</button>;
  const perks = [
    [<FiBookOpen key="icon" />, __msg("system.copy.ecef1e8ed125"), __msg("system.copy.dc3b53d4e16f")],
    [<FiMessageCircle key="icon" />, __msg("system.WorldReaderPage.0cdd39f1ab"), __msg("system.copy.f8a2f52c2a72")],
    [<FiZap key="icon" />, __msg("system.copy.db5d1014027c"), __msg("social.whatValue0SharesOnlyInside", { value0: firstName })],
    [<span className="world-preview-ring-icon" key="icon" />, __msg("system.copy.4afeea1709ac"), __msg("system.copy.72bf5cc0088f")],
  ];
  return <article className="world-proto-purchase">
    <header className="world-proto-hero">
      {media?.secureUrl ? (media.resourceType === "video" || media.mediaType === "VIDEO" ? <video autoPlay loop muted playsInline src={media.secureUrl} /> : <img alt="" src={media.secureUrl} />) : <div className="world-preview-media-empty"><span>{PLANET}</span></div>}
      <div className="world-proto-shade" /><button aria-label={__msg("system.WorldReaderPage.3c3d4b1890")} className="world-proto-close" onClick={onBack} type="button"><FiX /></button>
      <div className="world-proto-title"><small><WorldOrb /> {displayName}{__msg("profile.sWorld")}</small><h1>{publication.title}</h1><p>{__msg("system.WorldReaderPage.f85274b03a")} {firstName} {__msg("system.WorldReaderPage.2ece2907b2")}</p><b><span className="world-join-price-icon" /> {regularPrice} {__msg("profile.aMonth")} <em>{__msg("system.WorldReaderPage.837f593b83")}</em></b></div>
    </header>
    <main className="world-proto-body">
      <p className="world-proto-active"><i /> {firstName} {__msg("system.WorldReaderPage.7abaf5dde8")} <span>{__msg("system.WorldReaderPage.ea8ae8761e")}</span></p>
      <div className="world-proto-members">{memberAvatars.length ? <span>{memberAvatars.map((member, index) => <FanAvatar key={member.id || index} name={member.displayName || member.name || member.username} size="h-6 w-6" src={member.avatar || member.avatarUrl} />)}</span> : null}<b>{memberCount ? __msg("system.WorldReaderPage.da8d48a08a", { value0: memberCount }) : __msg("system.WorldReaderPage.0e655f4a32")}</b></div>
      <h2>{__msg("system.WorldReaderPage.f31727ff20")}</h2><section className="world-proto-perks">{perks.map(([icon, title, copy]) => <div key={title}>{icon}<span><b>{title}</b><small>{copy}</small>{title === "Your member badge" ? <em>⌁ {firstName} #{nextMemberNumber}</em> : null}</span></div>)}</section>
      {stories.length ? <section className="world-proto-stories">{stories.map((story, index) => <div key={story.assetId || index}><span>{story.resourceType === "video" ? <video muted playsInline src={story.secureUrl} /> : <img alt={__msg("profile.privateStory")} src={story.secureUrl} />}<i><FiLock /></i></span><small>{__msg("social.private")}</small></div>)}</section> : null}
      <h2>{__msg("system.WorldReaderPage.9f6b5fd0b2")}</h2><section className="world-proto-circles">{circles.length ? circles.slice(0, 4).map((circle) => <div key={circle.id}><span>{(circle.memberPreview || []).slice(0, 3).map((member, index) => <FanAvatar key={member.id || index} name={member.name || member.username} size="h-6 w-6" src={member.avatar} />)}</span><b>{circle.name}<small>{circle.memberCount || 0} {__msg("system.WorldReaderPage.0c3cbc60e6")} {Number(circle.talkingNow) > 0 ? <i><span className="world-live-dot" aria-hidden="true" />{circle.talkingNow} {__msg("system.WorldReaderPage.ee94993eb4")}</i> : null}</small></b><FiLock /></div>) : <div className="world-proto-circle-placeholder"><span><FiUsers /></span><b>{__msg("system.WorldReaderPage.d283b53ce8")}<small>{__msg("system.WorldReaderPage.27771e2781")}</small></b><FiLock /></div>}</section>
      <h2>{__msg("system.WorldReaderPage.daa36604ca")}</h2><section className="world-proto-chapters">{chapters.slice(0, 4).map((chapter, index) => <div className={index === 0 ? "is-free" : ""} key={chapter.id || chapter.stableChapterId || index}><b>{index + 1}</b><span><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong><small>{chapter.summary || __msg("system.WorldReaderPage.9213f1c39a")}</small></span>{index === 0 ? <em>{__msg("system.WorldReaderPage.d152c5cdc7")}</em> : <FiLock />}</div>)}</section>
      {includedExperiences.length ? <><h2>{__msg("system.WorldReaderPage.8b95d2baa5")}</h2><section className="world-proto-included">{includedExperiences.slice(0, 3).map((item) => <article key={item.id || item._id}><div>{item.coverMedia?.secureUrl ? <PublicationCoverMedia alt="" media={item.coverMedia} /> : <span>{PLANET}</span>}<small><span className="world-join-price-icon" />{item.pricing?.starsAmount || __msg("system.WorldReaderPage.00f554d678")}</small></div><b>{item.title}</b></article>)}</section></> : null}
      <section className="world-proto-founders"><p><FiCheck /><span><b>{__msg("system.WorldReaderPage.e33232163a")}</b><small>{__msg("system.WorldReaderPage.871aab8b0b")}</small></span></p>{nextMemberNumber <= foundingCapacity ? <p><FiCheck /><span><b>{__msg("system.WorldReaderPage.8825807427")}{nextMemberNumber}</b><small>{__msg("system.WorldReaderPage.e0996a37c1")} {foundingCapacity} {__msg("system.WorldReaderPage.6628240119")}</small></span></p> : null}</section>
      <div className="world-proto-proof">{memberAvatars.length ? <span>{memberAvatars.map((member, index) => <FanAvatar key={member.id || index} name={member.displayName || member.name || member.username} size="h-6 w-6" src={member.avatar || member.avatarUrl} />)}</span> : null}<b>{memberCount} {__msg("system.WorldReaderPage.9135b2fd51")}</b></div>
      <footer className="world-proto-footer">{action}{!owner && !memberState ? <small>{joinPrice} {__msg("system.WorldReaderPage.8f633dfb57")} {regularPrice} {__msg("system.WorldReaderPage.bc8b2c007e")}</small> : null}</footer>
    </main>
  </article>;
}

function WorldMemberInsidePage({ activeMembership, chapters, creator, experiences = [], modal = false, onClose, onOpenChapter, onOpenMessages, onOpenStories, publication }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const [worldDoorOpen, setWorldDoorOpen] = useState(false);
  const firstName = creatorFirstName(creator);
  const creatorId = creator.id || creator._id || publication?.creatorId || "";
  const experienceCount = experiences.length;
  const memberNumber = publication?.viewer?.memberNumber || activeMembership?.memberNumber;
  const renewalCopy = activeMembership?.cancelAtPeriodEnd
    ? __msg("social.cancelsAtPeriodEnd")
    : activeMembership?.autoRenew === false
      ? __msg("social.activeUntilPeriodEnd")
      : activeMembership?.currentPeriodEnd
        ? __msg("social.renewsValue0ManageAnytimeInTheWorld", { value0: new Date(activeMembership.currentPeriodEnd).toLocaleDateString(__uiLocale(), { month: "short", day: "numeric" }) })
        : __msg("social.renewsEvery30DaysManageAnytimeInThe");
  const directReplies = Number(publication?.directAccessIncludedReplies || 1);
  const openMessages = () => onOpenMessages(creatorId);
  const firstUnlockedChapterIndex = Math.max(0, chapters.findIndex((chapter) => !chapter.locked));
  const openWorld = () => modal ? onOpenChapter(firstUnlockedChapterIndex) : setWorldDoorOpen(true);
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
    <article aria-modal={modal || undefined} className={`world-member-inside-page ${modal ? "is-membership-popup" : ""}`} onMouseDown={modal ? onClose : undefined} role={modal ? "dialog" : undefined}>
      <section className="world-member-inside-content" onMouseDown={modal ? (event) => event.stopPropagation() : undefined}>
        <span className="world-member-sheet-handle" aria-hidden="true" />
        <header className="world-member-welcome">
          <span className="world-member-planet"><MinimalWorldIcon size={54} /></span>
          <h1>{__msg("financial.youReInside")}</h1>
          {memberNumber ? <button className="world-member-badge" onClick={() => navigate("/memberships")} type="button">{__msg("profile.member")} #{Number(memberNumber).toLocaleString(__uiLocale())}{Number(memberNumber) <= Number(publication.worldFoundingCapacity || 250) ? <strong> · {__msg("celebrations.foundingCircle")}</strong> : null}</button> : null}
          <p>{__msg("social.welcomeTo")} {firstName}{__msg("profile.sWorld")}</p>
        </header>

        {publication?.ownerWelcomeNote || publication?.worldWelcomeVoiceMedia?.secureUrl ? <blockquote className="world-member-owner-welcome is-prototype-hello">
          <FanAvatar name={creator.name || creator.username} size="h-10 w-10" src={creator.avatar || creator.avatarUrl} />
          <b>{__msg("system.WorldReaderPage.469b53ef41")} {firstName}</b>
          {publication?.ownerWelcomeNote ? <p>{publication.ownerWelcomeNote}</p> : null}
          {publication?.worldWelcomeVoiceMedia?.secureUrl ? <audio controls preload="metadata" src={publication.worldWelcomeVoiceMedia.secureUrl} /> : null}
        </blockquote> : null}

        <div className="world-member-access-list">
          {publication?.privateCircles?.length ? <button className="world-member-access-row" onClick={() => navigate(`/messages?group=${publication.privateCircles[0].id}`)} type="button"><span className="world-member-access-icon is-chat"><FiMessageCircle /></span><span className="world-member-access-copy"><b>{__msg("system.WorldReaderPage.0cdd39f1ab")}</b><small>{__msg("system.WorldReaderPage.a7a3459fc2")}{publication.privateCircles[0].name}” · {publication.privateCircles[0].memberCount || 0} {__msg("profile.people")}</small></span><span className="world-member-open">{__msg("social.open")}</span></button> : null}

          <button className="world-member-access-row" onClick={openMessages} type="button">
            <span className="world-member-access-icon is-chat"><FiMessageSquare /></span>
            <span className="world-member-access-copy">
              <b>{__msg("financial.directAccessTo_aa49e2")} {firstName}</b>
              <small>{directReplies} {__msg("system.WorldReaderPage.271eb01213")}{directReplies === 1 ? "" : "s"} {__msg("system.WorldReaderPage.514f9922ce")}</small>
            </span>
            <span className="world-member-open">{__msg("social.open")}</span>
          </button>

          <button className="world-member-access-row" onClick={openWorld} type="button"><span className="world-member-access-icon is-planet"><MinimalWorldIcon size={30} /></span><span className="world-member-access-copy"><b>&ldquo;{publication.title}&rdquo;</b><small>{__msg("fanWeb.all")} {experienceCount} {__msg("system.FanCreateSheet.7068381e0b")}{experienceCount === 1 ? "" : "s"} {__msg("system.WorldReaderPage.024ea2c27e")}</small></span><span className="world-member-open">{__msg("social.open")}</span></button>

          <button className="world-member-access-row" onClick={onOpenStories || (() => window.scrollTo({ top: 0, behavior: "smooth" }))} type="button">
            <span className="world-member-access-icon is-ring" aria-hidden="true" />
            <span className="world-member-access-copy">
              <b>{__msg("financial.privateStoriesHighlights")}</b>
              <small>{__msg("financial.membersOnlyFansNeverSeeThese")}</small>
            </span>
            <span className="world-member-open">{__msg("social.open")}</span>
          </button>
        </div>

        <button className="world-member-primary" onClick={openWorld} type="button">{__msg("publication.stepInside")}</button>
        <p className="world-member-renewal">{renewalCopy}</p>
      </section>
    </article>
  );
}

function WorldMemberDoorPage({ chapters, creator, onBack, onStepInside, publication }) {
  __useUiLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");
  const [spamOpen, setSpamOpen] = useState(false);
  const firstName = creatorFirstName(creator);
  const media = firstWorldMedia(publication, chapters);
  const publicationId = publication?.id || publication?._id;
  const reportMutation = useMutation({
    mutationFn: (payload) => api.reportWorld(publicationId, payload),
    onError: (error) => setReportError(error?.response?.data?.message || __msg("social.unableToSendReport")),
    onSuccess: () => setReportDone(true),
  });
  const closeReport = () => {
    setReportOpen(false);
    setSpamOpen(false);
    setReportDone(false);
    setReportError("");
  };
  const submitSpamReport = (selectedActions) => {
    setReportError("");
    reportMutation.mutate({
      reason: "SPAM",
      label: "Spam",
      reportMode: "SPAM_ACTIONS",
      safetyActions: selectedActions.map(({ key, label, description }) => ({ key, label, description })),
    }, {
      onSuccess: () => {
        setSpamOpen(false);
        setReportOpen(true);
        setReportDone(true);
      },
    });
  };

  return (
    <>
    <article className="world-member-door-page">
      {media?.secureUrl ? (
        media.resourceType === "video" || media.mediaType === "VIDEO"
          ? <video aria-hidden="true" autoPlay loop muted playsInline preload="metadata" src={media.secureUrl} />
          : <img alt="" aria-hidden="true" src={media.secureUrl} />
      ) : null}
      <span className="world-member-door-fallback" aria-hidden="true" />
      <span className="world-member-door-shade" aria-hidden="true" />
      <button aria-label={__msg("social.backToMemberAccess")} className="world-member-door-control is-back" onClick={onBack} type="button"><FiArrowLeft /></button>
      <button aria-label={__msg("social.moreWorldOptions")} className="world-member-door-control is-more" onClick={() => setMoreOpen(true)} type="button"><FiMoreHorizontal /></button>
      <section className="world-member-door-copy">
        <span className="world-member-door-planet"><MinimalWorldIcon size={64} /></span>
        <h1>{publication.title}</h1>
        <p>{__msg("social.aWorldBy")} {firstName}</p>
        <button className="world-member-door-cta" onClick={onStepInside} type="button">{__msg("publication.stepInside")}</button>
      </section>
    </article>
    {moreOpen ? <WorldInsideMoreSheet creator={creator} onClose={() => setMoreOpen(false)} onReport={() => { setMoreOpen(false); setReportOpen(true); }} onReportSpam={() => { setMoreOpen(false); setSpamOpen(true); }} onShare={() => { setMoreOpen(false); setShareOpen(true); }} publication={publication} /> : null}
    {shareOpen ? <ShareSheet onClose={() => setShareOpen(false)} publication={publication} /> : null}
    {spamOpen ? <WorldSpamActionSheet creator={creator} error={reportError} isSubmitting={reportMutation.isPending} onClose={closeReport} onDone={submitSpamReport} /> : null}
    {reportOpen ? <WorldReportSheet error={reportError} isDone={reportDone} isSubmitting={reportMutation.isPending} onClose={closeReport} onDone={closeReport} onSelectReason={(reason) => { setReportError(""); reportMutation.mutate({ reason: reason.value, label: reason.label }); }} /> : null}
    </>
  );
}

function experiencePreviewMedia(chapters = []) {
  const seen = new Set();
  return chapters.flatMap((chapter) => (chapter.blocks || [])
    .filter((block) => block.metadata?.storyPreview && block.media?.secureUrl && ["IMAGE", "VIDEO", "AUDIO", "VOICE"].includes(block.type))
    .map((block) => ({ ...block.media, id: block.id, label: block.metadata?.label || block.metadata?.caption || __msg("creator.experiencePreview"), type: block.type })))
    .filter((item) => {
      const key = item.assetId || item.secureUrl;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function AnalyticsBar({ label, tone = "blue", value, width }) {
  __useUiLanguage();
  return (
    <div className={`world-analytics-progress is-${tone}`}>
      <span><b>{label}</b><strong>{value}</strong></span>
      <i><u style={{ width }} /></i>
    </div>
  );
}

function NameSheet({ busy, error, onClose, onSave, publication }) {
  __useUiLanguage();
  const [name, setName] = useState(publication?.title || "");
  const trimmed = name.trim().replace(/\s+/g, " ");
  return (
    <BottomSheet labelledBy="world-name-title" onClose={onClose}>
      <h2 id="world-name-title">{__msg("creator.nameYourWorld")}</h2>
      <p className="world-sheet-copy">{__msg("creator.oneWorldPerCreatorTheNameCarriesYourStories")}</p>
      <label className="world-sheet-input">
        <span>{__msg("social.worldName")}</span>
        <input maxLength={30} onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <small className="world-sheet-counter">{trimmed.length}/30</small>
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      <button className="world-sheet-primary" disabled={busy || !trimmed || trimmed.length > 30} onClick={() => onSave({ title: trimmed })} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
    </BottomSheet>
  );
}

function DescriptionSheet({ busy, error, onClose, onSave, publication }) {
  __useUiLanguage();
  const [description, setDescription] = useState(publication?.description || publication?.summary || "");
  const trimmed = description.trim();
  return (
    <BottomSheet labelledBy="world-description-title" onClose={onClose} sheetClassName="is-description-sheet">
      <h2 id="world-description-title">{__msg("content.description")}</h2>
      <p className="world-sheet-copy">{__msg("social.oneHonestParagraphTheFeedShowsItRightUnder")}</p>
      <textarea aria-label={__msg("social.worldDescription")} maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      <button className="world-sheet-primary" disabled={busy || !trimmed} onClick={() => onSave({ description: trimmed })} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
    </BottomSheet>
  );
}

function WelcomeMessageSheet({ busy, error, onClose, onRemoveVoice, onSave, onUploadVoice, publication, voiceBusy }) {
  __useUiLanguage();
  const [message, setMessage] = useState(publication?.ownerWelcomeNote || "");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const fileInput = useRef(null);
  const recorder = useVoiceRecorder({ maxDurationSeconds: 120 });
  const trimmed = message.trim();
  const unchanged = trimmed === String(publication?.ownerWelcomeNote || "").trim();
  const attachedVoice = publication?.worldWelcomeVoiceMedia?.secureUrl;
  const saveRecording = () => {
    if (!recorder.audioBlob) return;
    const extension = recorder.audioBlob.type.includes("mp4") ? "m4a" : recorder.audioBlob.type.includes("ogg") ? "ogg" : "webm";
    onUploadVoice(new File([recorder.audioBlob], `world-welcome-${Date.now()}.${extension}`, { type: recorder.audioBlob.type || "audio/webm" }));
  };
  return (
    <BottomSheet labelledBy="world-welcome-message-title" onClose={onClose} sheetClassName="is-description-sheet world-welcome-message-sheet">
      <h2 id="world-welcome-message-title">{__msg("admin.welcomeMessage")}</h2>
      <p className="world-sheet-copy">{__msg("system.WorldPublishingPage.c0334dd9a5")}</p>
      <label className="world-welcome-message-field"><span className="sr-only">{__msg("admin.welcomeMessage")}</span><textarea autoFocus maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={__msg("system.WorldPublishingPage.43748899bc")} rows={5} value={message} /><small>{message.length}/500</small></label>
      <button aria-pressed={Boolean(attachedVoice || voiceOpen)} className="world-welcome-voice-toggle" disabled={voiceBusy} onClick={() => setVoiceOpen((open) => !open)} type="button"><FiMic /><b>{attachedVoice ? __msg("system.SeenComposerPage.f99c511ff6") : __msg("system.WorldReaderPage.ecbf8fdb41")}</b><i className={attachedVoice || voiceOpen ? "is-on" : ""}><u /></i></button>
      {voiceOpen ? <div className="world-welcome-recorder">
        {attachedVoice ? <><audio controls src={attachedVoice} /><button className="is-remove" disabled={voiceBusy} onClick={onRemoveVoice} type="button">{__msg("creator.removeVoiceHello")}</button></> : null}
        {!attachedVoice && recorder.audioUrl ? <audio controls src={recorder.audioUrl} /> : null}
        {!attachedVoice ? <div className="world-welcome-recorder-actions">
          {recorder.status === "idle" || recorder.status === "error" ? <button disabled={voiceBusy} onClick={recorder.startRecording} type="button"><FiMic /> {__msg("messaging.startRecording")}</button> : null}
          {recorder.status === "requesting-permission" ? <button disabled type="button">{__msg("creator.allowMicrophone")}</button> : null}
          {recorder.status === "recording" ? <button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("system.WorldReaderPage.4fd07d13a0")} {formatVoiceTime(recorder.elapsedMs / 1000)}</button> : null}
          {recorder.status === "paused" ? <button className="is-stop" onClick={recorder.stopRecording} type="button"><FiSquare /> {__msg("creator.finish")}</button> : null}
          {recorder.status === "preview" ? <><button disabled={voiceBusy} onClick={recorder.resetRecording} type="button">{__msg("creator.recordAgain")}</button><button className="is-use" disabled={voiceBusy} onClick={saveRecording} type="button">{voiceBusy ? __msg("stories.adding_ffb2e6") : __msg("publication.useRecording")}</button></> : null}
          <button disabled={voiceBusy || recorder.status === "recording"} onClick={() => fileInput.current?.click()} type="button"><FiUpload /> {__msg("system.SeenComposerPage.66d375e583")}</button>
          <input accept="audio/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUploadVoice(file); }} ref={fileInput} type="file" />
        </div> : null}
        {recorder.error ? <p className="world-sheet-error">{recorder.error}</p> : null}
      </div> : null}
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      <button className="world-sheet-primary" disabled={busy || unchanged} onClick={() => onSave({ ownerWelcomeNote: trimmed })} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
    </BottomSheet>
  );
}

function PrivateCirclesSheet({ busy, circles = [], error, onClose, onCreate, onOpen }) {
  __useUiLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const trimmedName = name.trim().replace(/\s+/g, " ");
  const trimmedDescription = description.trim();
  const valid = trimmedName.length > 0 && trimmedName.length <= 60 && trimmedDescription.length <= 240;
  const createCircle = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || busy) return;
    try {
      await onCreate({ name: trimmedName, description: trimmedDescription });
      setName("");
      setDescription("");
      setSubmitted(false);
    } catch {
      // The mutation error is rendered below.
    }
  };
  return (
    <BottomSheet labelledBy="world-private-circles-title" onClose={busy ? undefined : onClose} sheetClassName="world-private-circles-sheet">
      <div className="world-circle-sheet-heading"><span><FiMessageCircle /></span><div><h2 id="world-private-circles-title">{__msg("system.WorldReaderPage.e688f2ac72")}</h2><p className="world-sheet-copy">{__msg("system.WorldReaderPage.143a4063b6")}</p></div></div>
      {circles.length ? <section className="world-circle-existing"><h3>{__msg("system.WorldReaderPage.a9591882c4")} {circles.length}</h3>{circles.map((circle) => <button key={circle.id} onClick={() => onOpen(circle)} type="button"><span><FiUsers /></span><b>{circle.name}<small>{circle.description || __msg("system.WorldReaderPage.5d3eada3ac", { value0: circle.memberCount || 0 })}</small></b><FiChevronRight /></button>)}</section> : <div className="world-circle-empty"><FiUsers /><b>{__msg("system.WorldReaderPage.2b7d14174b")}</b><p>{__msg("system.WorldReaderPage.49b2290e01")}</p></div>}
      <form className="world-circle-form" onSubmit={createCircle}>
        <label><span>{__msg("system.WorldReaderPage.7f19b8b2d6")}</span><input autoFocus maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={__msg("system.WorldReaderPage.727a09a5cf")} value={name} /><small>{name.length}/60</small></label>
        <label><span>{__msg("system.WorldReaderPage.4928a36665")} <i>{__msg("creator.optional")}</i></span><textarea maxLength={240} onChange={(event) => setDescription(event.target.value)} placeholder={__msg("system.WorldReaderPage.0f2300d424")} rows={3} value={description} /><small>{description.length}/240</small></label>
        {submitted && !trimmedName ? <p className="world-sheet-error">{__msg("system.WorldReaderPage.bccab1dafe")}</p> : null}
        {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
        <div className="world-circle-member-note"><FiLock /><span><b>{__msg("social.membersOnly")}</b><small>{__msg("system.WorldReaderPage.0b1075ebfb")}</small></span></div>
        <button className="world-sheet-primary" disabled={busy || !valid} type="submit">{busy ? __msg("system.WorldReaderPage.74b9db3142") : <><FiPlus /> {__msg("system.WorldReaderPage.6f217e5080")}</>}</button>
      </form>
    </BottomSheet>
  );
}

function formatMoney(payout) {
  if (!payout) return "";
  return new Intl.NumberFormat(__uiLocale(), { currency: payout.currency || "USD", style: "currency" }).format(Number(payout.amount || 0));
}

function PriceSheet({ busy, currentPriceFallback, error, loading, onClose, onSave, pricing }) {
  __useUiLanguage();
  const tiers = pricing?.tiers || [];
  const currentPrice = Number(pricing?.currentPrice || currentPriceFallback || 0);
  const [price, setPrice] = useState(currentPrice);
  useEffect(() => setPrice(currentPrice), [currentPrice]);
  const selectedTier = tiers.find((tier) => Number(tier.coins) === Number(price));
  const canSave = Boolean(selectedTier?.available && pricing?.canChangePrice && price && Number(price) !== currentPrice);
  const currentSelection = Boolean(selectedTier?.available && Number(price) === currentPrice);
  const description = pricing?.copy?.description || __msg("social.monthlySubscriptionEveryoneAlreadyInsideKeepsTheirPrice");
  const helper = pricing?.copy?.helper || __msg("social.topTierOpensAt100ResidentsWithSteady");
  return (
    <BottomSheet labelledBy="world-price-title" onClose={onClose} sheetClassName="is-price-sheet">
      <h2 id="world-price-title">{__msg("creator.worldPrice")}</h2>
      <p className="world-sheet-copy">{description}</p>
      {loading ? <div className="world-price-loading" aria-live="polite">{__msg("social.loadingPricing")}</div> : null}
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      {!loading && tiers.length ? (
        <div aria-label={__msg("creator.worldMonthlyPrice")} className="world-price-options" role="radiogroup">
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
                {locked ? <FiLock aria-hidden="true" /> : null}<span>🪙</span> {tierPrice.toLocaleString(__uiLocale())}
              </button>
            );
          })}
        </div>
      ) : null}
      {selectedTier?.payout ? <p className="world-price-payout"><b>{formatMoney(selectedTier.payout)}</b> <span>{__msg("creator.toYouPerResidentMonthly")}</span></p> : null}
      <p className="world-price-helper">{helper}</p>
      <button className="world-sheet-primary" disabled={busy || loading || (!canSave && !currentSelection)} onClick={() => currentSelection ? onClose() : onSave(price)} type="button">{busy ? __msg("admin.saving") : __msg("contentEntities.save_efc007")}</button>
    </BottomSheet>
  );
}

function SeatsSheet({ busy, management, onClose, onOpenPrice, onOpenWave }) {
  __useUiLanguage();
  const seat = management?.seatStatus || {};
  const occupied = Number(seat.occupiedSeats || 0);
  const capacity = Number(seat.capacity || 0);
  const foundingCapacity = Number(seat.foundingCapacity || capacity || 0);
  const waiting = Number(seat.waitingListCount || 0);
  const waveSize = Number(seat.waveSize || 0);
  const progress = capacity ? Math.min(100, (occupied / capacity) * 100) : 0;
  return (
    <BottomSheet labelledBy="world-seats-title" onClose={onClose} sheetClassName="is-seats-sheet">
      <h2 id="world-seats-title">{__msg("social.seatsWaves")}</h2>
      <p className="world-sheet-copy">{__msg("social.aWorldIsnTStretchedItGrowsInWaves")}</p>
      <p className="world-seat-big"><b>{occupied.toLocaleString(__uiLocale())}</b> <span>{__msg("onboarding.of")} {capacity ? capacity.toLocaleString(__uiLocale()) : __msg("social.unlimited")} {__msg("social.seatsTaken")}</span></p>
      <div aria-label={__msg("social.ofSeatsTaken", { value0: Math.round(progress) })} aria-valuemax="100" aria-valuemin="0" aria-valuenow={Math.round(progress)} className="world-seat-progress" role="progressbar"><i style={{ width: `${progress}%` }} /></div>
      <p className="world-seat-founding">{__msg("social.theFirst")} {foundingCapacity.toLocaleString(__uiLocale())} {__msg("social.areTheFoundingCircleMarkedForeverInsideTheWorld")}</p>
      <div className="world-seat-waiting">
        <FiUserPlus aria-hidden="true" />
        <span><b>{__msg("social.waitingList")} {waiting.toLocaleString(__uiLocale())}</b><small>{seat.waitingListAvailable ? __msg("social.theirCoinsAreFrozenAtYourPriceTheMoney") : __msg("social.opensAutomaticallyWhenEveryCurrentSeatIsTaken")}</small></span>
      </div>
      <button className="world-sheet-primary" disabled={busy || !capacity || !waveSize} onClick={onOpenWave} type="button">{busy ? __msg("social.opening") : __msg("social.openAWaveSeats", { value0: waveSize.toLocaleString(__uiLocale()) })}</button>
      <p className="world-seat-wave-note">{__msg("social.newWaveJoinsAtTheCurrentPriceEveryoneInside")} <button onClick={onOpenPrice} type="button">{__msg("social.setWavePrice")}</button></p>
    </BottomSheet>
  );
}

function CoverSheet({ busy, error, onClose, onUpload, publication, progress }) {
  __useUiLanguage();
  const inputRef = useRef(null);
  return (
    <BottomSheet labelledBy="world-cover-title" onClose={onClose}>
      <section className="world-cover-sheet">
        <h2 id="world-cover-title">{__msg("creator.cover")}</h2>
        <p>{__msg("creator.1691280pxShownOnTheCardAndInside")}</p>
        <div className="world-cover-preview">
          {publication?.coverMedia?.secureUrl ? (publication.coverMedia.mediaType === "VIDEO" || publication.coverMedia.resourceType === "video" ? <video controls playsInline src={publication.coverMedia.secureUrl} /> : <img alt={__msg("discover.cover", { value0: publication.title })} src={publication.coverMedia.secureUrl} />) : <span>{PLANET}</span>}
        </div>
      </section>
      <input accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="hidden" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} ref={inputRef} type="file" />
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      <button className="world-cover-upload" disabled={busy} onClick={() => inputRef.current?.click()} type="button"><FiUpload /> {busy ? __msg("social.uploading", { value0: progress || 0 }) : __msg("social.uploadImageOrVideo")}</button>
    </BottomSheet>
  );
}

function QuickChapterNameSheet({ busy, chapterNumber, error, onClose, onNext, title, onTitleChange }) {
  __useUiLanguage();
  const trimmed = title.trim().replace(/\s+/g, " ");
  return (
    <BottomSheet labelledBy="quick-chapter-name-title" onClose={busy ? undefined : onClose}>
      <section className="quick-chapter-sheet">
        <h2 id="quick-chapter-name-title">{__msg("profile.chapter")} {chapterNumber}</h2>
        <p>{__msg("creator.nameItThenWriteThePageUpTo2")}</p>
        <input
          autoFocus
          maxLength={120}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && trimmed) onNext();
          }}
          placeholder={__msg("social.eGTheFirst48Hours")}
          value={title}
        />
        {error ? <small className="quick-chapter-error">{__systemMessage(error)}</small> : null}
        <button disabled={busy || !trimmed} onClick={onNext} type="button">{__msg("social.createWrite")}</button>
      </section>
    </BottomSheet>
  );
}

function PlanetFaceSheet({ busy, error, onClose, onSave, publication }) {
  __useUiLanguage();
  const [selected, setSelected] = useState(planetFaceEmoji(publication?.planet));
  const [custom, setCustom] = useState("");
  const value = custom.trim() || selected;
  return (
    <BottomSheet labelledBy="world-face-title" onClose={onClose}>
      <h2 id="world-face-title">{__msg("creator.theFaceOfYourPlanet")}</h2>
      <p className="world-sheet-copy">{__msg("creator.oneEmojiOnTopTheTopicPeopleSeeFrom")}</p>
      <div className="world-face-grid" role="listbox" aria-label={__msg("creator.planetFaceOptions")}>
        {PLANET_FACE_OPTIONS.map((emoji) => (
          <button
            aria-label={__msg("creator.useAsPlanetFace", { value0: emoji })}
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
        <input aria-label={__msg("creator.customPlanetFaceEmoji")} maxLength={16} onChange={(event) => setCustom(event.target.value)} placeholder={__msg("creator.orAnyEmoji")} value={custom} />
        <button disabled={busy || !value} onClick={() => onSave({ planetFaceEmoji: value })} type="button">{busy ? __msg("admin.saving") : "OK"}</button>
      </div>
      {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
    </BottomSheet>
  );
}

function IncludeExperienceSheet({ busyId, experiences = [], included = [], onClose, onCreate, onToggle }) {
  __useUiLanguage();
  const includedIds = new Set(included.map((item) => String(item.id || item._id)));
  return (
    <BottomSheet labelledBy="world-include-title" onClose={onClose}>
      <section className="world-include-sheet">
        <h2 id="world-include-title">{__msg("social.includeInYourWorld")}</h2>
        <p>{__msg("system.WorldReaderPage.6b98fe5059")}</p>
        <div className="world-include-list">
          <button className="world-include-create" onClick={onCreate} type="button">
            <span><FiPlus /></span>
            <b>{__msg("system.SeenComposerPage.1ff0be91c9")}</b>
          </button>
          {experiences.length ? experiences.map((item) => {
          const itemId = String(item.id || item._id);
          const selected = includedIds.has(itemId);
          return (
            <button className={selected ? "is-selected" : ""} disabled={busyId === itemId} key={itemId} onClick={() => onToggle(itemId, selected)} type="button">
              <span className="world-include-cover">
                {item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <span>{PLANET}</span>}
                {item.pricing?.starsAmount ? <small><FiLock /> {item.pricing.starsAmount}</small> : null}
                <i aria-label={selected ? __msg("profile.included") : __msg("system.WorldReaderPage.bfca330ce4")}>{selected ? <FiCheck /> : null}</i>
              </span>
              <span className="world-include-copy">
                <b>{item.title || __msg("system.WorldReaderPage.caa14de41e")}</b>
                <small className="world-include-meta-clean">{item.chapterCount || item.chapters?.length || 0} {__msg("discover.chapters")}{item.pricing?.starsAmount ? <>{" \u00b7 "}{STAR}{item.pricing.starsAmount}</> : ""}</small>
              </span>
            </button>
          );
          }) : <p className="world-include-empty">{__msg("system.WorldReaderPage.84911c4a6e")}</p>}
        </div>
        <button className="world-include-done" onClick={onClose} type="button">{__msg("comments.done")}</button>
      </section>
    </BottomSheet>
  );
}

function firstName(user) {
  return String(user?.displayName || user?.name || user?.username || "them").trim().split(/\s+/)[0] || "them";
}

function ModeratorsSheet({ addError, addPending, candidates = [], candidatesError, candidatesLoading, management, onAddSelect, onClose, onRemove, publication, removePendingId }) {
  __useUiLanguage();
  const moderators = management?.moderators || [];
  const limit = Number(management?.moderatorLimit || 2);
  const remaining = Math.max(0, limit - moderators.length);
  const productName = publication?.kind === "EXPERIENCE" ? "experience" : "world";
  return (
    <BottomSheet labelledBy="world-moderators-title" onClose={onClose} sheetClassName="is-moderators-sheet">
      <section className="world-moderators-sheet">
        <h2 id="world-moderators-title">{__msg("social.moderators")}</h2>
        <p className="world-moderators-copy">{__msg("social.each")} {productName} {__msg("social.isItsOwnProductWithItsOwnCleanupTeam")} <b>{publication?.title || __msg("social.this", { value0: productName })}</b>{__msg("social.yourVoiceYourMoneyAndYourDirectAccessCan")}</p>
        <div className="world-moderator-permissions">
          <p className="is-allowed"><FiCheck /> {__msg("social.removeSpamCommentsInThis")} {productName}</p>
          <p><FiX /> {__msg("social.speakOrPostAsYou")}</p>
          <p><FiX /> {__msg("social.answerYourDirectAccess")}</p>
          <p><FiX /> {__msg("social.seeYourEarnings")}</p>
        </div>
        <div className="world-moderator-scroll-region">
          {moderators.length ? <>
            <h3>{__msg("social.moderatorsHere")}</h3>
            <div className="world-moderator-list">
              {moderators.map((item) => (
                <article className="world-moderator-row" key={item.id}>
                  <FanAvatar name={item.displayName || item.name} size="h-10 w-10" src={item.avatar} />
                  <span><b>{item.displayName || item.name || item.username}</b><small>{__msg("social.moderator")}</small></span>
                  <button aria-label={__msg("contentEntities.remove", { value0: item.displayName || item.name || item.username })} disabled={removePendingId === item.id} onClick={() => onRemove(item)} type="button"><FiX /></button>
                </article>
              ))}
            </div>
          </> : null}
          {remaining > 0 ? (
            <>
              <h3>{__msg("social.addUpTo")} {limit})</h3>
              {candidatesLoading ? <p className="world-moderators-empty">{__msg("social.loadingEligiblePeople")}</p> : null}
              {candidatesError ? <p className="world-sheet-error">{candidatesError}</p> : null}
              {!candidatesLoading && !candidates.length ? <p className="world-moderators-empty">{__msg("social.noEligibleCandidatesRightNow")}</p> : null}
              <div className="world-moderator-candidates">
                {candidates.map((item) => (
                  <button aria-label={__msg("admin.select", { value0: item.displayName || item.name || item.username })} disabled={addPending} key={item.id} onClick={() => onAddSelect(item)} type="button">
                    <FanAvatar name={item.displayName || item.name} size="h-12 w-12" src={item.avatar} />
                    <b>{firstName(item)}</b>
                  </button>
                ))}
              </div>
              {addError ? <p className="world-sheet-error">{addError}</p> : null}
            </>
          ) : null}
          <footer>{__msg("social.membersNeverSeeWhoModeratesCleanupIsSilent")}</footer>
        </div>
      </section>
    </BottomSheet>
  );
}

function AddModeratorConfirmSheet({ busy, candidate, error, onCancel, onConfirm, publication }) {
  __useUiLanguage();
  if (!candidate) return null;
  return (
    <BottomSheet labelledBy="world-moderator-confirm-title" onClose={onCancel} sheetClassName="is-moderator-confirm-sheet">
      <section className="world-moderator-confirm">
        <FanAvatar name={candidate.displayName || candidate.name} size="h-16 w-16" src={candidate.avatar} />
        <h2 id="world-moderator-confirm-title">{__msg("social.make")} {firstName(candidate)} {__msg("social.aModerator")}</h2>
        <p>{__msg("social.theyLlBeAbleToRemoveSpamAndComments")} <b>{publication?.title || __msg("social.thisExperience")}</b>{__msg("social.theyCanNeverSpeakForYou")}</p>
        {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
        <button className="world-sheet-primary" disabled={busy} onClick={onConfirm} type="button">{busy ? __msg("stories.adding") : __msg("social.addModerator")}</button>
        <button className="world-moderator-cancel" disabled={busy} onClick={onCancel} type="button">{__msg("admin.cancel")}</button>
      </section>
    </BottomSheet>
  );
}

function RemoveModeratorConfirmSheet({ busy, moderator, onCancel, onConfirm }) {
  __useUiLanguage();
  if (!moderator) return null;
  return (
    <BottomSheet labelledBy="world-moderator-remove-title" onClose={onCancel} sheetClassName="is-moderator-confirm-sheet">
      <section className="world-moderator-confirm">
        <FanAvatar name={moderator.displayName || moderator.name} size="h-14 w-14" src={moderator.avatar} />
        <h2 id="world-moderator-remove-title">{__msg("profile.remove")} {moderator.displayName || moderator.name || moderator.username}?</h2>
        <p>{__msg("social.theyLlLoseCleanupAccessForThisExperienceOnly")}</p>
        <button className="world-sheet-primary" disabled={busy} onClick={onConfirm} type="button">{busy ? __msg("profile.removing") : __msg("social.removeModerator")}</button>
        <button className="world-moderator-cancel" disabled={busy} onClick={onCancel} type="button">{__msg("admin.cancel")}</button>
      </section>
    </BottomSheet>
  );
}

function AnalyticsSheet({ analytics, loading, onClose, publication }) {
  __useUiLanguage();
  const daily = analytics?.daily || [];
  const maxViews = Math.max(1, ...daily.map((item) => Number(item.views || 0)));
  const residents = Number(analytics?.residents || 0);
  const owners = Number(analytics?.owners ?? residents);
  const views = Number(analytics?.views || 0);
  const ownershipPercent = views ? `${Math.min(100, Math.round((owners / views) * 100))}%` : "0%";
  const readToEnd = Math.max(0, Math.min(100, Number(analytics?.readToEnd || 0)));
  const weekViews = daily.reduce((sum, item) => sum + Number(item.views || 0), 0);
  const weekChange = analytics?.weekChangePercent;
  const earnings = Number(analytics?.creatorEarningsUsd30d ?? (Number(analytics?.creatorEarningsStars30d || 0) / 10));
  const price = Number(publication?.pricing?.starsAmount || 0);
  return (
    <BottomSheet labelledBy="world-analytics-title" onClose={onClose} sheetClassName="is-analytics-sheet">
      <section className="world-analytics-sheet">
        <header>
          <p>{publication?.title || __msg("profile.yourWorld")}</p>
          <div>
            <h2 id="world-analytics-title">{loading ? __msg("admin.loading") : new Intl.NumberFormat(__uiLocale(), { currency: "USD", style: "currency" }).format(earnings)}</h2>
            <small>{__msg("social.earned")}</small>
            {weekChange != null ? <strong className={Number(weekChange) < 0 ? "is-down" : ""}>{Number(weekChange) >= 0 ? "↑" : "↓"} {Math.abs(Number(weekChange))}{__msg("social.week")}</strong> : null}
          </div>
        </header>
        <p className="world-analytics-today"><b>{__msg("profile.today")}</b> · {Number(analytics?.todayViews || 0).toLocaleString(__uiLocale())} {__msg("social.views")}</p>
        <div className="world-analytics-bars" aria-label={__msg("social.viewsOverTheLastWeek")}>
          {daily.length ? daily.map((item) => <i aria-label={__msg("social.views_732ced", { value0: item.date, value1: item.views })} className={item.current ? "is-today" : ""} key={item.date} style={{ height: Math.max(6, Math.round((Number(item.views || 0) / maxViews) * 42)) }} />) : <span className="world-analytics-empty">{__msg("social.noViewActivityYet")}</span>}
        </div>
        <div className="world-analytics-axis"><span>{__msg("social.7DaysAgo")}</span><span>{__msg("orbit.today")}</span></div>
        <section>
          <h3>{__msg("social.funnel")}</h3>
          <AnalyticsBar label={__msg("fanWeb.views_24be61")} value={views.toLocaleString(__uiLocale())} width={views ? "100%" : "0%"} />
          <AnalyticsBar label={__msg("social.ownIt")} value={owners.toLocaleString(__uiLocale())} width={ownershipPercent} />
        </section>
        <section>
          <h3>{__msg("social.inside")}</h3>
          <AnalyticsBar label={__msg("social.readToTheEnd")} value={`${readToEnd}%`} width={`${readToEnd}%`} />
        </section>
        <div className="world-analytics-stat-grid">
          {[
            [Number(analytics?.comments || 0).toLocaleString(__uiLocale()), __msg("fanWeb.comments")],
            [Number(analytics?.shares || 0).toLocaleString(__uiLocale()), __msg("system.copy.d18aac96b905")],
            [`${weekViews > 0 ? "+" : ""}${weekViews.toLocaleString(__uiLocale())}`, __msg("system.copy.dae1e5f83a74")],
            [price.toLocaleString(__uiLocale()), __msg("system.copy.2097c33723b6")],
          ].map(([value, label]) => <span key={label}><b>{value}</b><small>{label}</small></span>)}
        </div>
        <footer>{__msg("stories.onlyYouSeeThis")}</footer>
      </section>
    </BottomSheet>
  );
}

const WALKER_FALLBACKS = [
  { action: "walked 2 chapters", hot: true, name: "Lina Moreau", time: "2m" },
  { get action() { return __msg("social.openedChapter1"); }, name: "Omar Haddad", time: "26m" },
  { get action() { return __msg("social.walkedTheWholeWorld"); }, name: "Mia Tanaka", time: "1h", suffix: "★" },
  { get action() { return __msg("social.cameBackTwiceToday"); }, hot: true, name: "Sofia Reyes", time: "3h" },
  { get action() { return __msg("social.openedChapter1"); }, name: "James Carter", time: "5h" },
];

function WorldWalkersSheet({ loading, onClose, onMessage, publication, total, walkers = [] }) {
  __useUiLanguage();
  const rows = walkers.length ? walkers.map((item, index) => ({
    action: index % 3 === 0 ? "walked 2 chapters" : index % 3 === 1 ? __msg("social.openedChapter1") : __msg("social.walkedTheWholeWorld"),
    avatar: item.user?.avatarUrl,
    hot: index === 0 || index === 3,
    id: item.user?.id,
    name: item.user?.displayName || item.user?.username || __msg("social.atseenUser"),
    time: shortRelativeTime(item.createdAt),
  })) : WALKER_FALLBACKS;
  const count = Math.max(Number(total || 0), rows.length);
  return (
    <BottomSheet labelledBy="world-walkers-title" onClose={onClose}>
      <section className="world-walkers-sheet">
        <header className="world-walkers-head">
          <div>
            <h2 id="world-walkers-title">{__msg("social.steppedInside")} {count.toLocaleString(__uiLocale())}</h2>
            <p>{publication?.title || __msg("profile.yourWorld")}</p>
          </div>
        </header>
        {loading && !walkers.length ? <p className="world-walkers-state">{__msg("social.loadingVisitors")}</p> : (
          <div className="world-walkers-list">
            {rows.map((item, index) => (
              <article className="world-walker-row" key={`${item.id || item.name}-${index}`}>
                <FanAvatar name={item.name} size="h-10 w-10" src={item.avatar} />
                <span className="world-walker-copy">
                  <b>{item.name}</b>
                  <small>{item.action}{item.suffix ? ` ${item.suffix}` : ""} · {item.time}</small>
                </span>
                {item.hot ? <span className="world-walker-status">{PLANET} {__msg("social.premiumInterest")}</span> : <span className="world-walker-status-placeholder" />}
                <button aria-label={__msg("profile.message", { value0: item.name })} className="world-walker-message" onClick={() => onMessage(item)} type="button"><FiMessageCircle /></button>
              </article>
            ))}
          </div>
        )}
        <p className="world-walkers-note">{__msg("social.onlyYouSeeThisLikeStoryViewersVisitorsKnow")}</p>
      </section>
    </BottomSheet>
  );
}

function shareUrlFor(publication) {
  const route = publication?.kind === "EXPERIENCE" ? "experience" : "world";
  return `${window.location.origin}/${route}/${publication?.id || publication?._id}`;
}

function ExperienceAccessSheet({ data, error, loading, onClose, onCopy, onDecide, onRetry, pendingId }) {
  __useUiLanguage();
  const requests = data?.requests || [];
  return <BottomSheet labelledBy="experience-access-title" onClose={onClose}>
    <section className="experience-access-sheet">
      <h2 id="experience-access-title">{__msg("social.accessByLink")}</h2>
      <p>{__msg("social.sendThisLinkToAFriendWhenTheyOpen")}</p>
      <div><input aria-label={__msg("social.experienceAccessLink")} readOnly value={loading ? "Loading…" : error ? "Access link unavailable" : data?.url || ""} /><button disabled={loading || !data?.url} onClick={onCopy} type="button">{__msg("creator.copy")}</button></div>
      {error ? <p className="world-sheet-error">{__systemMessage(error)} <button onClick={onRetry} type="button">{__msg("activity.retry")}</button></p> : loading ? <small>{__msg("social.loadingRequests")}</small> : requests.length ? requests.map((item) => <article key={item.id}><FanAvatar name={item.requester?.name} size="h-9 w-9" src={item.requester?.avatar} /><span><b>{item.requester?.name || item.requester?.username || __msg("admin.user")}</b><small>{item.status.toLowerCase()}</small></span>{item.status === "PENDING" ? <><button disabled={pendingId === item.id} onClick={() => onDecide(item.id, true)} type="button">{__msg("social.confirm")}</button><button disabled={pendingId === item.id} onClick={() => onDecide(item.id, false)} type="button">{__msg("social.decline")}</button></> : null}</article>) : <small>{__msg("social.noRequestsYetTheyAppearHere")}</small>}
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
  if (!copied) throw new Error(__msg("social.clipboardUnavailable"));
}

const SHARE_REACTIONS = ["💖", "😂", "🔥", "😍", "👏", "😮", "🙏", "🤝"];
function WorldSharePerson({ onToggle, person, selected }) {
  __useUiLanguage();
  const name = person.displayName || person.name || person.username || __msg("branding.atseen");
  const badges = ["👁", "🏃", "🏠", "☕", "✈"];
  const badge = person.statusEmoji || badges[Math.abs(String(person.id || name).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % badges.length];
  return (
    <button aria-label={`${selected ? __msg("profile.remove") : __msg("social.sendTo")} ${name}`} aria-pressed={selected} className={selected ? "is-selected" : ""} onClick={() => onToggle(person)} type="button">
      <span className="world-share-avatar">
        <FanAvatar name={name} size="h-[62px] w-[62px]" src={person.avatarUrl || person.avatar} />
        <i aria-hidden="true">{selected ? <FiCheck /> : badge}</i>
      </span>
      <b>{firstName({ displayName: name })}</b>
    </button>
  );
}

function WorldShareAction({ children, label, onClick }) {
  __useUiLanguage();
  return (
    <button onClick={onClick} type="button">
      <span>{children}</span>
      <b>{label}</b>
    </button>
  );
}

function LegacyWorldShareSheet({ onClose, publication, viewerId }) {
  const { language: __uiLanguage } = __useUiLanguage();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Map());
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const { showToast } = useFanToast();
  const shareNoun = publication?.kind === "EXPERIENCE" ? __msg("contentEntities.experience") : __msg("admin.world");
  const url = shareUrlFor(publication);
  const recipients = useShareRecipients({ enabled: true, query: search, viewerId });
  const sendMutation = useSendSharedContent();
  const selectedRecipients = useMemo(() => [...selected.values()], [selected]);
  const sharedContent = useMemo(() => ({
    contentType: publication?.kind === "EXPERIENCE" ? "experience" : "world",
    contentId: String(publication?.id || publication?._id || ""),
    title: publication?.title || __msg("admin.world"),
  }), [publication, __uiLanguage]);
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
        const messageText = data.sent?.length ? __msg("social.someSharesCouldNotBeSent") : data.failed[0]?.message || __msg("social.couldNotSendThisShare");
        setSendError(messageText);
        showToast(messageText);
        return;
      }
      showToast(__msg("social.sentTo", { value0: selectedRecipients.map((item) => firstName({ displayName: item.displayName || item.name || item.username })).join(", ") }));
      setMessage("");
      setSent(true);
    } catch (requestError) {
      const messageText = requestError?.response?.data?.message || __msg("social.couldNotSendThisShare");
      setSendError(messageText);
      showToast(messageText);
    }
  };
  const copy = async () => {
    setError("");
    try {
      await copyToClipboard(url);
      setCopied(true);
      showToast(__msg("social.linkCopied", { value0: shareNoun }));
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setError(__msg("social.couldNotCopyThisLink"));
      showToast(__msg("social.couldNotCopyTheLink", { value0: shareNoun.toLowerCase() }));
    }
  };
  const shareToStory = async () => {
    await copy();
    showToast(__msg("social.linkCopiedAddItToYourStory"));
  };
  const shareWhatsApp = () => {
    const text = __msg("share.checkThisOutOnSeenValue0Value1", { value0: publication?.title || __msg("admin.world"), value1: url });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    showToast(__msg("share.openingWhatsapp"));
  };
  const shareSnapchat = async () => {
    await copy();
    showToast(__msg("social.linkCopiedPasteItIntoSnapchat"));
  };
  const more = async () => {
    if (!navigator.share) return copy();
    try { await navigator.share({ title: publication?.title || __msg("admin.world"), url }); }
    catch (requestError) { if (requestError?.name !== "AbortError") showToast(__msg("social.couldNotOpenSharing")); }
  };
  const visiblePeople = (recipients.data || []).slice(0, 8);
  return (
    <BottomSheet labelledBy="world-share-title" onClose={onClose}>
      <section className="world-share-sheet">
        <header>
          <h2 id="world-share-title">{__msg("social.sendTo")}</h2>
          <p>{publication?.title || __msg("admin.world")}</p>
        </header>
        <label className="world-share-search">
          <FiSearch aria-hidden="true" />
          <input autoComplete="off" onChange={(event) => setSearch(event.target.value)} placeholder={__msg("discover.search")} value={search} />
        </label>
        <div className="world-share-people">
          {recipients.isLoading ? Array.from({ length: 8 }).map((_, index) => <span className="world-share-person-skeleton" key={index} />) : null}
          {!recipients.isLoading && visiblePeople.map((person) => <WorldSharePerson key={person.id} onToggle={toggleRecipient} person={person} selected={selected.has(person.id)} />)}
        </div>
        {!recipients.isLoading && !visiblePeople.length ? <p className="world-share-empty">{__msg("stories.noPeopleFound")}</p> : null}
        {selectedRecipients.length ? (
          <form className="world-share-message-panel" onSubmit={send}>
            <div className="world-share-reactions">
              {SHARE_REACTIONS.map((emoji) => <button aria-label={__msg("share.add", { value0: emoji })} key={emoji} onClick={() => addReaction(emoji)} type="button">{emoji}</button>)}
            </div>
            <div className="world-share-message-row">
              <input maxLength={2000} onChange={(event) => { setSent(false); setSendError(""); setMessage(event.target.value); }} placeholder={__msg("share.writeAMessage")} value={message} />
              <button className={sent ? "is-sent" : ""} disabled={sendMutation.isPending || !selectedRecipients.length || sent} type="submit">{sendMutation.isPending ? __msg("orbit.sending") : sent ? __msg("fan.sent") : __msg("fanWeb.send")}</button>
            </div>
            {sent ? <p className="world-share-sent" role="status"><FiCheck /> {__msg("fan.sent")}</p> : null}
            {sendError ? <p className="world-share-send-error" role="alert">{sendError}</p> : null}
          </form>
        ) : (
          <div className="world-share-actions">
            <WorldShareAction label={__msg("activity.story")} onClick={shareToStory}><FiPlusCircle /></WorldShareAction>
            <WorldShareAction label={copied ? __msg("creator.copied") : __msg("profile.copyLink")} onClick={copy}>{copied ? <FiCheck /> : <FiCopy />}</WorldShareAction>
            <WorldShareAction label="WhatsApp" onClick={shareWhatsApp}><FaWhatsapp /></WorldShareAction>
            <WorldShareAction label={__msg("social.snapchat")} onClick={shareSnapchat}><FaSnapchatGhost /></WorldShareAction>
            <WorldShareAction label={__msg("discover.more")} onClick={more}><FiMoreHorizontal /></WorldShareAction>
          </div>
        )}
        {error ? <p className="world-sheet-error">{__systemMessage(error)}</p> : null}
      </section>
    </BottomSheet>
  );
}

function WorldStoryViewer({ creator, onClose, story, title }) {
  const { language: __uiLanguage } = __useUiLanguage();
  const stories = useMemo(() => {
    const items = Array.isArray(story?.stories) ? story.stories : [story].filter(Boolean);
    const owner = {
      avatar: creator?.avatar || creator?.avatarUrl || creator?.profileImage || creator?.photoUrl || "",
      id: creator?.id || creator?._id || "",
      name: creator?.name || creator?.username || __msg("discover.creator"),
      username: creator?.username || "",
      verified: Boolean(creator?.verified || creator?.isVerified),
    };
    return items.filter((item) => item?.secureUrl).map((item, index) => ({
      ...item,
      caption: item.title || title || __msg("profile.privateStory"),
      createdAt: item.createdAt || new Date().toISOString(),
      id: item.assetId || item.blockId || item.secureUrl || `world-story-${index}`,
      mediaType: item.resourceType === "video" || item.mediaType === "VIDEO" || item.type === "VIDEO" ? "video" : "image",
      mediaUrl: item.secureUrl,
      owner,
      ownerId: owner.id,
    }));
  }, [creator, story, title, __uiLanguage]);
  const initialIndex = Math.max(0, Math.min(stories.length - 1, Number(story?.index || 0)));
  return <StoryViewer initialIndex={initialIndex} isOpen={Boolean(stories.length)} onClose={onClose} previewOnly stories={stories} />;
}

function PollBlock({ block, chapterId, publicationId }) {
  __useUiLanguage();
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
    <h3>{block.metadata?.question || __msg("admin.poll")}</h3>
    <div>
      {options.map((option, index) => {
        const count = Number(counts[index] || 0);
        const percent = total ? Math.round((count / total) * 100) : 0;
        return <button className={selected === index ? "is-selected" : ""} disabled={voteMutation.isPending} key={`${block.id}-${option}-${index}`} onClick={() => voteMutation.mutate(index)} type="button">
          {data.resultsVisible ? <span className="world-poll-fill" style={{ width: `${percent}%` }} /> : null}
          <span>{option}</span>
          {data.resultsVisible ? <b>{percent}%</b> : selected === index ? <b>{__msg("social.chosen")}</b> : null}
        </button>;
      })}
    </div>
    <p>{error ? (error.response?.data?.message || __msg("social.unableToSaveYourVote")) : data.resultsVisible ? __msg("social.vote", { value0: total.toLocaleString(__uiLocale()), value1: total === 1 ? "" : "s" }) : selected == null ? __msg("social.chooseOneAnswer") : __msg("social.yourAnswerIsSaved")}</p>
  </section>;
}

function ChapterBlock({ block, chapterId, publicationId }) {
  __useUiLanguage();
  const listItems = Array.isArray(block.metadata?.listItems) ? block.metadata.listItems.filter(Boolean) : [];
  const overlayText = String(block.metadata?.overlayText || block.metadata?.caption || "").trim();
  if (block.metadata?.location?.label) return <span className="chapter-location-prototype"><FiMapPin />{block.metadata.location.label}</span>;
  if (block.type === "LIST" || (block.type === "KEY_POINT" && listItems.length)) return <ul className="world-chapter-reader-list">{(listItems.length ? listItems : String(block.text || "").split("\n").filter(Boolean)).map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)}</ul>;
  if (["TEXT", "HIGHLIGHT", "KEY_POINT"].includes(block.type)) return <p className={`world-chapter-reader-text ${block.type === "HIGHLIGHT" ? "is-highlight" : ""}`}>{block.text}</p>;
  if (block.type === "IMAGE" && block.media?.secureUrl) return <figure className={overlayText ? "world-chapter-reader-image-frame has-overlay" : "world-chapter-reader-image-frame"}>
    <img alt={__msg("admin.chapterAttachment")} className="world-chapter-reader-image" src={block.media.secureUrl} />
    {overlayText ? <figcaption style={{ "--overlay-fill-color": block.metadata?.overlayFillColor || "", "--overlay-text-color": block.metadata?.overlayColor || "#ffffff" }}>{overlayText}</figcaption> : null}
  </figure>;
  if (block.type === "VIDEO" && block.media?.secureUrl) return <PublicationCoverMedia alt={__msg("system.WorldReaderPage.fe6bc4ec41")} className="world-chapter-reader-video" controls media={block.media} preload="metadata" />;
  if (["AUDIO", "VOICE"].includes(block.type) && block.media?.secureUrl) {
    const transcript = String(block.metadata?.transcript || "").trim();
    return <ChapterVoicePlayer duration={block.media?.duration} transcript={transcript} url={block.media.secureUrl} />;
  }
  if (block.type === "POLL") return <PollBlock block={block} chapterId={chapterId} publicationId={publicationId} />;
  if (block.type === "LINK" && block.url) return <a className="chapter-link-prototype" href={block.url} rel="noreferrer" target="_blank"><FiLink /><span><b>{block.label || __msg("creator.openLink")}</b><small>{block.url}</small></span></a>;
  return null;
}

function ChapterExperience({ chapter, chapterIndex, chapters, experienceTitle, onBack, onSelect, publicationId }) {
  __useUiLanguage();
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
        <button aria-label={__msg("social.backToExperienceOverview")} onClick={onBack} type="button"><FiX /></button>
        <div><small>{__msg("creator.chapter")} {chapterIndex + 1} {__msg("creator.of_0cf81c")} {chapters.length} {"\u00b7"} {experienceTitle}</small><h1>{chapter.title || __msg("profile.chapter_7c635d", { value0: chapterIndex + 1 })}</h1></div>
        <span>{__msg("social.experience_21ab11")}</span>
      </header>
      <div className="experience-chapter-preview-progress">{chapters.map((item, index) => <button aria-label={__msg("creator.openChapter", { value0: index + 1 })} className={index <= chapterIndex ? "is-active" : ""} key={item.stableChapterId || item.id || index} onClick={() => onSelect(index)} type="button" />)}</div>
      <main onClick={handleScreenClick}>
        <section className="experience-chapter-preview-content">{blocks.length ? blocks.map((block, index) => <ChapterBlock block={block} chapterId={chapter.stableChapterId} key={block.id || index} publicationId={publicationId} />) : <p>{__msg("social.thisChapterHasNoPublishedContentYet")}</p>}</section>
        <div className="experience-chapter-preview-adjacent"><button disabled={chapterIndex === 0} onClick={() => chapterIndex > 0 && onSelect(chapterIndex - 1)} type="button">{chapterIndex > 0 ? `‹ ${chapters[chapterIndex - 1]?.title}` : ""}</button><button disabled={chapterIndex === chapters.length - 1} onClick={() => chapterIndex < chapters.length - 1 && onSelect(chapterIndex + 1)} type="button">{chapterIndex < chapters.length - 1 ? `${chapters[chapterIndex + 1]?.title} ›` : __msg("creator.experienceComplete")}</button></div>
        <div className="experience-chapter-preview-actions"><button aria-label={__msg("social.backToExperienceOverview")} onClick={onBack} type="button">←</button><button onClick={nextChapter} type="button">{chapterIndex < chapters.length - 1 ? __msg("creator.next") : __msg("creator.backToOverview")}</button></div>
      </main>
    </article>
  );
}

function WorldInsideMoreSheet({ canManageMembership = false, creator, onClose, onGift, onManageMembership, onReport, onReportSpam, onShare, publication }) {
  __useUiLanguage();
  return <BottomSheet labelledBy="world-inside-more-title" onClose={onClose}>
    <header className="world-inside-detail__sheet-head">
      <div>
        <h2 id="world-inside-more-title">{publication?.title || __msg("admin.world")}</h2>
        <p>{__msg("social.experience")} {creatorFirstName(creator)}</p>
      </div>
      <button aria-label={__msg("social.closeWorldActions")} onClick={onClose} type="button"><FiX /></button>
    </header>
    <div className="world-inside-detail__sheet-actions">
      <button onClick={onShare} type="button"><FiShare2 /><span>{__msg("admin.share")}</span></button>
      {onGift ? <button onClick={onGift} type="button"><FiGift /><span>{__msg("fan.gift")}</span></button> : null}
      {canManageMembership && onManageMembership ? <button onClick={onManageMembership} type="button"><FiSettings /><span><b>{__msg("system.MembershipCancellationPage.907d3b8c0f")}</b><small>{__msg("system.WorldReaderPage.dc46554a12")}</small></span></button> : null}
      <button className="is-danger" onClick={onReportSpam} type="button"><FiSlash /><span><b>{__msg("fanWeb.reportSpam")}</b><small>{__msg("social.deleteMessagesReactionsBan")}</small></span></button>
      <button className="is-danger" onClick={onReport} type="button"><FiFlag /><span>{__msg("discover.report")}</span></button>
    </div>
  </BottomSheet>;
}

function WorldReportSheet({ error, isDone, isSubmitting, onClose, onDone, onSelectReason }) {
  __useUiLanguage();
  return <BottomSheet labelledBy="world-report-title" onClose={onClose}>
    <section className={isDone ? "world-report-sheet is-done" : "world-report-sheet"}>
      {isDone ? (
        <div className="world-report-done">
          <FiShield aria-hidden="true" />
          <h2 id="world-report-title">{__msg("social.thankYou")}</h2>
          <p>{__msg("social.ourTeamWillReviewThisShortly")}</p>
          <button onClick={onDone} type="button">{__msg("comments.done")}</button>
        </div>
      ) : (
        <>
          <h2 id="world-report-title">{__msg("social.reportExperience")}</h2>
          <p>{__msg("fanWeb.whyAreYouReportingThis")}</p>
          <div className="world-report-reasons">
            {WORLD_REPORT_REASONS.map((reason) => (
              <button disabled={isSubmitting} key={reason.value} onClick={() => onSelectReason(reason)} type="button">
                <span>{reason.label}</span>
                <FiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
          {error ? <p className="world-report-error" role="alert">{__systemMessage(error)}</p> : null}
        </>
      )}
    </section>
  </BottomSheet>;
}

function WorldSpamActionSheet({ creator, error, isSubmitting, onClose, onDone }) {
  __useUiLanguage();
  const [selected, setSelected] = useState(() => WORLD_SPAM_ACTIONS.filter((action) => action.defaultChecked).map((action) => action.key));
  const actionName = creatorFirstName(creator);
  const toggle = (action) => {
    if (isSubmitting) return;
    setSelected((current) => current.includes(action.key) ? current.filter((key) => key !== action.key) : [...current, action.key]);
  };
  const selectedActions = WORLD_SPAM_ACTIONS.filter((action) => selected.includes(action.key));

  return <BottomSheet labelledBy="world-spam-title" onClose={onClose} sheetClassName="is-spam-actions-sheet">
    <section className="world-spam-sheet">
      <h2 id="world-spam-title">{__msg("social.looksLikeSpam")}</h2>
      <p>{__msg("social.chooseWhatToDoAbout")} {actionName}</p>
      <div className="world-spam-options">
        {WORLD_SPAM_ACTIONS.map((action) => {
          const checked = selected.includes(action.key);
          const label = action.key === "banCreator" ? __msg("social.banValue0", { value0: actionName }) : action.key === "removeFromWorld" ? __msg("social.removeFromYourWorld") : action.label;
          const description = action.key === "deleteMessages" ? __msg("social.everyPostAndCommentByValue0", { value0: actionName }) : action.description;
          return <button aria-pressed={checked} disabled={isSubmitting} key={action.key} onClick={() => toggle(action)} type="button">
            <span className={checked ? "is-checked" : ""}>{checked ? <FiCheck /> : <FiSquare />}</span>
            <b>{label}</b>
            {description ? <small>{description}</small> : null}
          </button>;
        })}
      </div>
      {error ? <p className="world-report-error" role="alert">{__systemMessage(error)}</p> : null}
      <button className="world-spam-submit" disabled={isSubmitting || !selectedActions.length} onClick={() => onDone(selectedActions)} type="button">
        {isSubmitting ? __msg("profile.sending") : __msg("social.done", { value0: selectedActions.length })}
      </button>
    </section>
  </BottomSheet>;
}

function WorldInsideComments({ noteOwner, engagement, mutationBusy, onCommentReact, onRemove, onReply, replyTarget }) {
  __useUiLanguage();
  const [visibleTexts, setVisibleTexts] = useState({});
  const [menuTarget, setMenuTarget] = useState(null);
  const comments = engagement?.comments || [];
  if (!comments.length) return <p className="world-inside-detail__comments-empty">{__msg("social.noCommentsYetBeTheFirstToLeaveA")}</p>;
  const renderComment = (item, isReply = false) => {
    const active = Boolean(item.viewerReaction);
    const reactionCount = Number(item.reactionCount || 0);
    const visibleReactionCount = active ? Math.max(1, reactionCount) : reactionCount;
    const showText = !item.audio || visibleTexts[item.id];
    const canManage = Boolean(engagement.viewerCanModerate || item.viewerCanDelete || item.viewerIsAuthor || item.isOwn);
    return <article className={`world-inside-detail__comment ${isReply ? "is-reply" : ""} ${canManage ? "can-moderate" : ""}`} key={item.id}>
      <FanAvatar name={item.author?.name || item.author?.username || "User"} size="h-7 w-7" src={item.author?.avatar} />
      <div className="world-inside-detail__comment-body">
        <p><Link to={item.author?.username ? `/profile/${item.author.username}` : "#"}>{item.author?.name || item.author?.username || __msg("admin.user")}</Link><MemberCommentBadge author={item.author} noteOwner={noteOwner} /> {showText ? item.text : null}</p>
        {item.audio ? (
          <div className="voice-comment-bubble-row">
            <VoiceMessageBubble audio={item.audio} className="world-voice-comment-player" compact label={__msg("comments.voiceComment")} variant="chip" />
            {item.text ? <button onClick={() => setVisibleTexts((current) => ({ ...current, [item.id]: !current[item.id] }))} type="button">{showText ? "hide text" : "show text"}</button> : null}
          </div>
        ) : null}
        <div className="world-inside-detail__comment-meta">
          <button aria-label={active ? "Remove heart" : "Heart this comment"} aria-pressed={active} className={`world-comment-heart ${active ? "is-active" : ""}`} disabled={mutationBusy === item.id} onClick={() => onCommentReact(item, active ? "" : "LOVE")} type="button"><FiHeart aria-hidden="true" /> <span>{visibleReactionCount.toLocaleString()}</span></button>
          {!isReply ? <button className={replyTarget?.id === item.id ? "is-active" : ""} onClick={() => onReply(item)} type="button">{__msg("fan.reply")}</button> : null}
        </div>
        {(item.replies || []).map((reply) => renderComment(reply, true))}
      </div>
      {canManage ? <button aria-label="Open comment options" className="world-comment-menu-trigger" disabled={mutationBusy === item.id} onClick={() => setMenuTarget(item)} type="button"><FiMoreHorizontal /></button> : null}
    </article>;
  };
  return <>
    <div className="world-inside-detail__comment-list">{comments.map((item) => renderComment(item))}</div>
    {menuTarget ? <BottomSheet labelledBy="world-comment-options-title" onClose={() => setMenuTarget(null)} sheetClassName="world-comment-options-sheet">
      <header className="world-comment-options-head">
        <div><h2 id="world-comment-options-title">Comment options</h2><p>{menuTarget.author?.name || menuTarget.author?.username || "Comment"}</p></div>
        <button aria-label="Close comment options" onClick={() => setMenuTarget(null)} type="button"><FiX /></button>
      </header>
      <button className="world-comment-delete-option" disabled={mutationBusy === menuTarget.id} onClick={() => { const target = menuTarget; setMenuTarget(null); onRemove(target); }} type="button">
        <FiTrash2 /><span><b>Delete comment</b><small>This removes the comment and its replies.</small></span>
      </button>
    </BottomSheet> : null}
  </>;
}

function WorldInsideDetailPage({ canViewMemberContent, chapters, creator, engagementQuery, experiences = [], onBack, onGift, onOpenChapter, onOpenMessages, onOpenStory, publication }) {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");
  const [spamOpen, setSpamOpen] = useState(false);
  const [leaveAfterReport, setLeaveAfterReport] = useState(false);
  const [commentBusy, setCommentBusy] = useState("");
  const [posting, setPosting] = useState(false);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const storyPreviews = useMemo(() => privateStoryItems(chapters), [chapters]);
  const includedExperiences = useMemo(() => {
    const supplied = experiences.filter((item) => item && typeof item === "object");
    return supplied.length ? supplied : includedWorldExperiences(publication);
  }, [experiences, publication]);
  const engagement = engagementQuery.data || {};
  const memberCount = Number(publication?.members?.count || 0);
  const steppedInside = Math.max(memberCount, Number(engagement.viewCount || 0));
  const creatorName = creator.name || creator.username || __msg("discover.creator");
  const firstName = creatorFirstName(creator);
  const memberNumber = publication?.viewer?.memberNumber || null;
  const privateCircles = publication?.privateCircles || [];
  const bonusChapters = publication?.bonusChapters || [];
  const chapterWord = chapters.length === 1 ? "chapter" : "chapters";
  const saved = Boolean(engagement.viewerSaved);
  const canPostComment = commentText.trim() && !posting && publication.commentsEnabled !== false;
  const reportMutation = useMutation({
    mutationFn: (payload) => api.reportWorld(publication.id || publication._id, payload),
    onError: (error) => setReportError(error?.response?.data?.message || __msg("social.unableToSendReport")),
    onSuccess: () => setReportDone(true),
  });

  useEffect(() => {
    if (canViewMemberContent && publication?.id) api.markWorldWalked(publication.id).then(() => engagementQuery.refetch()).catch(() => null);
  }, [canViewMemberContent, engagementQuery, publication?.id]);

  const toggleSave = async () => {
    try {
      const response = await api.toggleSeenSave(publication.id);
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
      showToast(response.data.message || (saved ? __msg("social.removedFromSaved_06583b") : __msg("social.saved")));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.couldNotUpdateSaved"));
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
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBePosted"));
    } finally {
      setPosting(false);
    }
  };

  const submitVoiceComment = async (payload) => {
    if (posting) return;
    setPosting(true);
    try {
      const response = await api.voiceCommentOnSeen(publication.id, { ...payload, parentCommentId: replyTarget?.id || "" });
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
      setCommentText("");
      setReplyTarget(null);
      setVoiceCommentOpen(false);
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.voiceCommentCouldNotBePosted"));
    } finally {
      setPosting(false);
    }
  };

  const toggleCommentReaction = async (comment, reaction = "LIKE") => {
    const previousEngagement = queryClient.getQueryData(["world-engagement", publication.id]);
    queryClient.setQueryData(["world-engagement", publication.id], withOptimisticWorldCommentHeart(previousEngagement, comment.id, Boolean(reaction)));
    setCommentBusy(comment.id);
    try {
      const request = !reaction
        ? api.removeSeenCommentReaction(publication.id, comment.id)
        : api.reactToSeenComment(publication.id, comment.id, reaction);
      const response = await request;
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
    } catch (error) {
      if (previousEngagement) queryClient.setQueryData(["world-engagement", publication.id], previousEngagement);
      showToast(error?.response?.data?.message || __msg("social.reactionCouldNotBeSaved"));
    } finally {
      setCommentBusy("");
    }
  };

  const removeComment = async (comment) => {
    if (!comment?.id || commentBusy) return;
    setCommentBusy(comment.id);
    try {
      const response = await api.removeSeenComment(publication.id, comment.id);
      queryClient.setQueryData(["world-engagement", publication.id], response.data.data.engagement);
      showToast(__msg("social.commentRemoved"));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBeRemoved"));
    } finally {
      setCommentBusy("");
    }
  };

  const closeReport = () => {
    const shouldLeave = leaveAfterReport;
    setReportOpen(false);
    setSpamOpen(false);
    setReportDone(false);
    setReportError("");
    setLeaveAfterReport(false);
    if (shouldLeave) onBack();
  };

  const submitReport = (reason) => {
    setReportError("");
    reportMutation.mutate({ reason: reason.value, label: reason.label });
  };

  const submitSpamReport = (selectedActions) => {
    setReportError("");
    reportMutation.mutate(
      {
        reason: "SPAM",
        label: "Spam",
        reportMode: "SPAM_ACTIONS",
        safetyActions: selectedActions.map(({ key, label, description }) => ({ key, label, description })),
      },
      {
        onSuccess: () => {
          const exitsWorld = selectedActions.some((action) => ["banCreator", "removeFromWorld"].includes(action.key));
          setLeaveAfterReport(exitsWorld);
          setSpamOpen(false);
          setReportOpen(true);
          setReportDone(true);
          queryClient.invalidateQueries({ queryKey: ["memberships"] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["world", publication.id || publication._id] });
          const actionText = selectedActions.some((action) => action.key === "deleteMessages") ? "messages deleted · " : "";
          showToast(__msg("social.reportSent", { value0: creatorFirstName(creator), value1: actionText }));
        },
      },
    );
  };

  return <article className="world-inside-detail world-member-home">
    <header className="world-inside-detail__header">
      <button aria-label={__msg("social.backToMemberAccess")} className="world-inside-detail__round" onClick={onBack} type="button"><FiArrowLeft /></button>
      <div className="world-inside-detail__title">
        <h1>{publication.title || __msg("admin.world")}</h1>
        <p>{creatorName} {publication.creator?.verified || creator.verified ? "✓" : ""} · {chapters.length} {chapterWord} · {steppedInside.toLocaleString(__uiLocale())} {__msg("discover.steppedInside")}</p>
      </div>
      <div className="world-inside-detail__actions">
        <button aria-label={__msg("social.sendAGift", { value0: firstName })} className="world-inside-detail__round" onClick={onGift} type="button"><FiGift /></button>
        <button aria-label={saved ? __msg("social.removeWorldFromSaved") : __msg("social.saveWorld")} aria-pressed={saved} className={`world-inside-detail__round ${saved ? "is-active" : ""}`} onClick={toggleSave} type="button"><FiBookmark fill={saved ? "currentColor" : "none"} /></button>
        <button aria-label={__msg("social.moreWorldActions")} className="world-inside-detail__round" onClick={() => setMoreOpen(true)} type="button"><FiMoreHorizontal /></button>
      </div>
    </header>

    <section className="world-inside-detail__hero world-member-home__hero">
      {publication.coverMedia?.secureUrl
        ? (publication.coverMedia.mediaType === "VIDEO" || publication.coverMedia.resourceType === "video"
          ? <video controls playsInline preload="metadata" src={publication.coverMedia.secureUrl} />
          : <img alt={__msg("discover.cover", { value0: publication.title })} src={publication.coverMedia.secureUrl} />)
        : <MinimalWorldIcon size={64} />}
      <div className="world-member-home__hero-copy"><small>{__msg("system.WorldReaderPage.0e3f2dec15")}</small><h2>{publication.title}</h2><p><FanAvatar name={creatorName} size="h-7 w-7" src={creator.avatar} /> {__msg("share.by")} {creatorName} {creator.verified ? "✓" : ""}</p></div>
    </section>

    <p className="world-member-home__identity">{memberCount.toLocaleString(__uiLocale())} {__msg("discover.members")} {memberNumber ? <>· <b>{__msg("profile.member")}{memberNumber}</b></> : null}</p>
    {publication.description || publication.summary ? <p className="world-inside-detail__description world-member-home__description">{publication.description || publication.summary}</p> : null}

    <section className="world-member-home__hello"><FanAvatar name={creatorName} size="h-10 w-10" src={creator.avatar} /><div><b>{__msg("system.WorldReaderPage.af1a3ed2bd")} {firstName}</b><p>{publication.ownerWelcomeNote || __msg("system.WorldReaderPage.c170689152")}</p>{publication.worldWelcomeVoiceMedia?.secureUrl ? <audio controls preload="metadata" src={publication.worldWelcomeVoiceMedia.secureUrl} /> : null}</div></section>

    {storyPreviews.length ? <section className="world-inside-detail__stories" aria-label={__msg("social.privateStories")}>
      <h2>{__msg("system.WorldReaderPage.01cf59bc0a")} <span>{__msg("system.WorldReaderPage.0d1bb05821")} {firstName}</span></h2>
      <div>
        {storyPreviews.map((story, index) => <button aria-label={__msg("contentEntities.open", { value0: story.title || __msg("social.privateStory") })} key={`${story.assetId || story.secureUrl}-${index}`} onClick={() => onOpenStory({ index, stories: storyPreviews })} type="button">
          <span>{story.mediaType === "VIDEO" || story.resourceType === "video" ? <video muted playsInline preload="metadata" src={story.secureUrl} /> : <img alt="" src={story.secureUrl} />}</span>
          <small>{story.title || __msg("activity.story")}</small>
        </button>)}
      </div>
    </section> : null}

    {privateCircles.length ? <section className="world-member-home__circles"><h2>{__msg("system.WorldReaderPage.9f6b5fd0b2")}</h2>{privateCircles.map((circle) => <button key={circle.id} onClick={() => navigate(`/messages?group=${circle.id}`)} type="button"><span>{(circle.memberPreview || []).slice(0,3).map((member,index) => <FanAvatar key={member.id || index} name={member.name || member.username} size="h-6 w-6" src={member.avatar} />)}</span><b>{circle.name}<small>{circle.memberCount} {__msg("system.WorldReaderPage.0c3cbc60e6")} {circle.talkingNow || 0} {__msg("system.WorldReaderPage.ee94993eb4")}</small></b><FiChevronRight /></button>)}</section> : null}

    <button className="world-member-home__direct" onClick={onOpenMessages} type="button"><FiMessageSquare /><span><b>{__msg("system.WorldReaderPage.86bda78a4e")}</b><small>{__msg("system.WorldReaderPage.f6623d7984")}</small></span><strong>{__msg("financial.open")}</strong></button>

    <section className="world-inside-detail__journey">
      <h2>{__msg("system.WorldReaderPage.806d2da3a4")} {includedExperiences.length}</h2>
      {includedExperiences.length ? <div className="world-member-home__seens">
        {includedExperiences.map((item) => {
          const experienceId = item.id || item._id;
          const chapterCount = Number(item.chapterCount ?? item.chapters?.length ?? 0);
          return (
            <article key={experienceId || item.title}>
              <Link className="world-member-home__seen-card" to={experienceId ? `/seen/${experienceId}?returnTo=${encodeURIComponent(`/world/${publication.id || publication._id}/inside?view=detail`)}` : "#"}>
                <span>{item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <MinimalWorldIcon size={34} />}</span>
                <div><small>{item.category || __msg("system.WorldReaderPage.9a3b98b949")}</small><b>{item.title || __msg("profile.untitledSeen")}</b><em>{chapterCount} {chapterCount === 1 ? __msg("profile.chapter_09d4c7") : __msg("discover.chapters")}</em><p>{item.summary || __msg("system.WorldReaderPage.88cd8ee848")}</p></div>
              </Link>
              <div className="world-member-home__seen-chapters">
                {(item.chapters || []).map((chapter, index) => <Link key={chapter.id || chapter.stableChapterId || index} to={experienceId ? `/seen/${experienceId}?chapter=${index + 1}&returnTo=${encodeURIComponent(`/world/${publication.id || publication._id}/inside?view=detail`)}` : "#"}><b>{String(index + 1).padStart(2, "0")}</b><span>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</span><i>›</i></Link>)}
              </div>
            </article>
          );
        })}
      </div> : <p className="world-inside-detail__empty">{__msg("social.noExperiencesHaveBeenIncludedYet")}</p>}
    </section>

    {bonusChapters.length ? <section className="world-member-home__bonus"><h2>{__msg("system.WorldReaderPage.b9b7d36476")} <span>{__msg("system.WorldReaderPage.3f8ecb267c")} {firstName}{__msg("system.WorldReaderPage.5e6363b4ba")}</span></h2><div>{bonusChapters.map((chapter, index) => <button key={chapter.id || index} onClick={() => navigate(`/seen/${chapter.seenId}?chapter=${chapter.chapterIndex}&returnTo=${encodeURIComponent(`/world/${publication.id || publication._id}/inside?view=detail`)}`)} type="button"><span>{String(index + 1).padStart(2, "0")}</span><b>{chapter.title || __msg("system.WorldReaderPage.d0f6c23839", { value0: index + 1 })}<small>⌁ {chapter.seenTitle} {__msg("system.WorldReaderPage.5fa0ebe473")}</small></b><FiChevronRight /></button>)}</div></section> : null}

    <section className="world-inside-detail__comments">
      <h2>{__msg("social.comments")} {Number(engagement.commentCount || 0).toLocaleString(__uiLocale())}</h2>
      <WorldInsideComments noteOwner={creator} engagement={engagement} mutationBusy={commentBusy} onCommentReact={toggleCommentReaction} onRemove={removeComment} onReply={setReplyTarget} replyTarget={replyTarget} />
      {publication.commentsEnabled === false ? <p className="world-inside-detail__comments-empty">{__msg("social.commentsAreTurnedOffForThisWorld")}</p> : <form className="media-comments-composer" onSubmit={submitComment}>
        <FanAvatar name={user?.name || user?.username || "You"} size="h-7 w-7" src={user?.avatar} />
        <div>
          {replyTarget ? <span>{__msg("creator.replyingTo")} {replyTarget.author?.name || __msg("social.comment")} <button onClick={() => setReplyTarget(null)} type="button">{__msg("admin.cancel")}</button></span> : null}
          <label><input aria-label={__msg("social.addAComment")} maxLength={500} onChange={(event) => setCommentText(event.target.value)} placeholder={__msg("fanWeb.addAComment")} value={commentText} /><button aria-label={__msg("fanWeb.recordAVoiceComment")} disabled={posting} onClick={() => setVoiceCommentOpen(true)} type="button"><FiMic /></button></label>
        </div>
        <button disabled={!canPostComment} type="submit">{posting ? __msg("comments.posting") : __msg("fanWeb.post")}</button>
      </form>}
    </section>

    {voiceCommentOpen ? <VoiceCommentRecorder busy={posting} onClose={() => setVoiceCommentOpen(false)} onSubmit={submitVoiceComment} /> : null}

    {moreOpen ? <WorldInsideMoreSheet
      canManageMembership={canViewMemberContent}
      creator={creator}
      onClose={() => setMoreOpen(false)}
      onReport={() => {
        setMoreOpen(false);
        setReportOpen(true);
        setReportDone(false);
        setReportError("");
      }}
      onReportSpam={() => {
        setMoreOpen(false);
        setSpamOpen(true);
        setReportDone(false);
        setReportError("");
      }}
      onGift={() => {
        setMoreOpen(false);
        onGift?.();
      }}
      onManageMembership={() => {
        setMoreOpen(false);
        navigate("/memberships");
      }}
      onShare={() => {
        setMoreOpen(false);
        setShareOpen(true);
      }}
      publication={publication}
    /> : null}
    {shareOpen ? <ShareSheet onClose={() => setShareOpen(false)} publication={publication} /> : null}
    {spamOpen ? <WorldSpamActionSheet
      creator={creator}
      error={reportError}
      isSubmitting={reportMutation.isPending}
      onClose={closeReport}
      onDone={submitSpamReport}
    /> : null}
    {reportOpen ? <WorldReportSheet
      error={reportError}
      isDone={reportDone}
      isSubmitting={reportMutation.isPending}
      onClose={closeReport}
      onDone={closeReport}
      onSelectReason={submitReport}
    /> : null}
  </article>;
}

function ExperienceVisitorOverview({ canView, chapters, engagementQuery, onBack, onOpenChapter, onRequireLogin, onShare, onUnlock, publication }) {
  __useUiLanguage();
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const [activePreview, setActivePreview] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentBusy, setCommentBusy] = useState("");
  const [posting, setPosting] = useState(false);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const cover = publication.coverMedia?.secureUrl || publication.coverMedia?.thumbnailUrl;
  const publicationId = publication.id || publication._id;
  const creatorName = publication.creator?.name || publication.creator?.username || __msg("discover.creator");
  const chapterWord = chapters.length === 1 ? "chapter" : "chapters";
  const engagement = engagementQuery?.data || {};
  const commentsEnabled = publication.commentsEnabled !== false;
  const previewMedia = experiencePreviewMedia(chapters);
  const previewVideo = previewMedia.find((item) => item.type === "VIDEO" || item.mediaType === "VIDEO");
  const previewPhotos = previewMedia.filter((item) => item.type === "IMAGE" || item.mediaType === "IMAGE").slice(0, 3);
  const previewVoice = previewMedia.find((item) => ["AUDIO", "VOICE"].includes(item.type) || ["AUDIO", "VOICE"].includes(item.mediaType));

  const requireAccount = () => {
    if (user) return true;
    onRequireLogin?.();
    return false;
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || posting || !commentsEnabled || !requireAccount()) return;
    setPosting(true);
    try {
      await api.commentOnSeen(publicationId, text, "", replyTarget?.id || "");
      setCommentText("");
      setReplyTarget(null);
      await engagementQuery.refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBePosted"));
    } finally {
      setPosting(false);
    }
  };

  const submitVoiceComment = async (payload) => {
    if (posting || !commentsEnabled || !requireAccount()) return;
    setPosting(true);
    try {
      await api.voiceCommentOnSeen(publicationId, { ...payload, parentCommentId: replyTarget?.id || "" });
      setCommentText("");
      setReplyTarget(null);
      setVoiceCommentOpen(false);
      await engagementQuery.refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.voiceCommentCouldNotBePosted"));
    } finally {
      setPosting(false);
    }
  };

  const toggleCommentReaction = async (comment, reaction = "LIKE") => {
    if (!comment?.id || commentBusy || !requireAccount()) return;
    setCommentBusy(comment.id);
    try {
      if (!reaction) await api.removeSeenCommentReaction(publicationId, comment.id);
      else await api.reactToSeenComment(publicationId, comment.id, reaction);
      await engagementQuery.refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.reactionCouldNotBeUpdated"));
    } finally {
      setCommentBusy("");
    }
  };

  const removeComment = async (comment) => {
    if (!comment?.id || commentBusy || !engagement.viewerCanModerate) return;
    setCommentBusy(comment.id);
    try {
      await api.removeSeenComment(publicationId, comment.id);
      if (replyTarget?.id === comment.id) setReplyTarget(null);
      await engagementQuery.refetch();
      showToast(__msg("social.commentDeleted"));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBeDeleted"));
    } finally {
      setCommentBusy("");
    }
  };

  const startReply = (comment) => {
    if (!requireAccount()) return;
    setReplyTarget(comment);
  };

  return <article className="experience-viewer-page experience-public-viewer">
    <header className="experience-viewer-head">
      <button aria-label={__msg("profile.backToProfile")} onClick={onBack} type="button"><FiX /></button>
      <button aria-label={__msg("social.shareExperience")} className="experience-public-share" onClick={onShare} type="button"><FiArrowUpRight /></button>
    </header>
    <main>
      <button aria-label={!chapters[0]?.locked ? __msg("financial.preview", { value0: publication.title }) : __msg("social.unlock", { value0: publication.title })} className="experience-viewer-media" onClick={() => !chapters[0]?.locked ? onOpenChapter(0) : onUnlock()} type="button">{cover ? <img alt={__msg("discover.cover", { value0: publication.title })} src={cover} /> : <span aria-hidden="true">{PLANET}</span>}</button>
      <h1>{publication.title}</h1>
      {publication.description || publication.summary ? <p>{publication.description || publication.summary}</p> : null}
      <span className="experience-viewer-category">{publication.category || __msg("contentEntities.experience")}</span>
      <p className="experience-public-creator">{__msg("contentEntities.by")} {creatorName} {publication.creator?.verified ? <FiCheck aria-label={__msg("public.verifiedCreator")} /> : null} {"\u00b7"} {chapters.length} {chapterWord}</p>
      <div className="experience-viewer-chapters">
        {chapters.map((chapter, index) => { const locked = Boolean(chapter.locked && !canView); return <button aria-label={locked ? __msg("social.isLocked", { value0: chapter.title }) : __msg("contentEntities.open", { value0: chapter.title })} key={chapter.stableChapterId || chapter.id || index} onClick={() => locked ? onUnlock() : onOpenChapter(index)} type="button"><i>{index + 1}</i><strong>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</strong>{locked ? <FiLock aria-hidden="true" /> : index === 0 && !canView ? <small>{__msg("social.free")}</small> : null}<b>›</b></button>; })}
      </div>
      {!chapters.length ? <p>{__msg("social.noChaptersYet")}</p> : null}
      {previewMedia.length ? <section className="experience-public-previews">
        <header><span>{__msg("creator.preview_eb2264")}</span><h2>{__msg("creator.meetTheExperience")}</h2><p>{__msg("social.aGlimpseInsideBeforeYouUnlockIt")}</p></header>
        {previewVideo ? <div className="experience-public-preview-video"><video controls playsInline preload="metadata" src={previewVideo.secureUrl} /><span>{previewVideo.label}</span></div> : null}
        {previewPhotos.length ? <div className="experience-public-preview-photos">{previewPhotos.map((photo, index) => <button aria-label={__msg("creator.openPreviewPhoto", { value0: index + 1 })} key={photo.assetId || photo.id || photo.secureUrl} onClick={() => setActivePreview(photo)} type="button"><img alt={photo.label || __msg("social.experiencePreview", { value0: index + 1 })} loading="lazy" src={photo.secureUrl} /></button>)}</div> : null}
        {previewVoice ? <div className="experience-public-preview-voice"><span><FiPlay /></span><div><b>{previewVoice.label || __msg("creator.voiceHello")}</b><small>{__msg("social.aNoteFrom")} {creatorName}</small></div><audio controls preload="metadata" src={previewVoice.secureUrl} /></div> : null}
      </section> : null}
      {!canView ? <section className="experience-unlock-panel"><span>{__msg("social.oneTimePurchase")}</span><p>{__msg("social.unlockEveryChapterPermanentlyIncludingFutureUpdates")}</p><button onClick={onUnlock} type="button">{__msg("social.unlockExperience")} {"\u00b7"} {STAR}{publication.pricing?.starsAmount}</button></section> : <footer className="seen-detail-engagement"><div className="seen-detail-start-meta"><span>{chapters.length} {chapterWord} {"\u00b7"} ~{Math.max(1, chapters.length)} {__msg("messages.min")}</span><span>{__msg("social.tapAChapterToStart")} {"\u203a"}</span></div></footer>}
      <section className="experience-public-comments world-inside-detail__comments">
        <header className="experience-public-comments__head">
          <div><span>{__msg("social.conversation")}</span><h2>{__msg("admin.comments")}</h2></div>
          <strong>{Number(engagement.commentCount || 0).toLocaleString(__uiLocale())}</strong>
        </header>
        {engagementQuery?.isLoading ? <p className="world-inside-detail__comments-empty">{__msg("social.loadingComments")}</p> : (
          <WorldInsideComments
            noteOwner={publication?.creator}
            engagement={engagement}
            mutationBusy={commentBusy}
            onCommentReact={toggleCommentReaction}
            onRemove={removeComment}
            onReply={startReply}
            replyTarget={replyTarget}
          />
        )}
        {commentsEnabled ? (
          <form className="experience-public-comments__form media-comments-composer" onSubmit={submitComment}>
            <FanAvatar name={user?.name || user?.username || "You"} size="h-8 w-8" src={user?.avatar} />
            <div>
              {replyTarget ? <span>{__msg("creator.replyingTo")} <b>{replyTarget.author?.name || __msg("social.comment")}</b><button onClick={() => setReplyTarget(null)} type="button">{__msg("admin.cancel")}</button></span> : null}
              <label><input aria-label={replyTarget ? __msg("social.writeAReply") : __msg("social.addAComment")} maxLength={500} onChange={(event) => setCommentText(event.target.value)} onFocus={() => { if (!user) onRequireLogin?.(); }} placeholder={user ? (replyTarget ? __msg("social.writeAReply_126cd2") : __msg("fanWeb.addAComment")) : __msg("social.signInToComment")} value={commentText} /><button aria-label={__msg("fanWeb.recordAVoiceComment")} disabled={posting} onClick={() => { if (requireAccount()) setVoiceCommentOpen(true); }} type="button"><FiMic /></button></label>
            </div>
            <button aria-label={replyTarget ? __msg("social.postReply") : __msg("creator.postComment")} disabled={!commentText.trim() || posting} type="submit">{__msg("fanWeb.post")}</button>
          </form>
        ) : <div className="experience-public-comments__disabled"><FiMessageCircle /><span><b>{__msg("social.commentsAreOff")}</b><small>{__msg("social.theCreatorHasPausedThisConversation")}</small></span></div>}
      </section>
    </main>
    {voiceCommentOpen ? <VoiceCommentRecorder busy={posting} onClose={() => setVoiceCommentOpen(false)} onSubmit={submitVoiceComment} /> : null}
    {activePreview ? <div aria-label={__msg("creator.experiencePhotoPreview")} aria-modal="true" className="experience-public-preview-lightbox" onClick={() => setActivePreview(null)} role="dialog"><button aria-label={__msg("admin.closePreview")} onClick={() => setActivePreview(null)} type="button"><FiX /></button><img alt={activePreview.label || __msg("creator.experiencePreview")} src={activePreview.secureUrl} /></div> : null}
  </article>;
}

void LegacyWorldShareSheet;

function ShareSheet({ onClose, publication }) {
  __useUiLanguage();
  const publicationId = String(publication?.id || publication?._id || "");
  const contentType = publication?.kind === "EXPERIENCE" ? "experience" : "world";
  const cover = publication?.coverMedia || publication?.cover || publication?.coverImage || {};
  return (
    <AppShareSheet
      isOpen
      onClose={onClose}
      payload={{
        canonicalUrl: shareUrlFor(publication),
        contentId: publicationId,
        contentType,
        destinationRoute: `/${contentType}/${publicationId}`,
        imageUrl: cover.secureUrl || cover.url || publication?.coverUrl || "",
        textPreview: publication?.title || (contentType === "experience" ? "Experience" : "World"),
        title: publication?.title || (contentType === "experience" ? "Experience" : "World"),
      }}
      variant="seen"
    />
  );
}

export default function WorldReaderPage() {
  __useUiLanguage();
  const { id } = useParams();
  const { loading: authLoading, user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useFanToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const routeProductLabel = location.pathname.startsWith("/experience/") ? __msg("contentEntities.experience") : __msg("admin.world");
  const [comment, setComment] = useState("");
  const [commentReplyTarget, setCommentReplyTarget] = useState(null);
  const [commentPostPending, setCommentPostPending] = useState(false);
  const [voiceCommentOpen, setVoiceCommentOpen] = useState(false);
  const [commentReactionPending, setCommentReactionPending] = useState("");
  const [activeChapterIndex, setActiveChapterIndex] = useState(null);
  const [experienceChaptersOpen, setExperienceChaptersOpen] = useState(true);
  const [experienceSettingsOpen, setExperienceSettingsOpen] = useState(false);
  const [tagPeopleOpen, setTagPeopleOpen] = useState(false);
  const [sheet, setSheet] = useState(new URLSearchParams(location.search).get("worldPanel") || "");
  const [joinKey, setJoinKey] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(new URLSearchParams(location.search).get("join") === "1");
  const [showJoinSuccess, setShowJoinSuccess] = useState(false);
  const [showExperienceUnlock, setShowExperienceUnlock] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const [commentRemovePending, setCommentRemovePending] = useState("");
  const [experienceBusyId, setExperienceBusyId] = useState("");
  const [optimisticPlanetFaceEmoji, setOptimisticPlanetFaceEmoji] = useState("");
  const [optimisticFirstMonthOfferEnabled, setOptimisticFirstMonthOfferEnabled] = useState(null);
  const [optimisticCommentsEnabled, setOptimisticCommentsEnabled] = useState(null);
  const [introPriceToast, setIntroPriceToast] = useState("");
  const [commentStatusToast, setCommentStatusToast] = useState("");
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
  const waitingListQuery = useQuery({
    queryKey: ["world-waiting-list", publicationId],
    queryFn: () => membershipService.getWorldWaitingList(publicationId).then((response) => response.data.data.waitingList),
    enabled: Boolean(user && publicationId && premium && !owner),
    retry: false,
  });
  // The creator's normal World page is the owner prototype: it stays a view
  // page, but exposes inline story, settings, and Paid Seen management. Other
  // viewers continue to receive the public World presentation.
  const editingWorld = Boolean(owner && !experience);
  const explicitWorldEdit = Boolean(editingWorld && new URLSearchParams(location.search).get("edit") === "1");
  const accessToken = new URLSearchParams(location.search).get("access") || "";
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "";
  const returnFromExperience = () => returnTo
    ? navigate(returnTo, { replace: true })
    : navigate(creator.username ? `/profile/${creator.username}` : -1);
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
    queryFn: () => api.listMyPublications({ kind: "SEEN", limit: 50 }).then((response) => (response.data.data.items || []).filter((item) => item.pricing?.mode === "ONE_TIME")),
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
  const accessRequest = useMutation({ mutationFn: () => api.requestExperienceAccess(publicationId, accessToken), onSuccess: async (response) => { showToast(response.data.message); if (response.data.data?.request?.status === "APPROVED") await query.refetch(); }, onError: (error) => showToast(error?.response?.data?.message || __msg("social.accessRequestCouldNotBeSent")) });
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
      if (payload.queued) {
        queryClient.setQueryData(["world-waiting-list", publicationId], payload.waitingList);
        await queryClient.invalidateQueries({ queryKey: ["wallet"] });
        setJoinKey("");
        showToast(__msg("social.youReOnTheWaitingListYourStarsAre", { value0: payload.waitingList?.position || 1 }));
        return;
      }
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
      setShowJoinSuccess(true);
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
        setShowJoinSuccess(false);
        return;
      }
      setJoinKey("");
      showToast(financialErrorMessage(error, __msg("social.couldNotJoinThisWorldPleaseTryAgain")));
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
        showToast(_error?.response?.data?.message || __msg("social.value0CommentsSettingCouldNotBeUpdated", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") }));
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
        setCommentStatusToast(payload.commentsEnabled ? __msg("social.commentsOn_b99c6f") : __msg("social.commentsOff"));
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
      showToast(__msg("social.worldPriceUpdated"));
      setSheet("");
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.worldPriceCouldNotBeUpdated")),
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
      showToast(experienceArchived ? __msg("social.experienceIsBackOnSale") : __msg("social.experienceRemovedFromSale"));
    },
    onError: (error) => showToast(error?.response?.data?.message || (experienceArchived ? __msg("social.experienceCouldNotBePutBackOnSale") : __msg("social.experienceCouldNotBeRemovedFromSale"))),
  });
  const coverUpload = useMutation({
    mutationFn: (file) => api.uploadWorldCover(publicationId, file, setCoverProgress),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      setSheet("");
      setCoverProgress(0);
    },
  });
  const cancelWaitingList = useMutation({
    mutationFn: () => membershipService.cancelWorldWaitingList(publicationId, createIdempotencyKey("premium-waitlist-cancel")),
    onSuccess: async () => {
      queryClient.setQueryData(["world-waiting-list", publicationId], null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wallet"] }),
        queryClient.invalidateQueries({ queryKey: ["world-waiting-list", publicationId] }),
      ]);
      showToast(__msg("social.waitingListReservationCancelledYourStarsWereReturned"));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.waitingListReservationCouldNotBeCancelled")),
  });
  const createWorldCircle = useMutation({
    mutationFn: ({ name, description }) => messageService.createWorldCircle(publicationId, name, description),
    onSuccess: async () => { await query.refetch(); showToast(__msg("system.WorldReaderPage.e19bf5e802")); },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.privateCircleCouldNotBeCreated")),
  });
  const coverRemove = useMutation({
    mutationFn: () => api.removeWorldCover(publicationId),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      showToast(__msg("social.coverRemoved", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") }));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.value0CoverCouldNotBeRemoved", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") })),
  });
  const welcomeVoiceUpload = useMutation({
    mutationFn: (file) => api.uploadWorldWelcomeVoice(publicationId, file),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch(), queryClient.invalidateQueries({ queryKey: ["member-world", publicationId] })]);
      showToast(__msg("system.WorldReaderPage.3acddf17a1"));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.voiceHelloCouldNotBeAdded")),
  });
  const welcomeVoiceRemove = useMutation({
    mutationFn: () => api.removeWorldWelcomeVoice(publicationId),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch(), queryClient.invalidateQueries({ queryKey: ["member-world", publicationId] })]);
      showToast(__msg("system.WorldReaderPage.aec0a171ce"));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.voiceHelloCouldNotBeRemoved")),
  });
  const waveMutation = useMutation({
    mutationFn: () => api.openWorldWave(publicationId),
    onSuccess: async () => {
      await managementQuery.refetch();
      showToast(__msg("social.aNewWorldWaveIsOpen"));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.theNewWaveCouldNotBeOpened")),
  });
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
      showToast(__msg("social.added", { value0: added?.displayName || added?.name || __msg("social.moderator_ad3b15") }));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.moderatorCouldNotBeAdded")),
  });
  const moderatorRemove = useMutation({
    mutationFn: (userId) => api.removeWorldModerator(publicationId, userId),
    onSuccess: async () => {
      await Promise.all([managementQuery.refetch(), moderatorCandidates.refetch()]);
      showToast(__msg("social.moderatorRemoved"));
      setRemoveModerator(null);
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.moderatorCouldNotBeRemoved")),
  });
  const storyUpload = useMutation({
    mutationFn: ({ caption = "", editorMetadata = null, file }) => api.uploadWorldStory(publicationId, file, {
      caption,
      editorMetadata: JSON.stringify(editorMetadata || {}),
      label: caption || __msg("activity.story"),
    }),
    onSuccess: async (response) => {
      const payload = response?.data?.data;
      if (payload?.publication || payload?.management) {
        queryClient.setQueryData(["world-management", publicationId], {
          publication: payload.publication,
          management: payload.management,
        });
      }
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      showToast(__msg("social.storyAddedToThisWorld"));
    },
    onError: (error) => showToast(error?.response?.data?.message || error?.message || __msg("social.couldNotUploadThisStory")),
  });
  const storyRemove = useMutation({
    mutationFn: ({ blockId, chapterId }) => api.removeWorldStory(publicationId, chapterId, blockId),
    onSuccess: async () => {
      await Promise.all([query.refetch(), managementQuery.refetch()]);
      showToast(__msg("social.storyRemoved"));
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.storyCouldNotBeRemoved")),
  });
  const worldPublish = useMutation({
    mutationFn: () => (managedPublication.status === "CHANGES_REQUESTED"
      ? api.resubmitPublication(publicationId, managedPublication.statusVersion)
      : api.submitPublication(publicationId, managedPublication.statusVersion)),
    onSuccess: async () => {
      await Promise.all([
        query.refetch(),
        managementQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      showToast(__msg("social.worldPublished"));
      navigate(`/world/${publicationId}`, { replace: true });
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("social.worldCouldNotBePublished")),
  });

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

  if (authLoading || query.isLoading) return <div className="world-prototype-state">{__msg("creator.opening")} {routeProductLabel}...</div>;
  if (query.isError || !publication) return <div className="world-prototype-state"><h1>{routeProductLabel} {__msg("social.unavailable")}</h1><p>{__msg("social.itMayBeUnpublishedArchivedOrMissing")}</p></div>;

  const insideRequested = location.pathname.endsWith("/inside");
  const insideDetailRequested = insideRequested && new URLSearchParams(location.search).get("view") === "detail";
  const canViewMemberContent = owner || ["ACTIVE_PREMIUM_MEMBER", "ENTITLED_EXPERIENCE"].includes(publication?.access);
  const activeMembership = memberships.data?.find((item) => String(item.premiumPublication?._id || item.premiumPublication?.id) === String(publicationId) && isActivePremiumMembership(item));
  const openPremiumJoin = () => {
    if (owner || canViewMemberContent) {
      navigate(`/world/${publicationId}/inside`);
      return;
    }
    if (!user) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setJoinModalOpen(true);
  };
  const openCreatorMessages = (creatorUserId = creatorId) => {
    if (!creatorUserId) return;
    navigate(`/messages?with=${encodeURIComponent(creatorUserId)}&directAccess=1&autoIncluded=1`);
  };
  const leaveWorld = () => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : "/profile", { replace: true });
  if (showJoinSuccess && premium && !owner) {
    const privateStories = storyItems(memberWorldPublication?.chapters || chapters);
    return <>
      <PremiumWorldPreviewPage
        activeMembership={activeMembership}
        canViewMemberContent
        chapters={chapters}
        creator={creator}
        joinPending={false}
        memberPreview={walkersQuery.data}
        onBack={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
        onJoin={() => undefined}
        onOpenWorld={() => navigate(`/world/${publicationId}/inside`)}
        onShare={setActiveStory}
        owner={false}
        publication={publication}
      />
      <JoinMoment><WorldMemberInsidePage
        activeMembership={activeMembership}
        chapters={chapters}
        creator={creator}
        experiences={memberWorldExperiences}
        modal
        onClose={() => setShowJoinSuccess(false)}
        onOpenChapter={() => navigate(`/world/${publicationId}/inside?view=detail`)}
        onOpenMessages={openCreatorMessages}
        onOpenStories={() => {
          setShowJoinSuccess(false);
          if (privateStories.length) setActiveStory({ index: 0, stories: privateStories });
          else navigate(`/world/${publicationId}/inside?view=detail`);
        }}
        publication={{ ...publication, ...(memberWorldPublication || {}), privateCircles: publication.privateCircles || [] }}
      /></JoinMoment>
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={publication.title} /> : null}
    </>;
  }
  if (insideRequested && premium && !owner && !canViewMemberContent) {
    return (
      <><div className="world-member-inside-page">
        <section className="world-member-inside-content world-member-denied">
          <span className="world-member-planet"><MinimalWorldIcon size={54} /></span>
          <h1>{__msg("social.membersOnly")}</h1>
          <p>{__msg("profile.join")} {creatorFirstName(creator)}{__msg("social.sWorldToEnterThisSpace")}</p>
          <button className="world-member-primary" disabled={joinPremium.isPending || cancelWaitingList.isPending} onClick={waitingListQuery.data ? () => cancelWaitingList.mutate() : openPremiumJoin} type="button">
            {cancelWaitingList.isPending ? __msg("social.returningStars") : waitingListQuery.data ? __msg("social.waitingListCancel", { value0: waitingListQuery.data.position || 1 }) : joinPremium.isPending ? __msg("social.confirming") : __msg("social.joinSWorld", { value0: creatorFirstName(creator) })}
          </button>
        </section>
      </div></>
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
        onBack={leaveWorld}
        onGift={() => setGiftOpen(true)}
        onOpenChapter={(index) => setActiveChapterIndex(index)}
        onOpenMessages={() => openCreatorMessages()}
        onOpenStory={setActiveStory}
        publication={{ ...publication, ...(memberWorldPublication || {}), privateCircles: publication.privateCircles || [] }}
      />
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={publication.title} /> : null}
      {giftOpen ? <StoryGiftPicker onClose={() => setGiftOpen(false)} onSent={() => showToast(__msg("social.giftSentInMessages"))} recipient={{ id: creatorId, name: creator.name || creator.username }} sourceType="DIRECT" /> : null}
    </>;
  }
  if (insideRequested && premium && canViewMemberContent && !owner) {
    return (
      <WorldMemberDoorPage
        chapters={memberWorldPublication?.chapters || chapters}
        creator={creator}
        onBack={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
        onStepInside={() => navigate(`/world/${publicationId}/inside?view=detail`, { replace: true })}
        publication={memberWorldPublication || publication}
      />
    );
  }
  if (!insideRequested && premium && canViewMemberContent && !owner && activeChapterIndex === null) {
    return <WorldMemberDoorPage
        chapters={memberWorldPublication?.chapters || chapters}
        creator={creator}
        onBack={() => navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)}
        onStepInside={() => navigate(`/world/${publicationId}/inside?view=detail`, { replace: true })}
        publication={memberWorldPublication || publication}
      />;
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
          onCancelWaitlist={() => cancelWaitingList.mutate()}
          onJoin={openPremiumJoin}
          onOpenWorld={() => navigate(`/world/${publicationId}/inside`)}
          onShare={setActiveStory}
          owner={owner}
          publication={publication}
          waitingList={waitingListQuery.data}
          waitlistPending={cancelWaitingList.isPending}
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
        engagementQuery={engagement}
        onBack={returnFromExperience}
        onOpenChapter={setActiveChapterIndex}
        onRequireLogin={() => navigate("/login", { state: { from: { pathname: location.pathname } } })}
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

  const storyChapters = managedPublication?.chapters || chapters;
  const stories = storyItems(storyChapters);
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
      const response = await api.commentOnSeen(publicationId, value, "", commentReplyTarget?.id || "");
      if (response?.data?.data?.engagement) {
        queryClient.setQueryData(["world-engagement", id], response.data.data.engagement);
      }
      setComment("");
      setCommentReplyTarget(null);
      await engagement.refetch();
    } catch (error) {
      if (error?.response?.data?.code === "WORLD_COMMENTS_DISABLED") {
        setOptimisticCommentsEnabled(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["world", id] }),
          queryClient.invalidateQueries({ queryKey: ["world-management", publicationId] }),
        ]);
      }
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBePosted"));
    } finally {
      setCommentPostPending(false);
    }
  };

  const addVoiceComment = async (payload) => {
    if (commentPostPending || !user) return;
    setCommentPostPending(true);
    try {
      const response = await api.voiceCommentOnSeen(publicationId, { ...payload, parentCommentId: commentReplyTarget?.id || "" });
      if (response?.data?.data?.engagement) queryClient.setQueryData(["world-engagement", id], response.data.data.engagement);
      setComment("");
      setCommentReplyTarget(null);
      setVoiceCommentOpen(false);
      await engagement.refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.voiceCommentCouldNotBePosted"));
    } finally {
      setCommentPostPending(false);
    }
  };

  const toggleOwnerCommentReaction = async (targetComment, reaction = "LIKE") => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    if (!targetComment?.id || commentReactionPending) return;
    const previousEngagement = queryClient.getQueryData(["world-engagement", id]);
    queryClient.setQueryData(["world-engagement", id], withOptimisticWorldCommentHeart(previousEngagement, targetComment.id, Boolean(reaction)));
    setCommentReactionPending(targetComment.id);
    try {
      const response = !reaction
        ? await api.removeSeenCommentReaction(publicationId, targetComment.id)
        : await api.reactToSeenComment(publicationId, targetComment.id, reaction);
      if (response?.data?.data?.engagement) {
        queryClient.setQueryData(["world-engagement", id], response.data.data.engagement);
      } else {
        await engagement.refetch();
      }
    } catch (error) {
      if (previousEngagement) queryClient.setQueryData(["world-engagement", id], previousEngagement);
      showToast(error?.response?.data?.message || __msg("social.reactionCouldNotBeUpdated"));
    } finally {
      setCommentReactionPending("");
    }
  };

  const removeModeratedComment = async (targetComment) => {
    if (!targetComment?.id || commentRemovePending) return;
    setCommentRemovePending(targetComment.id);
    try {
      const response = await api.removeSeenComment(publicationId, targetComment.id);
      queryClient.setQueryData(["world-engagement", id], response.data.data.engagement);
      showToast(__msg("social.commentRemoved"));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.commentCouldNotBeRemoved"));
    } finally {
      setCommentRemovePending("");
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
      setCommentStatusToast(included ? __msg("social.removedFromTheWorld") : __msg("social.includedMembersGetItFree"));
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("social.experienceCouldNotBeUpdated"));
    } finally {
      setExperienceBusyId("");
    }
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
      setQuickChapterError(__msg("creator.nameThisChapterFirst"));
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
      setQuickChapterError(error?.response?.data?.message || error?.message || __msg("social.chapterCouldNotBeAdded"));
    } finally {
      setQuickChapterSaving(false);
    }
  };

  const toggleIntroPrice = () => {
    const nextEnabled = !firstMonthOfferEnabled;
    setIntroPriceToast(nextEnabled ? __msg("social.introPriceIsLive") : __msg("social.introPriceOff"));
    updateWorld.mutate({ firstMonthOfferEnabled: nextEnabled });
  };

  const toggleCommentsEnabled = () => {
    const nextEnabled = !commentsEnabled;
    updateWorld.mutate({ commentsEnabled: nextEnabled });
  };

  const experiencePriceLabel = managedPublication.pricing?.mode === "FREE"
    ? __msg("social.freeExperienceEveryChapterIsOpen")
    : __msg("social.premiumExperienceOneTime", { value0: STAR, value1: priceStars || managedPublication.pricing?.starsAmount || 0 });

  if (experience && owner && sheet === "actions") return (
    <article className="experience-actions-page">
      <header>
        <button aria-label={__msg("social.backToExperience")} onClick={() => setSheet("")} type="button"><FiArrowLeft /></button>
        <h1>{managedPublication.title}</h1>
        <p>{managedPublication.pricing?.mode === "FREE" ? __msg("social.freeExperience") : __msg("social.premiumExperienceOneTime", { value0: STAR, value1: priceStars || managedPublication.pricing?.starsAmount || 0 })}</p>
      </header>
      <nav aria-label={__msg("social.experienceActions")}>
        <button onClick={() => setSheet("share")} type="button"><FiShare2 /><span><b>{__msg("admin.share")}</b></span></button>
        <button onClick={() => setSheet("access")} type="button"><FiLink /><span><b>{__msg("social.accessByLink")}</b><small>{__msg("social.sendALinkYouConfirmWhoEnters")}</small></span></button>
        <button onClick={() => navigate(`/studio/experiences/${publicationId}/edit`)} type="button"><FiEdit3 /><span><b>{__msg("profile.edit")}</b><small>{__msg("social.titlePathPriceChapters")}</small></span></button>
        <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>{__msg("profile.changeCover")}</b></span></button>
        <button disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? __msg("social.turnCommentsOff") : __msg("social.turnCommentsOn")}</b></span></button>
        <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>{__msg("social.moderators")}</b><small>{__msg("social.thisProductSOwnCleanupTeam")}</small></span></button>
        <button className={experienceArchived ? "" : "is-remove"} disabled={archiveExperience.isPending} onClick={() => window.confirm(experienceArchived ? "Put this Experience back on sale? Other users will be able to see and purchase it again." : "Remove this Experience from sale? Buyers keep their permanent access.") && archiveExperience.mutate()} type="button"><FiTrash2 /><span><b>{archiveExperience.isPending ? (experienceArchived ? __msg("social.restoring") : __msg("creator.removing")) : (experienceArchived ? __msg("social.backOnSale") : __msg("social.removeFromSale"))}</b><small>{experienceArchived ? __msg("social.archived") : __msg("social.buyersKeepItForever")}</small></span></button>
      </nav>
    </article>
  );

  if (!experience && owner && sheet === "actions") return (
    <article className="world-actions-page">
      <header>
        <button aria-label={__msg("social.backToWorld")} onClick={() => setSheet("")} type="button"><FiArrowLeft /></button>
        <h1 id="world-actions-title">{managedPublication.title}</h1>
        <p>{__msg("social.yourWorldSubscription")}</p>
      </header>
      <nav aria-label={__msg("social.worldActions")}>
        <button onClick={() => setSheet("share")} type="button"><FiShare2 /><span><b>{__msg("admin.share")}</b></span></button>
        <button onClick={() => { setSheet(""); navigate(`/world/${publicationId}?edit=1`); }} type="button"><FiEdit3 /><span><b>{__msg("profile.edit")}</b><small>{__msg("social.titleStoriesAccess")}</small></span></button>
        <button onClick={() => setSheet("face")} type="button"><FiEdit3 /><span><b>Change World icon</b><small>choose the topic emoji above your planet</small></span></button>
        <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>{__msg("profile.changeCover")}</b></span></button>
        <button aria-label={commentsEnabled ? __msg("social.turnCommentsOff") : __msg("social.turnCommentsOn")} disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? __msg("social.turnCommentsOff") : __msg("social.turnCommentsOn")}</b></span></button>
        <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>{__msg("social.moderators")}</b><small>{__msg("social.thisProductSOwnCleanupTeam")}</small></span></button>
      </nav>
    </article>
  );

  return (
    <>
      <article className={`world-prototype-page ${experience ? "is-experience-detail" : ""}`}>
        <header className="world-prototype-top">
          <button aria-label={experience && returnTo ? __msg("social.backToWorld") : __msg("profile.backToProfile")} onClick={() => experience && returnTo ? returnFromExperience() : navigate(publication.creator?.username ? `/profile/${publication.creator.username}` : -1)} type="button"><FiArrowLeft /></button>
          <div>
            {owner ? <button aria-label={__msg("social.openAnalytics", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") })} onClick={() => setSheet("analytics")} type="button"><FiBarChart2 /></button> : null}
            <button aria-label={__msg("profile.share", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") })} onClick={() => setSheet("share")} type="button"><FiArrowUpRight /></button>
            {owner ? <button aria-label={__msg("social.moreActions", { value0: experience ? __msg("contentEntities.experience") : __msg("admin.world") })} onClick={() => setSheet("actions")} type="button"><FiMoreHorizontal /></button> : null}
          </div>
        </header>

        {!experience ? (
          <section className="world-prototype-planet">
            {commentStatusToast ? <div className="world-comment-status-pill" role="status">{commentStatusToast}</div> : null}
            <span className="world-prototype-minimal-icon"><MinimalWorldIcon size={64} /></span>
            {owner ? <button aria-label={`Change profile World icon. Current icon ${faceEmoji}`} className="world-prototype-selected-icon" onClick={() => setSheet("face")} type="button">{faceEmoji}</button> : <span aria-label={`Selected profile World icon ${faceEmoji}`} className="world-prototype-selected-icon" role="img">{faceEmoji}</span>}
          </section>
        ) : null}

        {!experience && (explicitWorldEdit || (!owner && managedPublication.coverMedia?.secureUrl)) ? (
          <section className={`world-top-cover-preview ${managedPublication.coverMedia?.secureUrl ? "has-cover" : ""}`}>
            {managedPublication.coverMedia?.secureUrl
              ? (managedPublication.coverMedia.mediaType === "VIDEO" || managedPublication.coverMedia.resourceType === "video" ? <video controls playsInline preload="metadata" src={managedPublication.coverMedia.secureUrl} /> : <img alt={__msg("creator.coverPreview", { value0: managedPublication.title || __msg("admin.world") })} src={managedPublication.coverMedia.secureUrl} />)
              : <div><FiImage /><strong>{__msg("creator.addACoverImage")}</strong><small>{__msg("creator.previewHowYourWorldWillAppear")}</small></div>}
            {explicitWorldEdit ? <span className="world-top-cover-actions">
              <button disabled={coverUpload.isPending || coverRemove.isPending} onClick={() => setSheet("cover")} type="button"><FiEdit3 /> {managedPublication.coverMedia?.secureUrl ? __msg("creator.change") : __msg("creator.addCover")}</button>
              {managedPublication.coverMedia?.secureUrl ? <button className="is-remove" disabled={coverRemove.isPending || coverUpload.isPending} onClick={() => coverRemove.mutate()} type="button"><FiTrash2 /> {coverRemove.isPending ? __msg("creator.removing") : __msg("profile.remove")}</button> : null}
            </span> : null}
          </section>
        ) : null}

        {experience ? (
          <section className="experience-detail-cover">
            {managedPublication.coverMedia?.secureUrl ? <img alt={__msg("discover.cover", { value0: managedPublication.title })} src={managedPublication.coverMedia.secureUrl} /> : <span>{PLANET}</span>}
            {owner ? (
              <div>
                <button onClick={() => chapters[0] && setActiveChapterIndex(0)} type="button"><FiSearch /> {__msg("admin.preview")}</button>
                <button onClick={() => setSheet("cover")} type="button"><FiEdit3 /> {__msg("creator.cover")}</button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (
          <section className="world-prototype-owner-stories">
            <div className="world-prototype-owner-story-head"><h2>{__msg("admin.stories")}</h2><span>{__msg("creator.upTo3SeenBeforePurchase")}</span></div>
            <div className="world-prototype-owner-story-row">
              {stories.map((story, index) => (
                <span className="world-prototype-owner-story-item" key={`${story.assetId || story.secureUrl}-${index}`}>
                  <button className="world-prototype-owner-story-thumb" onClick={() => setActiveStory({ index, stories })} type="button">
                    {story.resourceType === "video" ? <video muted playsInline src={story.secureUrl} /> : <img alt={story.title || __msg("social.worldStory")} src={story.secureUrl} />}
                  </button>
                  {explicitWorldEdit && story.chapterId && story.blockId ? <button aria-label={__msg("social.removeStory")} className="world-prototype-owner-story-remove" disabled={storyRemove.isPending} onClick={() => storyRemove.mutate({ blockId: story.blockId, chapterId: story.chapterId })} type="button"><FiX /></button> : null}
                </span>
              ))}
              {editingWorld && stories.length < 3 ? <button aria-label={__msg("social.addAFreePreviewStory")} className="world-prototype-owner-story-add" onClick={() => setStoryUploadSheetOpen(true)} type="button"><FiPlus /><span>{__msg("creator.add_58d1bb")}</span></button> : null}
            </div>
          </section>
        ) : null}

        {experience ? (
          <section className={`experience-detail-settings-panel ${experienceSettingsOpen ? "is-open" : ""}`}>
            <button aria-expanded={experienceSettingsOpen} className="experience-detail-settings" onClick={() => owner && setExperienceSettingsOpen((open) => !open)} type="button">
              <span><FiSettings /> {__msg("profile.settings")}</span>
              <FiChevronRight />
            </button>
            {owner && experienceSettingsOpen ? (
              <div className="experience-detail-settings-list">
                <button onClick={() => setStoryUploadSheetOpen(true)} type="button"><FiPlus /><span>{__msg("activity.addToYourStory")}</span></button>
                <button disabled={updateWorld.isPending} onClick={() => updateWorld.mutate({ allowDownload: !managedPublication.allowDownload })} type="button"><FiUpload /><span>{__msg("creator.allowDownload")}</span><b>{managedPublication.allowDownload ? "✓" : __msg("fanWeb.off")}</b></button>
                <button aria-expanded={tagPeopleOpen} onClick={() => setTagPeopleOpen((open) => !open)} type="button"><FiUserPlus /><span>{__msg("creator.tagPeople")}</span><b>{managedPublication.taggedPeople?.length || __msg("content.none")}</b></button>
                {tagPeopleOpen ? <div className="experience-tag-people-list">
                  {moderatorCandidates.isLoading ? <small>{__msg("fan.loadingPeople")}</small> : (moderatorCandidates.data || []).map((person) => {
                    const personId = String(person.id || person._id);
                    const selected = (managedPublication.taggedPeople || []).map(String).includes(personId);
                    return <button className={selected ? "is-selected" : ""} disabled={updateWorld.isPending} key={personId} onClick={() => updateWorld.mutate({ taggedPeople: selected ? managedPublication.taggedPeople.filter((taggedId) => String(taggedId) !== personId) : [...(managedPublication.taggedPeople || []), personId] })} type="button"><FanAvatar user={person} /><span><b>{person.name || person.username}</b><small>@{person.username}</small></span><i>{selected ? "✓" : "+"}</i></button>;
                  })}
                </div> : null}
                <button className={experienceArchived ? "" : "is-danger-muted"} disabled={archiveExperience.isPending} onClick={() => window.confirm(experienceArchived ? "Put this Experience back on sale?" : "Remove this Experience from sale?") && archiveExperience.mutate()} type="button"><FiArchive /><span>{archiveExperience.isPending ? (experienceArchived ? __msg("social.restoring") : __msg("creator.removing")) : (experienceArchived ? __msg("social.backOnSale") : __msg("social.removeFromSale"))}</span></button>
                <button className="experience-premium-world-setting" disabled={updateWorld.isPending} onClick={() => updateWorld.mutate({ includedInWorld: !managedPublication.includedInWorld })} type="button">
                  <i>{PLANET}</i>
                  <span><strong>{__msg("social.includeInMyPremiumWorld")}</strong><small>{__msg("social.worldMembersGetItWithTheirSubscription")}</small></span>
                  <b>{managedPublication.includedInWorld ? "✓" : __msg("fanWeb.off")}</b>
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (
          <section className="world-prototype-creator">
            <button className="world-prototype-walkers-trigger" disabled={!owner} onClick={() => owner && setWalkersOpen(true)} type="button">
              {creator.name || creator.username || __msg("discover.creator")} <b>✓</b> · <strong>{steppedInside.toLocaleString(__uiLocale())}</strong>{__msg("discover.steppedInside")}</button>
            <button className="world-prototype-seat-row" onClick={() => owner && setSheet("seats")} type="button">
              <i><u style={{ width: `${seatProgress}%` }} /></i>
              <small>{capacity ? __msg("social.seats", { value0: residents.toLocaleString(__uiLocale()), value1: capacity.toLocaleString(__uiLocale()) }) : __msg("social.seats_7f4aa7", { value0: residents.toLocaleString(__uiLocale()) })} {priceStars ? __msg("social.mo", { value0: STAR, value1: priceStars }) : ""} <em>{__msg("social.queue")} {Number(seat.waitingListCount || 0).toLocaleString(__uiLocale())} ›</em></small>
            </button>
          </section>
        ) : null}

        {experience ? (
          <p className="experience-detail-creator">{creator.name || creator.username || __msg("discover.creator")} <b>✓</b> · <span>{managedPublication.category || __msg("contentEntities.experience")}</span></p>
        ) : null}

        {experience ? <button className="world-prototype-premium-pill is-experience" type="button">{experiencePriceLabel}</button> : null}

        {!experience ? (
          <button className="world-prototype-premium-pill" onClick={() => explicitWorldEdit && setSheet("price")} type="button">
          {experience ? (managedPublication.pricing?.mode === "FREE" ? __msg("social.freeExperienceEveryChapterIsOpen") : __msg("social.premiumExperienceAllChaptersUnlockForOnce", { value0: STAR, value1: priceStars })) : __msg("social.freeChapter", { value0: PLANET, value1: premium ? __msg("financial.premiumWorld") : __msg("publication.freeWorld"), value2: management.stories?.freePreviewCount || 1, value3: priceStars ? ` · ${STAR}${priceStars}/mo` : "" })}
          {explicitWorldEdit ? <FiEdit3 /> : null}
        </button>
        ) : null}

        <div className="world-prototype-title-row">
          {explicitWorldEdit ? (
            <button aria-label={__msg("social.editWorldName")} className="world-prototype-title-button" onClick={() => setSheet("name")} type="button">
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
              <b>Direct Access{management.directAccess?.waiting ? __msg("social.waiting", { value0: management.directAccess.waiting }) : ""}</b>
              <small>{__msg("social.membersFirst")} {management.directAccess?.includedReplies || 0} {__msg("social.freeReplyIncluded")}</small>
              <i><FiChevronRight /></i>
            </button>
            {editingWorld ? <button className="world-create-welcome-row" onClick={() => setSheet("welcome")} type="button">
              <span className="world-create-welcome-icon" aria-hidden="true">∞</span>
              <span><b>{__msg("admin.welcomeMessage")}</b><small>{managedPublication.ownerWelcomeNote ? __msg("system.WorldPublishingPage.52a176d87e") : __msg("system.WorldPublishingPage.427def9395")}</small></span>
              <strong>{managedPublication.ownerWelcomeNote ? __msg("profile.edit") : __msg("publication.add")} <FiChevronRight /></strong>
            </button> : null}
            {editingWorld ? <button
              aria-controls="world-settings-list"
              aria-expanded={worldSettingsOpen}
              className={`world-prototype-settings-row ${worldSettingsOpen ? "is-expanded" : ""}`}
              onClick={() => editingWorld && setWorldSettingsOpen((open) => !open)}
              type="button"
            >
              <FiSettings />
              <b>{__msg("creator.worldSettings")}</b>
              <FiChevronRight className="world-settings-chevron" />
            </button> : null}
            {editingWorld && worldSettingsOpen ? (
              <div className="world-settings-list" id="world-settings-list">
                <p>{__msg("creator.insideYourWorld")}</p>
                {introPriceToast ? <div className="world-settings-toast" role="status">{introPriceToast}</div> : null}
                <Link className={`world-settings-item ${stories.length ? "is-complete" : "is-add"}`} to={`/studio/worlds/${publicationId}/edit`}>
                  <span className="world-settings-status">{stories.length ? <FiCheck /> : <FiPlus />}</span>
                  <span className="world-settings-copy"><b>{__msg("social.privateStories")}</b><small>{stories.length ? __msg("social.15sFansSeeThemBlurredOutside", { value0: stories.length }) : __msg("social.addTheFirstBlurredTeasersPullPeopleIn")}</small></span>
                  {!stories.length ? <FiChevronRight className="world-settings-row-chevron" /> : null}
                </Link>
                <button className={`world-settings-item ${includedExperiences.length ? "is-complete" : "is-add"}`} onClick={() => setSheet("include")} type="button">
                  <span className="world-settings-status">{includedExperiences.length ? <FiCheck /> : <FiPlus />}</span>
                  <span className="world-settings-copy"><b>{__msg("system.WorldPublishingPage.8e1574fd3c")}</b><small>{includedExperiences.length ? __msg("social.includedForMembers", { value0: includedExperiences.length }) : __msg("system.WorldReaderPage.bde6a9e3d9")}</small></span>
                  {!includedExperiences.length ? <FiChevronRight className="world-settings-row-chevron" /> : null}
                </button>
                <button className={`world-settings-item ${publication.privateCircles?.length ? "is-complete" : "is-add"}`} onClick={() => setSheet("circles")} type="button">
                  <span className="world-settings-status">{publication.privateCircles?.length ? <FiCheck /> : <FiPlus />}</span>
                  <span className="world-settings-copy"><b>{__msg("system.WorldReaderPage.e688f2ac72")}</b><small>{publication.privateCircles?.length ? __msg("system.WorldReaderPage.f75b18bd14", { value0: publication.privateCircles.length }) : __msg("system.WorldReaderPage.aaefae2587")}</small></span>
                  <FiChevronRight className="world-settings-row-chevron" />
                </button>
                <span className="world-settings-item is-complete">
                  <span className="world-settings-status"><FiCheck /></span>
                  <span className="world-settings-copy"><b>{__msg("creator.directAccessForMembers")}</b><small>{__msg("creator.1FreeReplyMonthEachThenFirstInLine")}</small></span>
                </span>
                <span className="world-settings-item is-complete">
                  <span className="world-settings-status"><FiCheck /></span>
                  <span className="world-settings-copy"><b>{__msg("creator.priceLockedForMembers")}</b><small>{__msg("social.raiseItLaterEarlyMembersKeepTheirsForever")}</small></span>
                </span>
                <button aria-pressed={firstMonthOfferEnabled} className="world-settings-item is-switch" disabled={updateWorld.isPending} onClick={toggleIntroPrice} type="button">
                  <span className="world-settings-status" />
                  <span className="world-settings-copy"><b>{__msg("creator.firstMonth50")}</b><small>{__msg("social.convertsTheHesitantSmarterThanRefunds")}</small></span>
                  <i aria-hidden="true" className={firstMonthOfferEnabled ? "is-on" : ""}><u /></i>
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {!experience ? (explicitWorldEdit ? (
          <button aria-label={__msg("social.editWorldDescription")} className="world-prototype-summary is-editable" onClick={() => setSheet("description")} type="button">
            <span>{managedPublication.description || managedPublication.summary || __msg("creator.addADescriptionForYourWorld")}</span><FiEdit3 />
          </button>
        ) : <p className="world-prototype-summary">{managedPublication.description || managedPublication.summary}</p>) : null}

        {!experience ? (
          <section className="world-prototype-inside">
            <h2>{t("Paid Seens inside")} {includedExperiences.length ? <span>{includedExperiences.length}</span> : null}</h2>
            {includedExperiences.length || editingWorld ? <div className="world-paid-seen-tiles">
              {editingWorld ? <button className="world-paid-seen-add-tile" onClick={() => setSheet("include")} type="button"><span><FiPlus /></span><b>{t("Add a Seen")}</b></button> : null}
              {includedExperiences.map((item) => (
                <Link className="world-paid-seen-tile" key={item.id} to={`/seen/${item.id}?returnTo=${encodeURIComponent(`/world/${publicationId}`)}`}>
                  <span className="world-paid-seen-tile-cover">
                    {item.coverMedia?.secureUrl ? <img alt="" src={item.coverMedia.secureUrl} /> : <i aria-hidden="true">{PLANET}</i>}
                    {item.pricing?.starsAmount ? <small className="world-paid-seen-price"><FiLock /> {item.pricing.starsAmount}</small> : null}
                    <small className="world-paid-seen-chapters">{String(item.chapterCount || 0).padStart(2, "0")}</small>
                  </span>
                  <b>{item.title}</b>
                </Link>
              ))}
            </div> : <p>{__msg("system.WorldReaderPage.1dbd776587")}</p>}
          </section>
        ) : null}

        {experience ? (
          <section className="experience-detail-chapters">
            <header>
              <h2>{__msg("contentEntities.experience")}</h2>
              <span>{experienceChapters.length} {__msg("profile.chapter_09d4c7")}{experienceChapters.length === 1 ? "" : "s"} · {managedPublication.pricing?.mode === "FREE" ? __msg("profile.free") : __msg("social.premium", { value0: PLANET })}</span>
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
                        <b>{chapter.title || __msg("profile.chapter_7c635d", { value0: index + 1 })}</b>
                        <small>
                          {owner ? <strong>{blocks.length ? __msg("social.item", { value0: blocks.length, value1: blocks.length === 1 ? "" : "s" }) : __msg("social.writeTheStory")}</strong> : null}
                          {owner ? " · " : null}
                          {locked ? <><FiLock /> {__msg("social.private")}</> : <em>{managedPublication.pricing?.mode === "FREE" || chapter.isPreview ? __msg("social.freePreview") : __msg("social.unlocked")}</em>}
                        </small>
                      </span>
                      <i>›</i>
                    </button>
                  );
                })}
                {!experienceChapters.length ? <p className="experience-detail-empty-chapters">{__msg("social.noChaptersHaveBeenAddedYet")}</p> : null}
                <button className="experience-detail-hide-chapters" onClick={() => setExperienceChaptersOpen(false)} type="button">{__msg("social.hide")} <FiChevronRight /></button>
              </div>
            ) : (
              <button className="experience-detail-chapter-pill" onClick={() => setExperienceChaptersOpen(true)} type="button">{__msg("social.chapters")} {experienceChapters.length || 0} <FiChevronRight /></button>
            )}
            {owner ? <button className="world-prototype-add-chapter" onClick={startQuickChapterFlow} type="button"><FiPlus /> {__msg("social.addAChapter")}</button> : null}
          </section>
        ) : null}

        <section className="world-prototype-comments">
          <h2>{t("Comments")}</h2>
          {commentsEnabled ? (
            <>
              {commentReplyTarget ? (
                <div className="world-comment-replying">
                  <span>{__msg("creator.replyingTo")} <b>{commentReplyTarget.author?.name || __msg("profile.fan")}</b></span>
                  <button onClick={() => setCommentReplyTarget(null)} type="button">{__msg("admin.cancel")}</button>
                </div>
              ) : null}
              <form className="media-comments-composer" onSubmit={addComment}>
                <FanAvatar name={user?.name || user?.username || "You"} size="h-6 w-6" src={user?.avatar} />
                <label><input maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder={commentReplyTarget ? __msg("social.writeAReply_126cd2") : __msg("fanWeb.addAComment")} value={comment} /><button aria-label={__msg("fanWeb.recordAVoiceComment")} disabled={commentPostPending} onClick={() => user ? setVoiceCommentOpen(true) : navigate("/login", { state: { from: { pathname: location.pathname } } })} type="button"><FiMic /></button></label>
                <button aria-label={commentReplyTarget ? __msg("social.postReply") : __msg("creator.postComment")} disabled={!comment.trim() || commentPostPending} type="submit">{__msg("fanWeb.post")}</button>
              </form>
            </>
          ) : <p className="world-prototype-empty-comments"><FiMessageCircle /> {__msg("creator.commentsAreTurnedOff")}</p>}
          {engagement.isLoading ? <p className="world-prototype-empty-comments">{__msg("social.loadingComments")}</p> : (
            <WorldInsideComments
              noteOwner={publication?.creator}
              engagement={engagement.data || {}}
              mutationBusy={commentReactionPending || commentRemovePending}
              onCommentReact={toggleOwnerCommentReaction}
              onRemove={removeModeratedComment}
              onReply={setCommentReplyTarget}
              replyTarget={commentReplyTarget}
            />
          )}

        </section>

        {explicitWorldEdit ? (
          <div className="world-owner-save-actions">
            <button onClick={() => navigate(`/world/${publicationId}`, { replace: true })} type="button">{__msg("admin.cancel")}</button>
            {["DRAFT", "CHANGES_REQUESTED"].includes(managedPublication.status) ? (
              <button disabled={worldPublish.isPending} onClick={() => worldPublish.mutate()} type="button"><FiCheck /> {worldPublish.isPending ? __msg("creator.publishing_74f811") : __msg("creator.publishWorld")}</button>
            ) : (
              <button onClick={async () => { await Promise.all([query.refetch(), managementQuery.refetch()]); showToast(__msg("social.worldChangesSaved")); navigate(`/world/${publicationId}`, { replace: true }); }} type="button"><FiCheck /> {__msg("posts.saveChanges")}</button>
            )}
          </div>
        ) : null}
        {activeMembership ? <p className="world-prototype-membership">{__msg("social.memberWindowRenews")} {new Date(activeMembership.currentPeriodEnd).toLocaleDateString(__uiLocale())} · <Link to="/memberships">{__msg("verification.manage")}</Link></p> : null}
      </article>

      {sheet === "name" ? <NameSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message} onClose={() => setSheet("")} onSave={(payload) => updateWorld.mutate(payload)} publication={managedPublication} /> : null}
      {sheet === "description" ? <DescriptionSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message} onClose={() => setSheet("")} onSave={(payload) => updateWorld.mutate(payload)} publication={managedPublication} /> : null}
      {sheet === "welcome" ? <WelcomeMessageSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message || welcomeVoiceUpload.error?.response?.data?.message || welcomeVoiceRemove.error?.response?.data?.message} onClose={() => setSheet("")} onRemoveVoice={() => welcomeVoiceRemove.mutate()} onSave={(payload) => updateWorld.mutate(payload)} onUploadVoice={(file) => welcomeVoiceUpload.mutate(file)} publication={managedPublication} voiceBusy={welcomeVoiceUpload.isPending || welcomeVoiceRemove.isPending} /> : null}
      {sheet === "circles" ? <PrivateCirclesSheet busy={createWorldCircle.isPending} circles={publication.privateCircles || []} error={createWorldCircle.error?.response?.data?.message} onClose={() => setSheet("")} onCreate={(payload) => createWorldCircle.mutateAsync(payload)} onOpen={(circle) => navigate(`/messages?group=${circle.id}`)} /> : null}
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
      {sheet === "seats" ? <SeatsSheet busy={waveMutation.isPending} management={management} onClose={() => setSheet("")} onOpenPrice={() => setSheet("price")} onOpenWave={() => waveMutation.mutate()} /> : null}
      {sheet === "face" ? <PlanetFaceSheet busy={updateWorld.isPending} error={updateWorld.error?.response?.data?.message} onClose={() => setSheet("")} onSave={(payload) => updateWorld.mutate(payload)} publication={{ ...managedPublication, planet: { ...(managedPublication.planet || {}), faceEmoji } }} /> : null}
      {sheet === "cover" ? <CoverSheet busy={coverUpload.isPending} error={coverUpload.error?.response?.data?.message} onClose={() => setSheet("")} onUpload={(file) => coverUpload.mutate(file)} progress={coverProgress} publication={managedPublication} /> : null}
      {sheet === "access" ? <ExperienceAccessSheet data={accessLinkQuery.data} error={accessLinkQuery.error?.response?.data?.message || (accessLinkQuery.isError ? "The access-link service could not be reached." : "")} loading={accessLinkQuery.isLoading || accessLinkQuery.isFetching} onClose={() => setSheet("")} onCopy={async () => { try { await copyToClipboard(accessLinkQuery.data?.url || ""); showToast(__msg("social.accessLinkCopied")); } catch { showToast(__msg("social.accessLinkCouldNotBeCopied")); } }} onDecide={(requestId, approved) => accessDecision.mutate({ requestId, approved })} onRetry={() => accessLinkQuery.refetch()} pendingId={accessDecision.isPending ? accessDecision.variables?.requestId : ""} /> : null}
      {sheet === "include" ? <IncludeExperienceSheet busyId={experienceBusyId} experiences={ownerExperiences.data || []} included={includedExperiences} onClose={() => setSheet("")} onCreate={() => navigate(`/create/seen?returnTo=${encodeURIComponent(`/world/${publicationId}?edit=1&worldPanel=include`)}`)} onToggle={toggleExperience} /> : null}
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
      {sheet === "analytics" ? <AnalyticsSheet analytics={management.analytics} loading={managementQuery.isLoading} onClose={() => setSheet("")} publication={managedPublication} /> : null}
      {sheet === "share" ? <ShareSheet onClose={() => setSheet("")} publication={managedPublication} viewerId={viewerId} /> : null}
      {walkersOpen ? <WorldWalkersSheet loading={walkersQuery.isLoading} onClose={() => setWalkersOpen(false)} onMessage={() => { setWalkersOpen(false); navigate("/messages?tab=direct"); }} publication={managedPublication} total={walkersQuery.data?.pagination?.total || steppedInside} walkers={walkersQuery.data?.items || []} /> : null}
      {activeStory ? <WorldStoryViewer creator={creator} onClose={() => setActiveStory(null)} story={activeStory} title={managedPublication.title} /> : null}
      <StoryCreator
        isOpen={storyUploadSheetOpen}
        mode="compose"
        onClose={() => setStoryUploadSheetOpen(false)}
        onSave={(payload) => storyUpload.mutateAsync(payload)}
      />
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
          <header className="world-actions-head"><button aria-label={__msg("social.backToWorld_a64f51")} onClick={() => setSheet("")} type="button"><FiArrowLeft /></button><div><h1 id="world-actions-title">{managedPublication.title}</h1><p>{__msg("social.yourWorldSubscription")}</p></div></header>
          <section className="world-actions-list">
            <button onClick={() => setSheet("share")} type="button"><FiShare2 /><span><b>{__msg("admin.share")}</b></span></button>
            <button onClick={() => { setSheet(""); navigate(`/world/${publicationId}?edit=1`); }} type="button"><FiEdit3 /><span><b>{__msg("profile.edit")}</b><small>{__msg("social.titleStoriesAccess")}</small></span></button>
            <button onClick={() => setSheet("cover")} type="button"><FiImage /><span><b>{__msg("profile.changeCover")}</b></span></button>
            <button aria-label={commentsEnabled ? __msg("social.turnCommentsOff") : __msg("social.turnCommentsOn")} disabled={updateWorld.isPending} onClick={toggleCommentsEnabled} type="button"><FiMessageCircle /><span><b>{commentsEnabled ? __msg("social.turnCommentsOff") : __msg("social.turnCommentsOn")}</b></span></button>
            <button onClick={() => setSheet("moderators")} type="button"><FiShield /><span><b>{__msg("social.moderators")}</b><small>{(management.moderators || []).length} {__msg("social.forThisExperienceOnly")}</small></span></button>
          </section>
        </BottomSheet>
      ) : null}
      <PurchaseWorldModal onClose={() => setShowExperienceUnlock(false)} onSuccess={() => query.refetch()} open={showExperienceUnlock} publication={publication} />
      <JoinPremiumModal authenticated={Boolean(user)} onClose={() => setJoinModalOpen(false)} onRequireAuth={() => navigate("/login", { state: { from: { pathname: location.pathname, search: location.search } } })} onSuccess={async (payload) => {
        setJoinModalOpen(false);
        if (payload?.queued) {
          queryClient.setQueryData(["world-waiting-list", publicationId], payload.waitingList);
          showToast(__msg("social.youReOnTheWaitingListYourStarsAre", { value0: payload.waitingList?.position || 1 }));
        } else setShowJoinSuccess(!payload?.alreadyActive);
        await Promise.allSettled([query.refetch(), memberships.refetch()]);
      }} open={joinModalOpen && premium && !owner && !canViewMemberContent} publication={publication} />
      {voiceCommentOpen ? <VoiceCommentRecorder busy={commentPostPending} onClose={() => setVoiceCommentOpen(false)} onSubmit={addVoiceComment} /> : null}
    </>
  );
}
