import { test, expect } from "@playwright/test";

const stagingApiUrl = process.env.STAGING_API_URL;
const stagingApiToken = process.env.STAGING_API_TOKEN;

test.describe("Staging API smoke", () => {
  test("health and estimate endpoints respond correctly", async ({ request }) => {
    test.skip(
      !stagingApiUrl || !stagingApiToken,
      "Set STAGING_API_URL and STAGING_API_TOKEN to run staging smoke."
    );

    const healthResponse = await request.get(new URL("/health", stagingApiUrl).toString());
    expect(healthResponse.ok()).toBe(true);
    const healthPayload = await healthResponse.json();
    expect(healthPayload.status).toBe("ok");

    const estimateResponse = await request.post(new URL("/estimate", stagingApiUrl).toString(), {
      headers: {
        Authorization: `Bearer ${stagingApiToken}`,
      },
      data: {
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
      },
    });

    expect(estimateResponse.ok()).toBe(true);
    const estimatePayload = await estimateResponse.json();
    expect(typeof estimatePayload?.estimate?.expectedCredits).toBe("number");
    expect(estimatePayload.estimate.expectedCredits).toBeGreaterThan(0);
  });
});
