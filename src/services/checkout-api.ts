import { GenerationApiError } from "./generation-api";

const API_BASE_URL =
  import.meta.env.VITE_GENERATION_API_URL || "http://localhost:3001";

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

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit,
  accessToken: string
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
    const error = await response.json().catch(() => ({}));
    throw new GenerationApiError(
      error.error || "Failed to fetch credit packs",
      response.status
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
