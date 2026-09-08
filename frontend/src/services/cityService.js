import { api } from '@/services/api';

/**
 * Get all cities
 */
export const getCities = async () => {
    const response = await api.get('/cities');
    // Normalize response: some endpoints return { success: true, cities: [...] }, others array
    if (response.cities) return response.cities;
    if (response.data && response.data.cities) return response.data.cities;
    if (Array.isArray(response)) return response;
    return [];
};

/**
 * Add a new city
 */
export const addCity = (data) => api.post('/cities', data);

/**
 * Delete a city
 */
export const deleteCity = (id) => api.delete(`/cities/${id}`);

/**
 * Update a city
 */
export const updateCity = (id, data) => api.put(`/cities/${id}`, data);

