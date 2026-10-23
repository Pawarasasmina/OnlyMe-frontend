import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fanService } from "../../../services/fanService";
import { useAuth } from "../../../hooks/useAuth";
import { useFanToast } from "./FanToastContext";
import FanModal from "./FanModal";
import FanAvatar from "./FanAvatar";

// The prototype's timed reply is a demo. Announce real creator activity only.
export default function GiftThanksNotice() {
  const { user } = useAuth();
  const { showToast } = useFanToast();
  const navigate = useNavigate();
  const shown = useRef(new Set());
  const [selected, setSelected] = useState(null);
  const activity = useQuery({
    queryKey: ["fan", "activity", "gift-thanks", user?.id],
    queryFn: () => fanService.getActivity({ direction: "received", filter: "support", limit: 30, page: 1 }).then((response) => response.data.data),
    enabled: Boolean(user?.id),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  useEffect(() => { shown.current = new Set(); setSelected(null); }, [user?.id]);
  useEffect(() => {
    const items = activity.data?.items || activity.data?.activity || [];
    const thanks = items.filter((item) => /gift.*thank|thank.*gift/i.test(item.type || "") && !item.read && !item.acknowledged && item.id && !shown.current.has(item.id));
    if (!thanks.length) return;
    thanks.forEach((item) => shown.current.add(item.id));
    const item = thanks[0];
    const creator = item.relatedCreator || item.actor || {};
    const name = String(creator.displayName || creator.name || creator.username || "The creator").split(" ")[0];
    showToast(item.preview || item.message || item.title || "Thank you for your gift.", {
      variant: "gift-thanks",
      title: `${name} thanked you`,
      avatar: creator.avatarUrl || creator.avatar,
      duration: 6000,
      onAction: () => setSelected(item),
    });
  }, [activity.data, navigate, showToast]);
  const creator = selected?.relatedCreator || selected?.actor || {};
  const name = creator.displayName || creator.name || creator.username || "The creator";
  return <FanModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Thanks for your gift" portal overlayClassName="!z-[250]">
    <div className="text-center">
      <FanAvatar name={name} src={creator.avatarUrl || creator.avatar} size="mx-auto h-24 w-24" />
      <p className="mt-6 text-xl font-bold">{selected?.preview || selected?.message || selected?.title || "Thank you for your gift."}</p>
      <p className="mt-3 text-sm text-atseen-muted">From {name}</p>
      <button className="mt-6 rounded-full bg-atseen-blue px-6 py-3 font-bold text-atseen-bg" onClick={() => { setSelected(null); navigate("/activity?filter=support"); }} type="button">View support activity</button>
    </div>
  </FanModal>;
}
