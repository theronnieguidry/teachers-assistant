#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const defaultTargets = ["dist", "src-tauri/target/release/bundle"];
const targets = process.argv.slice(2);
const scanTargets = targets.length > 0 ? targets : defaultTargets;

const textExtensions = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".txt",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
]);

const secretPatterns = [
  { name: "OpenAI key", regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: "Stripe secret key", regex: /sk_(live|test)_[A-Za-z0-9]{16,}/g },
  { name: "Stripe restricted key", regex: /rk_(live|test)_[A-Za-z0-9]{16,}/g },
  { name: "Supabase service role key var", regex: /SUPABASE_SERVICE_ROLE_KEY/g },
  { name: "OpenAI key var", regex: /OPENAI_API_KEY/g },
  { name: "Stripe secret var", regex: /STRIPE_SECRET_KEY/g },
  { name: "Pixabay key var", regex: /PIXABAY_API_KEY/g },
];

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.has(ext);
}

function walkFiles(dirPath, out = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function findLineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

const findings = [];
let scannedFiles = 0;

for (const target of scanTargets) {
  if (!fs.existsSync(target)) {
    continue;
  }

  const files = walkFiles(target).filter(isTextFile);
  for (const file of files) {
    scannedFiles += 1;
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const pattern of secretPatterns) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(content);
      if (match) {
        findings.push({
          file,
          pattern: pattern.name,
          match: match[0],
          line: findLineNumber(content, match.index),
        });
      }
    }
  }
}

if (scannedFiles === 0) {
  console.log("[scan-artifact-secrets] No target files found to scan.");
  process.exit(0);
}

if (findings.length > 0) {
  console.error("[scan-artifact-secrets] Potential secret leakage detected:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.pattern}] ${finding.match.slice(0, 80)}`
    );
  }
  process.exit(1);
}

console.log(`[scan-artifact-secrets] OK - scanned ${scannedFiles} files with no matches.`);
