import { FiActivity, FiCheckCircle, FiEdit3, FiGrid, FiHome, FiMessageCircle, FiSettings, FiUser } from "react-icons/fi";
import OrbitIcon from "../fanWeb/OrbitIcon";

export const socialPrimaryNavItems = [
  { label: "Wall", to: "/wall", icon: FiHome },
  { label: "Seen", to: "/seen", icon: FiGrid },
  { label: "Orbit", to: "/orbit", icon: OrbitIcon },
  { label: "Messages", to: "/messages", icon: FiMessageCircle },
  { label: "Profile", to: "/profile", icon: FiUser },
];

export function socialSecondaryNavItems(capabilities) {
  const items = [{ label: "Activity", to: "/activity", icon: FiActivity }];

  if (capabilities.canCreate) items.push({ label: "Create", to: "/creator/content/new", icon: FiEdit3, emphasis: true });
  if (capabilities.canAccessStudio) items.push({ label: "Studio", to: "/studio", icon: FiGrid });
  if (capabilities.canAccessVerification && !capabilities.isApprovedCreator) {
    items.push({ label: "Verification", to: "/creator/verification", icon: FiCheckCircle, emphasis: true });
  }

  items.push({ label: "Settings", to: "/settings", icon: FiSettings });
  return items;
}
