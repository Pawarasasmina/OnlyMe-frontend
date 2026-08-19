import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiImage, FiMail, FiSave, FiTrash2 } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import { adminEmailTemplateService } from "../../services/adminEmailTemplateService";
import { resolveMediaUrl } from "../../utils/media";

const empty = { subject: "", heading: "", message: "", buttonLabel: "", footer: "", logoUrl: "" };

function Field({ label, maxLength, multiline = false, name, onChange, value }) {
  const controlClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  return <label className="block"><span className="text-sm font-bold text-slate-700">{label}</span>{multiline ? <textarea className={`${controlClass} min-h-28 resize-y`} maxLength={maxLength} name={name} onChange={onChange} value={value} /> : <input className={controlClass} maxLength={maxLength} name={name} onChange={onChange} value={value} />}<small className="mt-1 block text-right text-[10px] text-slate-400">{value.length}/{maxLength}</small></label>;
}

export default function WelcomeEmailSettingsPage() {
  const client = useQueryClient();
  const logoInput = useRef(null);
  const [form, setForm] = useState(empty);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["admin", "welcome-email"], queryFn: () => adminEmailTemplateService.getWelcome().then((response) => response.data.data.template) });

  useEffect(() => { if (query.data) setForm({ ...empty, ...query.data }); }, [query.data]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = new FormData();
      ["subject", "heading", "message", "buttonLabel", "footer"].forEach((key) => body.append(key, form[key]));
      if (logo) body.append("logo", logo);
      if (removeLogo) body.append("removeLogo", "true");
      return adminEmailTemplateService.updateWelcome(body);
    },
    onSuccess: (response) => {
      const template = response.data.data.template;
      client.setQueryData(["admin", "welcome-email"], template);
      setForm({ ...empty, ...template });
      setLogo(null); setLogoPreview(""); setRemoveLogo(false); setError(""); setMessage("Welcome email updated.");
    },
    onError: (requestError) => { setMessage(""); setError(requestError.response?.data?.message || "Unable to update the welcome email."); },
  });

  if (query.isLoading) return <Loader label="Loading welcome email..." />;
  if (query.isError) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Unable to load the welcome email template.</p>;
  const shownLogo = logoPreview || (!removeLogo ? resolveMediaUrl(form.logoUrl) : "");
  const firstName = "Alex";
  const previewHeading = form.heading.replaceAll("{{firstName}}", firstName);

  return <div className="mx-auto max-w-6xl">
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-500">Email settings</p><h1 className="mt-1 text-3xl font-black">Welcome email</h1><p className="mt-1 text-sm text-slate-500">Customize the email sent automatically when a new account is registered. Use <code>{"{{firstName}}"}</code> for the member&apos;s first name.</p></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => { event.preventDefault(); setError(""); setMessage(""); mutation.mutate(); }}>
        <Field label="Email subject" maxLength={160} name="subject" onChange={({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))} value={form.subject} />
        <Field label="Heading" maxLength={160} name="heading" onChange={({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))} value={form.heading} />
        <Field label="Welcome message" maxLength={1200} multiline name="message" onChange={({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))} value={form.message} />
        <Field label="Button label" maxLength={80} name="buttonLabel" onChange={({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))} value={form.buttonLabel} />
        <Field label="Footer" maxLength={500} multiline name="footer" onChange={({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))} value={form.footer} />
        <section className="rounded-2xl border border-slate-200 p-4"><h2 className="text-sm font-black">Email logo</h2><p className="mt-1 text-xs text-slate-500">Optional PNG, JPG, or WebP logo. A text @seen logo is used when empty.</p><div className="mt-4 flex flex-wrap items-center gap-3">{shownLogo ? <img alt="Email logo preview" className="h-16 max-w-[220px] rounded-lg border border-slate-200 bg-slate-50 object-contain p-2" src={shownLogo} /> : <span className="grid h-16 w-32 place-items-center rounded-lg bg-slate-900 font-black text-white">@<i className="not-italic text-blue-300">seen</i></span>}<input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (logoPreview) URL.revokeObjectURL(logoPreview); setLogo(file); setLogoPreview(URL.createObjectURL(file)); setRemoveLogo(false); }} ref={logoInput} type="file" /><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold" onClick={() => logoInput.current?.click()} type="button"><FiImage /> {shownLogo ? "Change logo" : "Add logo"}</button>{shownLogo ? <button className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50" onClick={() => { if (logoPreview) URL.revokeObjectURL(logoPreview); setLogo(null); setLogoPreview(""); setRemoveLogo(true); }} type="button"><FiTrash2 /> Remove</button> : null}</div></section>
        {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}{error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-50" disabled={mutation.isPending} type="submit"><FiSave /> {mutation.isPending ? "Saving..." : "Save welcome email"}</button>
      </form>
      <aside className="xl:sticky xl:top-24 xl:self-start"><p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">Email preview</p><div className="overflow-hidden rounded-3xl bg-[#06080b] p-4 shadow-xl"><div className="rounded-3xl border border-white/10 bg-[#12151b] p-7 text-white">{shownLogo ? <img alt="" className="max-h-16 max-w-[220px] object-contain" src={shownLogo} /> : <div className="text-2xl font-black">@<span className="text-[#9ccbff]">seen</span></div>}<p className="mt-9 text-[10px] font-black uppercase tracking-[0.16em] text-[#9ccbff]">Welcome to @seen</p><h2 className="mt-2 text-2xl font-black">{previewHeading}</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/65">{form.message}</p><span className="mt-6 inline-block rounded-full bg-[#9ccbff] px-5 py-3 text-xs font-black text-[#07101a]">{form.buttonLabel} →</span><div className="mt-7 border-t border-white/10 pt-5 text-[10px] leading-5 text-white/40">You received this because an @seen account was created with this email address.<br />{form.footer}</div></div></div><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><FiMail /> New registrations use the saved version immediately.</p></aside>
    </div>
  </div>;
}
