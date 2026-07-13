import { useEffect, useMemo, useState } from "react";
import { FiTrash2, FiUploadCloud } from "react-icons/fi";
import Button from "../common/Button";
import { resolveMediaUrl } from "../../utils/media";

function ImageUploader({ accept = "image/jpeg,image/png,image/webp", aspect = "square", disabled, label, onRemove, onUpload, value }) {
  const [preview, setPreview] = useState("");
  const imageUrl = preview || resolveMediaUrl(value);
  const frameClass =
    aspect === "cover"
      ? "h-36 w-full rounded-3xl"
      : "h-28 w-28 rounded-3xl";

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const inputId = useMemo(() => `upload-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [label]);

  const chooseFile = (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(file));
    onUpload(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-brand-mist/80">{label}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className={`${frameClass} overflow-hidden border border-white/10 bg-white/5`}>
          {imageUrl ? (
            <img alt="" className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-brand-mist/45">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input accept={accept} className="sr-only" disabled={disabled} id={inputId} onChange={chooseFile} type="file" />
          <label
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            htmlFor={inputId}
          >
            <FiUploadCloud />
            Upload
          </label>
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
    </div>
  );
}

export default ImageUploader;
