import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
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
  return item.name || item.title || __msg("profile.untitledSeries");
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
  __useUiLanguage();
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
      showToast(__msg("publication.in", { value0: seriesName(series) }));
      onClose();
    },
    onError: (requestError) => setError(publicationError(requestError, __msg("publication.unableToUpdateSeries"))),
  });

  const removeMutation = useMutation({
    mutationFn: () => seenId && currentId ? publicationService.removeSeenFromSeries(currentId, seenId) : Promise.resolve(),
    onSuccess: async () => {
      onSelected?.(null);
      await invalidate();
      showToast(__msg("publication.removedFromSeries"));
      onClose();
    },
    onError: (requestError) => setError(publicationError(requestError, __msg("publication.unableToRemoveFromSeries"))),
  });

  const createMutation = useMutation({
    mutationFn: (name) => publicationService.createSeries({ name }).then((response) => response.data.data.series),
    onSuccess: async (created) => {
      queryClient.setQueryData(["series", "mine"], (current = []) => [created, ...current.filter((item) => item.id !== created.id)]);
      setDraftName("");
      if (mode === "select") {
        onSelected?.(created);
        showToast(__msg("publication.seriesCreated", { value0: seriesName(created) }));
        onClose();
        return;
      }
      assignMutation.mutate(created);
    },
    onError: (requestError) => setError(publicationError(requestError, __msg("publication.unableToCreateSeries"))),
  });

  if (!isOpen) return null;

  const busy = assignMutation.isPending || removeMutation.isPending || createMutation.isPending;
  const create = (event) => {
    event.preventDefault();
    const name = normalizeName(draftName);
    if (!name) {
      setError(__msg("publication.seriesNameIsRequired"));
      return;
    }
    if (duplicateNames.has(name.toLowerCase())) {
      setError(__msg("publication.youAlreadyHaveASeriesWithThatName"));
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
      <section aria-label={__msg("publication.series")} className="profile-series-sheet" onMouseDown={(event) => event.stopPropagation()}>
        <span className="profile-series-handle" />
        <button aria-label={__msg("publication.closeSeries")} className="profile-series-close" disabled={busy} onClick={onClose} type="button"><FiX /></button>
        <h2>{__msg("publication.series")}</h2>
        <p>{__msg("publication.oneTapTheSeenJoinsTheBook")}</p>

        <div className="profile-series-list">
          {seriesQuery.isLoading ? <p className="seen-settings-empty">{__msg("publication.loadingSeries")}</p> : null}
          {seriesQuery.isError ? <button className="profile-series-error" onClick={() => seriesQuery.refetch()} type="button">{__msg("publication.unableToLoadSeriesRetry")}</button> : null}
          {!seriesQuery.isLoading && !seriesQuery.isError && !items.length ? <p className="seen-settings-empty">{__msg("publication.noSeriesYet")}</p> : null}
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
            aria-label={__msg("publication.newSeriesName")}
            disabled={busy}
            maxLength={SERIES_LIMIT}
            onChange={(event) => { setDraftName(event.target.value.slice(0, SERIES_LIMIT)); setError(""); }}
            placeholder={__msg("publication.newSeries")}
            value={draftName}
          />
          <button aria-label={__msg("publication.createSeries")} disabled={busy || !draftName.trim()} type="submit"><FiPlus /></button>
        </form>

        {error ? <p className="profile-series-error" role="alert">{__systemMessage(error)}</p> : null}
        <button className="profile-series-remove" disabled={busy || !currentId} onClick={clearSelection} type="button">{mode === "select" ? __msg("content.none") : __msg("publication.removeFromSeries", { value0: selectedName ? `: ${selectedName}` : "" })}</button>
      </section>
    </div>
  );
}
