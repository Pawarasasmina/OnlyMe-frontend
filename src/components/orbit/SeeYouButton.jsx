import { FiEye } from "react-icons/fi";
import { useFanToast } from "../fanWeb/shared/FanToastContext";
import { useSendSeeYouSignal } from "../../hooks/useOrbit";

function SeeYouButton({ className = "", compact = false, disabled = false, hasSeenSignal, targetName, targetUserId }) {
  const { showToast } = useFanToast();
  const mutation = useSendSeeYouSignal();
  const seen = hasSeenSignal || mutation.isSuccess;

  const send = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (seen || disabled || mutation.isPending) return;

    try {
      await mutation.mutateAsync(targetUserId);
      showToast(`Private signal sent to ${targetName || "this light"}.`);
    } catch (error) {
      showToast(error?.response?.data?.message || "Unable to send that signal.");
    }
  };

  return (
    <button
      aria-label={seen ? `Seen signal sent to ${targetName}` : `Send private I see you signal to ${targetName}`}
      aria-pressed={seen}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        seen
          ? "border-atseen-blue/20 bg-atseen-blue/10 text-atseen-blue"
          : "border-atseen-line bg-atseen-surface-2 text-atseen-text hover:border-atseen-blue/50"
      } ${compact ? "px-2.5 py-1.5 text-[11px]" : ""} ${className}`}
      disabled={disabled || seen || mutation.isPending}
      onClick={send}
      type="button"
    >
      <FiEye aria-hidden="true" />
      {mutation.isPending ? "Sending" : seen ? "Seen" : "I see you"}
    </button>
  );
}

export default SeeYouButton;
