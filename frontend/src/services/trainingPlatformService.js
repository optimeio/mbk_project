import { api } from "@/services/api";

const trainingPlatformService = {
  async syncHierarchy(payload) {
    return api.post("/training-platform/hierarchy/sync", payload);
  },

  async uploadDayFiles(dayId, { fileType, files }) {
    const formData = new FormData();
    formData.append("fileType", fileType);

    for (const file of Array.isArray(files) ? files : []) {
      formData.append("files", file);
    }

    return api.post(`/training-platform/days/${dayId}/upload`, formData);
  },

  async getDayFiles(dayId, filters = {}) {
    const params = new URLSearchParams();

    if (filters.fileType) params.append("fileType", filters.fileType);
    if (filters.status) params.append("status", filters.status);

    const query = params.toString();
    return api.get(
      `/training-platform/days/${dayId}/files${query ? `?${query}` : ""}`,
    );
  },

  async getDayStatus(dayId) {
    return api.get(`/training-platform/days/${dayId}/status`);
  },
};

export default trainingPlatformService;
