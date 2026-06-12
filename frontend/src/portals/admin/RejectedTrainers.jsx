"use client";

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { notify } from '@/lib/toast';

const REJECTED_TRAINERS_QUERY_KEY = ['admin', 'rejected-trainers'];

const fetchRejectedUsers = async () => {
    const response = await api.get('/users/rejected', { skipCache: true });
    if (!response?.success) {
        throw new Error(response?.message || 'Failed to fetch rejected users');
    }

    return response.users || [];
};

const RejectedTrainers = () => {
    const queryClient = useQueryClient();
    const [approveLoadingId, setApproveLoadingId] = useState('');
    const {
        data: rejectedUsers = [],
        isPending: loading,
    } = useQuery({
        queryKey: REJECTED_TRAINERS_QUERY_KEY,
        queryFn: fetchRejectedUsers,
    });

    const approveMutation = useMutation({
        mutationFn: async (userId) => {
            const response = await api.put(`/users/${userId}/approve`);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to approve user');
            }

            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: REJECTED_TRAINERS_QUERY_KEY });
        },
    });

    const handleApproveUser = async (userId) => {
        try {
            setApproveLoadingId(String(userId));
            await approveMutation.mutateAsync(userId);
            notify.success('User approved successfully');
        } catch (err) {
            console.error('Error approving user:', err);
            notify.error('Failed to approve user');
        } finally {
            setApproveLoadingId('');
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Rejected Trainers</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all trainers who have been rejected. You can re-approve them here.
                    </p>
                </div>
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            {loading ? (
                                <div className="text-center py-10">Loading...</div>
                            ) : rejectedUsers.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No rejected users</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {rejectedUsers.map((user) => (
                                            <tr key={user._id || user.id}>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.role}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                                                        Rejected
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                                    <button
                                                        onClick={() => handleApproveUser(user._id || user.id)}
                                                        disabled={approveLoadingId === String(user._id || user.id)}
                                                        className="text-green-600 hover:text-green-900 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {approveLoadingId === String(user._id || user.id) ? 'Approving...' : 'Re-Approve'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RejectedTrainers;
