"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import IDCardModal from "@/components/modals/IDCardModal";
import { api } from "@/services/api";
import { getDocumentImagePreviewCandidates } from "@/utils/imageUtils";

const getTrainerDisplayName = (trainer = {}) => {
  const firstName = String(trainer.firstName || trainer.userId?.firstName || "").trim();
  const lastName = String(trainer.lastName || trainer.userId?.lastName || "").trim();

  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ").trim();
  }

  return trainer.name || trainer.userId?.name || trainer.email || "Trainer";
};

const getTrainerCode = (trainer = {}) => trainer.trainerId || trainer.trainerCode || "N/A";

const getTrainerStatus = (trainer = {}) => {
  const raw = String(trainer.verificationStatus || trainer.status || "")
    .trim()
    .toLowerCase();

  if (["approved", "verified", "active"].includes(raw)) {
    return {
      label: "Present",
      icon: CheckCircleIcon,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Pending",
    icon: ClockIcon,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
};

const getTrainerCity = (trainer = {}) => trainer.city || trainer.userId?.city || "N/A";

const getTrainerPhone = (trainer = {}) =>
  trainer.mobile || trainer.phone || trainer.userId?.phoneNumber || "N/A";

const getTrainerEmail = (trainer = {}) => trainer.userId?.email || trainer.email || "N/A";

const getTrainerCompletedDays = (trainer = {}) =>
  Number(trainer.completedDaysCount || trainer.attendanceStats?.present || 0);

const getTrainerPendingDays = (trainer = {}) =>
  Number(trainer.pendingDaysCount || 0);

const getSelfieCandidates = (trainer = {}) => {
  const sources = [
    trainer.documentProgress?.selfiePhoto || null,
    trainer.documents?.selfiePhoto || null,
    trainer.photo || null,
    trainer.profilePicture || null,
    trainer.documentProgress?.passportPhoto || null,
    trainer.documents?.passportPhoto || null,
    trainer.userId?.profilePicture || null,
  ].filter(Boolean);

  return Array.from(
    new Set(sources.flatMap((source) => getDocumentImagePreviewCandidates(source))),
  );
};

export default function TrainerProfileModal({ isOpen, onClose, trainer }) {
  const [imageIndexByTrainer, setImageIndexByTrainer] = useState({});
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [attendanceDays, setAttendanceDays] = useState(null);
  const trainerImageKey = `${trainer?._id || trainer?.id || "trainer"}-${isOpen ? "open" : "closed"}`;
  const trainerRecordId =
    trainer?.attendanceTrainerId || trainer?._id || trainer?.id || null;

  const imageCandidates = useMemo(() => getSelfieCandidates(trainer || {}), [trainer]);
  const trainerStatus = useMemo(() => getTrainerStatus(trainer || {}), [trainer]);
  const StatusIcon = trainerStatus.icon;

  const imageIndex = imageIndexByTrainer[trainerImageKey] || 0;
  const activeImage = imageCandidates[imageIndex] || null;
  const fallbackCompletedDays = getTrainerCompletedDays(trainer || {});
  const fallbackPendingDays = getTrainerPendingDays(trainer || {});

  useEffect(() => {
    if (!isOpen || !trainerRecordId) {
      return;
    }

    let isDisposed = false;

    const loadAttendanceDays = async () => {
      try {
        const trainerId = encodeURIComponent(String(trainerRecordId));
        const [attendanceResponse, trainerAttendanceResponse] =
          await Promise.allSettled([
            api.get(`/attendance/trainer/${trainerId}?t=${Date.now()}`),
            api.get(`/trainer-attendance/${trainerId}?t=${Date.now()}`),
          ]);

        const records =
          attendanceResponse.status === "fulfilled" &&
          Array.isArray(attendanceResponse.value?.data)
            ? attendanceResponse.value.data
            : [];
        let completed = 0;
        let pending = 0;

        records.forEach((record) => {
          const verificationStatus = String(record?.verificationStatus || "").toLowerCase();
          const status = String(record?.status || "").trim();
          const attendanceStatus = String(record?.attendanceStatus || "").toUpperCase();
          const hasCompletedAt = Boolean(record?.completedAt);

          const isCompletedDay =
            hasCompletedAt ||
            (verificationStatus === "approved" &&
              (attendanceStatus === "PRESENT" || status === "Present"));

          if (isCompletedDay) {
            completed += 1;
          }

          const isPendingDay =
            verificationStatus === "pending" || status === "Pending";

          if (isPendingDay) {
            pending += 1;
          }
        });

        // Fallback: some setups use TrainerAttendance collection only.
        if (!records.length && trainerAttendanceResponse.status === "fulfilled") {
          const trainerAttendanceRecords = Array.isArray(
            trainerAttendanceResponse.value?.attendance,
          )
            ? trainerAttendanceResponse.value.attendance
            : [];

          trainerAttendanceRecords.forEach((record) => {
            const status = String(record?.status || "").trim().toLowerCase();
            if (status === "present") {
              completed += 1;
            } else {
              pending += 1;
            }
          });
        }

        if (!isDisposed) {
          setAttendanceDays({
            trainerId: String(trainerRecordId),
            completed,
            pending,
          });
        }
      } catch (error) {
        console.error("Failed to load trainer attendance stats:", error);
      }
    };

    loadAttendanceDays();

    return () => {
      isDisposed = true;
    };
  }, [isOpen, trainerRecordId]);

  const completedDays =
    attendanceDays?.trainerId === String(trainerRecordId)
      ? attendanceDays.completed
      : fallbackCompletedDays;
  const pendingDays =
    attendanceDays?.trainerId === String(trainerRecordId)
      ? attendanceDays.pending
      : fallbackPendingDays;

  const handleCloseModal = () => {
    setIsIdCardOpen(false);
    onClose();
  };

  if (!trainer) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCloseModal}>
        <IDCardModal
          isOpen={isIdCardOpen}
          onClose={() => setIsIdCardOpen(false)}
          user={trainer}
        />
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl border border-gray-100 bg-white text-left shadow-2xl transition-all">
                <div className="absolute right-0 top-0 pr-6 pt-6">
                  <button
                    type="button"
                    className="rounded-full bg-white p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    onClick={handleCloseModal}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="px-6 py-8 sm:px-10">
                  <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                      Trainer Details
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-gray-900">
                      {getTrainerDisplayName(trainer)}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsIdCardOpen(true)}
                      className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <IdentificationIcon className="mr-2 h-4 w-4" />
                      View ID Card
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-start">
                    <div className="mx-auto h-56 w-56 overflow-hidden rounded-[2.75rem] border-4 border-indigo-100 bg-gray-100 shadow-md md:mx-0">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt="Trainer selfie"
                          className="h-full w-full object-cover"
                          onError={() => {
                            setImageIndexByTrainer((previous) => {
                              const current = previous[trainerImageKey] || 0;
                              const next =
                                current < imageCandidates.length - 1
                                  ? current + 1
                                  : imageCandidates.length;
                              return { ...previous, [trainerImageKey]: next };
                            });
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-5xl font-black uppercase text-indigo-600">
                          {getTrainerDisplayName(trainer).charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Trainer ID
                          </p>
                          <p className="mt-1 flex items-center text-sm font-bold text-slate-700">
                            <IdentificationIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {getTrainerCode(trainer)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Current Status
                          </p>
                          <p
                            className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${trainerStatus.className}`}
                          >
                            <StatusIcon className="mr-1.5 h-4 w-4" />
                            {trainerStatus.label}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            Email
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <EnvelopeIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {getTrainerEmail(trainer)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            Phone
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <PhoneIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {getTrainerPhone(trainer)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            City
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <MapPinIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {getTrainerCity(trainer)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            Role
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <UserIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {trainer.userId?.role || trainer.role || "Trainer"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            Completed Days
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <CalendarDaysIcon className="mr-2 h-4 w-4 text-indigo-500" />
                            {completedDays}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                            Pending Days
                          </p>
                          <p className="mt-1 flex items-center text-sm font-semibold text-gray-700">
                            <ClockIcon className="mr-2 h-4 w-4 text-amber-500" />
                            {pendingDays}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
