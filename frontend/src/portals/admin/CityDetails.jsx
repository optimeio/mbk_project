"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { getTrainers } from '@/services/trainerService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const getTrainerDisplayName = (trainer = {}) => {
    const firstName = String(trainer.firstName || trainer.userId?.firstName || '').trim();
    const lastName = String(trainer.lastName || trainer.userId?.lastName || '').trim();

    if (firstName || lastName) {
        return [firstName, lastName].filter(Boolean).join(' ');
    }

    return trainer.name || trainer.userId?.name || 'Pending Trainer';
};

const getTrainerStatusLabel = (trainer = {}) => {
    const status = String(
        trainer.registrationStatus === 'approved'
            ? 'APPROVED'
            : trainer.verificationStatus || trainer.status || 'PENDING'
    ).toUpperCase();

    if (status === 'VERIFIED') {
        return 'Approved';
    }

    return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
};

const resolveTrainerRowKey = (trainer = {}, index = 0) => {
    const baseKey =
        trainer.id ||
        trainer._id ||
        trainer.userId?._id ||
        trainer.trainerId ||
        trainer.email ||
        trainer.userId?.email ||
        "trainer";

    return `${baseKey}-${index}`;
};

const CityDetails = () => {
    const { cityName } = useParams();
    const router = useRouter();
    const {
        data: cityTrainers = [],
        isLoading: loading,
        error,
    } = useQuery({
        queryKey: ['city-trainers', cityName],
        enabled: Boolean(cityName),
        queryFn: async () => {
            const response = await getTrainers(`?city=${encodeURIComponent(cityName)}`);
            let trainers = [];
            if (response.success && response.trainers) {
                trainers = response.trainers;
            } else if (Array.isArray(response)) {
                trainers = response;
            } else if (response.data && response.data.trainers) {
                trainers = response.data.trainers;
            } else if (response.data && Array.isArray(response.data)) {
                trainers = response.data;
            } else {
                trainers = Array.isArray(response) ? response : [];
            }

            return trainers.map((trainer, index) => ({
                ...(trainer || {}),
                __rowKey: resolveTrainerRowKey(trainer || {}, index),
            }));
        },
    });
    const errorMessage = useMemo(
        () => (error ? 'Failed to fetch trainers for this city' : null),
        [error],
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => router.back()}
                    className="mr-4 p-2 rounded-full hover:bg-gray-100"
                >
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">Trainers in {cityName}</h1>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading trainers...</p>
                </div>
            ) : errorMessage ? (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{errorMessage}</p>
                        </div>
                    </div>
                </div>
            ) : cityTrainers.length > 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trainer ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {cityTrainers.map((trainer, index) => (
                                <tr key={trainer.__rowKey || resolveTrainerRowKey(trainer, index)} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trainer.trainerId || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTrainerDisplayName(trainer)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.email || trainer.userId?.email || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.mobile || trainer.phone || trainer.userId?.phoneNumber || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trainer.specialization || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${String(trainer.verificationStatus || trainer.status || '').toUpperCase() === 'VERIFIED' || String(trainer.status || '').toUpperCase() === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                            String(trainer.verificationStatus || trainer.status || '').toUpperCase() === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {getTrainerStatusLabel(trainer)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-white shadow sm:rounded-lg">
                    <p className="text-gray-500">No trainers found in {cityName}.</p>
                </div>
            )}
        </div>
    );
};

export default CityDetails;
