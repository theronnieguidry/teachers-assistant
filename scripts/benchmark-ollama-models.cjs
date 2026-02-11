#!/usr/bin/env node
/**
 * Benchmarks local Ollama models for the Teacher's Assistant workload.
 *
 * Modes:
 * - Live mode: evaluates installed/pulled models via Ollama /api/generate
 * - Fixture mode: deterministic smoke output for CI/docs validation
 *
 * Usage:
 *   node scripts/benchmark-ollama-models.cjs --fixture --out docs/model-eval/fixture-results.json
 *   node scripts/benchmark-ollama-models.cjs --installed-only --out docs/model-eval/live-results.json
 *   node scripts/benchmark-ollama-models.cjs --auto-pull --models llama3.1:8b,qwen2.5:7b
 */

const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MAX_MODEL_GB = Number(process.env.OLLAMA_BENCH_MAX_MODEL_GB || 10);
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_BENCH_TIMEOUT_MS || 90000);

const CANDIDATES = [
  {
    model: "llama3.1:8b",
    family: "llama3.1",
    sizeGb: 4.9,
    context: "128K",
    notes: "Strong long-context instruction model.",
    source: "https://ollama.com/library/llama3.1/tags",
  },
  {
    model: "qwen2.5:7b",
    family: "qwen2.5",
    sizeGb: 4.7,
    context: "32K (card), supports up to 128K per model docs",
    notes: "Reliable JSON/instruction behavior.",
    source: "https://ollama.com/library/qwen2.5/tags",
  },
  {
    model: "qwen3:8b",
    family: "qwen3",
    sizeGb: 5.2,
    context: "40K",
    notes: "Strong quality, thinking-capable family requires explicit mode control.",
    source: "https://ollama.com/library/qwen3/tags",
  },
  {
    model: "deepseek-r1:8b",
    family: "deepseek-r1",
    sizeGb: 5.2,
    context: "128K",
    notes: "Reasoning-first family; thought-mode handling needed.",
    source: "https://ollama.com/library/deepseek-r1/tags",
  },
  {
    model: "gemma3:4b",
    family: "gemma3",
    sizeGb: 3.3,
    context: "128K",
    notes: "Very efficient; multimodal-capable family.",
    source: "https://ollama.com/library/gemma3/tags",
  },
  {
    model: "mistral:7b",
    family: "mistral",
    sizeGb: 4.4,
    context: "32K",
    notes: "Fast baseline model with broad adoption.",
    source: "https://ollama.com/library/mistral/tags",
  },
  {
    model: "llama3.2",
    family: "llama3.2",
    sizeGb: 2.0,
    context: "smaller context than selected long-context alternatives",
    notes: "Current project default; fast and small fallback.",
    source: "https://ollama.com/library/llama3.2",
  },
];

