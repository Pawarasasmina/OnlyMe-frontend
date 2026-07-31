const rings = [
  ["82%", "50%"],
  ["62%", "37%"],
  ["42%", "25%"],
];

const stars = [
  [12, 14],
  [88, 20],
  [7, 55],
  [93, 64],
  [24, 90],
  [70, 92],
  [45, 6],
  [58, 95],
];

function OrbitRings() {
  return (
    <>
      {rings.map(([width, height]) => (
        <div className="atseen-orbit-ring" key={`${width}-${height}`} style={{ width, height }} />
      ))}
      {stars.map(([left, top], index) => (
        <span
          className="atseen-twinkle absolute h-[2.5px] w-[2.5px] rounded-full bg-atseen-blue"
          key={`${left}-${top}`}
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${index * 0.25}s` }}
        />
      ))}
    </>
  );
}

export default OrbitRings;
