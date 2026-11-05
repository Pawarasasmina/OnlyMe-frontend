import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiRepeat } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import WallReactionTray from "./WallReactionTray";

function CommentRow({ comment, children, onReply, onReact, onRepost, options, userId, repostingId, reactingId }) {
  const anchor = useRef(null);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const author = comment.author || { name: "Creator" };
  const name = author.name || author.displayName || author.username || "Creator";
  const selected = options.find(option => option.key === comment.viewerReaction);
  const count = Number(comment.reactionCount || 0);
  const choose = reaction => { setPicker(false); setExpanded(false); onReact(comment, reaction); };
  return <article className="wall-comment-row" data-comment-id={comment.id}>
    <FanAvatar alt="" name={name} size="h-6 w-6" src={author.avatar || author.avatarUrl} />
    <div className="seen-comment-copy">
      <p><Link title={name} to={author.username ? `/profile/${encodeURIComponent(author.username)}` : "/wall"}>{name}</Link>{comment.text}</p>
      {comment.audio ? <VoiceMessageBubble audio={comment.audio} label="Voice comment" /> : null}
      <div className="wall-comment-actions">
        <button aria-label={`React to ${name}'s reply`} aria-pressed={Boolean(selected)} className={selected ? "is-selected" : ""} disabled={reactingId === comment.id} onClick={() => setPicker(true)} ref={anchor} type="button">{selected ? <span aria-hidden="true">{selected.icon}</span> : <FiHeart aria-hidden="true" />}<span>{count}</span></button>
        <button onClick={() => onReply(comment)} type="button">Reply</button>
        {String(author.id || author._id || "") !== String(userId || "") ? <button aria-label="Repost reply" aria-pressed={Boolean(comment.viewerReposted)} className={comment.viewerReposted ? "is-selected" : ""} disabled={repostingId === comment.id} onClick={() => onRepost(comment)} type="button"><FiRepeat aria-hidden="true" /></button> : null}
      </div>
      {children ? <div className="wall-comment-thread">{children}</div> : null}
    </div>
    {picker && !expanded ? <WallReactionTray anchorRef={anchor} options={options} selected={comment.viewerReaction} busy={reactingId === comment.id} onSelect={choose} onMore={() => setExpanded(true)} onClose={() => setPicker(false)} /> : null}
    {picker && expanded ? <div className="wall-comment-full-reactions" aria-label="Reply reactions" role="group">{options.map(option => <button aria-label={`${comment.viewerReaction === option.key ? "Remove" : "Send"} ${option.label} reaction`} aria-pressed={comment.viewerReaction === option.key} key={option.key} onClick={() => choose(comment.viewerReaction === option.key ? "" : option.key)} type="button">{option.icon}</button>)}<button onClick={() => { setPicker(false); setExpanded(false); }} type="button">Close</button></div> : null}
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
