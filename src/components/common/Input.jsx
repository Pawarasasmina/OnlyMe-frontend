function Input({ label, className = "", ...props }) {
  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm text-brand-mist/80">{label}</span> : null}
      <input
        className={`w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/40 focus:border-brand-primary ${className}`}
        {...props}
      />
    </label>
  );
}

export default Input;
