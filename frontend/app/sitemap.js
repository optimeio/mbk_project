const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mbktechnologies.info';

/**
 * Next.js sitemap generator — generates a sitemap.xml for all public and
 * authenticated pages. Search engines will discover all platform routes.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap() {
  const now = new Date().toISOString();

  // Public pages — highest priority
  const publicPages = [
    { url: `${BASE_URL}`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/services`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/courses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/trainer-signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/forgot-password`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // Trainer portal pages
  const trainerPages = [
    'dashboard', 'activities', 'attendance', 'student-attendance',
    'complaints', 'payslips', 'profile', 'reports', 'schedule', 'settings',
  ].map((slug) => ({
    url: `${BASE_URL}/trainer/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Admin dashboard pages
  const dashboardPages = [
    '', 'trainers', 'attendance', 'trainer-activity', 'complaints',
    'courses', 'colleges', 'cities', 'companies', 'documents',
    'nda', 'salary', 'approvals', 'accounts',
  ].map((slug) => ({
    url: `${BASE_URL}/dashboard${slug ? `/${slug}` : ''}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Student portal pages
  const studentPages = [
    'dashboard', 'courses', 'profile',
  ].map((slug) => ({
    url: `${BASE_URL}/student/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // SPOC portal pages
  const spocPages = [
    'dashboard', 'trainers', 'attendance', 'overall-attendance',
    'colleges', 'courses', 'complaints', 'schedule', 'geo-verification',
    'analytics', 'settings',
  ].map((slug) => ({
    url: `${BASE_URL}/spoc/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // LMS
  const lmsPages = [
    { url: `${BASE_URL}/lms`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  const allPages = [
    ...publicPages,
    ...trainerPages,
    ...dashboardPages,
    ...studentPages,
    ...spocPages,
    ...lmsPages,
  ];

  return allPages.map((page) => ({
    ...page,
    lastModified: now,
  }));
}
