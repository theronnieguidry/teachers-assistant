import { test, expect } from "@playwright/test";

const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

test.describe("Inspiration Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Supabase auth API calls
    await page.route("**/auth/v1/token**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    // Mock credits endpoint
    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ balance: 50, lifetime_granted: 50, lifetime_used: 0 }]),
      });
    });

    // Mock inspiration_items endpoint for GET (fetch) and POST (add)
    let inspirationItems: Array<{
      id: string;
      user_id: string;
      type: string;
      title: string;
      source_url: string | null;
      content: string | null;
      storage_path: string | null;
      created_at: string;
    }> = [];
    let itemCounter = 1;

    await page.route("**/rest/v1/inspiration_items**", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(inspirationItems),
        });
      } else if (method === "POST") {
        const body = route.request().postDataJSON();
        const newItem = {
          id: `mock-item-${itemCounter++}`,
          user_id: body.user_id || "test-user-id",
          type: body.type,
          title: body.title,
          source_url: body.source_url,
          content: body.content,
          storage_path: body.storage_path,
          created_at: new Date().toISOString(),
        };
        inspirationItems.unshift(newItem);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newItem),
        });
      } else if (method === "DELETE") {
        // Extract ID from URL
        const url = route.request().url();
        const idMatch = url.match(/id=eq\.([^&]+)/);
        if (idMatch) {
          inspirationItems = inspirationItems.filter((item) => item.id !== idMatch[1]);
        }
        await route.fulfill({
          status: 204,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.continue();
      }
    });

    // Set up mock auth state
    await page.addInitScript(() => {
      localStorage.setItem(
        "sb-ugvrangptgrojipazqxh-auth-token",
        JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_at: Date.now() + 3600000,
          user: {
            id: "test-user-id",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
          },
        })
      );
    });
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });
  });

  test("INSP-001: should show Inspiration panel title", async ({ page }) => {
    await expect(page.getByText("Design Inspiration")).toBeVisible();
  });

  test("INSP-002: should show Add URL button", async ({ page }) => {
    // The button has a Plus icon and title="Add URL"
    const addButton = page.locator('button[title="Add URL"]');
    await expect(addButton).toBeVisible();
  });

  test("INSP-003: should show drop zone area", async ({ page }) => {
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-004: should show empty state initially", async ({ page }) => {
    // The drop zone message is the empty state
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-005: Add URL button opens prompt dialog", async ({ page }) => {
    // Mock window.prompt to return a URL - use evaluate right before interaction
    await page.evaluate(() => {
      (window as Window).prompt = (): string => "https://example.com";
    });

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Wait a moment for the async addItem to complete
    await page.waitForTimeout(500);

    // After dialog is accepted, item should appear
    await expect(page.getByText("example.com")).toBeVisible({ timeout: 5000 });
  });

  test("INSP-006: can enter a URL and see it in the list", async ({ page }) => {
    // Mock window.prompt to return a URL
    await page.evaluate(() => {
      window.prompt = () => "https://math-resources.edu";
    });

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should see the URL hostname in the list
    await expect(page.getByText("math-resources.edu")).toBeVisible();
  });

  test("INSP-007: can remove an inspiration item", async ({ page }) => {
    // Mock window.prompt to return a URL
    await page.evaluate(() => {
      window.prompt = () => "https://example.com";
    });

    // First add a URL
    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Verify item is added
    await expect(page.getByText("example.com")).toBeVisible();

    // Hover over the item to reveal the remove button
    await page.getByText("example.com").hover();

    // Click remove button (X icon)
    const removeButton = page.locator("button").filter({ has: page.locator('svg.lucide-x') });
    await removeButton.click();

    // Item should be removed
    await expect(page.getByText("example.com")).not.toBeVisible();
  });

  test("INSP-008: shows item count when items added", async ({ page }) => {
    // Mock window.prompt to return a URL
    await page.evaluate(() => {
      window.prompt = () => "https://example.com";
    });

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should show "1 item selected"
    await expect(page.getByText("1 item selected")).toBeVisible();
  });

  test("INSP-009: dismissing URL prompt doesn't add item", async ({ page }) => {
    // Mock window.prompt to return null (user cancelled)
    await page.evaluate(() => {
      window.prompt = () => null;
    });

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should still show empty state
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-010: shows 'Drop more files' text after adding item", async ({ page }) => {
    // Mock window.prompt to return a URL
    await page.evaluate(() => {
      window.prompt = () => "https://example.com";
    });

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should show "Drop more files here"
    await expect(page.getByText("Drop more files here")).toBeVisible();
  });
});
