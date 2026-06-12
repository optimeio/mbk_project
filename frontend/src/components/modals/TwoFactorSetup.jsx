"use client";

import { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { QrCodeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const TwoFactorSetup = ({ userId, onComplete }) => {
    const [step, setStep] = useState(1); // 1: Generate/Scan, 2: Verify
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const isMountedRef = useRef(false);
    const completionTimeoutRef = useRef(null);
    const verifyAbortRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;

            if (completionTimeoutRef.current) {
                clearTimeout(completionTimeoutRef.current);
                completionTimeoutRef.current = null;
            }

            if (verifyAbortRef.current) {
                verifyAbortRef.current.abort();
                verifyAbortRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        // Generate Secret on mount
        const controller = new AbortController();

        const setup2FA = async () => {
            try {
                const response = await api.post(
                    '/auth/2fa/setup',
                    { userId },
                    { signal: controller.signal },
                );

                if (!isMountedRef.current || controller.signal.aborted) {
                    return;
                }

                if (response.success) {
                    setQrCodeUrl(response.qrCodeUrl);
                    setSecret(response.secret);
                } else {
                    setError('Failed to generate 2FA secret');
                }
            } catch (err) {
                if (controller.signal.aborted || !isMountedRef.current) {
                    return;
                }
                setError('Error setting up 2FA');
            }
        };
        setup2FA();

        return () => {
            controller.abort();
        };
    }, [userId]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (verifyAbortRef.current) {
            verifyAbortRef.current.abort();
        }

        const controller = new AbortController();
        verifyAbortRef.current = controller;

        try {
            const response = await api.post(
                '/auth/2fa/verify',
                { userId, token },
                { signal: controller.signal },
            );

            if (!isMountedRef.current || controller.signal.aborted) {
                return;
            }

            if (response.success) {
                setMessage('2FA Enabled Successfully!');
                completionTimeoutRef.current = setTimeout(() => {
                    if (onComplete) onComplete();
                    completionTimeoutRef.current = null;
                }, 1500);
            } else {
                setError(response.message);
            }
        } catch (err) {
            if (!controller.signal.aborted && isMountedRef.current) {
                setError('Invalid Token');
            }
        } finally {
            if (verifyAbortRef.current === controller) {
                verifyAbortRef.current = null;
            }

            if (isMountedRef.current && !controller.signal.aborted) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <div className="text-center mb-6">
                <ShieldCheckIcon className="h-12 w-12 text-indigo-600 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-900 mt-2">Setup 2FA</h2>
                <p className="text-gray-600 text-sm">Secure your account with Two-Factor Authentication</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}

            {message && (
                <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
                    {message}
                </div>
            )}

            {step === 1 && qrCodeUrl && (
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="border p-2 rounded" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Scan this QR code with your Authenticator App (Google Auth, Authy, etc.)</p>
                        <p className="text-xs text-gray-400">Secret: {secret}</p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label htmlFor="token" className="block text-sm font-medium text-gray-700">Enter 6-digit Code</label>
                            <input
                                type="text"
                                id="token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest text-center text-lg"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                        >
                            {loading ? 'Verifying...' : 'Enable 2FA'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default TwoFactorSetup;
