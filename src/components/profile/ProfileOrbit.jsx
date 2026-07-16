import PlanetSlot from "./PlanetSlot";

function ProfileOrbit({ capabilities, planets = [], role }) {
  if (planets.length) return null;
  if (!capabilities.isOwner || role !== "creator") return null;
  return (
    <section className="mt-5 overflow-hidden rounded-[22px] border border-atseen-line bg-[radial-gradient(70%_90%_at_50%_45%,#101b2c,#06080b_75%)] p-5">
      <div className="text-center"><h2 className="text-sm font-bold">Your planet orbit</h2><p className="mt-1 text-xs text-atseen-muted">World creation will be available in a later phase.</p></div>
      <div className="mx-auto mt-5 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-3"><PlanetSlot /><PlanetSlot /><PlanetSlot premium /></div>
    </section>
  );
}

export default ProfileOrbit;
