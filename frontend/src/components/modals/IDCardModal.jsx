"use client";

import { Fragment, useRef, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  PrinterIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import TrainerIDCard from "@/components/common/TrainerIDCard";
import { canGenerateTrainerIdCard } from "@/utils/trainerIdCard";
import { downloadIDCard, renderIDCardCanvas } from "@/utils/downloadIDCard";

const IDCardModal = ({ isOpen, onClose, user = {} }) => {
  const cardRef = useRef(null);
  const [processingAction, setProcessingAction] = useState("");

  const canGenerateIdCard = canGenerateTrainerIdCard(user);

  const handleDownload = async () => {
    try {
      setProcessingAction("download");
      const trainerName = String(user?.name || user?.trainerId || "trainer")
        .trim()
        .replace(/\s+/g, "_");
      await downloadIDCard(cardRef.current, `${trainerName}_id_card.png`);
    } catch (error) {
      console.error("Failed to download ID card:", error);
    } finally {
      setProcessingAction("");
    }
  };

  const handlePrint = async () => {
    try {
      setProcessingAction("print");
      const canvas = await renderIDCardCanvas(cardRef.current);
      if (!canvas) {
        return;
      }

      const image = canvas.toDataURL("image/png");
      const printWindow = window.open(
        "",
        "_blank",
        "width=980,height=1400,noopener,noreferrer",
      );

      if (!printWindow) {
        return;
      }

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Trainer ID Card</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #ffffff;
              }
              img {
                width: min(92vw, 440px);
                height: auto;
                display: block;
              }
              @media print {
                body {
                  margin: 0;
                  background: #ffffff;
                }
                img {
                  width: 88mm;
                }
              }
            </style>
          </head>
          <body>
            <img loading="lazy" src="${image}" alt="Trainer ID Card" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
    } catch (error) {
      console.error("Failed to print ID card:", error);
    } finally {
      setProcessingAction("");
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[120]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm" />
        </TransitionChild>

        <div className="dashboard-modal-scrollport fixed inset-0 overflow-y-auto">
          <div className="dashboard-modal-center flex min-h-full items-center justify-center p-4 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="dashboard-modal-panel w-full max-w-[470px]">
                <div className="flex justify-end pb-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {canGenerateIdCard ? (
                  <>
                    <TrainerIDCard ref={cardRef} trainer={user} />

                    <div className="mx-auto mt-6 grid max-w-[430px] grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={processingAction !== ""}
                        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#2f3d9c] shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_45px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                        {processingAction === "download" ? "Downloading" : "Download ID"}
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={processingAction !== ""}
                        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[#1d6245] shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_45px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <PrinterIcon className="mr-2 h-4 w-4" />
                        {processingAction === "print" ? "Printing" : "Print ID"}
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={processingAction !== ""}
                        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[32px] border border-white/20 bg-white px-8 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.2)]">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <ShieldExclamationIcon className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black uppercase tracking-[0.12em] text-slate-900">
                      ID Card Locked
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                      Your trainer ID card will be available only after admin approval.
                      Once approved, you can view, download, and print it here.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default IDCardModal;
