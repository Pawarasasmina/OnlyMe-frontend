import { Link } from "react-router-dom";
import { sameCommentAuthor } from "./commentIdentityUtils";

export function CommentAuthorIdentity({ author, fallback = "User" }) {
  const username = String(author?.username || "").replace(/^@/, "");
  if (!username) return <strong>{fallback}</strong>;
  return <Link className="comment-author-identity" to={`/profile/${encodeURIComponent(username)}`}><bdi dir="ltr"><i className="identity-at">@</i>{username}</bdi></Link>;
}

export function CommentReplyMention({ author, replyingAuthor }) {
  const username = String(author?.username || "").replace(/^@/, "");
  if (!username || sameCommentAuthor(author, replyingAuthor)) return null;
  return <Link className="comment-reply-mention" to={`/profile/${encodeURIComponent(username)}`}><bdi dir="ltr"><i className="identity-at">@</i>{username}</bdi></Link>;
}
