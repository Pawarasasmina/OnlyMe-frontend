import { useEffect, useState } from "react";
import { messageService } from "../services/messageService";
import { getMessageSocket } from "../services/messageSocket";

export const UNREAD_MESSAGE_COUNT_EVENT = "atseen:unread-message-count";

export function useUnreadMessageCount(enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }
    let active = true;
    const refresh = async () => {
      try {
        const [conversationResponse, groupResponse] = await Promise.all([
          messageService.getConversations(),
          messageService.getGroups(),
        ]);
        if (!active) return;
        const conversations = conversationResponse.data.data.conversations || [];
        const groups = groupResponse.data.data.groups || [];
        const unreadDirectChats = conversations.filter((conversation) => (
          !conversation.muted && (Number(conversation.unreadCount) || 0) > 0
        )).length;
        const unreadGroups = groups.filter((group) => (
          !group.muted && (Number(group.unreadCount) || 0) > 0
        )).length;
        setCount(unreadDirectChats + unreadGroups);
      } catch {
        // Keep the last known count during a temporary connection failure.
      }
    };
    const socket = getMessageSocket();
    const applyPublishedCount = (event) => {
      const nextCount = Number(event.detail);
      if (Number.isSafeInteger(nextCount) && nextCount >= 0) setCount(nextCount);
    };
    refresh();
    const interval = window.setInterval(refresh, 3000);
    socket?.on("connect", refresh);
    socket?.on("message:new", refresh);
    socket?.on("group:message", refresh);
    socket?.on("conversation:status", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener(UNREAD_MESSAGE_COUNT_EVENT, applyPublishedCount);
    return () => {
      active = false;
      window.clearInterval(interval);
      socket?.off("connect", refresh);
      socket?.off("message:new", refresh);
      socket?.off("group:message", refresh);
      socket?.off("conversation:status", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener(UNREAD_MESSAGE_COUNT_EVENT, applyPublishedCount);
    };
  }, [enabled]);

  return count;
}
