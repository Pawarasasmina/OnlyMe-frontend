import { FiAlertCircle } from "react-icons/fi";

function EmptyState({ action, icon: Icon = FiAlertCircle, message, title = "Nothing here yet" }) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center" role="status">
      <Icon aria-hidden="true" className="mx-auto text-xl text-atseen-blue" />
      <p className="mt-3 font-semibold text-atseen-text">{title}</p>
      {message ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-atseen-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
