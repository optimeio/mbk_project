import { jsPDF } from "jspdf";
import fs from "fs";

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 48;
const usableWidth = pageWidth - margin * 2;
let y = margin;

const ensureSpace = (needed = 20) => {
  if (y + needed > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
};

const writeTitle = (text) => {
  ensureSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(text, margin, y);
  y += 28;
};

const writeH2 = (text) => {
  ensureSpace(28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(text, margin, y);
  y += 20;
};

const writeBody = (text) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, usableWidth);
  for (const line of lines) {
    ensureSpace(16);
    doc.text(line, margin, y);
    y += 15;
  }
};

const gap = (h = 10) => {
  ensureSpace(h);
  y += h;
};

writeTitle("Production-Ready Full-Stack Application Blueprint");
writeBody("Product: TaskFlow (multi-tenant project & task management SaaS)");
gap(8);

writeH2("1) Project Structure");
writeBody("Monorepo: apps/web (Next.js TypeScript Tailwind Zustand), apps/api (Express TypeScript Prisma JWT RBAC), packages/shared (DTOs/schemas), infra (Docker/nginx), CI workflows.");
writeBody("Folder roles: UI layer in web, API + clean architecture in api, shared contracts in packages/shared, deployment config in infra.");

writeH2("2) Database Schema (Prisma + PostgreSQL)");
writeBody("Core entities: User, Organization, Membership, Project, ProjectMember, Task, TaskAssignee, Comment, RefreshToken, PasswordResetToken, AuditLog.");
writeBody("Best practices: normalized relations, unique constraints (email, slug, compound memberships), enum-based status/roles, indexes on foreign keys, status, dueDate, and createdAt.");

writeH2("3) API Design");
writeBody("REST base: /api/v1. Standard success payload { success, data, meta }. Standard error payload { success:false, error:{ code, message, details, requestId, timestamp } }.");
writeBody("Auth endpoints: register, login, refresh, logout, me, forgot-password, reset-password.");
writeBody("Domain endpoints: organizations/projects CRUD, project tasks CRUD, task assignees, task comments.");
writeBody("HTTP semantics: GET read, POST create, PUT update, DELETE remove/archive.");

writeH2("4) Backend Implementation");
writeBody("Strict layering: Routes/Controllers -> Services -> Repositories -> Prisma -> PostgreSQL.");
writeBody("Controllers handle HTTP concerns only. Services enforce business rules and RBAC checks. Repositories perform DB reads/writes only.");
writeBody("Middleware stack: auth middleware (JWT verify), RBAC middleware (role checks), validation middleware (Zod), error middleware (centralized), rate-limit middleware (abuse prevention).");

writeH2("5) Frontend Implementation");
writeBody("Pages: Home, Auth (login/register/forgot password), Dashboard, Projects list/detail, Task detail.");
writeBody("Reusable components: app shell, sidebar, topbar, cards, table, modal, form controls, loader, error banner.");
writeBody("State management with Zustand: auth store, project/task filters, optimistic updates for task actions.");
writeBody("API integration through a typed api-client with centralized error parsing and token refresh handling.");

writeH2("6) Data Flow");
writeBody("User action -> Frontend form/state -> API request -> Route+Middleware validation -> Controller -> Service business rules -> Repository query -> Database -> Service mapping -> Controller response -> UI state update and render.");

writeH2("7) Security");
writeBody("JWT access tokens (short TTL) + refresh token rotation. bcrypt password hashing (12 rounds). Input validation (Zod). Rate limiting on auth endpoints. Helmet + CORS allowlist + secure cookies. Role-based authorization and audit logs.");

writeH2("8) Performance");
writeBody("Next.js code splitting and lazy loading for heavy modules. Image optimization. API pagination and selective DB fields. Caching strategy with SWR/React Query for GET endpoints. Indexed queries for high-frequency filters. LCP optimization via server-rendered shell and reduced critical payload.");

writeH2("9) Testing");
writeBody("Unit tests: services/utils/validators. API tests: supertest for auth and RBAC scenarios. E2E tests: Playwright flows (register/login/create project/create task/comment/logout). CI gate runs lint, typecheck, tests, and build.");

writeH2("10) Deployment");
writeBody("Frontend: Vercel deployment for apps/web. Backend: Node server/container on Render/Fly/AWS. Database: managed PostgreSQL (Neon/Supabase/RDS). CI/CD applies Prisma migrations, runs tests, and performs post-deploy health checks.");

gap(10);
writeH2("Production Checklist");
writeBody("Clean architecture enforced, typed contracts shared, secure auth stack enabled, normalized schema with indexes, complete testing strategy, and scalable deployment workflow.");

const outPath = "E:/Master V/TaskFlow_Architecture_Documentation.pdf";
const pdfBytes = doc.output("arraybuffer");
fs.writeFileSync(outPath, Buffer.from(pdfBytes));
console.log(outPath);
