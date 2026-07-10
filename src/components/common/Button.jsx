function Button({ children, className = "", variant = "primary", ...props }) {
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-orange-500",
    secondary: "bg-white/10 text-white hover:bg-white/20",
    ghost: "border border-white/15 text-white hover:bg-white/10",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
