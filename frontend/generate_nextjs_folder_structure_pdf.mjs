import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "NextJS_Folder_Structure.pdf");
const MAX_DEPTH = 6;
const MAX_ENTRIES_PER_DIR = 80;

const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "coverage",
  ".vscode",
]);

const IMPORTANT_ROOT_FILES = [
  "package.json",
  "next.config.mjs",
  "jsconfig.json",
  "middleware.mjs",
  "tailwind.config.js",
  "postcss.config.mjs",
  "README.md",
];

const sortEntries = (entries) =>
  entries.sort((left, right) => {
    const leftDir = left.isDirectory();
    const rightDir = right.isDirectory();
    if (leftDir !== rightDir) return leftDir ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

const safeReadDir = (dirPath) => {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
};

const buildTreeLines = (basePath, label, maxDepth = MAX_DEPTH) => {
  const lines = [label];

  const walk = (currentPath, prefix, depth) => {
    if (depth > maxDepth) {
      lines.push(`${prefix}\\-- ...`);
      return;
    }

    let entries = safeReadDir(currentPath).filter((entry) => {
      if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".env.production") {
        return false;
      }
      if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) return false;
      return true;
    });

    entries = sortEntries(entries);

    if (entries.length > MAX_ENTRIES_PER_DIR) {
      const visibleEntries = entries.slice(0, MAX_ENTRIES_PER_DIR);
      const hiddenCount = entries.length - visibleEntries.length;
      entries = visibleEntries;
      entries.push({
        name: `... (${hiddenCount} more)`,
        isDirectory: () => false,
      });
    }

    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "\\-- " : "+-- ";
      const nextPrefix = isLast ? `${prefix}    ` : `${prefix}|   `;
      const isDir = entry.isDirectory();
      const name = isDir ? `${entry.name}/` : entry.name;
      lines.push(`${prefix}${connector}${name}`);

      if (isDir) {
        walk(path.join(currentPath, entry.name), nextPrefix, depth + 1);
      }
    });
  };

  walk(basePath, "", 1);
  return lines;
};

const buildImportantRootSection = () => {
  const lines = ["Important Root Files"];
  IMPORTANT_ROOT_FILES.forEach((fileName) => {
    const exists = fs.existsSync(path.join(ROOT, fileName));
    lines.push(`${exists ? "+--" : "\\--"} ${fileName}${exists ? "" : " (missing)"}`);
  });
  return lines;
};

const sections = [];
sections.push([
  "Next.js Folder Structure Documentation",
  `Generated: ${new Date().toISOString()}`,
  `Project Root: ${ROOT}`,
  "",
  "This document is auto-generated from the current workspace.",
  "Ignored directories: .git, .next, node_modules, dist, coverage, .vscode",
]);

sections.push(buildImportantRootSection());

const appPath = path.join(ROOT, "app");
if (fs.existsSync(appPath)) {
  sections.push(buildTreeLines(appPath, "app/ (App Router)"));
}

const srcPath = path.join(ROOT, "src");
if (fs.existsSync(srcPath)) {
  sections.push(buildTreeLines(srcPath, "src/"));
}

const publicPath = path.join(ROOT, "public");
if (fs.existsSync(publicPath)) {
  sections.push(buildTreeLines(publicPath, "public/"));
}

const doc = new jsPDF({ unit: "pt", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 36;
const usableWidth = pageWidth - margin * 2;
let y = margin;

const ensureSpace = (height = 14) => {
  if (y + height > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
};

const writeLine = (line, font = "courier", style = "normal", size = 9) => {
  doc.setFont(font, style);
  doc.setFontSize(size);
  const wrapped = doc.splitTextToSize(String(line), usableWidth);
  wrapped.forEach((chunk) => {
    ensureSpace(size + 4);
    doc.text(chunk, margin, y);
    y += size + 3;
  });
};

sections.forEach((section, sectionIndex) => {
  if (sectionIndex > 0) {
    ensureSpace(20);
    y += 8;
  }

  section.forEach((line, lineIndex) => {
    if (sectionIndex === 0 && lineIndex === 0) {
      writeLine(line, "helvetica", "bold", 16);
      return;
    }

    if (line.endsWith("/") || line === "Important Root Files" || line.includes("(App Router)")) {
      writeLine(line, "helvetica", "bold", 11);
      return;
    }

    writeLine(line);
  });
});

fs.writeFileSync(OUTPUT_FILE, Buffer.from(doc.output("arraybuffer")));
console.log(OUTPUT_FILE);

