"use client";

import { Fragment, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const MapPicker = dynamic(() => import('@/components/common/MapPicker'), {
    ssr: false,
});

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GEO_TAG_RADIUS_METERS = 10000;
const COORDINATE_PATTERNS = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]ll=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]center=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
];

const extractCoordinatesFromMapUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    let normalized = url.trim();
    if (!normalized) return null;

    try {
        normalized = decodeURIComponent(normalized);
    } catch (error) {
        // Use raw input if decoding fails.
    }

    for (const pattern of COORDINATE_PATTERNS) {
        const match = normalized.match(pattern);
        if (!match) continue;

        const lat = Number.parseFloat(match[1]);
        const lng = Number.parseFloat(match[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

        return { lat, lng };
    }

    return null;
};

const isGoogleMapsUrl = (value) => {
    if (!value || typeof value !== 'string') return false;
    try {
        const parsed = new URL(value.trim());
        const hostname = parsed.hostname.toLowerCase();
        const isGoogleDomain = hostname === 'google.com' || hostname === 'www.google.com' || hostname.endsWith('.google.com');
        return isGoogleDomain && parsed.pathname.includes('/maps');
    } catch (error) {
        return false;
    }
};

const CollegeModal = ({ open, onClose, onSave, initialData, courses, defaultCourseId }) => {
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [pickerLocation, setPickerLocation] = useState(null);
    const [mapUrlStatus, setMapUrlStatus] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        department: 'General',
        city: '',
        address: '',
        mapUrl: '',
        latitude: '',
        longitude: '',
        spocName: '',
        spocPhone: '',
    });


    useEffect(() => {
        setIsMapModalOpen(false);
        setPickerLocation(null);
        setMapUrlStatus('');
        if (initialData) {
            setFormData({
                ...initialData,
                department: initialData.department || 'General',
                address: initialData.address || initialData.location?.address || '',
                mapUrl: initialData.mapUrl || initialData.location?.mapUrl || '',
                latitude: initialData.latitude ?? initialData.location?.lat ?? '',
                longitude: initialData.longitude ?? initialData.location?.lng ?? '',
                spocName: initialData.spocName || initialData.principalName || '',
                spocPhone: initialData.spocPhone || initialData.phone || '',
            });
        } else {
            setFormData({
                name: '',
                department: 'General',
                city: '',
                address: '',
                mapUrl: '',
                latitude: '',
                longitude: '',
                spocName: '',
                spocPhone: '',
                courseId: defaultCourseId || '',
            });
        }
    }, [initialData, open, defaultCourseId]);

    const parsedLat = Number.parseFloat(formData.latitude);
    const parsedLng = Number.parseFloat(formData.longitude);
    const hasPickedLocation = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
    const hasValidGoogleMapsUrl = isGoogleMapsUrl(formData.mapUrl);

    const openMapUrlInNewTab = (url) => {
        if (!url || !isGoogleMapsUrl(url)) return;
        window.open(url.trim(), '_blank', 'noopener,noreferrer');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'mapUrl') {
            const trimmedValue = value.trim();
            const validGoogleUrl = isGoogleMapsUrl(trimmedValue);
            const extracted = validGoogleUrl ? extractCoordinatesFromMapUrl(trimmedValue) : null;

            setFormData((prev) => ({
                ...prev,
                mapUrl: value,
                ...(extracted
                    ? {
                        latitude: extracted.lat.toFixed(6),
                        longitude: extracted.lng.toFixed(6),
                    }
                    : {}),
            }));

            if (!trimmedValue) {
                setMapUrlStatus('');
            } else if (!validGoogleUrl) {
                setMapUrlStatus('Only google.com/maps URLs are allowed');
            } else if (extracted) {
                setPickerLocation(extracted);
                setMapUrlStatus(`Location detected: ${extracted.lat.toFixed(6)}, ${extracted.lng.toFixed(6)}`);
            } else {
                setMapUrlStatus('Invalid Google Maps URL');
            }
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleMapUrlPaste = (e) => {
        const pastedText = e.clipboardData?.getData('text') || '';
        if (isGoogleMapsUrl(pastedText)) {
            setTimeout(() => openMapUrlInNewTab(pastedText), 0);
        }
    };

    const openMapModal = () => {
        if (hasPickedLocation) {
            setPickerLocation({ lat: parsedLat, lng: parsedLng });
        } else {
            setPickerLocation(DEFAULT_CENTER);
        }
        setIsMapModalOpen(true);
    };

    const savePickedLocation = () => {
        if (!pickerLocation) return;
        const lat = Number(pickerLocation.lat).toFixed(6);
        const lng = Number(pickerLocation.lng).toFixed(6);

        setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));
        setIsMapModalOpen(false);
    };

    const clearPickedLocation = () => {
        setFormData((prev) => ({
            ...prev,
            latitude: '',
            longitude: '',
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const submissionData = {
            name: formData.name,
            department: formData.department?.trim() || 'General',
            city: formData.city,
            address: formData.address,
            mapUrl: formData.mapUrl?.trim() || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            spocName: formData.spocName,
            spocPhone: formData.spocPhone,
            // Backward compatibility fields
            principalName: formData.spocName,
            phone: formData.spocPhone,
        };

        onSave(submissionData);
        onClose();
    };

    return (
        <>
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
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

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                            {initialData ? 'Edit College' : 'Add New College'}
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                        College Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        id="name"
                                                        required
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        placeholder="Enter college name"
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                                                        Department
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="department"
                                                        id="department"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.department || ''}
                                                        onChange={handleChange}
                                                        placeholder="e.g. CSE, EEE, Mechanical"
                                                    />
                                                </div>


                                                <div>
                                                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                                        City
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="city"
                                                        id="city"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.city}
                                                        onChange={handleChange}
                                                        placeholder="Enter city"
                                                    />
                                                </div>
                                                
                                                {/* Location Details */}
                                                <div>
                                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                                        Address
                                                    </label>
                                                    <textarea
                                                        name="address"
                                                        id="address"
                                                        rows={2}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        placeholder="Enter full address"
                                                    />
                                                </div>
                                                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">
                                                                College Location
                                                            </label>
                                                            <p className="text-xs text-gray-500">
                                                                Paste Google Maps link or pick on map. Geo-tag uploads are accepted within 10 KM of this saved point.
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={openMapModal}
                                                                className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                                                            >
                                                                {hasPickedLocation ? 'Change Location' : 'Select Location'}
                                                            </button>
                                                            {hasPickedLocation && (
                                                                <button
                                                                    type="button"
                                                                    onClick={clearPickedLocation}
                                                                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                                                >
                                                                    Clear
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3">
                                                        <label htmlFor="mapUrl" className="block text-xs font-medium text-gray-700">
                                                            Google Maps Link (Optional)
                                                        </label>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <input
                                                                type="url"
                                                                name="mapUrl"
                                                                id="mapUrl"
                                                                className="block w-full rounded-md border border-gray-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                value={formData.mapUrl || ''}
                                                                onChange={handleChange}
                                                                onPaste={handleMapUrlPaste}
                                                                placeholder="https://www.google.com/maps/..."
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => openMapUrlInNewTab(formData.mapUrl)}
                                                                disabled={!hasValidGoogleMapsUrl}
                                                                className="inline-flex shrink-0 items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Open Map
                                                            </button>
                                                        </div>
                                                        {mapUrlStatus && (
                                                            <p className={`mt-1 text-xs ${mapUrlStatus.startsWith('Location detected') ? 'text-emerald-700' : 'text-red-600'}`}>
                                                                {mapUrlStatus}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {hasPickedLocation ? (
                                                        <>
                                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                                <p className="text-xs font-medium text-emerald-700">
                                                                    Saved: {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                                                                </p>
                                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                                                    10 KM verification radius
                                                                </span>
                                                            </div>
                                                            <div className="mt-2 overflow-hidden rounded-md border border-gray-200 bg-white">
                                                                <MapPicker
                                                                    initialMarker={{ lat: parsedLat, lng: parsedLng }}
                                                                    zoom={11}
                                                                    selectedZoom={11}
                                                                    radiusMeters={GEO_TAG_RADIUS_METERS}
                                                                    allowSelection={false}
                                                                    height={220}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <p className="mt-2 text-xs text-gray-500">No location selected yet.</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label htmlFor="spocName" className="block text-sm font-medium text-gray-700">
                                                        College SPOC Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="spocName"
                                                        id="spocName"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.spocName}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="spocPhone" className="block text-sm font-medium text-gray-700">
                                                        College SPOC Ph.No
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="spocPhone"
                                                        id="spocPhone"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                                        value={formData.spocPhone}
                                                        onChange={handleChange}
                                                    />
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
                                                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
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

        <Transition.Root show={isMapModalOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={() => setIsMapModalOpen(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40" />
                </Transition.Child>

                <div className="fixed inset-0 z-20 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl overflow-hidden rounded-xl bg-white p-4 shadow-2xl">
                                <div className="mb-3 flex items-center justify-between">
                                    <Dialog.Title className="text-base font-semibold text-gray-900">
                                        Select College Location
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={() => setIsMapModalOpen(false)}
                                        className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <MapPicker
                                    onSelect={setPickerLocation}
                                    initialMarker={pickerLocation || (hasPickedLocation ? { lat: parsedLat, lng: parsedLng } : null)}
                                    zoom={5}
                                    selectedZoom={12}
                                    radiusMeters={GEO_TAG_RADIUS_METERS}
                                />

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-gray-600">
                                        Click on map to place marker, then click <strong>Save Location</strong>. The blue circle shows the 10 KM verification area.
                                    </p>
                                    {pickerLocation && (
                                        <p className="text-xs font-medium text-indigo-700">
                                            {pickerLocation.lat.toFixed(6)}, {pickerLocation.lng.toFixed(6)}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsMapModalOpen(false)}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={savePickedLocation}
                                        disabled={!pickerLocation}
                                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Save Location
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
        </>
    );
};

export default CollegeModal;
