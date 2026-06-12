"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { api } from '@/services/api';

const VerifyEmail = () => {
    const { token } = useParams();
    const router = useRouter();
    const redirectTimerRef = useRef(null);
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const response = await api.get(`/auth/verify-email/${token}`);

                if (response?.success) {
                    setStatus('success');
                    setMessage(response?.message || 'Email verified successfully');
                    // Redirect to login after 3 seconds
                    redirectTimerRef.current = setTimeout(() => {
                        router.push('/login');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(response?.message || 'Invalid or expired verification link');
                }
            } catch (err) {
                console.error('Email verification error:', err);
                setStatus('error');
                setMessage(
                    err?.response?.data?.message ||
                    'Failed to verify email. The link may be invalid or expired.'
                );
            }
        };

        if (token) {
            verifyEmail();
        }

        return () => {
            if (redirectTimerRef.current) {
                clearTimeout(redirectTimerRef.current);
                redirectTimerRef.current = null;
            }
        };
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    {status === 'verifying' && (
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    )}

                    {status === 'success' && (
                        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    )}

                    {status === 'error' && (
                        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    )}

                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {status === 'verifying' && 'Verifying Email'}
                        {status === 'success' && 'Email Verified!'}
                        {status === 'error' && 'Verification Failed'}
                    </h2>

                    <p className="mt-4 text-sm text-gray-600">
                        {message}
                    </p>

                    {status === 'success' && (
                        <p className="mt-2 text-xs text-gray-500">
                            Redirecting to login page...
                        </p>
                    )}

                    <div className="mt-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
