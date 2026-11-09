import "./WallNoteStory.css";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiDownload, FiTrash2, FiEye, FiEyeOff, FiFlag, FiGift, FiHeart, FiLink, FiMessageCircle, FiMoreHorizontal, FiPause, FiPlay, FiSend, FiSlash, FiUser, FiUsers, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useRecommendationTracking } from "../../hooks/useRecommendationTracking";
import { useStoryViewerPosition } from "../../hooks/useStoryViewerPosition";
import { useDeleteStory, useMarkStoryViewed, useReactToStory, useStoryInsights } from "../../hooks/useStories";
import { storyService } from "../../services/storyService";
import { messageService } from "../../services/messageService";
import { analyticsService } from "../../services/analyticsService";
import { canCreateStory, canDeleteStory, canReactToStory, canReplyToStory, canViewStoryInsights } from "../../utils/storyPermissions";
import StoryGiftPicker from "./StoryGiftPicker";
import StoryReshareCard from "./StoryReshareCard";
import StoryHighlightPicker from "./StoryHighlightPicker";
import StoryReactionTray from "./StoryReactionTray";
import ShareSheet from "../share/ShareSheet";
import SharedSeenStoryCard from "./SharedSeenStoryCard";
import { sharedSeenCardData } from "../../utils/sharedSeenStoryCard";
import { storyTextStyle } from "../../utils/storyPresentation";

const IMAGE_DURATION_MS = 5000;
const VIEW_THRESHOLD_MS = 1000;
const STORY_EXPORT_WIDTH = 1080;
const STORY_EXPORT_HEIGHT = 1920;

function formatStoryTimeAgo(value) {
  const created = new Date(value).getTime();
  if (!created) return __msg("stories.now");

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return __msg("stories.now");
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

function StoryHeartIcon({ active = false }) {
  __useUiLanguage();
  if (!active) return <FiHeart aria-hidden="true" />;
  return (
    <svg aria-hidden="true" className="discover-story-heart-lit" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="discover-story-heart-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#F2F8FF" />
          <stop offset="1" stopColor="#9CCBFF" />
        </linearGradient>
      </defs>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" fill="url(#discover-story-heart-gradient)" stroke="#BFE3FF" strokeLinejoin="round" strokeWidth="1.2" />
    </svg>
  );
}

function StoryMedia({ muted, onDurationChange, onEnded, onPlay, story, videoRef }) {
  __useUiLanguage();
  const transform = story.editorMetadata?.transform || {};
  const style = {
    transform: `translate(${transform.translateX || 0}%, ${transform.translateY || 0}%) scale(${transform.scale || 1}) rotate(${transform.rotation || 0}deg)`,
  };

  // Keep shared-card stories image-forward: use the uploaded background when
  // one exists, otherwise fall back to the source card image behind the live card.
  if (story.editorMetadata?.sharedCard) {
    if (story.editorMetadata.sharedCard.kind === "question_reply" || isTextOnlySharedCard(story.editorMetadata.sharedCard)) return <div className="story-viewer-shared-background" />;
    const backgroundMedia = story.mediaUrl || story.image || story.editorMetadata.sharedCard.backgroundUrl || story.editorMetadata.sharedCard.imageUrl || "";
    if (backgroundMedia) return <img alt="" className="h-full w-full object-cover" src={backgroundMedia} style={style} />;
    return <div className="story-viewer-shared-background" />;
  }

  if (story.mediaType === "video") {
    return (
      <video
        autoPlay
        className="h-full w-full object-cover"
        muted={muted}
        onDurationChange={(event) => onDurationChange(Math.min(event.currentTarget.duration || story.duration || 15, 15))}
        onEnded={onEnded}
        onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= Math.min(Number(story.duration) || 15, 15)) { event.currentTarget.pause(); onEnded(); } }}
        onPlay={onPlay}
        playsInline
        ref={videoRef}
        src={story.mediaUrl}
        style={style}
      />
    );
  }

  return <div className="story-viewer-photo-frame">
    <img alt="" aria-hidden="true" className="story-viewer-photo-blur" src={story.mediaUrl || story.image} />
    <img alt="" className="story-viewer-photo-fit" src={story.mediaUrl || story.image} style={style} />
  </div>;
}

