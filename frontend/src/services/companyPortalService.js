import { companyAuthService } from "@/services/authService";
import { api } from "@/services/api";

export const companyPortalService = {
  getProfile: () => companyAuthService.getDashboard(),
  updateProfile: (payload) => api.put("/simple-auth/company/profile", payload),
  getDashboardMetrics: () => api.get("/company-portal/dashboard"),
  getTodayMonitoring: () => api.get("/company-portal/today-monitoring"),
  getTrainingSessions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/company-portal/training-sessions${query ? `?${query}` : ""}`);
  },
  getWorkflowReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/company-portal/workflow-reports${query ? `?${query}` : ""}`);
  },
  getColleges: () => api.get("/company-portal/colleges"),
  getCourses: () => api.get("/company-portal/courses"),
  getTrainers: () => api.get("/company-portal/trainers"),
};

export default companyPortalService;
