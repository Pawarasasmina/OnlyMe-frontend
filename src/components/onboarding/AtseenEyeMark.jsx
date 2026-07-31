function AtseenEyeMark({ className = "h-28 w-44" }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[#9CCBFF]/10 blur-2xl" />
      <svg className="relative h-full w-full animate-[atseen-eye-pulse_2.8s_ease-in-out_infinite]" viewBox="0 0 160 100">
        <path d="M8 50 C38 10 122 10 152 50 C122 90 38 90 8 50 Z" fill="rgba(156,203,255,.92)" />
        <circle cx="80" cy="50" fill="#0A0C0F" r="21" />
        <circle cx="86" cy="43" fill="#FFFFFF" r="5" opacity=".8" />
      </svg>
    </div>
  );
}

export default AtseenEyeMark;
