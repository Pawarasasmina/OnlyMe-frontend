import { FiClock } from "react-icons/fi";
import FanCard from "../../components/fanWeb/shared/FanCard";

function UnavailableFeaturePage({ description, title }) {
  return (
    <div>
      <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-atseen-text">{title}</h1>
      <FanCard className="mt-5 text-center">
        <FiClock className="mx-auto h-8 w-8 text-atseen-blue" />
        <h2 className="mt-3 text-base font-bold text-atseen-text">Not available yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-atseen-muted">{description}</p>
      </FanCard>
    </div>
  );
}

export default UnavailableFeaturePage;
