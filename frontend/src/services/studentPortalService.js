import { studentAuthService } from "@/services/authService";
import { api } from "@/services/api";

import { getSimpleAuthBaseUrl } from "@/config/apiConfig";

const SIMPLE_AUTH = getSimpleAuthBaseUrl();

const authedFetch = async (path, options = {}) => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") || localStorage.getItem("accessToken")
      : null;

  const response = await fetch(`${SIMPLE_AUTH}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, ...data };
};

export const studentPortalService = {
  getDashboard: () => studentAuthService.getDashboard(),
  updateProfile: (payload) =>
    authedFetch("/student/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getCourses: () => api.get("/web/courses"),
  registerForCourse: (payload) => api.post("/web/register", payload),
};

export default studentPortalService;
