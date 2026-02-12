#!/usr/bin/env node

const apiBaseUrl = process.env.API_BASE_URL;
const apiBearerToken = process.env.API_BEARER_TOKEN;
const smokeLabel = process.env.SMOKE_LABEL || "cloud-run";
const requireAuthSmoke = process.env.REQUIRE_AUTH_SMOKE !== "false";

function fail(message) {
  console.error(`[smoke-api] ${message}`);
  process.exit(1);
}

function toUrl(pathname) {
  return new URL(pathname, apiBaseUrl).toString();
}

async function run() {
  if (!apiBaseUrl) {
    fail("Missing API_BASE_URL.");
  }

  console.log(`[smoke-api] Running ${smokeLabel} smoke checks against ${apiBaseUrl}`);

  const healthResponse = await fetch(toUrl("/health"));
  if (!healthResponse.ok) {
    fail(`/health failed with status ${healthResponse.status}.`);
  }

  const healthBody = await healthResponse.json();
  if (healthBody.status !== "ok") {
    fail(`/health returned unexpected payload: ${JSON.stringify(healthBody)}`);
  }

  console.log("[smoke-api] /health passed");

  if (!apiBearerToken) {
    if (requireAuthSmoke) {
      fail("Missing API_BEARER_TOKEN for authenticated /estimate smoke.");
    }

    console.log("[smoke-api] Skipping /estimate because API_BEARER_TOKEN is missing.");
    return;
  }

  const estimateResponse = await fetch(toUrl("/estimate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiBearerToken}`,
    },
    body: JSON.stringify({
      grade: "3",
      subject: "math",
      options: {
        format: "worksheet",
        questionCount: 5,
        includeAnswerKey: true,
      },
      visualSettings: {
        includeVisuals: false,
      },
      generationMode: "standard",
    }),
  });

  if (!estimateResponse.ok) {
    const bodyText = await estimateResponse.text();
    fail(`/estimate failed with status ${estimateResponse.status}: ${bodyText}`);
  }

  const estimateBody = await estimateResponse.json();
  if (
    !estimateBody?.estimate ||
    typeof estimateBody.estimate.expectedCredits !== "number"
  ) {
    fail(`/estimate returned unexpected payload: ${JSON.stringify(estimateBody)}`);
  }

  console.log(
    `[smoke-api] /estimate passed (expectedCredits=${estimateBody.estimate.expectedCredits})`
  );
  console.log("[smoke-api] Smoke checks passed.");
}

run().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
