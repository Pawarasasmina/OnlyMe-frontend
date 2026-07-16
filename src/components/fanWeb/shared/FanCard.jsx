function FanCard({ as: Component = "section", children, className = "" }) {
  return (
    <Component className={`rounded-[20px] border border-atseen-line bg-atseen-surface p-4 ${className}`}>
      {children}
    </Component>
  );
}

export default FanCard;
