import { api } from '@/services/api';

/**
 * Financial Records Service
 * Handles all financial-related API calls
 */

const buildFinancialQuery = (params = {}) => {
  const query = new URLSearchParams();
  const entries = Object.entries(params || {});

  entries.forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    query.set(key, normalized);
  });

  return query.toString();
};

/**
 * Get financial records.
 * Legacy behavior is preserved when no query params are provided.
 */
export const getFinancialRecords = (params = {}, options = {}) => {
  const query = buildFinancialQuery(params);
  return api.get(`/financials${query ? `?${query}` : ''}`, options);
};

/**
 * Get financial records for a specific trainer
 */
export const getTrainerFinancialRecords = (trainerId) => api.get(`/financials/trainer/${trainerId}`);

/**
 * Create a new financial record (e.g., reimbursement)
 */
export const createFinancialRecord = (data) => api.post('/financials', data);

/**
 * Update a financial record
 */
export const updateFinancialRecord = (id, data) => api.put(`/financials/${id}`, data);

/**
 * Delete a financial record
 */
export const deleteFinancialRecord = (id) => api.delete(`/financials/${id}`);

/**
 * Get financial statistics
 * Note: This endpoint may need to be created on backend
 */
export const getFinancialStats = (options = {}) => api.get('/financials/stats', options);
