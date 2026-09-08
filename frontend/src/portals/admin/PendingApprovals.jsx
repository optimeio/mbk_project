"use client";

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { getPendingUsers, approveUser, rejectUser, approveAllUsers } from '@/services/userService';
import {
    CheckCircleIcon,
    XCircleIcon,
    CheckBadgeIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ArrowTopRightOnSquareIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import useMutationWithToast from '@/hooks/useMutationWithToast';
import getErrorMessage from '@/lib/getErrorMessage';
import { useAuth } from '@/context/AuthContext';
import {
    canApproveAdmission,
    canRejectAdmission,
} from '@/utils/admissionPermissions';
import { ADMIN_PENDING_USERS_KEY } from '@/shared/config/adminQueryKeys';
import { QUERY_STALE_TIMES, withQueryPolicy } from '@/shared/config/queryPolicies';
import { getProfilePictureUrl } from '@/utils/imageUtils';

const PENDING_USERS_QUERY_KEY = ADMIN_PENDING_USERS_KEY;

const unwrapPendingUsersCollection = (response) => {
    if (Array.isArray(response)) {
        return response;
    }
    if (Array.isArray(response?.users)) {
        return response.users;
    }
    if (Array.isArray(response?.data?.users)) {
        return response.data.users;
    }
    return [];
};

const fetchPendingUsers = async () => {
    const response = await getPendingUsers();
    if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch pending users');
    }

    return response.users || [];
};

