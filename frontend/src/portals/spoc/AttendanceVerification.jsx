"use client";

import {
    Component,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { List } from 'react-window';
import {
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ClockIcon,
    DocumentTextIcon,
    MapPinIcon,
    PencilSquareIcon,
    PhotoIcon,
    UsersIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { FILE_BASE_URL } from '@/services/api';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useSocket } from '@/context/SocketContext';
import {
    ATTENDANCE_VERIFICATION_QUERY_KEY,
    DEFAULT_ATTENDANCE_PAGINATION,
    getAttendanceVerificationListQueryOptions,
    getAttendanceSubmissionDetails,
    useAttendanceVerificationList,
    useVerifyAttendanceSubmission,
} from '@/modules/attendance';
import RenderProfiler from '@/shared/perf/RenderProfiler';
import useRenderCountDebug from "@/shared/perf/useRenderCountDebug";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
                    <h3 className="font-bold">Something went wrong.</h3>
                    <details className="mt-2 whitespace-pre-wrap text-xs">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});

const getSafeNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
};

const getTrainerName = (submission) => submission?.trainerId?.userId?.name || 'Unknown Trainer';

const getTopicLabel = (submission) => submission?.scheduleId?.subject || `Day ${submission?.dayNumber || '-'} Content`;

const getProgramLabel = (submission) => {
    return [
        submission?.collegeId?.companyId?.name || submission?.collegeId?.company?.name,
        submission?.scheduleId?.courseId?.name,
        submission?.collegeId?.name
    ].filter(Boolean).join(' / ');
};

const getSessionDateValue = (submission) => {
    return submission?.checkIn?.time || submission?.date || submission?.createdAt || null;
};

const formatDate = (value, fallback = 'Date N/A') => {
    if (!value) return fallback;
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return fallback;
    return dateFormatter.format(parsedDate);
};

const formatTime = (value, fallback = 'N/A') => {
    if (!value) return fallback;
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return fallback;
    return timeFormatter.format(parsedDate);
};

const formatDateTime = (value, fallback = 'Not verified yet') => {
    if (!value) return fallback;
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return fallback;
    return dateTimeFormatter.format(parsedDate);
};

const getCheckInSummary = (submission) => {
    const dateValue = getSessionDateValue(submission);
    const displayDate = formatDate(dateValue);
    const displayTime = submission?.checkInTime || formatTime(submission?.checkIn?.time);
    return `${displayDate} / ${displayTime}`;
};

const getAttendanceMetrics = (submission) => {
    const submittedPresent = getSafeNumber(submission?.studentsPresent);
    const submittedAbsent = getSafeNumber(submission?.studentsAbsent);
    const isApproved = String(submission?.verificationStatus || '').trim().toLowerCase() === 'approved';
    const present = isApproved ? submittedPresent : 0;
    const absent = isApproved ? submittedAbsent : 0;

    return {
        isApproved,
        present,
        absent,
        total: present + absent,
        submittedPresent,
        submittedAbsent,
        submittedTotal: submittedPresent + submittedAbsent,
        summaryLabel: isApproved ? 'Present' : 'Submitted'
    };
};

const getGeoStatusClasses = (distance) => {
    if (typeof distance !== 'number') {
        return 'bg-gray-50 border-gray-100 text-gray-400';
    }

    return distance <= 300
        ? 'bg-white border-green-50 text-gray-900'
        : 'bg-red-50/30 border-red-100 text-red-600';
};

const getGeoBadgeClasses = (distance) => {
    if (typeof distance !== 'number') {
        return 'bg-gray-100 text-gray-400';
    }

    return distance <= 300
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700';
};

const getFiniteNumberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getStatusBadge = (status) => {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };

    return `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] || 'bg-gray-100 text-gray-800'
    }`;
};

const ATTENDANCE_ROW_HEIGHT = 160;
const ATTENDANCE_LIST_HEIGHT = 720;
const ATTENDANCE_LIST_OVERSCAN = 4;
const ATTENDANCE_PAGE_LIMIT = 20;

