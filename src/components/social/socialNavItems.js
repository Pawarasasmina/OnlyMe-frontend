import { FiActivity, FiCheckCircle, FiCompass, FiEye, FiHome, FiMessageCircle, FiUser } from "react-icons/fi";

export const socialPrimaryNavItems = [
  { label: "Home", to: "/wall", icon: FiHome },
  { label: "Seen", to: "/seen", icon: FiEye },
  { label: "Discover", to: "/discover", icon: FiCompass },
  { label: "Messages", to: "/messages", icon: FiMessageCircle },
  { label: "Activity", to: "/activity", icon: FiActivity },
  { label: "Profile", to: "/profile", icon: FiUser },
];

export function socialSecondaryNavItems(capabilities) {
  const items = [];

  if (capabilities.canAccessVerification && !capabilities.isApprovedCreator) {
    items.push({ label: "Verification", to: "/creator/verification", icon: FiCheckCircle, emphasis: true });
  }

  return items;
}
