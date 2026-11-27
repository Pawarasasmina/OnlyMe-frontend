import { io } from "socket.io-client";
import axiosInstance from "../api/axiosInstance";
import { API_ORIGIN } from "../config/api.js";

let socket;
let presenceInterval;
let visibilityHandler;
let activityHandler;
let hasInteraction = true;

function startPresenceTracking(activeSocket) {
  clearInterval(presenceInterval);
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  const sync = () => {
    const visible = document.visibilityState === "visible";
    activeSocket.emit("presence:active", visible);
    if (visible) { activeSocket.emit("presence:heartbeat", { interaction: true }); hasInteraction = false; }
  };
  let lastInteraction = 0;
  activityHandler = () => {
    if (document.visibilityState !== "visible") return;
    hasInteraction = true;
    if (activeSocket.connected && Date.now() - lastInteraction > 15000) {
      lastInteraction = Date.now(); activeSocket.emit("presence:heartbeat", { interaction: true }); hasInteraction = false;
    }
  };
  for (const event of ["pointerdown", "keydown", "touchstart", "touchmove", "wheel"]) document.addEventListener(event, activityHandler, { passive: true, capture: true });
  visibilityHandler = sync;
  document.addEventListener("visibilitychange", visibilityHandler);
  activeSocket.on("connect", sync);
  presenceInterval = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (activeSocket.connected) activeSocket.emit("presence:heartbeat", { interaction: hasInteraction });
    else axiosInstance.post("/presence/heartbeat", { foreground: true, interaction: hasInteraction }).then(response => window.dispatchEvent(new CustomEvent("onlyme-presence-self", { detail: response.data.data }))).catch(() => {});
    hasInteraction = false;
  }, 30000);
  sync();
}

function startGlobalMessageReceipts(activeSocket) {
  const syncDeliveries = () => {
    axiosInstance.put("/messages/groups/receipts/delivered").catch(() => {
      // The next reconnect can retry safely.
    });
  };
  activeSocket.on("connect", syncDeliveries);
  activeSocket.on("message:new", () => activeSocket.emit("messages:delivered"));
  activeSocket.on("group:message", ({ message }) => {
    if (!message?.id) return;
    axiosInstance.put(`/messages/groups/messages/${message.id}/delivered`, { read: false }).catch(() => {
      // A reconnect or opening the group will retry the receipt safely.
    });
  });
}
export function getMessageSocket() {
  if (!socket) {
    socket = io(API_ORIGIN, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });
    startPresenceTracking(socket);
    startGlobalMessageReceipts(socket);
  } else {
    if (!socket.connected) socket.connect();
  }
  return socket;
}

export function disconnectMessageSocket() {
  clearInterval(presenceInterval);
  presenceInterval = undefined;
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  visibilityHandler = undefined;
  for (const event of ["pointerdown", "keydown", "touchstart", "touchmove", "wheel"]) if (activityHandler) document.removeEventListener(event, activityHandler, true);
  activityHandler = undefined;
  socket?.disconnect();
  socket = undefined;
}
