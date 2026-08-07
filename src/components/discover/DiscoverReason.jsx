function DiscoverReason({ reason }) {
  if (!reason?.detail) return null;
  return (
    <div className="discover-reason">
      <span>{reason.label || "WHY YOU TWO"}</span>
      <b>{reason.detail}</b>
    </div>
  );
}

export default DiscoverReason;
