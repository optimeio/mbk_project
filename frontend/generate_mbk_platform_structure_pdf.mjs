import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "MBK_Platform_Folder_Structure.pdf");

const structureText = String.raw`mbk-platform/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  │  ├─ (public)/
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ login/
│  │  │  │  ├─ signup/
│  │  │  │  ├─ forgot-password/
│  │  │  │  ├─ trainer-signup/
│  │  │  │  ├─ verify-email/
│  │  │  │  └─ verify-account/
│  │  │  ├─ (admin)/
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ companies/
│  │  │  │  ├─ trainers/
│  │  │  │  ├─ attendance/
│  │  │  │  ├─ complaints/
│  │  │  │  ├─ salary/
│  │  │  │  ├─ documents/
│  │  │  │  └─ layout.tsx
│  │  │  ├─ (spoc)/
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ schedule/
│  │  │  │  ├─ attendance/
│  │  │  │  ├─ geo-verification/
│  │  │  │  ├─ trainers/
│  │  │  │  └─ layout.tsx
│  │  │  ├─ (trainer)/
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ schedule/
│  │  │  │  ├─ profile/
│  │  │  │  ├─ complaints/
│  │  │  │  └─ layout.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ loading.tsx
│  │  │  └─ providers.tsx
│  │  ├─ src/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ components/
│  │  │  │  │  ├─ hooks/
│  │  │  │  │  ├─ services/
│  │  │  │  │  ├─ schemas/
│  │  │  │  │  ├─ types/
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ companies/
│  │  │  │  ├─ trainers/
│  │  │  │  ├─ attendance/
│  │  │  │  ├─ schedules/
│  │  │  │  ├─ documents/
│  │  │  │  ├─ finance/
│  │  │  │  ├─ complaints/
│  │  │  │  ├─ notifications/
│  │  │  │  └─ chat/
│  │  │  ├─ shared/
│  │  │  │  ├─ ui/
│  │  │  │  ├─ hooks/
│  │  │  │  ├─ lib/
│  │  │  │  ├─ utils/
│  │  │  │  ├─ constants/
│  │  │  │  ├─ types/
│  │  │  │  └─ config/
│  │  │  ├─ stores/
│  │  │  └─ styles/
│  │  ├─ public/
│  │  ├─ tests/
│  │  │  ├─ unit/
│  │  │  ├─ integration/
│  │  │  └─ e2e/
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ api/
│     ├─ src/
│     │  ├─ app.ts
│     │  ├─ server.ts
│     │  ├─ config/
│     │  │  ├─ env.ts
│     │  │  ├─ logger.ts
│     │  │  ├─ db.ts
│     │  │  ├─ redis.ts
│     │  │  └─ upload.ts
│     │  ├─ modules/
│     │  │  ├─ auth/
│     │  │  │  ├─ auth.routes.ts
│     │  │  │  ├─ auth.controller.ts
│     │  │  │  ├─ auth.service.ts
│     │  │  │  ├─ auth.repository.ts
│     │  │  │  ├─ auth.schema.ts
│     │  │  │  ├─ auth.types.ts
│     │  │  │  └─ auth.mapper.ts
│     │  │  ├─ users/
│     │  │  ├─ companies/
│     │  │  ├─ colleges/
│     │  │  ├─ courses/
│     │  │  ├─ trainers/
│     │  │  ├─ attendance/
│     │  │  ├─ schedules/
│     │  │  ├─ documents/
│     │  │  ├─ finance/
│     │  │  ├─ complaints/
│     │  │  ├─ notifications/
│     │  │  └─ chat/
│     │  ├─ shared/
│     │  │  ├─ middleware/
│     │  │  │  ├─ auth.middleware.ts
│     │  │  │  ├─ rbac.middleware.ts
│     │  │  │  ├─ validate.middleware.ts
│     │  │  │  ├─ error.middleware.ts
│     │  │  │  └─ rate-limit.middleware.ts
│     │  │  ├─ utils/
│     │  │  ├─ errors/
│     │  │  ├─ response/
│     │  │  ├─ constants/
│     │  │  └─ types/
│     │  ├─ jobs/
│     │  │  ├─ queues/
│     │  │  ├─ workers/
│     │  │  └─ processors/
│     │  ├─ storage/
│     │  │  ├─ pdf/
│     │  │  ├─ uploads/
│     │  │  └─ drive/
│     │  └─ routes/
│     │     └─ index.ts
│     ├─ prisma/
│     │  ├─ schema.prisma
│     │  ├─ migrations/
│     │  └─ seed.ts
│     ├─ tests/
│     │  ├─ unit/
│     │  ├─ integration/
│     │  └─ api/
│     ├─ package.json
│     └─ tsconfig.json
│
├─ packages/
│  ├─ shared/
│  │  ├─ src/
│  │  │  ├─ dto/
│  │  │  ├─ enums/
│  │  │  ├─ schemas/
│  │  │  ├─ constants/
│  │  │  ├─ types/
│  │  │  └─ index.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  ├─ ui/
│  │  ├─ src/
│  │  │  ├─ button/
│  │  │  ├─ input/
│  │  │  ├─ modal/
│  │  │  ├─ table/
│  │  │  ├─ badge/
│  │  │  └─ index.ts
│  │  └─ package.json
│  └─ config/
│     ├─ eslint/
│     ├─ typescript/
│     └─ prettier/
│
├─ infra/
│  ├─ docker/
│  ├─ nginx/
│  ├─ scripts/
│  └─ ci/
│
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ workflows/
│  ├─ database/
│  └─ audits/
│
├─ .github/
│  └─ workflows/
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md`;

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 34;
const usableWidth = pageWidth - margin * 2;
let y = margin;

const ensureSpace = (height = 12) => {
  if (y + height > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
};

const writeLine = (line, style = "normal", size = 9) => {
  doc.setFont("courier", style);
  doc.setFontSize(size);
  const wrapped = doc.splitTextToSize(String(line), usableWidth);
  wrapped.forEach((chunk) => {
    ensureSpace(size + 3);
    doc.text(chunk, margin, y);
    y += size + 2;
  });
};

writeLine("MBK Platform - Proposed Monorepo Folder Structure", "bold", 12);
writeLine(`Generated: ${new Date().toISOString()}`, "normal", 8);
y += 8;

structureText.split("\n").forEach((line) => writeLine(line));

fs.writeFileSync(OUTPUT_FILE, Buffer.from(doc.output("arraybuffer")));
console.log(OUTPUT_FILE);

