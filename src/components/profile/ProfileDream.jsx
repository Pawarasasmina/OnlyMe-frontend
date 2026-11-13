import ShareSheet from "../share/ShareSheet";
import CoinIcon from "../branding/CoinIcon";
import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronLeft, FiChevronRight, FiEdit2, FiEye, FiMoreHorizontal, FiRefreshCw, FiTrash2, FiUpload, FiX } from "react-icons/fi";
import { walletService } from "../../services/walletService";
import { dreamService } from "../../services/dreamService";
import "./ProfileGiftCopy.css";
import "./ProfileDreamCard.css";
import { resolveMediaUrl } from "../../utils/media";
import { dreamFallbackCover, dreamProgress } from "../../utils/dreamPresentation";
import { createIdempotencyKey } from "../../utils/idempotencyKey";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import GiftArt, { prototypeGiftPreset, resolvedGiftTier } from "../gifts/GiftArt";

const GOALS = [500, 900, 1500, 2500, 5000];
const SPARKLE = String.fromCharCode(10024);
const STAR = String.fromCharCode(10022);
const celebrationParticles = Array.from({ length: 28 }, (_, index) => ({ angle: index * (360 / 28), delay: (index % 7) * 34, distance: 92 + (index % 5) * 18, size: 8 + (index % 4) * 3 }));
async function croppedDreamPhoto(file, url, crop) {
  const image = await new Promise((resolve, reject) => { const value = new Image(); value.onload = () => resolve(value); value.onerror = reject; value.src = url; });
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 720;
  const context = canvas.getContext("2d"); const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * crop.zoom;
  const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - width) / 2 + crop.x * canvas.width, (canvas.height - height) / 2 + crop.y * canvas.height, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .9));
  if (!blob) throw new Error(__msg("profile.couldNotPrepareDreamPhoto"));
  return new File([blob], "dream-photo.jpg", { type: "image/jpeg" });
}

