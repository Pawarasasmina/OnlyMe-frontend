import { useLanguage as __useUiLanguage } from "../../../hooks/useLanguage.js";
import { msg as __msg } from "../../../i18n/runtime.js";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiMoreHorizontal, FiRepeat } from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import VoiceMessageBubble from "../../messaging/VoiceMessageBubble";
import WallReactionTray from "./WallReactionTray";

function CommentRow({ comment, children, onReply, onReact, onRepost, onOpenOptions, options, userId, repostingId, reactingId }) {
  __useUiLanguage();
  const anchor = useRef(null);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const author = comment.author || { name: "Creator" };
  const name = author.name || author.displayName || author.username || __msg("discover.creator");
  const selected = options.find(option => option.key === comment.viewerReaction);
  const count = Number(comment.reactionCount || 0);
  const choose = reaction => { setPicker(false); setExpanded(false); onReact(comment, reaction); };
  return <article className="wall-comment-row" data-comment-id={comment.id}>
    <FanAvatar alt="" name={name} size="h-6 w-6" src={author.avatar || author.avatarUrl} />
    <div className="seen-comment-copy">
      <p><Link title={name} to={author.username ? `/profile/${encodeURIComponent(author.username)}` : "/wall"}>{name}</Link>{comment.text}</p>
      {comment.audio ? <VoiceMessageBubble audio={comment.audio} label={__msg("comments.voiceComment")} /> : null}
      <div className="wall-comment-actions">
        <button aria-label={__msg("system.WallCommentList.50f51c66e7", { value0: name })} aria-pressed={Boolean(selected)} className={selected ? "is-selected" : ""} disabled={reactingId === comment.id} onClick={() => setPicker(true)} ref={anchor} type="button">{selected ? <span aria-hidden="true">{selected.icon}</span> : <FiHeart aria-hidden="true" />}<span>{count}</span></button>
        <button onClick={() => onReply(comment)} type="button">{__msg("fan.reply")}</button>
        {String(author.id || author._id || "") !== String(userId || "") ? <>
          <button aria-label={__msg("system.WallCommentList.eab1801d81")} aria-pressed={Boolean(comment.viewerReposted)} className={comment.viewerReposted ? "is-selected" : ""} disabled={repostingId === comment.id} onClick={() => onRepost(comment)} type="button"><FiRepeat aria-hidden="true" /></button>
          <button aria-label={__msg("system.WallCommentList.d9f2284165", { value0: name })} className="wall-comment-more" onClick={() => onOpenOptions(comment)} title={__msg("system.FeedPost.dc57782ca4")} type="button"><FiMoreHorizontal aria-hidden="true" /></button>
        </> : null}
      </div>
      {children ? <div className="wall-comment-thread">{children}</div> : null}
    </div>
    {picker && !expanded ? <WallReactionTray anchorRef={anchor} options={options} selected={comment.viewerReaction} busy={reactingId === comment.id} onSelect={choose} onMore={() => setExpanded(true)} onClose={() => setPicker(false)} /> : null}
    {picker && expanded ? <div className="wall-comment-full-reactions" aria-label={__msg("system.WallCommentList.ccdd1713eb")} role="group">{options.map(option => <button aria-label={__msg("fanWeb.reaction_bfb553", { value0: comment.viewerReaction === option.key ? __msg("profile.remove") : __msg("fanWeb.send"), value1: option.label })} aria-pressed={comment.viewerReaction === option.key} key={option.key} onClick={() => choose(comment.viewerReaction === option.key ? "" : option.key)} type="button">{option.icon}</button>)}<button onClick={() => { setPicker(false); setExpanded(false); }} type="button">{__msg("activity.close")}</button></div> : null}
  </article>;
}

export default function WallCommentList({ comments, allComments, ...props }) {
  __useUiLanguage();
  const ids = new Set(comments.map(comment => String(comment.id)));
  const roots = comments.filter(comment => !comment.parentCommentId || !ids.has(String(comment.parentCommentId)));
  const render = (comment, ancestors = new Set()) => {
    // Guard against malformed historical data without hiding otherwise valid replies.
    if (ancestors.has(String(comment.id))) return null;
    const next = new Set([...ancestors, String(comment.id)]);
    const replies = comments.filter(item => String(item.parentCommentId || "") === String(comment.id));
    return <CommentRow key={comment.id} comment={comment} {...props}>{replies.length ? replies.map(reply => render(reply, next)) : null}</CommentRow>;
  };
  return <div className="seen-comments-list">{(allComments ? roots : roots.slice(-2)).map(comment => render(comment))}{!comments.length ? <p className="seen-comments-empty">{__msg("fanWeb.beTheFirstToComment")}</p> : null}</div>;
}
