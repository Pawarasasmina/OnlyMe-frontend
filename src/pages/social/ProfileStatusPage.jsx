import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import FanAvatar from "../../components/fanWeb/shared/FanAvatar";
import { useFanToast } from "../../components/fanWeb/shared/FanToastContext";
import { PROFILE_STATUS_SUGGESTIONS, STATUS_LABEL_MAX_LENGTH } from "../../constants/statusPresets";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

function updateCachedProfileStatus(queryClient, activeStatus) {
  queryClient.setQueriesData({ queryKey: ["unified-profile"] }, (current) => {
    if (!current?.profile) return current;
    if (!current.viewerCapabilities?.isOwner) return current;
    return {
      ...current,
      profile: {
        ...current.profile,
        activeStatus,
      },
    };
  });
}

function ProfileStatusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const inputRef = useRef(null);
  const [statusText, setStatusText] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");

  const profileQuery = useQuery({
    queryKey: ["unified-profile", "me"],
    queryFn: () => profileService.getUnifiedMe().then((response) => response.data.data),
    retry: false,
  });

  const profile = profileQuery.data?.profile;
  const savedStatus = profile?.activeStatus?.label || "";
  const selectedSuggestion = useMemo(
    () => PROFILE_STATUS_SUGGESTIONS.find((suggestion) => suggestion === statusText.trim()) || "",
    [statusText],
  );
  const remaining = STATUS_LABEL_MAX_LENGTH - Array.from(statusText).length;
  const changed = statusText !== savedStatus;
  const canShow = Boolean(statusText.trim()) && remaining >= 0 && !profileQuery.isLoading;

  useEffect(() => {
    if (!profile || touched) return;
    setStatusText(savedStatus);
  }, [profile, savedStatus, touched]);

  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    const timer = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [profileQuery.isSuccess]);

  const saveStatus = useMutation({
    mutationFn: (payload) => profileService.updateStatus(payload).then((response) => response.data.data.activeStatus),
    onError: (requestError) => {
      setError(requestError.response?.data?.message || "Status could not be updated.");
      inputRef.current?.focus();
    },
    onSuccess: (activeStatus) => {
      updateCachedProfileStatus(queryClient, activeStatus || null);
      queryClient.invalidateQueries({ queryKey: ["unified-profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] });
      showToast(activeStatus ? "Now it's seen" : "Status removed");
      navigate("/profile", { replace: true });
    },
  });

  const leave = () => {
    if (changed && !saveStatus.isPending && !window.confirm("Discard your status changes?")) return;
    navigate("/profile");
  };

  const submit = (event) => {
    event.preventDefault();
    const normalized = statusText.trim();
    if (!normalized) {
      setError("Type a status before showing it.");
      inputRef.current?.focus();
      return;
    }
    if (Array.from(normalized).length > STATUS_LABEL_MAX_LENGTH) {
      setError(`Status must be ${STATUS_LABEL_MAX_LENGTH} characters or fewer.`);
      inputRef.current?.focus();
      return;
    }
    setError("");
    saveStatus.mutate({ status: normalized });
  };

  const clearStatus = () => {
    if (!savedStatus) return;
    setError("");
    saveStatus.mutate({ clear: true });
  };

  if (profileQuery.isLoading) {
    return (
      <section className="profile-status-route">
        <header className="profile-status-header">
          <button aria-label="Back to profile" className="profile-status-back" onClick={leave} type="button"><FiArrowLeft /></button>
          <h1>Status</h1>
        </header>
        <div className="profile-status-loading" role="status">Loading status...</div>
      </section>
    );
  }

  if (profileQuery.isError) {
    return (
      <section className="profile-status-route">
        <header className="profile-status-header">
          <button aria-label="Back to profile" className="profile-status-back" onClick={leave} type="button"><FiArrowLeft /></button>
          <h1>Status</h1>
        </header>
        <div className="profile-status-error-panel">
          <p>Unable to load your profile status.</p>
          <button onClick={() => profileQuery.refetch()} type="button">Retry</button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-status-route">
      <header className="profile-status-header">
        <button aria-label="Back to profile" className="profile-status-back" disabled={saveStatus.isPending} onClick={leave} type="button"><FiArrowLeft /></button>
        <h1>Status</h1>
      </header>

      <form className="profile-status-form" onSubmit={submit}>
        <div className="profile-status-avatar-ring">
          <FanAvatar alt={`${profile?.displayName || "Your"} avatar`} name={profile?.displayName || profile?.username || "You"} size="h-[112px] w-[112px]" src={resolveMediaUrl(profile?.avatar)} />
        </div>

        <label className="sr-only" htmlFor="profile-status-input">Right now status</label>
        <input
          aria-describedby={`profile-status-help${error ? " profile-status-error" : ""}`}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className="profile-status-input"
          disabled={saveStatus.isPending}
          id="profile-status-input"
          maxLength={STATUS_LABEL_MAX_LENGTH + 1}
          onChange={(event) => {
            setTouched(true);
            setError("");
            setStatusText(event.target.value);
          }}
          placeholder="Right now..."
          ref={inputRef}
          type="text"
          value={statusText}
        />
        <span aria-hidden="true" className="profile-status-underline" />
        <p className="profile-status-helper" id="profile-status-help">seen by people who open your profile</p>
        {remaining <= 20 ? <p className={`profile-status-count ${remaining < 0 ? "is-over" : ""}`}>{remaining} characters left</p> : null}
        {error ? <p className="profile-status-error" id="profile-status-error">{error}</p> : null}

        <div aria-label="Suggested statuses" className="profile-status-suggestions">
          {PROFILE_STATUS_SUGGESTIONS.map((suggestion) => {
            const selected = selectedSuggestion === suggestion;
            return (
              <button
                aria-pressed={selected}
                className={`profile-status-chip ${selected ? "is-selected" : ""}`}
                disabled={saveStatus.isPending}
                key={suggestion}
                onClick={() => {
                  setTouched(true);
                  setError("");
                  setStatusText(suggestion);
                  window.setTimeout(() => {
                    inputRef.current?.focus();
                    inputRef.current?.setSelectionRange(suggestion.length, suggestion.length);
                  }, 0);
                }}
                type="button"
              >
                {suggestion}
              </button>
            );
          })}
        </div>

        {savedStatus ? (
          <button className="profile-status-clear" disabled={saveStatus.isPending} onClick={clearStatus} type="button">Clear status</button>
        ) : null}

        <button className="profile-status-show" disabled={!canShow || saveStatus.isPending} type="submit">
          {saveStatus.isPending ? "Showing..." : "Show"}
        </button>
      </form>
    </section>
  );
}

export default ProfileStatusPage;
