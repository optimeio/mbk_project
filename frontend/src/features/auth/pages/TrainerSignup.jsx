"use client";

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { signupTrainer } from "@/services/authService";
import CTAButton from "@/components/common/CTAButton";
import PasswordInputWithToggle from "@/components/common/PasswordInputWithToggle";
import notify from "@/lib/toast";
import {
  sanitizePhoneInput,
  validateTrainerSignup,
  PASSWORD_MIN_LENGTH,
} from "@/utils/authValidation";

const TrainerSignup = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "phoneNumber" ? sanitizePhoneInput(value) : value;
    setFormData({ ...formData, [name]: nextValue });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateTrainerSignup(formData);
    if (validationError) {
      setError(validationError);
      notify.warning(validationError);
      return;
    }

    setLoading(true);

    try {
      // Auto-append domain if missing (Login ID support)
      let submissionData = { ...formData };
      if (submissionData.email && !submissionData.email.includes("@")) {
        submissionData.email = `${submissionData.email}@mbkcarrierz.vids`;
      }

      const response = await signupTrainer(submissionData);

      if (response.success) {
        setSuccess(true);
        notify.success(
          response.message ||
            "Registration submitted. Sign in after admin approval.",
        );
        router.replace("/login?type=trainer&reason=registration_complete");
      } else {
        setError(response.message || "Registration failed");
        notify.warning(response.message || "Registration failed");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center bg-white p-8 rounded-3xl shadow-xl border border-orange-100">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Registration Successful
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your account has been created and is waiting for Admin Approval.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Please check back later or contact support.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="text-orange-600 hover:text-orange-500 font-medium"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50/40 via-amber-50/20 to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-orange-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Trainer Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              sign in to your account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl relative text-sm font-medium">
              {error}
            </div>
          )}
          <div className="rounded-xl shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all"
                placeholder="Full Name *"
                value={formData.name}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                autoComplete="name"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address or Login ID
              </label>
              <input
                id="email"
                name="email"
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all"
                placeholder="Email address or Login ID *"
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="sr-only">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all"
                placeholder="Phone Number (10 digits) *"
                value={formData.phoneNumber}
                onChange={handleChange}
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                autoComplete="tel"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <PasswordInputWithToggle
                id="password"
                name="password"
                required
                className="appearance-none rounded-xl relative block w-full pl-4 pr-11 py-3 border border-gray-300 placeholder-gray-400 text-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all"
                placeholder={`Password (min ${PASSWORD_MIN_LENGTH} chars) *`}
                value={formData.password}
                onChange={handleChange}
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                disabled={loading}
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>

          <CTAButton
            type="submit"
            variant="brand"
            size="lg"
            fullWidth
            loading={loading}
            loadingText="Registering..."
            className="rounded-xl"
          >
            Register
          </CTAButton>
        </form>
      </div>
    </div>
  );
};

export default TrainerSignup;
