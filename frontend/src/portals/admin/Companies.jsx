"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, PencilSquareIcon, TrashIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { api } from "@/services/api";
import { notify } from "@/lib/toast";
import { getImagePreviewUrl } from "@/utils/imageUtils";
import { useRouter } from "next/navigation";

const CompanyModal = dynamic(() => import("@/components/modals/CompanyModal"), {
    loading: () => null,
    ssr: false,
});

const AddCompanyModal = dynamic(() => import("@/components/modals/AddCompanyModal"), {
    loading: () => null,
    ssr: false,
});

const PasswordConfirmationModal = dynamic(
    () => import("@/components/modals/PasswordConfirmationModal"),
    {
        loading: () => null,
        ssr: false,
    },
);

const unwrapCompaniesResponse = (response) => {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    return [];
};

const getCompanyLogoUrl = (company) => {
    const rawLogo = company?.logo || company?.logoUrl;
    if (!rawLogo) return null;

    return getImagePreviewUrl(rawLogo);
};

const CompanyCard = memo(function CompanyCard({
    company,
    onCardClick,
    onEdit,
    onDelete,
}) {
    const logoUrl = getCompanyLogoUrl(company);

    return (
        <div
            onClick={() => onCardClick(company._id)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
            style={{ contentVisibility: "auto", containIntrinsicSize: "280px" }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                    {logoUrl ? (
                        <div className="h-20 w-20 rounded-lg border border-gray-200 overflow-hidden bg-white">
                            <img
                                src={logoUrl}
                                alt={`${company.name} logo`}
                                className="h-full w-full object-contain"
                                loading="lazy"
                                decoding="async"
                                width={80}
                                height={80}
                            />
                        </div>
                    ) : (
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-1">
                    <button
                        onClick={(e) => onEdit(company, e)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Company"
                    >
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => onDelete(company, e)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Company"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mb-2">
                <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                        String(company.status || "").toLowerCase() === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                >
                    {company.status
                        ? `${company.status.charAt(0).toUpperCase()}${company.status.slice(1).toLowerCase()}`
                        : "Active"}
                </span>
            </div>

            <h3 className="text-base font-semibold text-gray-900 mb-2">
                {company.name}
            </h3>

            <div className="space-y-1 text-xs">
                <div className="flex items-center text-gray-600">
                    <span className="font-medium mr-1">Admin:</span>
                    <span className="truncate">{company.adminName}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <span className="font-medium mr-1">Email:</span>
                    <span className="truncate">{company.email}</span>
                </div>
                {company.phone && (
                    <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-1">Phone:</span>
                        <span>{company.phone}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

const Companies = () => {
    const queryClient = useQueryClient();
    const {
        data: companies = [],
        isPending: companiesLoading,
        error: companiesError,
    } = useQuery({
        queryKey: ["companies"],
        queryFn: async ({ signal }) => {
            const response = await api.get("/companies", { signal });
            return unwrapCompaniesResponse(response);
        },
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState(null);
    const router = useRouter();

    const refreshCompanies = useCallback(
        async () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
        [queryClient],
    );

    const handleAdd = () => {
        setEditingCompany(null);
        setIsModalOpen(true);
    };

    const handleEdit = (company, e) => {
        e.stopPropagation();
        setEditingCompany(company);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (company, e) => {
        e.stopPropagation();
        setCompanyToDelete(company);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (password) => {
        if (!companyToDelete) return;

        try {
            const verifyRes = await api.post('/users/verify-password', { password });
            if (!verifyRes.success) {
                throw new Error(verifyRes.message || 'Incorrect password');
            }

            await api.delete(`/companies/${companyToDelete.companyCode || companyToDelete._id}`);
            await refreshCompanies();
            setIsDeleteModalOpen(false);
            setCompanyToDelete(null);
        } catch (error) {
            console.error('Error deleting company:', error);
            notify.error(error.response?.data?.message || error.message || 'Failed to delete company');
            if (error.message.includes('password')) {
                throw error;
            }
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingCompany) {
                await api.put(`/companies/${editingCompany.companyCode || editingCompany._id}`, data);
            } else {
                await api.post('/companies', data);
            }
            await refreshCompanies();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving company:', error);
        }
    };

    const handleCardClick = (companyId) => {
        router.push(`/dashboard/companies/${companyId}`);
    };

    if (companiesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading companies...</div>
            </div>
        );
    }

    if (companiesError) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Failed to load companies.</div>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Manage all companies and their colleges
                        </p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Invite
                    </button>
                </div>
            </div>

            {/* Companies Grid */}
            {companies.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new company.</p>
                    <div className="mt-6">
                        <button
                            onClick={handleAdd}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Create Invite
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {companies.map((company) => (
                        <CompanyCard
                            key={company._id}
                            company={company}
                            onCardClick={handleCardClick}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {isModalOpen && !editingCompany && (
                <AddCompanyModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={refreshCompanies}
                />
            )}
            
            {isModalOpen && editingCompany && (
                <CompanyModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={editingCompany}
                />
            )}

            {isDeleteModalOpen && (
                <PasswordConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setCompanyToDelete(null);
                    }}
                    onConfirm={handleConfirmDelete}
                    title="Delete Company"
                    message={`Are you sure you want to delete company "${companyToDelete?.name || 'this company'}"? This action cannot be undone.`}
                />
            )}
        </div>
    );
};

export default Companies;
