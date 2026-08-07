import { useMemo, useState } from "react";
import { FiCheck, FiTrash2, FiX } from "react-icons/fi";
import FanModal from "../fanWeb/shared/FanModal";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { CUSTOM_STATUS_PRESET_KEY, STATUS_LABEL_MAX_LENGTH, STATUS_PRESET_OPTIONS } from "../../constants/statusPresets";
import { useUpdateStatus } from "../../hooks/useStories";

function StatusPicker({ activeStatus, isOpen, onClose, onStatusChange }) {
  const { showToast } = useFanToast();
  const updateStatus = useUpdateStatus();
  const [customEmoji, setCustomEmoji] = useState(activeStatus?.isCustom ? activeStatus.emoji : "\uD83D\uDC41");
  const [customLabel, setCustomLabel] = useState(activeStatus?.isCustom ? activeStatus.label : "");
  const selectedKey = activeStatus?.presetKey || "";

  const customReady = useMemo(() => customEmoji.trim() && customLabel.trim(), [customEmoji, customLabel]);

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

  return (
    <FanModal className="status-picker-modal" isOpen={isOpen} onClose={onClose} title="What are you seeing right now?">
      <div className="status-picker">
        <div className="status-picker-grid">
          {STATUS_PRESET_OPTIONS.map((preset) => {
            const selected = selectedKey === preset.presetKey && !activeStatus?.isCustom;
            return (
              <button
                aria-pressed={selected}
                className={`status-picker-option ${selected ? "is-selected" : ""}`}
                disabled={updateStatus.isPending}
                key={preset.presetKey}
                onClick={() => saveStatus({ ...preset, isCustom: false })}
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

        <div className="status-picker-custom">
          <label>
            <span>Emoji</span>
            <input aria-label="Custom status emoji" maxLength={4} onChange={(event) => setCustomEmoji(event.target.value)} value={customEmoji} />
          </label>
          <label>
            <span>Custom status</span>
            <input
              aria-label="Custom status text"
              maxLength={STATUS_LABEL_MAX_LENGTH}
              onChange={(event) => setCustomLabel(event.target.value.replace(/[<>]/g, ""))}
              placeholder="What are you seeing?"
              value={customLabel}
            />
          </label>
          <button
            className="status-picker-save"
            disabled={!customReady || updateStatus.isPending}
            onClick={() => saveStatus({
              color: "#9CCBFF",
              emoji: customEmoji.trim(),
              isCustom: true,
              label: customLabel.trim(),
              presetKey: CUSTOM_STATUS_PRESET_KEY,
            })}
            type="button"
          >
            Save
          </button>
        </div>

        <div className="status-picker-actions">
          {activeStatus ? (
            <button disabled={updateStatus.isPending} onClick={() => saveStatus({ clear: true })} type="button">
              <FiTrash2 aria-hidden="true" />
              Clear status
            </button>
          ) : null}
          <button onClick={onClose} type="button">
            <FiX aria-hidden="true" />
            Close
          </button>
        </div>
      </div>
    </FanModal>
  );
}

export default StatusPicker;
