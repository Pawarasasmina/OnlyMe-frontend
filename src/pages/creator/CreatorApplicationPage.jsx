import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";

function CreatorApplicationPage() {
  const { logout, user } = useAuth();
  const rejected = user?.creatorApprovalStatus === "rejected";

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center sm:p-12">
        {rejected ? <FiXCircle className="mx-auto text-6xl text-red-300" /> : <FiClock className="mx-auto text-6xl text-brand-secondary" />}
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-brand-secondary">Creator application</p>
        <h1 className="mt-3 text-3xl font-black">{rejected ? "Your application was not approved" : "Your application is under review"}</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-brand-mist/65">
          {rejected
            ? "An administrator rejected this creator application. Contact platform support if you believe this was a mistake."
            : "An administrator must approve your account before you can access Creator Studio, publish content, upload media, edit your creator profile, or view earnings."}
        </p>
        {!rejected && <div className="mx-auto mt-7 flex max-w-sm items-center gap-3 rounded-2xl bg-white/5 p-4 text-left text-sm text-brand-mist/70"><FiCheckCircle className="shrink-0 text-emerald-300" /> You can return after approval and sign in normally.</div>}
        <Button className="mt-8" onClick={logout} variant="ghost">Log out</Button>
      </section>
    </main>
  );
}

export default CreatorApplicationPage;
