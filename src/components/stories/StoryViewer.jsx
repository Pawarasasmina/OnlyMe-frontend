import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiBarChart2, FiDownload, FiEye, FiEyeOff, FiFlag, FiGift, FiLink, FiMessageCircle, FiMoreHorizontal, FiPause, FiPlay, FiSend, FiSlash, FiUser, FiUserMinus, FiUsers, FiVolume2, FiVolumeX, FiX } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import FanModal from "../fanWeb/shared/FanModal";
import VerifiedBadge from "../fanWeb/shared/VerifiedBadge";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useAuth } from "../../hooks/useAuth";
import { useDeleteStory, useMarkStoryViewed, useStoryInsights } from "../../hooks/useStories";
import { storyService } from "../../services/storyService";
import { messageService } from "../../services/messageService";
import { profileService } from "../../services/profileService";
import { canCreateStory, canDeleteStory, canReplyToStory, canViewStoryInsights } from "../../utils/storyPermissions";
import StoryGiftPicker from "./StoryGiftPicker";
import ShareSheet from "../share/ShareSheet";
import SharedSeenStoryCard from "./SharedSeenStoryCard";
import { sharedSeenCardData } from "../../utils/sharedSeenStoryCard";

const IMAGE_DURATION_MS = 5000;
const VIEW_THRESHOLD_MS = 1000;
const STORY_EXPORT_WIDTH = 1080;
const STORY_EXPORT_HEIGHT = 1920;

