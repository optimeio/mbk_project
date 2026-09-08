"use client";

import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { BuildingLibraryIcon, UserIcon, IdentificationIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const AccountantBankDetails = () => {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTrainers = async () => {
        try {
            setLoading(true);
            const data = await api.get('/trainers');
            if (Array.isArray(data)) {
                setTrainers(data);
            } else if (data.success) {
                setTrainers(data.data);
            }
        } catch (error) {
            console.error('Error fetching trainers for bank details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrainers();
    }, []);

    const filteredTrainers = trainers.filter(trainer => 
        trainer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trainer.trainerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trainer.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center mb-8">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900">Trainer Bank Details</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Read-only view of trainer bank Information for payment processing.
                    </p>
                </div>
            </div>

            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by trainer name, ID or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-500 font-medium">Loading trainer data...</p>
                </div>
            ) : (
                <div className="mt-4 flex flex-col">
                    <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-[#0f172a]">
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">
                                                Trainer Info
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                                Bank Name
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                                Account Number
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                                IFSC Code
                                            </th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                                Branch
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredTrainers.length > 0 ? (
                                            filteredTrainers.map((trainer) => (
                                                <tr key={trainer.id || trainer._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 shrink-0">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                                                    <UserIcon className="h-6 w-6" />
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="font-medium text-gray-900">{trainer.name || 'N/A'}</div>
                                                                <div className="text-gray-500 text-xs">{trainer.trainerId || 'No ID'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                                                        {trainer.documents?.bank?.bankName || trainer.documents?.bank?.name || 'Not Provided'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono tracking-wider">
                                                        {trainer.documents?.bank?.accountNumber || '---'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                                                        {trainer.documents?.bank?.ifscCode || '---'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {trainer.documents?.bank?.branchName || '---'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-10 text-center text-sm text-gray-500">
                                                    No trainers found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountantBankDetails;
