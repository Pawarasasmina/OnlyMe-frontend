import { FiActivity, FiGlobe, FiHome, FiMessageCircle, FiUser } from "react-icons/fi";
import OrbitIcon from "./OrbitIcon";

export const fanWebNavItems = [
  { label: "Home", to: "/fan/dashboard", icon: FiHome },
  { label: "Orbit", to: "/fan/orbit", icon: OrbitIcon },
  { label: "Worlds", to: "/fan/worlds", icon: FiGlobe },
  { label: "Messages", to: "/fan/messages", icon: FiMessageCircle },
  { label: "Activity", to: "/fan/activity", icon: FiActivity },
  { label: "Profile", to: "/fan/profile", icon: FiUser },
];
