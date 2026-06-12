'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/context/AuthContext';
import authService from '../../../src/services/authService';
import notify from '../../../src/lib/toast';
import CTAButton from '../../../src/components/common/CTAButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CompanyAuthPage() {
  const router = useRouter();
  const { registerCompany, loginCompany, isAuthenticated, userRole, loading: authLoading } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (authLoading || loading) return;
    if (isAuthenticated && userRole === 'company' && authService.getToken()) {
      router.replace('/company/dashboard');
    }
  }, [authLoading, loading, isAuthenticated, userRole, router]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateSignup = () => {
    if (!formData.companyName.trim()) return 'Please enter company name.';
    if (!formData.adminName.trim()) return 'Please enter admin full name.';
    if (!EMAIL_REGEX.test(formData.email.trim())) return 'Please enter a valid email address.';
    if (!formData.phone.trim()) return 'Please enter contact phone number.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match!';
    return '';
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (isLoginMode) {
      if (!formData.email.trim() || !formData.password) {
        notify.error('Email and password are required.');
        return;
      }

      setLoading(true);
      const result = await loginCompany(formData.email.trim(), formData.password);

      if (result.success && authService.getToken()) {
        await notify.successAndNavigate('Login successful', () =>
          router.push('/company/dashboard'),
        );
      } else {
        notify.error(result.message || 'Invalid email or password');
      }
      setLoading(false);
      return;
    }

    const validationError = validateSignup();
    if (validationError) {
      notify.warning(validationError);
      return;
    }

    setLoading(true);
    const submissionPayload = {
      companyName: formData.companyName.trim(),
      adminName: formData.adminName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      website: formData.website.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const result = await registerCompany(submissionPayload);

    if (result.success && authService.getToken()) {
      await notify.successAndNavigate('Company Registration Successful', () =>
        router.push('/company/dashboard'),
      );
    } else {
      notify.error(result.message || 'An error occurred during registration.');
    }
    setLoading(false);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.mainCard}>
        <div style={styles.leftSidebar}>
          <h1 style={styles.sidebarTitle}>Partner With Us</h1>
          <p style={styles.sidebarSub}>
            Join thousands of corporate partners connecting through MBK Carrierz.
            Recruit top talent and provide industry training.
          </p>
          <div style={styles.bulletList}>
            <div style={styles.bulletItem}>✓ Verified Student Profiles</div>
            <div style={styles.bulletItem}>✓ Manage Placement Pipelines</div>
            <div style={styles.bulletItem}>✓ Drive Corporate Innovation</div>
          </div>
        </div>

        <div style={styles.rightFormSection}>
          <h2 style={styles.formTitle}>
            {isLoginMode ? 'Corporate Sign In' : 'Corporate Registration'}
          </h2>
          <p style={styles.formSub}>
            {isLoginMode ? 'Sign in to access corporate modules' : 'Create your company account to hire top talent'}
          </p>

          <form method="post" action="/company/auth" onSubmit={handleAuthSubmit} style={styles.formControl} noValidate>
            {!isLoginMode && (
              <>
                <input type="text" name="companyName" placeholder="Company Name" value={formData.companyName} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <input type="text" name="adminName" placeholder="Admin Full Name" value={formData.adminName} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <input type="text" name="phone" placeholder="Contact Phone Number" value={formData.phone} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <input type="text" name="address" placeholder="Corporate Address (Optional)" value={formData.address} onChange={handleInputChange} style={styles.inputField} disabled={loading} />
                <input type="text" name="website" placeholder="Website URL (Optional)" value={formData.website} onChange={handleInputChange} style={styles.inputField} disabled={loading} />
              </>
            )}

            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
            <input type="password" name="password" placeholder={isLoginMode ? 'Password' : 'Password (min 6 characters)'} value={formData.password} onChange={handleInputChange} style={styles.inputField} required disabled={loading} minLength={isLoginMode ? undefined : 6} />

            {!isLoginMode && (
              <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleInputChange} style={styles.inputField} required disabled={loading} minLength={6} />
            )}

            <CTAButton
              type="submit"
              variant="company"
              size="lg"
              fullWidth
              loading={loading}
              loadingText="Please wait..."
              className="mt-2 rounded-xl"
            >
              {isLoginMode ? 'Sign In' : 'Create Account'}
            </CTAButton>
          </form>

          <p style={styles.toggleText}>
            {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
            <span style={styles.toggleLink} onClick={() => !loading && setIsLoginMode(!isLoginMode)}>
              {isLoginMode ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { display: 'flex', width: '100%', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: '"Inter", sans-serif', padding: '16px' },
  mainCard: { display: 'flex', width: '100%', maxWidth: '1040px', backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.07)', overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' },
  leftSidebar: { flex: '1 1 320px', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#ffffff' },
  sidebarTitle: { fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: '800', marginBottom: '22px', lineHeight: '1.2' },
  sidebarSub: { fontSize: '15.5px', lineHeight: '1.65', opacity: '0.92', marginBottom: '32px' },
  bulletList: { display: 'flex', flexDirection: 'column', gap: '18px' },
  bulletItem: { fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' },
  rightFormSection: { flex: '1 1 360px', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  formTitle: { fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' },
  formSub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
  formControl: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputField: { width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  submitButton: { width: '100%', padding: '15px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  toggleText: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' },
  toggleLink: { color: '#3b82f6', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' },
};
