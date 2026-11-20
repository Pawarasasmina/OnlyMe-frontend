import { msg } from "../../i18n/runtime.js";
import { useLanguage } from "../../hooks/useLanguage.js";
import { createPortal } from "react-dom";
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiFlag, FiMoreHorizontal, FiTrash2 } from "react-icons/fi";
import { createLongPressGesture } from "../../utils/longPressGesture";
import { publicationService } from "../../services/publicationService";
import "./SeenCommentActions.css";

const reasons = [["SPAM", "social.spam"], ["HARASSMENT", "social.harassment"], ["HATE", "social.hate"], ["NUDITY", "social.nudity"], ["SEXUAL_CONTENT", "discover.sexualContent"], ["VIOLENCE", "discover.violence"], ["SELF_HARM", "system.SeenReaderPage.bea5831470"], ["SCAM", "discover.scam"], ["COPYRIGHT", "social.copyright"], ["IMPERSONATION", "system.SeenReaderPage.a66546f650"], ["CHILD_SAFETY", "system.SeenReaderPage.4873074e0d"], ["OTHER", "admin.other"]];

export default function SeenCommentActions({ children, comment, currentUser, publicationId, canModerate, onEngagementChange, ...articleProps }) {
  useLanguage();
  const [stage, setStage] = useState("");
  const articleRef = useRef(null);
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const viewerId = currentUser?.id || currentUser?._id;
  const own = Boolean(viewerId && String(comment.author?.id) === String(viewerId));
  const mutation = useMutation({
    mutationFn: (reason) => reason
      ? publicationService.reportSeenComment(publicationId, comment.id, { reason, accessToken: params.get("access") || params.get("token") || "" })
      : publicationService.removeSeenComment(publicationId, comment.id),
    onSuccess: (response, reason) => {
      if (reason) setStage("done");
      else {
        onEngagementChange?.(response.data.data.engagement);
        setStage("");
        queryClient.invalidateQueries({ queryKey: ["activity"] });
      }
    },
  });
  const reset = mutation.reset;
  const gesture = useMemo(() => createLongPressGesture({ onLongPress: () => { reset(); setStage("menu"); } }), [reset]);
  useEffect(() => () => gesture.dispose(), [gesture]);
  useEffect(() => {
    if (!stage) return undefined;
    const close = event => { if (event.key === "Escape") { event.stopPropagation(); if (!mutation.isPending) setStage(""); } };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [stage, mutation.isPending]);
  useEffect(() => {
    if (stage !== "menu") return undefined;
    const dismiss = event => {
      if (!articleRef.current?.contains(event.target) && !mutation.isPending) setStage("");
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [stage, mutation.isPending]);
  const open = () => { mutation.reset(); setStage("menu"); };
  return <>
    <article {...articleProps} ref={articleRef} className={`${articleProps.className || ""} seen-comment-has-actions ${stage === "menu" ? "is-comment-actions-open" : ""}`}
      onContextMenu={event => { if (viewerId && !event.target.closest("button, a, audio")) { event.preventDefault(); open(); } }}
      onPointerDown={event => { if (viewerId && !event.target.closest("button, a, audio")) gesture.start(event); }}
      onPointerMove={gesture.move} onPointerUp={gesture.end} onPointerCancel={gesture.cancel} onPointerLeave={gesture.cancel}
      onClickCapture={event => { const held = gesture.consumeClick(); if (held && !event.target.closest("button, a, audio")) { event.preventDefault(); event.stopPropagation(); } }}>
      {Children.map(children, child => {
        if (!isValidElement(child) || child.props.className !== "seen-comment-copy") return child;
        return cloneElement(child, {}, child.props.children, stage === "menu" ? <div className="seen-comment-inline-actions" role="group" aria-label={msg("system.FeedPost.dc57782ca4")}>
          {own || canModerate ? <button className="is-danger" disabled={mutation.isPending} onClick={() => mutation.mutate(null)} type="button">{mutation.isPending ? msg("fanWeb.deleting") : msg("posts.delete")}</button> : null}
          {!own ? <button disabled={mutation.isPending} onClick={() => setStage("report")} type="button">{msg("discover.report")}</button> : null}
          <button disabled={mutation.isPending} onClick={() => setStage("")} type="button">{msg("admin.cancel")}</button>
          {mutation.error ? <p role="alert">{mutation.error.response?.data?.message || msg("social.unableToCompleteThisAction")}</p> : null}
        </div> : null);
      })}
      {viewerId && stage !== "menu" ? <button className="seen-comment-more" aria-label={msg("system.FeedPost.dc57782ca4")} aria-haspopup="dialog" onClick={() => { mutation.reset(); setStage("options"); }} type="button"><FiMoreHorizontal /></button> : null}
    </article>
    {stage && stage !== "menu" ? createPortal(<div className="seen-comment-actions-layer" onPointerDown={event => event.stopPropagation()}>
      <button className="seen-comment-actions-scrim" aria-label={msg("system.FeedPost.f5508161f2")} disabled={mutation.isPending} onClick={() => setStage("")} type="button" />
      <section className="seen-feed-options-sheet seen-comment-actions-sheet" role="dialog" aria-modal="true" aria-label={stage === "report" ? msg("system.FeedPost.018f970ebb") : msg("system.FeedPost.dc57782ca4")}>
        <span aria-hidden="true" className="seen-feed-options-handle" />
        <h2>{stage === "options" ? msg("admin.comment") : stage === "done" ? msg("fanWeb.reportReceived") : msg("system.FeedPost.018f970ebb")}</h2>
        {stage === "options" ? <div className="seen-feed-options-list">
          {own || canModerate ? <button className="is-danger" disabled={mutation.isPending} onClick={() => mutation.mutate(null)} type="button"><FiTrash2 aria-hidden="true" /><span><b>{mutation.isPending ? msg("fanWeb.deleting") : msg("social.deleteComment")}</b></span></button> : null}
          {!own ? <button className="is-danger" onClick={() => setStage("report")} type="button"><FiFlag aria-hidden="true" /><span><b>{msg("discover.report")}</b></span></button> : null}
        </div> : stage === "report" ? <div className="seen-feed-options-list wall-comment-report-reasons">{reasons.map(([value, label]) => <button key={value} disabled={mutation.isPending} onClick={() => mutation.mutate(value)} type="button"><span><b>{msg(label)}</b></span></button>)}</div> : <div className="wall-comment-report-done"><p>{msg("system.FeedPost.5b74a3346f")}</p><button onClick={() => setStage("")} type="button">{msg("comments.done")}</button></div>}
        {mutation.error ? <p role="alert">{mutation.error.response?.data?.message || msg("social.unableToCompleteThisAction")}</p> : null}
      </section>
    </div>, document.body) : null}
  </>;
}