const PendingApprovals = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();
    const [activeActionId, setActiveActionId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isApproveAllModalOpen, setIsApproveAllModalOpen] = useState(false);
    const [failedImages, setFailedImages] = useState(new Set());

    const handleImageError = (id) => {
        setFailedImages((prev) => new Set(prev).add(id));
    };

    const canApprove = canApproveAdmission(currentUser);
    const canReject = canRejectAdmission(currentUser);

    const {
        data,
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

    const { data: companiesRes } = useQuery({
        queryKey: ['companies'],
        queryFn: () => api.get('/companies').catch(() => []),
        staleTime: 60_000,
    });
    const companies = useMemo(() => {
        if (Array.isArray(companiesRes)) return companiesRes;
        if (Array.isArray(companiesRes?.data)) return companiesRes.data;
        return [];
    }, [companiesRes]);
    const [userCompanySelections, setUserCompanySelections] = useState({});

    const users = unwrapPendingUsersCollection(data);

    const [activeRoleTab, setActiveRoleTab] = useState('all');

    const trainerCount = useMemo(() => users.filter(u => String(u.role).toLowerCase().includes('trainer')).length, [users]);
    const companyCount = useMemo(() => users.filter(u => String(u.role).toLowerCase().includes('company')).length, [users]);

    const filteredUsers = useMemo(() => {
        let list = users;
        if (activeRoleTab === 'trainer') {
            list = list.filter((u) => String(u.role).toLowerCase().includes('trainer'));
        } else if (activeRoleTab === 'company') {
            list = list.filter((u) => String(u.role).toLowerCase().includes('company'));
        }

        if (!searchTerm.trim()) return list;
        const term = searchTerm.toLowerCase();
        return list.filter(
            (u) =>
                u.name?.toLowerCase().includes(term) ||
                u.email?.toLowerCase().includes(term) ||
                u.phone?.toLowerCase().includes(term)
        );
    }, [users, activeRoleTab, searchTerm]);

    const removePendingUserFromCache = (id) => {
        queryClient.setQueryData(PENDING_USERS_QUERY_KEY, (current) => {
            const usersList = unwrapPendingUsersCollection(current).filter(
                (user) => String(user._id || user.id) !== String(id)
            );
            if (Array.isArray(current)) {
                return usersList;
            }
            if (current && typeof current === 'object') {
                return { ...current, users: usersList };
            }
            return usersList;
        });
    };

    const approveMutation = useMutationWithToast({
        mutationFn: ({ id, companyId }) => approveUser(id, { companyId }),
        toast: {
            loading: 'Approving user...',
            success: 'User approved successfully',
            error: (err) => getErrorMessage(err, 'Failed to approve user'),
        },
        onSuccess: (_response, { id }) => {
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
            setIsApproveAllModalOpen(false);
        },
    });

    const handleApprove = async (id) => {
        try {
            setActiveActionId(`approve:${id}`);
            const selectedCompanyId = userCompanySelections[id];
            await approveMutation.mutateWithToast({ id, companyId: selectedCompanyId });
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

    const handleConfirmApproveAll = async () => {
        try {
            setActiveActionId('approve-all');
            await approveAllMutation.mutateWithToast();
        } catch (err) {
            console.error(err);
        } finally {
            setActiveActionId('');
        }
    };

    const handleTrainerClick = (user) => {
        const id = user._id || user.id;
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('trainerVerificationSelection', String(id));
        }
        router.push(`/dashboard/documents?trainerId=${encodeURIComponent(id)}&search=${encodeURIComponent(user.email || user.name)}`);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Banner */}
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
                            onClick={() => setIsApproveAllModalOpen(true)}
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

            {/* Tabs & Search Filter Bar */}
            {users.length > 0 && (
                <div className="mb-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                        <button
                            type="button"
                            onClick={() => setActiveRoleTab('all')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeRoleTab === 'all'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            All Requests ({users.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoleTab('trainer')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeRoleTab === 'trainer'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Trainers ({trainerCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveRoleTab('company')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                                activeRoleTab === 'company'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Company Registration Requests ({companyCount})
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                placeholder="Search pending requests by name, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-colors"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                            Showing {filteredUsers.length} of {users.length} requests
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
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
            ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 text-center shadow-xs">
                    <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-base font-bold text-gray-800">No matching trainers found</h3>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your search query.</p>
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
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div
                                                onClick={() => handleTrainerClick(user)}
                                                className="flex items-center gap-3 cursor-pointer group"
                                                title={`Click to view and verify ${user.role === 'CompanyAdmin' ? 'company' : 'trainer'} documents`}
                                            >
                                                <div className="relative group/avatar">
                                                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors overflow-hidden">
                                                        {user.profilePicture ? (
                                                            <img src={getProfilePictureUrl(user.profilePicture)} alt={user.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            (user.name || 'U').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    {user.profilePicture && (
                                                        <div className="absolute z-50 left-12 top-1/2 -translate-y-1/2 hidden group-hover/avatar:block bg-white p-2 rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                                                            <div className="relative h-32 w-32 rounded-lg overflow-hidden bg-gray-50">
                                                                <img src={getProfilePictureUrl(user.profilePicture)} alt={user.name} className="h-full w-full object-cover" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                        <span className="group-hover:underline">{user.name}</span>
                                                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${user.role === 'CompanyAdmin' ? 'text-purple-600' : 'text-emerald-600'}`}>
                                                        {user.role === 'CompanyAdmin' ? 'Company' : 'Trainer'}
                                                    </span>
                                                </div>
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
                                            <div className="flex items-center justify-end gap-2">
                                                {canApprove && (
                                                    <>
                                                        <select
                                                            value={userCompanySelections[user._id] || ''}
                                                            onChange={(e) => setUserCompanySelections(prev => ({ ...prev, [user._id]: e.target.value }))}
                                                            className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-500 text-gray-700 outline-none"
                                                            title="Select company to assign to trainer upon approval"
                                                        >
                                                            <option value="">-- SM Groups (Default) --</option>
                                                            {companies.map((c) => (
                                                                <option key={c._id || c.id} value={c._id || c.id}>
                                                                    {c.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleApprove(user._id)}
                                                            disabled={activeActionId === `approve:${user._id}`}
                                                            className="inline-flex items-center px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm shadow-green-100"
                                                        >
                                                            {activeActionId === `approve:${user._id}` ? 'Approving...' : 'Approve'}
                                                        </button>
                                                    </>
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

            {/* Confirm Approve All Modal */}
            <Transition show={isApproveAllModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsApproveAllModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
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
                                <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                                            <ExclamationTriangleIcon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-lg font-bold text-gray-900">
                                                Confirm Bulk Approval
                                            </Dialog.Title>
                                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                                Are you sure you want to approve all <span className="font-bold text-gray-900">{users.length}</span> pending trainer registration request{users.length > 1 ? 's' : ''} at once?
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                This action will grant portal access to all currently pending trainers.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setIsApproveAllModalOpen(false)}
                                            className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmApproveAll}
                                            disabled={activeActionId === 'approve-all'}
                                            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <CheckBadgeIcon className="h-4 w-4" />
                                            <span>{activeActionId === 'approve-all' ? 'Approving All...' : `Confirm Approve All (${users.length})`}</span>
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default PendingApprovals;
