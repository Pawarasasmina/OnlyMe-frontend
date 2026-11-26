import { Link } from "react-router-dom";
export default function IncomeToCoinsPage() {
  return <main className="mx-auto max-w-lg p-6"><h1 className="text-xl font-bold">Creator earnings are withdrawal-only</h1><p className="mt-3">Fan coins and creator earnings are separate wallets. Earnings cannot be converted into spendable coins.</p><Link className="mt-5 inline-block font-bold underline" to="/wallet?tab=income">Back to creator earnings</Link></main>;
}