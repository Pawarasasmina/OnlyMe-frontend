import { Link } from "react-router-dom";

function DiscoverContextStack({ dream, profileRoute, quote }) {
  if (!quote && !dream) return null;
  return (
    <div className="discover-context-stack">
      {quote ? <Link className="discover-quote" to={profileRoute}>&quot;{quote}&quot;</Link> : null}
      {dream ? (
        <Link className="discover-dream" to={profileRoute}>
          {dream.emoji ? <span aria-hidden="true">{dream.emoji}</span> : null}
          <span>Dreams of <b>{dream.title}</b></span>
        </Link>
      ) : null}
    </div>
  );
}

export default DiscoverContextStack;
