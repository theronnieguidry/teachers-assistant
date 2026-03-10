import { test, expect, type Page, type Response } from "@playwright/test";

const TEST_EMAIL = "ronnie.guidry+ta@gmail.com";
const TEST_PASSWORD = "QaTest123!";
const BASE_URL = "http://localhost:1420";
const PREMIUM_MODEL = "gpt-4.1";
const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

type ProviderUnderTest = "premium" | "local";

interface CapturedVersionResponse {
  url: string;
  body: string;
}

interface ProviderRunResult {
  provider: ProviderUnderTest;
  title: string;
  projectId: string;
  versionId: string;
  requestBody: Record<string, unknown>;
  savedVersion: Record<string, unknown>;
  elapsedSeconds: number;
}

function isGenerateRequest(url: string, method: string) {
  return url.includes("/generate") && method === "POST";
}

function isProjectVersionsResponse(response: Response) {
  return (
    response.url().includes("/rest/v1/project_versions") &&
    response.request().method() === "GET"
  );
}

function parseSseCompleteEvent(body: string) {
  let completeEvent: Record<string, unknown> | null = null;

  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;

    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === "complete" && event.result) {
        completeEvent = event.result as Record<string, unknown>;
      }
    } catch {
      // Ignore non-JSON lines from the stream.
    }
  }

  if (
    !completeEvent ||
    typeof completeEvent.projectId !== "string" ||
    typeof completeEvent.versionId !== "string"
  ) {
    throw new Error("Generation stream completed without a usable complete event");
  }

  return {
    projectId: completeEvent.projectId,
    versionId: completeEvent.versionId,
  };
}

async function dismissFirstRunOllamaDialog(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("ta-ollama-setup-seen", "true");
  });

  const dialog = page.getByRole("dialog", { name: "Local AI Setup" });
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  }
}

async function login(page: Page) {
  await page.goto(BASE_URL);
  await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 15000 });

  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByText("What are we creating today?")).toBeVisible({
    timeout: 30000,
  });

  await dismissFirstRunOllamaDialog(page);
}

async function openWizard(page: Page, prompt: string) {
  const promptArea = page.getByPlaceholder(
    /describe|create|what would you like/i
  );
  const createButton = page.getByRole("button", { name: /^Create$/i });

  await promptArea.fill(prompt);
  await expect(createButton).toBeEnabled({ timeout: 10000 });
  await createButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  return dialog;
}

async function configureStepOne(page: Page, title: string) {
  const dialog = page.getByRole("dialog");
  const titleInput = dialog.getByLabel(/project title/i);
  await titleInput.fill(title);

  const subjectTrigger = dialog.locator('[role="combobox"]').nth(1);
  await subjectTrigger.click();
  await page.getByRole("option", { name: "Math" }).click();

  const formatTrigger = dialog.locator('[role="combobox"]').nth(2);
  await formatTrigger.click();
  await page.getByRole("option", { name: "Worksheet Only" }).click();

  await dialog.getByLabel(/number of questions/i).fill("5");

  const visualsCheckbox = dialog.getByRole("checkbox", {
    name: /include images\/illustrations/i,
  });
  if (await visualsCheckbox.isChecked()) {
    await visualsCheckbox.click();
  }

  const answerKeyCheckbox = dialog.getByRole("checkbox", {
    name: /generate answer key/i,
  });
  if (await answerKeyCheckbox.isChecked()) {
    await answerKeyCheckbox.click();
  }

  await dialog.getByRole("button", { name: "Next" }).click();
}

