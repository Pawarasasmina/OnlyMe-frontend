import { useMemo, useState } from "react";
import {
  FiBookmark,
  FiCheck,
  FiFlag,
  FiMessageCircle,
  FiMoreHorizontal,
  FiShare2,
} from "react-icons/fi";
import FanAvatar from "../shared/FanAvatar";
import FanModal from "../shared/FanModal";
import VerifiedBadge from "../shared/VerifiedBadge";
import { useFanToast } from "../shared/FanToastContext";
import { atseenCreators, atseenReportReasons } from "../../../data/atseenMockData";

function FeedPost({ post }) {
  const creator = atseenCreators[post.creatorId];
  const { showToast } = useFanToast();
  const [supported, setSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState(post.seededComments || []);
  const [commentText, setCommentText] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const handshakeCount = post.handshakes + (supported ? 1 : 0);
  const commentCount = post.comments + Math.max(0, comments.length - (post.seededComments || []).length);
  const atseenUrl = useMemo(() => `https://atseen.com/notes/${post.id}`, [post.id]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(atseenUrl);
      showToast("Link copied — atseen.com");
    } catch {
      showToast("Could not copy the link. Try again from your browser.");
    }
  };

  const submitComment = () => {
    const trimmed = commentText.trim();

    if (!trimmed) {
      showToast("Write one line first.");
      return;
    }

    setComments((current) => [...current, { id: `local-${Date.now()}`, creatorId: "me", text: trimmed }]);
    setCommentText("");
    showToast("Comment posted.");
  };

  const moreAction = (action) => {
    if (action === "save") {
      setSaved(true);
      showToast("Saved to your library.");
      setMoreOpen(false);
    }

    if (action === "share") {
      share();
      setMoreOpen(false);
    }

    if (action === "not-useful") {
      showToast("Thanks. We will tune your feed.");
      setMoreOpen(false);
    }

    if (action === "block") {
      showToast(`${creator.name.split(" ")[0]} is blocked. They will not know.`);
      setMoreOpen(false);
    }

    if (action === "report") {
      setMoreOpen(false);
      setReportOpen(true);
    }
  };

  return (
    <>
      <article className="border-b border-white/[0.05] py-[18px]">
        <div className="flex items-center gap-2.5">
          <button className="shrink-0" onClick={() => showToast(`${creator.name}'s profile preview opens from Orbit.`)} type="button">
            <FanAvatar name={creator.name} size="h-[38px] w-[38px]" src={creator.avatar} />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[13.5px] font-bold text-atseen-text">
              {creator.name}
              {creator.verified ? <VerifiedBadge /> : null}
            </p>
            <p className="text-[10.5px] text-atseen-muted">{post.timestamp}</p>
          </div>
          <span className="ml-auto whitespace-nowrap rounded-full border border-atseen-blue/20 bg-atseen-blue/10 px-2.5 py-1 text-[10px] font-bold text-atseen-blue">
            {post.contextEmoji} {post.context}
          </span>
          <button
            aria-label={`More actions for ${creator.name}'s post`}
            className="rounded-full p-1.5 text-atseen-dim transition hover:bg-atseen-surface-2 hover:text-white"
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <FiMoreHorizontal aria-hidden="true" />
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-7 text-white/90">{post.text}</p>
        {post.result ? (
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-atseen-success/25 bg-atseen-success/10 px-3 py-1.5 text-[11.5px] font-semibold text-atseen-success">
            <FiCheck aria-hidden="true" /> {post.result}
          </p>
        ) : null}
        {post.images?.length ? (
          <div className="mt-3 flex gap-2">
            {post.images.map((image) => (
              <img
                alt=""
                className="h-[150px] w-[150px] rounded-[13px] object-cover sm:h-[160px] sm:w-[160px]"
                key={image}
                src={image}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-5 text-[11.5px] font-semibold text-atseen-dim">
          <button
            className={`inline-flex items-center gap-1.5 transition hover:text-white ${supported ? "text-atseen-blue" : ""}`}
            onClick={() => setSupported((current) => !current)}
            type="button"
          >
            <span aria-hidden="true" className="text-sm">🤝</span>
            <span>{handshakeCount}</span>
          </button>
          <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={() => setCommentsOpen(true)} type="button">
            <FiMessageCircle aria-hidden="true" /> <span>{commentCount}</span>
          </button>
          <button className="inline-flex items-center gap-1.5 transition hover:text-white" onClick={share} type="button">
            <FiShare2 aria-hidden="true" /> <span>Share</span>
          </button>
          <button
            aria-label={saved ? "Remove saved post" : "Save post"}
            className={`ml-auto inline-flex items-center gap-1.5 transition hover:text-white ${saved ? "text-atseen-blue" : ""}`}
            onClick={() => {
              setSaved((current) => !current);
              showToast(saved ? "Removed from your library." : "Saved to your library.");
            }}
            type="button"
          >
            <FiBookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </article>

      <FanModal isOpen={commentsOpen} onClose={() => setCommentsOpen(false)} title={`Comments · ${commentCount}`}>
        <p className="border-b border-atseen-line pb-3 text-xs leading-5 text-atseen-muted">{post.text}</p>
        <div className="max-h-[330px] overflow-y-auto">
          {comments.map((comment) => {
            const commentCreator = comment.creatorId === "me" ? { name: "You" } : atseenCreators[comment.creatorId];

            return (
              <div className="flex gap-3 border-b border-white/[0.05] py-3" key={comment.id}>
                <FanAvatar name={commentCreator.name} size="h-8 w-8" src={commentCreator.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-atseen-text">{commentCreator.name}</p>
                  <p className="mt-1 text-sm leading-6 text-white/85">{comment.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-atseen-line bg-atseen-surface-2 px-4 py-3 text-sm text-white outline-none focus:border-atseen-blue"
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitComment();
              }
            }}
            placeholder="Say something real..."
            value={commentText}
          />
          <button
            className="rounded-xl bg-gradient-to-br from-atseen-blue to-atseen-blue-strong px-4 text-sm font-bold text-atseen-bg"
            onClick={submitComment}
            type="button"
          >
            Send
          </button>
        </div>
      </FanModal>

      <FanModal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="divide-y divide-white/[0.05]">
          {[
            ["save", "Save note", FiBookmark],
            ["share", "Share", FiShare2],
            ["not-useful", "Not useful", FiMoreHorizontal],
            ["report", "Report", FiFlag],
            ["block", `Block ${creator.name.split(" ")[0]}`, FiFlag],
          ].map(([key, label, Icon]) => (
            <button
              className={`flex w-full items-center gap-3 px-1 py-3 text-left text-sm font-semibold transition hover:text-atseen-blue ${
                key === "block" ? "text-atseen-danger" : "text-atseen-text"
              }`}
              key={key}
              onClick={() => moreAction(key)}
              type="button"
            >
              <Icon aria-hidden="true" className="text-atseen-muted" /> {label}
            </button>
          ))}
        </div>
      </FanModal>

      <FanModal isOpen={reportOpen} onClose={() => setReportOpen(false)} title={reportDone ? "Report received" : "Report note"}>
        {reportDone ? (
          <div className="text-center">
            <p className="text-sm leading-6 text-atseen-muted">
              Our team reviews every report. You will not be revealed as the reporter.
            </p>
            <button
              className="mt-5 rounded-xl border border-atseen-line px-5 py-3 text-sm font-bold text-atseen-text"
              onClick={() => {
                setReportOpen(false);
                setReportDone(false);
              }}
              type="button"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-atseen-muted">Why are you reporting this?</p>
            <div className="mt-2 divide-y divide-white/[0.05]">
              {atseenReportReasons.map((reason) => (
                <button
                  className="block w-full px-1 py-3 text-left text-sm font-semibold text-atseen-text transition hover:text-atseen-blue"
                  key={reason}
                  onClick={() => {
                    setReportDone(true);
                    showToast("Report submitted.");
                  }}
                  type="button"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}
      </FanModal>
    </>
  );
}

export default FeedPost;
