"use client";

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';

import { XMarkIcon, MapPinIcon, CheckCircleIcon, XCircleIcon, PencilIcon, CalendarIcon, ClockIcon, UserIcon, DocumentTextIcon, PhotoIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { FILE_BASE_URL } from '@/services/api';
import { getImagePreviewUrl } from '@/utils/imageUtils';

// Helper to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

// Helper: Calculate duration between two HH:mm strings
const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    try {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;

        let startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;

        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        const diffMinutes = endMinutes - startMinutes;
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;

        if (hours === 0) return `${mins}m`;
        return `${hours}h ${mins}m`;
    } catch (e) {
        return null;
    }
};

const DistanceDisplay = ({ checkInGeo, collegeLat, collegeLng }) => {
    if (!checkInGeo || !collegeLat || !collegeLng) return null;
    const parts = String(checkInGeo).split(',').map(s => s.trim());
    if (parts.length < 2) return null;
    const checkInLat = parseFloat(parts[0]);
    const checkInLng = parseFloat(parts[1]);
    if (Number.isNaN(checkInLat) || Number.isNaN(checkInLng)) return null;

    const distance = calculateDistance(checkInLat, checkInLng, collegeLat, collegeLng);
    const isWithinRange = distance <= 500; // 500 meters threshold

    return (
        <p className={`text-xs font-medium mt-1 ${isWithinRange ? 'text-green-600' : 'text-red-600'}`}>
            {isWithinRange ? (
                <span className="flex items-center">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    Within range ({Math.round(distance)}m)
                </span>
            ) : (
                <span className="flex items-center">
                    <XCircleIcon className="h-3 w-3 mr-1" />
                    Out of range ({Math.round(distance)}m)
                </span>
            )}
        </p>
    );
};

