import { FiActivity, FiBookmark, FiCheckCircle, FiCompass, FiCreditCard, FiEye, FiGrid, FiHome, FiMessageCircle, FiSettings, FiShoppingBag, FiStar, FiUser, FiUsers } from "react-icons/fi";

export const socialPrimaryNavItems = [
  { label: "Home", to: "/wall", icon: FiHome },
  { label: "Seen", to: "/seen", icon: FiEye },
  { label: "Discover", to: "/discover", icon: FiCompass },
  { label: "Messages", to: "/messages", icon: FiMessageCircle },
  { label: "Activity", to: "/activity", icon: FiActivity },
  { label: "Profile", to: "/profile", icon: FiUser },
];

export function socialSecondaryNavItems(capabilities) {
  const items = [
    { label: "Search", to: "/search", icon: FiUsers },
    { label: "Saved", to: "/saved", icon: FiBookmark },
    { label: "Wallet", to: "/wallet", icon: FiCreditCard },
    { label: "Purchases", to: "/purchases", icon: FiShoppingBag },
    { label: "Memberships", to: "/memberships", icon: FiStar },
  ];

  if (capabilities.canAccessStudio) items.push({ label: "Studio", to: "/studio", icon: FiGrid });
  if (capabilities.canAccessVerification && !capabilities.isApprovedCreator) {
    items.push({ label: "Verification", to: "/creator/verification", icon: FiCheckCircle, emphasis: true });
  }

  items.push({ label: "Settings", to: "/settings", icon: FiSettings });
  return items;
}
