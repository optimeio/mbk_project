import { api } from '@/services/api';

/**
 * Get pending users
 */
export const getPendingUsers = () => api.get('/users/pending');

/**
 * Approve a user
 */
export const approveUser = (id, data) => api.put(`/users/${id}/approve`, typeof id === 'object' ? id : data);

/**
 * Reject a user
 */
export const rejectUser = (id) => api.put(`/users/${id}/reject`);

/**
 * Approve all pending users
 */
export const approveAllUsers = () => api.put('/users/approve-all');

/**
 * Toggle active status
 */
export const toggleUserStatus = (id) => api.put(`/users/${id}/toggle-status`);
