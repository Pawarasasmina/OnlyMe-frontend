function AtseenLogo({ className = "", iconOnly = false, size = 30 }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        aria-hidden="true"
        className="shrink-0"
        height={Math.round(size * 0.625)}
        viewBox="0 0 64 40"
        width={size}
      >
        <path d="M2 20 C14 3 50 3 62 20 C50 37 14 37 2 20 Z" fill="#8AB8FF" />
        <circle cx="32" cy="20" fill="#0A0C0F" r="8.5" />
      </svg>
      {iconOnly ? null : <span className="text-[20px] font-extrabold tracking-[-0.03em] text-atseen-text">@seen</span>}
      <span className="sr-only">Atseen</span>
    </span>
  );
}

export default AtseenLogo;
