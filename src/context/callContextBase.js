import { createContext, useContext } from "react";

export const CallContext = createContext({ startCall: () => {}, activeCall: null });
export const useCalls = () => useContext(CallContext);
