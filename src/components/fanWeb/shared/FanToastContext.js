import { createContext, useContext } from "react";

export const FanToastContext = createContext({ showToast: () => {}, showGiftSequence: () => {} });

export function useFanToast() {
  return useContext(FanToastContext);
}
