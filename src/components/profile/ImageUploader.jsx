import { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiUploadCloud } from "react-icons/fi";
import Button from "../common/Button";
import { resolveMediaUrl } from "../../utils/media";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function ImageUploader({
  accept = "image/jpeg,image/png,image/webp",
  aspect = "square",
  disabled,
  error,
  label,
  maxSizeMb = aspect === "cover" ? 10 : 5,
  onRemove,
  onUpload,
  progress = 0,
  status,
  value,
}) {
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [localError, setLocalError] = useState("");
  const imageUrl = preview || resolveMediaUrl(value);
  const frameClass =
    aspect === "cover"
      ? "aspect-[8/3] w-full rounded-3xl"
      : "h-28 w-28 rounded-3xl";

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const inputId = useMemo(() => `upload-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [label]);

  const chooseFile = async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    if (!acceptedTypes.has(file.type)) {
      setLocalError("Please select a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setLocalError(`${aspect === "cover" ? "Cover image" : "Avatar"} must be smaller than ${maxSizeMb} MB.`);
      event.target.value = "";
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    setLocalError("");
    event.target.value = "";

    try {
      await onUpload(file);
      setSelectedFile(null);
    } catch {
      setLocalError("Upload failed. Please try again.");
    }
  };

  const cancelSelection = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setSelectedFile(null);
    setLocalError("");
  };

  const uploadSelected = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    setSelectedFile(null);
  };

  const statusText = localError || error || status || (selectedFile ? "Uploading selected image..." : "");

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-brand-mist/80">{label}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`${frameClass} overflow-hidden border border-white/10 bg-white/5`}>
          {imageUrl ? (
            <img alt={`${label} preview`} className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-brand-mist/45">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept={accept}
            aria-describedby={`${inputId}-status`}
            className="sr-only"
            disabled={disabled}
            id={inputId}
            onChange={chooseFile}
            type="file"
          />
          <label
            className={`inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            htmlFor={inputId}
          >
            <FiUploadCloud />
            Change
          </label>
          {selectedFile ? (
            <>
              <Button disabled={disabled} onClick={uploadSelected} type="button">
                {disabled ? "Uploading..." : "Retry upload"}
              </Button>
              <Button disabled={disabled} onClick={cancelSelection} type="button" variant="ghost">
                Cancel
              </Button>
            </>
          ) : null}
          {value ? (
            <Button disabled={disabled} onClick={onRemove} type="button" variant="ghost">
              <span className="inline-flex items-center gap-2">
                <FiTrash2 />
                Remove
              </span>
            </Button>
          ) : null}
        </div>
      </div>
      {progress > 0 && progress < 100 ? (
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {statusText ? (
        <p
          aria-live="polite"
          className={`text-sm ${localError || error ? "text-red-300" : "text-brand-mist/60"}`}
          id={`${inputId}-status`}
          role={localError || error ? "alert" : "status"}
        >
          {statusText}
        </p>
      ) : null}
    </div>
  );
}

export default ImageUploader;
