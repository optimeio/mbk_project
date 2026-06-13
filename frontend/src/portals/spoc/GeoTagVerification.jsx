"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPinIcon } from "@heroicons/react/24/outline";

import useDebouncedValue from "@/hooks/useDebouncedValue";
import {
  GEO_VERIFICATION_QUERY_KEY,
  getGeoVerificationSubmissionsQueryOptions,
  useGeoVerificationSubmissions,
} from "@/modules/attendance";
import GeoVerificationCard from "@/portals/spoc/geoVerification/GeoVerificationCard";
import GeoVerificationPageSkeleton from "@/portals/spoc/geoVerification/GeoVerificationSkeleton";
import { STATUS_TABS } from "@/portals/spoc/geoVerification/utils";
import notify from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import RenderProfiler from "@/shared/perf/RenderProfiler";

const GEO_PAGE_LIMIT = 20;
const INITIAL_VISIBLE_GEO_CARDS = 6;
const VISIBLE_GEO_CARD_BATCH = 6;
const NEXT_STATUS_PREFETCH_MAP = Object.freeze({
  pending: "manual_review",
  manual_review: "completed",
  completed: "all",
  all: "pending",
});

const GeoTagVerification = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [visibleCardCount, setVisibleCardCount] = useState(INITIAL_VISIBLE_GEO_CARDS);
  const [accessToken] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem("accessToken") || "",
  );
  const [isFiltering, startFilteringTransition] = useTransition();
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 300);

  const {
    error,
    isLoading,
    isFetching,
    submissions,
    pagination,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useGeoVerificationSubmissions({
    filterStatus,
    search: debouncedSearchQuery,
    pageLimit: GEO_PAGE_LIMIT,
  });
  const visibleSubmissions = useMemo(
    () => submissions.slice(0, visibleCardCount),
    [submissions, visibleCardCount],
  );
  const handleGeoActionComplete = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: GEO_VERIFICATION_QUERY_KEY,
    });
  }, [queryClient]);
  const hiddenLoadedCount = Math.max(0, submissions.length - visibleSubmissions.length);

  useEffect(() => {
    setVisibleCardCount(INITIAL_VISIBLE_GEO_CARDS);
  }, [debouncedSearchQuery, filterStatus]);

  useEffect(() => {
    const nextFilterStatus = NEXT_STATUS_PREFETCH_MAP[filterStatus];
    if (!nextFilterStatus) {
      return;
    }
    if (debouncedSearchQuery) {
      // Avoid chatty prefetch while user is actively searching.
      return;
    }
    if (isLoading || isFetchingNextPage || submissions.length === 0) {
      return;
    }

    void queryClient.prefetchInfiniteQuery(
      getGeoVerificationSubmissionsQueryOptions({
        filterStatus: nextFilterStatus,
        search: debouncedSearchQuery,
        pageLimit: GEO_PAGE_LIMIT,
      }),
    );
  }, [
    debouncedSearchQuery,
    filterStatus,
    isFetchingNextPage,
    isLoading,
    queryClient,
    submissions.length,
  ]);

  const handleSearchChange = useCallback((event) => {
    const nextValue = event.target.value;
    startFilteringTransition(() => {
      setSearchQuery(nextValue);
    });
  }, []);

  const handleFilterChange = useCallback((nextFilter) => {
    startFilteringTransition(() => {
      setFilterStatus(nextFilter);
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleShowMoreLoaded = useCallback(() => {
    setVisibleCardCount((currentCount) => currentCount + VISIBLE_GEO_CARD_BATCH);
  }, []);

  const handleDownload = useCallback(async (url, name) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error("Download failed:", downloadError);
      notify.error("Failed to download the file.");
    }
  }, []);

  const closeSelectedImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  return (
    <RenderProfiler id="SpocGeoTagVerification">
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Check-Out Status</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Trainers must upload geo-tag evidence. The system validates EXIF date and geo radius, then marks each check-out as auto verified or manual review required.
            </p>
          </div>
          <Badge className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700">
            SPOC and Admin can review verification outcomes and manual-review reasons.
          </Badge>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-2xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search by trainer, college, or course..."
                className="h-11 rounded-2xl border-gray-200 py-3 pl-12 pr-4 text-sm text-gray-700 shadow-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => handleFilterChange(tab.key)}
                  size="sm"
                  variant={filterStatus === tab.key ? "default" : "outline"}
                  className={`rounded-full px-4 ${
                    filterStatus === tab.key
                      ? "bg-indigo-600 text-white hover:bg-indigo-600/90"
                      : "text-gray-600"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <p>
              Showing {submissions.length} of {pagination.total} matching records
            </p>
            {isFiltering || isFetching ? (
              <span className="inline-flex items-center gap-2 font-medium text-indigo-600">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Updating results...
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error.message || "Failed to load check-out submissions."}
          </div>
        ) : null}

        {isLoading ? (
          <GeoVerificationPageSkeleton />
        ) : submissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white py-20 text-center shadow-sm">
            <MapPinIcon className="mx-auto h-14 w-14 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No check-out records found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search term or switch the status filter.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6">
              {visibleSubmissions.map((submission) => (
                <GeoVerificationCard
                  key={submission._id}
                  submission={submission}
                  accessToken={accessToken}
                  onSelectImage={setSelectedImage}
                  onDownload={handleDownload}
                  onActionComplete={handleGeoActionComplete}
                />
              ))}
            </div>

            {(hiddenLoadedCount > 0 || hasNextPage) ? (
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                {hiddenLoadedCount > 0 ? (
                  <Button
                    type="button"
                    onClick={handleShowMoreLoaded}
                    variant="outline"
                    className="rounded-full border-indigo-200 px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    Show {Math.min(hiddenLoadedCount, VISIBLE_GEO_CARD_BATCH)} more loaded records
                  </Button>
                ) : null}
                {hasNextPage ? (
                  <Button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="rounded-full border-indigo-200 px-5 py-2.5 text-sm font-semibold text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {isFetchingNextPage ? "Loading more..." : "Load more records"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={Boolean(selectedImage)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeSelectedImage();
          }
        }}
      >
        <DialogContent
          hideCloseButton
          className="dashboard-modal-panel--wide max-h-[min(90dvh,calc(100dvh-2rem))] max-w-6xl overflow-y-auto border-none bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">Geo evidence preview</DialogTitle>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt="Selected evidence"
              className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
    </RenderProfiler>
  );
};

export default GeoTagVerification;
