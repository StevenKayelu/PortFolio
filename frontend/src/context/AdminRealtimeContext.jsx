import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";
import apiClient, { API_BASE_URL, getAccessToken, refreshAccessToken } from "../services/apiClient";

/**
 * Live admin updates (Socket.IO). Keeps one connection per signed-in admin
 * tab, menu badge counts, and the latest event so pages can refresh.
 * Everything still works without it: counts also refresh on navigation,
 * on returning to the tab, and every two minutes.
 */

const RealtimeContext = createContext({ counts: {}, connected: false, lastEvent: null, refreshCounts: () => {}, muted: false, setMuted: () => {} });
const EMPTY = { leads: 0, messages: 0, approvals: 0, testimonials: 0 };
const MUTE_KEY = "admin.alertSound.muted";

function readMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

/** A short two-tone chime; browsers only allow it after the user has interacted with the page. */
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* sound is optional */ }
}

export function AdminRealtimeProvider({ children }) {
  const [counts, setCounts] = useState(EMPTY);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [muted, setMutedState] = useState(readMuted);
  const mutedRef = useRef(muted);
  const location = useLocation();

  const setMuted = (value) => {
    mutedRef.current = value;
    setMutedState(value);
    try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* per-device preference only */ }
  };

  const refreshCounts = useCallback(() => {
    apiClient.get("/admin/inbox-counts").then((r) => setCounts({ ...EMPTY, ...r.data })).catch(() => {});
  }, []);

  // Navigation, returning to the tab, and a slow fallback timer.
  useEffect(refreshCounts, [location.pathname, refreshCounts]);
  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && refreshCounts();
    document.addEventListener("visibilitychange", onFocus);
    const timer = setInterval(refreshCounts, 120000);
    return () => { document.removeEventListener("visibilitychange", onFocus); clearInterval(timer); };
  }, [refreshCounts]);

  useEffect(() => {
    const origin = new URL(API_BASE_URL).origin;
    const socket = io(origin, {
      path: "/api/v1/realtime",
      withCredentials: true,
      autoConnect: false,
      reconnectionDelayMax: 30000,
      // Read the current token on every (re)connect.
      auth: (cb) => cb({ token: getAccessToken() }),
    });

    let stopped = false;
    const reconnectWithFreshToken = () => {
      refreshAccessToken()
        .then(() => !stopped && socket.connect())
        .catch(() => { /* signed out: the route guard sends the user to the login page */ });
    };

    socket.on("connect", () => { setConnected(true); refreshCounts(); });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      // The server closes the connection when the access token expires.
      if (reason === "io server disconnect" && !stopped) reconnectWithFreshToken();
    });
    socket.on("connect_error", (err) => {
      setConnected(false);
      if (err.message === "unauthorized" && !stopped) setTimeout(reconnectWithFreshToken, 2000);
    });
    socket.on("notify", (event) => {
      setLastEvent({ ...event, id: `${event.kind}-${event.at}-${Math.random()}` });
      refreshCounts();
      if (!mutedRef.current) chime();
    });

    if (getAccessToken()) socket.connect();
    else reconnectWithFreshToken();

    return () => { stopped = true; socket.removeAllListeners(); socket.disconnect(); };
  }, [refreshCounts]);

  // Unread total in the browser tab title, e.g. "(3) DevGen admin".
  useEffect(() => {
    const total = counts.leads + counts.messages + counts.approvals + counts.testimonials;
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = total ? `(${total}) ${base}` : base;
  }, [counts, location.pathname]);

  return (
    <RealtimeContext.Provider value={{ counts, connected, lastEvent, refreshCounts, muted, setMuted }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useAdminRealtime = () => useContext(RealtimeContext);

/** Re-run `reload` when a live event of one of these kinds arrives. */
export function useLiveRefresh(kinds, reload) {
  const { lastEvent } = useAdminRealtime();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const key = [].concat(kinds).join(",");
  useEffect(() => {
    if (lastEvent && key.split(",").includes(lastEvent.kind)) reloadRef.current();
  }, [lastEvent, key]);
}
