import { useParams } from "react-router-dom";
import Button from "../../components/common/Button";

function CreatorProfilePage() {
  const { username } = useParams();

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Creator profile</p>
        <h1 className="mt-4 text-4xl font-bold">@{username}</h1>
        <p className="mt-4 max-w-2xl text-brand-mist/80">
          This placeholder page is ready for creator bio, plans, featured content, and fan engagement modules.
        </p>
        <Button className="mt-8">Subscribe</Button>
      </div>
    </section>
  );
}

export default CreatorProfilePage;
