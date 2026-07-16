import { createContext, useContext } from "react";

export const FanToastContext = createContext({ showToast: () => {} });

export function useFanToast() {
  return useContext(FanToastContext);
}
