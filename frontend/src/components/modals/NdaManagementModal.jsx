"use client";
import { Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname, useSearchParams } from 'next/navigation';

import NdaManagement from '@/portals/admin/NdaManagement';

const NdaManagementModal = ({ isOpen, onClose }) => {
    const pathname = usePathname();
    const openedPathRef = useRef(pathname);

    useEffect(() => {
        if (isOpen) {
            openedPathRef.current = pathname;
        }
    }, [isOpen, pathname]);

    useEffect(() => {
        if (isOpen && pathname !== openedPathRef.current) {
            onClose();
        }
    }, [isOpen, pathname, onClose]);

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]" />
                </Transition.Child>

                <div className="dashboard-modal-scrollport fixed inset-0 overflow-y-auto">
                    <div className="dashboard-modal-center flex min-h-full items-center justify-center p-4 sm:p-6">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="dashboard-modal-panel dashboard-modal-panel--wide relative w-full max-w-7xl rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-black/5">
                                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                                    <div>
                                        <Dialog.Title className="font-calibri text-lg font-bold uppercase tracking-wider text-slate-900">
                                            NDA Management
                                        </Dialog.Title>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Edit the NDA content used on the trainer agreement screen.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <span className="sr-only">Close NDA management</span>
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="max-h-[85vh] overflow-y-auto py-2">
                                    <NdaManagement compact />
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default NdaManagementModal;
