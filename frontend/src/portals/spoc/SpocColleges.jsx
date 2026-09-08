"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { PlusIcon, LinkIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
const CollegeModal = dynamic(() => import('@/components/modals/CollegeModal'));
const AssignTrainersModal = dynamic(() => import('@/components/modals/AssignTrainersModal'));
import { getColleges, createCollege, updateCollege, assignTrainers } from '@/services/collegeService';
import { getTrainers } from '@/services/trainerService';
import { getCourses } from '@/services/courseService';

const SPOC_COLLEGES_QUERY_KEY = ['spoc', 'colleges-page-data'];

const resolveCollegeId = (college) =>
    String(college?.id || college?._id || '').trim();

const fetchSpocCollegesPageData = async () => {
    const [collegesData, trainersData, coursesData] = await Promise.all([
        getColleges(),
        getTrainers(),
        getCourses(),
    ]);

    const collegesPayload = collegesData?.data || collegesData || [];
    const trainersPayload = trainersData?.data || trainersData || [];
    const coursesPayload = coursesData?.data || coursesData || [];

    return {
        colleges: Array.isArray(collegesPayload) ? collegesPayload : [],
        trainers: Array.isArray(trainersPayload) ? trainersPayload : [],
        courses: Array.isArray(coursesPayload) ? coursesPayload : [],
    };
};

const CompanyColleges = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCollege, setSelectedCollege] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedCollegeForAssignment, setSelectedCollegeForAssignment] = useState(null);
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
        data: pageData,
        isPending: loading,
    } = useQuery({
        queryKey: SPOC_COLLEGES_QUERY_KEY,
        queryFn: fetchSpocCollegesPageData,
    });
    const colleges = pageData?.colleges || [];
    const availableTrainers = pageData?.trainers || [];
    const courses = pageData?.courses || [];

    const createCollegeMutation = useMutation({
        mutationFn: createCollege,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COLLEGES_QUERY_KEY });
        },
    });

    const updateCollegeMutation = useMutation({
        mutationFn: ({ id, formData }) => updateCollege(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COLLEGES_QUERY_KEY });
        },
    });

    const assignTrainersMutation = useMutation({
        mutationFn: ({ collegeId, trainersData }) => assignTrainers(collegeId, trainersData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SPOC_COLLEGES_QUERY_KEY });
        },
    });

    const refreshPageData = async () => {
        try {
            setError(null);
            await queryClient.invalidateQueries({ queryKey: SPOC_COLLEGES_QUERY_KEY });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
            console.error('Error fetching data:', err);
        }
    };

    const handleAdd = () => {
        setSelectedCollege(null);
        setIsModalOpen(true);
    };

    const handleEdit = (college) => {
        setSelectedCollege(college);
        setIsModalOpen(true);
    };

    const handleSave = async (formData) => {
        try {
            if (selectedCollege) {
                const selectedCollegeId = resolveCollegeId(selectedCollege);
                await updateCollegeMutation.mutateAsync({ id: selectedCollegeId, formData });
                setNotificationMessage({ type: 'success', text: 'College updated successfully!' });
            } else {
                await createCollegeMutation.mutateAsync(formData);
                setNotificationMessage({ type: 'success', text: 'College created successfully!' });
            }
            scheduleNotificationClear(3000);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save college');
            console.error('Error saving college:', err);
        }
    };


    const handleAssignTrainers = (college) => {
        setSelectedCollegeForAssignment(college);
        setIsAssignModalOpen(true);
    };

    const handleSaveAssignment = async (collegeId, trainersData) => {
        try {
            const response = await assignTrainersMutation.mutateAsync({ collegeId, trainersData });

            // Display notification results
            if (response.data.notifications && response.data.notifications.length > 0) {
                const notificationSummary = response.data.notifications.map(n =>
                    `${n.trainerName}: SMS ${n.notifications.sms?.success ? '✓' : '✗'}, WhatsApp ${n.notifications.whatsapp?.success ? '✓' : '✗'}`
                ).join('\n');

                setNotificationMessage({
                    type: 'success',
                    text: `Trainers assigned successfully!\n\nNotifications:\n${notificationSummary}`
                });
            } else {
                setNotificationMessage({ type: 'success', text: 'Trainers assigned successfully!' });
            }

            // Refresh colleges to show updated trainer assignments
            await refreshPageData();
            setIsAssignModalOpen(false);
            scheduleNotificationClear(5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign trainers');
            console.error('Error assigning trainers:', err);
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            {/* Notification Message */}
            {notificationMessage && (
                <div className={`mb-4 p-4 rounded-md ${notificationMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <p className="text-sm whitespace-pre-line">{notificationMessage.text}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">My Colleges</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage colleges assigned to your company and assign trainers.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    {/* Add College button removed as per restriction */}
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="mt-8 text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading colleges...</p>
                </div>
            ) : (
                <div className="mt-8 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                                College Name
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Location
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Principal
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Contact
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                                Students
                                            </th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {colleges.map((college) => {
                                            const collegeId = resolveCollegeId(college);
                                            return (
                                            <tr key={collegeId}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    <Link href={`/spoc/college/${collegeId}`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                                        {college.name}
                                                    </Link>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{college.location}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{college.principal}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{college.contact}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{college.students}</td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        onClick={() => handleEdit(college)}
                                                        className="text-indigo-600 hover:text-indigo-900 mr-4 inline-flex items-center"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleAssignTrainers(college)}
                                                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                                                    >
                                                        <LinkIcon className="h-4 w-4 mr-1" />
                                                        Assign Trainers
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

            <CollegeModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={selectedCollege}
                courses={courses}
            />

            <AssignTrainersModal
                open={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSave={handleSaveAssignment}
                college={selectedCollegeForAssignment}
                trainers={availableTrainers}
            />
        </div>
    );
};

export default CompanyColleges;
