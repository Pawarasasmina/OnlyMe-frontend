import { systemMessage as __systemMessage } from "../../i18n/runtime.js";
import { getLocale as __uiLocale } from "../../i18n/runtime.js";
/* i18n-source-migrated */
import { msg as __msg } from "../../i18n/runtime.js";
import { useLanguage as __useUiLanguage } from "../../hooks/useLanguage.js";
import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiGift, FiMove, FiPlus, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";
import { adminService } from "../../services/adminService";

const empty = { name: "", stars: 50, categoryId: "", displayScale: 100, imagePositionX: 0, imagePositionY: 0, isActive: true, image: null };
const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400";
const imageTransform = (gift) => `translate(${Number(gift.imagePositionX || 0)}%, ${Number(gift.imagePositionY || 0)}%) scale(${Number(gift.displayScale || 100) / 100})`;

function GiftPreview({ gift, imageUrl }) {
  __useUiLanguage();
  return <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-center text-white">
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{__msg("admin.fanPopupPreview")}</p>
    <div className="mx-auto grid h-28 w-28 place-items-center overflow-visible"><img alt={gift.name || __msg("admin.giftPreview")} className="h-full w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,.5)]" src={imageUrl} style={{ transform: imageTransform(gift) }} /></div>
    <strong className="mt-3 block truncate text-sm">{gift.name || __msg("admin.giftName")}</strong>
    <small className="text-slate-400">✦{Number(gift.stars || 0).toLocaleString(__uiLocale())}</small>
  </div>;
}

function RangeControl({ displayValue, label, max, min, onChange, value }) {
  __useUiLanguage();
  return <label className="block text-sm font-semibold"><span className="flex justify-between"><span>{label}</span><span className="font-normal text-slate-400">{displayValue ?? value}</span></span><input className="mt-2 w-full accent-orange-500" max={max} min={min} onChange={onChange} type="range" value={value} /></label>;
}