async function configureProviderStep(page: Page, provider: ProviderUnderTest) {
  const dialog = page.getByRole("dialog");
  const providerLabel =
    provider === "premium"
      ? "Select Premium AI as AI provider"
      : "Select Local AI as AI provider";

  const providerCard = dialog.getByRole("button", { name: providerLabel });
  await providerCard.click();
  await expect(providerCard).toHaveAttribute("aria-pressed", "true");

  if (provider === "local") {
    const modelCombobox = dialog.locator('[role="combobox"]').last();
    await expect(modelCombobox).toBeVisible({ timeout: 30000 });

    let selectedModel = (await modelCombobox.textContent())?.trim() ?? "";
    if (!selectedModel || /select a model/i.test(selectedModel)) {
      await modelCombobox.click();
      const firstOption = page.getByRole("option").first();
      await expect(firstOption).toBeVisible({ timeout: 10000 });
      selectedModel = (await firstOption.textContent())?.trim() ?? "";
      await firstOption.click();
      await expect(modelCombobox).toContainText(selectedModel);
    }
  }

  const nextButton = dialog.getByRole("button", { name: "Next" });
  await expect(nextButton).toBeEnabled({ timeout: 30000 });
  await nextButton.click();
}

async function waitForSavedVersion(
  page: Page,
  responses: CapturedVersionResponse[],
  projectId: string,
  versionId: string
) {
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    const match = responses.find((response) => {
      if (!response.body) return false;
      return (
        response.body.includes(versionId) &&
        response.body.includes(projectId)
      );
    });

    if (match) {
      return JSON.parse(match.body) as Record<string, unknown>;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for saved project version ${versionId}`);
}

async function waitForProjectRow(page: Page, title: string) {
  const row = page.locator(".group").filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 30000 });
  return row;
}

async function waitForGenerationOutcome(page: Page) {
  const successHeading = page.getByRole("heading", { name: "Generation Complete!" });
  const failureHeading = page.getByRole("heading", { name: "Generation Failed" });

  const outcome = await Promise.race([
    successHeading
      .waitFor({ state: "visible", timeout: GENERATION_TIMEOUT_MS })
      .then(() => "success" as const),
    failureHeading
      .waitFor({ state: "visible", timeout: GENERATION_TIMEOUT_MS })
      .then(() => "failure" as const),
  ]);

  if (outcome === "failure") {
    const dialog = page.getByRole("dialog");
    const message =
      (await dialog.locator("p").first().textContent().catch(() => null))?.trim() ||
      "Unknown generation error";
    throw new Error(`Generation failed in UI: ${message}`);
  }
}

async function runGenerationForProvider(
  page: Page,
  provider: ProviderUnderTest,
  title: string,
  versionResponses: CapturedVersionResponse[]
) {
  const prompt =
    provider === "premium"
      ? "Create a 2nd grade math worksheet about adding numbers up to 10."
      : "Create a simple 2nd grade math worksheet about adding numbers up to 10.";

  const startedAt = Date.now();
  const dialog = await openWizard(page, prompt);

  await configureStepOne(page, title);
  await expect(page.getByText(/select inspiration items/i)).toBeVisible({
    timeout: 10000,
  });
  await dialog.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByText("AI Provider")).toBeVisible({ timeout: 10000 });
  await configureProviderStep(page, provider);

  await expect(page.getByText("Output Folder")).toBeVisible({ timeout: 10000 });
  await page
    .getByPlaceholder(/select or enter a folder path/i)
    .fill(`C:\\Temp\\TA-QA\\${title.replace(/[^A-Za-z0-9-]/g, "-")}`);
  await dialog.getByRole("button", { name: "Next" }).click();

  await page.waitForSelector(
    '[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]',
    { timeout: 10000 }
  );

  const requestPromise = page.waitForRequest((request) =>
    isGenerateRequest(request.url(), request.method())
  );
  const responsePromise = page.waitForResponse((response) =>
    isGenerateRequest(response.url(), response.request().method())
  );

  await dialog.getByRole("button", { name: "Continue" }).click();

  if (provider === "premium") {
    await expect(
      page.getByRole("heading", { name: "Review Credit Estimate" })
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Generate Now" }).click();
  }

  const generateRequest = await requestPromise;
  const requestBody = generateRequest.postDataJSON() as Record<string, unknown>;
  expect(requestBody.aiProvider).toBe(provider);

  const generateResponse = await responsePromise;

  await waitForGenerationOutcome(page);
  await generateResponse.finished();

  const completeEvent = parseSseCompleteEvent(await generateResponse.text());

  const savedVersion = await waitForSavedVersion(
    page,
    versionResponses,
    completeEvent.projectId,
    completeEvent.versionId
  );

  expect(savedVersion.id).toBe(completeEvent.versionId);
  expect(savedVersion.project_id).toBe(completeEvent.projectId);
  expect(savedVersion.ai_provider).toBe(provider);

  if (provider === "premium") {
    expect(savedVersion.ai_model).toBe(PREMIUM_MODEL);
  } else {
    expect(requestBody.aiModel).toBeTruthy();
    expect(savedVersion.ai_model).toBe(requestBody.aiModel);
  }

  await page.getByRole("button", { name: "View Project" }).click();
  await waitForProjectRow(page, title);

  return {
    provider,
    title,
    projectId: completeEvent.projectId,
    versionId: completeEvent.versionId,
    requestBody,
    savedVersion,
    elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
  } satisfies ProviderRunResult;
}

async function deleteProjectByTitle(page: Page, title: string) {
  const row = page.locator(".group").filter({ hasText: title }).first();
  if (!(await row.isVisible().catch(() => false))) {
    return;
  }

  await row.hover();
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await row.locator("button[title='Delete']").click();
  await expect(row).not.toBeVisible({ timeout: 10000 });
}

async function verifyProjectActions(page: Page, title: string) {
  const row = await waitForProjectRow(page, title);
  await row.hover();

  await expect(row.locator("button[title='Regenerate']")).toBeVisible();
  await expect(row.locator("button[title='Duplicate']")).toBeVisible();
  await expect(row.locator("button[title='Delete']")).toBeVisible();

  await row.locator("button[title='Regenerate']").click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel(/project title/i)).toHaveValue(title);
  await page.getByRole("button", { name: "Close" }).first().click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });

  await row.hover();
  await row.locator("button[title='Duplicate']").click();
  const duplicateTitle = `${title} (Copy)`;
  await waitForProjectRow(page, duplicateTitle);
  await deleteProjectByTitle(page, duplicateTitle);
}

async function signOut(page: Page) {
  await page.getByTitle("Sign out").click();
  await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 15000 });
}

test.describe("Full E2E QA Test", () => {
  test.setTimeout(25 * 60 * 1000);

  test("Complete application workflow with premium and local AI", async ({
    page,
  }) => {
    test.skip(!!process.env.CI, "Requires live auth and live generation services");

    const versionResponses: CapturedVersionResponse[] = [];
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("response", (response) => {
      if (!isProjectVersionsResponse(response)) return;

      void response
        .text()
        .then((body) => {
          versionResponses.push({ url: response.url(), body });
        })
        .catch(() => {
          // Ignore body read failures for non-essential logging.
        });
    });

    await login(page);

    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Design Inspiration" })
    ).toBeVisible();

    const runId = new Date().toISOString().replace(/[-:.TZ]/g, "");
    const createdTitles = [
      `QA ${runId} - Premium`,
      `QA ${runId} - Local`,
    ];

    const results = [
      await runGenerationForProvider(
        page,
        "premium",
        createdTitles[0],
        versionResponses
      ),
      await runGenerationForProvider(
        page,
        "local",
        createdTitles[1],
        versionResponses
      ),
    ];

    await verifyProjectActions(page, createdTitles[0]);

    for (const result of results) {
      console.log(
        `[qa-full] ${result.provider} completed in ${result.elapsedSeconds}s using model ${String(
          result.savedVersion.ai_model
        )}`
      );
    }

    await deleteProjectByTitle(page, createdTitles[0]);
    await deleteProjectByTitle(page, createdTitles[1]);
    await signOut(page);

    expect(pageErrors).toEqual([]);
  });
});
