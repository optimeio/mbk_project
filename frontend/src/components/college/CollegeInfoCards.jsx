"use client";

import { BuildingOfficeIcon, MapPinIcon, UserIcon, PhoneIcon, DocumentArrowDownIcon, TrashIcon, ArrowUpTrayIcon, UsersIcon } from '@heroicons/react/24/outline';
import { api, FILE_BASE_URL } from '@/services/api';

const CollegeInfoCards = ({ college, department }) => {
    if (!college) return null;
    const collegeId = college._id || college.id;

    return (
        <div id="college-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* College Name Card */}
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100">
                        <BuildingOfficeIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">College Name</p>
                        <p className="text-sm font-semibold text-gray-900 wrap-break-word line-clamp-2" title={college.name}>
                            {college.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Location Card */}
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 flex flex-col justify-center overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                        <MapPinIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                        <div className="text-sm border-gray-900 font-semibold text-gray-900 leading-tight">
                            {college.city ? (
                                <span>{college.city}</span>
                            ) : (
                                <span>N/A</span>
                            )}
                        </div>
                        {college.location?.address && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={college.location.address}>
                                {college.location.address}
                            </p>
                        )}
                        {(college.location?.mapUrl || college.mapUrl || (college.location?.lat && college.location?.lng)) && (
                            <a 
                                href={college.location.mapUrl || college.mapUrl || `https://www.google.com/maps?q=${college.location.lat},${college.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center mt-1 font-medium"
                            >
                                View on Map &rarr;
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* SPOC Name Card */}
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Company Spoc</p>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={college.principalName || college.collegeSpoc || 'N/A'}>
                            {college.principalName || college.collegeSpoc || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* SPOC Phone Card */}
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100">
                        <PhoneIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Contact Phone</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                            {college.phone || college.companySpoc || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Department Card */}
            <div id="department-section" className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-5 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="shrink-0 w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center border border-cyan-100">
                        <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-500 mb-1">Department</p>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={department}>
                            {department}
                        </p>
                    </div>
                </div>
            </div>

            {/* Student List Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                        <UsersIcon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900">Student List</h4>
                        {college.studentAttendanceExcelUrl ? (
                            <p className="text-xs font-medium text-green-600 mt-0.5 px-2 py-0.5 bg-green-50 rounded-full inline-block">Uploaded</p>
                        ) : (
                            <p className="text-xs text-gray-500 mt-1 truncate">No list uploaded</p>
                        )}
                    </div>
                </div>

                <div className="mt-auto">
                    {college.studentAttendanceExcelUrl ? (
                        <div className="space-y-2">
                            <a 
                                href={`${FILE_BASE_URL}/api/uploads/trainer-documents/${college.studentAttendanceExcelUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center px-4 py-2 border border-indigo-200 shadow-sm text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                Download List
                            </a>
                            <button
                                onClick={async () => {
                                    if (!confirm('WARNING: Are you sure you want to delete ALL students for this college?\n\nThis cannot be undone.')) return;
                                    try {
                                        const res = await api.delete(`/students/clean/${collegeId}`);
                                        if (res.success) {
                                            alert(res.message);
                                            window.location.reload();
                                        } else {
                                            alert('Failed: ' + res.message);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Error deleting list');
                                    }
                                }}
                                className="w-full flex items-center justify-center px-4 py-2 border border-red-200 shadow-sm text-xs font-semibold rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Delete All
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer group flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-indigo-400 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ArrowUpTrayIcon className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                                <p className="text-xs font-semibold text-gray-600 group-hover:text-indigo-600">Upload Excel</p>
                                <p className="text-[10px] text-gray-500 mt-1">Max 500 students</p>
                            </div>
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".xlsx, .xls"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    if (!confirm(`Upload "${file.name}" as the student list for this college?`)) return;

                                    const formData = new FormData();
                                    formData.append('file', file);
                                    formData.append('collegeId', collegeId);

                                    try {
                                        const res = await api.post('/students/upload', formData);
                                        if (res.success) {
                                            alert(res.message);
                                            window.location.reload(); 
                                        } else {
                                            alert('Upload failed: ' + res.message);
                                        }
                                    } catch (err) {
                                        console.error('Upload Error:', err);
                                        alert('Error uploading file');
                                    }
                                    e.target.value = null;
                                }}
                            />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollegeInfoCards;
