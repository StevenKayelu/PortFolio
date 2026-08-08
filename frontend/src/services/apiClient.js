import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, try one silent refresh, then replay the original request.
let refreshPromise = null;
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshPromise ??= apiClient.post("/auth/refresh").finally(() => {
          refreshPromise = null;
        });
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
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
