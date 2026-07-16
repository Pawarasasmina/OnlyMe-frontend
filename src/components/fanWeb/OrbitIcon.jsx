function OrbitIcon(props) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.9" />
      <ellipse cx="12" cy="12" rx="9.5" ry="5" stroke="currentColor" strokeWidth="1.9" transform="rotate(-18 12 12)" />
    </svg>
  );
}

export default OrbitIcon;
