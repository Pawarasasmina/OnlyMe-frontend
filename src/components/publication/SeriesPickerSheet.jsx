import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { publicationService } from "../../services/publicationService";
import { publicationError } from "../../utils/publicationValidation";

const SERIES_LIMIT = 24;

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, SERIES_LIMIT);
}

function seriesName(item = {}) {
  return item.name || item.title || "Untitled Series";
}

export default function SeriesPickerSheet({
  isOpen,
  mode = "assign",
  onClose,
  onSelected,
  seenId = "",
  selectedSeries = null,
  selectedSeriesId = "",
}) {
  const queryClient = useQueryClient();
  const { showToast } = useFanToast();
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const currentId = selectedSeriesId || selectedSeries?.id || "";
  const seriesQuery = useQuery({
    queryKey: ["series", "mine"],
    queryFn: () => publicationService.listMySeries().then((response) => response.data.data.items || []),
    enabled: isOpen,
    retry: false,
  });
  const items = useMemo(() => seriesQuery.data || [], [seriesQuery.data]);
  const selectedName = selectedSeries?.name || selectedSeries?.title || items.find((item) => item.id === currentId)?.name || "";
  const duplicateNames = useMemo(() => new Set(items.map((item) => seriesName(item).toLowerCase())), [items]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setDraftName("");
      setError("");
    }
  }, [isOpen]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["series"] }),
      queryClient.invalidateQueries({ queryKey: ["unified-profile"] }),
      seenId ? queryClient.invalidateQueries({ queryKey: ["seen-detail", seenId] }) : Promise.resolve(),
      seenId ? queryClient.invalidateQueries({ queryKey: ["seen-engagement", seenId] }) : Promise.resolve(),
    ]);
  };

  const assignMutation = useMutation({
    mutationFn: (series) => seenId ? publicationService.addSeenToSeries(series.id, seenId).then(() => series) : Promise.resolve(series),
    onSuccess: async (series) => {
      onSelected?.(series);
      await invalidate();
      showToast(`In "${seriesName(series)}" ✓`);
      onClose();
    },
    onError: (requestError) => setError(publicationError(requestError, "Unable to update Series")),
  });

  const removeMutation = useMutation({
    mutationFn: () => seenId && currentId ? publicationService.removeSeenFromSeries(currentId, seenId) : Promise.resolve(),
    onSuccess: async () => {
      onSelected?.(null);
      await invalidate();
      showToast("Removed from Series.");
      onClose();
    },
    onError: (requestError) => setError(publicationError(requestError, "Unable to remove from Series")),
  });

  const createMutation = useMutation({
    mutationFn: (name) => publicationService.createSeries({ name }).then((response) => response.data.data.series),
    onSuccess: async (created) => {
      queryClient.setQueryData(["series", "mine"], (current = []) => [created, ...current.filter((item) => item.id !== created.id)]);
      setDraftName("");
      if (mode === "select") {
        onSelected?.(created);
        showToast(`Series "${seriesName(created)}" created.`);
        onClose();
        return;
      }
      assignMutation.mutate(created);
    },
    onError: (requestError) => setError(publicationError(requestError, "Unable to create Series")),
  });

  if (!isOpen) return null;

  const busy = assignMutation.isPending || removeMutation.isPending || createMutation.isPending;
  const create = (event) => {
    event.preventDefault();
    const name = normalizeName(draftName);
    if (!name) {
      setError("Series name is required.");
      return;
    }
    if (duplicateNames.has(name.toLowerCase())) {
      setError("You already have a Series with that name.");
      return;
    }
    setError("");
    createMutation.mutate(name);
  };
  const choose = (item) => {
    setError("");
    if (mode === "select") {
      onSelected?.(item);
      onClose();
      return;
    }
    assignMutation.mutate(item);
  };
  const clearSelection = () => {
    setError("");
    if (mode === "select") {
      onSelected?.(null);
      onClose();
      return;
    }
    removeMutation.mutate();
  };

  return (
    <div aria-modal="true" className="profile-series-backdrop" onMouseDown={onClose} role="dialog">
      <section aria-label="Series" className="profile-series-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-series-handle" />
        <button aria-label="Close Series" className="profile-series-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
        <h2>Series</h2>
        <p>One tap - the Seen joins the book.</p>

        <div className="profile-series-list">
          {seriesQuery.isLoading ? <p className="seen-settings-empty">Loading Series...</p> : null}
          {seriesQuery.isError ? <button className="profile-series-error" onClick={() => seriesQuery.refetch()} type="button">Unable to load Series. Retry</button> : null}
          {!seriesQuery.isLoading && !seriesQuery.isError && !items.length ? <p className="seen-settings-empty">No Series yet.</p> : null}
          {items.map((item) => {
            const selected = item.id === currentId;
            return (
              <button aria-pressed={selected} className={`profile-series-pill ${selected ? "is-selected" : ""}`} disabled={busy} key={item.id} onClick={() => choose(item)} type="button">
                <span>{seriesName(item)}</span>
                {selected ? <FiCheck aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <form className="profile-series-create" onSubmit={create}>
          <input
            aria-label="New series name"
            disabled={busy}
            maxLength={SERIES_LIMIT}
            onChange={(event) => { setDraftName(event.target.value.slice(0, SERIES_LIMIT)); setError(""); }}
            placeholder="New series..."
            value={draftName}
          />
          <button aria-label="Create series" disabled={busy || !draftName.trim()} type="submit"><FiPlus /></button>
        </form>

        {error ? <p className="profile-series-error" role="alert">{error}</p> : null}
        <button className="profile-series-remove" disabled={busy || !currentId} onClick={clearSelection} type="button">{mode === "select" ? "None" : `Remove from series${selectedName ? `: ${selectedName}` : ""}`}</button>
      </section>
    </div>
  );
}
