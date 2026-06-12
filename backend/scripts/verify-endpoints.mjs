/**
 * Smoke-test critical MBK Carrierz Portal endpoints.
 * Usage: node scripts/verify-endpoints.mjs
 */
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3000';
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:5005';

const checks = [
  { name: 'Frontend homepage', url: `${FRONTEND_ORIGIN}/`, expectStatus: 200 },
  { name: 'Backend health', url: `${BACKEND_ORIGIN}/health`, expectStatus: 200 },
  { name: 'Auth login route', url: `${BACKEND_ORIGIN}/api/auth/login`, method: 'POST', body: {}, expectStatus: [400, 401] },
  { name: 'Forgot password route', url: `${BACKEND_ORIGIN}/api/auth/forgot-password`, method: 'POST', body: { email: 'missing@example.com' }, expectStatus: [200, 400] },
  { name: 'Verify reset OTP route', url: `${BACKEND_ORIGIN}/api/auth/verify-reset-otp`, method: 'POST', body: { email: 'missing@example.com', otp: '000000' }, expectStatus: [400] },
  { name: 'Google auth route', url: `${BACKEND_ORIGIN}/api/auth/google`, method: 'POST', body: {}, expectStatus: [400] },
  { name: 'Refresh token route', url: `${BACKEND_ORIGIN}/api/auth/refresh`, method: 'POST', body: {}, expectStatus: [400] },
  { name: 'Refresh token alias', url: `${BACKEND_ORIGIN}/api/auth/refresh-token`, method: 'POST', body: {}, expectStatus: [400] },
  { name: 'Student register route', url: `${BACKEND_ORIGIN}/api/simple-auth/student/register`, method: 'POST', body: {}, expectStatus: [400] },
  { name: 'Company register route', url: `${BACKEND_ORIGIN}/api/simple-auth/company/register`, method: 'POST', body: {}, expectStatus: [400] },
  { name: 'Web courses route', url: `${BACKEND_ORIGIN}/api/web/courses`, expectStatus: 200 },
  { name: 'Captcha route', url: `${BACKEND_ORIGIN}/api/captcha`, expectStatus: 200 },
];

const runCheck = async (check) => {
  const response = await fetch(check.url, {
    method: check.method || 'GET',
    headers: check.body ? { 'Content-Type': 'application/json' } : undefined,
    body: check.body ? JSON.stringify(check.body) : undefined,
  });
  const allowed = Array.isArray(check.expectStatus)
    ? check.expectStatus
    : [check.expectStatus];
  const ok = allowed.includes(response.status);
  return {
    ...check,
    status: response.status,
    ok,
  };
};

const main = async () => {
  const results = [];
  for (const check of checks) {
    try {
      results.push(await runCheck(check));
    } catch (error) {
      results.push({ ...check, status: 0, ok: false, error: error.message });
    }
  }

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    const label = result.ok ? 'PASS' : 'FAIL';
    console.log(`${label} ${result.name} -> ${result.status || result.error}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

main();
