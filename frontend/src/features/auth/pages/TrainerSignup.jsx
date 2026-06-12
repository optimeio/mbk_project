"use client";

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { signupTrainer } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import CTAButton from "@/components/common/CTAButton";

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

  const { setAuthUser } = useAuth(); // Get auth context

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Auto-append domain if missing (Login ID support)
      let submissionData = { ...formData };
      if (submissionData.email && !submissionData.email.includes("@")) {
        submissionData.email = `${submissionData.email}@mbkcarrierz.vids`;
      }

      const response = await signupTrainer(submissionData);

      if (response.success && response.accessToken) {
        // Auto-Login Logic
        localStorage.setItem("accessToken", response.accessToken);
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          setAuthUser(response.user);
        }

        // Direct specific redirection (No "Pending" check needed anymore)
        router.push("/trainer/dashboard");
      } else {
        // Fallback if no token (shouldn't happen with new backend)
        setSuccess(true);
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
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
                placeholder="Email address or Login ID"
                value={formData.email}
                onChange={handleChange}
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
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm transition-all"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
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
