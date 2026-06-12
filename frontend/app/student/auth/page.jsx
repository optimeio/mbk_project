'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/context/AuthContext';
import authService from '../../../src/services/authService';
import notify from '../../../src/lib/toast';
import CTAButton from '../../../src/components/common/CTAButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentAuthPage() {
  const router = useRouter();
  const { registerStudent, loginStudent, isAuthenticated, userRole, loading: authLoading } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    collegeName: '',
    course: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (authLoading || loading) return;
    if (isAuthenticated && userRole === 'student' && authService.getToken()) {
      router.replace('/student/dashboard');
    }
  }, [authLoading, loading, isAuthenticated, userRole, router]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateSignup = () => {
    if (!formData.fullName.trim()) return 'Please enter your full name.';
    if (!EMAIL_REGEX.test(formData.email.trim())) return 'Please enter a valid email address.';
    if (!formData.phoneNumber.trim()) return 'Please enter your phone number.';
    if (!formData.collegeName.trim()) return 'Please enter your college or institute.';
    if (!formData.course) return 'Please select a course.';
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
      const result = await loginStudent(formData.email.trim(), formData.password);

      if (result.success && authService.getToken()) {
        await notify.successAndNavigate('Login successful', () =>
          router.push('/student/dashboard'),
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
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phoneNumber.trim(),
      college: formData.collegeName.trim(),
      course: formData.course,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    const result = await registerStudent(submissionPayload);

    if (result.success && authService.getToken()) {
      await notify.successAndNavigate('Student Registration Successful', () =>
        router.push('/student/dashboard'),
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
          <h1 style={styles.sidebarTitle}>Start Your Career Journey</h1>
          <p style={styles.sidebarSub}>
            Join thousands of students and leading business partners connecting through MBK Carrierz.
            Discover training programs, internships, and placement opportunities.
          </p>
          <div style={styles.bulletList}>
            <div style={styles.bulletItem}>✓ Verified Employers & Corporate Partners</div>
            <div style={styles.bulletItem}>✓ Industry Standard Training & Certification</div>
            <div style={styles.bulletItem}>✓ Placement Pipelines & Career Mentorship</div>
          </div>
        </div>

        <div style={styles.rightFormSection}>
          <h2 style={styles.formTitle}>
            {isLoginMode ? 'Student Sign In' : 'Student Registration'}
          </h2>
          <p style={styles.formSub}>
            {isLoginMode ? 'Sign in to access student modules' : 'Create your account to access training and career support'}
          </p>

          <form method="post" action="/student/auth" onSubmit={handleAuthSubmit} style={styles.formControl} noValidate>
            {!isLoginMode && (
              <>
                <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <input type="text" name="phoneNumber" placeholder="Phone Number" value={formData.phoneNumber} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <input type="text" name="collegeName" placeholder="College / Institute Name" value={formData.collegeName} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
                <select name="course" value={formData.course} onChange={handleInputChange} style={styles.selectField} required disabled={loading}>
                  <option value="">Select a Course</option>
                  <option value="pcb">PCB Circuit Design</option>
                  <option value="iot">IoT</option>
                  <option value="employability">Employability</option>
                  <option value="AI Automation">AI with MS Office Course</option>
                  <option value="Full Stack Dev">MERN Full Stack Development</option>
                </select>
              </>
            )}

            <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} style={styles.inputField} required disabled={loading} />
            <input type="password" name="password" placeholder={isLoginMode ? 'Password' : 'Password (min 6 characters)'} value={formData.password} onChange={handleInputChange} style={styles.inputField} required disabled={loading} minLength={isLoginMode ? undefined : 6} />

            {isLoginMode ? (
              <p style={styles.forgotWrap}>
                <Link href="/student/forgot-password" style={styles.forgotLink}>
                  Forgot password?
                </Link>
              </p>
            ) : null}

            {!isLoginMode && (
              <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleInputChange} style={styles.inputField} required disabled={loading} minLength={6} />
            )}

            <CTAButton
              type="submit"
              variant="brand"
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
  leftSidebar: { flex: '1 1 320px', background: 'linear-gradient(135deg, #ff4e00 0%, #ec6100 100%)', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#ffffff' },
  sidebarTitle: { fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: '800', marginBottom: '22px', lineHeight: '1.2' },
  sidebarSub: { fontSize: '15.5px', lineHeight: '1.65', opacity: '0.92', marginBottom: '32px' },
  bulletList: { display: 'flex', flexDirection: 'column', gap: '18px' },
  bulletItem: { fontSize: '15px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' },
  rightFormSection: { flex: '1 1 360px', padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  formTitle: { fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' },
  formSub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
  formControl: { display: 'flex', flexDirection: 'column', gap: '14px' },
  inputField: { width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  selectField: { width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', color: '#475569', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' },
  submitButton: { width: '100%', padding: '15px', background: '#ff5e00', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  toggleText: { textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#64748b' },
  toggleLink: { color: '#ff5e00', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' },
  forgotWrap: { margin: '-4px 0 0', textAlign: 'right' },
  forgotLink: { color: '#ff5e00', fontWeight: '700', fontSize: '13px', textDecoration: 'underline' },
};
