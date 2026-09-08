"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import {
    CheckIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
    UserGroupIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { getCities, addCity, updateCity, deleteCity } from '@/services/cityService';
import useMutationWithToast from '@/hooks/useMutationWithToast';
import getErrorMessage from '@/lib/getErrorMessage';

const CityManagement = () => {
    const router = useRouter();
    const [newCity, setNewCity] = useState('');
    const [search, setSearch] = useState('');
    const [editingCityId, setEditingCityId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState('');

    const {
        data: citiesResponse = [],
        isLoading: loading,
        error: citiesQueryError,
    } = useQuery({
        queryKey: ['cities'],
        queryFn: async () => {
            const data = await getCities();
            return Array.isArray(data) ? data : [];
        },
    });

    const addCityMutation = useMutationWithToast({
        mutationFn: addCity,
        queryKeys: [['cities']],
        toast: {
            loading: 'Adding city...',
            success: 'City added successfully',
            error: (err) => getErrorMessage(err, 'Failed to add city'),
        },
    });

    const updateCityMutation = useMutationWithToast({
        mutationFn: ({ id, payload }) => updateCity(id, payload),
        queryKeys: [['cities']],
        toast: {
            loading: 'Updating city...',
            success: 'City updated successfully',
            error: (err) => getErrorMessage(err, 'Failed to update city'),
        },
    });

    const deleteCityMutation = useMutationWithToast({
        mutationFn: deleteCity,
        queryKeys: [['cities']],
        toast: {
            loading: 'Deleting city...',
            success: 'City deleted successfully',
            error: (err) => getErrorMessage(err, 'Failed to delete city'),
        },
    });

    const cities = useMemo(
        () => (Array.isArray(citiesResponse) ? citiesResponse : []),
        [citiesResponse],
    );

    const filteredCities = useMemo(() => {
        const query = search.trim().toLowerCase();
        return cities
            .filter((city) => city?.name?.toLowerCase().includes(query))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [cities, search]);

    const totalTrainers = useMemo(
        () => cities.reduce((sum, city) => sum + (city.trainerCount || 0), 0),
        [cities]
    );

    const handleCityClick = (city) => {
        if (editingCityId) return;
        router.push(`/dashboard/cities/${encodeURIComponent(city.name)}`);
    };

    const handleAddCity = async (e) => {
        e.preventDefault();
        if (!newCity.trim() || addCityMutation.isPending) return;

        try {
            setError('');
            await addCityMutation.mutateWithToast({ name: newCity });
            setNewCity('');
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to add city'));
        }
    };

    const startEdit = (city) => {
        setEditingCityId(city._id);
        setEditingName(city.name);
    };

    const cancelEdit = () => {
        setEditingCityId(null);
        setEditingName('');
    };

    const submitEdit = async (id, nameToSave = editingName) => {
        const trimmedName = nameToSave.trim();
        if (!trimmedName || updateCityMutation.isPending) return;

        try {
            setError('');
            await updateCityMutation.mutateWithToast({ id, payload: { name: trimmedName } });
            cancelEdit();
        } catch (err) {
            console.error(err);
            setError(getErrorMessage(err, 'Failed to update city'));
        }
    };

    const handleUpdateCity = async (id, newName) => {
        await submitEdit(id, newName);
    };

    const handleDeleteCity = async (id) => {
        if (!window.confirm('Are you sure you want to delete this city?')) return;
        try {
            setError('');
            await deleteCityMutation.mutateWithToast(id);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to delete city'));
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">Super Admin</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">City Management</h1>
                        <p className="mt-2 text-sm text-slate-200">Create and maintain city-level trainer data.</p>
                    </div>
                    <div className="grid min-w-[220px] grid-cols-2 gap-3 text-center">
                        <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                            <p className="text-xs text-slate-200">Cities</p>
                            <p className="mt-1 text-2xl font-bold">{cities.length}</p>
                        </div>
                        <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                            <p className="text-xs text-slate-200">Trainers</p>
                            <p className="mt-1 text-2xl font-bold">{totalTrainers}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <form onSubmit={handleAddCity} className="flex flex-col gap-3 md:flex-row">
                    <label htmlFor="city-name-input" className="sr-only">
                        City name
                    </label>
                    <div className="relative flex-1">
                        <MapPinIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            id="city-name-input"
                            type="text"
                            value={newCity}
                            onChange={(e) => setNewCity(e.target.value)}
                            placeholder="Enter city name (e.g., Chicago)"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newCity.trim() || addCityMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PlusIcon className="h-4 w-4" />
                        {addCityMutation.isPending ? 'Adding...' : 'Add City'}
                    </button>
                </form>
                {(error || citiesQueryError?.message) && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error || citiesQueryError?.message}
                    </p>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Cities</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search city..."
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-slate-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        Loading cities...
                    </div>
                ) : filteredCities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                        <p className="text-sm font-medium text-slate-700">No cities found</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {search.trim() ? 'Try a different search term.' : 'Add your first city to get started.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {filteredCities.map((city) => {
                            const isEditing = editingCityId === city._id;

                            return (
                                <li
                                    key={city._id}
                                    onClick={() => handleCityClick(city)}
                                    className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            {isEditing ? (
                                                <div className="flex w-full items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleUpdateCity(city._id, editingName);
                                                            }
                                                            if (e.key === 'Escape') {
                                                                cancelEdit();
                                                            }
                                                        }}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateCity(city._id, editingName);
                                                        }}
                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                                                        title="Save"
                                                    >
                                                        <CheckIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            cancelEdit();
                                                        }}
                                                        className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100"
                                                        title="Cancel"
                                                    >
                                                        <XMarkIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="truncate text-base font-semibold text-slate-900">{city.name}</h3>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                                                            <UserGroupIcon className="h-3.5 w-3.5" />
                                                            {city.trainerCount || 0} Trainers
                                                        </span>
                                                        <span>
                                                            Added:{' '}
                                                            {city.createdAt ? new Date(city.createdAt).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        <span className="text-slate-400">Click to view details</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEdit(city);
                                                }}
                                                className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                                                title="Edit city"
                                            >
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCity(city._id);
                                                }}
                                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                                                title="Delete city"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default CityManagement;
