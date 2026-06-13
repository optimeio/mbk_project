"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  wide: "dashboard-modal-panel--wide sm:max-w-6xl",
};

/**
 * Viewport-safe modal shell for dashboard popups.
 * Centers content, caps max height/width, and scrolls internally.
 */
export default function DashboardModalShell({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = "md",
  panelClassName = "",
  showCloseButton = true,
}) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="dashboard-modal-backdrop fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
        </Transition.Child>

        <div className="dashboard-modal-scrollport fixed inset-0 z-10 overflow-y-auto">
          <div className="dashboard-modal-center flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "dashboard-modal-panel relative w-full transform rounded-2xl bg-white px-4 py-5 text-left shadow-2xl transition-all sm:px-6 sm:py-6",
                  SIZE_CLASS[size] || SIZE_CLASS.md,
                  panelClassName,
                )}
              >
                {(title || showCloseButton) && (
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="min-w-0 text-left">
                      {title ? (
                        <Dialog.Title className="text-lg font-semibold text-slate-900 sm:text-xl">
                          {title}
                        </Dialog.Title>
                      ) : null}
                      {description ? (
                        <Dialog.Description className="mt-1 text-sm text-slate-500">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                    {showCloseButton ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                  </div>
                )}

                <div className="min-w-0">{children}</div>

                {footer ? (
                  <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    {footer}
                  </div>
                ) : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
