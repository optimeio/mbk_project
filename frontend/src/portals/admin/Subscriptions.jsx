"use client";

import { useState } from 'react';

const Subscriptions = () => {
    const [subscriptions] = useState([
        { id: 1, company: 'Tech Solutions Ltd', plan: 'Enterprise', status: 'Active', startDate: '2023-01-01', renewalDate: '2024-01-01', amount: '₹50,000' },
        { id: 2, company: 'Innovate Corp', plan: 'Standard', status: 'Active', startDate: '2023-06-15', renewalDate: '2024-06-15', amount: '₹25,000' },
        { id: 3, company: 'EduTech Systems', plan: 'Basic', status: 'Expired', startDate: '2022-09-01', renewalDate: '2023-09-01', amount: '₹10,000' },
    ]);

    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Subscriptions</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage company subscriptions and billing details.
                    </p>
                </div>
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Company Name
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Plan
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Status
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Start Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Renewal Date
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {subscriptions.map((sub) => (
                                        <tr key={sub.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                {sub.company}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{sub.plan}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${sub.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{sub.startDate}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{sub.renewalDate}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{sub.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