function GiftForm({ categories, gift, onClose, onSaved }) {
  __useUiLanguage();
  const [form, setForm] = useState(gift ? { ...gift, categoryId: gift.category?.id || "", imagePositionX: gift.imagePositionX || 0, imagePositionY: gift.imagePositionY || 0, image: null } : { ...empty, categoryId: categories[0]?.id || "" });
  const [saving, setSaving] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState("");
  const localPreview = useMemo(() => form.image ? URL.createObjectURL(form.image) : "", [form.image]);
  useEffect(() => () => { if (localPreview) URL.revokeObjectURL(localPreview); }, [localPreview]);
  const imageUrl = localPreview || gift?.imageUrl;
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!imageUrl) return setError(__msg("admin.chooseAGiftImage"));
    setSaving(true); setError("");
    const data = new FormData();
    ["name", "stars", "categoryId", "displayScale", "imagePositionX", "imagePositionY", "isActive"].forEach((key) => data.append(key, form[key]));
    if (form.image) data.append("image", form.image);
    const uploadProgress = (e) => e.total && setProgress(Math.round(e.loaded * 100 / e.total));
    try { await (gift ? adminService.updateGift(gift.id, data, uploadProgress) : adminService.createGift(data, uploadProgress)); onSaved(); }
    catch (requestError) { setError(requestError.response?.data?.message || __msg("admin.giftCouldNotBeSaved")); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/60 sm:place-items-center sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
    <form className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" onSubmit={submit}>
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{gift ? __msg("admin.editGift") : __msg("admin.addGift")}</h2><p className="text-sm text-slate-500">{__msg("admin.uploadResizeAndPositionTheImageExactlyAsFans")}</p></div><button aria-label={__msg("activity.close")} disabled={saving} onClick={onClose} type="button"><FiX /></button></div>
      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_15rem]">
        <div className="space-y-4">
          <label className="block text-sm font-semibold">{__msg("admin.giftName")}<input className={fieldClass} maxLength={80} onChange={(e) => set("name", e.target.value)} required value={form.name} /></label>
          <label className="block text-sm font-semibold">{__msg("admin.starValue")}<input className={fieldClass} max={1000000} min={1} onChange={(e) => set("stars", e.target.value)} required type="number" value={form.stars} /></label>
          <label className="block text-sm font-semibold">{__msg("content.category")}<select className={fieldClass} onChange={(e) => set("categoryId", e.target.value)} required value={form.categoryId}><option value="" disabled>{__msg("profile.chooseACategory")}</option>{categories.filter((category) => category.isActive || category.id === form.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}{category.isActive ? "" : __msg("admin.hidden")}</option>)}</select></label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-black">{__msg("admin.imageFraming")}</p><p className="text-xs text-slate-500">{__msg("admin.moveAndResizeTheImageInsideItsGiftTile")}</p></div><button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600" onClick={() => setForm((current) => ({ ...current, displayScale: 100, imagePositionX: 0, imagePositionY: 0 }))} type="button">{__msg("admin.resetCenter")}</button></div>
            <div className="space-y-4"><RangeControl displayValue={`${form.displayScale}%`} label={__msg("admin.imageSize")} max={140} min={40} onChange={(e) => set("displayScale", e.target.value)} value={form.displayScale} /><RangeControl label={__msg("admin.horizontalPosition")} max={50} min={-50} onChange={(e) => set("imagePositionX", e.target.value)} value={form.imagePositionX} /><RangeControl label={__msg("admin.verticalPosition")} max={50} min={-50} onChange={(e) => set("imagePositionY", e.target.value)} value={form.imagePositionY} /></div>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm font-bold text-slate-600 hover:border-orange-300"><FiUploadCloud />{form.image ? form.image.name : gift ? __msg("admin.replaceImage") : __msg("admin.choosePngAnimatedWebpOrGif")}<input accept="image/png,image/webp,image/gif,image/jpeg" className="hidden" onChange={(e) => set("image", e.target.files?.[0] || null)} type="file" /></label>
          <p className="-mt-2 text-xs leading-5 text-slate-500">{__msg("admin.animatedWebpAndGifGiftsLoopAutomaticallyInThe")}</p>
          <label className="flex items-center gap-2 text-sm font-semibold"><input checked={Boolean(form.isActive)} onChange={(e) => set("isActive", e.target.checked)} type="checkbox" />{__msg("admin.visibleAndAvailableToFans")}</label>
        </div>
        {imageUrl ? <GiftPreview gift={form} imageUrl={imageUrl} /> : <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-400"><span><FiGift className="mx-auto mb-2 text-3xl" />{__msg("admin.imagePreview")}</span></div>}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{__systemMessage(error)}</p> : null}
      <div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold" disabled={saving} onClick={onClose} type="button">{__msg("admin.cancel")}</button><button className="rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white disabled:opacity-50" disabled={saving} type="submit">{saving ? __msg("admin.saving_409e3d", { value0: progress ? ` ${progress}%` : "…" }) : __msg("admin.saveGift")}</button></div>
    </form>
  </div>;
}

