import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "End_to_End_Workflow.pdf");

const lines = [
  "MBK Carrierz - End-to-End Workflow",
  `Generated: ${new Date().toISOString()}`,
  "",
  "1. Authentication and Role Routing",
  "- User logs in via /login.",
  "- Backend validates credentials and returns access token.",
  "- Frontend stores session and normalizes role.",
  "- Role-based dashboard redirect:",
  "  Super Admin -> /dashboard",
  "  SPOC -> /spoc/dashboard",
  "  Trainer -> /trainer/dashboard",
  "",
  "2. Shared Runtime Boot Flow",
  "- Root layout initializes providers and query cache.",
  "- Portal bootstrap data is warmed and cached.",
  "- Global UI services are mounted:",
  "  Route transitions (Framer Motion)",
  "  Toast notifications (React Hot Toast)",
  "",
  "3. Super Admin End-to-End Workflow",
  "- Open /dashboard and load high-level metrics.",
  "- Manage companies, colleges, cities, trainers, complaints, attendance, documents.",
  "- Trainer hub flow:",
  "  Search (debounced) -> paged API fetch -> virtualized rendering -> row actions.",
  "- Actions include approve/reject/status toggle/delete with cache invalidation.",
  "- Export flows (Excel/PDF) run in idle window to reduce main-thread blocking.",
  "",
  "4. SPOC End-to-End Workflow",
  "- Open /spoc/dashboard and access assigned colleges/trainers/schedules.",
  "- View attendance, verify submissions, update schedules, and monitor analytics.",
  "- Schedule and attendance updates call API mutations and refresh affected query keys.",
  "",
  "5. Trainer End-to-End Workflow",
  "- Open /trainer/dashboard for daily tasks.",
  "- Submit complaints and attendance check-in/check-out with attachments.",
  "- Profile/documents updates use mutation flow with loading/success/error toasts.",
  "",
  "6. Data Flow (Request Lifecycle)",
  "- User action in UI triggers query/mutation.",
  "- API client sends request with auth headers and refresh handling.",
  "- Backend responds with normalized payload.",
  "- TanStack Query updates cache and UI re-renders only affected components.",
  "",
  "7. Performance Workflow",
  "- Server pagination + infinite query for large datasets.",
  "- Virtualization renders only visible rows.",
  "- Debounced search reduces request burst and rerenders.",
  "- Prefetch of critical routes/data improves navigation latency.",
  "- Heavy client tasks moved to requestIdleCallback when possible.",
  "",
  "8. Error and Recovery Workflow",
  "- API/network errors are normalized to user-friendly messages.",
  "- Toasts provide immediate feedback.",
  "- Query retries and targeted invalidation keep UI consistent.",
  "",
  "9. Production Readiness Checklist",
  "- Role-safe routing and guarded modules.",
  "- Query caching with staleTime and gcTime configured.",
  "- Large-list virtualization enabled.",
  "- Async UX feedback standardized with toasts.",
  "- Build pipeline should run in unrestricted environment for final typecheck.",
];

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 40;
const usableWidth = pageWidth - margin * 2;
let y = margin;

const ensureSpace = (height = 14) => {
  if (y + height > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
};

const write = (text, options = {}) => {
  const {
    font = "courier",
    style = "normal",
    size = 10,
    gap = 3,
  } = options;

  doc.setFont(font, style);
  doc.setFontSize(size);
  const wrapped = doc.splitTextToSize(String(text), usableWidth);
  wrapped.forEach((line) => {
    ensureSpace(size + gap + 1);
    doc.text(line, margin, y);
    y += size + gap;
  });
};

lines.forEach((line, index) => {
  if (index === 0) {
    write(line, { font: "helvetica", style: "bold", size: 17, gap: 6 });
    return;
  }

  if (/^\d+\./.test(line)) {
    y += 4;
    write(line, { font: "helvetica", style: "bold", size: 12, gap: 4 });
    return;
  }

  write(line);
});

fs.writeFileSync(OUTPUT_FILE, Buffer.from(doc.output("arraybuffer")));
console.log(OUTPUT_FILE);

