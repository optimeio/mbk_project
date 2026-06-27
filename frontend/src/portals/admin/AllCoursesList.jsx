"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
    AcademicCapIcon, 
    ArrowPathIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { toast } from 'react-hot-toast';

// Subcomponent to fetch stats for each course individually to keep parent render lightweight
const CourseStats = ({ courseId }) => {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin', 'course-stats', courseId],
        queryFn: () => api.get(`/batches/stats?courseId=${courseId}`),
        staleTime: 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex gap-4 mt-3 text-xs text-slate-400 animate-pulse">
                <div className="h-4 w-12 bg-slate-100 rounded"></div>
                <div className="h-4 w-12 bg-slate-100 rounded"></div>
                <div className="h-4 w-12 bg-slate-100 rounded"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
            <div>
                <span className="block text-sm font-bold text-slate-700">{stats?.totalColleges || 0}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Colleges</span>
            </div>
            <div>
                <span className="block text-sm font-bold text-indigo-600">{stats?.totalBatches || 0}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Batches</span>
            </div>
            <div>
                <span className="block text-sm font-bold text-emerald-600">{stats?.totalStudents || 0}</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Students</span>
            </div>
        </div>
    );
};

const AllCoursesList = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        companyId: '',
        courseHead: '',
        description: ''
    });

    const {
        data: courses = [],
        isPending: loading,
        error,
        refetch
    } = useQuery({
        queryKey: ['admin', 'all-courses'],
        queryFn: () => api.get('/courses'),
        staleTime: 30 * 1000,
    });

    // Fetch companies for dropdown selection
    const { data: companies = [] } = useQuery({
        queryKey: ['admin', 'all-companies'],
        queryFn: () => api.get('/companies'),
        staleTime: 5 * 60 * 1000,
        enabled: isModalOpen,
    });

    const filteredCourses = useMemo(() => {
        if (!debouncedSearchTerm) return courses;
        const lower = debouncedSearchTerm.toLowerCase();
        return courses.filter(
            (c) =>
                c.title?.toLowerCase().includes(lower) ||
                c.description?.toLowerCase().includes(lower)
        );
    }, [courses, debouncedSearchTerm]);

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        if (!formData.companyId) {
            toast.error("Please select a company for this course");
            return;
        }
        setSaving(true);
        try {
            await api.post('/courses', formData);
            toast.success("Course added successfully");
            setIsModalOpen(false);
            setFormData({ title: '', companyId: '', courseHead: '', description: '' });
            refetch();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to add course");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                    <p className="text-slate-500 text-sm font-medium">Loading courses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600 font-semibold">
                {error.message || 'Failed to load courses. Please try again.'}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-100 py-6 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Courses Directory</h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">
                            Manage curriculum, assigned colleges, and student batches.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Course
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                            Refresh List
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Search Bar & Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 border border-indigo-100/50 px-4 py-2 rounded-xl text-center shadow-xs">
                            <span className="block text-xl font-black text-indigo-700">{courses.length}</span>
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Total Courses</span>
                        </div>
                    </div>
                </div>

                {/* Courses Grid */}
                {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCourses.map((course) => {
                            const companyId = course.companyId?._id || course.companyId || '';
                            return (
                                <div
                                    key={course._id}
                                    onClick={() => router.push(`/dashboard/companies/${companyId}/courses/${course._id}`)}
                                    className="bg-white rounded-2xl border border-slate-100/80 shadow-xs hover:shadow-lg hover:border-indigo-100 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden group"
                                >
                                    {/* Icon Banner */}
                                    <div className="h-32 bg-gradient-to-br from-indigo-50/50 to-sky-50/30 flex items-center justify-center relative border-b border-slate-50">
                                        <div className="w-14 h-14 bg-indigo-100/80 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                                            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1.5 font-medium line-clamp-2 min-h-[32px]">
                                            {course.description || 'No description provided.'}
                                        </p>

                                        {/* Dynamic Stats Section */}
                                        <CourseStats courseId={course._id} />

                                        {/* Action Button */}
                                        <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-indigo-600 font-bold group-hover:text-indigo-700">
                                            <span>Open Details</span>
                                            <span>&rarr;</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-16 text-center max-w-lg mx-auto mt-12 shadow-sm">
                        <AcademicCapIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-bold text-lg mb-1">
                            {searchTerm ? 'No matching courses found' : 'No courses registered'}
                        </p>
                        <p className="text-slate-400 text-sm mb-4 px-6">
                            {searchTerm ? 'Check spelling or try a different term.' : 'Curriculum records created by administrators will show up here.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add Course Modal */}
            <Transition.Root show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <div className="dashboard-modal-scrollport fixed inset-0 z-10 overflow-y-auto">
                        <div className="dashboard-modal-center flex min-h-full items-center justify-center p-4 text-center sm:p-6">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="dashboard-modal-panel relative transform rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                    <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                        <button
                                            type="button"
                                            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            <span className="sr-only">Close</span>
                                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                                Add New Course
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <form onSubmit={handleSaveCourse} className="space-y-4">
                                                    <div>
                                                        <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                                                            Assign to Company
                                                        </label>
                                                        <select
                                                            id="companyId"
                                                            name="companyId"
                                                            required
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                                                            value={formData.companyId}
                                                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                                        >
                                                            <option value="">Select a company</option>
                                                            {companies.map((c) => (
                                                                <option key={c._id} value={c._id}>{c.name || c.companyName}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                                            Course Title
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="title"
                                                            id="title"
                                                            required
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            value={formData.title}
                                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="courseHead" className="block text-sm font-medium text-gray-700">
                                                            Course Head (Optional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="courseHead"
                                                            id="courseHead"
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            value={formData.courseHead}
                                                            onChange={(e) => setFormData({ ...formData, courseHead: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            name="description"
                                                            id="description"
                                                            rows={3}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            value={formData.description}
                                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                        <button
                                                            type="submit"
                                                            disabled={saving}
                                                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                                        >
                                                            {saving ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                                            onClick={() => setIsModalOpen(false)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
        </div>
    );
};

export default AllCoursesList;