export function GiftCelebration({ caption = "", detail, gift, message = __msg("profile.youRePartOfThisDreamNow"), onDismiss, recipientName = "", senderName = "", note = "", showSuccessToast = true, variant = "" }) {
  __useUiLanguage();
  const tier = resolvedGiftTier(gift);
  const animation = gift.animationConfigured ? gift : { ...gift, ...prototypeGiftPreset(gift) };
  const family = animation.objectEffect && animation.objectEffect !== "none" ? `fx2-${animation.objectEffect}` : `fx-${animation.effectFamily || "glass"}`;
  return <div aria-label={onDismiss ? __msg("activity.close") : undefined} aria-live="polite" className={`gift-celebration-layer gift-tier-${tier.toLowerCase()} ${family} ${variant} ${onDismiss ? "is-dismissible" : ""}`} onClick={onDismiss} onKeyDown={onDismiss ? event => { if (event.key === "Enter" || event.key === " ") onDismiss(); } : undefined} role={onDismiss ? "button" : undefined} tabIndex={onDismiss ? 0 : undefined}>
    <div className="gift-celebration-veil" />
    <div className={variant ? `gift-celebration-scene ${variant}` : "gift-celebration-scene"} />
    {showSuccessToast ? <div className="gift-success-toast"><span className="gift-success-check">✓</span><span><strong>{message}</strong><small>{detail || __msg("profile.sent", { value0: gift.name, value1: STAR, value2: gift.stars.toLocaleString(__uiLocale()) })}</small></span></div> : null}
    <div className="gift-celebration-stage">
      <div className="gift-celebration-glow" />
      <i className="gift-celebration-ring is-outer" />
      <i className="gift-celebration-ring is-inner" />
      {celebrationParticles.map((particle, index) => <i className="gift-celebration-particle" key={index} style={{ "--angle": `${particle.angle}deg`, "--delay": `${particle.delay}ms`, "--distance": `${particle.distance}px`, "--size": `${particle.size}px` }} />)}
      {tier === "VAULT" || tier === "LEGENDARY" ? <div className="gift-vault-intro"><i /><i /><strong>{tier === "VAULT" ? "THE VAULT" : "LEGENDARY"}</strong></div> : null}
      <div className="gift-celebration-image"><GiftArt allowShine className="h-full w-full" gift={gift} imageClassName="h-full w-full" /></div>
      <div className="gift-celebration-copy">
      <strong dir="auto" className="gift-celebration-name">{gift.name}</strong>
      {caption ? <span className="gift-celebration-caption">“{caption}”</span> : null}
      {recipientName ? <small className="gift-celebration-recipient">{__msg("profile.for")} {recipientName} · <CoinIcon />{Number(gift.stars || 0).toLocaleString(__uiLocale())}</small> : null}
      {senderName ? <small className="gift-celebration-sender">{__msg("activity.from")} {senderName}</small> : null}
      {note ? <span className="gift-celebration-note">&ldquo;{note}&rdquo;</span> : null}
      </div>
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
  __useUiLanguage();
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
  const [previewPosition, setPreviewPosition] = useState(undefined);
  const previewProgress = Math.min(100, Math.round((Number(dream?.receivedStars || 0) / Math.max(1, Number(form.goalStars || 0))) * 100));
  useEffect(() => { if (!photoFile) return undefined; const url = URL.createObjectURL(photoFile); setPhotoUrl(url); return () => URL.revokeObjectURL(url); }, [photoFile]);
  useEffect(() => {
    if (!previewOpen) return undefined;
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setPreviewPosition({ "--dream-preview-center-x": `${bounds.left + bounds.width / 2}px` });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(centerColumn);
    return () => {
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [previewOpen]);

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
      setError(requestError.response?.data?.message || __msg("profile.unableToSaveDream"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`profile-dream-editor-layer ${fullPage ? "is-page" : ""}`} role="presentation">
      <form aria-label={__msg("profile.myDreamExperience")} className={`profile-dream-editor-sheet ${fullPage ? "is-page" : ""}`} onSubmit={save}>
        <button aria-label={__msg("profile.closeDreamExperience")} className="profile-dream-editor-close" onClick={onClose} type="button">
          {fullPage ? <FiArrowLeft data-ui-directional="true" /> : <FiX />}
        </button>
        <span className="profile-dream-editor-handle" />
        <div className="profile-dream-editor-title">
          <span aria-hidden="true">{SPARKLE}</span>
          <div>
            <h2>{__msg("profile.myDreamExperience")}</h2>
            <p>{fullPage
              ? __msg("profile.aDreamIsNotAnAskItSAn")
              : __msg("profile.oneRealThingYouDreamOfPeopleWhoFeel")}</p>
          </div>
        </div>

        <label className="profile-dream-label" htmlFor="dream-title">{__msg("profile.whatSTheDream")}</label>
        <div className="profile-dream-input-row">
          <input
            aria-label={__msg("profile.dreamEmoji")}
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
            placeholder={__msg("profile.learnSurfingAMonthInTokyo")}
            required
            value={form.title}
          />
        </div>

        <label className="profile-dream-label" htmlFor="dream-reason">{__msg("profile.whyItMatters")}</label>
        <textarea
          className="profile-dream-text-input profile-dream-textarea"
          id="dream-reason"
          maxLength={120}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          placeholder={__msg("profile.oneHonestLine")}
          required
          rows={2}
          value={form.reason}
        />
        {fullPage ? <p className="profile-dream-reason-helper">{__msg("profile.everyoneWhoOpensTheDreamSeesThisLineDreams")}</p> : null}

        <span className="profile-dream-label">{__msg("profile.dreamPhoto")}</span>
        <div className="dream-photo-editor">
          {photoUrl && !removePhoto ? <div className="dream-photo-crop"><img alt={__msg("profile.dreamCropPreview")} src={photoUrl} style={{ transform: `translate(${crop.x * 100}%, ${crop.y * 100}%) scale(${crop.zoom})` }} /></div> : <span className="dream-photo-empty">{__msg("profile.addOnePhoto")}</span>}
          <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { setPhotoFile(event.target.files?.[0] || null); setRemovePhoto(false); setCrop({ zoom: 1, x: 0, y: 0 }); }} ref={photoInput} type="file" />
          <div className="dream-photo-actions">
            <button onClick={() => photoInput.current?.click()} type="button">{fullPage ? <><FiUpload /> {__msg("profile.upload")}</> : photoUrl && !removePhoto ? __msg("profile.replace") : __msg("profile.upload")}</button>
            {fullPage ? <button onClick={() => setError(__msg("profile.dreamPhotoGenerationIsComingSoon"))} type="button"><FiRefreshCw /> {__msg("profile.generate")}</button> : null}
            {!fullPage && photoUrl && !removePhoto ? <button onClick={() => { setPhotoFile(null); setPhotoUrl(""); setRemovePhoto(true); }} type="button">{__msg("profile.remove")}</button> : null}
          </div>
          {photoFile ? <div className="dream-photo-adjust"><label>{__msg("profile.zoom")} <input max="2.5" min="1" onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) })} step="0.05" type="range" value={crop.zoom} /></label><label>{__msg("profile.leftRight")} <input max="0.4" min="-0.4" onChange={(e) => setCrop({ ...crop, x: Number(e.target.value) })} step="0.02" type="range" value={crop.x} /></label><label>{__msg("profile.upDown")} <input max="0.4" min="-0.4" onChange={(e) => setCrop({ ...crop, y: Number(e.target.value) })} step="0.02" type="range" value={crop.y} /></label></div> : null}
        </div>

        <span className="profile-dream-label">{__msg("profile.goal")}</span>
        <div className="profile-dream-goals" role="radiogroup" aria-label={__msg("profile.dreamStarGoal")}>
          {GOALS.map((goal) => (
            <button
              aria-checked={form.goalStars === goal}
              className={form.goalStars === goal ? "is-selected" : ""}
              key={goal}
              onClick={() => setForm({ ...form, goalStars: goal })}
              role="radio"
              type="button"
            >
              {fullPage ? "🪙" : STAR}{goal.toLocaleString(__uiLocale())}
            </button>
          ))}
        </div>

        <p className="profile-dream-helper">{fullPage
          ? __msg("profile.collectedInGifts", { value0: (Number(form.goalStars || 0) / 10).toLocaleString(__uiLocale()) })
          : __msg("profile.supportersSendGiftsEveryCoinGoesTowardTheGoal")}</p>
        {fullPage ? <p className="profile-dream-promise">{__msg("profile.chooseTheGoalThatFitsThisDreamYourSelected")}</p> : null}
        {error ? <p className="profile-dream-error">{__systemMessage(error)}</p> : null}
        {fullPage ? <button className="profile-dream-preview-button" onClick={() => setPreviewOpen(true)} type="button"><FiEye /> {__msg("admin.preview")}</button> : null}
        <button className="profile-dream-submit" disabled={saving} type="submit">
          {saving ? __msg("admin.saving") : fullPage ? __msg("contentEntities.save_efc007") : dream ? __msg("profile.saveDream") : __msg("profile.lightTheDream", { value0: SPARKLE })}
        </button>
        {previewOpen ? (
          <div className="dream-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPreviewOpen(false)} style={previewPosition}>
            <section aria-label={__msg("profile.dreamPreviewAsGuestsSeeIt")} className="dream-preview-card">
              <small>{__msg("profile.previewAsGuestsSeeIt")}</small>
              <div>
                <h3>{__msg("profile.dream")}</h3>
                <article>
                  <header><h4><span aria-hidden="true">{form.emoji || SPARKLE}</span>{form.title || __msg("profile.yourDream")}</h4><FiMoreHorizontal aria-hidden="true" /></header>
                  <p>“{form.reason || __msg("profile.whyThisDreamMatters")}”</p>
                  <div className="dream-preview-progress"><i style={{ width: `${previewProgress}%` }} /><b>{previewProgress}%</b></div>
                  <footer><span>{Number(dream?.supporterCount || 0)} {__msg("profile.inThisStory")}</span><strong>{__msg("orbit.helpMakeItHappen")} <FiChevronRight data-ui-directional="true" /></strong></footer>
                </article>
              </div>
              <p>{__msg("profile.tapOutsideToClose")}</p>
            </section>
          </div>
        ) : null}
      </form>
    </div>
  );
}

