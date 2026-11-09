import "./MinimalWorldIcon.css";

export default function MinimalWorldIcon({ className = "", size = 38 }) {
  return (
    <span
      aria-hidden="true"
      className={`minimal-world-icon ${className}`.trim()}
      style={{ "--minimal-world-icon-size": `${size}px` }}
    >
      <span className="minimal-world-icon-body" />
      <i className="minimal-world-icon-ring" />
    </span>
  );
}
