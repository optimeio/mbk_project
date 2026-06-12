"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import CTAButton from '@/components/common/CTAButton';

const PendingApproval = () => {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                        <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Approval Pending
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Your account is currently awaiting Super Admin approval.
                        <br />
                        Please wait for confirmation or contact support.
                    </p>
                </div>
                <CTAButton
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleLogout}
                >
                    Back to Login
                </CTAButton>
            </div>
        </div>
    );
};

export default PendingApproval;
