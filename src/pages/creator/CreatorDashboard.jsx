import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiLock } from "react-icons/fi";
import Loader from "../../components/common/Loader";
import VerificationStatusCard from "../../components/verification/VerificationStatusCard";
import { useAuth } from "../../hooks/useAuth";
import { verificationService } from "../../services/verificationService";

function CreatorDashboard() {
  const location = useLocation();
  const { setUser } = useAuth();
  const verificationQuery = useQuery({
    queryKey: ["creator", "verification"],
    queryFn: () => verificationService.getMine().then((response) => response.data.data),
    refetchOnMount: "always",
  });
  const data = verificationQuery.data;
  const verification = data?.verification;
  const approved = data?.creatorApprovalStatus === "approved" || verification?.status === "APPROVED";

  useEffect(() => {
    if (!data?.creatorApprovalStatus) return;
    setUser((current) => current ? { ...current, creatorApprovalStatus: data.creatorApprovalStatus } : current);
  }, [data?.creatorApprovalStatus, setUser]);

  return <div className="space-y-6">
    {location.state?.verificationSubmitted ? <div role="status" className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Your verification application was submitted for manual review.</div> : null}
    {location.state?.approvalRequired ? <div role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Creator verification approval is required to access that feature.</div> : null}
    {verificationQuery.isLoading ? <Loader label="Refreshing verification status..." /> : null}
    {verificationQuery.isError ? <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">Unable to load verification status. <button className="font-bold underline" onClick={() => verificationQuery.refetch()} type="button">Try again</button></div> : null}
    {verification ? <VerificationStatusCard verification={verification} /> : null}

    <div className="grid gap-4 md:grid-cols-3">
      {["Revenue", "Audience growth", "Scheduled content"].map((card) => <div key={card} className="relative rounded-3xl border border-white/10 bg-brand-dark/60 p-5"><h2 className="text-lg font-semibold">{card}</h2><p className="mt-2 text-sm text-brand-mist/70">{approved ? "No activity to display yet." : "Available after creator approval."}</p>{!approved ? <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-200"><FiLock /> Creator verification approval is required.</div> : null}</div>)}
    </div>
  </div>;
}

export default CreatorDashboard;
