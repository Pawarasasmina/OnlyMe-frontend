let pending = 0;
const listeners = new Set();
const publish = () => listeners.forEach((listener) => listener());
export const subscribeRequests = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const pendingRequests = () => pending;
export function beginMonitoredRequest(config) {
  if (config._monitoringPending) return;
  config._monitoringPending = true;
  pending += 1; publish();
}
export function endMonitoredRequest(config) {
  if (!config?._monitoringPending) return;
  config._monitoringPending = false;
  pending = Math.max(0, pending - 1); publish();
}