export function GiftPicker({ creatorName, dream: initialDream, gifts, onClose }) {
  __useUiLanguage();
  const queryClient = useQueryClient();
  const [dream, setDream] = useState(initialDream);
  const [needsRecharge, setNeedsRecharge] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const walletQuery = useQuery({ queryKey: ["wallet"], queryFn: () => walletService.getWallet().then(response => response.data.data.wallet), retry: false });
  const receiptTimer = useRef(null);
  const celebrationDismissed = useRef(false);
  const holdTimer = useRef(null);
  const heldGift = useRef(false);
  const [previewGift, setPreviewGift] = useState(null);
  const stopPreview = () => { window.clearTimeout(holdTimer.current); setPreviewGift(null); };
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);
  useEffect(() => () => window.clearTimeout(receiptTimer.current), []);
  const [privateSupport, setPrivateSupport] = useState(false);
  const [sent, setSent] = useState(null);
  const [sheetPosition, setSheetPosition] = useState(undefined);

  useEffect(() => {
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      const bounds = centerColumn.getBoundingClientRect();
      setSheetPosition({
        "--dream-support-column-width": `${bounds.width}px`,
        "--dream-support-center-x": `${bounds.left + (bounds.width / 2)}px`,
        "--gift-sheet-column-width": `${bounds.width}px`,
        "--gift-sheet-center-x": `${bounds.left + (bounds.width / 2)}px`,
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
  }, []);

  const send = async (gift) => {
    const price = Number(gift.stars || 0);
    if (sending || !walletQuery.isSuccess) return;
    if (Number(walletQuery.data.balance || 0) < price) { setNeedsRecharge(true); return; }
    const previousDream = dream;
    const previousWallet = queryClient.getQueryData(["wallet"]) || walletQuery.data;
    const firstSupport = !dream.viewerHasSupported;
    const optimisticDream = {
      ...dream,
      receivedStars: Number(dream.receivedStars || 0) + price,
      supporterCount: Number(dream.supporterCount || 0) + (firstSupport ? 1 : 0),
      quietSupporterCount: Number(dream.quietSupporterCount || 0) + (privateSupport && firstSupport ? 1 : 0),
      viewerHasSupported: true,
    };
    setNeedsRecharge(false);
    setError("");
    setSending(true);
    setDream(optimisticDream);
    queryClient.setQueryData(["wallet"], current => ({ ...(current || previousWallet), balance: Math.max(0, Number((current || previousWallet)?.balance || 0) - price) }));
    queryClient.setQueriesData({ queryKey: ["creator-dream"] }, current => current?.dream?.id === initialDream.id ? { ...current, dream: { ...current.dream, ...optimisticDream } } : current);
    celebrationDismissed.current = false;
    setSent(gift);
    window.clearTimeout(receiptTimer.current);
    const startedAt = Date.now();
    try {
      const response = await dreamService.sendGift(initialDream.id, { giftKey: gift.id || gift.key, privateSupport, idempotencyKey: createIdempotencyKey("dream-gift") });
      const result = response.data.data;
      setDream(current => ({ ...current, ...result.dream, viewerHasSupported: true }));
      if (!celebrationDismissed.current) setSent(result.gift || gift);
      if (result.wallet) queryClient.setQueryData(["wallet"], result.wallet);
      void queryClient.invalidateQueries({ queryKey: ["creator-dream"] });
      receiptTimer.current = window.setTimeout(() => { setSent(null); setSending(false); }, Math.max(350, 4200 - (Date.now() - startedAt)));
    } catch (requestError) {
      setDream(previousDream);
      queryClient.setQueryData(["wallet"], previousWallet);
      queryClient.setQueriesData({ queryKey: ["creator-dream"] }, current => current?.dream?.id === initialDream.id ? { ...current, dream: previousDream } : current);
      setSent(null);
      setSending(false);
      setError(requestError.response?.data?.message || "Unable to send gift");
      if (requestError.response?.status === 402) setNeedsRecharge(true);
      void walletQuery.refetch();
    }
  };

  const progress = dreamProgress(dream);
  const remaining = Math.max(0, Number(dream.goalStars || 0) - Number(dream.receivedStars || 0));
  const firstName = String(creatorName || __msg("profile.their")).trim().split(/\s+/)[0];
  const supporterCount = Number(dream.supporterCount || 0);
  const quietSupporterCount = Number.isFinite(dream.quietSupporterCount) ? dream.quietSupporterCount : null;
  const categories = gifts.reduce((groups, gift) => {
    const id = gift.category?.id || "feelings";
    if (!groups.has(id)) groups.set(id, { id, name: gift.category?.name || __msg("profile.feelings"), sortOrder: gift.category?.sortOrder ?? 100000, gifts: [] });
    groups.get(id).gifts.push(gift);
    return groups;
  }, new Map());
  const giftSections = [...categories.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <div className="dream-gift-backdrop dream-support-backdrop" style={sheetPosition}>
      {sent ? <GiftCelebration gift={sent} onDismiss={() => { celebrationDismissed.current = true; setSent(null); }} recipientName={firstName} showSuccessToast={false} variant="is-profile-gift" /> : null}
      {!sent ? <section aria-label={__msg("profile.supportSDream", { value0: creatorName })} aria-modal="true" className="dream-gift-sheet dream-support-sheet" role="dialog">
        <header className="dream-support-header">
          <button aria-label={__msg("profile.closeDreamSupport")} onClick={onClose} type="button"><FiChevronLeft data-ui-directional="true" /></button>
          <h2>{firstName}{__msg("profile.sDream")}</h2>
        </header>

        <div className={`dream-support-hero ${dream.photo?.url ? "has-photo" : ""}`}>
          {dream.photo?.url ? <img alt="" src={resolveMediaUrl(dream.photo.url)} /> : null}
          <span aria-hidden="true" className="dream-support-hero-shade" />
          <strong dir="auto"><i aria-hidden="true">{dream.emoji || SPARKLE}</i>{dream.title}</strong>
          <small>{firstName}{__msg("profile.sDream")}</small>
        </div>

        <div className="dream-support-reason">
          <span>{dream.creator?.avatar ? <img alt="" src={resolveMediaUrl(dream.creator.avatar)} /> : (dream.emoji || SPARKLE)}</span>
          <p>“{dream.reason}”</p>
        </div>

        <div className="dream-gift-progress"><i style={{ width: `${progress}%` }} /></div>
        <div className="dream-support-progress-copy">
          <span><CoinIcon /> {Number(dream.receivedStars || 0).toLocaleString(__uiLocale())} / {Number(dream.goalStars || 0).toLocaleString(__uiLocale())}</span>
          <strong className={progress > 0 ? "is-near-goal" : ""}>{dream.status === "COMPLETED" ? __msg("profile.itHappened") : remaining === 0 ? __msg("profile.dreamFullyFunded") : progress === 0 ? __msg("profile.beFirstToBelieve") : __msg("profile.dreamCoinsRemaining", { count: remaining.toLocaleString(__uiLocale()) })}</strong>
        </div>

        <div className="dream-support-people">
          <span className="dream-support-avatars">
            {(dream.supporters || []).slice(0, 5).map((supporter, index) => supporter.avatar
              ? <img alt="" key={`${supporter.username || supporter.name}-${index}`} src={resolveMediaUrl(supporter.avatar)} />
              : <i key={`${supporter.username || supporter.name}-${index}`}>{String(supporter.name || "?").slice(0, 1)}</i>)}
          </span>
          <small>{supporterCount.toLocaleString(__uiLocale())} {__msg("profile.inThisStory_ec8ed3")} {quietSupporterCount !== null ? <>{quietSupporterCount.toLocaleString(__uiLocale())} {__msg("profile.quietly")}</> : null}{dream.viewerHasSupported ? <b className="dream-support-you"> · {__msg("profile.youAreIn")} ✓</b> : null}</small>
        </div>

        <div aria-label={__msg("profile.dreamSupportVisibility")} className="dream-support-visibility" role="group">
          <button className={!privateSupport ? "is-selected" : ""} onClick={() => setPrivateSupport(false)} type="button"><strong>{__msg("profile.withMyName")}</strong><small>{__msg("profile.inTheDreamSStory")}</small></button>
          <button className={privateSupport ? "is-selected" : ""} onClick={() => setPrivateSupport(true)} type="button"><strong>{__msg("profile.quietly_b41e2d")}</strong><small>{__msg("profile.only")} {firstName} {__msg("profile.willKnow")}</small></button>
        </div>
        <p className="dream-support-explainer">{__msg("profile.whenItComesTrue")} {firstName} {__msg("profile.sharesTheMomentEveryoneWhoHelpedIsInIt")}<br />{__msg("profile.yourNameStaysInThisDream")}</p>

        {gifts.length ? <div className="dream-gift-sections dream-support-gifts">
          {giftSections.map((section) => <section className="dream-gift-category" key={section.id}>
            <h3 dir="auto">{section.name}</h3>
            <div className="dream-gift-grid">
              {section.gifts.map((gift) => <button
                className={`dream-gift-tile ${sent?.key === gift.key ? "is-selected" : ""}`}
               
                key={gift.key}
                disabled={!walletQuery.isSuccess || sending}
                onPointerDown={() => { heldGift.current = false; holdTimer.current = window.setTimeout(() => { heldGift.current = true; setPreviewGift(gift); }, 450); }}
                onPointerUp={stopPreview} onPointerCancel={stopPreview} onPointerLeave={stopPreview}
                onContextMenu={event => event.preventDefault()}
                onClick={() => { if (heldGift.current) { heldGift.current = false; return; } send(gift); }}
                type="button"
              >
                <span><GiftArt className="h-full w-full" gift={gift} imageClassName="h-full w-full" /></span>
                <strong>{gift.name}</strong>
                <small><CoinIcon />{Number(gift.stars || 0).toLocaleString(__uiLocale())}</small>
              </button>)}
            </div>
          </section>)}
        </div> : <p className="dream-gift-empty">{__msg("profile.noGiftsAreCurrentlyAvailable")}</p>}

        <p className="dream-support-preview-hint">{__msg("profile.holdGiftPreview")}</p>
        <footer className="dream-support-share-footer">{__msg("profile.dreamMadePossible", { count: supporterCount.toLocaleString(__uiLocale()) })} <span aria-hidden="true">&middot;</span> <button onClick={() => setShareOpen(true)} type="button">{__msg("profile.dreamShare")} &rsaquo;</button></footer>
        {error ? <p className="profile-dream-error" role="alert">{__systemMessage(error)}</p> : null}
        {previewGift ? <div className="dream-hold-preview" aria-live="polite"><GiftArt gift={previewGift} /><strong>{previewGift.name}</strong></div> : null}
        <ShareSheet isOpen={shareOpen} onClose={() => setShareOpen(false)} payload={{ contentType: "dream", contentId: dream.id, title: `${dream.emoji || SPARKLE} ${dream.title}`, previewText: dream.reason, imageUrl: resolveMediaUrl(dream.photo?.url), author: { name: creatorName, username: dream.creator?.username }, route: `/profile/${encodeURIComponent(dream.creator?.username || "")}?dream=${encodeURIComponent(dream.id)}` }} />
        {needsRecharge ? <div className="dream-demo-recharge" role="status"><span>Not enough coins for this gift.</span><Link to="/wallet">{__msg("stories.recharge")}</Link><button aria-label={__msg("activity.close")} onClick={() => setNeedsRecharge(false)} type="button"><FiX /></button></div> : null}

      </section> : null}
    </div>
  );
}

function DreamEntryRow({ dream, isOwner, onCreate, onMenu, onSupport, progress }) {
  __useUiLanguage();
  if (!dream) {
    return (
      <button className="profile-dream-entry" onClick={onCreate} type="button">
        <span aria-hidden="true" className="dream-compact-add">+</span>
        <span><b>{__msg("profile.addADream")}</b><small>{__msg("profile.peopleCanHelpItHappen")}</small></span>
      </button>
    );
  }

  return (
    <div className={`dream-compact-row ${dream.status === "COMPLETED" ? "is-complete" : "is-active"}`}>
      <button aria-label={isOwner ? __msg("profile.editDream") : __msg("profile.openDream", { value0: dream.title })} className="dream-compact-content" disabled={!isOwner && dream.status !== "ACTIVE"} onClick={isOwner ? onCreate : onSupport} type="button">
        <span className="dream-compact-cover"><img alt="" src={dream.photo?.url ? resolveMediaUrl(dream.photo.url) : dreamFallbackCover(dream.title)} onError={event => { const fallback = dreamFallbackCover(dream.title); if (event.currentTarget.getAttribute("src") !== fallback) event.currentTarget.src = fallback; }} /></span>
        <span className="dream-compact-copy">
          <span className="dream-compact-title"><b dir="auto" title={dream.title}>{dream.title}</b><strong className={dream.status === "COMPLETED" ? "is-complete" : progress >= 75 ? "is-near-goal" : ""}>{dream.status === "COMPLETED" ? __msg("profile.cameTrue") : `${progress}%`}</strong></span>
          {dream.status === "COMPLETED" ? <small className="dream-compact-supporters">{__msg("profile.thanksTo")} {dream.supporterCount || 0} {__msg("profile.people")}</small> : <>
            <span aria-label={__msg("profile.dreamProgress")} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="dream-compact-progress" role="progressbar"><i style={{ width: `${progress}%` }}><span aria-hidden="true" className="dream-compact-shimmer" /></i></span>
            <span className="dream-compact-supporters"><span className="dream-compact-faces">{(dream.supporters || []).filter((person, index, all) => all.findIndex(other => other.username === person.username) === index).slice(0, 3).map(person => <FanAvatar key={person.username} name={person.name} size="h-[15px] w-[15px]" src={resolveMediaUrl(person.avatar)} />)}</span>{dream.supporterCount || 0} {__msg("profile.inThisStory")}</span>
          </>}
        </span>
      </button>
      {dream.status !== "COMPLETED" ? <button className="dream-compact-action" onClick={isOwner ? onCreate : onSupport} type="button">{isOwner ? __msg("profile.edit") : __msg("profile.help")} ›</button> : null}
      {isOwner ? <button aria-label={__msg("profile.openDreamMenu")} className="dream-compact-menu" onClick={onMenu} type="button"><FiMoreHorizontal /></button> : null}
    </div>
  );
}

export default function ProfileDream({ capabilities, profile, role }) {
  __useUiLanguage();
  const navigate = useNavigate();
  const creatorEnabled = Boolean(profile?.isCreator || role === "creator");
  const [picker, setPicker] = useState(Boolean(new URLSearchParams(window.location.search).get("dream")));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(undefined);
  const query = useQuery({
    queryKey: ["creator-dream", profile?.username],
    queryFn: () => dreamService.getCreatorDream(profile.username).then((response) => response.data.data),
    enabled: creatorEnabled && Boolean(profile?.username),
    retry: false,
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = event => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    const focusFrame = requestAnimationFrame(() => document.querySelector('.profile-dream-menu-sheet button')?.focus());
    return () => { cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [menuOpen]);

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

  if (!creatorEnabled || query.isLoading || query.isError) return null;

  const baseDream = query.data?.dream;
  const dream = baseDream;
  const gifts = query.data?.gifts || [];

  if (!dream && !capabilities.isOwner) return null;

  const progress = dreamProgress(dream);
  const update = () => {
    query.refetch();
    setPicker(false);
  };
  const status = async (action) => {
    if (!confirm(action === "complete" ? __msg("profile.markThisDreamAsCompleted") : __msg("profile.removeThisDream"))) return;
    try {
      await (action === "complete" ? dreamService.completeMine(dream.id, dream.version) : dreamService.removeMine(dream.id, dream.version));
      update();
    } catch {
      query.refetch();
    }
  };

  const shareDream = async () => {
    const url = window.location.href;
    const shareData = { title: dream?.title || __msg("profile.myDream"), text: dream?.reason || __msg("profile.seeThisDreamOnSeen"), url };
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
    <section className={`profile-dream-card profile-dream-compact ${dream ? "" : "is-empty"}`}>
      <div className="profile-dream-section-head">
        <h2>{__msg("profile.dream")}</h2>
        {dream?.cameTrueCount > 0 ? <span className="dream-came-true-count">{dream.cameTrueCount} {__msg("profile.cameTrue_43e660")}</span> : null}
      </div>
      <div className="profile-dream-panel">
        <DreamEntryRow dream={dream} isOwner={capabilities.isOwner} onCreate={() => navigate("/profile/dream")} onMenu={() => setMenuOpen(true)} onSupport={() => setPicker(true)} progress={progress} />
      </div>

      {picker ? <GiftPicker creatorName={profile?.displayName || profile?.username || "This creator"} dream={baseDream} gifts={gifts} onClose={() => setPicker(false)} /> : null}
      {menuOpen && dream ? createPortal(
        <div className="profile-dream-menu-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)} style={menuPosition}>
          <section aria-label={__msg("profile.dreamActions")} aria-modal="true" className="profile-dream-menu-sheet" role="dialog">
            <span className="profile-dream-menu-handle" />
            <button onClick={shareDream} type="button"><FiUpload /><span>{__msg("admin.share")}</span></button>
            <button onClick={() => { setMenuOpen(false); navigate("/profile/dream"); }} type="button"><FiEdit2 /><span>{__msg("profile.edit")}</span></button>
            {dream.status !== "COMPLETED" ? <button onClick={() => { setMenuOpen(false); status("complete"); }} type="button"><FiCheck className="is-success" /><span>{__msg("profile.markAsDone")}</span></button> : null}
            <button className="is-danger" onClick={() => { setMenuOpen(false); status("remove"); }} type="button"><FiTrash2 /><span>{__msg("posts.delete")}</span></button>
          </section>
        </div>, document.body
      ) : null}
    </section>
  );
}
