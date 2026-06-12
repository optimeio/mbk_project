import { api, isAbortRequestError } from '@/services/api';

const scheduleService = {
    /**
     * Create a single schedule
     */
    async createSchedule(scheduleData) {
        try {
            return await api.post('/schedules/create', scheduleData);
        } catch (error) {
            if (!isAbortRequestError(error)) {
                console.error('Error creating schedule:', error);
            }
            throw error;
        }
    },

    /**
     * Get all schedules
     */
    async getAllSchedules(options = {}, filters = {}) {
        try {
            const params = new URLSearchParams();

            Object.entries(filters || {}).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') return;
                params.set(key, String(value));
            });

            const query = params.toString();
            return await api.get(`/schedules/all${query ? `?${query}` : ''}`, options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching all schedules:', error);
            }
            throw error;
        }
    },

    /**
     * Get today's live dashboard data
     */
    async getLiveDashboard(options = {}) {
        try {
            return await api.get('/schedules/live-dashboard', options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching live dashboard data:', error);
            }
            throw error;
        }
    },

    /**
     * Create multiple schedules at once
     */
    async bulkCreateSchedules(schedules, createdBy) {
        try {
            return await api.post('/schedules/bulk-create', {
                schedules,
                createdBy
            });
        } catch (error) {
            if (!isAbortRequestError(error)) {
                console.error('Error bulk creating schedules:', error);
            }
            throw error;
        }
    },

    /**
     * Get schedules for a specific trainer
     */
    async getTrainerSchedule(trainerId, filters = {}, options = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.month) params.append('month', filters.month);
            if (filters.year) params.append('year', filters.year);
            if (filters.status) params.append('status', filters.status);

            return await api.get(`/schedules/trainer/${trainerId}?${params.toString()}`, options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching trainer schedule:', error);
            }
            throw error;
        }
    },

    /**
     * Get day slots and statuses for a department
     */
    async getDepartmentDays(departmentId, options = {}) {
        try {
            return await api.get(`/schedules/days?departmentId=${encodeURIComponent(departmentId)}`, options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching department days:', error);
            }
            throw error;
        }
    },

    /**
     * Get a single schedule by ID
     */
    async getSchedule(id, options = {}) {
        try {
            return await api.get(`/schedules/${id}`, options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching schedule:', error);
            }
            throw error;
        }
    },

    /**
     * Update a schedule
     */
    async updateSchedule(id, updates) {
        try {
            return await api.put(`/schedules/${id}`, updates);
        } catch (error) {
            if (!isAbortRequestError(error)) {
                console.error('Error updating schedule:', error);
            }
            throw error;
        }
    },

    /**
     * Delete a schedule
     */
    async deleteSchedule(id, reason = '') {
        try {
            const url = reason 
                ? `/schedules/${id}?reason=${encodeURIComponent(reason)}` 
                : `/schedules/${id}`;
            return await api.delete(url);
        } catch (error) {
            if (!isAbortRequestError(error)) {
                console.error('Error deleting schedule:', error);
            }
            throw error;
        }
    },

    /**
     * Get all associations (companies, courses, colleges) for dropdowns
     */
    async getAssociations(options = {}) {
        try {
            return await api.get('/schedules/associations/all', options);
        } catch (error) {
            if (!isAbortRequestError(error, options?.signal)) {
                console.error('Error fetching associations:', error);
            }
            throw error;
        }
    }
};

export default scheduleService;
