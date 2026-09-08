"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownTrayIcon, CalendarIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { notify } from '@/lib/toast';
import { api } from '@/services/api';
import MobileTrainerLayout from '@/app/layouts/MobileTrainerLayout';

const TrainerPaySlips = () => {
    const [selectedMonth, setSelectedMonth] = useState('');

    const { data, isPending } = useQuery({
        queryKey: ['trainer-payslips', selectedMonth],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedMonth) {
                const [year, month] = selectedMonth.split('-');
                params.set('month', month);
                params.set('year', year);
            }
            return api.get(`/salaries/my-payslips${params.toString() ? `?${params}` : ''}`);
        },
        staleTime: 60_000,
    });

    const paySlips = data?.payslips ?? data ?? [];

    const [downloading, setDownloading] = useState(null);

    const handleDownloadPaySlip = async (slip) => {
        const id = slip._id || slip.id;
        setDownloading(id);
        try {
            const blob = await api.get(`/salaries/payslips/${id}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip_${slip.month}_${slip.year}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(`/api/salaries/payslips/${id}/pdf`, '_blank');
        } finally {
            setDownloading(null);
        }
    };

    const uniqueMonths = paySlips.reduce((acc, slip) => {
        const key = `${slip.year}-${String(slip.month).padStart(2, '0')}`;
        if (!acc.includes(key)) acc.push(key);
        return acc;
    }, []).sort().reverse();

    const filteredPaySlips = selectedMonth
        ? paySlips.filter((slip) => {
            const key = `${slip.year}-${String(slip.month).padStart(2, '0')}`;
            return key === selectedMonth;
        })
        : paySlips;

    return (
        <MobileTrainerLayout>
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pay Slips</h1>
                <p className="text-sm text-gray-500 mt-1">View and download your monthly salary slips</p>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <label htmlFor="pay-slips-month" className="sr-only">
                    Filter by month
                </label>
                <select
                    id="pay-slips-month"
                    name="paySlipsMonth"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-3 text-base"
                >
                    <option value="">All Months</option>
                    {uniqueMonths.map((key) => {
                        const [y, m] = key.split('-');
                        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
                            month: 'long',
                            year: 'numeric',
                        });
                        return (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Pay Slips List */}
            <div className="space-y-4">
                {isPending ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
                            <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                        </div>
                    ))
                ) : filteredPaySlips.length > 0 ? (
                    filteredPaySlips.map((slip) => {
                        const id = slip._id || slip.id;
                        const isDownloading = downloading === id;
                        return (
                            <div key={id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 sm:p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {new Date(Number(slip.year), Number(slip.month) - 1, 1).toLocaleDateString('en-IN', {
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            slip.status === 'paid' || slip.status === 'sent'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {slip.status ? slip.status.charAt(0).toUpperCase() + slip.status.slice(1) : 'Pending'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 text-xs">Period</p>
                                            <div className="flex items-center font-medium mt-0.5">
                                                <CalendarIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                                {slip.month}/{slip.year}
                                            </div>
                                        </div>
                                        {slip.workingDays !== undefined && (
                                            <div>
                                                <p className="text-gray-500 text-xs">Attendance</p>
                                                <p className="font-medium mt-0.5">
                                                    {slip.workingDays}/{slip.totalDays ?? '—'} Days
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-sm mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Basic</p>
                                            <p className="font-semibold text-gray-900">
                                                ₹{Number(slip.basicSalary || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="border-l border-gray-200">
                                            <p className="text-xs text-gray-500 mb-1">Extras</p>
                                            <p className="font-semibold text-green-600">
                                                +₹{Number(slip.allowances || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="border-l border-gray-200">
                                            <p className="text-xs text-gray-500 mb-1">Deductions</p>
                                            <p className="font-semibold text-red-600">
                                                -₹{Number(slip.deductions || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500">Net Salary</p>
                                            <p className="text-xl font-bold text-indigo-700">
                                                ₹{Number(slip.netSalary || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadPaySlip(slip)}
                                            disabled={isDownloading}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-sm font-medium"
                                            title="Download PDF"
                                        >
                                            <ArrowDownTrayIcon className={`h-4 w-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                                            {isDownloading ? 'Downloading…' : 'Download'}
                                        </button>
                                    </div>
                                    {(slip.status === 'paid' || slip.status === 'sent') && slip.paidOn && (
                                        <p className="text-xs text-gray-400 mt-2 text-right">
                                            Paid on {new Date(slip.paidOn).toLocaleDateString('en-IN')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <CurrencyRupeeIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No pay slips found</h3>
                        <p className="mt-1 text-sm text-gray-500">Slips will appear here once generated by the accountant.</p>
                    </div>
                )}
            </div>
        </MobileTrainerLayout>
    );
};

export default TrainerPaySlips;
