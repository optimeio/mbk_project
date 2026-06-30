"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon, ArrowPathIcon, BuildingOfficeIcon, UserIcon, EnvelopeIcon, AcademicCapIcon, MapPinIcon, MagnifyingGlassIcon, FunnelIcon, DocumentArrowDownIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { api, FILE_BASE_URL } from '@/services/api';
import { notify } from '@/lib/toast';

const CollegeModal = dynamic(() => import("@/components/modals/CollegeModal"), {
    ssr: false,
    loading: () => null,
});

const CourseModal = dynamic(() => import("@/components/modals/CourseModal"), {
    ssr: false,
    loading: () => null,
});

const PasswordConfirmationModal = dynamic(() => import("@/components/modals/PasswordConfirmationModal"), {
    ssr: false,
    loading: () => null,
});

const CompanyDetails = () => {
    const { id: routeId } = useParams();
    const id = useMemo(() => {
        if (routeId && routeId !== '1') return routeId;
        if (typeof window === 'undefined') return routeId;
        const match = window.location.pathname.match(/[a-f\d]{24}/i);
        return match ? match[0] : routeId;
    }, [routeId]);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [filterCourse, setFilterCourse] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getCourseImageUrl = (imageValue) => {
        if (!imageValue) return null;

        const rawValue = String(imageValue).trim();
        if (!rawValue) return null;

        if (
            rawValue.startsWith('http://') ||
            rawValue.startsWith('https://') ||
            rawValue.startsWith('data:') ||
            rawValue.startsWith('blob:')
        ) {
            return rawValue;
        }

        const normalizedPath = rawValue.replace(/\\/g, '/');
        const token = localStorage.getItem('accessToken');
        const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';

        // Stored as absolute/relative uploads path.
        if (normalizedPath.startsWith('/uploads/')) {
            return `${FILE_BASE_URL}${normalizedPath}${authQuery}`;
        }
        if (normalizedPath.includes('/uploads/')) {
            const uploadsPath = normalizedPath.slice(normalizedPath.indexOf('/uploads/'));
            return `${FILE_BASE_URL}${uploadsPath}${authQuery}`;
        }

        // Stored as filename only.
        const fileName = normalizedPath.split('/').pop();
        return `${FILE_BASE_URL}/uploads/trainer-documents/${encodeURIComponent(fileName)}${authQuery}`;
    };

    const companyDetailsQuery = useQuery({
        queryKey: ['admin', 'company-details', id],
        enabled: Boolean(id),
        queryFn: async () => {
            const [companyRes, coursesRes] = await Promise.all([
                api.get(`/companies/${id}`),
                api.get(`/courses?companyId=${id}`)
            ]);

            // For each course, fetch its colleges
            const coursesData = coursesRes || [];
            console.log('Fetched courses:', coursesData);

            const coursesWithColleges = await Promise.all(coursesData.map(async (course) => {
                try {
                    const collegesRes = await api.get(`/colleges?courseId=${course._id}`);
                    // Defensive check: ensure we have an array
                    const colleges = Array.isArray(collegesRes) ? collegesRes : (collegesRes.data || []);
                    console.log(`Fetched colleges for course ${course._id}:`, colleges);
                    return { ...course, colleges };
                } catch (err) {
                    console.error(`Error fetching colleges for course ${course._id}:`, err);
                    return { ...course, colleges: [] };
                }
            }));

            return {
                company: companyRes || null,
                courses: coursesWithColleges,
            };
        }
    });

    const company = companyDetailsQuery.data?.company || null;
    const courses = companyDetailsQuery.data?.courses || [];

    const refetchCompanyDetails = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'company-details', id] });
    }, [id, queryClient]);

    const [expandedCourse, setExpandedCourse] = useState(null);
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);

    const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
    const [editingCollege, setEditingCollege] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteItem, setDeleteItem] = useState(null); // { type: 'course'|'college', id, name, parentId }

    // Course Handlers
    const handleAddCourse = () => {
        setEditingCourse(null);
        setIsCourseModalOpen(true);
    };

    const handleEditCourse = (course, e) => {
        e.stopPropagation();
        setEditingCourse(course);
        setIsCourseModalOpen(true);
    };

    const handleDeleteCourse = (courseId, e) => {
        e.stopPropagation();
        const course = courses.find(c => c._id === courseId);
        setDeleteItem({
            type: 'course',
            id: courseId,
            name: course?.title || 'this course',
        });
        setIsDeleteModalOpen(true);
    };

    const handleDeleteCollege = (collegeId, courseId) => {
        // Need to find college name for display
        let collegeName = 'this college';
        const course = courses.find(c => c._id === courseId);
        if (course && course.colleges) {
            const college = course.colleges.find(c => c._id === collegeId);
            if (college) collegeName = college.name;
        }

        setDeleteItem({
            type: 'college',
            id: collegeId,
            name: collegeName,
            parentId: courseId
        });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (password) => {
        if (!deleteItem) return;

        try {
            // 1. Verify Password
            const verifyRes = await api.post('/users/verify-password', { password });
            if (!verifyRes.success) {
                throw new Error(verifyRes.message || 'Incorrect password');
            }

            // 2. Proceed with Delete based on type
            if (deleteItem.type === 'course') {
                console.log('Deleting course:', deleteItem.id);
                await api.delete(`/courses/${deleteItem.id}`);
                await refetchCompanyDetails();
                notify.success('Course deleted successfully!');
            } else if (deleteItem.type === 'college') {
                console.log('Deleting college:', deleteItem.id);
                await api.delete(`/colleges/${deleteItem.id}`);
                await refetchCompanyDetails();
                notify.success('College deleted successfully!');
            }

            setIsDeleteModalOpen(false);
            setDeleteItem(null);

        } catch (error) {
            console.error('Error deleting item:', error);
            notify.error(error.response?.data?.message || error.message || 'Failed to delete item');
            if (error.message.includes('password')) {
                throw error;
            }
        }
    };

    const handleSaveCourse = async (data) => {
        try {
            if (editingCourse) {
                await api.put(`/courses/${editingCourse._id}`, data);
            } else {
                await api.post('/courses', { ...data, companyId: id });
            }
            await refetchCompanyDetails();
            setIsCourseModalOpen(false);
        } catch (error) {
            console.error('Error saving course:', error);
            notify.error('Failed to save course');
        }
    };

    const toggleCourse = (courseId) => {
        if (expandedCourse === courseId) {
            setExpandedCourse(null);
        } else {
            setExpandedCourse(courseId);
        }
    };

    // College Handlers
    const handleAddCollege = (courseId, e) => {
        e.stopPropagation();
        console.log('handleAddCollege called with courseId:', courseId);
        setSelectedCourseId(courseId);
        setEditingCollege(null);
        setIsCollegeModalOpen(true);
        // Auto-expand
        setExpandedCourse(courseId);
    };

    const handleEditCollege = (college, courseId) => {
        setSelectedCourseId(courseId);
        setEditingCollege(college);
        setIsCollegeModalOpen(true);
    };

    const handleSaveCollege = async (data) => {
        try {
            console.log('Saving college data:', data);
            let savedCollege;
            // Extract file from data (it's added to formData in modal)
            const { studentAttendanceExcel, ...collegeData } = data;

            if (editingCollege) {
                savedCollege = await api.put(`/colleges/${editingCollege._id}`, collegeData);
            } else {
                console.log('handleSaveCollege selectedCourseId:', selectedCourseId);
                const payload = { ...collegeData, companyId: id, courseId: selectedCourseId };
                console.log('Creating college with payload:', payload);
                savedCollege = await api.post('/colleges', payload);
            }

            // Handle Excel Upload if file exists
            if (studentAttendanceExcel) {
                const collegeId = savedCollege._id || savedCollege.id; // Ensure we get ID
                console.log('Uploading attendance excel for college:', collegeId);
                
                const formData = new FormData();
                formData.append('file', studentAttendanceExcel); // 'file' matches backend middleware

                await api.post(`/colleges/${collegeId}/upload-attendance`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                console.log('Attendance excel uploaded successfully');
            }

            // Refresh data from server to ensure consistency
            await refetchCompanyDetails();

            setIsCollegeModalOpen(false);

            // Ensure expanded
            if (selectedCourseId && expandedCourse !== selectedCourseId) {
                setExpandedCourse(selectedCourseId);
            }
            notify.success('College saved successfully!');

        } catch (error) {
            console.error('Error saving college:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
            notify.error(`Failed to save college: ${errorMsg}`);
        }
    };

    // Course Image Upload
    const handleCourseImageUpload = async (courseId, e) => {
        e.stopPropagation();
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('image', file);
            await api.post(`/courses/${courseId}/upload-image`, formData);
            await refetchCompanyDetails();
        } catch (error) {
            console.error('Error uploading course image:', error);
            notify.error('Failed to upload image');
        }
    };

    if (companyDetailsQuery.isPending && !company) return <div className="p-8 text-center">Loading...</div>;
    if (companyDetailsQuery.error) return <div className="p-8 text-center text-red-600">{companyDetailsQuery.error.message || 'Failed to load company details'}</div>;
    if (!company) return <div className="p-8 text-center">Company not found</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => router.push('/dashboard/companies')}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5 mr-2" />
                            Back to Companies
                        </button>
                        <button
                            onClick={() => companyDetailsQuery.refetch()}
                            className="flex items-center text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Company Info Cards */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="shrink-0">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <BuildingOfficeIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Company Name</p>
                                    <p className="text-lg font-semibold text-gray-900 mt-1">{company.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="shrink-0">
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Admin Name</p>
                                    <p className="text-lg font-semibold text-gray-900 mt-1">{company.adminName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="shrink-0">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <EnvelopeIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-sm font-medium text-gray-600">Admin Email</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-1 break-all">{company.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Courses Section */}
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Courses</h2>
                            <p className="text-sm text-gray-600 mt-1">Manage courses and their colleges</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search courses or colleges..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div className="relative w-full sm:w-48">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none"
                                >
                                    <option value="all">All Courses</option>
                                    {[...new Set(courses.map(c => c.title))].map(title => (
                                        <option key={title} value={title}>{title}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCourse}
                                className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Add Course
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                        {courses
                            .filter((course) => {
                                const searchLower = searchTerm.toLowerCase();
                                const matchesCourse = course.title?.toLowerCase().includes(searchLower);
                                const matchesColleges = course.colleges?.some((college) =>
                                    college.name?.toLowerCase().includes(searchLower)
                                );
                                const matchesFilter = filterCourse === 'all' || course.title === filterCourse;
                                return (matchesCourse || matchesColleges) && matchesFilter;
                            })
                            .map((course) => {
                                const collegeCount = (course.colleges || []).length;
                                const createdAt = course.createdAt
                                    ? new Date(course.createdAt).toLocaleDateString()
                                    : 'N/A';
                                const imageUrl = getCourseImageUrl(course.image);

                                return (
                                    <div
                                        key={`card-${course._id}`}
                                        onClick={() => router.push(`/dashboard/companies/${id}/courses/${course._id}`)}
                                        className="bg-white rounded-2xl shadow-[0_6px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_30px_rgba(79,70,229,0.20)] transition duration-300 cursor-pointer border border-gray-100 overflow-hidden flex flex-col"
                                    >
                                        {/* Image Area */}
                                        <div className="relative h-44 bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center overflow-hidden">
                                            {imageUrl ? (
                                                <img loading="lazy"
                                                    src={imageUrl}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <AcademicCapIcon className="h-16 w-16 text-indigo-200" />
                                            )}
                                            {/* Upload Image Button */}
                                            <label
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg p-2 cursor-pointer hover:bg-white transition-colors shadow-sm border border-gray-200"
                                                title="Upload Image"
                                            >
                                                <PhotoIcon className="h-4 w-4 text-gray-600" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleCourseImageUpload(course._id, e)}
                                                />
                                            </label>
                                        </div>

                                        {/* Card Body */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-bold text-gray-800 truncate">
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {collegeCount} {collegeCount === 1 ? 'College' : 'Colleges'}
                                                    </p>
                                                </div>
                                            </div>

                                            {course.description && (
                                                <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                                                    {course.description}
                                                </p>
                                            )}

                                            <div className="text-xs text-gray-400 mb-4">
                                                Created {createdAt}
                                            </div>

                                            <div className="mt-auto flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/companies/${id}/courses/${course._id}`);
                                                    }}
                                                    className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={(e) => handleAddCollege(course._id, e)}
                                                    className="inline-flex items-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
                                                >
                                                    <PlusIcon className="h-3.5 w-3.5 mr-1" />
                                                    Add College
                                                </button>
                                                <button
                                                    onClick={(e) => handleEditCourse(course, e)}
                                                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                    title="Edit Course"
                                                >
                                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCourse(course._id, e)}
                                                    className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Delete Course"
                                                >
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="hidden space-y-4">
                        {courses.filter(course => {
                            const searchLower = searchTerm.toLowerCase();
                            const matchesCourse = course.title?.toLowerCase().includes(searchLower);
                            const matchesColleges = course.colleges?.some(college => college.name?.toLowerCase().includes(searchLower));
                            const matchesFilter = filterCourse === 'all' || course.title === filterCourse;
                            return (matchesCourse || matchesColleges) && matchesFilter;
                        }).map((course) => {
                            const searchLower = searchTerm.toLowerCase();
                            const filteredColleges = (course.colleges || []).filter(college => 
                                college.name?.toLowerCase().includes(searchLower) || 
                                course.title?.toLowerCase().includes(searchLower)
                            );
                            const colleges = filteredColleges;
                            const isExpanded = expandedCourse === course._id || (searchTerm && filteredColleges.length > 0);
                            
                            return (
                                <div key={course._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                                    {/* Course Header */}
                                    <div className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div 
                                                className="flex-1 cursor-pointer group"
                                                onClick={() => toggleCourse(course._id)}
                                            >
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-indigo-200 transition-colors">
                                                        <AcademicCapIcon className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center">
                                                            <h3 className="text-lg font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                                                {course.title}
                                                            </h3>
                                                            {isExpanded ? (
                                                                <ChevronUpIcon className="h-5 w-5 text-gray-400 ml-2 group-hover:text-indigo-600 transition-colors" />
                                                            ) : (
                                                                <ChevronDownIcon className="h-5 w-5 text-gray-400 ml-2 group-hover:text-indigo-600 transition-colors" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {course.courseHead ? `Course Head: ${course.courseHead}` : 'No course head assigned'} • {colleges.length} {colleges.length === 1 ? 'College' : 'Colleges'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-2 ml-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/companies/${id}/courses/${course._id}`);
                                                    }}
                                                    className="inline-flex items-center px-3 py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    View Colleges
                                                </button>
                                                <button
                                                    onClick={(e) => handleAddCollege(course._id, e)}
                                                    className="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <PlusIcon className="h-4 w-4 mr-1.5" />
                                                    Add College
                                                </button>
                                                <button
                                                    onClick={(e) => handleEditCourse(course, e)}
                                                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Course"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCourse(course._id, e)}
                                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Course"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Colleges List */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-200 bg-gray-50">
                                            {colleges.length > 0 ? (
                                                <div className="p-4">
                                                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                                        {colleges.map((college) => (
                                                            <div
                                                                key={college._id}
                                                                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                                                            >
                                                                <div className="flex items-center min-w-0 flex-1">
                                                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-indigo-100 transition-colors">
                                                                        <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <button
                                                                            onClick={() => router.push(`/dashboard/companies/college/${college._id}`)}
                                                                            className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate block"
                                                                        >
                                                                            {college.name}
                                                                        </button>
                                                                        <div className="flex flex-col mt-1 text-sm text-gray-500 space-y-1">
                                                                            <div className="flex items-center space-x-3">
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                                                    Dept: {college.department || 'General'}
                                                                                </span>
                                                                                <span className="flex items-center">
                                                                                    <MapPinIcon className="h-3.5 w-3.5 mr-1" />
                                                                                    {college.city}
                                                                                </span>
                                                                            </div>
                                                                            {college.location?.address && (
                                                                                <p className="text-xs text-gray-400 truncate max-w-md" title={college.location.address}>
                                                                                    {college.location.address}
                                                                                </p>
                                                                            )}
                                                                            {college.location?.lat && college.location?.lng && (
                                                                                <a 
                                                                                    href={`https://www.google.com/maps?q=${college.location.lat},${college.location.lng}`} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MapPinIcon className="h-3 w-3 mr-1" />
                                                                                    View on Map
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                    <div className="flex items-center space-x-2 ml-4">
                                                                    {/* Download Excel Option */}
                                                                    {college.studentAttendanceExcelUrl && (
                                                                        <a
                                                                            href={`${FILE_BASE_URL}/uploads/trainer-documents/${college.studentAttendanceExcelUrl.split(/[\\/]/).pop()}?token=${localStorage.getItem('accessToken')}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                                                            title="Download Attendance Excel"
                                                                        >
                                                                            <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                                                                            Excel
                                                                        </a>
                                                                    )}
                                                                    <button
                                                                        onClick={() => router.push(`/dashboard/companies/college/${college._id}`)}
                                                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                    >
                                                                        <EyeIcon className="h-4 w-4 mr-1.5" />
                                                                        View
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEditCollege(college, course._id)}
                                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <PencilSquareIcon className="h-5 w-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteCollege(college._id, course._id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <TrashIcon className="h-5 w-5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <p className="text-sm text-gray-500">No colleges added to this course yet.</p>
                                                    <button
                                                        onClick={(e) => handleAddCollege(course._id, e)}
                                                        className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <PlusIcon className="h-4 w-4 mr-2" />
                                                        Add First College
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <CourseModal
                open={isCourseModalOpen}
                onClose={() => setIsCourseModalOpen(false)}
                onSave={handleSaveCourse}
                initialData={editingCourse}
            />

            <CollegeModal
                open={isCollegeModalOpen}
                onClose={() => setIsCollegeModalOpen(false)}
                onSave={handleSaveCollege}
                initialData={editingCollege}
                courses={courses}
                defaultCourseId={selectedCourseId}
            />

            <PasswordConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteItem(null);
                }}
                onConfirm={handleConfirmDelete}
                title={`Delete ${deleteItem?.type === 'course' ? 'Course' : 'College'}`}
                message={`Are you sure you want to delete ${deleteItem?.type} "${deleteItem?.name}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default CompanyDetails;
