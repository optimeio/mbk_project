'use client';

import axios from 'axios';

// Global request timeout - prevents hanging indefinitely
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Create axios instance with timeout
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api',
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timeout if not already set
    if (!config.timeout) {
      config.timeout = DEFAULT_TIMEOUT;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      const err = new Error('Request timeout - server took too long to respond');
      err.status = 408;
      err.originalError = error;
      return Promise.reject(err);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
