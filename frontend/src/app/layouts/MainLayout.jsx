"use client";

import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/common/Sidebar';
import {
    ArrowRightOnRectangleIcon,
    Cog6ToothIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { MessageSquare as ChatBubbleLeftRightIcon } from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import NotificationBell from '@/components/common/NotificationBell';
import { api } from '@/services/api';
import { updateTrainerProfile } from '@/services/trainerService';
import dynamic from 'next/dynamic';
const SettingsModal = dynamic(() => import('@/components/modals/SettingsModal'), { ssr: false });

import MobileBottomNav from '@/components/common/MobileBottomNav';
import { AUTH_ROLES, normalizeAuthRole } from '@/utils/authRoles';

const MainLayout = ({ children }) => {
    const router = useRouter();
    const mobileUserMenuRef = useRef(null);
    const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
    const { currentUser, setAuthUser, logout } = useAuth();
  
    const pathname = usePathname();
    const user = currentUser || {};
    const userRole = normalizeAuthRole(user?.role, user?.email);
    const isTrainer = userRole === AUTH_ROLES.TRAINER;
    const canOpenMobileSettings = !isTrainer;
    const isTrainerComplaintsPage =
        isTrainer && pathname.startsWith('/trainer/complaints');
    const isWorkspacePage = pathname.includes('/workspace') || pathname.startsWith('/chat');

    // Guard: redirect trainers away from chat routes
    useEffect(() => {
        if (isTrainer && pathname.startsWith('/chat')) {
            router.replace('/trainer/dashboard');
        }
    }, [isTrainer, pathname, router]);

    // Route Guard for Unverified Trainers (Removed to allow dashboard access)
    
    // Refresh trainer verification status on mount and periodically
    useEffect(() => {
        const refreshTrainerStatus = async () => {
            if (normalizeAuthRole(currentUser?.role, currentUser?.email) === AUTH_ROLES.TRAINER) {
                try {
                    const response = await api.get('/trainers/profile/me');
                    if (response.success && response.data) {
                        const updatedUser = { ...currentUser, ...response.data };
                        setAuthUser(updatedUser);
                    }
                } catch (error) {
                    console.warn('Failed to refresh trainer status:', error);
                }
            }
        };

        refreshTrainerStatus();

        // Optional: Refresh every 60 seconds
        const interval = setInterval(refreshTrainerStatus, 60000);
        return () => clearInterval(interval);
    }, [currentUser, setAuthUser]);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                mobileUserMenuRef.current &&
                !mobileUserMenuRef.current.contains(event.target)
            ) {
                setIsMobileUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const handleMobileLogout = async () => {
        setIsMobileUserMenuOpen(false);
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    const handleSettingsSave = async (data) => {
        try {
            const userId = user.id || user._id || user.uid;
            if (!userId) {
                throw new Error('User ID not found');
            }

            let response;
            if (userRole === AUTH_ROLES.TRAINER) {
                response = await updateTrainerProfile(data);
            } else {
                response = await api.put(`/users/${userId}`, data);
            }

            if (response.success || response.message) {
                const updatedUser =
                    response.user ||
                    { ...JSON.parse(localStorage.getItem('user') || '{}'), ...data };
                setAuthUser(updatedUser);
                setIsMobileSettingsOpen(false);

                if (data.password) {
                    await handleMobileLogout();
                }
            } else {
                alert(response.message || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            alert(error.message || 'Failed to update settings');
        }
    };

    const handleMobileProfileClick = () => {
        setIsMobileUserMenuOpen(false);
        if (userRole === AUTH_ROLES.TRAINER) {
            router.push('/trainer/profile');
            return;
        }
        setIsMobileSettingsOpen(true);
    };

    const handleMobileSettingsClick = () => {
        setIsMobileUserMenuOpen(false);
        if (!canOpenMobileSettings) {
            return;
        }
        setIsMobileSettingsOpen(true);
    };

    return (
        <div className="main-layout flex h-screen flex-col overflow-hidden bg-background text-textDark md:flex-row">
            {!isTrainerComplaintsPage && <Sidebar />}
            {canOpenMobileSettings && (
                <SettingsModal
                    isOpen={isMobileSettingsOpen}
                    onClose={() => setIsMobileSettingsOpen(false)}
                    onSave={handleSettingsSave}
                    user={user}
                />
            )}

            {/* Mobile header */}
            {!isTrainerComplaintsPage && (
                <div className="z-30 flex w-full shrink-0 items-center justify-between border-b border-[#113142] bg-[#153E53] px-4 py-3 md:hidden">
                    <div className="min-w-0">
                        <div className="truncate text-base font-bold text-white">
                            {isTrainer ? 'Trainer Portal' : 'Admin Portal'}
                        </div>
                        {currentUser?.name ? (
                            <div className="truncate text-xs text-slate-200">
                                {currentUser.name}
                            </div>
                        ) : null}
                    </div>
                    <div ref={mobileUserMenuRef} className="relative ml-3 flex items-center gap-3">
                        <NotificationBell />
                        <button
                            type="button"
                            onClick={() => setIsMobileUserMenuOpen((prev) => !prev)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                            aria-label="Open account menu"
                        >
                            {(user?.name || user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                        </button>

                        {isMobileUserMenuOpen && (
                            <div className="fixed right-3 top-[68px] z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] md:hidden">
                                <div className="p-2">
                                    <button
                                        type="button"
                                        onClick={handleMobileProfileClick}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                            <UserCircleIcon className="h-4 w-4 text-slate-500" />
                                        </span>
                                        Profile
                                    </button>
                                    {userRole === AUTH_ROLES.TRAINER && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMobileUserMenuOpen(false);
                                                router.push('/trainer/complaints');
                                            }}
                                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                                <ChatBubbleLeftRightIcon className="h-4 w-4 text-slate-500" />
                                            </span>
                                            Complaints & Feedback
                                        </button>
                                    )}
                                    {canOpenMobileSettings && (
                                        <button
                                            type="button"
                                            onClick={handleMobileSettingsClick}
                                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                                <Cog6ToothIcon className="h-4 w-4 text-slate-500" />
                                            </span>
                                            Settings
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleMobileLogout}
                                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                    >
                                        <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50">
                                            <ArrowRightOnRectangleIcon className="h-4 w-4 text-rose-500" />
                                        </span>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Wrapper */}
            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${isTrainerComplaintsPage ? '' : 'md:pl-64'}`}>
                {/* Top Navigation (Desktop) */}
                {!isTrainerComplaintsPage && (
                    <div className="sticky top-0 z-10 hidden h-16 shrink-0 border-b border-border bg-card shadow-sm md:flex">
                        <div className="flex-1 px-4 flex justify-between">
                            <div className="flex-1 flex">
                                {/* Search bar could go here */}
                            </div>
                            <div className="ml-4 flex items-center md:ml-6">
                                <span className="text-textDark text-lg font-semibold">
                                    {currentUser?.name || currentUser?.displayName || currentUser?.email}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <main className={`flex-1 min-h-0 ${isWorkspacePage ? 'flex flex-col overflow-hidden h-full' : 'overflow-y-auto'}`}>
                    <div className={isWorkspacePage ? 'flex-1 flex flex-col relative overflow-hidden h-full' : `min-h-full ${isTrainerComplaintsPage ? '' : 'py-6 pb-24 md:pb-6'}`}>
                        {children}
                    </div>
                </main>
            </div>

            {!isTrainerComplaintsPage && <MobileBottomNav />}
        </div>
    );
};

export default MainLayout;
