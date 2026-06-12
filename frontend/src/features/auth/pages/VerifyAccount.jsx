"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { api } from '@/services/api';
import CTAButton from '@/components/common/CTAButton';

const VerifyAccount = () => {
    const { token: tokenParam } = useParams();
    const router = useRouter();
    const [queryToken, setQueryToken] = useState('');
    const token = tokenParam || queryToken;

    const [loading, setLoading] = useState(true);
    const [validToken, setValidToken] = useState(false);
    const [userData, setUserData] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        companyName: '',
        phone: '',
        address: '',
        adminName: '',
    });
    const [logo, setLogo] = useState(null);

    const verifyToken = async () => {
        try {
            const response = await api.get(`/company-invite/${token}`);
            if (response?.success) {
                setValidToken(true);
                setUserData(response);
                setForm((prev) => ({
                    ...prev,
                    adminName: response?.name || '',
                }));
            }
        } catch (err) {
            console.error('Token verification failed:', err);
            setError('Invalid or expired invitation link.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        setQueryToken(params.get('token') || '');
    }, []);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }
        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.companyName || !form.phone || !form.address || !form.adminName) {
            setError('Please complete all required fields.');
            return;
        }

        try {
            setSubmitting(true);
            const payload = new FormData();
            payload.append('token', token);
            payload.append('companyName', form.companyName);
            payload.append('phone', form.phone);
            payload.append('address', form.address);
            payload.append('adminName', form.adminName);
            if (logo) payload.append('logo', logo);

            const response = await api.post('/company-invite/complete', payload);

            if (response?.success) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            }
        } catch (err) {
            console.error('Onboarding failed:', err);
            setError(err.message || 'Failed to complete onboarding');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    if (!token || !validToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Invalid Invitation</h2>
                        <p className="mt-2 text-sm text-red-600">
                            {error || 'The invitation link is missing or invalid.'}
                        </p>
                        <div className="mt-6">
                            <CTAButton
                                type="button"
                                variant="ghost"
                                size="md"
                                onClick={() => router.push('/login')}
                            >
                                Return to Login
                            </CTAButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Account Setup Complete!</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Company created and admin account activated. Redirecting to login...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Complete Company Onboarding
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Invite accepted for <strong>{userData?.email}</strong>. Fill details to activate your account.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="adminName" className="block text-sm text-gray-700 mb-1">Admin Name</label>
                            <input
                                id="adminName"
                                name="adminName"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={form.adminName}
                                onChange={(e) => setForm((prev) => ({ ...prev, adminName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="companyName" className="block text-sm text-gray-700 mb-1">Company Name</label>
                            <input
                                id="companyName"
                                name="companyName"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={form.companyName}
                                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm text-gray-700 mb-1">Phone</label>
                            <input
                                id="phone"
                                name="phone"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={form.phone}
                                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm text-gray-700 mb-1">Address</label>
                            <textarea
                                id="address"
                                name="address"
                                rows={3}
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={form.address}
                                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="logo" className="block text-sm text-gray-700 mb-1">Company Logo (optional)</label>
                            <input
                                id="logo"
                                name="logo"
                                type="file"
                                accept="image/*"
                                className="block w-full text-sm text-gray-700"
                                onChange={(e) => setLogo(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <CTAButton
                        type="submit"
                        variant="company"
                        size="lg"
                        fullWidth
                        loading={submitting}
                        loadingText="Submitting..."
                    >
                        Submit Onboarding
                    </CTAButton>
                </form>
            </div>
        </div>
    );
};

export default VerifyAccount;
