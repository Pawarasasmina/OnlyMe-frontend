import { io } from "socket.io-client";

let socket;
export function getMessageSocket() {
  const token = localStorage.getItem("onlyme_access_token");
  if (!token) return null;
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
    socket = io(apiUrl.replace(/\/api\/?$/, ""), {
      auth: (callback) => callback({ token: localStorage.getItem("onlyme_access_token") }),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ["websocket", "polling"],
    });
  } else {
    if (!socket.connected) socket.connect();
  }
  return socket;
}
