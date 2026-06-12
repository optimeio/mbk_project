"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    ArrowUpTrayIcon,
    ClipboardDocumentListIcon,
    DocumentTextIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    ShieldCheckIcon,
    TrashIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import { getNdaTemplate, updateNdaTemplate } from '@/services/trainerService';
import { getProfilePictureUrl } from '@/utils/imageUtils';
import { getDocumentStatusMeta } from '@/utils/trainerDocumentWorkflow';

const EMPTY_TEMPLATE_FORM = {
    title: '',
    introText: '',
    content: '',
    checkboxLabel: '',
    acceptanceConditions: [''],
    version: 1,
    updatedAt: null,
    updatedBy: null,
};

const normalizeAcceptanceConditions = (template = {}) => {
    const conditions = Array.isArray(template.acceptanceConditions)
        ? template.acceptanceConditions
            .map((entry) => String(entry || '').trim())
            .filter(Boolean)
        : [];

    if (conditions.length > 0) {
        return conditions;
    }

    const legacyCheckboxLabel = String(template.checkboxLabel || '').trim();
    return legacyCheckboxLabel ? [legacyCheckboxLabel] : [''];
};

const normalizeTemplateForm = (template = EMPTY_TEMPLATE_FORM) => {
    const acceptanceConditions = normalizeAcceptanceConditions(template);

    return {
        ...EMPTY_TEMPLATE_FORM,
        ...template,
        checkboxLabel: acceptanceConditions[0] || '',
        acceptanceConditions,
    };
};

