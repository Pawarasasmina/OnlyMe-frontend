import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import { startScreenTiming } from "../../services/monitoring";
import { monitoringRoute } from "../../../shared/monitoringPrivacy.js";
import { subscribeRequests, pendingRequests } from "../../services/requestActivity";

export default function ScreenMonitoring() {
  const location = useLocation();
  const fetching = useIsFetching();
  const activeRequests = useSyncExternalStore(subscribeRequests, pendingRequests, () => 0);
  const span = useRef(null);
  useEffect(() => {
    span.current = startScreenTiming(monitoringRoute(location.pathname));
    const current = span.current;
    const timeout = setTimeout(() => { current.timeout(); if (span.current === current) span.current = null; }, 30000);
    return () => { clearTimeout(timeout); current.cancel(); span.current = null; };
  }, [location.key, location.pathname]);
  useEffect(() => {
    if (fetching || activeRequests) return undefined;
    // Wait for query subscriptions, React's commit and the next browser paint.
    const timer = setTimeout(() => { span.current?.end(); span.current = null; }, 200);
    return () => clearTimeout(timer);
  }, [fetching, activeRequests, location.key]);
  return null;
}
