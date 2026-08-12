import { io } from "socket.io-client";
import axiosInstance from "../api/axiosInstance";

let socket;
let presenceInterval;
let visibilityHandler;

function startPresenceTracking(activeSocket) {
  clearInterval(presenceInterval);
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  const sync = () => {
    const visible = document.visibilityState === "visible";
    activeSocket.emit("presence:active", visible);
    if (visible) activeSocket.emit("presence:heartbeat");
  };
  visibilityHandler = sync;
  document.addEventListener("visibilitychange", visibilityHandler);
  activeSocket.on("connect", sync);
  presenceInterval = window.setInterval(() => {
    if (document.visibilityState === "visible" && activeSocket.connected) activeSocket.emit("presence:heartbeat");
  }, 10000);
  sync();
}

function startGlobalMessageReceipts(activeSocket) {
  const syncDeliveries = () => {
    axiosInstance.put("/messages/groups/receipts/delivered").catch(() => {
      // The next reconnect can retry safely.
    });
  };
  activeSocket.on("connect", syncDeliveries);
  activeSocket.on("group:message", ({ message }) => {
    if (!message?.id) return;
    axiosInstance.put(`/messages/groups/messages/${message.id}/delivered`, { read: false }).catch(() => {
      // A reconnect or opening the group will retry the receipt safely.
    });
  });
}
export function getMessageSocket() {
  const token = localStorage.getItem("onlyme_access_token");
  if (!token) return null;
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3104/api";
    socket = io(apiUrl.replace(/\/api\/?$/, ""), {
      auth: (callback) => callback({ token: localStorage.getItem("onlyme_access_token") }),
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
  socket?.disconnect();
  socket = undefined;
}
