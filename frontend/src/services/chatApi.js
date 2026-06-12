import axios from "axios";
import { API_BASE_URL } from "./api";

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = Number(error?.response?.status || 0);

    if (status === 401 && !originalRequest.__retry) {
      originalRequest.__retry = true;

      try {
        const storedRefreshToken = localStorage.getItem("refreshToken") || "";
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!refreshResponse.ok) {
          throw new Error("Refresh token failed");
        }

        const refreshData = await refreshResponse.json();
        const payload = refreshData.data || refreshData;
        const nextAccessToken = payload.accessToken || refreshData.accessToken;
        const nextRefreshToken = payload.refreshToken || refreshData.refreshToken;
        if (nextAccessToken) {
          localStorage.setItem("accessToken", nextAccessToken);
          if (nextRefreshToken) {
            localStorage.setItem("refreshToken", nextRefreshToken);
          }
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${nextAccessToken}`,
          };
          return API(originalRequest);
        }
      } catch (refreshError) {
        // Hard fail and reset local auth state to avoid ghost-login UX.
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          document.cookie = "portal_session=; Path=/; Max-Age=0; SameSite=Lax";
          document.cookie = "portal_role=; Path=/; Max-Age=0; SameSite=Lax";
          const pathname = window.location.pathname || "/";
          const isAuthRoute =
            pathname === "/login" ||
            pathname === "/signup" ||
            pathname === "/trainer-signup" ||
            pathname === "/forgot-password";
          if (isAuthRoute) {
            return Promise.reject(refreshError);
          }
          window.location.replace("/?login=true");
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
