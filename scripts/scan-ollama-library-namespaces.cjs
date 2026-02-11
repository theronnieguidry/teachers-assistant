#!/usr/bin/env node
/**
 * Fetches Ollama's public library page and extracts all model namespace slugs.
 *
 * Usage:
 *   node scripts/scan-ollama-library-namespaces.cjs
 *   node scripts/scan-ollama-library-namespaces.cjs --out docs/model-eval/ollama-library-namespace-scan-2026-02-11.json
 */

const fs = require("node:fs");

const LIBRARY_URL = "https://ollama.com/library";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out") out.out = args[++i];
  }

  return out;
}

function extractNamespaces(html) {
  const matches = html.match(/\/library\/([a-zA-Z0-9._-]+)/g) || [];
  const namespaces = new Set();

  for (const match of matches) {
    const slug = match.replace("/library/", "");
    if (!slug) continue;
    namespaces.add(slug);
  }

  return Array.from(namespaces).sort((a, b) => a.localeCompare(b));
}

async function run() {
  const args = parseArgs();
  const response = await fetch(LIBRARY_URL, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${LIBRARY_URL}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const namespaces = extractNamespaces(html);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceUrl: LIBRARY_URL,
    totalNamespaces: namespaces.length,
    namespaces,
  };

  const formatted = `${JSON.stringify(payload, null, 2)}\n`;

  if (args.out) {
    fs.writeFileSync(args.out, formatted, "utf8");
    console.log(`Wrote namespace scan: ${args.out} (${payload.totalNamespaces} namespaces)`);
    return;
  }

  process.stdout.write(formatted);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
