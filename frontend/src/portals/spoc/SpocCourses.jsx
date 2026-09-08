"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import CourseModal from '@/components/modals/CourseModal';
import { getCourses, createCourse, updateCourse, deleteCourse } from '@/services/courseService';

const SPOC_COURSES_QUERY_KEY = ['spoc', 'courses'];

const resolveCourseId = (course) =>
    String(course?.id || course?._id || '').trim();

const fetchCourses = async () => {
    const response = await getCourses();
    const payload = response?.data || response || [];
    return Array.isArray(payload) ? payload : [];
};

const CompanyCourses = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [error, setError] = useState(null);
    const [notificationMessage, setNotificationMessage] = useState(null);
    const notificationTimeoutRef = useRef(null);
    const queryClient = useQueryClient();

    const clearNotificationTimeout = useCallback(() => {
        if (notificationTimeoutRef.current) {
            window.clearTimeout(notificationTimeoutRef.current);
            notificationTimeoutRef.current = null;
        }
    }, []);

    const scheduleNotificationClear = useCallback((delayMs) => {
        clearNotificationTimeout();
        notificationTimeoutRef.current = window.setTimeout(() => {
            setNotificationMessage(null);
            notificationTimeoutRef.current = null;
        }, delayMs);
    }, [clearNotificationTimeout]);

    useEffect(() => clearNotificationTimeout, [clearNotificationTimeout]);
    const {
        data: courses = [],
        isPending: loading,
    } = useQuery({
        queryKey: SPOC_COURSES_QUERY_KEY,
        queryFn: fetchCourses,
    });

    const createCourseMutation = useMutation({
        mutationFn: createCourse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COURSES_QUERY_KEY });
        },
    });

    const updateCourseMutation = useMutation({
        mutationFn: ({ id, formData }) => updateCourse(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COURSES_QUERY_KEY });
        },
    });

    const deleteCourseMutation = useMutation({
        mutationFn: deleteCourse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COURSES_QUERY_KEY });
        },
    });

    const handleAdd = () => {
        setSelectedCourse(null);
        setIsModalOpen(true);
    };

    const handleEdit = (course) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await deleteCourseMutation.mutateAsync(id);
                setNotificationMessage({ type: 'success', text: 'Course deleted successfully' });
                scheduleNotificationClear(3000);
            } catch (err) {
                setError('Failed to delete course');
            }
        }
    };

    const handleSave = async (formData) => {
        try {
            if (selectedCourse) {
                const selectedCourseId = resolveCourseId(selectedCourse);
                await updateCourseMutation.mutateAsync({ id: selectedCourseId, formData });
                setNotificationMessage({ type: 'success', text: 'Course updated successfully' });
            } else {
                await createCourseMutation.mutateAsync(formData);
                setNotificationMessage({ type: 'success', text: 'Course created successfully' });
            }
            scheduleNotificationClear(3000);
            setError(null);
        } catch (err) {
            setError('Failed to save course');
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {notificationMessage && (
                <div className={`mb-4 p-4 rounded-md ${notificationMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {notificationMessage.text}
                </div>
            )}

            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Courses</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage the courses offered by your company.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Add Course
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="mt-8 text-center">Loading...</div>
            ) : (
                <div className="mt-8 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Head</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {courses.map((course) => {
                                            const courseId = resolveCourseId(course);
                                            return (
                                            <tr key={courseId}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{course.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{course.courseHead}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{course.description}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button onClick={() => handleEdit(course)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(courseId)} className="text-red-600 hover:text-red-900">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CourseModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={selectedCourse}
            />
        </div>
    );
};

export default CompanyCourses;
