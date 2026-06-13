"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { EnvelopeIcon, KeyIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { forgotPassword, verifyResetOTP, resetPassword } from '@/services/api';
import CTAButton from '@/components/common/CTAButton';

const ForgotPassword = () => {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tempToken, setTempToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await forgotPassword(email);
            if (response.success) {
                setMessage(response.message);
                setStep(2);
            } else {
                setError(response.message);
            }
        } catch (err) {
            if (err?.status === 429) {
                const retryAfter = err?.response?.retryAfterSeconds;
                setError(
                    retryAfter
                        ? `Too many requests. Try again in ${retryAfter} seconds.`
                        : 'Too many requests. Please wait a few minutes and try again.',
                );
            } else {
                setError(err?.message || 'Failed to send OTP. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await verifyResetOTP(email, otp);
            if (response.success) {
                setTempToken(response.tempToken);
                setMessage('OTP Verified. Please set your new password.');
                setStep(3);
            } else {
                setError(response.message);
            }
        } catch (err) {
            if (err?.status === 429) {
                const retryAfter = err?.response?.retryAfterSeconds;
                setError(
                    retryAfter
                        ? `Too many OTP attempts. Try again in ${retryAfter} seconds.`
                        : 'Too many OTP attempts. Please wait a few minutes and try again.',
                );
            } else {
                setError(err?.message || 'Invalid OTP. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (loading) return;
        setLoading(true);

        try {
            const response = await resetPassword(tempToken, password);
            if (response.success) {
                setMessage('Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setError(response.message);
            }
        } catch (err) {
            if (err?.status === 429) {
                const retryAfter = err?.response?.retryAfterSeconds;
                setError(
                    retryAfter
                        ? `Too many reset attempts. Try again in ${retryAfter} seconds.`
                        : 'Too many reset attempts. Please wait 15 minutes and try again.',
                );
            } else {
                setError(err?.message || 'Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {step === 1 && 'Reset Password'}
                        {step === 2 && 'Enter OTP'}
                        {step === 3 && 'New Password'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {step === 1 && "Enter your email to receive a verification code."}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && "Create a secure password for your account."}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-center space-x-4 mb-6">
                    <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                </div>

                {message && (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="shrink-0">
                                <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-800">{message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {step === 1 && (
                    <form className="mt-8 space-y-6" onSubmit={handleSendOTP}>
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Email address"
                                />
                            </div>
                        </div>

                        <CTAButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            loadingText="Sending..."
                        >
                            Send OTP
                        </CTAButton>
                    </form>
                )}

                {step === 2 && (
                    <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
                        <div>
                            <label htmlFor="otp" className="sr-only">OTP Code</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest text-center text-lg"
                                    placeholder="Enter 6-digit OTP"
                                    maxLength={6}
                                />
                            </div>
                        </div>

                        <CTAButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            loadingText="Verifying..."
                        >
                            Verify OTP
                        </CTAButton>
                        <div className="text-center">
                            <CTAButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep(1)}
                            >
                                Change Email
                            </CTAButton>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="password" className="sr-only">New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="New Password"
                                        minLength={8}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Confirm Password"
                                        minLength={8}
                                    />
                                </div>
                            </div>
                        </div>

                        <CTAButton
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={loading}
                            loadingText="Resetting..."
                        >
                            Reset Password
                        </CTAButton>
                    </form>
                )}

                <div className="flex items-center justify-center mt-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