const TASKS = [
  {
    name: "worksheet_html",
    prompt:
      "Create a 2nd-grade math worksheet in complete HTML. Include exactly 8 numbered addition/subtraction questions, Name and Date lines, and printable inline CSS. Return HTML only.",
    evaluate: (text) => {
      let score = 0;
      if (/<!doctype html>/i.test(text) || /<html/i.test(text)) score += 35;
      if (/name\s*:/i.test(text) && /date\s*:/i.test(text)) score += 20;
      const questionMatches = text.match(/\b([1-8])\.\s/g) || [];
      score += Math.min(30, questionMatches.length * 4);
      if (!/```/.test(text)) score += 15;
      return Math.min(100, score);
    },
  },
  {
    name: "lesson_plan_structure",
    prompt:
      "Generate a concise 30-minute grade 3 science lesson plan in HTML with sections: Learning Objectives, Materials Needed, Warm-Up Activity, Direct Instruction, Guided Practice, Independent Practice, Closure, Differentiation, Assessment. Return HTML only.",
    evaluate: (text) => {
      const sections = [
        "Learning Objectives",
        "Materials Needed",
        "Warm-Up Activity",
        "Direct Instruction",
        "Guided Practice",
        "Independent Practice",
        "Closure",
        "Differentiation",
        "Assessment",
      ];
      let score = 0;
      if (/<html/i.test(text)) score += 20;
      for (const section of sections) {
        if (new RegExp(section, "i").test(text)) score += 8;
      }
      if (!/```/.test(text)) score += 8;
      return Math.min(100, score);
    },
  },
  {
    name: "prompt_polish",
    prompt:
      "Teacher request: \"fractions worksheet\". Rewrite into 2-4 clear sentences for grade 4 with specific objectives, real-world context, and age-appropriate language. Return polished prompt text only.",
    evaluate: (text) => {
      let score = 0;
      const sentenceCount = (text.match(/[.!?](\s|$)/g) || []).length;
      if (sentenceCount >= 2 && sentenceCount <= 5) score += 40;
      if (/grade 4|4th grade|fraction/i.test(text)) score += 20;
      if (/real[- ]world|everyday|context/i.test(text)) score += 20;
      if (text.length > 60 && text.length < 800) score += 20;
      return Math.min(100, score);
    },
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--fixture") out.fixture = true;
    if (arg === "--installed-only") out.installedOnly = true;
    if (arg === "--auto-pull") out.autoPull = true;
    if (arg === "--out") out.out = args[++i];
    if (arg === "--models") out.models = args[++i].split(",").map((m) => m.trim()).filter(Boolean);
  }
  return out;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}`);
  }
  return response.json();
}

async function listInstalledModels() {
  try {
    const data = await fetchJson(`${OLLAMA_BASE_URL}/api/tags`);
    return (data.models || []).map((m) => m.name);
  } catch {
    return [];
  }
}

function pullModel(model) {
  const result = spawnSync("ollama", ["pull", model], { stdio: "inherit" });
  return result.status === 0;
}

async function generate(model, prompt) {
  const startedAt = Date.now();
  const response = await fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  return {
    text: (response.response || "").trim(),
    elapsedMs: Date.now() - startedAt,
    evalCount: response.eval_count || null,
    promptEvalCount: response.prompt_eval_count || null,
  };
}

function weightedOverall(taskResults) {
  if (!taskResults.length) return 0;
  const qualityAvg = taskResults.reduce((sum, t) => sum + t.score, 0) / taskResults.length;
  const latencyAvg = taskResults.reduce((sum, t) => sum + t.elapsedMs, 0) / taskResults.length;
  const latencyPenalty = Math.min(25, latencyAvg / 2500);
  return Number((qualityAvg - latencyPenalty).toFixed(2));
}

function fixtureResults(candidates) {
  const table = {
    "llama3.1:8b": { quality: 92, latencyMs: 7100 },
    "qwen2.5:7b": { quality: 88, latencyMs: 6400 },
    "qwen3:8b": { quality: 78, latencyMs: 7700 },
    "deepseek-r1:8b": { quality: 74, latencyMs: 9200 },
    "gemma3:4b": { quality: 84, latencyMs: 5200 },
    "mistral:7b": { quality: 72, latencyMs: 5000 },
    "llama3.2": { quality: 77, latencyMs: 3900 },
  };

  return candidates.map((candidate) => {
    const baseline = table[candidate.model] || { quality: 50, latencyMs: 6000 };
    const taskResults = TASKS.map((task) => ({
      task: task.name,
      score: baseline.quality,
      elapsedMs: baseline.latencyMs,
      outputChars: 1200,
      evalCount: null,
      promptEvalCount: null,
      mode: "fixture",
    }));

    return {
      model: candidate.model,
      family: candidate.family,
      sizeGb: candidate.sizeGb,
      context: candidate.context,
      taskResults,
      overall: Number((baseline.quality - Math.min(25, baseline.latencyMs / 2500)).toFixed(2)),
      qualityAvg: baseline.quality,
      latencyAvgMs: baseline.latencyMs,
      mode: "fixture",
    };
  });
}

async function run() {
  const args = parseArgs();
  const requestedModels = new Set(args.models || []);

  let candidates = CANDIDATES.filter((c) => c.sizeGb <= MAX_MODEL_GB);
  if (requestedModels.size) {
    candidates = candidates.filter((c) => requestedModels.has(c.model));
  }

  const installed = await listInstalledModels();
  const installedSet = new Set(installed);

  const system = {
    generatedAt: new Date().toISOString(),
    hostname: os.hostname(),
    platform: process.platform,
    totalMemoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(1)),
    maxModelGb: MAX_MODEL_GB,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    fixture: Boolean(args.fixture),
    installedModels: installed,
  };

  let results = [];

  if (args.fixture) {
    results = fixtureResults(candidates);
  } else {
    for (const candidate of candidates) {
      const model = candidate.model;
      const hasModel = installedSet.has(model);

      if (!hasModel && args.installedOnly) {
        results.push({
          model,
          family: candidate.family,
          sizeGb: candidate.sizeGb,
          context: candidate.context,
          skipped: true,
          reason: "not installed (--installed-only)",
          mode: "live",
        });
        continue;
      }

      if (!hasModel && args.autoPull) {
        const pulled = pullModel(model);
        if (!pulled) {
          results.push({
            model,
            family: candidate.family,
            sizeGb: candidate.sizeGb,
            context: candidate.context,
            skipped: true,
            reason: "pull failed",
            mode: "live",
          });
          continue;
        }
      }

      const taskResults = [];
      for (const task of TASKS) {
        try {
          const generated = await generate(model, task.prompt);
          const score = task.evaluate(generated.text);
          taskResults.push({
            task: task.name,
            score,
            elapsedMs: generated.elapsedMs,
            outputChars: generated.text.length,
            evalCount: generated.evalCount,
            promptEvalCount: generated.promptEvalCount,
            mode: "live",
          });
        } catch (error) {
          taskResults.push({
            task: task.name,
            score: 0,
            elapsedMs: REQUEST_TIMEOUT_MS,
            outputChars: 0,
            evalCount: null,
            promptEvalCount: null,
            error: error instanceof Error ? error.message : String(error),
            mode: "live",
          });
        }
      }

      const qualityAvg = Number(
        (taskResults.reduce((sum, row) => sum + row.score, 0) / taskResults.length).toFixed(2)
      );
      const latencyAvgMs = Number(
        (taskResults.reduce((sum, row) => sum + row.elapsedMs, 0) / taskResults.length).toFixed(2)
      );

      results.push({
        model,
        family: candidate.family,
        sizeGb: candidate.sizeGb,
        context: candidate.context,
        taskResults,
        overall: weightedOverall(taskResults),
        qualityAvg,
        latencyAvgMs,
        mode: "live",
      });
    }
  }

  const ranked = [...results]
    .filter((r) => !r.skipped)
    .sort((a, b) => (b.overall || 0) - (a.overall || 0));

  const summary = {
    recommendedPrimary: ranked[0]?.model || null,
    recommendedFallbacks: ranked.slice(1, 4).map((r) => r.model),
    evaluatedCount: ranked.length,
    skippedCount: results.filter((r) => r.skipped).length,
  };

  const payload = { system, summary, results, ranked };

  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify(payload, null, 2));
    console.log(`Wrote benchmark output: ${args.out}`);
  }

  console.log(JSON.stringify(payload, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
