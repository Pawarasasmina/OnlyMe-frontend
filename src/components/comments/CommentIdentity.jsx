import { Link } from "react-router-dom";
import { sameCommentAuthor } from "./commentIdentityUtils";

export function CommentReplyMention({ author, replyingAuthor }) {
  const username = String(author?.username || "").replace(/^@/, "");
  if (!username || sameCommentAuthor(author, replyingAuthor)) return null;
  return <Link className="comment-reply-mention" to={`/profile/${encodeURIComponent(username)}`}>@{username}</Link>;
}
