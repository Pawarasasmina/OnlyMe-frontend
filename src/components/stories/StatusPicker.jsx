/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheck, FiTrash2 } from "react-icons/fi";
import FanAvatar from "../fanWeb/shared/FanAvatar";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { CUSTOM_STATUS_PRESET_KEY, STATUS_LABEL_MAX_LENGTH, STATUS_PRESET_OPTIONS } from "../../constants/statusPresets";
import { useUpdateStatus } from "../../hooks/useStories";
import { resolveMediaUrl } from "../../utils/media";

const FEATURED_PRESETS = [
  "at_seen",
  "right_now",
  "at_gym",
  "coffee_break",
  "working",
  "traveling",
  "relaxing",
];

function StatusPicker({ activeStatus, isOpen, onClose, onStatusChange, profile }) {
  __useUiLanguage();
  const { showToast } = useFanToast();
  const updateStatus = useUpdateStatus();
  const [customEmoji, setCustomEmoji] = useState(activeStatus?.isCustom ? activeStatus.emoji : "\uD83D\uDC41");
  const [customLabel, setCustomLabel] = useState(activeStatus?.isCustom ? activeStatus.label : "");
  const [selectedPreset, setSelectedPreset] = useState(activeStatus?.isCustom ? CUSTOM_STATUS_PRESET_KEY : activeStatus?.presetKey || "right_now");
  const selectedPresetData = STATUS_PRESET_OPTIONS.find((preset) => preset.presetKey === selectedPreset);
  const selectedKey = activeStatus?.isCustom ? CUSTOM_STATUS_PRESET_KEY : activeStatus?.presetKey || "";

  const customReady = useMemo(() => customEmoji.trim() && customLabel.trim(), [customEmoji, customLabel]);
  const canPublish = selectedPreset === CUSTOM_STATUS_PRESET_KEY ? customReady : Boolean(selectedPresetData);

  useEffect(() => {
    if (!isOpen) return;
    setCustomEmoji(activeStatus?.isCustom ? activeStatus.emoji || "\uD83D\uDC41" : activeStatus?.emoji || "\uD83D\uDC41");
    setCustomLabel(activeStatus?.isCustom ? activeStatus.label || "" : activeStatus?.label || "");
    setSelectedPreset(activeStatus?.isCustom ? CUSTOM_STATUS_PRESET_KEY : activeStatus?.presetKey || "right_now");
  }, [activeStatus, isOpen]);

  const saveStatus = (payload) => {
    updateStatus.mutate(payload, {
      onError: (error) => showToast(error?.response?.data?.message || "Status could not be updated."),
      onSuccess: (nextStatus) => {
        onStatusChange?.(nextStatus?.label || "");
        showToast(nextStatus ? `Status: ${nextStatus.label}` : "Status cleared.");
        onClose();
      },
    });
  };

  const publish = () => {
    if (selectedPreset === CUSTOM_STATUS_PRESET_KEY) {
      if (!customReady) return;
      saveStatus({
        color: "#9CCBFF",
        emoji: customEmoji.trim(),
        isCustom: true,
        label: customLabel.trim(),
        presetKey: CUSTOM_STATUS_PRESET_KEY,
      });
      return;
    }
    if (selectedPresetData) saveStatus({ ...selectedPresetData, isCustom: false });
  };

  if (!isOpen) return null;
  const previewEmoji = selectedPreset === CUSTOM_STATUS_PRESET_KEY ? customEmoji : selectedPresetData?.emoji || activeStatus?.emoji || "\uD83D\uDC41";
  const previewLabel = selectedPreset === CUSTOM_STATUS_PRESET_KEY ? customLabel : selectedPresetData?.label || activeStatus?.label || __msg("constants.rightNow");
  const previewColor = selectedPreset === CUSTOM_STATUS_PRESET_KEY ? "#9CCBFF" : selectedPresetData?.color || activeStatus?.color || "#9CCBFF";
  const displayPresets = STATUS_PRESET_OPTIONS.filter((preset) => FEATURED_PRESETS.includes(preset.presetKey));

  return (
    <div aria-modal="true" className="status-picker-page" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="dialog">
      <section className="status-picker-panel" style={{ "--status-preview-color": previewColor }}>
        <header className="status-picker-header">
          <button aria-label={__msg("profile.backToProfile")} disabled={updateStatus.isPending} onClick={onClose} type="button"><FiArrowLeft data-ui-directional="true" /></button>
          <h2>{__msg("financial.status")}</h2>
        </header>

        <div className="status-picker-preview">
          <span className="status-picker-avatar">
            <FanAvatar name={profile?.displayName || profile?.username || "You"} size="h-[116px] w-[116px]" src={resolveMediaUrl(profile?.avatar)} />
            <i aria-hidden="true">{previewEmoji || "\uD83D\uDC41"}</i>
          </span>
          <label className="status-picker-compose">
            <span>{__msg("stories.rightNow")}</span>
            <input
              aria-label={__msg("stories.writeStatus")}
              maxLength={STATUS_LABEL_MAX_LENGTH}
              onChange={(event) => {
                setCustomLabel(event.target.value.replace(/[<>]/g, ""));
                setSelectedPreset(CUSTOM_STATUS_PRESET_KEY);
              }}
              placeholder={__msg("stories.writeAStatus")}
              value={customLabel}
            />
          </label>
          <p>{__msg("stories.seenByPeopleWhoOpenYourProfile")}</p>
        </div>

        <div className="status-picker-custom-line">
          <input aria-label={__msg("stories.statusEmoji")} maxLength={4} onChange={(event) => { setCustomEmoji(event.target.value); setSelectedPreset(CUSTOM_STATUS_PRESET_KEY); }} value={customEmoji} />
          <span>{previewLabel || __msg("stories.addYourStatusAbove")}</span>
        </div>

        <div className="status-picker-grid">
          {displayPresets.map((preset) => {
            const selected = selectedPreset === preset.presetKey || selectedKey === preset.presetKey;
            return (
              <button
                aria-pressed={selected}
                className={`status-picker-option ${selected ? "is-selected" : ""}`}
                disabled={updateStatus.isPending}
                key={preset.presetKey}
                onClick={() => {
                  setSelectedPreset(preset.presetKey);
                  setCustomEmoji(preset.emoji);
                  setCustomLabel(preset.label);
                }}
                style={{ "--status-option-color": preset.color }}
                type="button"
              >
                <span aria-hidden="true">{preset.emoji}</span>
                <strong>{preset.label}</strong>
                {selected ? <FiCheck aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="status-picker-actions">
          {activeStatus ? (
            <button className="status-picker-clear" disabled={updateStatus.isPending} onClick={() => saveStatus({ clear: true })} type="button">
              <FiTrash2 aria-hidden="true" />{__msg("stories.clearStatus")}</button>
          ) : null}
        </div>

        <button className="status-picker-show" disabled={!canPublish || updateStatus.isPending} onClick={publish} type="button">
          {updateStatus.isPending ? __msg("stories.showing") : __msg("stories.show")}
        </button>
      </section>
    </div>
  );
}

export default StatusPicker;