function useStoryViewerPosition(isOpen) {
  const [position, setPosition] = useState(undefined);

  useEffect(() => {
    if (!isOpen || window.innerWidth < 881) { setPosition(undefined); return undefined; }
    const centerColumn = document.querySelector(".social-center-scroll");
    if (!centerColumn) return undefined;
    const updatePosition = () => {
      if (window.innerWidth < 881) { setPosition(undefined); return; }
      const bounds = centerColumn.getBoundingClientRect();
      setPosition({
        left: `${bounds.left}px`,
        right: 0,
        width: "auto",
        "--story-viewer-column-width": `${bounds.width}px`,
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
  }, [isOpen]);

  return position;
}

function formatStoryTimeAgo(value) {
  const created = new Date(value).getTime();
  if (!created) return "Now";

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  return `${Math.floor(hours / 24)}d`;
}

function StoryMedia({ muted, onDurationChange, onEnded, onPlay, story, videoRef }) {
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
        onDurationChange={(event) => onDurationChange(Math.min(event.currentTarget.duration || story.duration || 60, 60))}
        onEnded={onEnded}
        onPlay={onPlay}
        playsInline
        ref={videoRef}
        src={story.mediaUrl}
        style={style}
      />
    );
  }

  return <img alt="" className="h-full w-full object-cover" src={story.mediaUrl || story.image} style={style} />;
}

function StoryOverlays({ canOpenQuestionAnswers = false, canReply = false, onQuestionStickerClick, questionAnswerCount = 0, story }) {
  const metadata = story.editorMetadata || {};
  const questionSticker = metadata.questionSticker;
  const questionCount = Math.max(0, Number(questionAnswerCount) || 0);
  const questionCountLabel = questionCount === 1 ? "1 answer already" : `${questionCount} answers already`;
  return (
    <>
      {(metadata.textOverlays || []).map((overlay) => {
        const plate = overlay.style === 2;
        const darkPlate = plate && overlay.color === "#0A0C0F";
        return (
          <span
            className={`absolute max-w-[82%] rounded-xl px-3 py-1.5 text-center text-white ${
              overlay.background === "pill" ? "rounded-full bg-black/45" : overlay.background === "solid" ? "bg-black/65" : overlay.background === "translucent" ? "bg-black/30" : ""
            }`}
            key={overlay.id || `${overlay.text}-${overlay.x}-${overlay.y}`}
            style={{
              backgroundColor: plate ? overlay.color || "#fff" : undefined,
              color: plate ? (darkPlate ? "#fff" : "#0A0C0F") : overlay.color || "#fff",
              fontFamily: overlay.style === 3 ? "Georgia, 'Times New Roman', serif" : overlay.style === 4 ? "Menlo, Consolas, monospace" : undefined,
              fontSize: `${overlay.fontSize || 28}px`,
              fontStyle: overlay.style === 3 ? "italic" : undefined,
              fontWeight: overlay.fontWeight || (overlay.style === 1 || plate ? 800 : 650),
              left: `${overlay.x || 50}%`,
              letterSpacing: overlay.style === 4 ? ".5px" : undefined,
              textAlign: overlay.align || "center",
              textShadow: plate ? "none" : "0 2px 14px rgba(0,0,0,.55)",
              top: `${overlay.y || 50}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {overlay.text}
          </span>
        );
      })}
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
          aria-label={`Answer question: ${questionSticker.prompt || "Ask me anything"}`}
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
          }}
        >
          <b>{questionSticker.prompt || "Ask me anything"}</b>
          <span>{canOpenQuestionAnswers ? <>{questionCountLabel} · <em>open ›</em></> : "answers go to your inbox · tap to reply"}</span>
        </button>
      ) : null}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 177.777">
        {(metadata.drawing || []).map((stroke) => (
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
      reject(new Error("Image source is required."));
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Story image could not be loaded."));
    image.src = src;
  });
}

async function loadExportImage(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Image fetch failed.");
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
      else reject(new Error("Could not prepare this story."));
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
  const translationLabel = String(sharedCard.translationLabel || "Translation").trim();
  const card = (story.sourceType === "seen" || sharedCard.kind === "seen")
    ? sharedSeenCardData(story.sourceSeen || {}, sharedCard)
    : {
      cardBackgroundColor: sharedCard.cardBackgroundColor || "",
      cardTextColor: sharedCard.cardTextColor || "",
      excerpt: sharedCard.excerpt || "",
      imageUrl: sharedCard.imageUrl || "",
      mediaType: sharedCard.mediaType || "image",
      points: sharedCard.points || [],
      subtitle: sharedCard.subtitle || "Tap to open",
      title: sharedCard.title || "Shared on @seen",
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
    context.fillText(String(sharedCard.eyebrow || "Answered your question").slice(0, 42), cardX + 42, cardY + 40, cardWidth - 84);
    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "650 29px system-ui";
    drawWrappedText(context, String(sharedCard.subtitle || "Question").slice(0, 90), cardX + 42, cardY + 92, cardWidth - 84, 38, 2);
    context.fillStyle = "#fff";
    context.font = "850 45px system-ui";
    drawWrappedText(context, String(sharedCard.title || "").slice(0, 180), cardX + 42, cardY + 190, cardWidth - 84, 58, 3);
  } else if (isTextOnly) {
    context.fillStyle = "#9CCBFF";
    context.font = "800 27px system-ui";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(String(sharedCard.eyebrow || "NOTE").slice(0, 42), cardX + 42, cardY + 42, cardWidth - 84);
    context.fillStyle = cardText;
    context.font = "850 40px system-ui";
    drawWrappedText(context, originalTranscript.slice(0, 190), cardX + 42, cardY + 96, cardWidth - 84, 54, translationText ? 2 : 3);
    if (translationText) {
      context.fillStyle = "rgba(255,255,255,.45)";
      context.font = "800 22px system-ui";
      context.fillText(`TRANSLATED${translationLabel ? ` TO ${translationLabel.toUpperCase()}` : ""}`.slice(0, 46), cardX + 42, cardY + 236, cardWidth - 84);
      context.fillStyle = cardText;
      context.font = "750 34px system-ui";
      drawWrappedText(context, translationText.slice(0, 150), cardX + 42, cardY + 276, cardWidth - 84, 46, 2);
    }
    context.fillStyle = card.cardTextColor ? cardText : "rgba(156,203,255,.9)";
    context.font = "650 23px system-ui";
    context.fillText(String(card.subtitle || "from my Wall - tap >").slice(0, 64), cardX + 42, cardY + cardHeight - 72, cardWidth - 84);
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
    context.fillText(String(card.subtitle || "Tap to open").slice(0, 64), cardX + 34, subtitleY, cardWidth - 68);
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
  const prompt = String(questionSticker.prompt || "Ask me anything").slice(0, 80);
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

  (metadata.textOverlays || []).forEach((overlay) => {
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
    context.font = `${overlay.style === 3 ? "italic " : ""}${overlay.fontWeight || (overlay.style === 1 || plate ? 800 : 650)} ${fontSize}px ${overlay.style === 3 ? "Georgia" : overlay.style === 4 ? "Consolas" : "system-ui"}`;
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

  (metadata.drawing || []).forEach((stroke) => {
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
    name: viewer.name || viewer.displayName || viewer.username || "Viewer",
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
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`;
  return String(count);
}

function OwnStoryBottomBar({ count, onOpenViewers, onSave, onShare, saving, story, viewers }) {
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
        <button aria-label={saving ? "Saving story" : "Save story"} disabled={saving} onClick={onSave} type="button"><FiDownload /></button>
        <button aria-label="Share story" onClick={onShare} type="button"><FiSend /></button>
      </span>
    </div>
  );
}

function OwnStoryViewersSheet({ insightsOpen, layerStyle, onActionMenu, onClose, onMessageViewer, onOpenProfile, story }) {
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
      <section aria-label="Story viewers" aria-modal="true" className="story-owner-viewers-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Return to story" className="story-owner-viewers-grab" onClick={onClose} type="button" />
        <header className="story-owner-viewers-head">
          <StoryThumb story={story} />
          <span>
            <b>Your story</b>
            <small>burns in 24h · tap to return</small>
          </span>
        </header>
        <div className="story-owner-viewers-tabs">
          <button className={tab === "stats" ? "is-active" : ""} onClick={() => setTab("stats")} type="button"><FiBarChart2 /></button>
          <button className={tab === "people" ? "is-active" : ""} onClick={() => setTab("people")} type="button"><FiUsers /><b>{compactCount(totalViews)}</b></button>
        </div>
        {insightsQuery.isLoading ? <p className="story-owner-viewers-empty">Loading viewers...</p> : null}
        {insightsQuery.isError ? <p className="story-owner-viewers-empty">Viewer details are unavailable right now.</p> : null}
        {!insightsQuery.isLoading && !insightsQuery.isError && tab === "people" ? (
          <div className="story-owner-viewers-list">
            <h3>Who saw this</h3>
            {viewers.length ? viewers.map((viewer) => (
              <article className="story-owner-viewer-row" key={viewer.id || viewer.username}>
                <button className="story-owner-viewer-main" onClick={() => onOpenProfile(viewer)} type="button">
                  <span className="story-owner-viewer-avatar">
                    <FanAvatar name={viewer.name} size="h-[38px] w-[38px]" src={viewer.avatar} />
                    {viewer.reaction ? <i>{viewer.reaction}</i> : <i className="is-eye"><FiEye /></i>}
                  </span>
                  <span>
                    <b>{viewer.name.split(" ")[0] || viewer.username}</b>
                    <small>{viewer.hasQuestionReply ? <em>asked a question</em> : `${formatStoryTimeAgo(viewer.viewedAt)} ago`}</small>
                  </span>
                </button>
                <button aria-label={`Actions for ${viewer.name}`} onClick={() => onActionMenu(viewer)} type="button"><FiMoreHorizontal /></button>
                <button aria-label={`Message ${viewer.name}`} onClick={() => onMessageViewer(viewer)} type="button"><FiMessageCircle /></button>
              </article>
            )) : <p className="story-owner-viewers-empty">No viewer list is available yet.</p>}
          </div>
        ) : null}
        {!insightsQuery.isLoading && !insightsQuery.isError && tab === "stats" ? (
          <div className="story-owner-stats-list">
            <h3>Overview</h3>
            <p><span>Views</span><b>{compactCount(totalViews)}</b></p>
            <p><span>Reactions</span><b>{compactCount(reactions)}</b></p>
            <p><span>Replies</span><b>{compactCount(replies)}</b></p>
            {answers ? <p><span>Answers</span><b>{compactCount(answers)}</b></p> : null}
            <div className="story-owner-audience-bar" style={{ "--story-owner-followers": `${followerPercent}%` }}>
              <span><i />Followers · <b>{followerPercent}%</b></span>
              <span><i />New people · <b>{100 - followerPercent}%</b></span>
              <em><i /></em>
            </div>
            <small className="story-owner-private-note">Only you see this</small>
          </div>
        ) : null}
      </section>
    </div>
  ), document.body);
}

function StoryViewerActionsSheet({ layerStyle, onBlock, onClose, onHide, onMessage, onProfile, viewer }) {
  if (!viewer) return null;
  const firstName = viewer.name?.split(" ")[0] || viewer.username || "Viewer";
  return createPortal((
    <div className="story-owner-viewer-actions-layer" onClick={onClose} style={layerStyle}>
      <section aria-label={`${firstName} actions`} aria-modal="true" className="story-owner-viewer-actions-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <span className="story-owner-actions-handle" />
        <header>
          <FanAvatar name={viewer.name} size="h-8 w-8" src={viewer.avatar} />
          <b>{firstName}</b>
        </header>
        <button onClick={onProfile} type="button"><FiUser /> View profile</button>
        <button onClick={onMessage} type="button"><FiMessageCircle /> Send message</button>
        <button onClick={onHide} type="button"><FiEyeOff /> Hide your stories</button>
        <button className="is-danger" onClick={onBlock} type="button"><FiSlash /> Block</button>
        <button className="is-cancel" onClick={onClose} type="button">Cancel</button>
      </section>
    </div>
  ), document.body);
}

function StoryViewer({ initialIndex = 0, isOpen, onAddStory, onClose, presentation = "modal", previewOnly = false, stories = [] }) {
  const viewerPosition = useStoryViewerPosition(isOpen);
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const replyInputRef = useRef(null);
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
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [seeYouNotice, setSeeYouNotice] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [activeQuestionPrompt, setActiveQuestionPrompt] = useState("");
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState(null);
  const [menuBusy, setMenuBusy] = useState("");
  const markViewedMutation = useMarkStoryViewed();
  const deleteMutation = useDeleteStory();
  const paused = manualPaused || holdPaused || systemPaused || ownerMenuOpen || insightsOpen || Boolean(selectedViewer) || giftOpen || shareOpen;

  const activeStory = stories[index] || null;
  const sharedCard = activeStory?.editorMetadata?.sharedCard || null;
  const canReply = !previewOnly && canReplyToStory(user, activeStory);
  const canDelete = !previewOnly && canDeleteStory(user, activeStory);
  const canViewInsights = !previewOnly && canViewStoryInsights(user, activeStory);
  const canOpenQuestionAnswers = canViewInsights && Boolean(activeStory?.editorMetadata?.questionSticker);
  const canAdd = !previewOnly && canCreateStory(user);
  const canAddToProfileMedia = canDelete && ["image", "video"].includes(activeStory?.mediaType);
  const canUseViewerMenu = Boolean(activeStory && !canDelete && !previewOnly);
  const hasStoryMenu = canDelete || canViewInsights || canAdd || canUseViewerMenu;
  const ownInsightsQuery = useStoryInsights(activeStory?.id, { enabled: isOpen && canViewInsights && Boolean(activeStory?.id) });
  const ownInsights = ownInsightsQuery.data || {};
  const ownViewers = normalizeInsightViewers(ownInsights);
  const ownViewCount = Number(ownInsights.totalViews ?? activeStory?.viewCount ?? activeStory?.views ?? ownViewers.length ?? 0);

  const replyMutation = useMutation({
    mutationFn: ({ body, storyId }) => storyService.replyToStory(storyId, body),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      showToast("Reply sent to Messages.");
      onClose();
    },
    onError: (error) => showToast(error?.response?.data?.message || "Story reply could not be sent."),
  });
  const seeYouMutation = useMutation({
    mutationFn: ({ storyId }) => storyService.seeStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      setSeeYouNotice(true);
      window.setTimeout(() => setSeeYouNotice(false), 1300);
      showToast("I SEE YOU sent.");
    },
    onError: (error) => showToast(error?.response?.data?.message || "I SEE YOU could not be sent."),
  });
  const addToProfileMediaMutation = useMutation({
    mutationFn: ({ storyId }) => profileService.addStoryToProfileMedia(storyId).then((response) => response.data?.data),
    onSuccess: (_result, { storyId }) => {
      queryClient.invalidateQueries({ queryKey: ["profile-media"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      const markInCache = (current) => {
        if (!current) return current;
        const mark = (story) => story?.id === storyId ? { ...story, isInProfileMedia: true } : story;
        if (Array.isArray(current)) return current.map(mark);
        if (current.viewer?.stories) return { ...current, viewer: { ...current.viewer, stories: current.viewer.stories.map(mark) } };
        if (current.items) return { ...current, items: current.items.map((group) => ({ ...group, stories: (group.stories || []).map(mark) })) };
        return current;
      };
      queryClient.setQueriesData({ queryKey: ["stories"] }, markInCache);
      queryClient.setQueriesData({ queryKey: ["wall-stories"] }, markInCache);
      showToast("Added to Profile Media ✓");
      setOwnerMenuOpen(false);
    },
    onError: (error) => showToast(error?.response?.data?.message || "Story no longer available"),
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
      setReplyText("");
      setActiveQuestionPrompt("");
      setGiftOpen(false);
      setShareOpen(false);
      setSelectedViewer(null);
      setMenuBusy("");
    }
  }, [boundedIndex, isOpen]);

  const goStory = useCallback((direction) => {
    setIndex((current) => {
      const next = current + direction;
      if (next < 0) return 0;
      if (next >= stories.length) {
        onClose();
        return current;
      }
      setProgress(0);
      setManualPaused(false);
      setHoldPaused(false);
      setSystemPaused(false);
      setOwnerMenuOpen(false);
      setReplyText("");
      setActiveQuestionPrompt("");
      setGiftOpen(false);
      setShareOpen(false);
      setSelectedViewer(null);
      setMenuBusy("");
      return next;
    });
  }, [onClose, stories.length]);

  useEffect(() => {
    if (!isOpen || !activeStory || previewOnly) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (!viewedRef.current.has(activeStory.id)) {
        viewedRef.current.add(activeStory.id);
        markViewedMutation.mutate(activeStory.id);
      }
    }, VIEW_THRESHOLD_MS);

    return () => window.clearTimeout(timer);
  }, [activeStory, isOpen, markViewedMutation, previewOnly]);

  useEffect(() => {
    if (!activeStory) {
      return undefined;
    }

    setProgress(0);
    setDurationMs(activeStory.mediaType === "video" ? Math.min(Number(activeStory.duration) || 15, 60) * 1000 : IMAGE_DURATION_MS);
    return undefined;
  }, [activeStory]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
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
  }, [goStory, isOpen, onClose]);

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
      showToast("You do not have permission to delete this story.");
      return;
    }

    deleteMutation.mutate(activeStory.id, {
      onSuccess: () => {
        showToast("Story deleted.");
        onClose();
      },
      onError: (error) => {
        const status = error?.response?.status;
        showToast(status === 403 ? "You do not have permission to delete this story." : "Story could not be deleted.");
      },
    });
  };

  const addToProfileMedia = () => {
    if (!activeStory || !canAddToProfileMedia || activeStory.isInProfileMedia || addToProfileMediaMutation.isPending) return;
    addToProfileMediaMutation.mutate({ storyId: activeStory.id });
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
    setActiveQuestionPrompt(questionSticker?.prompt || "Ask me anything");
    setSystemPaused(true);
    window.setTimeout(() => replyInputRef.current?.focus(), 0);
  };

  const sendSeeYou = () => {
    if (!activeStory || !canReply || seeYouMutation.isPending) return;
    seeYouMutation.mutate({ storyId: activeStory.id });
  };

  const openGiftPicker = () => {
    if (!activeStory?.owner?.id && !activeStory?.ownerId) {
      showToast("This creator cannot receive direct gifts right now.");
      return;
    }
    setGiftOpen(true);
  };

  const copyStoryLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/stories/${activeStory.id}`);
      setOwnerMenuOpen(false);
      showToast("Story link copied.");
    } catch {
      showToast("Story link could not be copied.");
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
      showToast("Saved");
    } catch {
      showToast("Story could not be saved.");
    } finally {
      setMenuBusy("");
    }
  };

  const addAnotherStory = () => {
    setOwnerMenuOpen(false);
    onClose();
    onAddStory?.();
  };

  const sendStory = () => {
    setOwnerMenuOpen(false);
    setShareOpen(true);
  };

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
      await messageService.muteConversation(selectedViewer.id, true);
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      showToast(`Stories from ${selectedViewer.name} are now hidden.`);
      setSelectedViewer(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not hide this viewer's stories.");
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
      showToast(`${selectedViewer.name} is blocked.`);
      setSelectedViewer(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not block this viewer.");
    } finally {
      setMenuBusy("");
    }
  };

  const unfollowOwner = async () => {
    if (!activeStory?.id || menuBusy) return;
    setMenuBusy("unfollow");
    try {
      await storyService.unfollowStoryCreator(activeStory.id);
      await queryClient.invalidateQueries({ queryKey: ["discover"] });
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      showToast(`Unfollowed ${activeStory.owner.name}.`);
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not unfollow this account.");
    } finally {
      setMenuBusy("");
    }
  };

  const hideOwnerStories = async () => {
    if (!activeStory?.id || menuBusy) return;
    setMenuBusy("hide");
    try {
      await storyService.hideCreatorStories(activeStory.id);
      await queryClient.invalidateQueries({ queryKey: ["stories"] });
      await queryClient.invalidateQueries({ queryKey: ["wall-stories"] });
      showToast(`Stories from ${activeStory.owner.name} are now hidden.`);
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not hide these stories.");
    } finally {
      setMenuBusy("");
    }
  };

  const reportStory = async (reason) => {
    if (menuBusy) return;
    setMenuBusy("report");
    try {
      await storyService.reportStory(activeStory.id, reason);
      showToast("Report received. Thank you for helping keep @seen safe.");
      setOwnerMenuOpen(false);
    } catch (error) {
      showToast(error?.response?.data?.message || "Could not report this story.");
    } finally {
      setMenuBusy("");
    }
  };

  if (!activeStory) {
    return null;
  }

  const inline = presentation === "inline";
  const replyName = (activeStory.owner.name || "Story").split(" ").filter(Boolean)[0] || "Story";
  const ownerProfileKey = activeStory.owner.username || activeStory.username || activeStory.owner.id || activeStory.ownerId;
  const ownerProfilePath = ownerProfileKey ? `/profile/${encodeURIComponent(ownerProfileKey)}` : null;
  const sharePayload = {
    contentId: activeStory.id,
    contentType: "story",
    imageUrl: activeStory.mediaUrl || activeStory.image || "",
    previewText: activeStory.caption || `Story from ${activeStory.owner.name}`,
    route: `/stories/${activeStory.id}`,
    title: `${activeStory.owner.name}'s story`,
  };
  const openOwnerProfile = (event) => {
    event.stopPropagation();
    if (ownerProfilePath) navigate(ownerProfilePath);
  };

  return (
    <>
      <FanModal
        className="story-viewer-dialog h-[100dvh] max-h-[100dvh] max-w-none overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none"
        hideHeader
        isOpen={isOpen}
        onClose={onClose}
        overlayClassName="story-viewer-overlay !p-0"
        overlayStyle={viewerPosition}
        portal
        title="Story viewer"
      >
        <div
          className={`story-viewer-surface relative h-[100dvh] overflow-hidden bg-black ${inline ? "discover-story-inline-surface" : ""}`}
          onPointerDown={() => setHoldPaused(true)}
          onPointerLeave={() => setHoldPaused(false)}
          onPointerUp={() => setHoldPaused(false)}
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
          {sharedCard ? (
            <div
              className="story-viewer-shared-card-wrap"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              style={{ "--story-shared-card-x": `${sharedCard.x ?? 50}%`, "--story-shared-card-y": `${sharedCard.y ?? 50}%` }}
            >
              {activeStory.sourceType === "seen" || sharedCard.kind === "seen" ? (
                <SharedSeenStoryCard seen={activeStory.sourceSeen} sharedCard={sharedCard} unavailable={activeStory.sourceUnavailable} />
              ) : sharedCard.kind === "question_reply" ? (
                <article className="story-viewer-shared-card is-question-response" aria-label="Shared question answer">
                  <span>{sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}<small>{sharedCard.subtitle || "Question"}</small><strong>{sharedCard.title}</strong></span>
                </article>
              ) : isTextOnlySharedCard(sharedCard) ? (
                <a
                  aria-label={`Open ${sharedCard.title || "voice note"}`}
                  className="story-viewer-shared-card is-text-only"
                  href={sharedCard.destinationRoute || "/wall"}
                >
                  <span>
                    {sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}
                    <strong>{sharedCard.originalTranscript || sharedCard.title}</strong>
                    {sharedCard.translationText ? (
                      <span className="story-shared-card-translation">
                        <b>{sharedCard.translationLabel ? `Translated to ${sharedCard.translationLabel}` : "Translation"}</b>
                        <i>{sharedCard.translationText}</i>
                      </span>
                    ) : null}
                    <small>{sharedCard.subtitle || "Tap to open"}</small>
                  </span>
                </a>
              ) : (
                <a
                  aria-label={`Open ${sharedCard.title || "Seen"}`}
                  className="story-viewer-shared-card"
                  href={sharedCard.destinationRoute || "/seen"}
                >
                  {sharedCard.imageUrl ? <img alt="" src={sharedCard.imageUrl} /> : sharedCard.kind === "post" ? null : <span className="story-shared-card-fallback" />}
                  <span>{sharedCard.eyebrow ? <em>{sharedCard.eyebrow}</em> : null}<strong>{sharedCard.title}</strong><small>{sharedCard.subtitle || "Tap to open"}</small></span>
                </a>
              )}
            </div>
          ) : null}
          <div className="absolute left-4 right-4 top-4 z-30 flex gap-1" role="group" aria-label="Story progress">
            {stories.map((story, storyIndex) => (
              <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30" key={story.id}>
                <span className="block h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${storyIndex < index ? 100 : storyIndex === index ? progress : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="absolute left-4 right-4 top-9 z-30 flex items-center gap-2.5">
            <button
              aria-label={`Open ${activeStory.owner.name || "story owner"} profile`}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              disabled={!ownerProfilePath}
              onClick={openOwnerProfile}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              type="button"
            >
              <FanAvatar brand={activeStory.brand} name={activeStory.owner.name} size="h-9 w-9" src={activeStory.owner.avatar} />
              <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-white">
                <span className="truncate">{activeStory.owner.name}</span>
                {activeStory.owner.verified ? <VerifiedBadge className="h-3.5 w-3.5 shrink-0" /> : null}
              </p>
              <p className="truncate text-[10px] font-semibold text-white/65">{formatStoryTimeAgo(activeStory.createdAt)}</p>
              </div>
            </button>
            <button
              aria-label={paused ? "Resume story" : "Pause story"}
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
            {activeStory.mediaType === "video" ? (
              <button
                aria-label={muted ? "Unmute story" : "Mute story"}
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
                  aria-label="Open story menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
                  onClick={() => setOwnerMenuOpen((current) => !current)}
                  type="button"
                >
                  <FiMoreHorizontal aria-hidden="true" />
                </button>
                {ownerMenuOpen && !canDelete ? (
                  <div className="story-viewer-more-menu">
                    <button className="story-viewer-more-menu-item is-report" disabled={Boolean(menuBusy)} onClick={() => reportStory("OTHER")} type="button"><FiFlag /> <span>{menuBusy === "report" ? "Reporting..." : "Report"}</span></button>
                    <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy)} onClick={unfollowOwner} type="button"><FiUserMinus /> <span>{menuBusy === "unfollow" ? "Unfollowing..." : "Unfollow"}</span></button>
                    <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy)} onClick={hideOwnerStories} type="button"><FiEyeOff /> <span>{menuBusy === "hide" ? "Hiding..." : "Hide stories"}</span></button>
                    <button className="story-viewer-more-menu-item" disabled={Boolean(menuBusy)} onClick={copyStoryLink} type="button"><FiLink /> <span>Copy link</span></button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <button aria-label="Close story" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur transition hover:bg-black/45" onClick={onClose} type="button">
              <FiX aria-hidden="true" />
            </button>
          </div>
          {ownerMenuOpen && canDelete ? (
            <div
              className="story-owner-actions-layer"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button aria-label="Close story actions" className="story-owner-actions-scrim" onClick={() => setOwnerMenuOpen(false)} type="button" />
              <section aria-label="Story actions" aria-modal="true" className="story-owner-actions-sheet" role="dialog">
                <span className="story-owner-actions-handle" aria-hidden="true" />
                <div className="story-owner-actions-list">
                  {canAddToProfileMedia ? <button disabled={activeStory.isInProfileMedia || addToProfileMediaMutation.isPending} onClick={addToProfileMedia} type="button">{activeStory.isInProfileMedia ? "Added to Profile Media ✓" : addToProfileMediaMutation.isPending ? "Adding..." : "Add to Profile Media"}</button> : null}
                  {canAdd ? <button onClick={addAnotherStory} type="button">Add another Story</button> : null}
                  <button className="is-danger" disabled={deleteMutation.isPending} onClick={deleteStory} type="button">{deleteMutation.isPending ? "Deleting..." : "Delete story"}</button>
                  <button disabled={Boolean(menuBusy)} onClick={saveStoryMedia} type="button">{menuBusy === "save" ? "Saving..." : "Save story"}</button>
                  <button disabled={Boolean(menuBusy)} onClick={copyStoryLink} type="button">Copy link</button>
                  <button disabled={Boolean(menuBusy)} onClick={sendStory} type="button">Send</button>
                </div>
                <button className="story-owner-actions-done" onClick={() => setOwnerMenuOpen(false)} type="button">Done</button>
              </section>
            </div>
          ) : null}
          {seeYouNotice ? (
            <div className="pointer-events-none absolute left-1/2 top-[74px] z-40 -translate-x-1/2 rounded-full bg-[#121721]/90 px-4 py-2 text-sm font-extrabold text-white shadow-2xl backdrop-blur">
              <span aria-hidden="true" className="mr-2">{"\ud83d\udc41\ufe0f"}</span>
              <span>{"\u2192"} {replyName}</span>
            </div>
          ) : null}
          {activeStory.caption ? <p className="absolute bottom-32 left-5 right-5 z-30 text-left text-base font-bold leading-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.6)]">{activeStory.caption}</p> : null}
          {canViewInsights ? (
            <OwnStoryBottomBar
              count={ownViewCount}
              onOpenViewers={() => setInsightsOpen(true)}
              onSave={saveStoryMedia}
              onShare={sendStory}
              saving={menuBusy === "save"}
              story={activeStory}
              viewers={ownViewers}
            />
          ) : null}
          {canReply ? (
            <form
              className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-3.5 right-3.5 z-40 flex items-center gap-2 rounded-[28px] bg-black/20 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onSubmit={submitReply}
            >
              <input
                aria-label="Reply to story"
                className="min-w-0 flex-1 rounded-full border border-white/40 bg-black/50 px-4 py-3 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/80 focus:bg-black/60 focus:ring-2 focus:ring-white/10"
                maxLength={1000}
                onBlur={() => setSystemPaused(false)}
                onChange={(event) => setReplyText(event.target.value)}
                onFocus={() => setSystemPaused(true)}
                placeholder={activeQuestionPrompt ? `Answer: ${activeQuestionPrompt}` : `Reply to ${replyName}...`}
                ref={replyInputRef}
                value={replyText}
              />
              <button
                aria-label="Send a gift"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 disabled:opacity-45"
                onClick={openGiftPicker}
                type="button"
              >
                <FiGift aria-hidden="true" />
              </button>
              <button
                aria-label="Send I see you"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-black/35 text-lg text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/45 hover:bg-white/15 disabled:opacity-45"
                disabled={seeYouMutation.isPending}
                onClick={sendSeeYou}
                type="button"
              >
                <FiEye aria-hidden="true" />
              </button>
              <button
                aria-label={replyText.trim() ? "Send story reply" : "Share story in messages"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/45 bg-white/10 text-lg text-white shadow-[0_6px_18px_rgba(0,0,0,.3)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-45"
                disabled={replyMutation.isPending}
                type="submit"
              >
                <FiSend aria-hidden="true" />
              </button>
            </form>
          ) : null}
          <button aria-label="Previous story" className="absolute bottom-20 left-0 top-24 z-10 w-1/3 cursor-default opacity-0" disabled={index === 0} onClick={() => goStory(-1)} type="button" />
          <button aria-label="Next story" className="absolute bottom-20 right-0 top-24 z-10 w-2/3 cursor-default opacity-0" onClick={() => goStory(1)} type="button" />
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
          onSent={() => showToast("Gift sent in Messages.")}
          recipient={{ ...activeStory.owner, id: activeStory.owner.id || activeStory.ownerId }}
        />
      ), document.body) : null}
      {shareOpen ? createPortal(
        <ShareSheet isOpen onClose={() => setShareOpen(false)} payload={sharePayload} />,
        document.body
      ) : null}
    </>
  );
}

export default StoryViewer;
