/**
 * Build the sign-in URL for an unauthenticated portal request.
 * Keeps student/company on their dedicated auth pages; other roles use /login.
 */
export function getUnauthenticatedLoginPath(pathname = "/", reason = "unauthenticated") {
  const safePath = pathname.startsWith("/") ? pathname : "/";
  const params = new URLSearchParams({
    redirect: safePath,
    reason,
  });

  if (safePath.startsWith("/student")) {
    return `/student/auth?${params.toString()}`;
  }

  if (safePath.startsWith("/company")) {
    return `/company/auth?${params.toString()}`;
  }

  if (safePath.startsWith("/dashboard") || safePath.startsWith("/accountant")) {
    params.set("type", "admin");
    return `/login?${params.toString()}`;
  }

  if (safePath.startsWith("/spoc")) {
    params.set("type", "spoc");
  } else if (safePath.startsWith("/trainer")) {
    params.set("type", "trainer");
  }

  return `/login?${params.toString()}`;
}
