"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  XMarkIcon,
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from "@/context/AuthContext";
import authService from "@/services/authService";
import {
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from "@/services/api";
import CTAButton from "@/components/common/CTAButton";
import "@/features/auth/components/login.css";
import { getDashboardRouteByRole } from "@/utils/authRoles";
import { prefetchPortalRoutes } from "@/utils/portalPrefetch";
import { warmPortalDataBundle } from "@/utils/portalDataPrefetch";
import notify from "@/lib/toast";

const LoginModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { login, currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const navigateAfterLogin = async (route, role, email) => {
    prefetchPortalRoutes(router, role, email);
    try {
      await warmPortalDataBundle();
    } catch (error) {
      console.warn("Portal data warmup failed before navigation:", error);
    }
    router.replace(route);
  };

  // Login State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);



  // Password Reset State
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOTP, setResetOTP] = useState("");

  const [tempToken, setTempToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Password Visibility & Strength
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculateStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    if (password.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setNewPassword(pass);
    setPasswordStrength(calculateStrength(pass));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  useEffect(() => {
    if (!isOpen || authLoading || !currentUser || !isAuthenticated) return;
    if (!authService.getToken()) return;
    void navigateAfterLogin(
      getDashboardRouteByRole(currentUser.role, currentUser.email),
      currentUser.role,
      currentUser.email,
    );
  }, [isOpen, authLoading, currentUser, isAuthenticated, router]);

  if (!isOpen) return null;

  // Password Reset Handlers
  const handleForgotPasswordClick = () => {
    setIsFlipped(true);
    setResetStep(1);
    setResetEmail("");
    setResetOTP("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess("");
  };

  const handleBackToLogin = () => {
    setIsFlipped(false);
    setResetStep(1);
    setResetError("");
    setResetSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loginEmail = formData.email.trim().toLowerCase();
      const userData = await login(loginEmail, formData.password);
      await notify.successAndNavigate("Login successful", async () => {
        onClose();
        await navigateAfterLogin(
          getDashboardRouteByRole(userData.role, userData.email),
          userData.role,
          userData.email,
        );
      });
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      const normalizedEmail = String(resetEmail || "").trim().toLowerCase();
      const response = await forgotPassword(
        normalizedEmail,
      );
      setResetSuccess(response.message || "OTP sent to your email!");
      setResetStep(2);
    } catch (err) {
      setResetError(err.message || "Failed to send OTP");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    try {
      const normalizedEmail = String(resetEmail || "").trim().toLowerCase();
      const normalizedOtp = String(resetOTP || "").replace(/\D/g, "").slice(0, 6);
      const response = await verifyResetOTP(normalizedEmail, normalizedOtp);
      setTempToken(response.tempToken);
      setResetSuccess("OTP verified! Set your new password.");
      setResetStep(3);
    } catch (err) {
      setResetError(err.message || "Invalid or expired OTP");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      return;
    }

    setResetLoading(true);

    try {
      const response = await resetPassword(tempToken, newPassword);
      setResetSuccess(response.message || "Password reset successfully!");

      setTimeout(() => {
        handleBackToLogin();
      }, 2000);
    } catch (err) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <div className="login-modal-container">
        <button
          className="login-modal-close"
          onClick={onClose}
          aria-label="Close Modal"
        >
          <XMarkIcon style={{ width: "24px", height: "24px" }} />
        </button>

        <div className="login-left-panel">
          <Image
            src="/logos/mbkz-256.png"
            alt="MBK CarrierZ Logo"
            className="login-brand-logo"
            width={120}
            height={40}
            loading="lazy"
            sizes="120px"
          />
          <h2 className="login-welcome-title">Login to MBK CarrierZ</h2>
          <p className="login-welcome-subtitle">Student • Trainer </p>
        </div>

        <div className="login-right-panel">
          <div className="login-flip-wrapper">
            <div className={`login-flipper ${isFlipped ? "flipped" : ""}`}>
              {/* FRONT FACE: LOGIN */}
              <div className="login-face login-front">
                {error && (
                  <div className="login-alert login-alert-error" role="alert">
                    {error}
                  </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                  <div className="login-input-group">
                    <label htmlFor="email" className="login-input-label">
                        Email Address
                    </label>
                    <div className="login-input-wrapper">
                      <UserIcon className="login-input-icon" />
                      <input
                          id="email"
                          type="email"
                          name="email"
                          autoComplete="email"
                        className="login-input"
                          placeholder="Enter your email"
                          value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label htmlFor="password" className="login-input-label">
                      Password
                    </label>
                    <div
                      className="login-input-wrapper"
                      style={{ position: "relative" }}
                    >
                      <LockClosedIcon className="login-input-icon" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        className="login-input"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={{ paddingRight: "40px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                          color: "#666",
                        }}
                      >
                        {showPassword ? (
                          <EyeSlashIcon
                            style={{ width: "20px", height: "20px" }}
                          />
                        ) : (
                          <EyeIcon style={{ width: "20px", height: "20px" }} />
                        )}
                      </button>
                    </div>
                  </div>



                  <div className="login-options">
                    <a
                      href="#"
                      className="login-forgot-link"
                      onClick={(e) => {
                        e.preventDefault();
                        handleForgotPasswordClick();
                      }}
                    >
                      Forgot Password?
                    </a>
                  </div>

                  <CTAButton
                    type="submit"
                    variant="brand"
                    size="lg"
                    fullWidth
                    loading={loading}
                    loadingText="Logging in..."
                    className="login-btn"
                  >
                    Login
                  </CTAButton>
                </form>

                <p className="login-register-text">
                  New user?{' '}
                  <Link
                    href="/#register-section"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      setTimeout(() => {
                        const el = document.getElementById("register-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 300);
                    }}
                    className="login-register-link"
                  >
                    Register here
                  </Link>
                </p>
              </div>

              {/* BACK FACE: FORGOT PASSWORD */}
              <div className="login-face login-back">
                <h3 className="login-back-title">
                  {resetStep === 1 && "Forgot Password?"}
                  {resetStep === 2 && "Verify OTP"}
                  {resetStep === 3 && "Set New Password"}
                </h3>
                <p className="login-back-subtitle">
                  {resetStep === 1 &&
                    "Enter your email to receive a reset code"}
                  {resetStep === 2 &&
                    "Enter the 6-digit code sent to your email"}
                  {resetStep === 3 && "Create a new password for your account"}
                </p>

                {resetSuccess && (
                  <div className="login-alert login-alert-success" aria-live="polite">
                    {resetSuccess}
                  </div>
                )}

                {resetError && (
                  <div className="login-alert login-alert-error" role="alert">
                    {resetError}
                  </div>
                )}

                {resetStep === 1 && (
                  <form className="login-form" onSubmit={handleSendOTP}>
                    <div className="login-input-group">
                      <label htmlFor="resetEmail" className="login-input-label">
                        Email Address
                      </label>
                      <div className="login-input-wrapper">
                        <UserIcon className="login-input-icon" />
                        <input
                          id="resetEmail"
                          name="email"
                          autoComplete="email"
                          type="email"
                          className="login-input"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <CTAButton
                      type="submit"
                      variant="brand"
                      size="md"
                      fullWidth
                      loading={resetLoading}
                      loadingText="Sending..."
                    >
                      Send OTP
                    </CTAButton>
                  </form>
                )}

                {resetStep === 2 && (
                  <form className="login-form" onSubmit={handleVerifyOTP}>
                    <div className="login-input-group">
                      <label htmlFor="resetOTP" className="login-input-label">
                        Enter OTP
                      </label>
                      <input
                        id="resetOTP"
                        name="otp"
                        autoComplete="one-time-code"
                        type="text"
                        className="login-input"
                        placeholder="Enter 6-digit code"
                        value={resetOTP}
                        onChange={(e) =>
                          setResetOTP(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        maxLength="6"
                        style={{
                          textAlign: "center",
                          letterSpacing: "8px",
                          fontSize: "1.2rem",
                        }}
                        required
                      />
                    </div>
                    <CTAButton
                      type="submit"
                      variant="brand"
                      size="md"
                      fullWidth
                      loading={resetLoading}
                      loadingText="Verifying..."
                    >
                      Verify OTP
                    </CTAButton>
                    <button
                      type="button"
                      className="login-back-btn"
                      onClick={() => setResetStep(1)}
                      style={{ marginTop: "12px" }}
                    >
                      Resend OTP
                    </button>
                  </form>
                )}

                {resetStep === 3 && (
                  <form className="login-form" onSubmit={handleResetPassword}>
                    <div className="login-input-group">
                      <label
                        htmlFor="newPassword"
                        className="login-input-label"
                      >
                        New Password
                      </label>
                      <div
                        className="login-input-wrapper"
                        style={{ position: "relative" }}
                      >
                        <LockClosedIcon className="login-input-icon" />
                        <input
                          id="newPassword"
                          name="newPassword"
                          autoComplete="new-password"
                          type={showNewPassword ? "text" : "password"}
                          className="login-input"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={handlePasswordChange}
                          required
                          style={{ paddingRight: "40px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                          }}
                        >
                          {showNewPassword ? (
                            <EyeSlashIcon
                              style={{ width: "20px", height: "20px" }}
                            />
                          ) : (
                            <EyeIcon
                              style={{ width: "20px", height: "20px" }}
                            />
                          )}
                        </button>
                      </div>
                      {newPassword && (
                        <div style={{ marginTop: "5px" }}>
                          <div
                            style={{
                              height: "4px",
                              width: "100%",
                              backgroundColor: "#e5e7eb",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${passwordStrength}%`,
                                backgroundColor:
                                  passwordStrength < 50
                                    ? "#ef4444"
                                    : passwordStrength < 75
                                      ? "#f59e0b"
                                      : "#10b981",
                                transition:
                                  "width 0.3s ease, background-color 0.3s ease",
                              }}
                            />
                          </div>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color:
                                passwordStrength < 50
                                  ? "#ef4444"
                                  : passwordStrength < 75
                                    ? "#f59e0b"
                                    : "#10b981",
                              marginTop: "2px",
                              textAlign: "right",
                            }}
                          >
                            {passwordStrength < 50
                              ? "Weak"
                              : passwordStrength < 75
                                ? "Medium"
                                : "Strong"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="login-input-group">
                      <label
                        htmlFor="confirmPassword"
                        className="login-input-label"
                      >
                        Confirm Password
                      </label>
                      <div
                        className="login-input-wrapper"
                        style={{ position: "relative" }}
                      >
                        <LockClosedIcon className="login-input-icon" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          autoComplete="new-password"
                          type={showConfirmPassword ? "text" : "password"}
                          className="login-input"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          style={{ paddingRight: "40px" }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                          }}
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon
                              style={{ width: "20px", height: "20px" }}
                            />
                          ) : (
                            <EyeIcon
                              style={{ width: "20px", height: "20px" }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                    <CTAButton
                      type="submit"
                      variant="brand"
                      size="md"
                      fullWidth
                      loading={resetLoading}
                      loadingText="Resetting..."
                    >
                      Reset Password
                    </CTAButton>
                  </form>
                )}

                <button className="login-back-btn" onClick={handleBackToLogin}>
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
