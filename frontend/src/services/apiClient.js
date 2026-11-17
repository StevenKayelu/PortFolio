import axios from "axios";

// Each production site talks to an API on its own domain (api.<site>), so the
// sign-in cookie is first-party and survives third-party-cookie blocking.
// VITE_API_URL overrides this (local dev, previews, or falling back to Render).
const SITE_APIS = {
  "stevenkayelu.online": "https://api.stevenkayelu.online/api/v1",
  "www.stevenkayelu.online": "https://api.stevenkayelu.online/api/v1",
  "devgenventures.com": "https://api.devgenventures.com/api/v1",
  "www.devgenventures.com": "https://api.devgenventures.com/api/v1",
};

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && SITE_APIS[window.location.hostname]) ||
  "http://localhost:5000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}
export const getAccessToken = () => accessToken;

// One refresh at a time, shared by the API client and the live connection.
let refreshPromise = null;
export function refreshAccessToken() {
  refreshPromise ??= apiClient.post("/auth/refresh")
    .then(({ data }) => { setAccessToken(data.accessToken); return data.accessToken; })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, try one silent refresh, then replay the original request.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Never retry the auth endpoints themselves, or a failed refresh loops.
    if (error.response?.status === 401 && !original._retry && !original.url?.startsWith("/auth/")) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        setAccessToken(null);
        // let the caller / route guard handle redirecting to /admin/login
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
