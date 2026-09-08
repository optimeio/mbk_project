import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");
const SRC_DIR = path.join(ROOT, "src");

const now = new Date();
const generatedAt = now.toISOString();

const toPosix = (value = "") => value.replace(/\\/g, "/");

const walkFiles = (dir, bucket = []) => {
  if (!fs.existsSync(dir)) return bucket;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolutePath, bucket);
      continue;
    }
    bucket.push(absolutePath);
  }
  return bucket;
};

const routeSort = (left, right) => left.localeCompare(right);

const normalizeDynamicSegments = (route = "") =>
  route
    .replace(/\[\[\.\.\.[^\]]+\]\]/g, ":slug*")
    .replace(/\[\.\.\.[^\]]+\]/g, ":param*")
    .replace(/\[([^\]]+)\]/g, ":$1");

const getAppRoutes = () => {
  const pageFiles = walkFiles(APP_DIR).filter((filePath) =>
    /page\.(js|jsx|ts|tsx)$/.test(filePath),
  );

  const routes = pageFiles
    .map((filePath) => {
      const relative = toPosix(path.relative(APP_DIR, filePath));
      const noPage = relative.replace(/\/page\.(js|jsx|ts|tsx)$/, "");
      if (!noPage || noPage === "page.jsx" || noPage === "page.js") {
        return "/";
      }
      return normalizeDynamicSegments(`/${noPage}`);
    })
    .filter(Boolean);

  return Array.from(new Set(routes)).sort(routeSort);
};

const extractApiRoutesFromText = (content = "") => {
  const routeEntries = [];
  const callRegex = /\b(?:api|API)\.(get|post|put|delete)\(\s*([`'"])([\s\S]*?)\2/g;
  let match;
  while ((match = callRegex.exec(content)) !== null) {
    const method = String(match[1] || "").toUpperCase();
    const rawRoute = String(match[3] || "").trim();
    if (!rawRoute) continue;
    if (!rawRoute.includes("/")) continue;

    const normalizedRoute = rawRoute
      .replace(/\$\{[^}]+\}/g, ":param")
      .replace(/\s+/g, "");
    routeEntries.push(`${method} ${normalizedRoute}`);
  }

  const authFetchRegex = /\/auth\/[a-z0-9-]+/gi;
  const authMatches = content.match(authFetchRegex) || [];
  authMatches.forEach((route) => {
    routeEntries.push(`POST ${route.toLowerCase()}`);
  });

  return routeEntries;
};

const getApiRoutesForDir = (directory) => {
  const files = walkFiles(directory).filter((filePath) =>
    /\.(js|jsx|ts|tsx)$/.test(filePath),
  );
  const routes = new Set();

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const extracted = extractApiRoutesFromText(content);
    extracted.forEach((entry) => routes.add(entry));
  });

  return Array.from(routes).sort(routeSort);
};

const filterRoutesByPrefix = (routes, prefixes = []) =>
  routes.filter((route) => prefixes.some((prefix) => route.startsWith(prefix)));

const allAppRoutes = getAppRoutes();

const superAdminRoutes = filterRoutesByPrefix(allAppRoutes, ["/dashboard"]);
const spocRoutes = filterRoutesByPrefix(allAppRoutes, ["/spoc"]);
const trainerRoutes = filterRoutesByPrefix(allAppRoutes, ["/trainer"]);

const superAdminApiRoutes = getApiRoutesForDir(path.join(SRC_DIR, "portals", "admin"));
const spocApiRoutes = getApiRoutesForDir(path.join(SRC_DIR, "portals", "spoc"));
const trainerApiRoutes = getApiRoutesForDir(path.join(SRC_DIR, "portals", "trainer"));

const sharedServiceApiRoutes = getApiRoutesForDir(path.join(SRC_DIR, "services"));

const roleConnectionLines = [
  "Role Connection (authRoles.js)",
  "1. normalizeAuthRole(...) normalizes incoming role/email to one of:",
  "   - SuperAdmin",
  "   - SPOCAdmin",
  "   - Trainer",
  "2. getDashboardRouteByRole(...) route mapping:",
  "   - SuperAdmin -> /dashboard",
  "   - SPOCAdmin -> /spoc/dashboard",
  "   - Trainer -> /trainer/dashboard",
];

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 42;
const usableWidth = pageWidth - margin * 2;
let y = margin;

const ensureSpace = (heightNeeded = 16) => {
  if (y + heightNeeded > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
};

const writeTitle = (text) => {
  ensureSpace(34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(text, margin, y);
  y += 26;
};

const writeSubTitle = (text) => {
  ensureSpace(24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(text, margin, y);
  y += 18;
};

const writeLines = (lines = [], options = {}) => {
  const font = options.font || "helvetica";
  const style = options.style || "normal";
  const size = options.size || 10;
  const lineGap = options.lineGap || 13;

  doc.setFont(font, style);
  doc.setFontSize(size);

  lines.forEach((line) => {
    const text = String(line ?? "");
    const wrapped = doc.splitTextToSize(text, usableWidth);
    wrapped.forEach((wrappedLine) => {
      ensureSpace(lineGap + 2);
      doc.text(wrappedLine, margin, y);
      y += lineGap;
    });
  });
};

const writeSectionRoutes = (sectionTitle, routeList, emptyText) => {
  writeSubTitle(sectionTitle);
  if (!routeList.length) {
    writeLines([emptyText]);
    y += 6;
    return;
  }
  writeLines(routeList.map((route) => `- ${route}`));
  y += 6;
};

writeTitle("Super Admin / SPOC / Trainer Connection & API Route Map");
writeLines([
  `Generated: ${generatedAt}`,
  "Project: M-client",
  "",
]);

writeSubTitle("A) Role Connection");
writeLines(roleConnectionLines);
y += 6;

writeSubTitle("B) Frontend Routes By Role");
writeSectionRoutes("Super Admin Routes", superAdminRoutes, "No /dashboard routes found.");
writeSectionRoutes("SPOC Routes", spocRoutes, "No /spoc routes found.");
writeSectionRoutes("Trainer Routes", trainerRoutes, "No /trainer routes found.");

writeSubTitle("C) API Routes Used By Role Modules");
writeSectionRoutes(
  "Super Admin Module API Calls (src/portals/admin)",
  superAdminApiRoutes,
  "No admin API routes found.",
);
writeSectionRoutes(
  "SPOC Module API Calls (src/portals/spoc)",
  spocApiRoutes,
  "No SPOC API routes found.",
);
writeSectionRoutes(
  "Trainer Module API Calls (src/portals/trainer)",
  trainerApiRoutes,
  "No trainer API routes found.",
);

writeSubTitle("D) Shared Service API Routes (src/services)");
writeLines([
  "These endpoints are reusable service-level APIs and may be consumed by multiple roles.",
  "",
]);
writeSectionRoutes(
  "Shared Service Endpoints",
  sharedServiceApiRoutes,
  "No shared service API routes found.",
);

writeSubTitle("E) Notes");
writeLines([
  "- Dynamic template segments are normalized as ':param' in this document.",
  "- Route access should still be validated by backend RBAC middleware.",
  "- This PDF is generated from current source code and can be regenerated anytime.",
]);

const outputPath = path.join(ROOT, "SuperAdmin_SPOC_Trainer_API_Routes.pdf");
fs.writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(outputPath);

