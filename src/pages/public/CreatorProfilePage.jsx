import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiExternalLink, FiMapPin } from "react-icons/fi";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { profileService } from "../../services/profileService";
import { resolveMediaUrl } from "../../utils/media";

function formatPrice(cents) {
  return `$${((cents || 0) / 100).toFixed(2)}`;
}

function CreatorProfilePage() {
  const { username } = useParams();
  const creatorQuery = useQuery({
    queryKey: ["public-creator", username],
    queryFn: () => profileService.getPublicCreator(username).then((response) => response.data.data),
    retry: false,
  });

  if (creatorQuery.isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Loader label="Loading creator profile..." />
      </section>
    );
  }

  if (creatorQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link className="inline-flex items-center gap-2 text-sm text-brand-mist/60" to="/">
          <FiArrowLeft /> All creators
        </Link>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-bold">Creator profile not available</h1>
          <p className="mt-2 text-brand-mist/70">This creator may not exist, may be private, or may be inactive.</p>
          <Button className="mt-6" onClick={() => creatorQuery.refetch()} type="button">Retry</Button>
        </div>
      </section>
    );
  }

  const { creator, posts = [] } = creatorQuery.data;
  const coverPhoto = resolveMediaUrl(creator.coverPhoto);
  const profilePhoto = resolveMediaUrl(creator.profilePhoto);
  const hasLocation = creator.city || creator.country;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link className="inline-flex items-center gap-2 text-sm text-brand-mist/60" to="/">
        <FiArrowLeft /> All creators
      </Link>
      <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
        <div className="h-48 bg-brand-dark sm:h-64">
          {coverPhoto ? <img alt={`${creator.displayName} cover`} className="h-full w-full object-cover" src={coverPhoto} /> : null}
        </div>
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="-mt-24 h-28 w-28 overflow-hidden rounded-3xl border-4 border-brand-slate bg-white/10">
              {profilePhoto ? (
                <img alt={creator.displayName} className="h-full w-full object-cover" src={profilePhoto} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                  {creator.displayName?.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black">{creator.displayName}</h1>
              {creator.isVerified ? <FiCheckCircle className="text-brand-secondary" title="Verified creator" /> : null}
            </div>
            <p className="mt-1 text-brand-mist/55">@{creator.username}</p>
            {creator.categories?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {creator.categories.map((category) => (
                  <span className="rounded-full bg-brand-primary/15 px-3 py-1 text-sm text-brand-secondary" key={category}>{category}</span>
                ))}
              </div>
            ) : null}
            {creator.bio ? <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-mist/75">{creator.bio}</p> : null}
            {hasLocation ? <p className="mt-5 inline-flex items-center gap-2 text-sm text-brand-mist/60"><FiMapPin /> {[creator.city, creator.country].filter(Boolean).join(", ")}</p> : null}
            {creator.socialLinks?.length ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {creator.socialLinks.map((link) => (
                  <a className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-brand-mist/80 hover:bg-white/15" href={link.url} key={`${link.platform}-${link.url}`} rel="noreferrer" target="_blank">
                    {link.platform} <FiExternalLink />
                  </a>
                ))}
              </div>
            ) : null}
            <div className="mt-10">
              <h2 className="text-2xl font-bold">Public posts</h2>
              {posts.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {posts.map((post) => <article className="rounded-3xl border border-white/10 bg-white/5 p-5" key={post.id}><h3 className="font-semibold">{post.title}</h3></article>)}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5 text-brand-mist/65">No public or free-preview posts are available yet.</p>
              )}
            </div>
          </div>
          <aside className="h-fit rounded-3xl border border-white/10 bg-brand-dark/60 p-6">
            <p className="text-sm text-brand-mist/60">Monthly membership</p>
            <p className="mt-2 text-4xl font-black">{formatPrice(creator.subscriptionPriceCents)}<span className="text-base font-normal text-brand-mist/50"> / month</span></p>
            <p className="mt-5 text-sm text-brand-mist/60">Subscription checkout is not enabled in this build, so no join action is shown.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default CreatorProfilePage;
