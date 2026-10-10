import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DirectAccessSettingsSheet from "../../components/messages/DirectAccessSettingsSheet";
import { useAuth } from "../../hooks/useAuth";
import { messageService } from "../../services/messageService";

const defaultSettings = {
  enabled: false,
  priceStars: 100,
  callEnabled: false,
  callPriceStars: 500,
  callDurationMinutes: 5,
  callAutoDeclineAway: false,
};

function normalizeSettings(data = {}) {
  return {
    enabled: Boolean(data.enabled),
    priceStars: Number(data.priceStars || 100),
    callEnabled: Boolean(data.callEnabled),
    callPriceStars: Number(data.callPriceStars || 500),
    callDurationMinutes: Number(data.callDurationMinutes || 5),
    callAutoDeclineAway: Boolean(data.callAutoDeclineAway),
  };
}

export default function DirectAccessSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const creatorId = String(user?.id || user?._id || "");
  const [settings, setSettings] = useState(defaultSettings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["messages", "direct-access-settings"],
    queryFn: () => messageService.getDirectAccessOffer(creatorId).then((response) => response.data.data),
    enabled: Boolean(creatorId),
  });

  useEffect(() => {
    if (query.data) setSettings(normalizeSettings(query.data));
  }, [query.data]);

  const close = () => navigate("/settings/profile?from=settings");
  const save = async (nextSettings) => {
    setBusy(true);
    setError("");
    try {
      await messageService.updateDirectAccessSettings(nextSettings.enabled, Number(nextSettings.priceStars), nextSettings);
      setSettings(normalizeSettings(nextSettings));
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["profile", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      ]);
      close();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save Direct Access settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-screen min-h-screen">
      <DirectAccessSettingsSheet
        busy={busy || query.isLoading}
        error={query.isError ? "Could not load Direct Access settings." : error}
        onClose={close}
        onSave={save}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
}
