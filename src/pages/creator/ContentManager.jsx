import { useEffect, useRef, useState } from "react";
import { FiCheck, FiImage, FiPlus, FiStar, FiTrash2, FiX } from "react-icons/fi";
import Button from "../../components/common/Button";
import { contentService } from "../../services/contentService";

const MAX_IMAGES = 10;

function readError(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function ContentManager() {
  const inputRef = useRef(null);
  const imagesRef = useRef([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [mainImageId, setMainImageId] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    contentService
      .getMyContent()
      .then((response) => setItems(response.data.data.items || []))
      .catch((requestError) => setError(readError(requestError, "Unable to load content")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
  }, []);

  const addImages = (event) => {
    setError("");
    const chosen = Array.from(event.target.files || []);
    event.target.value = "";

    if (chosen.some((file) => !file.type.startsWith("image/"))) {
      setError("Only image files can be selected");
      return;
    }

    if (images.length + chosen.length > MAX_IMAGES) {
      setError(`You can upload a maximum of ${MAX_IMAGES} images`);
      return;
    }

    const added = chosen.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...added]);
    setMainImageId((current) => current || added[0]?.id || null);
  };

  const removeImage = (id) => {
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);

    const remaining = images.filter((image) => image.id !== id);
    setImages(remaining);
    if (mainImageId === id) setMainImageId(remaining[0]?.id || null);
  };

  const resetComposer = () => {
    images.forEach((image) => URL.revokeObjectURL(image.preview));
    setTopic("");
    setDescription("");
    setImages([]);
    setMainImageId(null);
    setComposerOpen(false);
  };

  const publish = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!topic.trim()) {
      setError("Add a topic before publishing");
      return;
    }
    if (!images.length || !mainImageId) {
      setError("Select at least one image and choose a main image");
      return;
    }

    setPublishing(true);
    try {
      const uploaded = await Promise.all(
        images.map(async (image) => {
          const asset = await contentService.uploadMedia(image.file);
          return {
            publicId: asset.public_id,
            url: asset.secure_url,
            width: asset.width,
            height: asset.height,
            format: asset.format,
            bytes: asset.bytes,
            isMain: image.id === mainImageId,
          };
        })
      );
      const response = await contentService.publishImageContent({
        topic: topic.trim(),
        description: description.trim(),
        images: uploaded,
      });

      setItems((current) => [response.data.data.content, ...current]);
      resetComposer();
      setSuccess("Your image content is now published");
    } catch (publishError) {
      setError(readError(publishError, "Publishing failed. Please try again."));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-secondary">Creator studio</p>
          <h2 className="mt-2 text-3xl font-black">Your content</h2>
          <p className="mt-2 text-sm text-brand-mist/60">Create image posts and publish them to your audience.</p>
        </div>
        {!composerOpen && (
          <Button className="gap-2" onClick={() => { setComposerOpen(true); setError(""); setSuccess(""); }}>
            <FiPlus /> New image content
          </Button>
        )}
      </div>

      {error && <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {success && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"><FiCheck /> {success}</div>}

      {composerOpen && (
        <form className="mt-7 rounded-3xl border border-white/10 bg-brand-dark/70 p-5 sm:p-7" onSubmit={publish}>
          <div className="flex items-center justify-between gap-4">
            <div><h3 className="text-xl font-bold">Create image content</h3><p className="mt-1 text-sm text-brand-mist/55">Add up to {MAX_IMAGES} images and mark one as the main image.</p></div>
            <button aria-label="Close composer" className="rounded-full p-2 text-brand-mist/60 hover:bg-white/10 hover:text-white" disabled={publishing} onClick={resetComposer} type="button"><FiX /></button>
          </div>

          <label className="mt-6 block text-sm font-semibold" htmlFor="content-topic">Topic</label>
          <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-brand-mist/30 focus:border-brand-primary" id="content-topic" maxLength={120} onChange={(event) => setTopic(event.target.value)} placeholder="What is this post about?" value={topic} />

          <label className="mt-5 block text-sm font-semibold" htmlFor="content-description">Description</label>
          <textarea className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-brand-mist/30 focus:border-brand-primary" id="content-description" maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder="Tell your audience more about these images..." value={description} />

          <div className="mt-6 flex items-center justify-between"><p className="text-sm font-semibold">Images</p><span className="text-xs text-brand-mist/45">{images.length}/{MAX_IMAGES}</span></div>
          <input accept="image/*" className="hidden" multiple onChange={addImages} ref={inputRef} type="file" />

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <div className={`group relative aspect-square overflow-hidden rounded-2xl border-2 ${mainImageId === image.id ? "border-brand-primary" : "border-white/10"}`} key={image.id}>
                <img alt="Selected upload preview" className="h-full w-full object-cover" src={image.preview} />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
                  <button className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${mainImageId === image.id ? "bg-brand-primary text-white" : "bg-black/60 text-white"}`} onClick={() => setMainImageId(image.id)} type="button"><FiStar /> {mainImageId === image.id ? "Main" : "Set main"}</button>
                  <button aria-label="Remove image" className="rounded-full bg-black/60 p-2 text-white hover:bg-red-500" onClick={() => removeImage(image.id)} type="button"><FiTrash2 /></button>
                </div>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <button className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 text-brand-mist/55 transition hover:border-brand-primary hover:text-white" onClick={() => inputRef.current?.click()} type="button"><FiImage className="text-3xl" /><span className="mt-2 text-xs font-semibold">Add images</span></button>
            )}
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button disabled={publishing} onClick={resetComposer} type="button" variant="ghost">Cancel</Button>
            <Button className="gap-2" disabled={publishing} type="submit">{publishing ? "Uploading & publishing..." : "Publish content"}</Button>
          </div>
        </form>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-brand-mist/55">Loading your content...</p>
        ) : items.length === 0 ? (
          <button className="flex min-h-56 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] text-brand-mist/60" onClick={() => setComposerOpen(true)} type="button"><FiPlus className="mb-3 text-3xl text-brand-primary" /><span className="font-semibold text-white">Create your first image post</span><span className="mt-1 text-xs">Your published content will appear here</span></button>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const mainImage = item.images?.find((image) => image.isMain) || item.images?.[0];
              return <article className="overflow-hidden rounded-3xl border border-white/10 bg-brand-dark/60" key={item._id}>
                {mainImage && <img alt={item.topic} className="aspect-[4/3] w-full object-cover" src={mainImage.url} />}
                <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{item.topic || item.title}</h3><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">{item.status}</span></div>{item.description && <p className="mt-2 line-clamp-3 text-sm text-brand-mist/55">{item.description}</p>}<p className="mt-4 text-xs text-brand-mist/40">{item.images?.length || 0} image{item.images?.length === 1 ? "" : "s"} · {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</p></div>
              </article>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentManager;
