import { FiBriefcase, FiStar, FiUser } from "react-icons/fi";

const types = [
  { id: "personal", title: "Personal", icon: FiUser, copy: "Share your life and follow people. You can still earn from gifts and Paid Seens." },
  { id: "creator", title: "Creator", icon: FiStar, copy: "For people building an audience. Adds World, Direct Access, Grow and insights." },
  { id: "business", title: "Business", icon: FiBriefcase, copy: "For brands, shops and places. Creator tools, plus Call, Directions, Website and offers." },
];

export default function AccountTypePicker({ onChange, value }) {
  return <div className="grid gap-3">{types.map(({ id, title, icon: Icon, copy }) => {
    const selected = value === id;
    return <button aria-pressed={selected} className={`flex w-full items-start gap-4 rounded-2xl p-4 text-left transition active:scale-[.97] ${selected ? "border border-[#9CCBFF]/60 bg-[#9CCBFF]/10" : "border border-white/10 bg-white/[.04]"}`} key={id} onClick={() => onChange(id)} type="button">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${selected ? "bg-[#9CCBFF]/15 text-[#BFE3FF]" : "bg-white/[.06] text-white/55"}`}><Icon /></span>
      <span className="min-w-0 flex-1"><b className="block text-[15px] text-white">{title}</b><small className="mt-1 block text-[12.5px] leading-5 text-white/55">{copy}</small></span>
      <span className={`mt-2 h-5 w-5 shrink-0 rounded-full ${selected ? "bg-[#9CCBFF] shadow-[inset_0_0_0_5px_#0E1520]" : "border border-white/25"}`} />
    </button>;
  })}</div>;
}
