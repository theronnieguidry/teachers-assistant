import { GenerationApiError } from "./generation-api";
import { resolveApiUrl } from "@/services/api-endpoint-resolver";

export type CheckoutErrorCode =
  | "credit_packs_table_missing"
  | "credit_packs_unavailable"
  | "stripe_pack_not_configured"
  | "stripe_not_configured"
  | "stripe_mode_mismatch"
  | "checkout_packs_query_failed"
  | "stripe_runtime_error"
  | "checkout_internal_error";

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  priceDisplay: string;
}

export interface Purchase {
  id: string;
  amountCents: number;
  creditsGranted: number;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  packName?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export type CreditLedgerEntryType =
  | "reserve"
  | "deduct"
  | "refund"
  | "purchase"
  | "grant";

export interface CreditLedgerEntry {
  id: string;
  amount: number;
  type: CreditLedgerEntryType;
  description: string;
  createdAt: string;
  projectId: string | null;
}

interface CheckoutErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

function mapCreditPacksErrorMessage(
  code: string | undefined,
  payload: CheckoutErrorPayload
): string {
  switch (code) {
    case "credit_packs_table_missing":
      return "Billing setup is incomplete on this server. Credit packs are not available yet.";
    case "credit_packs_unavailable":
      return "No credit packs are currently available for this environment.";
    case "stripe_pack_not_configured":
      return "Purchases are not configured yet for this environment.";
    case "stripe_not_configured":
      return "Payments are currently unavailable because Stripe is not configured.";
    case "stripe_mode_mismatch":
      return "Payments are temporarily unavailable due to a billing configuration mismatch.";
    default:
      return (
        payload.message || payload.error || "Failed to fetch credit packs"
      );
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit,
  accessToken: string
): Promise<Response> {
  const response = await fetch(resolveApiUrl(endpoint), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  return response;
}

/**
 * Get available credit packs for purchase
 */
export async function getCreditPacks(
  accessToken: string
): Promise<CreditPack[]> {
  const response = await fetchWithAuth(
    "/checkout/packs",
    { method: "GET" },
    accessToken
  );

  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({}))) as CheckoutErrorPayload;
    const code =
      typeof error.code === "string"
        ? (error.code as CheckoutErrorCode)
        : undefined;

    throw new GenerationApiError(
      mapCreditPacksErrorMessage(code, error),
      response.status,
      {
        ...error,
        code,
      }
    );
  }

  const data = await response.json();
  return data.packs;
}

/**
 * Create a Stripe Checkout session for purchasing a credit pack
 * Returns the checkout URL to redirect the user to
 */
export async function createCheckoutSession(
  packId: string,
  accessToken: string
): Promise<CheckoutSession> {
  const response = await fetchWithAuth(
    "/checkout/create-session",
    {
      method: "POST",
      body: JSON.stringify({ packId }),
    },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    if (response.status === 503) {
      throw new GenerationApiError(
        error.message ||
          "Payment system is not configured. Please contact support.",
        503
      );
    }

    throw new GenerationApiError(
      error.error || "Failed to create checkout session",
      response.status
    );
  }

  const data = await response.json();
  return {
    sessionId: data.sessionId,
    url: data.url,
  };
}

/**
 * Get recent credit ledger entries for the authenticated user.
 */
export async function getCreditsLedger(
  accessToken: string,
  limit: number = 20
): Promise<CreditLedgerEntry[]> {
  const clampedLimit = Math.max(1, Math.min(100, Math.floor(limit || 20)));
  const response = await fetchWithAuth(
    `/credits/ledger?limit=${clampedLimit}`,
    { method: "GET" },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "Failed to fetch credits ledger",
      response.status
    );
  }

  const data = await response.json();
  return data.entries || [];
}

/**
 * Get user's purchase history
 */
export async function getPurchaseHistory(
  accessToken: string
): Promise<Purchase[]> {
  const response = await fetchWithAuth(
    "/checkout/purchases",
    { method: "GET" },
    accessToken
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "Failed to fetch purchase history",
      response.status
    );
  }

  const data = await response.json();
  return (data.purchases || []).map(
    (p: {
      id: string;
      amount_cents: number;
      credits_granted: number;
      status: string;
      created_at: string;
      completed_at: string | null;
      credit_packs?: { name: string };
    }) => ({
      id: p.id,
      amountCents: p.amount_cents,
      creditsGranted: p.credits_granted,
      status: p.status,
      createdAt: p.created_at,
      completedAt: p.completed_at,
      packName: p.credit_packs?.name,
    })
  );
}
