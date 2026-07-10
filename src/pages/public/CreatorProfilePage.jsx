import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiFileText, FiUsers } from "react-icons/fi";
import Button from "../../components/common/Button";
import { sampleCreators } from "../../data/sampleCreators";

function CreatorProfilePage() {
  const { username } = useParams();
  const creator = sampleCreators.find((item) => item.username === username) || sampleCreators[0];
  return <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
    <Link className="inline-flex items-center gap-2 text-sm text-brand-mist/60" to="/"><FiArrowLeft /> All creators</Link>
    <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5">
      <div className={`h-48 bg-gradient-to-r ${creator.accent}`} />
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className={`-mt-24 flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-brand-slate bg-gradient-to-br text-3xl font-black ${creator.accent}`}>{creator.initials}</div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-secondary">{creator.category}</p>
          <h1 className="mt-2 text-4xl font-black">{creator.name}</h1><p className="mt-1 text-brand-mist/55">@{creator.username}</p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-mist/75">{creator.bio}</p>
          <div className="mt-7 flex gap-6 text-sm text-brand-mist/60"><span className="inline-flex items-center gap-2"><FiUsers /> {creator.members} fans</span><span className="inline-flex items-center gap-2"><FiFileText /> {creator.posts} posts</span></div>
          <h2 className="mt-10 text-2xl font-bold">What members get</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{["Exclusive posts and videos", "Members-only live sessions", "Direct community updates", "Full archive access"].map((benefit) => <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm" key={benefit}><FiCheck className="text-brand-secondary" /> {benefit}</div>)}</div>
        </div>
        <aside className="h-fit rounded-3xl border border-white/10 bg-brand-dark/60 p-6"><p className="text-sm text-brand-mist/60">Monthly membership</p><p className="mt-2 text-4xl font-black">${creator.price}<span className="text-base font-normal text-brand-mist/50"> / month</span></p><Button className="mt-6 w-full">Join {creator.name.split(" ")[0]}</Button><p className="mt-4 text-center text-xs text-brand-mist/45">Cancel anytime. Your support goes directly to the creator.</p></aside>
      </div>
    </div>
  </section>;
}
export default CreatorProfilePage;
