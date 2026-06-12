import { api } from '@/services/api';

/**
 * Get all colleges for the logged-in company
 */
export const getColleges = () => api.get('/colleges');

/**
 * Create a new college
 */
export const createCollege = (data) => api.post('/colleges', data);

/**
 * Update an existing college
 */
export const updateCollege = (id, data) => api.put(`/colleges/${id}`, data);

/**
 * Delete a college
 */
export const deleteCollege = (id) => api.delete(`/colleges/${id}`);

/**
 * Assign trainers to a college with schedules
 * @param {number} collegeId - College ID
 * @param {Array} trainers - Array of { trainerId, schedules: [{ dayOfWeek, startTime, endTime, subject }] }
 */
export const assignTrainers = (collegeId, trainers) =>
    api.post(`/colleges/${collegeId}/assign-trainers`, { trainers });
