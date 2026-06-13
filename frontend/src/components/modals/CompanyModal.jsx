"use client";

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/services/api';
import { getImagePreviewUrl } from '@/utils/imageUtils';

const CompanyModal = ({ open, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        adminName: '',
        adminEmail: '',
        phone: '',
        address: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // OTP flow: step = 'idle' | 'otp_sent' | 'otp_verified'
    const [otpStep, setOtpStep] = useState('idle');
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                adminName: initialData.adminName || '',
                adminEmail: initialData.email || '',
                phone: initialData.phone || '',
                address: initialData.address || '',
            });
            setLogoPreview(getImagePreviewUrl(initialData.logo || initialData.logoUrl) || null);
        } else {
            setFormData({ name: '', adminName: '', adminEmail: '', phone: '', address: '' });
            setLogoFile(null);
            setLogoPreview(null);
        }
        setOtpStep('idle');
        setOtp('');
        setOtpMessage({ type: '', text: '' });
    }, [initialData, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // If email changes, reset OTP step
        if (name === 'adminEmail') {
            setOtpStep('idle');
            setOtp('');
            setOtpMessage({ type: '', text: '' });
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    // Step 1: Send OTP to admin email
    const handleSendOtp = async () => {
        setOtpMessage({ type: '', text: '' });
        if (!formData.adminEmail) {
            setOtpMessage({ type: 'error', text: 'Please enter the admin email first.' });
            return;
        }
        setOtpLoading(true);
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/companies/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: formData.adminEmail }),
            });
            const data = await res.json();
            if (res.ok) {
                setOtpStep('otp_sent');
                if (data.debugOtp) {
                    setOtp(String(data.debugOtp));
                    setOtpMessage({ type: 'success', text: `OTP generated. Use this code: ${data.debugOtp}` });
                } else {
                    setOtpMessage({ type: 'success', text: `OTP sent to ${formData.adminEmail}. Check inbox.` });
                }
            } else {
                setOtpMessage({ type: 'error', text: data.message || 'Failed to send OTP.' });
            }
        } catch {
            setOtpMessage({ type: 'error', text: 'Network error. Could not send OTP.' });
        } finally {
            setOtpLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        setOtpMessage({ type: '', text: '' });
        if (!otp || otp.length !== 6) {
            setOtpMessage({ type: 'error', text: 'Please enter the 6-digit OTP.' });
            return;
        }
        setOtpLoading(true);
        try {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/companies/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: formData.adminEmail, otp }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOtpStep('otp_verified');
                setOtpMessage({ type: 'success', text: '✅ Email verified! You can now create the company.' });
            } else {
                setOtpMessage({ type: 'error', text: data.message || 'OTP verification failed.' });
            }
        } catch {
            setOtpMessage({ type: 'error', text: 'Network error. Could not verify OTP.' });
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const submitData = new FormData();
        if (isEditMode) {
            // Strict update validation now requires immutable identity fields
            submitData.append('email', formData.adminEmail || '');
            submitData.append('companyCode', initialData?.companyCode || '');
            submitData.append('name', formData.name || '');
            submitData.append('adminName', formData.adminName || '');
            submitData.append('phone', formData.phone || '');
            submitData.append('address', formData.address || '');
        } else {
            // Legacy add flow payload
            submitData.append('name', formData.name || '');
            submitData.append('adminName', formData.adminName || '');
            submitData.append('adminEmail', formData.adminEmail || '');
            submitData.append('phone', formData.phone || '');
            submitData.append('address', formData.address || '');
        }
        if (logoFile) submitData.append('logo', logoFile);

        onSave(submitData);
        onClose();
    };

    const isEditMode = !!initialData;
    const canSubmit = isEditMode || otpStep === 'otp_verified';

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="dashboard-modal-scrollport fixed inset-0 z-10 overflow-y-auto">
                    <div className="dashboard-modal-center flex min-h-full items-center justify-center p-4 text-center sm:p-6">
                        <Transition.Child as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="dashboard-modal-panel relative transform rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                    <button type="button" className="rounded-md bg-white text-gray-400 hover:text-gray-500" onClick={onClose}>
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                            {isEditMode ? 'Edit Company' : 'Add New Company'}
                                        </Dialog.Title>

                                        <div className="mt-2">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {/* Logo Upload */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                                                    <div className="flex items-center space-x-4">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-contain border border-gray-300 rounded-lg" />
                                                        ) : (
                                                            <div className="h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                                                <PhotoIcon className="h-8 w-8 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <label className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                            <span>Choose File</span>
                                                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Company Name */}
                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
                                                    <input type="text" name="name" id="name" required
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                        value={formData.name} onChange={handleChange} />
                                                </div>

                                                {/* Admin Name */}
                                                <div>
                                                    <label htmlFor="adminName" className="block text-sm font-medium text-gray-700">Admin Name</label>
                                                    <input type="text" name="adminName" id="adminName" required
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                        value={formData.adminName} onChange={handleChange} />
                                                </div>

                                                {/* Admin Email + Send OTP */}
                                                <div>
                                                    <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                                                        Admin Email
                                                        {!isEditMode && <span className="ml-1 text-xs text-red-500">* OTP verification required</span>}
                                                    </label>
                                                    <div className="mt-1 flex gap-2">
                                                        <input type="email" name="adminEmail" id="adminEmail" required
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                            value={formData.adminEmail} onChange={handleChange}
                                                            disabled={!isEditMode && otpStep === 'otp_verified'} />
                                                        {!isEditMode && otpStep !== 'otp_verified' && (
                                                            <button type="button" onClick={handleSendOtp}
                                                                disabled={otpLoading || !formData.adminEmail}
                                                                className="shrink-0 px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                                                {otpLoading ? 'Sending…' : otpStep === 'otp_sent' ? 'Resend OTP' : 'Send OTP'}
                                                            </button>
                                                        )}
                                                        {!isEditMode && otpStep === 'otp_verified' && (
                                                            <span className="shrink-0 inline-flex items-center px-3 text-green-700 font-semibold text-sm">✅ Verified</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* OTP Input — visible after OTP is sent but not yet verified */}
                                                {!isEditMode && otpStep === 'otp_sent' && (
                                                    <div>
                                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Enter OTP</label>
                                                        <div className="mt-1 flex gap-2">
                                                            <input type="text" id="otp" maxLength={6} placeholder="6-digit code"
                                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 tracking-widest text-center text-lg font-semibold"
                                                                value={otp}
                                                                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpMessage({ type: '', text: '' }); }} />
                                                            <button type="button" onClick={handleVerifyOtp}
                                                                disabled={otpLoading || otp.length !== 6}
                                                                className="shrink-0 px-3 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                                                {otpLoading ? 'Verifying…' : 'Verify'}
                                                            </button>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-500">OTP is valid for 5 minutes.</p>
                                                    </div>
                                                )}

                                                {/* Status messages */}
                                                {otpMessage.text && (
                                                    <p className={`text-xs font-medium ${otpMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                                        {otpMessage.text}
                                                    </p>
                                                )}

                                                {/* Phone */}
                                                <div>
                                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                                                    <input type="tel" name="phone" id="phone"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                        value={formData.phone} onChange={handleChange} />
                                                </div>

                                                {/* Address */}
                                                <div>
                                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                                                    <textarea name="address" id="address" rows={3}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                                        value={formData.address} onChange={handleChange} />
                                                </div>

                                                {/* Actions */}
                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button type="submit" disabled={!canSubmit}
                                                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm">
                                                        {isEditMode ? 'Save Changes' : 'Create Company'}
                                                    </button>
                                                    <button type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                                                        onClick={onClose}>
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

export default CompanyModal;
