import MemberCommentBadge from "../../comments/MemberCommentBadge";
import { Link } from "react-router-dom";
import { FiHeart, FiMoreHorizontal, FiRepeat } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";

function CommentRow({ noteOwner, comment, children, onReply, onReact, onRepost, onOpenOptions, userId, repostingId, reactingId }) {
  const author = comment.author || { name: "Creator" };
  const name = author.name || author.displayName || author.username || "Creator";
  const selected = Boolean(comment.viewerReaction);
  const count = Number(comment.reactionCount || 0);
  return <article className="wall-comment-row" data-comment-id={comment.id}>
    <FanAvatar alt="" name={name} size="h-6 w-6" src={author.avatar || author.avatarUrl} />
    <div className="seen-comment-copy">
      <p><Link title={name} to={author.username ? `/profile/${encodeURIComponent(author.username)}` : "/wall"}>{name}</Link><MemberCommentBadge author={author} noteOwner={noteOwner} />{comment.text}</p>
      {comment.audio ? <VoiceMessageBubble audio={comment.audio} label="Voice comment" /> : null}
      <div className="wall-comment-actions">
        <button aria-label={`${selected ? "Remove heart from" : "Heart"} ${name}'s reply`} aria-pressed={selected} className={selected ? "is-selected" : ""} disabled={reactingId === comment.id} onClick={() => onReact(comment, selected ? "" : "love")} type="button"><FiHeart aria-hidden="true" fill={selected ? "currentColor" : "none"} /><span>{count}</span></button>
        <button onClick={() => onReply(comment)} type="button">Reply</button>
        {String(author.id || author._id || "") !== String(userId || "") ?
          <button aria-label="Repost reply" aria-pressed={Boolean(comment.viewerReposted)} className={comment.viewerReposted ? "is-selected" : ""} disabled={repostingId === comment.id} onClick={() => onRepost(comment)} type="button"><FiRepeat aria-hidden="true" /></button>
        : null}
        <button aria-label={`More options for ${name}'s comment`} className="wall-comment-more" onClick={() => onOpenOptions(comment)} title="Comment options" type="button"><FiMoreHorizontal aria-hidden="true" /></button>
      </div>
      {children ? <div className="wall-comment-thread">{children}</div> : null}
    </div>
  </article>;
}

export default function WallCommentList({ comments, allComments, ...props }) {
  const ids = new Set(comments.map(comment => String(comment.id)));
  const roots = comments.filter(comment => !comment.parentCommentId || !ids.has(String(comment.parentCommentId)));
  const render = (comment, ancestors = new Set()) => {
    // Guard against malformed historical data without hiding otherwise valid replies.
    if (ancestors.has(String(comment.id))) return null;
    const next = new Set([...ancestors, String(comment.id)]);
    const replies = comments.filter(item => String(item.parentCommentId || "") === String(comment.id));
    return <CommentRow key={comment.id} comment={comment} {...props}>{replies.length ? replies.map(reply => render(reply, next)) : null}</CommentRow>;
  };
  return <div className="seen-comments-list">{(allComments ? roots : roots.slice(-2)).map(comment => render(comment))}{!comments.length ? <p className="seen-comments-empty">Be the first to comment.</p> : null}</div>;
}
