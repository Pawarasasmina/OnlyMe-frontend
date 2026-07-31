import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { socialCapabilitiesFor } from "../utils/socialAccess";

export function useSocialCapabilities() {
  const { user } = useAuth();
  return useMemo(() => socialCapabilitiesFor(user), [user]);
}
