import { FiGlobe } from "react-icons/fi";

function PlanetSlot({ premium = false }) {
  return <div className="flex min-h-28 flex-col items-center justify-center rounded-full border border-dashed border-atseen-blue/25 bg-atseen-blue/[0.04] p-4 text-center"><FiGlobe className="text-2xl text-atseen-blue/60" /><p className="mt-2 text-xs font-bold text-atseen-text">Empty {premium ? "Premium World" : "World"} slot</p></div>;
}

export default PlanetSlot;
