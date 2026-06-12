'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { studentAuthService, companyAuthService, setAuthCookie, clearAuthCookie } from '../services/authService';
import { discoverApiOrigin, getResolvedApiOrigin } from '@/config/apiConfig';
import { loginTypeMatchesUser, normalizeAuthUser } from '@/utils/authRoles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getToken();
        
        if (!token) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const response = await authService.verifyAuth();
        
        if (response.success && response.authenticated) {
          const userWithRole = { ...response.user, role: response.role };
          setUser(userWithRole);
          setUserRole(response.role);
          setIsAuthenticated(true);
        } else {
          authService.logout();
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
      authService.logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unauthorized', handleUnauthorized);
      return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }
  }, []);

  const registerStudent = async (formData) => {
    setError(null);
    try {
      const response = await studentAuthService.register(formData);
      if (response.success && response.token) {
        const studentInfo = { ...(response.student || {}), role: 'student' };
        setUser(studentInfo);
        setUserRole('student');
        setIsAuthenticated(true);
      } else if (!response.success) {
        setError(response.message);
      }
      return response;
    } catch (err) {
      setError('Registration failed. Please try again.');
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const loginStudent = async (email, password) => {
    setError(null);
    try {
      const response = await studentAuthService.login(email, password);
      if (response.success && response.token) {
        const studentInfo = { ...response.student, role: 'student' };
        console.debug('[AUTH] student authenticated, role: student');
        setUser(studentInfo);
        setUserRole('student');
        setIsAuthenticated(true);
      } else if (response.success) {
        setError('Login succeeded but no session token was returned. Please try again.');
      } else {
        setError(response.message);
      }
      return response;
    } catch (err) {
      setError('Login failed. Please try again.');
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const registerCompany = async (formData) => {
    setError(null);
    try {
      const response = await companyAuthService.register(formData);
      if (response.success && response.token) {
        const companyInfo = { ...(response.company || {}), role: 'company' };
        setUser(companyInfo);
        setUserRole('company');
        setIsAuthenticated(true);
      } else if (!response.success) {
        setError(response.message);
      }
      return response;
    } catch (err) {
      setError('Registration failed. Please try again.');
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const loginCompany = async (email, password) => {
    setError(null);
    try {
      const response = await companyAuthService.login(email, password);
      if (response.success && response.token) {
        const companyInfo = { ...response.company, role: 'company' };
        console.debug('[AUTH] company authenticated, role: company');
        setUser(companyInfo);
        setUserRole('company');
        setIsAuthenticated(true);
      } else if (response.success) {
        setError('Login succeeded but no session token was returned. Please try again.');
      } else {
        setError(response.message);
      }
      return response;
    } catch (err) {
      setError('Login failed. Please try again.');
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const login = async (email, password, options = {}) => {
    setError(null);
    const expectedRole = options.expectedRole;

    const clearStoredSession = () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userRole');
        clearAuthCookie();
      }
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    };

    const finalizePortalLogin = (rawUserInfo) => {
      const userInfo = normalizeAuthUser(rawUserInfo);
      if (expectedRole && !loginTypeMatchesUser(expectedRole, userInfo.role, userInfo.email)) {
        clearStoredSession();
        const err = new Error('This email is not registered for the selected account type');
        err.roleMismatch = true;
        throw err;
      }
      setUser(userInfo);
      setUserRole(userInfo.role);
      setIsAuthenticated(true);
      return userInfo;
    };

    const buildAuthError = (data, payload, fallbackMessage = 'Invalid credentials') => {
      const err = new Error(data.message || payload.message || fallbackMessage);
      err.pendingApproval = payload.pendingApproval || data.pendingApproval;
      err.requiresEmailVerification =
        payload.requiresEmailVerification || data.requiresEmailVerification;
      err.accountDeactivated = payload.accountDeactivated || data.accountDeactivated;
      err.roleMismatch = payload.roleMismatch || data.roleMismatch;
      return err;
    };

    // Timeout wrapper for slow connections
    const withTimeout = (promise, ms = 15000) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out. Please check your network and try again.')), ms)
        ),
      ]);

    const tryStudent = async () => {
      try {
        const response = await withTimeout(studentAuthService.login(email, password));
        if (response.success) {
          return finalizePortalLogin({ ...response.student, role: 'student' });
        }
        if (expectedRole === 'student') {
          throw new Error(response.message || 'Invalid email or password');
        }
      } catch (e) {
        if (e.message?.includes('timed out') || e.roleMismatch) throw e;
        if (expectedRole === 'student') {
          throw e;
        }
      }
      return null;
    };

    const tryCompany = async () => {
      try {
        const response = await withTimeout(companyAuthService.login(email, password));
        if (response.success) {
          return finalizePortalLogin({ ...response.company, role: 'company' });
        }
        if (expectedRole === 'company') {
          throw new Error(response.message || 'Invalid email or password');
        }
      } catch (e) {
        if (e.message?.includes('timed out') || e.roleMismatch) throw e;
        if (expectedRole === 'company') {
          throw e;
        }
      }
      return null;
    };

    const tryGeneralUser = async (strict = false) => {
      try {
        const cleanBaseUrl = await discoverApiOrigin();
        const requestBody = { email, password };
        if (
          expectedRole &&
          expectedRole !== 'student' &&
          expectedRole !== 'company'
        ) {
          requestBody.expectedRole = expectedRole;
        }

        const response = await withTimeout(
          fetch(`${cleanBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })
        );

        const data = await response.json();
        const payload = data.data || data;
        const accessToken = payload.accessToken || data.accessToken;
        const authUser = payload.user || data.user;

        if (response.ok && data.success && accessToken) {
          const userInfo = normalizeAuthUser({
            id: authUser?.id || authUser?._id,
            email: authUser?.email,
            name: authUser?.name || authUser?.fullName,
            role: authUser?.role,
          });
          console.debug('[AUTH] general login response:', {
            success: true,
            role: userInfo.role,
            email: userInfo.email,
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', accessToken);
            localStorage.setItem('accessToken', accessToken);
            if (payload.refreshToken || data.refreshToken) {
              localStorage.setItem(
                'refreshToken',
                payload.refreshToken || data.refreshToken,
              );
            }
            localStorage.setItem('user', JSON.stringify(userInfo));
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            localStorage.setItem('userRole', userInfo.role);
            setAuthCookie(accessToken);
            console.debug('[AUTH] token + role stored:', userInfo.role);
          }

          return finalizePortalLogin(userInfo);
        }

        if (
          payload.pendingApproval ||
          data.pendingApproval ||
          payload.requiresEmailVerification ||
          data.requiresEmailVerification ||
          payload.accountDeactivated ||
          data.accountDeactivated ||
          payload.roleMismatch ||
          data.roleMismatch ||
          strict
        ) {
          throw buildAuthError(data, payload);
        }
      } catch (e) {
        if (
          e.message?.includes('timed out') ||
          e.pendingApproval ||
          e.requiresEmailVerification ||
          e.accountDeactivated ||
          e.roleMismatch ||
          strict
        ) {
          throw e;
        }
      }
      return null;
    };

    try {
      if (expectedRole === 'student') {
        const res = await tryStudent();
        if (res) return res;
      } else if (expectedRole === 'company') {
        const res = await tryCompany();
        if (res) return res;
      } else if (expectedRole && expectedRole !== 'student' && expectedRole !== 'company') {
        const res = await tryGeneralUser(true);
        if (res) return res;
      }

      // Unified login: try each auth provider until one succeeds.
      if (expectedRole !== 'student' && expectedRole !== 'company') {
        const res = await tryGeneralUser(false);
        if (res) return res;
      }
      if (expectedRole !== 'student') {
        const res = await tryStudent();
        if (res) return res;
      }
      if (expectedRole !== 'company') {
        const res = await tryCompany();
        if (res) return res;
      }

      throw new Error('Invalid email or password');
    } catch (err) {
      const message = err.message?.includes('timed out')
        ? err.message
        : err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          ? 'Network error. Please check your internet connection.'
          : err.message || 'Login failed. Please try again.';
      setError(message);
      throw err;
    }
  };

  const setAuthUser = (userData) => {
    if (userData) {
      setUser(userData);
      if (userData.role) {
        setUserRole(userData.role);
      }
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await authService.logout();
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    currentUser: user,
    userRole,
    isAuthenticated,
    loading,
    error,
    registerStudent,
    loginStudent,
    registerCompany,
    loginCompany,
    login,
    setAuthUser,
    logout,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;




