import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMic, FiMicOff, FiPhone, FiVideo, FiVideoOff, FiX } from "react-icons/fi";
import FanAvatar from "../components/fanWeb/shared/FanAvatar";
import { getMessageSocket } from "../services/messageSocket";
import { callService } from "../services/callService";
import { CallContext } from "./callContextBase";

export function CallProvider({ children, user }) {
  const [call, setCall] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceServersRef = useRef([]);
  const connectedReportedRef = useRef(false);

  const updateCall = useCallback((next) => {
    setCall((current) => {
      const value = typeof next === "function" ? next(current) : next;
      callRef.current = value;
      return value;
    });
  }, []);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    connectedReportedRef.current = false;
  }, []);

  const closeCall = useCallback((finalState = null) => {
    stopMedia();
    setMuted(false); setCameraOff(false); setElapsed(0);
    if (finalState) {
      updateCall((current) => current ? { ...current, state: finalState } : null);
      window.setTimeout(() => { if (callRef.current?.state === finalState) updateCall(null); }, 1800);
    } else updateCall(null);
  }, [stopMedia, updateCall]);

  const ensureMedia = useCallback(async (type) => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "VIDEO" ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const createPeer = useCallback(async () => {
    if (peerRef.current) return peerRef.current;
    const socket = getMessageSocket();
    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerRef.current = peer;
    localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    peer.onicecandidate = ({ candidate }) => { if (candidate && callRef.current?.id) socket?.emit("call:signal", { callId: callRef.current.id, candidate }); };
    peer.ontrack = ({ streams }) => {
      const stream = streams[0];
      remoteStreamRef.current = stream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") updateCall((current) => current ? { ...current, state: "ACTIVE", connectedAt: current.connectedAt || Date.now() } : current);
      if (peer.connectionState === "connected" && !connectedReportedRef.current && callRef.current?.id) { connectedReportedRef.current = true; socket?.emit("call:connected", { callId: callRef.current.id }); }
      if (["failed", "closed"].includes(peer.connectionState) && callRef.current && !["ENDED", "DECLINED", "MISSED"].includes(callRef.current.state)) {
        socket?.emit("call:end", { callId: callRef.current.id, reason: "CONNECTION_FAILED" });
        closeCall("FAILED");
      }
    };
    return peer;
  }, [closeCall, updateCall]);

  useEffect(() => {
    callService.getConfiguration().then((response) => { iceServersRef.current = response.data.data.iceServers || []; }).catch(() => { iceServersRef.current = []; });
    return () => {
      if (callRef.current?.id) getMessageSocket()?.emit("call:end", { callId: callRef.current.id, reason: "NAVIGATION" });
      stopMedia();
    };
  }, [stopMedia]);

  useEffect(() => {
    const socket = getMessageSocket();
    if (!socket) return undefined;
    const incoming = (payload) => {
      if (callRef.current) { socket.emit("call:decline", { callId: payload.callId }); return; }
      updateCall({ id: payload.callId, type: payload.type, direction: "INCOMING", state: payload.requested ? "REQUESTED" : "RINGING", person: payload.caller, paid: Boolean(payload.paid), priceStars: payload.priceStars || 0, durationLimitSeconds: payload.durationLimitSeconds || 0, settlementStatus: payload.paid ? "HELD" : "FREE" });
    };
    const accepted = async ({ callId, joinRequired }) => {
      if (callRef.current?.id !== callId) return;
      if (joinRequired) { updateCall((current) => current ? { ...current, state: "JOIN_READY" } : current); return; }
      try {
        const peer = await createPeer();
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("call:signal", { callId, description: peer.localDescription });
        updateCall((current) => current ? { ...current, state: "CONNECTING" } : current);
      } catch (requestError) { setError(requestError.message || "Call connection failed."); closeCall("FAILED"); }
    };
    const joinReady = ({ callId }) => { if (callRef.current?.id === callId) updateCall((current) => current ? { ...current, state: "CONNECTING" } : current); };
    const signal = async ({ callId, description, candidate }) => {
      if (callRef.current?.id !== callId) return;
      try {
        const peer = await createPeer();
        if (description) {
          await peer.setRemoteDescription(description);
          for (const queued of pendingCandidatesRef.current.splice(0)) await peer.addIceCandidate(queued);
          if (description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("call:signal", { callId, description: peer.localDescription });
          }
        } else if (candidate) {
          if (peer.remoteDescription) await peer.addIceCandidate(candidate);
          else pendingCandidatesRef.current.push(candidate);
        }
      } catch (requestError) { setError(requestError.message || "Call connection failed."); }
    };
    const ended = ({ callId, status }) => {
      if (callRef.current?.id !== callId) return;
      if (callRef.current.direction === "OUTGOING" && callRef.current.state === "REQUESTED") { closeCall(); return; }
      closeCall(status === "DECLINED" ? "DECLINED" : status === "MISSED" ? "MISSED" : "ENDED");
    };
    const settlement = (payload) => {
      if (callRef.current?.id !== payload.id) return;
      if (payload.settlementStatus === "REFUNDED" && callRef.current.state === "REQUESTED") { closeCall(); return; }
      if (payload.settlementStatus === "REFUNDED" && ["JOIN_READY", "WAITING_FOR_JOIN"].includes(callRef.current.state)) { closeCall("MISSED"); return; }
      updateCall((current) => current ? { ...current, settlementStatus: payload.settlementStatus } : current);
    };
    socket.on("call:incoming", incoming); socket.on("call:accepted", accepted); socket.on("call:join-ready", joinReady); socket.on("call:signal", signal); socket.on("call:ended", ended); socket.on("call:settlement", settlement);
    return () => { socket.off("call:incoming", incoming); socket.off("call:accepted", accepted); socket.off("call:join-ready", joinReady); socket.off("call:signal", signal); socket.off("call:ended", ended); socket.off("call:settlement", settlement); };
  }, [closeCall, createPeer, updateCall]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
  }, [call?.state]);

  useEffect(() => {
    if (call?.state !== "ACTIVE") return undefined;
    const started = call.connectedAt || Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [call?.connectedAt, call?.state]);

  const startCall = useCallback(async (person, type = "AUDIO") => {
    if (!person?.id || callRef.current) return;
    setError("");
    if (user?.role === "fan" && person.role === "creator") {
      try {
        const offer = await callService.getPaidOffer(person.id).then((response) => response.data.data);
        if (!offer.enabled) throw new Error("This creator is not accepting calls right now.");
        updateCall({ id: null, type, direction: "OUTGOING", state: "OFFER", person, paid: true, ...offer });
      } catch (requestError) {
        setError(requestError.response?.data?.message || requestError.message || "Could not load this call offer.");
        updateCall({ id: null, type, direction: "OUTGOING", state: "FAILED", person });
      }
      return;
    }
    try {
      await ensureMedia(type);
      updateCall({ id: null, type, direction: "OUTGOING", state: "STARTING", person });
      const socket = getMessageSocket();
      socket.emit("call:start", { recipientId: person.id, type }, (response) => {
        if (!response?.ok) { setError(response?.message || "Could not start call."); closeCall("FAILED"); return; }
        updateCall((current) => current ? { ...current, id: response.call.callId, state: "RINGING" } : current);
      });
    } catch (requestError) { setError(requestError.name === "NotAllowedError" ? "Allow microphone and camera access to make calls." : requestError.message || "Could not access your microphone."); closeCall("FAILED"); }
  }, [closeCall, ensureMedia, updateCall, user?.role]);

  const confirmPaidCall = async () => {
    const current = callRef.current;
    if (!current?.paid || current.state !== "OFFER") return;
    setError("");
    try {
      updateCall((value) => ({ ...value, state: "STARTING" }));
      const key = globalThis.crypto?.randomUUID?.() || `paid-call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await callService.requestPaidCall(current.person.id, current.type, key).then((response) => response.data.data);
      updateCall((value) => ({ ...value, id: result.call.id, state: "STARTING", settlementStatus: result.call.settlementStatus, durationLimitSeconds: result.call.durationLimitSeconds }));
      getMessageSocket()?.emit("call:start", { callId: result.call.id }, (response) => {
        if (!response?.ok) { getMessageSocket()?.emit("call:end", { callId: result.call.id, reason: "START_FAILED" }); setError(response?.message || "Could not start the paid call."); closeCall("FAILED"); return; }
        updateCall((value) => value ? { ...value, state: "REQUESTED" } : value);
      });
    } catch (requestError) {
      setError(requestError.response?.data?.code === "INSUFFICIENT_STARS" ? "Not enough Stars. Add Stars in Wallet and try again." : requestError.response?.data?.message || requestError.message || "Could not request this call.");
      updateCall((value) => value ? { ...value, state: "OFFER" } : value);
    }
  };

  const joinPaidCall = async () => {
    const current = callRef.current;
    if (!current?.paid || current.state !== "JOIN_READY") return;
    setError("");
    try {
      await ensureMedia(current.type);
      const peer = await createPeer();
      getMessageSocket()?.emit("call:join", { callId: current.id }, async (response) => {
        if (!response?.ok) { setError(response?.message || "This call is no longer available."); closeCall("MISSED"); return; }
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          getMessageSocket()?.emit("call:signal", { callId: current.id, description: peer.localDescription });
          updateCall((value) => value ? { ...value, state: "CONNECTING" } : value);
        } catch (requestError) { setError(requestError.message || "Call connection failed."); closeCall("FAILED"); }
      });
    } catch (requestError) { setError(requestError.name === "NotAllowedError" ? "Allow microphone and camera access to join." : "Could not join this call."); closeCall("FAILED"); }
  };

  const acceptCall = async () => {
    try {
      await ensureMedia(callRef.current.type);
      await createPeer();
      getMessageSocket()?.emit("call:accept", { callId: callRef.current.id }, (response) => response?.ok ? updateCall((current) => ({ ...current, state: response.waitingForJoin ? "WAITING_FOR_JOIN" : "CONNECTING" })) : closeCall("MISSED"));
    } catch (requestError) { setError(requestError.name === "NotAllowedError" ? "Allow microphone and camera access to answer." : "Could not answer this call."); getMessageSocket()?.emit("call:decline", { callId: callRef.current.id }); closeCall("FAILED"); }
  };
  const declineCall = () => { if (callRef.current?.direction === "INCOMING") getMessageSocket()?.emit("call:decline", { callId: callRef.current.id }); else getMessageSocket()?.emit("call:end", { callId: callRef.current?.id, reason: "CANCELED" }); closeCall(); };
  const endCall = () => { getMessageSocket()?.emit("call:end", { callId: callRef.current?.id, reason: "HANGUP" }); closeCall(); };
  const toggleMute = () => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); };
  const toggleCamera = () => { const next = !cameraOff; localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; }); setCameraOff(next); };
  const final = ["ENDED", "DECLINED", "MISSED", "FAILED"].includes(call?.state);
  const shownSeconds = call?.paid && call?.durationLimitSeconds ? Math.max(0, call.durationLimitSeconds - elapsed) : elapsed;
  const time = `${String(Math.floor(shownSeconds / 60)).padStart(2, "0")}:${String(shownSeconds % 60).padStart(2, "0")}`;

  return <CallContext.Provider value={{ activeCall: call, startCall }}>
    {children}
    {call && !(call.direction === "OUTGOING" && call.state === "REQUESTED") && createPortal(<div className={`fixed inset-0 z-[9999] flex text-white ${call.state === "OFFER" ? "items-end justify-center bg-black/70 backdrop-blur-[2px]" : "items-center justify-center bg-[#06080c]"}`}>
      {call.type === "VIDEO" && !final ? <video autoPlay className="absolute inset-0 h-full w-full object-cover" playsInline ref={remoteVideoRef} /> : null}
      <audio autoPlay ref={remoteAudioRef} />
      {call.state !== "OFFER" ? <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/75" /> : null}
      {call.type === "VIDEO" && localStreamRef.current ? <video autoPlay className="absolute right-4 top-4 z-10 h-36 w-24 rounded-2xl border border-white/20 bg-black object-cover shadow-2xl" muted playsInline ref={localVideoRef} /> : null}
      <div className={`relative z-10 flex w-full flex-col items-center text-center ${call.state === "OFFER" ? "max-h-[88vh] max-w-[640px] justify-start rounded-t-[24px] border border-b-0 border-[#26374a] bg-[#080b0f] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl" : "h-full max-w-md justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16"}`}>
        {call.state === "OFFER" ? <div className="mb-4 h-1 w-8 rounded-full bg-white/30" /> : null}
        {call.state === "OFFER" ? <div className="flex w-full items-center gap-3 pb-4 text-left"><FanAvatar name={call.person?.displayName || "Call"} size="h-10 w-10" src={call.person?.avatarUrl} /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-black">Call with {call.person?.displayName || "creator"}</h2><p className="mt-1 text-[11px] text-white/60">{call.durationMinutes} min · guaranteed or refunded</p></div><button aria-label="Close call offer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/5 hover:text-white" onClick={() => closeCall()} type="button"><FiX /></button></div> : <div><FanAvatar name={call.person?.displayName || "Call"} size="h-24 w-24" src={call.person?.avatarUrl} /><h2 className="mt-5 text-2xl font-black">{call.person?.displayName || "Call"}</h2><p className="mt-2 text-sm text-white/65">{final ? call.state === "DECLINED" ? "Call declined" : call.state === "MISSED" ? "No answer · Stars refunded" : call.state === "FAILED" ? "Call failed" : "Call ended" : call.state === "ACTIVE" ? time : call.state === "REQUESTED" ? call.direction === "INCOMING" ? `Paid call request · ✦${call.priceStars}` : "Call requested · waiting for creator" : call.state === "JOIN_READY" ? `${call.person?.displayName?.split(" ")[0] || "Creator"} accepted your call` : call.state === "WAITING_FOR_JOIN" ? "Accepted · waiting for fan to join" : call.direction === "INCOMING" && call.state === "RINGING" ? `Incoming ${call.paid ? `paid call · ✦${call.priceStars}` : call.type.toLowerCase() + " call"}` : call.state === "CONNECTING" ? "Connecting…" : "Ringing…"}</p>{call.paid ? <p className="mt-2 text-[11px] font-bold text-[#9CCBFF]">✦{call.priceStars} · {call.settlementStatus === "HELD" ? "held until connected" : call.settlementStatus === "CAPTURED" ? "call delivered" : call.settlementStatus === "REFUNDED" ? "refunded" : ""}</p> : null}{error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}</div>}
        {!final ? call.state === "OFFER" ? <div className="w-full border-t border-white/10 pt-4"><div className="mb-3 rounded-2xl bg-white/[0.055] p-4 text-left"><div className="flex justify-between text-sm"><span className="text-white/60">Price</span><b>✦{call.priceStars}</b></div><div className="mt-2 flex justify-between text-sm"><span className="text-white/60">Your balance</span><b>✦{call.walletBalance}</b></div><p className="mt-4 text-[10px] leading-4 text-white/50">Stars are held when you request. The creator earns after both sides connect; otherwise you are refunded.</p></div><button className="w-full rounded-2xl bg-[#84b6fb] py-3.5 text-sm font-black text-[#080b0f] disabled:opacity-40" disabled={Number(call.walletBalance) < Number(call.priceStars)} onClick={confirmPaidCall} type="button">Request call · ✦{call.priceStars}</button></div> : call.state === "JOIN_READY" ? <div className="w-full"><p className="mb-4 text-sm text-white/65">{Math.round((call.durationLimitSeconds || 0) / 60)} min · guaranteed or refunded</p><button className="w-full rounded-full bg-[#9CCBFF] py-3 text-sm font-black text-[#0A0C0F]" onClick={joinPaidCall} type="button">Join the call</button></div> : <div className="flex items-center gap-5">{call.direction === "INCOMING" && ["REQUESTED", "RINGING"].includes(call.state) ? <><button aria-label="Decline call" className="grid h-16 w-16 place-items-center rounded-full bg-red-500 text-2xl shadow-xl" onClick={declineCall} type="button"><FiPhone className="rotate-[135deg]" /></button><button aria-label="Accept call" className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-2xl shadow-xl" onClick={acceptCall} type="button"><FiPhone /></button></> : call.state === "REQUESTED" ? <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white/65" onClick={declineCall} type="button">Cancel request</button> : <><button aria-label={muted ? "Unmute" : "Mute"} className={`grid h-[52px] w-[52px] place-items-center rounded-full text-xl ${muted ? "bg-white text-black" : "bg-white/15"}`} onClick={toggleMute} type="button">{muted ? <FiMicOff /> : <FiMic />}</button>{call.type === "VIDEO" ? <button aria-label={cameraOff ? "Turn camera on" : "Turn camera off"} className={`grid h-[52px] w-[52px] place-items-center rounded-full text-xl ${cameraOff ? "bg-white text-black" : "bg-white/15"}`} onClick={toggleCamera} type="button">{cameraOff ? <FiVideoOff /> : <FiVideo />}</button> : null}<button aria-label="End call" className="grid h-16 w-16 place-items-center rounded-full bg-red-500 text-2xl shadow-xl" onClick={endCall} type="button"><FiPhone className="rotate-[135deg]" /></button></>}</div> : <div />}
      </div>
    </div>, document.body)}
  </CallContext.Provider>;
}
