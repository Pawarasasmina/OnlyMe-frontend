import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { msg as __msg } from "../../../i18n/runtime.js";
import MemberCommentBadge from "../../comments/MemberCommentBadge";
import { CommentReplyMention } from "../../comments/CommentIdentity";
import { commentFirstName } from "../../comments/commentIdentityUtils";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiMoreHorizontal, FiRepeat } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";

const compactRepostCount = (value) => Number(value) >= 1000 ? new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value)) : String(Number(value) || 0);
const wallCommentReactionIcons = {
  admire: "\uD83D\uDE0D",
  clap: "\uD83D\uDC4F",
  fire: "\uD83D\uDD25",
  laugh: "\uD83D\uDE02",
  love: "\u2764\uFE0F",
  sad: "\uD83D\uDE22",
  strong: "\uD83D\uDCAA",
  wow: "\uD83D\uDE2E",
};

function CommentRow({ noteOwner, comment, children, onReply, onReactPress, onReactionCancel, onReactionStart, onReactionSelect, onRepost, onOpenOptions, options, parentAuthor, reactionPickerId, userId, repostingId, reactingId }) {
  __useUiLanguage();
  const author = comment.author || { name: "Creator" };
  const name = commentFirstName(author, __msg("discover.creator"));
  const selected = Boolean(comment.viewerReaction);
  const selectedIcon = wallCommentReactionIcons[comment.viewerReaction];
  const count = Number(comment.reactionCount || 0);
  const visibleCount = selected ? Math.max(1, count) : count;
  return <article className="wall-comment-row" data-comment-id={comment.id}>
    <FanAvatar alt="" name={name} size="h-6 w-6" src={author.avatar || author.avatarUrl} />
    <div className="seen-comment-copy">
      <p><Link title={name} to={author.username ? `/profile/${encodeURIComponent(author.username)}` : "/wall"}>{name}</Link><MemberCommentBadge author={author} noteOwner={noteOwner} /><CommentReplyMention author={parentAuthor} replyingAuthor={author} />{comment.text}</p>
      {comment.audio ? <VoiceMessageBubble audio={comment.audio} label={__msg("comments.voiceComment")} /> : null}
      <div className="wall-comment-actions">
        <button aria-label={`${selected ? "Remove reaction from" : "React to"} ${name}'s reply`} aria-pressed={selected} className={selected ? "is-selected" : ""} disabled={reactingId === comment.id} onClick={() => onReactPress(comment)} onContextMenu={(event) => event.preventDefault()} onPointerCancel={onReactionCancel} onPointerDown={() => onReactionStart(comment)} onPointerLeave={onReactionCancel} onPointerUp={onReactionCancel} type="button">{selectedIcon ? <span aria-hidden="true" className="wall-comment-selected-reaction">{selectedIcon}</span> : <FiHeart aria-hidden="true" />}<span>{visibleCount}</span></button>
        <button onClick={() => onReply(comment)} type="button">{__msg("fan.reply")}</button>
        {String(author.id || author._id || "") !== String(userId || "") ?
          <button aria-label={__msg("system.WallCommentList.eab1801d81")} aria-pressed={Boolean(comment.viewerReposted)} className={comment.viewerReposted ? "is-selected" : ""} disabled={repostingId === comment.id} onClick={() => onRepost(comment)} type="button"><FiRepeat aria-hidden="true" />{Number(comment.repostCount) > 0 ? <span>{compactRepostCount(comment.repostCount)}</span> : null}</button>
        : null}
        <button aria-label={`More options for ${name}'s comment`} className="wall-comment-more" onClick={() => onOpenOptions(comment)} title={__msg("system.FeedPost.dc57782ca4")} type="button"><FiMoreHorizontal aria-hidden="true" /></button>
      </div>
      {reactionPickerId === comment.id ? <div aria-label={__msg("system.WallCommentList.ccdd1713eb")} className="wall-comment-quick-reactions" role="group">{options.map((option) => <button aria-label={option.label} aria-pressed={comment.viewerReaction === option.key} className={comment.viewerReaction === option.key ? "is-selected" : ""} disabled={reactingId === comment.id} key={option.key} onClick={() => onReactionSelect(comment, comment.viewerReaction === option.key ? "" : option.key)} type="button"><span aria-hidden="true">{option.icon}</span></button>)}</div> : null}
      {children ? <div className="wall-comment-thread">{children}</div> : null}
    </div>
  </article>;
}

export default function WallCommentList({ comments, allComments, onReact, options = [], ...props }) {
  __useUiLanguage();
  const [reactionPickerId, setReactionPickerId] = useState("");
  const reactionPressRef = useRef({ long: false, timer: 0 });
  const quickOptions = options.filter((option) => wallCommentReactionIcons[option.key]).map((option) => ({ ...option, icon: wallCommentReactionIcons[option.key] }));
  useEffect(() => () => window.clearTimeout(reactionPressRef.current.timer), []);
  const cancelReactionHold = () => window.clearTimeout(reactionPressRef.current.timer);
  const startReactionHold = (comment) => {
    reactionPressRef.current.long = false;
    window.clearTimeout(reactionPressRef.current.timer);
    reactionPressRef.current.timer = window.setTimeout(() => {
      reactionPressRef.current.long = true;
      setReactionPickerId(comment.id);
      navigator.vibrate?.(10);
    }, 420);
  };
  const pressReaction = (comment) => {
    if (reactionPressRef.current.long) { reactionPressRef.current.long = false; return; }
    setReactionPickerId("");
    onReact(comment, comment.viewerReaction ? "" : "love");
  };
  const selectReaction = (comment, reaction) => { setReactionPickerId(""); onReact(comment, reaction); };
  const ids = new Set(comments.map(comment => String(comment.id)));
  const roots = comments.filter(comment => !comment.parentCommentId || !ids.has(String(comment.parentCommentId)));
  const render = (comment, ancestors = new Set(), parentAuthor = null) => {
    // Guard against malformed historical data without hiding otherwise valid replies.
    if (ancestors.has(String(comment.id))) return null;
    const next = new Set([...ancestors, String(comment.id)]);
    const replies = comments.filter(item => String(item.parentCommentId || "") === String(comment.id));
    return <CommentRow key={comment.id} comment={comment} options={quickOptions} parentAuthor={parentAuthor} reactionPickerId={reactionPickerId} onReactPress={pressReaction} onReactionCancel={cancelReactionHold} onReactionStart={startReactionHold} onReactionSelect={selectReaction} {...props}>{replies.length ? replies.map(reply => render(reply, next, comment.author)) : null}</CommentRow>;
  };
  return <div className="seen-comments-list">{(allComments ? roots : roots.slice(-2)).map(comment => render(comment))}{!comments.length ? <p className="seen-comments-empty">{__msg("fanWeb.beTheFirstToComment")}</p> : null}</div>;
}
