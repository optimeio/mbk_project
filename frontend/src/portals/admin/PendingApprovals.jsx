"use client";

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingUsers, approveUser, rejectUser, approveAllUsers } from '@/services/userService';
import { CheckCircleIcon, XCircleIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'; // Importing icons are unused in original but keeping for safety or future use
import useMutationWithToast from '@/hooks/useMutationWithToast';
import getErrorMessage from '@/lib/getErrorMessage';
import { useAuth } from '@/context/AuthContext';
import {
    canApproveAdmission,
    canRejectAdmission,
} from '@/utils/admissionPermissions';
import { ADMIN_PENDING_USERS_KEY } from '@/shared/config/adminQueryKeys';
import { QUERY_STALE_TIMES, withQueryPolicy } from '@/shared/config/queryPolicies';

const PENDING_USERS_QUERY_KEY = ADMIN_PENDING_USERS_KEY;

const fetchPendingUsers = async () => {
    const response = await getPendingUsers();
    if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch pending users');
    }

    return response.users || [];
};

const PendingApprovals = () => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();
    const [activeActionId, setActiveActionId] = useState('');
    const canApprove = canApproveAdmission(currentUser);
    const canReject = canRejectAdmission(currentUser);
    const {
        data: users = [],
        isPending: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: PENDING_USERS_QUERY_KEY,
        queryFn: fetchPendingUsers,
        ...withQueryPolicy({
            staleTime: QUERY_STALE_TIMES.HIGH_CHURN_LIST,
            refetchOnWindowFocus: false,
        }),
    });

    const removePendingUserFromCache = (id) => {
        queryClient.setQueryData(PENDING_USERS_QUERY_KEY, (current = []) =>
            current.filter((user) => String(user._id) !== String(id)),
        );
    };

    const approveMutation = useMutationWithToast({
        mutationFn: approveUser,
        toast: {
            loading: 'Approving user...',
            success: 'User approved successfully',
            error: (err) => getErrorMessage(err, 'Failed to approve user'),
        },
        onSuccess: (_response, id) => {
            removePendingUserFromCache(id);
        },
    });

    const rejectMutation = useMutationWithToast({
        mutationFn: rejectUser,
        toast: {
            loading: 'Rejecting user...',
            success: 'User rejected successfully',
            error: (err) => getErrorMessage(err, 'Failed to reject user'),
        },
        onSuccess: (_response, id) => {
            removePendingUserFromCache(id);
        },
    });

    const approveAllMutation = useMutationWithToast({
        mutationFn: approveAllUsers,
        toast: {
            loading: 'Approving all pending users...',
            success: (response) =>
                response?.message || `Successfully approved ${response?.count || 0} users.`,
            error: (err) => getErrorMessage(err, 'Failed to approve all users'),
        },
        onSuccess: () => {
            queryClient.setQueryData(PENDING_USERS_QUERY_KEY, []);
        },
    });

    const handleApprove = async (id) => {
        try {
            setActiveActionId(`approve:${id}`);
            await approveMutation.mutateWithToast(id);
        } catch (err) {
            console.error(err);
        } finally {
            setActiveActionId('');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this user?')) return;
        try {
            setActiveActionId(`reject:${id}`);
            await rejectMutation.mutateWithToast(id);
        } catch (err) {
            console.error(err);
        } finally {
            setActiveActionId('');
        }
    };

    const handleApproveAll = async () => {
        if (!window.confirm(`Are you sure you want to approve ALL ${users.length} pending users?`)) return;
        try {
            setActiveActionId('approve-all');
            await approveAllMutation.mutateWithToast();
        } catch (err) {
            console.error(err);
        } finally {
            setActiveActionId('');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pending Approvals</h1>
                    <p className="mt-2 text-sm text-gray-500 font-medium">
                        Review and authorize new trainer registration requests line-by-line.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    {canApprove && (
                        <button
                            onClick={handleApproveAll}
                            disabled={users.length === 0 || loading || activeActionId === 'approve-all'}
                            className={`inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-lg transition-all ${users.length === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 shadow-blue-100'
                                }`}
                        >
                            <CheckBadgeIcon className="h-5 w-5 mr-2" />
                            Approve All ({users.length})
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading requests...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                    <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 font-bold">{error.message || 'Failed to fetch pending users'}</p>
                    <button onClick={() => refetch()} className="mt-4 text-sm font-bold text-red-600 hover:text-red-800 underline">Try Again</button>
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                    <CheckCircleIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">All clear!</h3>
                    <p className="text-gray-500 font-medium text-center px-4 max-w-sm">
                        There are no pending requests at the moment.
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trainer</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Verification</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Registered</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                                    {(user.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">{user.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-2">
                                                    {user.firebaseUid ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                                                            Google Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200">
                                                            Manual Login
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ring-1 ring-inset ${
                                                        user.emailVerified ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                    }`}>
                                                        {user.emailVerified ? 'Email Verified' : 'Email Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex justify-end gap-2">
                                                {canApprove && (
                                                    <button
                                                        onClick={() => handleApprove(user._id)}
                                                        disabled={activeActionId === `approve:${user._id}`}
                                                        className="inline-flex items-center px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm shadow-green-100"
                                                    >
                                                        {activeActionId === `approve:${user._id}` ? 'Approving...' : 'Approve'}
                                                    </button>
                                                )}
                                                {canReject && (
                                                    <button
                                                        onClick={() => handleReject(user._id)}
                                                        disabled={activeActionId === `reject:${user._id}`}
                                                        className="inline-flex items-center px-4 py-1.5 bg-white text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                                                    >
                                                        {activeActionId === `reject:${user._id}` ? 'Rejecting...' : 'Reject'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingApprovals;
