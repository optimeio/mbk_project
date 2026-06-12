"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const SystemAccountModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentUserRole,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Support",
    status: "Active",
    password: "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        role: initialData.role || "Support",
        status: initialData.status || "Active",
        password: "",
        emailVerified: initialData.emailVerified || false,
        otpEnabled: initialData.otpEnabled || false,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: currentUserRole === "SuperAdmin" ? "SPOCAdmin" : "Trainer",
        status: "Active",
        password: "",
        emailVerified: true,
        otpEnabled: false,
      });
    }
  }, [initialData, isOpen, currentUserRole]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Email validation and auto-append logic
    let submissionData = { ...formData };
    const emailRegex = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;

    if (submissionData.email) {
      // If email doesn't contain @, auto-append domain
      if (!submissionData.email.includes("@")) {
        submissionData.email = `${submissionData.email}@mbkcarrierz.com`;
      } else {
        // If it contains @, validate it's a proper email format
        if (!emailRegex.test(submissionData.email)) {
          alert("Please enter a valid email address (e.g., user@example.com)");
          return;
        }
      }
    }

    onSave(submissionData);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white px-6 pt-6 pb-6 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="absolute top-0 right-0 pt-5 pr-5">
                  <button
                    type="button"
                    className="rounded-lg bg-gray-50 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none transition-all"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="w-full">
                  <div className="mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-bold text-gray-900"
                    >
                      {initialData ? "Update Account" : "Create New Account"}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                      {initialData
                        ? `Modifying credentials for ${initialData.name}`
                        : "Setup system access for a new member"}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="group">
                        <label
                          htmlFor="name"
                          className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm"
                          placeholder="e.g. John Doe"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1"
                        >
                          Email / Username
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="user@example.com or userid"
                          className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm"
                          required
                        />
                        <p className="mt-1.5 text-[11px] text-gray-400 italic ml-1">
                          * Enter full email (e.g., user@example.com) or
                          username (auto-appends @mbkcarrierz.com)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="role"
                            className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1"
                          >
                            Account Role
                          </label>
                          <select
                            name="role"
                            id="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm appearance-none"
                          >
                            {currentUserRole === "SuperAdmin" && (
                              <>
                                <option value="SuperAdmin">Super Admin</option>
                                <option value="SPOCAdmin">SPOC</option>
                                <option value="Trainer">Trainer</option>
                                <option value="Accountant">Accountant</option>
                                <option value="Accountnt">Accountant (Legacy)</option>
                                <option value="Company">Company</option>
                              </>
                            )}
                            {(currentUserRole === "SPOCAdmin" ||
                              currentUserRole === "CollegeAdmin") && (
                              <option value="Trainer">Trainer</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="status"
                            className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1"
                          >
                            Initial Status
                          </label>
                          <select
                            name="status"
                            id="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm appearance-none"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Locked</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="password"
                          className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1"
                        >
                          {initialData ? "Reset Password" : "Security Password"}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            id="password"
                            value={formData.password || ""}
                            onChange={handleChange}
                            className="block w-full rounded-xl border-gray-100 bg-gray-50/50 py-2.5 px-4 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all sm:text-sm pr-12"
                            placeholder={
                              initialData ? "••••••••" : "Setup password"
                            }
                            required={!initialData}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-blue-500 transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                              <EyeIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        {initialData && (
                          <p className="mt-1.5 text-[11px] text-gray-400 italic ml-1">
                            * Keep blank to preserve existing password
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 rounded-2xl p-4 space-y-3">
                      <div className="relative flex items-center">
                        <div className="flex h-6 items-center">
                          <input
                            id="emailVerified"
                            name="emailVerified"
                            type="checkbox"
                            checked={formData.emailVerified}
                            onChange={handleChange}
                            className="h-5 w-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </div>
                        <div className="ml-3">
                          <label
                            htmlFor="emailVerified"
                            className="text-sm font-bold text-gray-700 cursor-pointer"
                          >
                            Email Verified
                          </label>
                          <p className="text-[11px] text-gray-400 leading-none mt-0.5">
                            Skip initial verification process
                          </p>
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <div className="flex h-6 items-center">
                          <input
                            id="otpEnabled"
                            name="otpEnabled"
                            type="checkbox"
                            checked={formData.otpEnabled}
                            onChange={handleChange}
                            className="h-5 w-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </div>
                        <div className="ml-3">
                          <label
                            htmlFor="otpEnabled"
                            className="text-sm font-bold text-gray-700 cursor-pointer"
                          >
                            Enforce 2FA/OTP
                          </label>
                          <p className="text-[11px] text-gray-400 leading-none mt-0.5">
                            Require additional security for login
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                      >
                        {initialData ? "Update Profile" : "Confirm & Create"}
                      </button>
                      <button
                        type="button"
                        className="flex-1 bg-white text-gray-600 border border-gray-200 rounded-xl py-3 text-sm font-bold hover:bg-gray-50 transition-all"
                        onClick={onClose}
                      >
                        Discard
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default SystemAccountModal;