const getPreferredCheckOutLocation = (submission) => {
    const photos = Array.isArray(submission?.checkOut?.photos) ? submission.checkOut.photos : [];
    const preferredPhoto =
        photos.find((photo) =>
            String(photo?.validationStatus || '').trim().toLowerCase() === 'verified' &&
            Number.isFinite(getFiniteNumberOrNull(photo?.latitude)) &&
            Number.isFinite(getFiniteNumberOrNull(photo?.longitude))
        ) ||
        photos.find((photo) =>
            Number.isFinite(getFiniteNumberOrNull(photo?.latitude)) &&
            Number.isFinite(getFiniteNumberOrNull(photo?.longitude))
        ) ||
        null;

    if (preferredPhoto) {
        const distanceKm = getFiniteNumberOrNull(preferredPhoto?.distanceKm);
        return {
            lat: getFiniteNumberOrNull(preferredPhoto?.latitude),
            lng: getFiniteNumberOrNull(preferredPhoto?.longitude),
            distanceFromCollege: Number.isFinite(distanceKm) ? distanceKm * 1000 : null,
            accuracy: null,
            source: 'geo-tag-image',
        };
    }

    const fallbackLocation = submission?.checkOut?.location || null;
    return {
        lat: getFiniteNumberOrNull(fallbackLocation?.lat),
        lng: getFiniteNumberOrNull(fallbackLocation?.lng),
        distanceFromCollege: getFiniteNumberOrNull(fallbackLocation?.distanceFromCollege),
        accuracy: getFiniteNumberOrNull(fallbackLocation?.accuracy),
        source: 'live-location',
    };
};

