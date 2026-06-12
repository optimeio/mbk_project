"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardDocumentCheckIcon, PlusIcon, TrashIcon, PencilSquareIcon, EyeIcon, EyeSlashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/lib/toast';

const SystemAccountModal = dynamic(
    () => import("@/components/modals/SystemAccountModal"),
    {
        loading: () => null,
        ssr: false,
    },
);

const PasswordConfirmationModal = dynamic(
    () => import("@/components/modals/PasswordConfirmationModal"),
    {
        loading: () => null,
        ssr: false,
    },
);

const SYSTEM_USERS_QUERY_KEY = ['admin', 'system-users'];

const fetchSystemUsers = async () => {
    const response = await api.get('/users', { skipCache: true });
    if (!response?.success) {
        throw new Error(response?.message || 'Failed to load users');
    }

    return response.users || [];
};

const SystemAccounts = ({ embedded = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isDocumentVisible, setIsDocumentVisible] = useState(true);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState('');

    const {
        data: users = [],
        isPending: loading,
    } = useQuery({
        queryKey: SYSTEM_USERS_QUERY_KEY,
        queryFn: fetchSystemUsers,
        staleTime: 30_000,
        refetchInterval: embedded ? false : (isDocumentVisible ? 30_000 : false),
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsDocumentVisible(document.visibilityState === "visible");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () =>
            document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const upsertUserMutation = useMutation({
        mutationFn: async ({ accountData, selectedUserId }) => {
            if (selectedUserId) {
                return api.put(`/users/${selectedUserId}`, accountData);
            }

            return api.post('/users', accountData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_USERS_QUERY_KEY });
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await api.delete(`/users/${userId}`);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to delete user');
            }

            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_USERS_QUERY_KEY });
        },
    });

    const togglePasswordVisibility = (userId) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        notify.success('Copied to clipboard!');
    };

    const handleAddAccount = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleSaveAccount = async (accountData) => {
        try {
            const selectedUserId = selectedUser?.id || selectedUser?._id || null;
            setActionLoadingId(`save:${selectedUserId || 'new'}`);
            const response = await upsertUserMutation.mutateAsync({ accountData, selectedUserId });

            if (response.success) {
                notify.success(selectedUser ? 'User updated successfully!' : 'User created successfully!');
            } else {
                notify.error(response.message || 'Failed to save account');
            }
        } catch (error) {
            console.error('Error saving account:', error);
            notify.error(error.response?.data?.message || error.message || 'Failed to save account');
        } finally {
            setActionLoadingId('');
        }
    };

    const handleDeleteClick = (userId, userName) => {
        setUserToDelete({ id: userId, name: userName });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (password) => {
        if (!userToDelete) return;

        try {
            // 1. Verify Password
            const verifyRes = await api.post('/users/verify-password', { password });
            if (!verifyRes.success) {
                throw new Error(verifyRes.message || 'Incorrect password');
            }

            // 2. Proceed with Delete
            setActionLoadingId(`delete:${userToDelete.id}`);
            const response = await deleteUserMutation.mutateAsync(userToDelete.id);
            if (response.success) {
                notify.success('User deleted successfully');
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            } else {
                throw new Error('Failed to delete user');
            }
        } catch (error) {
            console.error('Delete error:', error);
            // Re-throw to be caught by the modal form
            throw new Error(error.response?.data?.message || error.message || 'Failed to delete user');
        } finally {
            setActionLoadingId('');
        }
    };

    const filteredUsers = useMemo(() => {
        const normalizedSearch = String(searchTerm || "").toLowerCase().trim();
        if (!normalizedSearch) {
            return users;
        }

        return users.filter((user) =>
            (user.name || "").toLowerCase().includes(normalizedSearch)
            || (user.email || "").toLowerCase().includes(normalizedSearch)
            || (user.role || "").toLowerCase().includes(normalizedSearch),
        );
    }, [searchTerm, users]);

    return (
        <div className={embedded ? "animate-fade-in" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in"}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="mt-1 text-sm text-gray-500 font-medium tracking-wide uppercase">
                        Access Control & System Credentials
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleAddAccount}
                        className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5 stroke-2" aria-hidden="true" />
                        Create New User
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 ring-1 ring-inset ring-gray-100 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm sm:leading-6"
                        placeholder="Search by name, email or role (e.g. 'SPOC', 'Trainer')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Identity
                                </th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Account Role
                                </th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    Credentials
                                </th>
                                <th scope="col" className="px-3 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
                                    Status
                                </th>
                                <th scope="col" className="relative py-4 pl-3 pr-6 text-right">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-gray-400 font-medium">Synchronizing accounts...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <MagnifyingGlassIcon className="h-12 w-12 mb-3 opacity-20" />
                                            <p className="text-lg font-medium">No accounts matched your search</p>
                                            <p className="text-sm">Try adjusting your filters or creating a new user.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id || user._id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="whitespace-nowrap py-5 pl-6 pr-3">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                                                        {(user.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900">{user.name || 'N/A'}</div>
                                                    <div className="text-[12px] text-gray-400 font-medium">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide
                                                ${user.role === 'SuperAdmin' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' :
                                                  user.role === 'SPOCAdmin' ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100' :
                                                  (user.role === 'Accountant' || user.role === 'Accountnt') ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' :
                                                  user.role === 'Company' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' :
                                                  'bg-blue-50 text-blue-700 ring-1 ring-blue-100'}`}>
                                                {user.role === 'SPOCAdmin' ? 'SPOC' : 
                                                 user.role === 'SuperAdmin' ? 'SUPER ADMIN' : 
                                                 user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-mono text-sm text-gray-600 bg-gray-50 px-2 py-0.5 rounded leading-none">
                                                        {visiblePasswords[user.id || user._id] ? (
                                                            user.plainPassword || '••••••••'
                                                        ) : (
                                                            '••••••••'
                                                        )}
                                                    </span>
                                                    <button
                                                        onClick={() => togglePasswordVisibility(user.id || user._id)}
                                                        className="text-gray-400 hover:text-blue-500 focus:outline-none transition-colors"
                                                        title={visiblePasswords[user.id || user._id] ? "Hide" : "Show"}
                                                    >
                                                        {visiblePasswords[user.id || user._id] ? (
                                                            <EyeSlashIcon className="h-4 w-4" />
                                                        ) : (
                                                            <EyeIcon className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[80px] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter
                                                ${user.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${user.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                {user.isActive ? 'Active' : 'Locked'}
                                            </span>
                                        </td>
                                        <td className="relative whitespace-nowrap py-5 pl-3 pr-6 text-right font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => copyToClipboard(user.email)}
                                                    className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"
                                                    title="Copy Email"
                                                >
                                                    <ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="p-2 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-all active:scale-90"
                                                    title="Edit User"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(user.id || user._id, user.name)}
                                                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                                                    title="Delete User"
                                                >
                                                    <TrashIcon className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <SystemAccountModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveAccount}
                    initialData={selectedUser}
                    currentUserRole={currentUser?.role}
                    isSaving={actionLoadingId.startsWith('save:')}
                />
            )}

            {isDeleteModalOpen && (
                <PasswordConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setUserToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    title="Secure Delete"
                    message={`This action will permanently remove the account for "${userToDelete?.name}". This cannot be undone.`}
                />
            )}
        </div>
    );
};

export default SystemAccounts;
