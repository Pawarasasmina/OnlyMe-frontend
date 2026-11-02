import { useLayoutEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import FanModal from "../fanWeb/shared/FanModal";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { storyService } from "../../services/storyService";
import { useAuth } from "../../hooks/useAuth";

export default function StoryMentionSheet({ item, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const id = item.target.id;
  const [bounds, setBounds] = useState({});
  useLayoutEffect(() => {
    const column = document.querySelector(".social-center-scroll");
    const update = () => { const rect = column?.getBoundingClientRect(); if (rect) setBounds({ left: rect.left, width: rect.width, right: "auto" }); };
    update();
    const observer = new ResizeObserver(update);
    if (column) observer.observe(column);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  const query = useQuery({ queryKey: ["stories", "detail", id], queryFn: () => storyService.getStory(id), retry: false, staleTime: 0 });
  const story = query.data;
  const owner = story?.owner || item.relatedCreator || {};
  const canReshare = story?.allowSharing && story.audience === "everyone" && !story.editorMetadata?.sourceStoryId && story.editorMetadata?.mentions?.some((mention) => String(mention.userId) === String(user?.id || user?._id));
  const open = (reshare) => { onClose(); navigate(`/stories/${id}${reshare ? "?reshare=1" : ""}`); };
  return <FanModal className="story-mention-detail" hideHeader isOpen onClose={onClose} overlayClassName="story-mention-detail-overlay" overlayStyle={bounds} title="Mentioned you in their story">
    <button aria-label="Close mention preview" className="story-mention-close" onClick={onClose} type="button">Close</button>
    {query.isPending ? <p role="status">Loading story…</p> : query.isError ? <div role="alert"><p>{[403, 404, 410].includes(query.error?.response?.status) ? "This story is no longer available to you." : "Could not load this story."}</p>{![403, 404, 410].includes(query.error?.response?.status) ? <button onClick={() => query.refetch()} type="button">Retry</button> : null}</div> : <>
      <div className="story-mention-detail-summary">
        <div className="story-mention-detail-frame">{story.mediaType === "video" ? <video aria-label="Mentioned story preview" muted playsInline preload="metadata" src={story.mediaUrl} /> : <img alt="Mentioned story preview" src={story.mediaUrl} />}{story.editorMetadata?.mentions?.map((mention) => <span aria-hidden="true" className={`story-mention-detail-tag ${mention.st === 1 ? "is-solid" : ""}`} key={mention.userId} style={{ left: `${mention.x ?? 50}%`, top: `${mention.y ?? 50}%`, transform: `translate(-50%,-50%) scale(${mention.scale || 1}) rotate(${mention.rotation || 0}deg)` }}><i>@</i>{mention.username}</span>)}</div>
        <div className="story-mention-detail-copy"><div className="story-mention-detail-author"><FanAvatar name={owner.name} size="h-[26px] w-[26px]" src={owner.avatarUrl || owner.avatar} /><b>{owner.name || owner.username}</b></div><h2>Mentioned you in their story</h2><p>{new Date(story.expiresAt).getFullYear() > 2100 ? "Story" : "Disappears in 24h"}</p></div>
      </div>
      {canReshare ? <button className="story-mention-detail-add" onClick={() => open(true)} type="button">Add to your story</button> : <p className="story-mention-detail-unavailable">This story cannot be reshared.</p>}
      <button className="story-mention-detail-view" onClick={() => open(false)} type="button">View story</button>
    </>}
  </FanModal>;
}