const AttendanceSubmissionRow = memo(function AttendanceSubmissionRow({
    ariaAttributes,
    index,
    style,
    submissions,
    accessToken,
    openSubmissionModal,
    getStatusBadge,
}) {
    const submission = submissions[index];
    const metrics = getAttendanceMetrics(submission);

    const handleStopPropagation = useCallback((event) => {
        event.stopPropagation();
    }, []);
    const handleOpenSubmission = useCallback(() => {
        openSubmissionModal(submission);
    }, [openSubmissionModal, submission]);
    const handleApprove = useCallback(() => {
        openSubmissionModal(submission, 'approved');
    }, [openSubmissionModal, submission]);
    const handleReject = useCallback(() => {
        openSubmissionModal(submission, 'rejected');
    }, [openSubmissionModal, submission]);

    return (
        <div {...ariaAttributes} style={style} className="border-b border-gray-100 bg-white">
            <div
                className="h-full cursor-pointer px-4 py-5 transition-colors hover:bg-gray-50 sm:px-6"
                onClick={handleOpenSubmission}
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-indigo-600">
                                {getTrainerName(submission)}
                            </p>
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-900">
                                Topic: {getTopicLabel(submission)}
                            </span>
                        </div>
                        <p
                            className="mt-1 truncate text-xs font-medium text-gray-500"
                            title={getProgramLabel(submission) || 'Program details unavailable'}
                        >
                            {getProgramLabel(submission) || 'Program details unavailable'}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                            <span className="flex items-center rounded-md bg-blue-50 px-2 py-1 text-gray-600">
                                <ClockIcon className="mr-1 h-3 w-3 shrink-0 text-blue-500" />
                                Day {submission.dayNumber || '-'}
                            </span>
                            <span className="flex items-center rounded-md bg-orange-50 px-2 py-1 text-gray-600">
                                <ClockIcon className="mr-1 h-3 w-3 shrink-0 text-orange-500" />
                                {getCheckInSummary(submission)}
                            </span>
                            <span
                                className={`flex items-center rounded-md px-2 py-1 text-gray-600 ${
                                    metrics.isApproved ? 'bg-green-50' : 'bg-amber-50'
                                }`}
                            >
                                <UsersIcon
                                    className={`mr-1 h-3 w-3 shrink-0 ${
                                        metrics.isApproved ? 'text-green-500' : 'text-amber-500'
                                    }`}
                                />
                                {metrics.isApproved
                                    ? `${metrics.present}/${metrics.total} Present`
                                    : `${metrics.submittedPresent}/${metrics.submittedTotal} Submitted`}
                            </span>
                            {submission.attendancePdfUrl && (
                                <a
                                    href={`${FILE_BASE_URL}/api/uploads/attendance/pdfs/${submission.attendancePdfUrl.split(/[/\\]/).pop()}?token=${accessToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center font-bold text-indigo-600 hover:underline"
                                    onClick={handleStopPropagation}
                                >
                                    <DocumentTextIcon className="mr-1 h-3 w-3 shrink-0" />
                                    PDF List
                                </a>
                            )}
                            <a
                                href={`${FILE_BASE_URL}/api/attendance/${submission._id}/export-excel`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center font-bold text-green-600 hover:underline"
                                onClick={handleStopPropagation}
                            >
                                <ArrowDownTrayIcon className="mr-1 h-3 w-3 shrink-0" />
                                Excel List
                            </a>
                        </div>
                    </div>
                    <div
                        className="flex items-center justify-between gap-3 xl:ml-6 xl:justify-end"
                        onClick={handleStopPropagation}
                    >
                        <span className={getStatusBadge(submission.verificationStatus)}>
                            {submission.verificationStatus}
                        </span>
                        {submission.verificationStatus === 'pending' ? (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleApprove}
                                    className="rounded-full p-2 text-green-600 transition hover:bg-green-50"
                                    title="Approve"
                                >
                                    <CheckCircleIcon className="h-6 w-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReject}
                                    className="rounded-full p-2 text-red-600 transition hover:bg-red-50"
                                    title="Reject"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleOpenSubmission}
                                className="text-xs font-bold text-gray-500 hover:text-indigo-600"
                            >
                                Details
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const VirtualizedAttendanceSubmissionList = memo(function VirtualizedAttendanceSubmissionList({
    submissions,
    accessToken,
    openSubmissionModal,
    getStatusBadge,
}) {
    const rowProps = useMemo(() => ({
        submissions,
        accessToken,
        openSubmissionModal,
        getStatusBadge,
    }), [accessToken, getStatusBadge, openSubmissionModal, submissions]);

    const listHeight = useMemo(
        () => Math.max(
            ATTENDANCE_ROW_HEIGHT,
            Math.min(ATTENDANCE_LIST_HEIGHT, submissions.length * ATTENDANCE_ROW_HEIGHT),
        ),
        [submissions.length],
    );

    return (
        <div className="overflow-hidden">
            <List
                rowComponent={AttendanceSubmissionRow}
                rowCount={submissions.length}
                rowHeight={ATTENDANCE_ROW_HEIGHT}
                rowProps={rowProps}
                style={{ height: listHeight, width: '100%' }}
                overscanCount={ATTENDANCE_LIST_OVERSCAN}
            />
        </div>
    );
});

const AttendanceVerification = () => {
    useRenderCountDebug("SpocAttendanceVerification");
    const { socket } = useSocket();
    const queryClient = useQueryClient();
    const [accessToken] = useState(() =>
        typeof window === 'undefined'
            ? ''
            : localStorage.getItem('accessToken') || '',
    );
    const [selectedTab, setSelectedTab] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [verificationComment, setVerificationComment] = useState('');
    const [approverName, setApproverName] = useState('');
    const [banner, setBanner] = useState(null);
    const [formError, setFormError] = useState('');
    const [preferredAction, setPreferredAction] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [page, setPage] = useState(1);
    const debouncedSearchTerm = useDebouncedValue(searchTerm.trim(), 300);
    const isMountedRef = useRef(false);
    const detailAbortRef = useRef(null);
    const detailCacheRef = useRef(new Map());

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (detailAbortRef.current) {
                detailAbortRef.current.abort();
                detailAbortRef.current = null;
            }
            detailCacheRef.current.clear();
        };
    }, []);

    const resetVerificationState = useCallback(() => {
        setVerificationComment('');
        setApproverName('');
        setFormError('');
        setPreferredAction(null);
    }, []);

    const fetchSubmissionDetails = useCallback(async (submissionId) => {
        const normalizedId = String(submissionId || '').trim();
        if (!normalizedId) {
            return null;
        }

        if (detailCacheRef.current.has(normalizedId)) {
            return detailCacheRef.current.get(normalizedId);
        }

        if (detailAbortRef.current) {
            detailAbortRef.current.abort();
        }

        const controller = new AbortController();
        detailAbortRef.current = controller;

        if (isMountedRef.current) {
            setDetailLoading(true);
        }

        try {
            const detailedSubmission = await getAttendanceSubmissionDetails(normalizedId, {
                signal: controller.signal,
            });

            if (
                detailedSubmission &&
                !controller.signal.aborted &&
                detailAbortRef.current === controller
            ) {
                detailCacheRef.current.set(normalizedId, detailedSubmission);
                return detailedSubmission;
            }
        } catch (requestError) {
            if (!controller.signal.aborted) {
                console.error('Error fetching attendance detail:', requestError);
            }
        } finally {
            if (detailAbortRef.current === controller) {
                detailAbortRef.current = null;
            }

            if (isMountedRef.current && !controller.signal.aborted) {
                setDetailLoading(false);
            }
        }

        return null;
    }, []);

    const closeDetailModal = useCallback(() => {
        if (detailAbortRef.current) {
            detailAbortRef.current.abort();
            detailAbortRef.current = null;
        }
        setDetailLoading(false);
        setShowDetailModal(false);
        setSelectedSubmission(null);
        resetVerificationState();
    }, [resetVerificationState]);

    const openSubmissionModal = useCallback((submission, action = null) => {
        setSelectedSubmission(submission);
        setShowDetailModal(true);
        setBanner(null);
        setVerificationComment('');
        setApproverName('');
        setFormError('');
        setPreferredAction(action);
        setDetailLoading(false);

        const submissionId = String(submission?._id || '').trim();
        if (!submissionId) {
            return;
        }

        if (detailCacheRef.current.has(submissionId)) {
            const cachedDetail = detailCacheRef.current.get(submissionId);
            setSelectedSubmission(cachedDetail);
            return;
        }

        void (async () => {
            const detailedSubmission = await fetchSubmissionDetails(submissionId);
            if (
                detailedSubmission &&
                isMountedRef.current
            ) {
                setSelectedSubmission((previousSubmission) => {
                    if (!previousSubmission || previousSubmission._id !== submissionId) {
                        return previousSubmission;
                    }

                    return detailedSubmission;
                });
            }
        })();
    }, [fetchSubmissionDetails]);

    const attendanceListQuery = useAttendanceVerificationList({
        verificationStatus: selectedTab,
        page,
        limit: ATTENDANCE_PAGE_LIMIT,
        search: debouncedSearchTerm,
    });

    const verifySubmissionMutation = useVerifyAttendanceSubmission();

    useEffect(() => {
        if (!socket) return undefined;

        const handleAttendanceUpdate = () => {
            void queryClient.invalidateQueries({
                queryKey: ATTENDANCE_VERIFICATION_QUERY_KEY,
            });
        };

        socket.on('attendanceUpdate', handleAttendanceUpdate);

        return () => {
            socket.off('attendanceUpdate', handleAttendanceUpdate);
        };
    }, [queryClient, socket]);

    const submissions = attendanceListQuery.data?.submissions || [];
    const pagination = attendanceListQuery.data?.pagination || DEFAULT_ATTENDANCE_PAGINATION;
    const loading = attendanceListQuery.isPending;
    const error = attendanceListQuery.error?.message || null;
    const verifying = verifySubmissionMutation.isPending;
    const filteredSubmissions = submissions;
    const pageStart = pagination.total === 0
        ? 0
        : (pagination.page - 1) * pagination.limit + 1;
    const pageEnd = pagination.total === 0
        ? 0
        : Math.min(pagination.page * pagination.limit, pagination.total);

    useEffect(() => {
        if (!pagination?.hasNextPage) {
            return;
        }

        const nextPage = Number(pagination.page || page) + 1;
        queryClient.prefetchQuery(
            getAttendanceVerificationListQueryOptions({
                verificationStatus: selectedTab,
                page: nextPage,
                limit: ATTENDANCE_PAGE_LIMIT,
                search: debouncedSearchTerm,
            }),
        );
    }, [
        debouncedSearchTerm,
        page,
        pagination?.hasNextPage,
        pagination?.page,
        queryClient,
        selectedTab,
    ]);
    const handleDismissBanner = useCallback(() => {
        setBanner(null);
    }, []);
    const handleSearchChange = useCallback((event) => {
        setSearchTerm(event.target.value);
        setPage(1);
    }, []);
    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setPage(1);
    }, []);
    const handleTabChange = useCallback((tab) => {
        setSelectedTab(tab);
        setPage(1);
    }, []);
    const handlePreviousPage = useCallback(() => {
        setPage((currentPage) => Math.max(1, currentPage - 1));
    }, []);
    const handleNextPage = useCallback(() => {
        setPage((currentPage) => {
            if (!pagination.hasNextPage) {
                return currentPage;
            }

            return currentPage + 1;
        });
    }, [pagination.hasNextPage]);

    const selectedMetrics = useMemo(() => getAttendanceMetrics(selectedSubmission), [selectedSubmission]);
    const selectedCheckOutLocation = useMemo(() => getPreferredCheckOutLocation(selectedSubmission), [selectedSubmission]);

    const validateVerification = useCallback((status, approverValue, commentValue) => {
        if (status === 'approved' && !approverValue.trim()) {
            return 'Approver name is required to approve this submission.';
        }

        if (status === 'rejected' && !commentValue.trim()) {
            return 'Rejection reason is required to reject this submission.';
        }

        return '';
    }, []);

    const submitVerification = useCallback(async ({
        submission,
        status,
        approverValue,
        commentValue,
        onValidationError,
        onError,
        onStart,
        onFinally,
        onSuccess
    }) => {
        if (!submission?._id) return;

        const apiStatus = status.toLowerCase();
        const validationMessage = validateVerification(apiStatus, approverValue, commentValue);

        if (validationMessage) {
            onValidationError?.(validationMessage);
            return;
        }

        try {
            onStart?.();
            const response = await verifySubmissionMutation.mutateAsync({
                submissionId: submission._id,
                status: apiStatus,
                comment: commentValue.trim(),
                approvedBy: approverValue.trim(),
            });

            if (response?.success !== false) {
                detailCacheRef.current.delete(String(submission._id));
                onSuccess?.(apiStatus);
                return;
            }

            onError?.(response.message || 'Unable to update the verification status.');
        } catch (requestError) {
            console.error('Error verifying attendance:', requestError);
            onError?.(requestError.message || 'Failed to verify this attendance submission.');
        } finally {
            onFinally?.();
        }
    }, [validateVerification, verifySubmissionMutation]);

    const handleVerifySubmit = useCallback(async (status) => {
        await submitVerification({
            submission: selectedSubmission,
            status,
            approverValue: approverName,
            commentValue: verificationComment,
            onValidationError: setFormError,
            onError: setFormError,
            onStart: () => {
                setFormError('');
                setBanner(null);
            },
            onFinally: undefined,
            onSuccess: async (apiStatus) => {
                setBanner({
                    type: 'success',
                    message: `Attendance ${apiStatus} successfully for ${getTrainerName(selectedSubmission)}.`
                });
                closeDetailModal();
            }
        });
    }, [
        approverName,
        closeDetailModal,
        selectedSubmission,
        submitVerification,
        verificationComment,
    ]);

    return (
        <RenderProfiler id="SpocAttendanceVerification">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Attendance Verification</h1>
                <p className="mt-1 text-sm text-gray-500">Review and verify trainer attendance submissions</p>
            </div>

            {banner && (
                <div className={`mb-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
                    banner.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                    <p>{banner.message}</p>
                    <button
                        type="button"
                        onClick={handleDismissBanner}
                        className="shrink-0 rounded-full p-1 transition hover:bg-black/5"
                        aria-label="Dismiss message"
                    >
                        <XCircleIcon className="h-4 w-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="relative mb-6">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    id="attendance-search"
                    name="attendance-search"
                    className="block w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm leading-5 text-gray-900 placeholder-gray-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Search by trainer, college, or course..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
                        aria-label="Clear search"
                    >
                        <XCircleIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex gap-8 overflow-x-auto">
                    {['pending', 'approved', 'rejected'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => handleTabChange(tab)}
                            className={`${selectedTab === tab
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize transition-colors`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                {loading ? (
                    <div className="space-y-3 px-4 py-6 sm:px-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={`attendance-skeleton-${index}`}
                                className="h-16 animate-pulse rounded-xl bg-gray-100"
                            />
                        ))}
                    </div>
                ) : filteredSubmissions.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm
                                ? `No ${selectedTab} attendance submissions match "${searchTerm}".`
                                : `No ${selectedTab} attendance submissions found.`}
                        </p>
                    </div>
                ) : (
                    <VirtualizedAttendanceSubmissionList
                        submissions={filteredSubmissions}
                        accessToken={accessToken}
                        openSubmissionModal={openSubmissionModal}
                        getStatusBadge={getStatusBadge}
                    />
                )}

                {!loading && pagination.total > 0 ? (
                    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p>
                            Showing {pageStart}-{pageEnd} of {pagination.total} submissions
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={!pagination.hasPrevPage}
                                onClick={handlePreviousPage}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="min-w-[84px] text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
                            </span>
                            <button
                                type="button"
                                disabled={!pagination.hasNextPage}
                                onClick={handleNextPage}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {showDetailModal && selectedSubmission && (
                <div className="dashboard-modal-scrollport fixed inset-0 z-50 overflow-y-auto">
                    <div className="dashboard-modal-center relative flex min-h-screen items-center justify-center px-4 py-6 text-center sm:p-6">
                        <div className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => !verifying && closeDetailModal()}></div>
                        <div className="dashboard-modal-panel relative z-10 inline-block w-full max-w-3xl transform rounded-2xl bg-white text-left shadow-2xl transition-all sm:align-middle">
                            <ErrorBoundary>
                                <div className="flex items-center justify-between bg-indigo-600 px-6 py-4">
                                    <h3 className="text-lg font-bold text-white">Attendance Verification</h3>
                                    <button type="button" onClick={closeDetailModal} className="text-white/80 hover:text-white">
                                        <XCircleIcon className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                                    {detailLoading && (
                                        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-medium text-indigo-700">
                                            Loading full submission details...
                                        </div>
                                    )}

                                    {selectedSubmission.verificationStatus === 'pending' && preferredAction && (
                                        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
                                            preferredAction === 'approved'
                                                ? 'border-green-200 bg-green-50 text-green-700'
                                                : 'border-red-200 bg-red-50 text-red-700'
                                        }`}>
                                            {preferredAction === 'approved'
                                                ? 'Approval is selected. Add the approver name and confirm below.'
                                                : 'Rejection is selected. Add the rejection reason and confirm below.'}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                                            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Session Information</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500">Trainer</p>
                                                    <p className="text-sm font-bold text-gray-900">{getTrainerName(selectedSubmission)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Syllabus Topic</p>
                                                    <p className="text-sm font-bold text-indigo-700">{getTopicLabel(selectedSubmission)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Institution</p>
                                                    <p className="text-sm font-bold text-gray-900">{getProgramLabel(selectedSubmission) || 'Program details unavailable'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Day</p>
                                                        <p className="text-sm font-bold text-gray-900">#{selectedSubmission.dayNumber || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Check-In</p>
                                                        <p className="text-sm font-bold text-gray-900">{getCheckInSummary(selectedSubmission)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                                            <h4 className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-indigo-400">Student Attendance</h4>
                                            <div className="flex items-center justify-around">
                                                <div className="text-center">
                                                    <div className={`text-3xl font-black ${selectedMetrics.isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                                                        {selectedMetrics.isApproved ? selectedMetrics.present : selectedMetrics.submittedPresent}
                                                    </div>
                                                    <p className={`text-[10px] font-bold uppercase ${selectedMetrics.isApproved ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {selectedMetrics.isApproved ? 'Present' : 'Submitted'}
                                                    </p>
                                                </div>
                                                <div className="h-10 w-px bg-indigo-100"></div>
                                                <div className="text-center">
                                                    <div className={`text-3xl font-black ${selectedMetrics.isApproved ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {selectedMetrics.isApproved ? selectedMetrics.absent : selectedMetrics.submittedAbsent}
                                                    </div>
                                                    <p className={`text-[10px] font-bold uppercase ${selectedMetrics.isApproved ? 'text-red-300' : 'text-slate-400'}`}>
                                                        {selectedMetrics.isApproved ? 'Absent' : 'Marked Absent'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 md:col-span-2">
                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">High-Accuracy Geo-Verification</h4>
                                                <div className="flex gap-3">
                                                    {selectedSubmission.checkIn?.location?.lat && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${selectedSubmission.checkIn.location.lat},${selectedSubmission.checkIn.location.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-600 hover:underline"
                                                        >
                                                            <MapPinIcon className="mr-1 h-3 w-3" />
                                                            Check-In Map
                                                        </a>
                                                    )}
                                                    {selectedCheckOutLocation?.lat && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${selectedCheckOutLocation.lat},${selectedCheckOutLocation.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-green-600 hover:underline"
                                                        >
                                                            <MapPinIcon className="mr-1 h-3 w-3" />
                                                            Check-Out Map
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className={`rounded-xl border-2 p-4 transition-all ${getGeoStatusClasses(selectedSubmission.checkIn?.location?.distanceFromCollege)}`}>
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Check-In Stats</span>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getGeoBadgeClasses(selectedSubmission.checkIn?.location?.distanceFromCollege)}`}>
                                                            {typeof selectedSubmission.checkIn?.location?.distanceFromCollege === 'number'
                                                                ? selectedSubmission.checkIn.location.distanceFromCollege <= 300 ? 'ON-SITE' : 'OFF-SITE'
                                                                : 'NO DATA'}
                                                        </span>
                                                    </div>
                                                    {selectedSubmission.checkIn?.location ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-end justify-between">
                                                                <p className="text-[10px] text-gray-400">DISTANCE</p>
                                                                <p className={`text-sm font-black ${selectedSubmission.checkIn.location.distanceFromCollege <= 300 ? 'text-gray-900' : 'text-red-600'}`}>
                                                                    {Math.round(selectedSubmission.checkIn.location.distanceFromCollege)} meters
                                                                </p>
                                                            </div>
                                                            <div className="flex items-end justify-between">
                                                                <p className="text-[10px] text-gray-400">ACCURACY</p>
                                                                <p className="text-[11px] font-bold text-gray-600">{selectedSubmission.checkIn.location.accuracy || 'N/A'}m</p>
                                                            </div>
                                                            <p className="mt-1 border-t border-gray-50 pt-1 font-mono text-[9px] italic text-gray-400">
                                                                {getFiniteNumberOrNull(selectedSubmission?.checkIn?.location?.lat)?.toFixed(4) || '0.0000'}, {getFiniteNumberOrNull(selectedSubmission?.checkIn?.location?.lng)?.toFixed(4) || '0.0000'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="py-4 text-center text-xs italic text-gray-400">Location data missing</p>
                                                    )}
                                                </div>

                                                <div className={`rounded-xl border-2 p-4 transition-all ${getGeoStatusClasses(selectedCheckOutLocation?.distanceFromCollege)}`}>
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Check-Out Stats</span>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getGeoBadgeClasses(selectedCheckOutLocation?.distanceFromCollege)}`}>
                                                            {typeof selectedCheckOutLocation?.distanceFromCollege === 'number'
                                                                ? selectedCheckOutLocation.distanceFromCollege <= 300 ? 'ON-SITE' : 'OFF-SITE'
                                                                : 'NO DATA'}
                                                        </span>
                                                    </div>
                                                    {selectedCheckOutLocation?.lat || selectedCheckOutLocation?.lng || typeof selectedCheckOutLocation?.distanceFromCollege === 'number' ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-end justify-between">
                                                                <p className="text-[10px] text-gray-400">DISTANCE</p>
                                                                <p className={`text-sm font-black ${
                                                                    typeof selectedCheckOutLocation.distanceFromCollege === 'number' &&
                                                                    selectedCheckOutLocation.distanceFromCollege <= 300
                                                                        ? 'text-gray-900'
                                                                        : 'text-red-600'
                                                                }`}>
                                                                    {typeof selectedCheckOutLocation.distanceFromCollege === 'number'
                                                                        ? `${Math.round(selectedCheckOutLocation.distanceFromCollege)} meters`
                                                                        : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-end justify-between">
                                                                <p className="text-[10px] text-gray-400">
                                                                    {selectedCheckOutLocation?.source === 'geo-tag-image' ? 'SOURCE' : 'ACCURACY'}
                                                                </p>
                                                                <p className="text-[11px] font-bold text-gray-600">
                                                                    {selectedCheckOutLocation?.source === 'geo-tag-image'
                                                                        ? 'Geo-tag image'
                                                                        : selectedCheckOutLocation?.accuracy
                                                                            ? `${selectedCheckOutLocation.accuracy}m`
                                                                            : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <p className="mt-1 border-t border-gray-50 pt-1 font-mono text-[9px] italic text-gray-400">
                                                                {selectedCheckOutLocation.lat?.toFixed(4) || '0.0000'}, {selectedCheckOutLocation.lng?.toFixed(4) || '0.0000'}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="py-4 text-center text-xs italic text-gray-400">Location data missing</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 md:col-span-2">
                                            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Attendance Summary</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                                    <p className="text-[10px] font-bold text-gray-400">TOTAL STUDENTS</p>
                                                    <p className="text-lg font-black text-indigo-600">{selectedMetrics.total}</p>
                                                </div>
                                                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                                    <p className="text-[10px] font-bold text-gray-400">PRESENT</p>
                                                    <p className="text-lg font-black text-green-600">{selectedMetrics.present}</p>
                                                </div>
                                                <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                                                    <p className="text-[10px] font-bold text-red-400">ABSENT</p>
                                                    <p className="text-lg font-black text-red-600">{selectedMetrics.absent}</p>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {selectedSubmission.attendancePdfUrl && (
                                            <a
                                                href={`${FILE_BASE_URL}/api/uploads/attendance/pdfs/${selectedSubmission.attendancePdfUrl.split(/[/\\]/).pop()}?token=${accessToken}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 transition-colors hover:bg-indigo-50"
                                            >
                                                <DocumentTextIcon className="mr-3 h-8 w-8 text-indigo-500" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Attendance PDF</p>
                                                    <p className="text-[10px] text-gray-500">View signed document</p>
                                                </div>
                                            </a>
                                        )}

                                        <a
                                            href={`${FILE_BASE_URL}/api/attendance/${selectedSubmission._id}/export-excel`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center rounded-2xl border border-green-100 bg-green-50/30 p-4 transition-colors hover:bg-green-50"
                                        >
                                            <DocumentTextIcon className="mr-3 h-8 w-8 text-green-500" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Attendance Excel</p>
                                                <p className="text-[10px] text-gray-500">Download student list</p>
                                            </div>
                                        </a>

                                        {selectedSubmission.studentsPhotoUrl && (
                                            <a
                                                href={`${FILE_BASE_URL}/api/uploads/attendance/photos/${selectedSubmission.studentsPhotoUrl.split(/[/\\]/).pop()}?token=${accessToken}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center rounded-2xl border border-blue-100 bg-blue-50/30 p-4 transition-colors hover:bg-blue-50 md:col-span-2"
                                            >
                                                <PhotoIcon className="mr-3 h-8 w-8 text-blue-500" />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Class Photo</p>
                                                    <p className="text-[10px] text-gray-500">View geo-tagged image</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>

                                    {(selectedSubmission.checkOutGeoImageUrls?.length > 0 || selectedSubmission.checkOutGeoImageUrl) && (
                                        <div className="mt-6 border-t border-gray-100 pt-4">
                                            <h4 className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Geo-Tagged Evidence</h4>
                                            <div className="grid grid-cols-3 gap-3">
                                                {(selectedSubmission.checkOutGeoImageUrls?.length > 0
                                                    ? selectedSubmission.checkOutGeoImageUrls
                                                    : [selectedSubmission.checkOutGeoImageUrl]
                                                ).map((url, index) => {
                                                    const fileName = url?.split(/[/\\]/).pop();
                                                    if (!fileName) return null;

                                                    const fileUrl = `${FILE_BASE_URL}/api/uploads/attendance/images/${fileName}?token=${accessToken}`;

                                                    return (
                                                        <div key={index} className="group relative h-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                                            <img loading="lazy"
                                                                src={fileUrl}
                                                                alt={`Geo evidence ${index + 1}`}
                                                                className="h-full w-full cursor-zoom-in object-cover transition-transform duration-500 group-hover:scale-110"
                                                                onClick={() => window.open(fileUrl, '_blank')}
                                                                onError={(event) => {
                                                                    if (!event.target.src.includes('/photos/')) {
                                                                        event.target.src = fileUrl.replace('/images/', '/photos/');
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {selectedSubmission.verificationStatus === 'pending' && (
                                        <div className="mt-8 space-y-4 border-t border-gray-100 pt-8">
                                            {formError && (
                                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                                    {formError}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-bold italic text-gray-700">
                                                        Approver Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="approver-name"
                                                        name="approver-name"
                                                        value={approverName}
                                                        onChange={(event) => setApproverName(event.target.value)}
                                                        className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Enter your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-bold italic text-gray-700">
                                                        Comment / Rejection Reason
                                                    </label>
                                                    <input
                                                        type="text"
                                                        id="verification-comment"
                                                        name="verification-comment"
                                                        value={verificationComment}
                                                        onChange={(event) => setVerificationComment(event.target.value)}
                                                        className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Notes or reason for rejection"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                                                <button
                                                    type="button"
                                                    disabled={verifying}
                                                    onClick={() => {
                                                        setPreferredAction('approved');
                                                        handleVerifySubmit('Approved');
                                                    }}
                                                    className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 ${
                                                        preferredAction === 'approved'
                                                            ? 'bg-green-700 shadow-lg shadow-green-100 ring-2 ring-green-200'
                                                            : 'bg-green-600 shadow-lg shadow-green-100 hover:bg-green-700'
                                                    }`}
                                                >
                                                    {verifying && preferredAction === 'approved' ? 'Processing...' : (
                                                        <>
                                                            <CheckCircleIcon className="mr-2 h-5 w-5" />
                                                            Approve Submission
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={verifying}
                                                    onClick={() => {
                                                        setPreferredAction('rejected');
                                                        handleVerifySubmit('Rejected');
                                                    }}
                                                    className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 ${
                                                        preferredAction === 'rejected'
                                                            ? 'bg-red-700 shadow-lg shadow-red-100 ring-2 ring-red-200'
                                                            : 'bg-red-600 shadow-lg shadow-red-100 hover:bg-red-700'
                                                    }`}
                                                >
                                                    {verifying && preferredAction === 'rejected' ? 'Processing...' : (
                                                        <>
                                                            <XCircleIcon className="mr-2 h-5 w-5" />
                                                            Reject Submission
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {selectedSubmission.verificationStatus !== 'pending' && (
                                        <div className="mt-8 border-t border-gray-100 pt-8">
                                            <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                                                <div className="flex items-center">
                                                    <PencilSquareIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                    <div className="text-[10px]">
                                                        <p className="font-bold uppercase tracking-tighter text-gray-400">Verified Result</p>
                                                        <p className="font-medium text-gray-900">
                                                            By {selectedSubmission.approvedBy || selectedSubmission.verifiedBy?.name || 'Admin'} on {formatDateTime(selectedSubmission.verifiedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={getStatusBadge(selectedSubmission.verificationStatus)}>
                                                    {selectedSubmission.verificationStatus.toUpperCase()}
                                                </span>
                                            </div>
                                            {selectedSubmission.verificationComment && (
                                                <div className="mt-3 rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-2 text-[10px] italic text-yellow-800">
                                                    "{selectedSubmission.verificationComment}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </ErrorBoundary>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </RenderProfiler>
    );
};

export default memo(AttendanceVerification);
