import { Navigate } from "react-router-dom";

export default function WithdrawPage() {
  return <Navigate replace to="/wallet?tab=income&withdraw=1" />;
}