function StoryOverlays({ canOpenQuestionAnswers = false, canReply = false, onQuestionStickerClick, questionAnswerCount = 0, story }) {
  __useUiLanguage();
  const metadata = story.editorMetadata || {};
  const questionSticker = metadata.questionSticker;
  const questionCount = Math.max(0, Number(questionAnswerCount) || 0);
  const questionCountLabel = questionCount === 1 ? __msg("stories.1AnswerAlready") : __msg("stories.value0AnswersAlready", { value0: questionCount });
  return (
    <>
      {(metadata.flattened ? [] : metadata.textOverlays || []).map((overlay) => {
        const plate = overlay.style === 2;
        const darkPlate = plate && overlay.color === "#0A0C0F";
        return (
          <span dir="auto"
            className={`absolute max-w-[82%] rounded-xl px-3 py-1.5 text-center text-white ${
              overlay.background === "pill" ? "rounded-full bg-black/45" : overlay.background === "solid" ? "bg-black/65" : overlay.background === "translucent" ? "bg-black/30" : ""
            }`}
            key={overlay.id || `${overlay.text}-${overlay.x}-${overlay.y}`}
            style={{
              backgroundColor: plate ? overlay.color || "#fff" : undefined,
              color: plate ? (darkPlate ? "#fff" : "#0A0C0F") : overlay.color || "#fff",
              fontFamily: overlay.style === 3 ? "Georgia, 'Times New Roman', serif" : overlay.style === 4 ? "Menlo, Consolas, monospace" : undefined,
              fontSize: `${(overlay.fontSize || 28) / 3.5}cqw`,
              fontStyle: overlay.style === 3 ? "italic" : undefined,
              fontWeight: overlay.fontWeight || (overlay.style === 1 || plate ? 800 : 650),
              left: `${overlay.x ?? 50}%`,
              letterSpacing: overlay.style === 4 ? ".5px" : undefined,
              textAlign: overlay.align || "center",
              textShadow: plate ? "none" : "0 2px 14px rgba(0,0,0,.55)",
              top: `${overlay.y ?? 50}%`,
              ...storyTextStyle(overlay),
              transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
            }}
          >
            {overlay.text}
          </span>
        );
      })}
{(metadata.mentions || []).map((mention) => <a aria-label={__msg("stories.view", { value0: mention.username })} className={`story-composer-mention ${mention.st === 1 ? "is-solid" : ""}`} href={`/profile/${encodeURIComponent(mention.username || "")}`} key={mention.userId} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} style={{ left: `${mention.x ?? 50}%`, top: `${mention.y ?? 50}%`, transform: `translate(-50%,-50%) scale(${mention.scale || 1}) rotate(${mention.rotation || 0}deg)` }}><span>@</span>{mention.username}</a>)}
      {(metadata.stickers || []).map((sticker) => (
        <span
          className="absolute rounded-2xl bg-black/25 px-3 py-1.5 text-2xl backdrop-blur"
          key={sticker.id}
          style={{
            left: `${sticker.x || 50}%`,
            top: `${sticker.y || 50}%`,
            transform: `translate(-50%, -50%) scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
          }}
        >
          {sticker.value}
        </span>
      ))}
      {questionSticker ? (
        <button
          aria-label={__msg("stories.answerQuestion", { value0: questionSticker.prompt || __msg("stories.askMeAnything") })}
          className="story-viewer-question-sticker"
          disabled={!canReply && !canOpenQuestionAnswers}
          onClick={(event) => {
            event.stopPropagation();
            onQuestionStickerClick?.(questionSticker);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
          style={{
            left: `${questionSticker.x || 50}%`,
            top: `${questionSticker.y || 63}%`,
            transform: `translate(-50%,-50%) scale(${questionSticker.scale || 1}) rotate(${questionSticker.rotation || 0}deg)`,
          }}
        >
          <b>{questionSticker.prompt || __msg("stories.askMeAnything")}</b>
          <span>{canOpenQuestionAnswers ? <>{questionCountLabel} · <em>{__msg("stories.open")}</em></> : __msg("stories.answersGoToYourInboxTapToReply")}</span>
        </button>
      ) : null}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 177.777">
        {(metadata.flattened ? [] : metadata.drawing || []).map((stroke) => (
          <polyline
            fill="none"
            key={stroke.id}
            points={(stroke.points || []).map((point) => `${point.x},${point.y}`).join(" ")}
            stroke={stroke.color || "#8AB8FF"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke.size || 1.4}
          />
        ))}
      </svg>
    </>
  );
}

function StoryThumb({ story }) {
  __useUiLanguage();
  const image = story?.thumbnailUrl || story?.mediaUrl || story?.image;
  return (
    <span className="story-owner-sheet-thumb">
      {image ? <img alt="" src={image} /> : <span aria-hidden="true">{story?.caption?.slice(0, 1) || "@"}</span>}
    </span>
  );
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error(__msg("stories.imageSourceIsRequired")));
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(__msg("stories.storyImageCouldNotBeLoaded")));
    image.src = src;
  });
}

async function loadExportImage(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(__msg("stories.imageFetchFailed"));
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      return await loadImageElement(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return loadImageElement(src);
  }
}

function roundRect(context, x, y, width, height, radius) {
  const nextRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.arcTo(x + width, y, x + width, y + height, nextRadius);
  context.arcTo(x + width, y + height, x, y + height, nextRadius);
  context.arcTo(x, y + height, x, y, nextRadius);
  context.arcTo(x, y, x + width, y, nextRadius);
  context.closePath();
}

function finiteCardPosition(value, fallback, min, max) {
  const number = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
}

function isTextOnlySharedCard(card = {}) {
  return card.kind === "voice_note" || card.displayMode === "text_only";
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth || !line) {
      line = next;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => {
    const value = index === maxLines - 1 && lines.length > maxLines ? `${item.replace(/\s+\S*$/, "")}...` : item;
    context.fillText(value, x, y + index * lineHeight, maxWidth);
  });
}

function drawCoverMedia(context, source, width, height, transform = {}, offsetX = 0, offsetY = 0) {
  const sourceWidth = source.videoWidth || source.naturalWidth || width;
  const sourceHeight = source.videoHeight || source.naturalHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const translateX = (Number(transform.translateX) || 0) / 100 * width;
  const translateY = (Number(transform.translateY) || 0) / 100 * height;
  const storyScale = Number(transform.scale) || 1;
  const rotation = ((Number(transform.rotation) || 0) * Math.PI) / 180;

  context.save();
  context.translate(offsetX + width / 2 + translateX, offsetY + height / 2 + translateY);
  context.rotate(rotation);
  context.scale(storyScale, storyScale);
  context.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

function canvasToJpegBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(__msg("stories.couldNotPrepareThisStory")));
    }, "image/jpeg", 0.92);
  });
}

async function drawStoryBackground(context, story, video) {
  const metadata = story.editorMetadata || {};
  const transform = metadata.transform || {};
  const background = story.mediaUrl || story.image || metadata.sharedCard?.backgroundUrl || "";

  context.fillStyle = "#0a0c0f";
  context.fillRect(0, 0, STORY_EXPORT_WIDTH, STORY_EXPORT_HEIGHT);

  if (story.mediaType === "video" && video?.videoWidth) {
    drawCoverMedia(context, video, STORY_EXPORT_WIDTH, STORY_EXPORT_HEIGHT, transform);
    return;
  }

  if (background) {
    const image = await loadExportImage(background);
    drawCoverMedia(context, image, STORY_EXPORT_WIDTH, STORY_EXPORT_HEIGHT, transform);
  }
}

async function drawSharedStoryCard(context, story) {
  const sharedCard = story.editorMetadata?.sharedCard;
  if (!sharedCard) return;

  const isQuestionReply = sharedCard.kind === "question_reply";
  const isTextOnly = isTextOnlySharedCard(sharedCard);
  const originalTranscript = String(sharedCard.originalTranscript || sharedCard.title || "").trim();
  const translationText = String(sharedCard.translationText || "").trim();
  const translationLabel = String(sharedCard.translationLabel || __msg("stories.translation")).trim();
  const card = (story.sourceType === "seen" || sharedCard.kind === "seen")
    ? sharedSeenCardData(story.sourceSeen || {}, sharedCard)
    : {
      cardBackgroundColor: sharedCard.cardBackgroundColor || "",
      cardTextColor: sharedCard.cardTextColor || "",
      excerpt: sharedCard.excerpt || "",
      imageUrl: sharedCard.imageUrl || "",
      mediaType: sharedCard.mediaType || "image",
      points: sharedCard.points || [],
      subtitle: sharedCard.subtitle || __msg("stories.tapToOpen"),
      title: sharedCard.title || __msg("share.sharedOnSeen"),
      variant: sharedCard.variant || "compact",
    };
  const isLong = card.variant === "long";
  const cardWidth = isQuestionReply ? 700 : isLong ? 720 : 650;
  const cardHeight = isQuestionReply ? 430 : isTextOnly ? (translationText ? 500 : 360) : isLong ? 650 : 470;
  const cardX = (finiteCardPosition(sharedCard.x, 50, 16, 84) / 100) * STORY_EXPORT_WIDTH - cardWidth / 2;
  const cardY = (finiteCardPosition(sharedCard.y, 50, 18, 82) / 100) * STORY_EXPORT_HEIGHT - cardHeight / 2;
  const cardBackground = card.cardBackgroundColor || (isQuestionReply ? "rgba(17,22,31,.94)" : "#0d1015");
  const cardText = card.cardTextColor || "#ffffff";
  const copyHeight = isLong ? 300 : 150;
  const mediaHeight = cardHeight - copyHeight;

  context.save();
  context.shadowColor = "rgba(0,0,0,.42)";
  context.shadowBlur = 44;
  context.shadowOffsetY = 18;
  context.fillStyle = cardBackground;
  roundRect(context, cardX, cardY, cardWidth, cardHeight, 44);
  context.fill();
  context.restore();

  if (isQuestionReply) {
    context.fillStyle = "#9CCBFF";
    context.font = "800 27px system-ui";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(String(sharedCard.eyebrow || __msg("fan.answeredYourQuestion")).slice(0, 42), cardX + 42, cardY + 40, cardWidth - 84);
    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "650 29px system-ui";
    drawWrappedText(context, String(sharedCard.subtitle || __msg("fanWeb.question")).slice(0, 90), cardX + 42, cardY + 92, cardWidth - 84, 38, 2);
    context.fillStyle = "#fff";
    context.font = "850 45px system-ui";
    drawWrappedText(context, String(sharedCard.title || "").slice(0, 180), cardX + 42, cardY + 190, cardWidth - 84, 58, 3);
  } else if (isTextOnly) {
    context.fillStyle = "#9CCBFF";
    context.font = "800 27px system-ui";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(String(sharedCard.eyebrow || __msg("social.note_2c924e")).slice(0, 42), cardX + 42, cardY + 42, cardWidth - 84);
    context.fillStyle = cardText;
    context.font = "850 40px system-ui";
    drawWrappedText(context, originalTranscript.slice(0, 190), cardX + 42, cardY + 96, cardWidth - 84, 54, translationText ? 2 : 3);
    if (translationText) {
      context.fillStyle = "rgba(255,255,255,.45)";
      context.font = "800 22px system-ui";
      context.fillText((translationLabel ? __msg("stories.translatedTo", { value0: translationLabel }) : __msg("stories.translation")).slice(0, 46), cardX + 42, cardY + 236, cardWidth - 84);
      context.fillStyle = cardText;
      context.font = "750 34px system-ui";
      drawWrappedText(context, translationText.slice(0, 150), cardX + 42, cardY + 276, cardWidth - 84, 46, 2);
    }
    context.fillStyle = card.cardTextColor ? cardText : "rgba(156,203,255,.9)";
    context.font = "650 23px system-ui";
    context.fillText(String(card.subtitle || __msg("fanWeb.fromMyWallTap")).slice(0, 64), cardX + 42, cardY + cardHeight - 72, cardWidth - 84);
  } else {
    context.save();
    roundRect(context, cardX, cardY, cardWidth, cardHeight, 44);
    context.clip();
    if (card.imageUrl) {
      try {
        const image = await loadExportImage(card.imageUrl);
        context.save();
        context.beginPath();
        context.rect(cardX, cardY, cardWidth, mediaHeight);
        context.clip();
        drawCoverMedia(context, image, cardWidth, mediaHeight, {}, cardX, cardY);
        context.restore();
      } catch {
        context.fillStyle = "#18202b";
        context.fillRect(cardX, cardY, cardWidth, mediaHeight);
      }
    } else {
      context.fillStyle = "#18202b";
      context.fillRect(cardX, cardY, cardWidth, mediaHeight);
    }
    context.restore();

    context.fillStyle = cardBackground;
    context.fillRect(cardX, cardY + mediaHeight, cardWidth, copyHeight);
    context.fillStyle = cardText;
    context.font = "800 34px system-ui";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(String(card.title || "Seen").slice(0, 52), cardX + 34, cardY + mediaHeight + 30, cardWidth - 68);
    context.fillStyle = card.cardTextColor ? cardText : "rgba(255,255,255,.62)";
    context.font = "600 23px system-ui";
    const subtitleY = isLong ? cardY + mediaHeight + 230 : cardY + mediaHeight + 85;
    if (isLong && card.excerpt) {
      drawWrappedText(context, String(card.excerpt).slice(0, 160), cardX + 34, cardY + mediaHeight + 84, cardWidth - 68, 33, 3);
    }
    context.fillText(String(card.subtitle || __msg("stories.tapToOpen")).slice(0, 64), cardX + 34, subtitleY, cardWidth - 68);
  }

  context.strokeStyle = "rgba(255,255,255,.18)";
  context.lineWidth = 3;
  roundRect(context, cardX, cardY, cardWidth, cardHeight, 44);
  context.stroke();
}

function drawStoryQuestionSticker(context, questionSticker = {}, questionAnswerCount = 0) {
  if (!questionSticker) return;
  const x = (Number(questionSticker.x) || 50) / 100 * STORY_EXPORT_WIDTH;
  const y = (Number(questionSticker.y) || 63) / 100 * STORY_EXPORT_HEIGHT;
  const prompt = String(questionSticker.prompt || __msg("stories.askMeAnything")).slice(0, 80);
  const answerLabel = Number(questionAnswerCount) === 1 ? "1 answer already - open >" : `${Math.max(0, Number(questionAnswerCount) || 0)} answers already - open >`;
  const boxWidth = Math.min(460, Math.max(300, prompt.length * 14));
  const boxHeight = 120;

  context.save();
  context.shadowColor = "rgba(0,0,0,.38)";
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  context.fillStyle = "rgba(10,13,18,.72)";
  roundRect(context, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 28);
  context.fill();
  context.restore();
  context.strokeStyle = "rgba(156,203,255,.45)";
  context.lineWidth = 2;
  roundRect(context, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 28);
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#D6EAFF";
  context.font = "800 30px system-ui";
  context.fillText(prompt, x, y - 18, boxWidth - 44);
  context.fillStyle = "rgba(255,255,255,.42)";
  context.font = "650 18px system-ui";
  context.fillText(answerLabel, x, y + 26, boxWidth - 44);
}

function drawStoryOverlaysToCanvas(context, story) {
  const metadata = story.editorMetadata || {};
  drawStoryQuestionSticker(context, metadata.questionSticker, story.questionReplyCount);

  (metadata.flattened ? [] : metadata.textOverlays || []).forEach((overlay) => {
    const text = String(overlay.text || "").trim();
    if (!text) return;
    const x = (Number(overlay.x) || 50) / 100 * STORY_EXPORT_WIDTH;
    const y = (Number(overlay.y) || 50) / 100 * STORY_EXPORT_HEIGHT;
    const fontSize = (Number(overlay.fontSize) || 28) * 3;
    const plate = overlay.style === 2;
    const darkPlate = plate && overlay.color === "#0A0C0F";
    context.save();
    context.textAlign = overlay.align || "center";
    context.textBaseline = "middle";
    context.font = `${overlay.style === 3 ? "italic " : ""}${overlay.fontWeight || (overlay.style === 1 || plate ? 800 : 650)} ${fontSize}px ${overlay.style === 3 ? __msg("stories.georgia") : overlay.style === 4 ? __msg("stories.consolas") : "system-ui"}`;
    if (plate) {
      const width = Math.min(STORY_EXPORT_WIDTH * 0.82, context.measureText(text).width + 96);
      context.fillStyle = overlay.color || "#fff";
      roundRect(context, x - width / 2, y - fontSize * 0.78, width, fontSize * 1.56, 36);
      context.fill();
      context.fillStyle = darkPlate ? "#fff" : "#0A0C0F";
    } else {
      context.shadowColor = "rgba(0,0,0,.55)";
      context.shadowBlur = 24;
      context.fillStyle = overlay.color || "#fff";
    }
    context.fillText(text, x, y, STORY_EXPORT_WIDTH * 0.82);
    context.restore();
  });

  (metadata.stickers || []).forEach((sticker) => {
    const x = (Number(sticker.x) || 50) / 100 * STORY_EXPORT_WIDTH;
    const y = (Number(sticker.y) || 50) / 100 * STORY_EXPORT_HEIGHT;
    context.save();
    context.translate(x, y);
    context.rotate(((Number(sticker.rotation) || 0) * Math.PI) / 180);
    context.scale(Number(sticker.scale) || 1, Number(sticker.scale) || 1);
    context.font = "88px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(sticker.value || ""), 0, 0);
    context.restore();
  });

  (metadata.flattened ? [] : metadata.drawing || []).forEach((stroke) => {
    const points = stroke.points || [];
    if (points.length < 2) return;
    context.save();
    context.strokeStyle = stroke.color || "#8AB8FF";
    context.lineWidth = (Number(stroke.size) || 1.4) * 10;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    points.forEach((point, index) => {
      const x = (Number(point.x) || 0) / 100 * STORY_EXPORT_WIDTH;
      const y = (Number(point.y) || 0) / 177.777 * STORY_EXPORT_HEIGHT;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.restore();
  });
}

async function renderStoryDownloadBlob(story, video) {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_EXPORT_WIDTH;
  canvas.height = STORY_EXPORT_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  await drawStoryBackground(context, story, video);
  await drawSharedStoryCard(context, story);
  drawStoryOverlaysToCanvas(context, story);
  return canvasToJpegBlob(canvas);
}

function normalizeInsightViewers(insights) {
  return (insights?.viewers || []).map((viewer) => ({
    id: viewer.id || viewer._id || viewer.username,
    name: viewer.name || viewer.displayName || viewer.username || __msg("stories.viewer_dbad9f"),
    username: viewer.username || "",
    avatar: viewer.avatar || viewer.avatarUrl || "",
    reaction: viewer.reaction || "",
    viewedAt: viewer.viewedAt || viewer.createdAt || "",
    verified: Boolean(viewer.verified || viewer.isVerified),
    question: viewer.question || viewer.answer || "",
    hasQuestionReply: Boolean(viewer.hasQuestionReply || viewer.askedQuestion || viewer.question || viewer.answer),
  })).filter((viewer) => viewer.id || viewer.username);
}

function compactCount(value) {
  return new Intl.NumberFormat(__uiLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function OwnStoryBottomBar({ count, onHighlight, onMore, onOpenViewers, onShare, story, viewers }) {
  __useUiLanguage();
  return (
    <div className="story-owner-bottom-bar">
      <button className="story-owner-viewers-button" onClick={onOpenViewers} type="button">
        <span className="story-owner-viewers-avatars" aria-hidden="true">
          {viewers.slice(0, 3).map((viewer) => (
            <FanAvatar key={viewer.id || viewer.username} name={viewer.name} size="h-[26px] w-[26px]" src={viewer.avatar} />
          ))}
          {!viewers.length ? <StoryThumb story={story} /> : null}
        </span>
        <b>{compactCount(count)}</b>
      </button>
      <span className="story-owner-bottom-actions">
        <button onClick={onHighlight} type="button">
          <span aria-hidden="true" style={{ height: 24, display: "flex", alignItems: "center" }}>
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 16.5s-4-2.4-4-5.2A2.2 2.2 0 0 1 12 10a2.2 2.2 0 0 1 4 1.3c0 2.8-4 5.2-4 5.2z" />
            </svg>
          </span>
          <small>{__msg("stories.highlight")}</small>
        </button>
        <button onClick={onShare} type="button"><FiSend /><small>{__msg("fanWeb.send")}</small></button>
        <button onClick={onMore} type="button"><FiMoreHorizontal /><small>{__msg("discover.more")}</small></button>
      </span>
    </div>
  );
}

function OwnStoryViewersSheet({ insightsOpen, layerStyle, onActionMenu, onClose, onMessageViewer, onOpenProfile, story }) {
  __useUiLanguage();
  const [tab, setTab] = useState("people");
  const insightsQuery = useStoryInsights(story?.id, { enabled: insightsOpen && Boolean(story?.id) });
  const insights = insightsQuery.data || {};
  const viewers = normalizeInsightViewers(insights);
  const totalViews = Number(insights.totalViews ?? story?.viewCount ?? viewers.length ?? 0);
  const reactions = Number(insights.reactionTotal ?? insights.reactions?.reduce((sum, item) => sum + (Number(item.count) || 0), 0) ?? story?.reactionCount ?? 0);
  const replies = Number(insights.replies ?? story?.replyCount ?? 0);
  const answers = Number(insights.questionReplies ?? story?.questionReplyCount ?? 0);
  const followerPercent = Math.max(0, Math.min(100, Number(insights.followerPercent ?? 72)));

  if (!insightsOpen) return null;

  return createPortal((
    <div className="story-owner-viewers-layer" onClick={onClose} style={layerStyle}>
      <section aria-label={__msg("stories.storyViewers")} aria-modal="true" className="story-owner-viewers-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label={__msg("stories.returnToStory")} className="story-owner-viewers-grab" onClick={onClose} type="button" />
        <header className="story-owner-viewers-head">
          <StoryThumb story={story} />
          <span>
            <b>{__msg("stories.yourStory")}</b>
            <small>{__msg("stories.burnsIn24hTapToReturn")}</small>
          </span>
        </header>
        <div className="story-owner-viewers-tabs">
          <button className={tab === "stats" ? "is-active" : ""} onClick={() => setTab("stats")} type="button"><FiBarChart2 /></button>
          <button className={tab === "people" ? "is-active" : ""} onClick={() => setTab("people")} type="button"><FiUsers /><b>{compactCount(totalViews)}</b></button>
        </div>
        {insightsQuery.isLoading ? <p className="story-owner-viewers-empty">{__msg("stories.loadingViewers")}</p> : null}
        {insightsQuery.isError ? <p className="story-owner-viewers-empty">{__msg("stories.viewerDetailsAreUnavailableRightNow")}</p> : null}
        {!insightsQuery.isLoading && !insightsQuery.isError && tab === "people" ? (
          <div className="story-owner-viewers-list">
            <h3>{__msg("stories.whoSawThis")}</h3>
            {viewers.length ? viewers.map((viewer) => (
              <article className="story-owner-viewer-row" key={viewer.id || viewer.username}>
                <button className="story-owner-viewer-main" onClick={() => onOpenProfile(viewer)} type="button">
                  <span className="story-owner-viewer-avatar">
                    <FanAvatar name={viewer.name} size="h-[38px] w-[38px]" src={viewer.avatar} />
                    {viewer.reaction ? <i>{viewer.reaction}</i> : <i className="is-eye"><FiEye /></i>}
                  </span>
                  <span>
                    <b>{viewer.name.split(" ")[0] || viewer.username}</b>
                    <small>{viewer.hasQuestionReply ? <em>{__msg("stories.askedAQuestion")}</em> : __msg("stories.ago", { value0: formatStoryTimeAgo(viewer.viewedAt) })}</small>
                  </span>
                </button>
                <button aria-label={__msg("discover.actionsFor", { value0: viewer.name })} onClick={() => onActionMenu(viewer)} type="button"><FiMoreHorizontal /></button>
                <button aria-label={__msg("profile.message", { value0: viewer.name })} onClick={() => onMessageViewer(viewer)} type="button"><FiMessageCircle /></button>
              </article>
            )) : <p className="story-owner-viewers-empty">{__msg("stories.noViewerListIsAvailableYet")}</p>}
          </div>
        ) : null}
        {!insightsQuery.isLoading && !insightsQuery.isError && tab === "stats" ? (
          <div className="story-owner-stats-list">
            <h3>{__msg("stories.overview")}</h3>
            <p><span>{__msg("fanWeb.views_24be61")}</span><b>{compactCount(totalViews)}</b></p>
            <p><span>{__msg("fanWeb.reactions")}</span><b>{compactCount(reactions)}</b></p>
            <p><span>{__msg("fanWeb.replies")}</span><b>{compactCount(replies)}</b></p>
            {answers ? <p><span>{__msg("stories.answers")}</span><b>{compactCount(answers)}</b></p> : null}
            <div className="story-owner-audience-bar" style={{ "--story-owner-followers": `${followerPercent}%` }}>
              <span><i />{__msg("stories.followers")} <b>{followerPercent}%</b></span>
              <span><i />{__msg("stories.newPeople")} <b>{100 - followerPercent}%</b></span>
              <em><i /></em>
            </div>
            <small className="story-owner-private-note">{__msg("stories.onlyYouSeeThis")}</small>
          </div>
        ) : null}
      </section>
    </div>
  ), document.body);
}

function StoryViewerActionsSheet({ layerStyle, onBlock, onClose, onHide, onMessage, onProfile, viewer }) {
  __useUiLanguage();
  if (!viewer) return null;
  const firstName = viewer.name?.split(" ")[0] || viewer.username || __msg("stories.viewer_dbad9f");
  return createPortal((
    <div className="story-owner-viewer-actions-layer" onClick={onClose} style={layerStyle}>
      <section aria-label={__msg("profile.actions", { value0: firstName })} aria-modal="true" className="story-owner-viewer-actions-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span className="story-owner-actions-handle" />
        <header>
          <FanAvatar name={viewer.name} size="h-8 w-8" src={viewer.avatar} />
          <b>{firstName}</b>
        </header>
        <button onClick={onProfile} type="button"><FiUser /> {__msg("onboarding.viewProfile")}</button>
        <button onClick={onMessage} type="button"><FiMessageCircle /> {__msg("stories.sendMessage")}</button>
        <button onClick={onHide} type="button"><FiEyeOff /> {__msg("stories.hideYourStories")}</button>
        <button className="is-danger" onClick={onBlock} type="button"><FiSlash /> {__msg("profile.block")}</button>
        <button className="is-cancel" onClick={onClose} type="button">{__msg("admin.cancel")}</button>
      </section>
    </div>
  ), document.body);
}

function StoryViewer({ highlightTitle, showHighlightViews = false, externalPaused = false, discover = false, initialIndex = 0, isOpen, onClose, onComplete, onMore, onNextCreator, onPreviousComplete, onPreviousCreator, presentation = "modal", previewOnly = false, stories = [] }) {
  __useUiLanguage();
  const viewerPosition = useStoryViewerPosition(isOpen);
  const { user } = useAuth();
  const { showToast, showGiftSequence } = useFanToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const replyInputRef = useRef(null);
  const reactionHoldRef = useRef(null);
  const navigationTimer = useRef(null);
  useEffect(() => () => { window.clearTimeout(navigationTimer.current); window.clearTimeout(reactionHoldRef.current); }, []);
  const storySwipe = useRef(null);
  const suppressStoryClick = useRef(false);
  const reactionHold = useRef(null);
  const reactionToastTimer = useRef(null);
  const suppressReactionClick = useRef(false);
  const videoRef = useRef(null);
  const viewedRef = useRef(new Set());
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(IMAGE_DURATION_MS);
  const [manualPaused, setManualPaused] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [systemPaused, setSystemPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [storyMenuToast, setStoryMenuToast] = useState(null);
  const showStoryMenuToast = (message) => setStoryMenuToast({ message });
  useEffect(() => {
    if (!storyMenuToast) return undefined;
    const timer = window.setTimeout(() => setStoryMenuToast(null), 1600);
    return () => window.clearTimeout(timer);
  }, [storyMenuToast]);
  const [confirmStoryDelete, setConfirmStoryDelete] = useState(false);
  useEffect(() => {
    if (!ownerMenuOpen) return undefined;
    const previous = document.activeElement;
    const sheet = document.querySelector(confirmStoryDelete ? ".story-delete-confirm" : ".story-owner-prototype-menu .story-owner-actions-sheet");
    sheet?.querySelector("button:not(:disabled)")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation();
        if (confirmStoryDelete) setConfirmStoryDelete(false);
        else setOwnerMenuOpen(false);
      }
      if (event.key === "Tab") {
        const buttons = sheet?.querySelectorAll("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => { window.removeEventListener("keydown", handleKey, true); previous?.focus?.(); };
  }, [confirmStoryDelete, ownerMenuOpen]);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [activeQuestionPrompt, setActiveQuestionPrompt] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [reactionTrayOpen, setReactionTrayOpen] = useState(false);
  const [reactionAnimation, setReactionAnimation] = useState(0);
  const [reactionToast, setReactionToast] = useState("");
  const [reactionToastKey, setReactionToastKey] = useState(0);
  const [selectedReaction, setSelectedReaction] = useState("");
  const [heartBurstKey, setHeartBurstKey] = useState(0);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const [selectedViewer, setSelectedViewer] = useState(null);
  const [menuBusy, setMenuBusy] = useState("");
  const markViewedMutation = useMarkStoryViewed();
  const markStoryViewed = markViewedMutation.mutate;
  const deleteMutation = useDeleteStory();
  const reactMutation = useReactToStory();
  const reactionMutation = reactMutation;
  const paused = externalPaused || manualPaused || holdPaused || systemPaused || ownerMenuOpen || insightsOpen || Boolean(selectedViewer) || giftOpen || shareOpen || highlightOpen || reactionTrayOpen;

  const activeStory = stories[index] || null;
  const storyTopics = useMemo(() => [activeStory?.sourceSeen?.category, activeStory?.sourceSeen?.title].filter(Boolean), [activeStory?.sourceSeen?.category, activeStory?.sourceSeen?.title]);
  const storyTrackingRef = useRecommendationTracking({ creatorId: activeStory?.owner?.id || activeStory?.creatorId || "", enabled: isOpen && !previewOnly, entityId: activeStory?.id || "", entityType: "story", position: index, topics: storyTopics });
  const sharedCard = activeStory?.editorMetadata?.sharedCard || null;
  const canReply = !previewOnly && canReplyToStory(user, activeStory);
  const canReact = !previewOnly && canReactToStory(user, activeStory);
  const canDelete = !previewOnly && canDeleteStory(user, activeStory);
  const canViewInsights = !previewOnly && canViewStoryInsights(user, activeStory);
  const canOpenQuestionAnswers = canViewInsights && Boolean(activeStory?.editorMetadata?.questionSticker);
  const canAdd = !previewOnly && canCreateStory(user);
  const canUseViewerMenu = Boolean(activeStory && !canDelete && !previewOnly);
  const hasStoryMenu = Boolean(onMore) || canDelete || canViewInsights || canAdd || canUseViewerMenu;
  const hasStoryAudio = activeStory?.mediaType === "video" && activeStory?.hasAudio !== false;
  const ownInsightsQuery = useStoryInsights(activeStory?.id, { enabled: isOpen && canViewInsights && Boolean(activeStory?.id) });
  const ownInsights = ownInsightsQuery.data || {};
  const ownViewers = normalizeInsightViewers(ownInsights);
  const ownViewCount = Number(ownInsights.totalViews ?? activeStory?.viewCount ?? activeStory?.views ?? ownViewers.length ?? 0);

  const replyMutation = useMutation({
    mutationFn: ({ body, storyId }) => storyService.replyToStory(storyId, body),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast(__msg("stories.replySentToMessages"));
      onClose();
    },
    onError: (error) => showToast(error?.response?.data?.message || __msg("stories.storyReplyCouldNotBeSent")),
  });
  const boundedIndex = useMemo(() => Math.max(0, Math.min(stories.length - 1, initialIndex)), [initialIndex, stories.length]);

  useEffect(() => {
    if (isOpen) {
      setIndex(boundedIndex);
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
      setReplyText("");
      setActiveQuestionPrompt("");
      setGiftOpen(false);
      setShareOpen(false);
      setHighlightOpen(false);
      setReactionTrayOpen(false);
      setSelectedReaction("");
      setHeartBurstKey(0);
      setFloatingReaction(null);
      setSelectedViewer(null);
      setMenuBusy("");
    }
  }, [boundedIndex, isOpen]);

  const goStory = useCallback((direction) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) {
        onPreviousComplete?.();
        return 0;
      }
      if (next >= stories.length) {
        (onComplete || onClose)();
        return current;
      }
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
      setReplyText("");
      setActiveQuestionPrompt("");
      setGiftOpen(false);
      setShareOpen(false);
      setSelectedViewer(null);
      setMenuBusy("");
      return next;
    });
  }, [onClose, onComplete, onPreviousComplete, stories.length]);

  useEffect(() => {
    if (!isOpen || !activeStory || previewOnly) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (!viewedRef.current.has(activeStory.id)) {
        viewedRef.current.add(activeStory.id);
        markStoryViewed(activeStory.id);
      }
    }, VIEW_THRESHOLD_MS);

    return () => window.clearTimeout(timer);
  }, [activeStory, isOpen, markStoryViewed, previewOnly]);

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    setSelectedReaction(activeStory.viewerReaction || "");
    setProgress(0);
    setDurationMs(activeStory.mediaType === "video" ? Math.min(Number(activeStory.duration) || 15, 15) * 1000 : IMAGE_DURATION_MS);
    return undefined;
  }, [activeStory]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (highlightOpen || externalPaused) return;
      if (event.key === "Escape") onClose();
      if (event.target?.closest?.("input,textarea,[contenteditable=true]")) return;
      if (event.key === "ArrowRight") goStory(1);
      if (event.key === "ArrowLeft") goStory(-1);
    };
    const pause = () => setSystemPaused(true);
    const resume = () => setSystemPaused(false);
    const onVisibility = () => setSystemPaused(document.hidden);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [externalPaused, goStory, highlightOpen, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !activeStory || paused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 100 / (durationMs / 100));
        if (next >= 100 && activeStory.mediaType !== "video") {
          window.setTimeout(() => goStory(1), 0);
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [activeStory, durationMs, goStory, isOpen, paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [activeStory, paused]);

  const deleteStory = () => {
    if (!activeStory || !canDelete || deleteMutation.isPending) {
      showToast(__msg("stories.youDoNotHavePermissionToDeleteThisStory"));
      return;
    }

    deleteMutation.mutate(activeStory.id, {
      onSuccess: () => {
        showToast(__msg("stories.storyDeleted"));
        onClose();
      },
      onError: (error) => {
        const status = error?.response?.status;
        showToast(status === 403 ? __msg("stories.youDoNotHavePermissionToDeleteThisStory") : __msg("system.copy.baebaa5af8c7"));
      },
    });
  };

  const submitReply = (event) => {
    event.preventDefault();
    const body = replyText.trim();
    if (!activeStory || !canReply || replyMutation.isPending) return;
    if (!body) {
      setShareOpen(true);
      return;
    }
    replyMutation.mutate({ body, storyId: activeStory.id });
  };

  const answerQuestionSticker = (questionSticker) => {
    if (canOpenQuestionAnswers) {
      onClose();
      navigate("/messages?filter=story");
      return;
    }
    if (!canReply) return;
    setActiveQuestionPrompt(questionSticker?.prompt || __msg("stories.askMeAnything"));
    setSystemPaused(true);
    window.setTimeout(() => replyInputRef.current?.focus(), 0);
  };


  const reactToActiveStory = (reaction, sourceElement) => {
    if (!activeStory || activeStory.allowReactions === false || reactionMutation.isPending) return;
    const nextReaction = reaction || null;
    if (nextReaction) {
      setReactionAnimation((value) => value + 1);
      window.clearTimeout(reactionToastTimer.current);
      setReactionToastKey((value) => value + 1);
      setReactionToast(__msg("stories.sentToValue0", { value0: replyName }));
      reactionToastTimer.current = window.setTimeout(() => setReactionToast(""), 1600);
    }
    reactionMutation.mutate({ storyId: activeStory.id, reaction: nextReaction });
    setReactionTrayOpen(false);
    if (sourceElement && document.activeElement === replyInputRef.current) replyInputRef.current.blur();
  };

  const openGiftPicker = () => {
    if (!activeStory?.owner?.id && !activeStory?.ownerId) {
      showToast(__msg("stories.thisCreatorCannotReceiveDirectGiftsRightNow"));
      return;
    }
    setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
    setGiftOpen(true);
  };

  const copyStoryLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/stories/${activeStory.id}`);
      setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
      showStoryMenuToast(__msg("profile.linkCopied"));
    } catch {
      showStoryMenuToast(__msg("stories.storyLinkCouldNotBeCopied"));
    }
  };

  const saveStoryMedia = async () => {
    if (!activeStory || menuBusy) return;
    setMenuBusy("save");
    try {
      const blob = await renderStoryDownloadBlob(activeStory, videoRef.current);
      const blobUrl = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = blobUrl;
      download.download = `story-${activeStory.id}.jpg`;
      document.body.appendChild(download);
      download.click();
      download.remove();
      URL.revokeObjectURL(blobUrl);
      setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
      showToast(__msg("contentEntities.saved"));
    } catch {
      showToast(__msg("stories.storyCouldNotBeSaved"));
    } finally {
      setMenuBusy("");
    }
  };

  const sendStory = () => {
    setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
    setShareOpen(true);
  };

  const reactToStory = (reaction = "❤️") => {
    if (!activeStory || activeStory.allowReactions === false || previewOnly || reactMutation.isPending) return;
    setSelectedReaction(reaction);
    if (reaction) setHeartBurstKey((current) => current + 1);
    const floatingId = Date.now();
    setFloatingReaction(reaction && reaction !== "❤️" ? { id: floatingId, value: reaction } : null);
    window.setTimeout(() => setFloatingReaction((current) => current?.id === floatingId ? null : current), 900);
    reactMutation.mutate({ storyId: activeStory.id, reaction }, {
      onSuccess: () => { setReactionTrayOpen(false); queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] }); },
      onError: (error) => {
        setSelectedReaction(activeStory.viewerReaction || "");
        showToast(error?.response?.data?.message || __msg("system.copy.5e209eb47a67"));
      },
    });
  };
  const startReactionHold = () => {
    window.clearTimeout(reactionHoldRef.current);
    suppressReactionClick.current = false;
    reactionHoldRef.current = window.setTimeout(() => { suppressReactionClick.current = true; setReactionTrayOpen(true); }, 420);
  };
  const cancelReactionHold = () => window.clearTimeout(reactionHoldRef.current);

  const openViewerProfile = (viewer = selectedViewer) => {
    const profileKey = viewer?.username || viewer?.id;
    if (!profileKey) return;
    setSelectedViewer(null);
    setInsightsOpen(false);
    onClose();
    navigate(`/profile/${encodeURIComponent(profileKey)}`);
  };

  const messageViewer = (viewer = selectedViewer) => {
    const viewerId = viewer?.id;
    if (!viewerId) return;
    setSelectedViewer(null);
    setInsightsOpen(false);
    onClose();
    navigate(`/messages?with=${encodeURIComponent(viewerId)}`);
  };

  const hideViewerStories = async () => {
    if (!selectedViewer?.id || menuBusy) return;
    setMenuBusy("viewer-hide");
    try {
      await storyService.hideCreatorStoriesById(selectedViewer.id);
      await queryClient.invalidateQueries({ queryKey: ["settings", "muted-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast(__msg("stories.storiesFromAreNowHidden", { value0: selectedViewer.name }));
      setSelectedViewer(null);
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("stories.couldNotHideThisViewerSStories"));
    } finally {
      setMenuBusy("");
    }
  };

  const blockViewer = async () => {
    if (!selectedViewer?.id || menuBusy) return;
    setMenuBusy("viewer-block");
    try {
      await messageService.block(selectedViewer.id);
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast(__msg("stories.isBlocked", { value0: selectedViewer.name }));
      setSelectedViewer(null);
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("system.copy.0c32caad6640"));
    } finally {
      setMenuBusy("");
    }
  };

  const hideOwnerStories = async () => {
    if (!activeStory?.id || menuBusy) return;
    setMenuBusy("hide");
    try {
      await storyService.hideCreatorStories(activeStory.id);
      await queryClient.invalidateQueries({ queryKey: ["settings", "muted-accounts"] });
      void analyticsService.trackRecommendationSignal({ creatorId: activeStory.owner?.id || activeStory.creatorId || "", entityId: activeStory.id, entityType: "story", eventType: "NOT_INTERESTED", reason: "hide_creator_stories", topics: storyTopics });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      showToast(__msg("stories.storiesFromAreNowHidden", { value0: activeStory.owner.name }));
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("stories.couldNotHideTheseStories"));
    } finally {
      setMenuBusy("");
    }
  };

  const reportStory = async (reason) => {
    if (menuBusy) return;
    setMenuBusy("report");
    try {
      await storyService.reportStory(activeStory.id, reason);
      showToast(__msg("stories.reportReceivedThankYouForHelpingKeepSeenSafe"));
      setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
    } catch (error) {
      showToast(error?.response?.data?.message || __msg("stories.couldNotReportThisStory"));
    } finally {
      setMenuBusy("");
    }
  };

  if (!activeStory) {
    return null;
  }

  const inline = presentation === "inline";
  const replyName = (activeStory.owner.name || __msg("activity.story")).split(" ").filter(Boolean)[0] || __msg("activity.story");
  const ownerProfileKey = activeStory.owner.username || activeStory.username || activeStory.owner.id || activeStory.ownerId;
  const ownerProfilePath = ownerProfileKey ? `/profile/${encodeURIComponent(ownerProfileKey)}` : null;
  const sharePayload = {
    contentId: activeStory.id,
    contentType: "story",
    imageUrl: activeStory.mediaUrl || activeStory.image || "",
    mediaType: activeStory.mediaType || activeStory.type || "",
    previewText: activeStory.caption || __msg("stories.storyFromValue0", { value0: activeStory.owner.name }),
    route: `/stories/${activeStory.id}`,
    title: __msg("stories.value0SStory", { value0: activeStory.owner.name }),
  };
  const openOwnerProfile = (event) => {
    event.stopPropagation();
    if (ownerProfilePath) navigate(ownerProfilePath);
  };
  const openOwnerAbout = () => {
    if (!ownerProfilePath) return;
    setOwnerMenuOpen(false);
      setConfirmStoryDelete(false);
    onClose();
    navigate(ownerProfilePath);
  };

  return (
    <>
      <FanModal
        className="story-viewer-dialog h-[100dvh] max-h-[100dvh] max-w-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none"
        hideHeader
        isOpen={isOpen}
        onClose={onClose}
        overlayClassName={`story-viewer-overlay !p-0 ${discover ? "discover-story-viewer" : ""}`}
        overlayStyle={viewerPosition}
        portal
        title={__msg("stories.storyViewer")}
      >
        <div
          className={`story-viewer-surface relative h-[100dvh] overflow-hidden bg-black ${inline ? "discover-story-inline-surface" : ""}`}
          onDoubleClick={(event) => {
            if (event.target.closest("input,textarea,a,button:not([data-story-navigation])")) return;
            window.clearTimeout(navigationTimer.current);
            if (canReact) reactToStory("❤️");
          }}
          onPointerDown={(event) => { setHoldPaused(true); if (discover) storySwipe.current = { x: event.clientX, y: event.clientY }; if (canReact && !event.target.closest("input,textarea,a,button:not([data-story-navigation])")) startReactionHold(); }}
          onPointerLeave={() => { setHoldPaused(false); cancelReactionHold(); }}
          onPointerCancel={() => { setHoldPaused(false); cancelReactionHold(); }}
          onClickCapture={(event) => { if (suppressStoryClick.current || suppressReactionClick.current && event.target.closest("[data-story-navigation]")) { event.preventDefault(); event.stopPropagation(); suppressStoryClick.current = false; suppressReactionClick.current = false; } }}
          onPointerUp={(event) => {
            cancelReactionHold();
            setHoldPaused(false);
            const start = storySwipe.current;
            storySwipe.current = null;
            if (!discover || !start) return;
            const dx = event.clientX-start.x, dy = event.clientY-start.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)*1.4) {
              event.preventDefault(); suppressStoryClick.current = true;
              if (dx < 0) onNextCreator?.(); else onPreviousCreator?.();
            }
          }}
          ref={storyTrackingRef}
        >
          <StoryMedia
            muted={muted}
            onDurationChange={(duration) => setDurationMs(duration * 1000)}
            onEnded={() => goStory(1)}
            onPlay={() => setSystemPaused(false)}
            story={activeStory}
            videoRef={videoRef}
          />
          <div className={sharedCard ? "story-viewer-shared-shade" : "absolute inset-0 bg-gradient-to-b from-atseen-bg/80 via-transparent to-atseen-bg/95"} />
          <StoryOverlays canOpenQuestionAnswers={canOpenQuestionAnswers} canReply={canReply} onQuestionStickerClick={answerQuestionSticker} questionAnswerCount={activeStory.questionReplyCount} story={activeStory} />
          {activeStory.allowSharing && activeStory.audience === "everyone" && !activeStory.editorMetadata?.sourceStoryId && activeStory.editorMetadata?.mentions?.some((item) => item.userId === String(user?.id || user?._id)) ? <button className="story-reshare-action" onClick={() => navigate(`/stories/${activeStory.id}?reshare=1`)} type="button"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeDasharray="4 3" /><path d="M12 8.5v7M8.5 12h7" /></svg><span>{__msg("activity.addToYourStory")}</span></button> : null}
          {discover && reactionToast ? <div aria-live="polite" className="discover-story-reaction-toast" key={reactionToastKey} role="status">{reactionToast}</div> : null}
          {sharedCard ? (
            <div
              className={`story-viewer-shared-card-wrap ${sharedCard.kind === "story" ? "is-story-reshare-wrap" : ""}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              style={{ "--story-shared-card-x": `${sharedCard.x ?? 50}%`, "--story-shared-card-y": `${sharedCard.y ?? 50}%`, transform: `translate(-50%,-50%) scale(${sharedCard.scale || 1})` }}
            >
              {sharedCard.kind === "story" ? <a aria-label={__msg("stories.openStory", { value0: sharedCard.title })} className="is-story-reshare-card" href={sharedCard.destinationRoute}><StoryReshareCard card={sharedCard} /></a> : activeStory.sourceType === "seen" || sharedCard.kind === "seen" ? (
                <SharedSeenStoryCard seen={activeStory.sourceSeen} sharedCard={sharedCard} unavailable={activeStory.sourceUnavailable} />
              ) : sharedCard.kind === "question_reply" ? (
                <article className="story-viewer-shared-card is-question-response" aria-label={__msg("stories.sharedQuestionAnswer")}>
                  <span>{sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}<small>{sharedCard.subtitle || __msg("fanWeb.question")}</small><strong dir="auto">{sharedCard.title}</strong></span>
                </article>
              ) : isTextOnlySharedCard(sharedCard) ? (
                <a
                  aria-label={__msg("contentEntities.open", { value0: sharedCard.title || __msg("stories.voiceNote") })}
                  className={`story-viewer-shared-card is-text-only ${sharedCard.kind === "note" ? `is-wall-note is-note-${sharedCard.variant === "long" ? "long" : "compact"}` : ""}`}
                  href={sharedCard.destinationRoute || "/wall"}
                >
                  <span>
                    {sharedCard.kind === "note" ? <span className="wall-note-story-byline"><FanAvatar name={sharedCard.authorName || "Creator"} src={sharedCard.authorAvatar} size="h-[15px] w-[15px]" /><em>{sharedCard.eyebrow}</em></span> : sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}
                    <strong>{sharedCard.kind === "note" && sharedCard.variant !== "long" ? `${String(sharedCard.originalTranscript || sharedCard.title).slice(0, 140)}${String(sharedCard.originalTranscript || sharedCard.title).length > 140 ? "\u2026" : ""}` : sharedCard.originalTranscript || sharedCard.title}</strong>
                    {sharedCard.translationText ? (
                      <span className="story-shared-card-translation">
                        <b>{sharedCard.translationLabel ? __msg("stories.translatedTo", { value0: sharedCard.translationLabel }) : __msg("stories.translation")}</b>
                        <i>{sharedCard.translationText}</i>
                      </span>
                    ) : null}
                    <small>{sharedCard.subtitle || __msg("stories.tapToOpen")}</small>
                  </span>
                </a>
              ) : (
                <a
                  aria-label={__msg("contentEntities.open", { value0: sharedCard.title || "Seen" })}
                  className="story-viewer-shared-card"
                  href={sharedCard.destinationRoute || "/seen"}
                >
                  {sharedCard.imageUrl ? sharedCard.mediaType === "video" ? <video autoPlay loop muted onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= 15) event.currentTarget.currentTime = 0; }} playsInline src={sharedCard.imageUrl} /> : <img alt="" src={sharedCard.imageUrl} /> : sharedCard.kind === "post" ? null : <span className="story-shared-card-fallback" />}
                  <span>{sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}<strong dir="auto">{sharedCard.title}</strong><small>{sharedCard.subtitle || __msg("stories.tapToOpen")}</small></span>
                </a>
              )}
            </div>
          ) : null}
          <div className="story-progress-bars absolute left-4 right-4 top-4 z-30 flex gap-1" role="group" aria-label={__msg("stories.storyProgress")}>
            {stories.map((story, storyIndex) => (
              <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30" key={story.id}>
                <span className="block h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${storyIndex < index ? 100 : storyIndex === index ? progress : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="story-viewer-header absolute left-4 right-4 top-9 z-30 flex items-center gap-2.5">
            <button
              aria-label={__msg("stories.openProfile", { value0: activeStory.owner.name || __msg("stories.storyOwner") })}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-start transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              disabled={!ownerProfilePath}
              onClick={openOwnerProfile}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              type="button"
            >
              <FanAvatar brand={activeStory.brand} name={activeStory.owner.name} size="h-9 w-9" src={activeStory.owner.avatar} />
              <div className="story-viewer-owner-copy min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-white">
                <span className="truncate">{highlightTitle || (canDelete ? __msg("stories.yourStory") : discover ? replyName : activeStory.owner.name)}</span>
                {activeStory.owner.verified && !discover ? <VerifiedBadge className="h-3.5 w-3.5 shrink-0" /> : null}
              </p>
              <p className="story-viewer-head-meta">{canDelete ? __msg("posts.now") : formatStoryTimeAgo(activeStory.createdAt)}<i aria-label={activeStory.audience || __msg("stories.everyone")} /></p>
              </div>
            </button>
            <button
              data-story-pause
              aria-label={paused ? __msg("stories.resumeStory") : __msg("stories.pauseStory")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setManualPaused((current) => !current);
              }}
              type="button"
            >
              {paused ? <FiPlay aria-hidden="true" /> : <FiPause aria-hidden="true" />}
            </button>
            {hasStoryAudio ? (
              <button
                aria-label={muted ? __msg("stories.unmuteStory") : __msg("stories.muteStory")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                onClick={(event) => {
                  event.stopPropagation();
                  setMuted((current) => !current);
                }}
                type="button"
              >
                {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
              </button>
            ) : null}
            {hasStoryMenu ? (
              <div
                className="relative shrink-0"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <button
                  aria-label={__msg("stories.openStoryMenu")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                  onClick={() => onMore ? onMore(activeStory) : setOwnerMenuOpen((current) => !current)}
                  type="button"
                >
                  <FiMoreHorizontal aria-hidden="true" />
                </button>
              </div>
            ) : null}
            <button aria-label={__msg("stories.closeStory")} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition hover:bg-black/45" onClick={onClose} type="button">
              <FiX aria-hidden="true" />
            </button>
          </div>
          {storyMenuToast ? <div aria-live="polite" className="story-menu-toast" role="status">{storyMenuToast.message}</div> : null}
          {ownerMenuOpen && !canDelete ? (
            <div
              className="story-viewer-menu-layer"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button aria-label={__msg("stories.closeStoryMenu")} className="story-viewer-menu-scrim" onClick={() => setOwnerMenuOpen(false)} type="button" />
              <section aria-label={__msg("stories.storyMenu")} aria-modal="true" className="story-viewer-menu-sheet" role="dialog">
                <span className="story-viewer-menu-handle" aria-hidden="true" />
                <div className="story-viewer-menu-list">
                  <button onClick={openGiftPicker} type="button"><FiGift /><span>{__msg("profile.sendAGift")}</span></button>
                  <button onClick={sendStory} type="button"><FiSend /><span>{__msg("profile.sendTo")}</span></button>
                  <button disabled={Boolean(menuBusy)} onClick={copyStoryLink} type="button"><FiLink /><span>{__msg("profile.copyLink")}</span></button>
                  <button disabled={!ownerProfilePath} onClick={openOwnerAbout} type="button"><FiUser /><span>{__msg("stories.aboutThisAccount")}</span></button>
                  <button disabled={Boolean(menuBusy)} onClick={hideOwnerStories} type="button"><FiEyeOff /><span>{menuBusy === "hide" ? __msg("stories.muting") : __msg("stories.muteSStories", { value0: replyName })}</span></button>
                  <button className="is-report" disabled={Boolean(menuBusy)} onClick={() => reportStory("OTHER")} type="button"><FiFlag /><span>{menuBusy === "report" ? __msg("profile.reporting") : __msg("discover.report")}</span></button>
                </div>
              </section>
            </div>
          ) : null}
          {ownerMenuOpen && canDelete ? (
            <div
              className="story-owner-actions-layer story-owner-prototype-menu"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button aria-label={__msg("stories.closeStoryActions")} className="story-owner-actions-scrim" onClick={() => setOwnerMenuOpen(false)} type="button" />
              <section aria-label={__msg("stories.storyActions")} aria-modal="true" className="story-owner-actions-sheet" role="dialog">
                <span className="story-owner-actions-handle" aria-hidden="true" />
                <div className="story-owner-actions-list">
                  <button onClick={() => { setOwnerMenuOpen(false); setHighlightOpen(true); }} type="button"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 16.5s-4-2.4-4-5.2A2.2 2.2 0 0 1 12 10a2.2 2.2 0 0 1 4 1.3c0 2.8-4 5.2-4 5.2z" /></svg><span>{__msg("stories.addToHighlight")}</span></button>
                  <button disabled={Boolean(menuBusy)} onClick={saveStoryMedia} type="button"><FiDownload /><span>{menuBusy === "save" ? __msg("admin.saving") : __msg("stories.saveToPhone")}</span></button>
                  <button disabled={Boolean(menuBusy)} onClick={sendStory} type="button"><FiSend /><span>{__msg("profile.sendTo")}</span></button>
                  <button disabled={Boolean(menuBusy)} onClick={copyStoryLink} type="button"><FiLink /><span>{__msg("profile.copyLink")}</span></button>
                  <button onClick={() => { setOwnerMenuOpen(false); showStoryMenuToast(["world", "members"].includes(activeStory.audience) ? "Only your World sees this" : activeStory.audience === "close_circle" ? "Only your friends see this" : ["fr", "followers"].includes(activeStory.audience) ? "Only followers see this" : "Everyone can see this"); }} type="button"><FiUsers /><span>{__msg("stories.storyAudience_630a32")}</span></button>
                  <button className="is-danger" disabled={deleteMutation.isPending} onClick={() => setConfirmStoryDelete(true)} type="button"><FiTrash2 /><span>{__msg("posts.delete")}</span></button>
                </div>
              </section>
              {confirmStoryDelete ? <div className="story-delete-confirm-scrim"><section className="story-delete-confirm" role="alertdialog" aria-modal="true" aria-label={__msg("stories.deleteThisStory")}><h2>{__msg("stories.deleteThisStory")}</h2><p>{__msg("stories.itDisappearsForEveryone")}</p><div><button disabled={deleteMutation.isPending} onClick={() => setConfirmStoryDelete(false)} type="button">{__msg("admin.cancel")}</button><button disabled={deleteMutation.isPending} onClick={deleteStory} type="button">{deleteMutation.isPending ? __msg("fanWeb.deleting") : __msg("posts.delete")}</button></div></section></div> : null}
            </div>
          ) : null}
          {(activeStory.activeStatus?.label || activeStory.caption) ? <p className="absolute bottom-32 left-5 right-5 z-30 text-start text-base font-bold leading-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]" dir="auto">{activeStory.activeStatus?.label || activeStory.caption}</p> : null}
          {showHighlightViews ? <div className="story-highlight-view-count"><FiEye aria-hidden="true" /><span>{Number(activeStory.viewCount || 0).toLocaleString(__uiLocale())} {Number(activeStory.viewCount || 0) === 1 ? __msg("stories.viewer") : __msg("stories.viewers_d18860")}</span></div> : null}
          {canViewInsights ? (
            <OwnStoryBottomBar
              count={ownViewCount}
              onHighlight={() => setHighlightOpen(true)}
              onMore={() => setOwnerMenuOpen(true)}
              onOpenViewers={() => setInsightsOpen(true)}
              onShare={sendStory}
              story={activeStory}
              viewers={ownViewers}
            />
          ) : null}
          {discover && reactionTrayOpen === "hold" ? <button aria-label={__msg("fanWeb.closeReactions")} className="discover-story-reaction-scrim" onClick={() => setReactionTrayOpen(false)} type="button" /> : null}
          {discover && reactionTrayOpen ? <div className="discover-story-reaction-tray" onPointerDown={(event) => event.preventDefault()}><StoryReactionTray canReact={activeStory.allowReactions !== false} selectedReaction={activeStory.viewerReaction} pending={reactionMutation.isPending} onReact={(reaction) => reactToActiveStory(reaction, true)} /></div> : null}
          {canReply || canReact ? (
            <form
              className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-5 right-5 z-40 flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onSubmit={submitReply}
            >
              <input
                aria-label={__msg("stories.replyToStory")}
                disabled={!canReply}
                className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/50 px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/80 focus:bg-black/60 focus:ring-2 focus:ring-white/10"
                maxLength={1000}
                onBlur={() => { setSystemPaused(false); if (discover) window.setTimeout(() => setReactionTrayOpen((current) => current === "quick" ? false : current), 250); }}
                onChange={(event) => setReplyText(event.target.value)}
                onFocus={() => { setSystemPaused(true); setReactionTrayOpen(true); }}
                placeholder={activeQuestionPrompt ? __msg("stories.answer", { value0: activeQuestionPrompt }) : __msg("stories.replyTo", { value0: replyName })}
                ref={replyInputRef}
                value={replyText}
              />
              {discover ? <button aria-label={activeStory.viewerReaction ? __msg("stories.removeStoryReaction") : __msg("stories.reactToStory")} aria-pressed={Boolean(activeStory.viewerReaction)} className="discover-story-heart" onPointerCancel={() => window.clearTimeout(reactionHold.current)} onPointerDown={() => { suppressReactionClick.current = false; reactionHold.current = window.setTimeout(() => { suppressReactionClick.current = true; setReactionTrayOpen("hold"); }, 420); }} onPointerUp={() => window.clearTimeout(reactionHold.current)} onPointerLeave={() => window.clearTimeout(reactionHold.current)} disabled={activeStory.allowReactions === false || reactionMutation.isPending} onClick={() => { if (suppressReactionClick.current) { suppressReactionClick.current = false; return; } reactToActiveStory(activeStory.viewerReaction ? null : "\u2764\ufe0f"); }} type="button"><span className="discover-story-heart-face" key={`${activeStory.viewerReaction || "empty"}-${reactionAnimation}`}>{activeStory.viewerReaction && activeStory.viewerReaction !== "\u2764\ufe0f" ? <span className="discover-story-heart-emoji">{activeStory.viewerReaction}</span> : <StoryHeartIcon active={activeStory.viewerReaction === "\u2764\ufe0f"} />}{reactionAnimation && activeStory.viewerReaction ? <i aria-hidden="true" className="discover-story-heart-ring" /> : null}{reactionAnimation && activeStory.viewerReaction && activeStory.viewerReaction !== "\u2764\ufe0f" ? <i aria-hidden="true" className="discover-story-reaction-rise">{activeStory.viewerReaction}</i> : null}</span></button> : <>
              <button
                aria-label={__msg("stories.reactWithHeartHoldForMoreReactions")}
                aria-pressed={Boolean(selectedReaction)}
                className={`story-viewer-heart ${selectedReaction ? "is-selected" : ""}`}
                disabled={reactMutation.isPending}
                onClick={() => { if (suppressReactionClick.current) { suppressReactionClick.current = false; return; } reactToStory(selectedReaction ? null : "❤️"); }}
                onPointerCancel={cancelReactionHold}
                onPointerDown={startReactionHold}
                onPointerLeave={cancelReactionHold}
                onPointerUp={cancelReactionHold}
                type="button"
              >
                <span className="discover-story-heart-face" key={`${selectedReaction || "empty"}-${heartBurstKey}`}>
                  {selectedReaction && selectedReaction !== "❤️" ? <span className="discover-story-heart-emoji">{selectedReaction}</span> : <StoryHeartIcon active={selectedReaction === "❤️"} />}
                  {heartBurstKey && selectedReaction ? <i aria-hidden="true" className="discover-story-heart-ring" /> : null}
                </span>
              </button>
              </>}
              <button
                aria-label={replyText.trim() ? __msg("stories.sendStoryReply") : __msg("stories.shareStoryInMessages")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/45 bg-white/10 text-lg text-white shadow-[0_6px_18px_rgba(0,0,0,.3)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-45"
                disabled={replyMutation.isPending}
                type="submit"
              >
                <FiSend aria-hidden="true" />
              </button>
            </form>
          ) : null}
          {!discover && reactionTrayOpen && canReact ? <div className="story-reaction-tray" onClick={(event) => event.stopPropagation()}><StoryReactionTray selectedReaction={selectedReaction} pending={reactMutation.isPending} onReact={reactToStory} /></div> : null}
          {floatingReaction ? <span className="story-floating-reaction" key={floatingReaction.id} aria-hidden="true">{floatingReaction.value}</span> : null}
          <button aria-label={__msg("stories.previousStory")} data-story-navigation className="absolute bottom-20 left-0 top-24 z-10 w-1/3 cursor-default opacity-0" disabled={index === 0 && !onPreviousComplete} onClick={() => { window.clearTimeout(navigationTimer.current); navigationTimer.current = window.setTimeout(() => goStory(-1), 260); }} type="button" />
          <button aria-label={__msg("stories.nextStory")} data-story-navigation className="absolute bottom-20 right-0 top-24 z-10 w-2/3 cursor-default opacity-0" onClick={() => { window.clearTimeout(navigationTimer.current); navigationTimer.current = window.setTimeout(() => goStory(1), 260); }} type="button" />
        </div>
      </FanModal>
      <OwnStoryViewersSheet
        insightsOpen={insightsOpen}
        layerStyle={viewerPosition}
        onActionMenu={(viewer) => setSelectedViewer(viewer)}
        onClose={() => setInsightsOpen(false)}
        onMessageViewer={messageViewer}
        onOpenProfile={openViewerProfile}
        story={activeStory}
      />
      <StoryViewerActionsSheet
        layerStyle={viewerPosition}
        onBlock={blockViewer}
        onClose={() => setSelectedViewer(null)}
        onHide={hideViewerStories}
        onMessage={() => messageViewer(selectedViewer)}
        onProfile={() => openViewerProfile(selectedViewer)}
        viewer={selectedViewer}
      />
      {giftOpen ? createPortal((
        <StoryGiftPicker
          onClose={() => setGiftOpen(false)}
          onSent={(gift) => {
            const recipient = activeStory.owner;
            showGiftSequence(gift, recipient, () => navigate(`/profile/${recipient.username || recipient.id || activeStory.ownerId}`));
            onClose();
          }}
          recipient={{ ...activeStory.owner, id: activeStory.owner.id || activeStory.ownerId }}
        />
      ), document.body) : null}
      {shareOpen ? createPortal(
        <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} />,
        document.body
      ) : null}
      {highlightOpen && canDelete ? <StoryHighlightPicker onOpenProfile={() => { onClose(); navigate("/profile"); }} creatorId={activeStory.owner?.id || activeStory.ownerId} onClose={() => setHighlightOpen(false)} story={activeStory} /> : null}
    </>
  );
}

export default StoryViewer;
