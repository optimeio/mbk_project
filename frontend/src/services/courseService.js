import { api } from '@/services/api';

export const getCourses = () => {
    return api.get('/courses');
};

export const createCourse = (data) => {
    return api.post('/courses', data);
};

export const updateCourse = (id, data) => {
    return api.put(`/courses/${id}`, data);
};

export const deleteCourse = (id) => {
    return api.delete(`/courses/${id}`);
};
