"use client";

import { Skeleton } from "@/components/ui/skeleton";

const GeoVerificationCardSkeleton = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4">
            <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-xl bg-indigo-100/80" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-40 rounded-full" />
                    <Skeleton className="h-4 w-36 rounded-full bg-slate-100/90" />
                    <Skeleton className="h-4 w-52 rounded-full bg-slate-100/90" />
                </div>
            </div>
        </div>
        <div className="space-y-4 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                        key={`metric-${index}`}
                        className="h-20 rounded-xl border border-gray-100 bg-gray-50/90"
                    />
                ))}
            </div>
            <Skeleton className="h-44 rounded-xl bg-slate-100/90" />
            <Skeleton className="h-28 rounded-xl bg-slate-50/95" />
        </div>
    </div>
);

export default function GeoVerificationPageSkeleton() {
    return (
        <div className="grid gap-6 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
                <GeoVerificationCardSkeleton key={`geo-skeleton-${index}`} />
            ))}
        </div>
    );
}
