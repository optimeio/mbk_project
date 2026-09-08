import { api } from '@/services/api';

/**
 * Notification API Service
 * Centralizes all notification-related API calls.
 */

export const fetchNotifications = async (page = 1, limit = 20) => {
  const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
  return response;
};

export const markNotificationAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response;
};

export const deleteAllNotifications = async () => {
  const response = await api.delete('/notifications');
  return response;
};

export default {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteAllNotifications
};
