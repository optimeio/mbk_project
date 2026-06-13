"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon, KeyIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { studentAuthService } from '@/services/authService';
import CTAButton from '@/components/common/CTAButton';

const StudentForgotPassword = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const response = await studentAuthService.forgotPassword(email);
    if (response.success) {
      setMessage(response.message || 'If an account exists for this email, a reset code has been sent.');
      setStep(2);
    } else {
      setError(response.message || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const response = await studentAuthService.verifyResetOtp(email, otp);
    if (response.success) {
      setTempToken(response.tempToken);
      setMessage(response.message || 'OTP verified. Please set your new password.');
      setStep(3);
    } else {
      setError(response.message || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    const response = await studentAuthService.resetPassword(tempToken, password);
    if (response.success) {
      setMessage('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/student/auth');
      }, 2000);
    } else {
      setError(response.message || 'Failed to reset password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          {step === 1 && 'Reset Student Password'}
          {step === 2 && 'Enter OTP'}
          {step === 3 && 'New Password'}
        </h1>
        <p style={styles.subtitle}>
          {step === 1 && 'Enter your student email to receive a verification code.'}
          {step === 2 && `Enter the 6-digit code sent to ${email}`}
          {step === 3 && 'Create a new password for your student account.'}
        </p>

        {message ? (
          <div style={styles.successBox}>
            <CheckCircleIcon style={styles.successIcon} aria-hidden="true" />
            <span>{message}</span>
          </div>
        ) : null}

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {step === 1 ? (
          <form style={styles.form} onSubmit={handleSendOTP}>
            <div style={styles.inputWrap}>
              <EnvelopeIcon style={styles.inputIcon} aria-hidden="true" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                style={styles.inputField}
                placeholder="Student email address"
              />
            </div>
            <CTAButton type="submit" variant="brand" size="lg" fullWidth loading={loading} loadingText="Sending...">
              Send OTP
            </CTAButton>
          </form>
        ) : null}

        {step === 2 ? (
          <form style={styles.form} onSubmit={handleVerifyOTP}>
            <div style={styles.inputWrap}>
              <KeyIcon style={styles.inputIcon} aria-hidden="true" />
              <input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...styles.inputField, textAlign: 'center', letterSpacing: '0.25em' }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
            </div>
            <CTAButton type="submit" variant="brand" size="lg" fullWidth loading={loading} loadingText="Verifying...">
              Verify OTP
            </CTAButton>
            <button type="button" style={styles.linkButton} onClick={() => setStep(1)}>
              Change email
            </button>
          </form>
        ) : null}

        {step === 3 ? (
          <form style={styles.form} onSubmit={handleResetPassword}>
            <div style={styles.inputWrap}>
              <LockClosedIcon style={styles.inputIcon} aria-hidden="true" />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.inputField}
                placeholder="New password"
                minLength={8}
              />
            </div>
            <div style={styles.inputWrap}>
              <LockClosedIcon style={styles.inputIcon} aria-hidden="true" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.inputField}
                placeholder="Confirm password"
                minLength={8}
              />
            </div>
            <CTAButton type="submit" variant="brand" size="lg" fullWidth loading={loading} loadingText="Resetting...">
              Reset Password
            </CTAButton>
          </form>
        ) : null}

        <p style={styles.backLinkWrap}>
          <Link href="/student/auth" style={styles.backLink}>
            Back to Student Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    display: 'flex',
    width: '100%',
    minHeight: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    fontFamily: '"Inter", sans-serif',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
    padding: '32px 28px',
  },
  title: {
    margin: 0,
    fontSize: '26px',
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: '8px 0 20px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputWrap: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '18px',
    height: '18px',
    color: '#94a3b8',
  },
  inputField: {
    width: '100%',
    padding: '14px 16px 14px 42px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#ecfdf5',
    color: '#047857',
    fontSize: '14px',
  },
  successIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  errorBox: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: '14px',
  },
  linkButton: {
    border: 0,
    background: 'transparent',
    color: '#ff5e00',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
  },
  backLinkWrap: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
  },
  backLink: {
    color: '#ff5e00',
    fontWeight: 700,
    textDecoration: 'underline',
  },
};

export default StudentForgotPassword;
