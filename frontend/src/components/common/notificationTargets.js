const getWorkspaceRouteForRole = () => "/chat";

const getDashboardRouteForRole = (role) => {
  if (role === "SuperAdmin") return "/dashboard";
  if (role === "SPOCAdmin" || role === "CollegeAdmin") return "/spoc/dashboard";
  if (role === "Trainer") return "/trainer/dashboard";
  if (role === "Accountant" || role === "Accountnt") return "/accountant/dashboard";
  return "/dashboard";
};

const getApprovalRouteForRole = (role) => {
  if (role === "Trainer") return "/trainer/profile";
  if (role === "SuperAdmin") return "/dashboard/approvals";
  return getDashboardRouteForRole(role);
};

const getComplaintsRouteForRole = (role) => {
  if (role === "Trainer") return "/trainer/complaints";
  if (role === "SPOCAdmin" || role === "CollegeAdmin") return "/spoc/complaints";
  return "/dashboard/complaints";
};

const normalizeNotificationLink = (link) => {
  if (!link) return "";
  if (link === "/workspace" || link.startsWith("/workspace/")) {
    return link.replace("/workspace", "/chat");
  }
  if (link === "/spoc/workspace" || link.startsWith("/spoc/workspace/")) {
    return link.replace("/spoc/workspace", "/chat");
  }
  if (link === "/trainer/workspace" || link.startsWith("/trainer/workspace/")) {
    return link.replace("/trainer/workspace", "/chat");
  }
  if (link === "/admin" || link === "/superadmin") return "/dashboard";
  if (link.startsWith("/admin/")) return link.replace("/admin/", "/");
  if (link.startsWith("/superadmin/")) return link.replace("/superadmin/", "/");
  return link;
};

export const resolveNotificationTarget = (notification, role) => {
  const normalizedType = String(notification?.type || "").toLowerCase();
  const normalizedLink = normalizeNotificationLink(notification?.link || "");

  if (normalizedType === "approval") return getApprovalRouteForRole(role);
  if (normalizedLink === "/login") return getDashboardRouteForRole(role);
  if (normalizedLink) return normalizedLink;
  if (normalizedType === "complaints" || normalizedType === "complaint") {
    return getComplaintsRouteForRole(role);
  }
  if (normalizedType === "chat" || normalizedType === "announcement") {
    return getWorkspaceRouteForRole(role);
  }
  if (normalizedType === "schedule") return `/${role?.toLowerCase() || "trainer"}/schedule`;
  return "";
};