function CategoryManager({ categories, onChanged }) {
  __useUiLanguage();
  const [name, setName] = useState(""), [busy, setBusy] = useState(""), [error, setError] = useState("");
  const create = async (event) => { event.preventDefault(); if (!name.trim()) return; setBusy("new"); setError(""); try { await adminService.createGiftCategory(name.trim()); setName(""); await onChanged(); } catch (e) { setError(e.response?.data?.message || __msg("admin.categoryCouldNotBeCreated")); } finally { setBusy(""); } };
  const rename = async (category) => { const next = prompt(__msg("admin.categoryName"), category.name)?.trim(); if (!next || next === category.name) return; setBusy(category.id); setError(""); try { await adminService.updateGiftCategory(category.id, { name: next }); await onChanged(); } catch (e) { setError(e.response?.data?.message || __msg("admin.categoryCouldNotBeUpdated")); } finally { setBusy(""); } };
  const toggle = async (category) => { setBusy(category.id); setError(""); try { await adminService.updateGiftCategory(category.id, { isActive: !category.isActive }); await onChanged(); } catch (e) { setError(e.response?.data?.message || __msg("admin.categoryCouldNotBeUpdated")); } finally { setBusy(""); } };
  const remove = async (category) => { if (!confirm(`Delete “${category.name}”?`)) return; setBusy(category.id); setError(""); try { await adminService.deleteGiftCategory(category.id); await onChanged(); } catch (e) { setError(e.response?.data?.message || __msg("admin.categoryCouldNotBeDeleted")); } finally { setBusy(""); } };
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="font-black">{__msg("admin.giftCategories")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("admin.createAndManageTheSectionsFansSeeInThe")}</p></div><form className="mt-4 flex gap-2" onSubmit={create}><input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" maxLength={60} onChange={(event) => setName(event.target.value)} placeholder={__msg("admin.newCategoryName")} value={name} /><button className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50" disabled={busy === "new"} type="submit"><FiPlus className="inline" /> {__msg("publication.add")}</button></form>{error ? <p className="mt-3 text-sm text-red-600">{__systemMessage(error)}</p> : null}<div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${category.isActive ? "border-slate-200" : "border-slate-200 bg-slate-100 text-slate-400"}`} key={category.id}><b dir="auto">{category.name}</b><button disabled={busy === category.id} onClick={() => rename(category)} type="button"><FiEdit2 /></button><button className={category.isActive ? "text-emerald-600" : "text-slate-400"} disabled={busy === category.id} onClick={() => toggle(category)} type="button">{category.isActive ? __msg("admin.visible") : __msg("admin.hidden_d4c279")}</button><button className="text-red-500" disabled={busy === category.id} onClick={() => remove(category)} type="button"><FiTrash2 /></button></div>)}</div></section>;
}

function ArrangeGiftList({ gifts, onReorder, saving }) {
  __useUiLanguage();
  const [draggedId, setDraggedId] = useState("");
  const drop = (targetId) => {
    if (!draggedId || draggedId === targetId) return setDraggedId("");
    const next = [...gifts];
    const from = next.findIndex((gift) => gift.id === draggedId), to = next.findIndex((gift) => gift.id === targetId);
    if (from < 0 || to < 0) return setDraggedId("");
    const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setDraggedId(""); onReorder(next);
  };
  const sortByStars = (direction) => onReorder([...gifts].sort((a, b) => direction === "asc" ? a.stars - b.stars || a.name.localeCompare(b.name) : b.stars - a.stars || a.name.localeCompare(b.name)));
  return <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-black">{__msg("admin.arrangeGiftList")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("admin.dragPreviewsOrAutomaticallySortThemByStarValue")}</p></div><div className="flex flex-wrap items-center gap-2"><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50" disabled={saving} onClick={() => sortByStars("asc")} type="button">{__msg("admin.starsLowestFirst")}</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50" disabled={saving} onClick={() => sortByStars("desc")} type="button">{__msg("admin.starsHighestFirst")}</button><span className={`ms-1 text-xs font-bold ${saving ? "text-orange-500" : "text-emerald-600"}`}>{saving ? __msg("admin.savingOrder") : __msg("admin.orderSaved")}</span></div></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2">{gifts.map((gift, index) => <div aria-label={__msg("admin.dragToReorder", { value0: index + 1, value1: gift.name })} className={`group relative w-28 shrink-0 cursor-grab select-none rounded-2xl border p-2 text-center active:cursor-grabbing ${draggedId === gift.id ? "border-orange-400 bg-orange-50 opacity-60" : "border-slate-200 bg-slate-50 hover:border-orange-300"}`} draggable={!saving} key={gift.id} onDragEnd={() => setDraggedId("")} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(gift.id)} onDrop={() => drop(gift.id)}><span className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-black shadow">{index + 1}</span><FiMove className="absolute right-2 top-2 z-10 text-slate-400 group-hover:text-orange-500" /><div className="mx-auto grid h-20 w-20 place-items-center overflow-visible"><img alt="" className="h-full w-full object-contain drop-shadow-md" src={gift.imageUrl} style={{ transform: imageTransform(gift) }} /></div><strong dir="auto" className="mt-2 block truncate text-xs">{gift.name}</strong><small className="text-[10px] text-slate-500">✦{gift.stars.toLocaleString(__uiLocale())}</small></div>)}</div></section>;
}

export default function GiftManagementPage() {
  __useUiLanguage();
  const [gifts, setGifts] = useState([]), [categories, setCategories] = useState([]), [editing, setEditing] = useState(undefined), [formOpen, setFormOpen] = useState(false), [loading, setLoading] = useState(true), [reordering, setReordering] = useState(false), [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { const data = (await adminService.getGifts()).data.data; setGifts(data.gifts); setCategories(data.categories || []); } catch (e) { setError(e.response?.data?.message || __msg("admin.giftCatalogCouldNotBeLoaded")); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const open = (gift) => { setEditing(gift); setFormOpen(true); };
  const remove = async (gift) => { if (!confirm(__msg("admin.deleteValue0DeactivateItIfFansHaveAlready", { value0: gift.name }))) return; try { await adminService.deleteGift(gift.id); load(); } catch (e) { setError(e.response?.data?.message || __msg("admin.giftCouldNotBeDeleted")); } };
  const reorder = async (next) => { const previous = gifts; setGifts(next); setReordering(true); setError(""); try { setGifts((await adminService.reorderGifts(next.map((gift) => gift.id))).data.data.gifts); } catch (e) { setGifts(previous); setError(e.response?.data?.message || __msg("admin.giftOrderCouldNotBeSaved")); } finally { setReordering(false); } };
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-500">{__msg("admin.dreamSupport")}</p><h1 className="mt-1 text-3xl font-black">{__msg("layouts.giftCatalog")}</h1><p className="mt-2 text-sm text-slate-500">{__msg("admin.manageTheImageGiftsFansCanSendFromA")}</p></div><button className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-bold text-white" onClick={() => open(null)} type="button"><FiPlus />{__msg("admin.addGift")}</button></div>
    {error ? <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">{__systemMessage(error)}</p> : null}
    <CategoryManager categories={categories} onChanged={load} />
    {loading ? <p className="mt-8 text-slate-500">{__msg("stories.loadingGifts")}</p> : gifts.length ? <><ArrangeGiftList gifts={gifts} onReorder={reorder} saving={reordering} /><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{gifts.map((gift) => <article className={`rounded-2xl border bg-white p-4 shadow-sm ${gift.isActive ? "border-slate-200" : "border-slate-200 opacity-60"}`} key={gift.id}><div className="flex gap-4"><div className="grid h-24 w-24 shrink-0 place-items-center overflow-visible"><img alt={gift.name} className="h-full w-full object-contain drop-shadow-md" src={gift.imageUrl} style={{ transform: imageTransform(gift) }} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h2 dir="auto" className="truncate font-black">{gift.name}</h2><p className="mt-1 text-sm font-bold text-orange-600">✦{gift.stars.toLocaleString(__uiLocale())}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${gift.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{gift.isActive ? __msg("admin.active") : __msg("admin.hidden_1ba345")}</span></div><p className="mt-2 text-xs text-slate-400">{__msg("stories.size")} {gift.displayScale}{__msg("admin.position")} {gift.imagePositionX || 0}, {gift.imagePositionY || 0}</p><div className="mt-3 flex gap-3"><button className="inline-flex items-center gap-1 text-xs font-bold text-slate-600" onClick={() => open(gift)} type="button"><FiEdit2 />{__msg("profile.edit")}</button><button className="inline-flex items-center gap-1 text-xs font-bold text-red-500" onClick={() => remove(gift)} type="button"><FiTrash2 />{__msg("posts.delete")}</button></div></div></div></article>)}</div></> : <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center"><FiGift className="mx-auto text-4xl text-slate-300" /><h2 className="mt-3 font-black">{__msg("admin.noImageGiftsYet")}</h2><p className="mt-1 text-sm text-slate-500">{__msg("admin.addTheFirstGiftToMakeItAvailableIn")}</p></div>}
    {formOpen ? <GiftForm categories={categories} gift={editing} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); load(); }} /> : null}
  </div>;
}