const NdaManagement = ({ compact = false }) => {
    const router = useRouter();
    const showAgreementRecords = !compact;
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadingTrainerId, setUploadingTrainerId] = useState(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const [uploadFeedback, setUploadFeedback] = useState(null);
    const [templateForm, setTemplateForm] = useState(() => normalizeTemplateForm());
    const [templateFeedback, setTemplateFeedback] = useState(null);
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    const {
        data: trainers = [],
        isLoading: loading,
    } = useQuery({
        queryKey: ['nda-records'],
        enabled: showAgreementRecords,
        queryFn: async () => {
            const response = await api.get(`/trainers/nda-records?t=${Date.now()}`);
            return response?.data || response || [];
        },
    });

    const {
        data: templateData,
        isLoading: templateLoading,
    } = useQuery({
        queryKey: ['nda-template'],
        queryFn: async () => {
            const response = await getNdaTemplate();
            return response?.data || response || EMPTY_TEMPLATE_FORM;
        },
    });

    const uploadNdaMutation = useMutation({
        mutationFn: (formData) => api.post('/trainer-documents/upload', formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nda-records'] });
        },
    });

    const saveTemplateMutation = useMutation({
        mutationFn: (payload) => updateNdaTemplate(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nda-template'] });
        },
    });

    useEffect(() => {
        if (!templateData) return;
        setTemplateForm(normalizeTemplateForm(templateData));
    }, [templateData]);

    const agreementRows = useMemo(() => {
        if (!showAgreementRecords) {
            return [];
        }

        const normalizedRows = trainers.map((trainer) => {
            const agreementPath =
                trainer?.documents?.ndaAgreement ||
                trainer?.documents?.ntaAgreement ||
                trainer?.documents?.NDAAgreement ||
                trainer?.ndaAgreementPdf ||
                trainer?.ntaAgreementPdf ||
                trainer?.NDAAgreementPdf ||
                null;
            const hasAgreement = Boolean(agreementPath);
            const agreementAccepted = Boolean(
                trainer.agreementAccepted ?? trainer.agreementAccepted,
            );

            return {
                ...trainer,
                id: trainer.id || trainer._id,
                trainerName:
                    trainer.userId?.name ||
                    trainer.name ||
                    [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') ||
                    'Unnamed Trainer',
                email: trainer.userId?.email || trainer.email || 'N/A',
                trainerCode: trainer.trainerId || trainer.trainerCode || 'Pending ID',
                agreementAccepted,
                agreementPath:
                    agreementPath ||
                    trainer?.documents?.ndaAgreement ||
                    trainer?.documents?.ntaAgreement ||
                    null,
                hasAgreement,
                documentStatus: trainer.documentStatus || 'pending',
                createdAt: trainer.createdAt,
            };
        });

        return normalizedRows.sort((left, right) => {
                if (left.hasAgreement !== right.hasAgreement) {
                    return left.hasAgreement ? -1 : 1;
                }
                return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
            });
    }, [showAgreementRecords, trainers]);

    const filteredRows = useMemo(() => {
        if (!showAgreementRecords) {
            return [];
        }

        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return agreementRows;
        }

        return agreementRows.filter((row) =>
            [row.trainerName, row.email, row.trainerCode]
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [showAgreementRecords, agreementRows, searchTerm]);

    const stats = useMemo(() => {
        if (!showAgreementRecords) {
            return {
                total: 0,
                generated: 0,
                signed: 0,
                reviewQueue: 0,
            };
        }

        const total = agreementRows.length;
        const generated = agreementRows.filter((row) => row.hasAgreement).length;
        const signed = agreementRows.filter((row) => row.agreementAccepted).length;
        const reviewQueue = agreementRows.filter(
            (row) => row.documentStatus === 'under_review',
        ).length;

        return { total, generated, signed, reviewQueue };
    }, [showAgreementRecords, agreementRows]);

    const handleOpenAgreement = (row) => {
        if (!row.agreementPath) {
            return;
        }

        window.open(getProfilePictureUrl(row.agreementPath), '_blank');
    };

    const handleOpenReview = (row) => {
        sessionStorage.setItem('trainerVerificationSelection', row.id);
        router.push('/dashboard/documents');
    };

    const handleUploadClick = (row) => {
        setUploadTarget(row);
        setUploadFeedback(null);
        fileInputRef.current?.click();
    };

    const handleUploadChange = async (event) => {
        const file = event.target.files?.[0];
        const targetRow = uploadTarget;
        event.target.value = '';

        if (!file || !targetRow) {
            return;
        }

        if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
            setUploadFeedback({
                type: 'error',
                message: 'Upload a PDF, DOC, or DOCX file for the NDA agreement. PDF is recommended for easier preview.',
            });
            setUploadTarget(null);
            return;
        }

        try {
            setUploadingTrainerId(targetRow.id);
            setUploadFeedback(null);

            const formData = new FormData();
            formData.append('document', file);
            formData.append('documentType', 'ndaAgreement');
            formData.append('targetTrainerId', targetRow.id);

            await uploadNdaMutation.mutateAsync(formData);

            setUploadFeedback({
                type: 'success',
                message: `NDA file uploaded for ${targetRow.trainerName}. It is now visible in the trainer agreement section.`,
            });
        } catch (error) {
            console.error('Failed to upload NDA file', error);
            setUploadFeedback({
                type: 'error',
                message: error.message || 'Failed to upload NDA file.',
            });
        } finally {
            setUploadingTrainerId(null);
            setUploadTarget(null);
        }
    };

    const handleTemplateChange = (field, value) => {
        setTemplateForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleConditionChange = (index, value) => {
        setTemplateForm((prev) => {
            const nextConditions = [...prev.acceptanceConditions];
            nextConditions[index] = value;

            return {
                ...prev,
                checkboxLabel: nextConditions[0] || '',
                acceptanceConditions: nextConditions,
            };
        });
    };

    const handleAddCondition = () => {
        setTemplateForm((prev) => ({
            ...prev,
            acceptanceConditions: [...prev.acceptanceConditions, ''],
        }));
    };

    const handleRemoveCondition = (index) => {
        setTemplateForm((prev) => {
            const nextConditions = prev.acceptanceConditions.filter((_, itemIndex) => itemIndex !== index);
            const safeConditions = nextConditions.length > 0 ? nextConditions : [''];

            return {
                ...prev,
                checkboxLabel: safeConditions[0] || '',
                acceptanceConditions: safeConditions,
            };
        });
    };

    const handleSaveTemplate = async () => {
        if (!templateForm.content.trim()) {
            setTemplateFeedback({
                type: 'error',
                message: 'Agreement content is required.',
            });
            return;
        }

        const acceptanceConditions = templateForm.acceptanceConditions
            .map((entry) => entry.trim())
            .filter(Boolean);

        if (acceptanceConditions.length === 0) {
            setTemplateFeedback({
                type: 'error',
                message: 'Add at least one acceptance condition.',
            });
            return;
        }

        try {
            setTemplateFeedback(null);
            const response = await saveTemplateMutation.mutateAsync({
                title: templateForm.title,
                introText: templateForm.introText,
                content: templateForm.content,
                checkboxLabel: acceptanceConditions[0],
                acceptanceConditions,
            });
            const savedTemplate = response?.data || response || templateForm;
            setTemplateForm((prev) => normalizeTemplateForm({
                ...prev,
                ...savedTemplate,
            }));
            setTemplateFeedback({
                type: 'success',
                message:
                    'NDA agreement content updated. Trainer signup step 4 will now use this text.',
            });
        } catch (error) {
            console.error('Failed to save NDA template', error);
            setTemplateFeedback({
                type: 'error',
                message: error.message || 'Failed to update NDA agreement content.',
            });
        }
    };

    return (
        <div className={`w-full ${compact ? 'px-6 pb-6' : 'px-4'}`}>
            {!compact && (
                <div className="flex flex-col justify-between gap-4 border-b border-gray-200 py-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="font-calibri text-xl font-bold uppercase tracking-wider text-gray-800">
                            NDA Management
                        </h1>
                        <p className="mt-1 max-w-3xl font-calibri text-sm text-gray-500">
                            Control the trainer NDA agreement content, upload trainer NDA files, and jump directly into document verification when needed.
                        </p>
                    </div>

                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            autoComplete="off"
                            className="block w-72 rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 font-calibri text-sm outline-none transition focus:border-indigo-500"
                            placeholder="Search trainer, email or ID..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-sky-50/50 p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.24em] text-indigo-600">
                            Agreement Content Control
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm text-slate-600">
                            This content controls the trainer signup NDA agreement screen and the
                            NDA PDF generated for new submissions.
                        </p>
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-xs font-bold uppercase tracking-widest text-indigo-700">
                        Version {templateForm.version || 1}
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                            Agreement Title
                        </span>
                        <input
                            type="text"
                            value={templateForm.title}
                            onChange={(event) => handleTemplateChange('title', event.target.value)}
                            disabled={templateLoading || saveTemplateMutation.isPending}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                            placeholder="NDA Agreement & Signature"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                            Intro Text
                        </span>
                        <input
                            type="text"
                            value={templateForm.introText}
                            onChange={(event) => handleTemplateChange('introText', event.target.value)}
                            disabled={templateLoading || saveTemplateMutation.isPending}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                            placeholder="Please read the agreement carefully before signing."
                        />
                    </label>

                    <label className="block lg:col-span-2">
                        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                            Agreement Content
                        </span>
                        <textarea
                            rows={compact ? 18 : 12}
                            value={templateForm.content}
                            onChange={(event) => handleTemplateChange('content', event.target.value)}
                            disabled={templateLoading || saveTemplateMutation.isPending}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400"
                            placeholder="Type the NDA agreement content shown to trainers here..."
                        />
                    </label>

                    <div className="block lg:col-span-2">
                        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="block text-xs font-black uppercase tracking-widest text-slate-500">
                                    Acceptance Conditions
                                </span>
                                <p className="mt-1 text-xs text-slate-500">
                                    Each condition becomes a required checkbox on the trainer NDA screen.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCondition}
                                disabled={templateLoading || saveTemplateMutation.isPending}
                                className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-widest transition ${
                                    templateLoading || saveTemplateMutation.isPending
                                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                        : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                }`}
                            >
                                <PlusIcon className="mr-1.5 h-4 w-4" />
                                Add Condition
                            </button>
                        </div>

                        <div className="space-y-3">
                            {templateForm.acceptanceConditions.map((condition, index) => (
                                <div key={`acceptance-condition-${index}`} className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={condition}
                                        onChange={(event) => handleConditionChange(index, event.target.value)}
                                        disabled={templateLoading || saveTemplateMutation.isPending}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                                        placeholder="I confirm this NDA condition."
                                    />
                                    {templateForm.acceptanceConditions.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCondition(index)}
                                            disabled={templateLoading || saveTemplateMutation.isPending}
                                            className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition ${
                                                templateLoading || saveTemplateMutation.isPending
                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                                    : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                                            }`}
                                            aria-label={`Remove condition ${index + 1}`}
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-slate-500">
                        {templateForm.updatedAt
                            ? `Last updated: ${new Date(templateForm.updatedAt).toLocaleString()}`
                            : 'Using default NDA agreement content.'}
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={templateLoading || saveTemplateMutation.isPending}
                        className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white transition ${
                            templateLoading || saveTemplateMutation.isPending
                                ? 'cursor-wait bg-indigo-300'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                        {saveTemplateMutation.isPending ? 'Saving Content...' : 'Save NDA Content'}
                    </button>
                </div>
            </div>

            {templateFeedback && (
                <div
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                        templateFeedback.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                >
                    {templateFeedback.message}
                </div>
            )}

            {showAgreementRecords && (
                <>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-400">
                                Trainers Listed
                            </p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500">
                                NDA Files Ready
                            </p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.generated}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-500">
                                Agreements Accepted
                            </p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.signed}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">
                                Review Queue
                            </p>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{stats.reviewQueue}</p>
                        </div>
                    </div>

                    {uploadFeedback && (
                        <div
                            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                                uploadFeedback.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                        >
                            {uploadFeedback.message}
                        </div>
                    )}

                    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        {loading ? (
                            <div className="flex flex-col items-center py-20 text-center">
                                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                                <p className="font-calibri text-sm font-bold text-gray-500">
                                    Loading agreement records...
                                </p>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                                    <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="font-calibri text-lg font-bold text-gray-900">
                                    No Trainers Found
                                </h3>
                                <p className="mx-auto mt-1 max-w-md font-calibri text-sm text-gray-500">
                                    Trainer records will appear here for NDA upload and review.
                                </p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="py-3 pl-6 pr-3 text-left font-calibri text-xs font-bold uppercase tracking-widest text-gray-500">
                                            Trainer
                                        </th>
                                        <th className="px-3 py-3 text-left font-calibri text-xs font-bold uppercase tracking-widest text-gray-500">
                                            Agreement
                                        </th>
                                        <th className="px-3 py-3 text-left font-calibri text-xs font-bold uppercase tracking-widest text-gray-500">
                                            Workflow
                                        </th>
                                        <th className="px-3 py-3 text-right font-calibri text-xs font-bold uppercase tracking-widest text-gray-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredRows.map((row) => {
                                        const workflowMeta = getDocumentStatusMeta(row.documentStatus);

                                        return (
                                            <tr
                                                key={row.id}
                                                className="transition-colors hover:bg-indigo-50/30"
                                            >
                                                <td className="py-5 pl-6 pr-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                                                            <UserCircleIcon className="h-6 w-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-calibri text-sm font-bold uppercase tracking-tight text-gray-800">
                                                                {row.trainerName}
                                                            </p>
                                                            <p className="mt-1 text-xs font-medium text-gray-500">
                                                                {row.email}
                                                            </p>
                                                            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                                {row.trainerCode}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-5">
                                                    <div className="flex flex-col gap-2">
                                                        <span className={`inline-flex w-max items-center rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                                            row.hasAgreement
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                : 'border-amber-200 bg-amber-50 text-amber-700'
                                                        }`}>
                                                            <DocumentTextIcon className="mr-1.5 h-4 w-4" />
                                                            {row.hasAgreement ? 'File Ready' : 'No File Yet'}
                                                        </span>
                                                        <span className={`inline-flex w-max items-center rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                                            row.agreementAccepted
                                                                ? 'border-sky-200 bg-sky-50 text-sky-700'
                                                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                                        }`}>
                                                            <ShieldCheckIcon className="mr-1.5 h-4 w-4" />
                                                            {row.agreementAccepted ? 'Accepted' : 'Not Accepted'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-5">
                                                    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${workflowMeta.badgeClass}`}>
                                                        {workflowMeta.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-5 text-right">
                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        {row.hasAgreement && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenAgreement(row)}
                                                                className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100"
                                                            >
                                                                <EyeIcon className="mr-1.5 h-4 w-4" />
                                                                Open NDA
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUploadClick(row)}
                                                            disabled={uploadingTrainerId === row.id}
                                                            className={`inline-flex items-center rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition ${
                                                                uploadingTrainerId === row.id
                                                                    ? 'cursor-wait bg-emerald-300'
                                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                                            }`}
                                                        >
                                                            <ArrowUpTrayIcon className="mr-1.5 h-4 w-4" />
                                                            {uploadingTrainerId === row.id
                                                                ? 'Uploading...'
                                                                : row.hasAgreement
                                                                    ? 'Replace File'
                                                                    : 'Upload NDA File'}
                                                        </button>
                                                        {row.documentStatus === 'under_review' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenReview(row)}
                                                                className="inline-flex items-center rounded-xl bg-sky-600 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-sky-700"
                                                            >
                                                                Review Docs
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleUploadChange}
                    />
                </>
            )}
        </div>
    );
};

export default NdaManagement;
