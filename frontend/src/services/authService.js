import { api } from "@/services/api";
import {
  discoverApiOrigin,
  getApiOrigin,
  getResolvedApiOrigin,
  getSimpleAuthBaseUrl,
  resetDiscoveredApiOrigin,
} from "@/config/apiConfig";

/**
 * Check trainer email status before OTP
 */
export const checkTrainerEmail = (data) =>
  api.post("/trainers/check-email", data);

/**
 * Trainer Registration - Step 1: email + password, sends OTP to that email only
 */
export const registrationInit = (data) =>
  api.post("/auth/register/trainer", data);

export const registerStudent = (data) =>
  api.post("/auth/register/student", data);

export const registerCompany = (data) =>
  api.post("/auth/register/company", data);

/**
 * Verify Trainer Registration OTP
 */
export const verifyOtp = (data) =>
  api.post("/auth/register/trainer/verify-otp", data);

/**
 * Legacy Registration Step 1
 */
export const registrationStep1 = (data) =>
  api.post("/auth/trainer-registration-step1", data);

/**
 * Register a new trainer (Legacy)
 */
export const signupTrainer = (data) => api.post("/auth/signup", data);


// --- Student and Company Simple Auth Services ---
let API_BASE_URL = getSimpleAuthBaseUrl();

const resolveSimpleAuthBaseUrl = async () => {
  const origin = await discoverApiOrigin();
  API_BASE_URL = `${origin}/api/simple-auth`;
  return API_BASE_URL;
};

const TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days, matches JWT expiry

/**
 * Mirror the JWT into a cookie so Next.js middleware (which can only read
 * cookies on navigation requests) can authorize protected routes.
 * Without this, every protected route redirects back to
 * /login?redirect=...&reason=unauthenticated even after a successful login.
 */
export const setAuthCookie = (token) => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `token=${token}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  console.debug('[AUTH] token cookie set (middleware can now authorize routes)');
};

export const clearAuthCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'mbk_token=; path=/; max-age=0; SameSite=Lax';
};

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

const setToken = (token) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    localStorage.setItem('accessToken', token);
    setAuthCookie(token);
    console.debug('[AUTH] token stored in localStorage (authToken, accessToken)');
  }
};

const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userRole');
    clearAuthCookie();
    console.debug('[AUTH] token + user data cleared from storage');
  }
};

const makeRequest = async (url, method = 'GET', data = null, attempt = 0) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  const baseUrl = await resolveSimpleAuthBaseUrl();
  const requestUrl = url.startsWith('http')
    ? url
    : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;

  try {
    const response = await fetch(requestUrl, config);
    const result = await response.json();

    if (response.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('unauthorized'));
      }
    }

    return {
      success: response.ok,
      status: response.status,
      ...result,
    };
  } catch (error) {
    if (attempt === 0) {
      resetDiscoveredApiOrigin();
      return makeRequest(url, method, data, 1);
    }
    return {
      success: false,
      message: 'Network error. Please check your connection and ensure the backend is running.',
      error: error.message,
    };
  }
};

const persistStudentSession = (response) => {
  if (response.success && response.token) {
    setToken(response.token);
    if (typeof window !== 'undefined' && response.student) {
      localStorage.setItem('userInfo', JSON.stringify(response.student));
      localStorage.setItem('userRole', 'student');
      console.debug('[AUTH] user role stored: student (registration)');
    }
  }
};

const persistCompanySession = (response) => {
  if (response.success && response.token) {
    setToken(response.token);
    if (typeof window !== 'undefined' && response.company) {
      localStorage.setItem('userInfo', JSON.stringify(response.company));
      localStorage.setItem('userRole', 'company');
      console.debug('[AUTH] user role stored: company (registration)');
    }
  }
};

export const studentAuthService = {
  register: async (formData) => {
    const response = await makeRequest('/student/register', 'POST', formData);
    persistStudentSession(response);
    return response;
  },
  login: async (email, password) => {
    const response = await makeRequest('/student/login', 'POST', { email, password });
    console.debug('[AUTH] student login response:', { success: response.success, status: response.status, message: response.message });
    if (response.success && response.token) {
      setToken(response.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userInfo', JSON.stringify(response.student));
        localStorage.setItem('userRole', 'student');
        console.debug('[AUTH] user role stored: student');
      }
    }
    return response;
  },
  getDashboard: async () => {
    return await makeRequest('/student/dashboard', 'GET');
  },
  forgotPassword: async (email) => {
    return await makeRequest('/student/forgot-password', 'POST', {
      email: String(email || '').trim().toLowerCase(),
    });
  },
  verifyResetOtp: async (email, otp) => {
    return await makeRequest('/student/verify-reset-otp', 'POST', {
      email: String(email || '').trim().toLowerCase(),
      otp: String(otp || '').replace(/\D/g, '').slice(0, 6),
    });
  },
  resetPassword: async (tempToken, password) => {
    return await makeRequest('/student/reset-password', 'POST', { tempToken, password });
  },
};

export const companyAuthService = {
  register: async (formData) => {
    const response = await makeRequest('/company/register', 'POST', formData);
    persistCompanySession(response);
    return response;
  },
  login: async (email, password) => {
    const response = await makeRequest('/company/login', 'POST', { email, password });
    console.debug('[AUTH] company login response:', { success: response.success, status: response.status, message: response.message });
    if (response.success && response.token) {
      setToken(response.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userInfo', JSON.stringify(response.company));
        localStorage.setItem('userRole', 'company');
        console.debug('[AUTH] user role stored: company');
      }
    }
    return response;
  },
  getDashboard: async () => {
    return await makeRequest('/company/dashboard', 'GET');
  }
};

export const authService = {
  logout: async () => {
    const response = await makeRequest('/logout', 'POST');
    removeToken();
    return response;
  },
  verifyAuth: async () => {
    const simpleAuthResult = await makeRequest('/verify', 'GET');
    if (simpleAuthResult.success && simpleAuthResult.authenticated) {
      return simpleAuthResult;
    }

    const token = getToken();
    if (!token) {
      return simpleAuthResult;
    }

    const cleanBaseUrl = getResolvedApiOrigin();
    try {
      const response = await fetch(`${cleanBaseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      const payload = data.data || data;
      const user = payload.user || payload;
      if (response.ok && data.success && user) {
        const role = String(user.role || localStorage.getItem('userRole') || '').toLowerCase();
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userInfo', JSON.stringify(user));
          if (role) localStorage.setItem('userRole', role);
        }
        return {
          success: true,
          authenticated: true,
          role,
          user,
        };
      }
    } catch (error) {
      console.warn('[AUTH] /api/auth/me verification failed:', error);
    }

    return simpleAuthResult;
  },
  getStoredUserInfo: () => {
    if (typeof window !== 'undefined') {
      const info = localStorage.getItem('userInfo');
      const role = localStorage.getItem('userRole');
      return info ? { user: JSON.parse(info), role } : null;
    }
    return null;
  },
  isAuthenticated: () => {
    return !!getToken();
  },
  getToken,
};

export default authService;
