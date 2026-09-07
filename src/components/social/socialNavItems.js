import { createElement } from "react";
import { FiCheckCircle, FiEye, FiHeart, FiMessageCircle, FiUser } from "react-icons/fi";

export function DiscoverNavIcon(props) {
  return createElement("svg", { fill: "none", viewBox: "0 0 24 24", ...props },
    createElement("rect", { height: "12.5", key: "top", rx: "2.6", stroke: "currentColor", strokeWidth: "1.8", width: "8", x: "3.5", y: "3" }),
    createElement("rect", { height: "12.5", key: "bottom", rx: "2.6", stroke: "currentColor", strokeWidth: "1.8", width: "8", x: "12.5", y: "8.5" })
  );
}

export function WallNavIcon(props) {
  return createElement("svg", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24", ...props },
    createElement("rect", { height: "12.5", key: "screen", rx: "3", stroke: "currentColor", strokeWidth: "1.8", width: "17", x: "3.5", y: "4" }),
    createElement("path", { d: "M9 20.5h6", key: "base", stroke: "currentColor", strokeWidth: "1.8" })
  );
}

export const socialPrimaryNavItems = [
  { label: "Seen", to: "/seen", icon: FiEye },
  { label: "Discover", to: "/discover", icon: DiscoverNavIcon },
  { label: "Wall", to: "/wall", icon: WallNavIcon },
  { label: "Messages", to: "/messages", icon: FiMessageCircle },
  { label: "Activity", to: "/activity", icon: FiHeart },
  { label: "Profile", to: "/profile", icon: FiUser },
];

export function socialSecondaryNavItems(capabilities) {
  const items = [];

  if (capabilities.canAccessVerification && !capabilities.isApprovedCreator) {
    items.push({ label: "Verification", to: "/creator/verification", icon: FiCheckCircle, emphasis: true });
  }

  return items;
}
