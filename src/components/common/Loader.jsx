function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-brand-mist/80">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

export default Loader;