const DayDetailsModal = ({ open, onClose, day, college, trainers = [], onVerify, onSave, onDelete }) => {


    const [formData, setFormData] = useState({
        dayNumber: '',
        date: '',
        time: '',
        syllabusName: '',
        trainerId: '',
        geoTag: ''
    });
    const [imageError, setImageError] = useState(false);
    const [attendanceImage, setAttendanceImage] = useState(null);
    const [attendancePdf, setAttendancePdf] = useState(null);
    const [geoTagImage, setGeoTagImage] = useState(null);
    const [geoTagImages, setGeoTagImages] = useState([]);

    const [isEditing, setIsEditing] = useState(false);

    const toApiFileUrl = (filePath, { download = false } = {}) => {
        if (!filePath || typeof filePath !== 'string') return null;
        const token = localStorage.getItem('accessToken');
        const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
        const params = new URLSearchParams();
        if (token) params.set('token', token);
        if (download) params.set('download', 'true');
        const query = params.toString();
        return `${FILE_BASE_URL}/api/${normalizedPath}${query ? `?${query}` : ''}`;
    };

    const toViewUrl = (value, { download = false } = {}) => {
        if (!value || typeof value !== 'string') return null;
        return value.startsWith('http')
            ? value
            : toApiFileUrl(value, { download });
    };

    const toImageSrcUrl = (value) => {
        if (!value || typeof value !== 'string') return null;
        if (value.startsWith('http')) {
            return getImagePreviewUrl(value) || value;
        }
        return toApiFileUrl(value);
    };

    const getBase64ImageFromURL = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            img.onerror = (error) => reject(error);
            img.src = url;
        });
    };

    const handleDownloadPDF = async () => {
        try {
            const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ]);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(63, 81, 181); // Indigo color
            doc.text('Day Details Report', pageWidth / 2, 20, { align: 'center' });

            // Horizontal Line
            doc.setDrawColor(200, 200, 200);
            doc.line(14, 25, pageWidth - 14, 25);

            // Basic Info Section
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Overview', 14, 35);
            
            const trainerName = day.trainerName || 
                trainers.find(t => t._id === day.trainerId)?.userId?.name || 
                trainers.find(t => t._id === day.trainerId)?.name || 
                'N/A';

            autoTable(doc, {
                startY: 40,
                body: [
                    ['Trainer', trainerName],
                    ['Trainer ID', day.trainerCustomId || 'N/A'],
                    ['Date', (() => {
                    const d = day.date || day.scheduledDate;
                    if (!d || d === 'N/A') return 'N/A';
                    try {
                        if (typeof d === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
                            const [dd, mm, yyyy] = d.split('-');
                            return new Date(`${yyyy}-${mm}-${dd}`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        }
                        const parsed = new Date(d);
                        return !isNaN(parsed.getTime()) ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : d;
                    } catch (e) { return d; }
                })()],
                ['Schedule Time', day.time || (day.startTime && day.endTime ? `${day.startTime} - ${day.endTime}` : day.startTime) || 'N/A'],
                    ['Syllabus / Topic', day.syllabusName || 'N/A']
                ],
                theme: 'grid',
                headStyles: { fillColor: [63, 81, 181] },
                columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
            });

            // Attendance Section
            let currentY = doc.lastAutoTable.finalY + 15;
            doc.text('Attendance & Log Details', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                body: [
                    ['Students Present', day.studentsPresent || 0],
                    ['Students Absent', day.studentsAbsent || 0],
                    ['Check-In Time', day.checkInTime || '--:--'],
                    ['Check-Out Time', day.checkOutTime || '--:--'],
                    ['Total Log Time', calculateDuration(day.checkInTime, day.checkOutTime) || 'N/A']
                ],
                theme: 'grid',
                headStyles: { fillColor: [63, 81, 181] },
                columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
            });

            // Geo Tag Locations
            currentY = doc.lastAutoTable.finalY + 15;
            doc.text('Geo Tag Information', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                body: [
                    ['Check-In Address', day.checkIn?.location?.address || 'N/A'],
                    ['Check-Out Address', day.checkOut?.location?.address || 'N/A'],
                    ['Distance from College', day.checkIn?.location?.distanceFromCollege ? `${Math.round(day.checkIn.location.distanceFromCollege)}m` : 'N/A']
                ],
                theme: 'grid',
                headStyles: { fillColor: [63, 81, 181] },
                columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
            });

            // Geo Tag Images Section
            if ((day.checkOutGeoImageUrls && day.checkOutGeoImageUrls.length > 0) || day.attendanceImage) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Evidence & Photos', pageWidth / 2, 20, { align: 'center' });
                
                let imgY = 30;
                const imagesToProcess = [];

                if (day.attendanceImage) {
                    imagesToProcess.push({ 
                        label: 'Attendance Image', 
                        url: toImageSrcUrl(day.attendanceImage)
                    });
                }

                if (day.checkOutGeoImageUrls) {
                    day.checkOutGeoImageUrls.forEach((url, idx) => {
                        imagesToProcess.push({
                            label: `Geo Tag Image ${idx + 1}`,
                            url: toImageSrcUrl(url)
                        });
                    });
                }

                for (const item of imagesToProcess) {
                    try {
                        const base64Img = await getBase64ImageFromURL(item.url);
                        if (imgY + 90 > 280) { // Check for page break
                            doc.addPage();
                            imgY = 20;
                        }
                        doc.setFontSize(12);
                        doc.text(item.label, 14, imgY);
                        doc.addImage(base64Img, 'PNG', 14, imgY + 5, 80, 60);
                        imgY += 80;
                    } catch (e) {
                        console.error('Error adding image to PDF:', e);
                    }
                }
            }

            const dateStr = (() => {
            const d = day.date || day.scheduledDate;
            if (!d || d === 'N/A') return 'Report';
            try {
                if (typeof d === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(d)) return d;
                const parsed = new Date(d);
                return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : 'Report';
            } catch (e) { return 'Report'; }
        })();
        doc.save(`Day_Details_${day.dayNumber || dateStr}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    useEffect(() => {
        if (open) {
            if (day) {
                let dateValue = '';
                // Improved date extraction logic
                const targetDate = day.date || day.scheduledDate;
                if (targetDate) {
                    try {
                        let d;
                        // Handle DD-MM-YYYY format specifically if it fails standard parsing
                        if (typeof targetDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(targetDate)) {
                            const [dayPart, monthPart, yearPart] = targetDate.split('-');
                            d = new Date(`${yearPart}-${monthPart}-${dayPart}`);
                        } else {
                            d = new Date(targetDate);
                        }
                        
                        if (!isNaN(d.getTime())) {
                            dateValue = d.toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.error('Error parsing date for form:', e);
                    }
                }
                setFormData({
                    dayNumber: day.dayNumber,
                    date: dateValue,
                    time: day.time || day.startTime || '',
                    syllabusName: day.syllabusName || '',
                    trainerId: day.trainerId || '',
                    geoTag: day.geoTag || '',
                    verificationStatus: day.verificationStatus || 'pending',
                    geoVerificationStatus: day.geoVerificationStatus || 'pending'
                });
                setAttendanceImage(null);
                setAttendancePdf(null);
                setGeoTagImage(null);
                setGeoTagImages([]);
                setIsEditing(false);
            } else {
                setFormData({
                    dayNumber: '',
                    date: '',
                    time: '',
                    syllabusName: '',
                    trainerId: '',
                    geoTag: ''
                });
                setAttendanceImage(null);
                setAttendancePdf(null);
                setGeoTagImage(null);
                setGeoTagImages([]);
                setIsEditing(true);
            }
        }
    }, [open, day]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSave) {
            onSave({ ...formData, attendanceImage, attendancePdf, geoTagImage, geoTagImages });
        }
    };

    if (!open) return null;

    // If day exists, show details (existing logic)
    if (day) {
        const dayNumberValue = day.dayNumber ?? day.dayNo ?? day.dayIndex;
        const dayLabel = dayNumberValue ? `Day ${dayNumberValue}` : null;
        const driveFolderUrl = day.driveFolderLink
            || day.dayFolderLink
            || (day.driveFolderId ? `https://drive.google.com/drive/folders/${day.driveFolderId}` : null);

        const handleVerification = (status) => {
            if (onVerify) {
                onVerify(day.id, status);
            }
        };

        return (
            <Transition.Root show={open} as={Fragment}>
                <Dialog as="div" className="relative z-[70]" onClose={onClose}>
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
                                <Dialog.Panel className="dashboard-modal-panel dashboard-modal-panel--wide relative transform rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl sm:p-6">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                            <div className="flex items-center justify-between mb-6 border-b pb-4">
                                                <div className="flex items-center gap-3">
                                                    <Dialog.Title as="h2" className="text-xl font-bold text-gray-900">
                                                        {isEditing ? 'Edit Day Details' : 'Day Details'}
                                                    </Dialog.Title>
                                                    {!isEditing && dayLabel && (
                                                        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                            {dayLabel}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {!isEditing && (
                                                        <>
                                                            {driveFolderUrl && (
                                                                <a
                                                                    href={driveFolderUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition"
                                                                >
                                                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                                                    Open in Drive
                                                                </a>
                                                            )}
                                                            <button 
                                                                onClick={handleDownloadPDF} 
                                                                className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                                                            >
                                                                <ArrowDownTrayIcon className="w-4 h-4"/>
                                                                Download PDF
                                                            </button>
                                                            {onSave && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsEditing(true)}
                                                                    className="text-indigo-600 hover:text-indigo-900"
                                                                >
                                                                    <PencilIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={onClose}
                                                        className="text-gray-400 hover:text-gray-700 p-1"
                                                    >
                                                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                            {isEditing ? (
                                                <div className="mt-4">
                                                    <form onSubmit={handleSubmit} className="space-y-4">
                                                        <div>
                                                            <label htmlFor="dayNumber" className="block text-sm font-medium text-gray-700">Day Number</label>
                                                            <input
                                                                type="number"
                                                                name="dayNumber"
                                                                id="dayNumber"
                                                                required
                                                                value={formData.dayNumber}
                                                                onChange={(e) => setFormData({ ...formData, dayNumber: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                                            <input
                                                                type="date"
                                                                name="date"
                                                                id="date"
                                                                required
                                                                value={formData.date}
                                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
                                                            <input
                                                                type="time"
                                                                name="time"
                                                                id="time"
                                                                required
                                                                value={formData.time}
                                                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="syllabusName" className="block text-sm font-medium text-gray-700">Syllabus / Topic</label>
                                                            <input
                                                                type="text"
                                                                name="syllabusName"
                                                                id="syllabusName"
                                                                required
                                                                value={formData.syllabusName}
                                                                onChange={(e) => setFormData({ ...formData, syllabusName: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="trainerId" className="block text-sm font-medium text-gray-700">Trainer</label>
                                                            <select
                                                                name="trainerId"
                                                                id="trainerId"
                                                                required
                                                                value={formData.trainerId}
                                                                onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            >
                                                                <option value="">Select a Trainer</option>
                                                                {trainers.map((trainer) => (
                                                                    <option key={trainer._id} value={trainer._id}>
                                                                        {trainer.userId?.name || trainer.name || 'Unknown Trainer'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {trainers.length === 0 && (
                                                                <p className="mt-1 text-xs text-red-600">
                                                                    No trainers found for this college. Please assign trainers to the college first.
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label htmlFor="geoTag" className="block text-sm font-medium text-gray-700">Geo Tag (Lat, Lng)</label>
                                                            <input
                                                                type="text"
                                                                name="geoTag"
                                                                id="geoTag"
                                                                placeholder="e.g. 12.9716, 77.5946"
                                                                value={formData.geoTag}
                                                                onChange={(e) => setFormData({ ...formData, geoTag: e.target.value })}
                                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Geo Tag Images (Max 3)</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                onChange={(e) => setGeoTagImages(Array.from(e.target.files))}
                                                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                            />
                                                            {(day?.checkOutGeoImageUrl || (day?.checkOutGeoImageUrls && day.checkOutGeoImageUrls.length > 0)) && (!geoTagImages || geoTagImages.length === 0) && (
                                                                <p className="mt-1 text-xs text-gray-500">Current: Images present</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Attendance Image</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => setAttendanceImage(e.target.files[0])}
                                                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                            />
                                                            {day?.attendanceImage && !attendanceImage && (
                                                                <p className="mt-1 text-xs text-gray-500">Current: Image present</p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Attendance PDF</label>
                                                            <input
                                                                type="file"
                                                                accept="application/pdf"
                                                                onChange={(e) => setAttendancePdf(e.target.files[0])}
                                                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                            />
                                                            {day?.attendancePdfUrl && !attendancePdf && (
                                                                <p className="mt-1 text-xs text-gray-500">Current: PDF present</p>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label htmlFor="verificationStatus" className="block text-sm font-medium text-gray-700">Attendance Status</label>
                                                                <select
                                                                    name="verificationStatus"
                                                                    id="verificationStatus"
                                                                    value={formData.verificationStatus || 'pending'}
                                                                    onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
                                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                                >
                                                                    <option value="pending">Pending</option>
                                                                    <option value="approved">Approved</option>
                                                                    <option value="rejected">Rejected</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="geoVerificationStatus" className="block text-sm font-medium text-gray-700">Geo Tag Status</label>
                                                                <select
                                                                    name="geoVerificationStatus"
                                                                    id="geoVerificationStatus"
                                                                    value={formData.geoVerificationStatus || 'pending'}
                                                                    onChange={(e) => setFormData({ ...formData, geoVerificationStatus: e.target.value })}
                                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                                >
                                                                    <option value="pending">Pending</option>
                                                                    <option value="approved">Approved</option>
                                                                    <option value="rejected">Rejected</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                            <button
                                                                type="submit"
                                                                className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                                                onClick={() => setIsEditing(false)}
                                                            >
                                                                Cancel
                                                            </button>
                                                            {day && onDelete && (
                                                                <button
                                                                    type="button"
                                                                    className="mt-3 inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                                                                    onClick={() => {
                                                                        if (window.confirm('Are you sure you want to delete this day? This action cannot be undone.')) {
                                                                            onDelete(day.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </form>
                                                </div>
                                            ) : (
                                                <div className="mt-6 space-y-6">
                                                    {/* Top Row: Trainer and Schedule */}
                                                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                                                        {/* Trainer Card */}
                                                        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                                                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                                {day.trainerProfilePhoto && !imageError ? (
                                                                    <img
                                                                        src={day.trainerProfilePhoto.startsWith('http') ? day.trainerProfilePhoto : `${FILE_BASE_URL}/${day.trainerProfilePhoto.replace(/^\//, '').replace(/\\/g, '/')}`}
                                                                        alt="Trainer"
                                                                        className="h-10 w-10 rounded-lg object-cover"
                                                                        onError={() => setImageError(true)}
                                                                    />
                                                                ) : (
                                                                    <UserIcon className="w-5 h-5 text-indigo-600" />
                                                                )}
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-gray-500">Trainer</p>
                                                                <p className="font-semibold text-gray-900">
                                                                    {day.trainerName || 
                                                                     trainers.find(t => t._id === day.trainerId)?.userId?.name || 
                                                                     trainers.find(t => t._id === day.trainerId)?.name || 
                                                                     'Unknown'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Schedule Card */}
                                                        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
                                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                <CalendarIcon className="w-5 h-5 text-blue-600" />
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-gray-500">Schedule</p>
                                                                <p className="font-semibold text-gray-900">
                                                                    {(() => {
                                                                        const d = day.date || day.scheduledDate;
                                                                        const time = day.time || (day.startTime && day.endTime ? `${day.startTime} - ${day.endTime}` : day.startTime) || '09:00 - 17:00';
                                                                        
                                                                        let dateStr = d;
                                                                        if (d && d !== 'N/A') {
                                                                            try {
                                                                                if (typeof d === 'string' && d.length > 5 && isNaN(Date.parse(d)) === false) {
                                                                                    if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
                                                                                        const [dd, mm, yyyy] = d.split('-');
                                                                                        dateStr = new Date(`${yyyy}-${mm}-${dd}`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                                                                    } else {
                                                                                        dateStr = new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                                                                    }
                                                                                }
                                                                            } catch (e) {
                                                                                dateStr = d;
                                                                            }
                                                                        }
                                                                        
                                                                        return dateStr !== 'N/A' && dateStr ? `${dateStr} • ${time}` : time;
                                                                    })()}
                                                                </p>
                                                                {dayLabel && (
                                                                    <p className="mt-1 text-xs font-semibold text-indigo-600">
                                                                        {dayLabel}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Check In / Check Out Timeline (if exists) */}
                                                    {(day.checkInTime || day.checkOutTime) && (
                                                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                                            <h4 className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider mb-6">
                                                                <ClockIcon className="h-4 w-4 mr-1.5" />
                                                                Timeline
                                                            </h4>
                                                            <div className="relative px-2">
                                                                <div className="absolute top-[9px] left-0 w-full h-1 bg-gray-100 rounded-full" />
                                                                <div 
                                                                    className="absolute top-[9px] left-0 h-1 bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(79,70,229,0.4)]" 
                                                                    style={{ width: day.checkOutTime ? '100%' : '50%' }}
                                                                />
                                                                <div className="relative flex justify-between items-start">
                                                                    <div className="flex flex-col items-center">
                                                                        <div className={`h-4 w-4 rounded-full border-2 border-white shadow-sm ring-2 ${day.checkInTime ? 'bg-green-500 ring-green-100' : 'bg-gray-200 ring-gray-50'}`} />
                                                                        <div className="mt-2 text-center">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Check In</p>
                                                                            <p className="text-xs font-black text-gray-900">{day.checkInTime || '--:--'}</p>
                                                                        </div>
                                                                    </div>
                                                                    {day.checkInTime && day.checkOutTime && (
                                                                        <div className="flex flex-col items-center -mt-2">
                                                                            <div className="bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-sm flex items-center space-x-1">
                                                                                <ClockIcon className="h-3 w-3 text-indigo-500" />
                                                                                <span className="text-[10px] font-black text-indigo-700">
                                                                                    {calculateDuration(day.checkInTime, day.checkOutTime)}
                                                                                </span>
                                                                            </div>
                                                                            <p className="mt-1 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Total Log Time</p>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col items-center">
                                                                        <div className={`h-4 w-4 rounded-full border-2 border-white shadow-sm ring-2 ${day.checkOutTime ? 'bg-red-500 ring-red-100' : 'bg-gray-200 ring-gray-50'}`} />
                                                                        <div className="mt-2 text-center">
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Check Out</p>
                                                                            <p className="text-xs font-black text-gray-900">{day.checkOutTime || '--:--'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Syllabus Card */}
                                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm mb-6">
                                                        <p className="text-sm text-gray-500 mb-1">
                                                            Syllabus / Topic
                                                        </p>
                                                        <p className="text-gray-800 font-medium">
                                                            {day.syllabusName || 'No syllabus details available.'}
                                                        </p>
                                                    </div>

                                                    {/* Verification Status */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                Attendance
                                                            </span>
                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                day.verificationStatus?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' :
                                                                day.verificationStatus?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {day.verificationStatus || 'Pending'}
                                                            </span>
                                                        </div>
                                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                Geo Tag
                                                            </span>
                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                day.geoVerificationStatus?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' :
                                                                day.geoVerificationStatus?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {day.geoVerificationStatus || 'Pending'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Students Count Cards */}
                                                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                                                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                                                            <p className="text-xs text-green-700 uppercase font-semibold">
                                                                Students Present
                                                            </p>
                                                            <p className="text-3xl font-bold text-green-600 mt-2">
                                                                {day.studentsPresent || 0}
                                                            </p>
                                                        </div>
                                                        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                                                            <p className="text-xs text-red-700 uppercase font-semibold">
                                                                Students Absent
                                                            </p>
                                                            <p className="text-3xl font-bold text-red-600 mt-2">
                                                                {day.studentsAbsent || 0}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Documents & Evidence */}
                                                    <div className="space-y-4">
                                                        {day.attendancePdfUrl && (
                                                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Document</h4>
                                                                </div>
                                                                <div className="p-4 flex items-center justify-between">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="shrink-0">
                                                                            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                                                                                <DocumentTextIcon className="h-6 w-6 text-red-600" />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">Attendance.pdf</p>
                                                                            <p className="text-xs text-gray-500">PDF Document</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex space-x-2">
                                                                        <button
                                                                            onClick={() => window.open(`${FILE_BASE_URL}/api/attendance/${day.attendanceId || day._id || day.id}/export-excel?token=${localStorage.getItem('accessToken')}`, '_blank')}
                                                                            className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                                                                        >
                                                                           Export Excel
                                                                        </button>
                                                                        <a
                                                                            href={`${FILE_BASE_URL}/api/${day.attendancePdfUrl.replace(/\\/g, '/').replace(/^\/+/, '')}?token=${localStorage.getItem('accessToken')}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                                                        >
                                                                            View
                                                                        </a>
                                                                        <a
                                                                            href={`${FILE_BASE_URL}/api/${day.attendancePdfUrl.replace(/\\/g, '/').replace(/^\/+/, '')}?token=${localStorage.getItem('accessToken')}`}
                                                                            download
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                                                                        >
                                                                            Download PDF
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Detailed Location Info */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Check In Location */}
                                                            {day.checkIn?.location && (
                                                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                                    <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex justify-between items-center">
                                                                        <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider">Check-In Location</h4>
                                                                        {day.checkIn.location.lat && (
                                                                             <a href={`https://www.google.com/maps/search/?api=1&query=${day.checkIn.location.lat},${day.checkIn.location.lng}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800">
                                                                                 <MapPinIcon className="h-4 w-4" />
                                                                             </a>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-3">
                                                                        <a 
                                                                            href={`https://www.google.com/maps/search/?api=1&query=${day.checkIn.location.lat},${day.checkIn.location.lng}`} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="text-sm text-gray-800 hover:text-green-600 hover:underline block"
                                                                        >
                                                                            {day.checkIn.location.address || day.location || (day.checkIn.location.lat ? `${day.checkIn.location.lat?.toFixed(6) || '0.000000'}, ${day.checkIn.location.lng?.toFixed(6) || '0.000000'}` : 'Address details unavailable')}
                                                                        </a>
                                                                        {day.area && <p className="text-xs text-gray-500 mt-0.5">{day.area}</p>}
                                                                         {day.checkIn.location.distanceFromCollege && (
                                                                            <p className="text-xs font-medium text-green-600 mt-1">
                                                                                {Math.round(day.checkIn.location.distanceFromCollege)}m from College
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Check Out Location */}
                                                            {day.checkOut?.location && (
                                                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                                    <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex justify-between items-center">
                                                                        <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Check-Out Location</h4>
                                                                        {day.checkOut.location.lat && (
                                                                             <a href={`https://www.google.com/maps/search/?api=1&query=${day.checkOut.location.lat},${day.checkOut.location.lng}`} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-800">
                                                                                 <MapPinIcon className="h-4 w-4" />
                                                                             </a>
                                                                        )}
                                                                    </div>
                                                                    <div className="p-3">
                                                                        <a 
                                                                            href={`https://www.google.com/maps/search/?api=1&query=${day.checkOut.location.lat},${day.checkOut.location.lng}`} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="text-sm text-gray-800 hover:text-red-600 hover:underline block"
                                                                        >
                                                                            {day.checkOut.location.address || (day.checkOut.location.lat ? `${day.checkOut.location.lat?.toFixed(6) || '0.000000'}, ${day.checkOut.location.lng?.toFixed(6) || '0.000000'}` : 'Address details unavailable')}
                                                                        </a>
                                                                        {day.checkOut.location.distanceFromCollege && (
                                                                            <p className="text-xs font-medium text-green-600 mt-1">
                                                                                {Math.round(day.checkOut.location.distanceFromCollege)}m from College
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Images & Videos Gallery */}
                                                        {(day.attendanceImage || day.checkOutGeoImageUrl || (day.checkOutGeoImageUrls && day.checkOutGeoImageUrls.length > 0) || (day.activityVideos && day.activityVideos.length > 0)) && (
                                                            <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Photos & Evidence</h4>
                                                                </div>
                                                                <div className="p-4">
                                                                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                                        {/* Attendance Image */}
                                                                        {day.attendanceImage && (
                                                                            <div className="relative flex-none w-48 group">
                                                                                <img
                                                                                    src={toImageSrcUrl(day.attendanceImage)}
                                                                                    alt="Attendance"
                                                                                    className="h-32 w-full object-cover rounded-lg border border-gray-200"
                                                                                />
                                                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                                                    <a
                                                                                        href={toViewUrl(day.attendanceImage)}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                                                                                        title="View"
                                                                                    >
                                                                                        <PhotoIcon className="h-5 w-5" />
                                                                                    </a>
                                                                                    <a
                                                                                        href={toViewUrl(day.attendanceImage, { download: true })}
                                                                                        download
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                                                                                        title="Download"
                                                                                    >
                                                                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                                                                    </a>
                                                                                </div>
                                                                                <p className="mt-1 text-xs text-center text-gray-500 font-medium">Attendance</p>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* Geo Tag Images */}
                                                                        {(day.checkOutGeoImageUrls && day.checkOutGeoImageUrls.length > 0) &&
                                                                            day.checkOutGeoImageUrls.map((url, index) => (
                                                                                <div key={`img-${index}`} className="relative flex-none w-48 group">
                                                                                    <img
                                                                                        src={toImageSrcUrl(url)}
                                                                                        alt={`Geo Tag ${index + 1}`}
                                                                                        className="h-32 w-full object-cover rounded-lg border border-gray-200"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                                                        <a
                                                                                            href={toViewUrl(url)}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                                                                                            title="View"
                                                                                        >
                                                                                            <PhotoIcon className="h-5 w-5" />
                                                                                        </a>
                                                                                        <a
                                                                                            href={toViewUrl(url, { download: true })}
                                                                                            download
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                                                                                            title="Download"
                                                                                        >
                                                                                            <ArrowDownTrayIcon className="h-5 w-5" />
                                                                                        </a>
                                                                                    </div>
                                                                                    <p className="mt-1 text-xs text-center text-gray-500 font-medium">Site Photo {index + 1}</p>
                                                                                </div>
                                                                            ))
                                                                        }

                                                                        {/* Activity Videos */}
                                                                        {day.activityVideos && day.activityVideos.map((url, index) => (
                                                                             <div key={`vid-${index}`} className="relative flex-none w-48 group">
                                                                                <div className="h-32 w-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                                                                     <div className="text-center">
                                                                                        <span className="text-xs text-gray-500">Video {index + 1}</span>
                                                                                     </div>
                                                                                </div>
                                                                                 <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                                    <a
                                                                                        href={url.startsWith('http') 
                                                                                            ? url 
                                                                                            : `${FILE_BASE_URL}/api/${url.replace(/\\/g, '/').replace(/^\/+/, '')}?token=${localStorage.getItem('accessToken')}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                                                                                    >
                                                                                        <span className="text-xs font-bold">Play</span>
                                                                                    </a>
                                                                                </div>
                                                                                <p className="mt-1 text-xs text-center text-gray-500 font-medium">Activity Video {index + 1}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Verification Actions Footprint */}
                                                    <div className="mt-6">
                                                        {onVerify && (day.verificationStatus?.trim().toLowerCase() === 'pending' || day.verificationStatus?.trim().toLowerCase() === 'rejected') ? (
                                                            <div className="flex gap-4 pt-4 border-t">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleVerification('Approved')}
                                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition shadow"
                                                                >
                                                                    Approve Day
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleVerification('Rejected')}
                                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition shadow"
                                                                >
                                                                    Reject Day
                                                                </button>
                                                            </div>
                                                        ) : onVerify && day.verificationStatus?.trim().toLowerCase() === 'approved' && (
                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleVerification('Pending')}
                                                                    className="inline-flex justify-center items-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors uppercase tracking-wider"
                                                                >
                                                                    Reset Verification
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div >
                </Dialog >
            </Transition.Root >
        );
    }

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={onClose}>
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
                            <Dialog.Panel className="dashboard-modal-panel dashboard-modal-panel--wide relative transform rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl sm:p-6">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                        <div className="flex items-center justify-between mb-6 border-b pb-4">
                                            <div className="flex items-center gap-3">
                                                <Dialog.Title as="h2" className="text-xl font-bold text-gray-900">
                                                    Add New Day
                                                </Dialog.Title>
                                                {formData.dayNumber && (
                                                    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                        Day {formData.dayNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="text-gray-400 hover:text-gray-700 p-1"
                                            >
                                                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="mt-4">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div>
                                                    <label htmlFor="dayNumber" className="block text-sm font-medium text-gray-700">Day Number</label>
                                                    <input
                                                        type="number"
                                                        name="dayNumber"
                                                        id="dayNumber"
                                                        required
                                                        value={formData.dayNumber}
                                                        onChange={(e) => setFormData({ ...formData, dayNumber: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                                    <input
                                                        type="date"
                                                        name="date"
                                                        id="date"
                                                        required
                                                        value={formData.date}
                                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">Time</label>
                                                    <input
                                                        type="time"
                                                        name="time"
                                                        id="time"
                                                        required
                                                        value={formData.time}
                                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="syllabusName" className="block text-sm font-medium text-gray-700">Syllabus / Topic</label>
                                                    <input
                                                        type="text"
                                                        name="syllabusName"
                                                        id="syllabusName"
                                                        required
                                                        value={formData.syllabusName}
                                                        onChange={(e) => setFormData({ ...formData, syllabusName: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="trainerId" className="block text-sm font-medium text-gray-700">Trainer</label>
                                                    <select
                                                        name="trainerId"
                                                        id="trainerId"
                                                        required
                                                        value={formData.trainerId}
                                                        onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                    >
                                                        <option value="">Select a Trainer</option>
                                                        {trainers.map((trainer) => (
                                                            <option key={trainer._id} value={trainer._id}>
                                                                {trainer.userId?.name || trainer.name || 'Unknown Trainer'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="submit"
                                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                                        onClick={onClose}
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
    );
};

export default DayDetailsModal;
