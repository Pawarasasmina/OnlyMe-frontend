import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { getMessageSocket } from "../../services/messageSocket";

export default function CreatorAnnouncementLiveNotice() {
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getMessageSocket();
    const receive = (announcement = {}) => {
      queryClient.invalidateQueries({ queryKey: ["fan", "activity"] });
      const open = () => {
        const target = String(announcement.actionUrl || "");
        if (target.startsWith("/")) navigate(target);
        else if (/^https?:\/\//i.test(target)) window.location.assign(target);
        else navigate("/activity");
      };
      showToast(announcement.message || "You have a new announcement.", { variant: "announcement", title: announcement.title || "New announcement", action: announcement.actionLabel || "View", onAction: open, duration: 7000 });
    };
    socket.on("creator-announcement:new", receive);
    return () => socket.off("creator-announcement:new", receive);
  }, [navigate, queryClient, showToast]);
  return null;
}
