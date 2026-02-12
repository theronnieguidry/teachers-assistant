import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { getSupabaseClient } from "../services/credits.js";

const router = Router();

type StripeMode = "test" | "live";

interface StripeConfigError {
  status: number;
  error: string;
  message: string;
  code:
    | "stripe_not_configured"
    | "stripe_mode_mismatch"
    | "stripe_pack_not_configured"
    | "stripe_runtime_error";
}

function getStripeMode(): StripeMode {
  const configuredMode = process.env.STRIPE_MODE?.toLowerCase();
  if (configuredMode === "live") {
    return "live";
  }
  if (configuredMode === "test") {
    return "test";
  }
  return process.env.NODE_ENV === "production" ? "live" : "test";
}

function getKeyMode(secretKey: string): StripeMode | null {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }
  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }
  return null;
}

// Initialize Stripe client
function getStripeClient():
  | { client: Stripe; mode: StripeMode }
  | { error: StripeConfigError } {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      error: {
        status: 503,
        error: "Payment system not configured",
        message:
          "Stripe is not configured for this environment. Please contact support.",
        code: "stripe_not_configured",
      },
    };
  }

  const expectedMode = getStripeMode();
  const keyMode = getKeyMode(secretKey);
  if (keyMode && keyMode !== expectedMode) {
    return {
      error: {
        status: 503,
        error: "Payment system misconfigured",
        message: `Stripe key mode (${keyMode}) does not match STRIPE_MODE (${expectedMode}).`,
        code: "stripe_mode_mismatch",
      },
    };
  }

  return {
    client: new Stripe(secretKey),
    mode: expectedMode,
  };
}

// Types
interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  priceDisplay: string;
  stripePriceId: string;
}

// GET /checkout/packs - List available credit packs
router.get("/packs", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const supabase = getSupabaseClient();
    const { data: packs, error } = await supabase
      .from("credit_packs")
      .select("id, name, credits, price_cents, stripe_price_id")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch credit packs: ${error.message}`);
    }

    const formattedPacks: CreditPack[] = (packs || []).map((pack) => ({
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      priceCents: pack.price_cents,
      priceDisplay: `$${(pack.price_cents / 100).toFixed(2)}`,
      stripePriceId: pack.stripe_price_id,
    }));

    res.json({
      success: true,
      packs: formattedPacks,
    });
  } catch (error) {
    console.error("Credit packs fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch credit packs",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /checkout/create-session - Create Stripe Checkout session
router.post(
  "/create-session",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { packId } = req.body;
      if (!packId) {
        res.status(400).json({ error: "packId is required" });
        return;
      }

      // Fetch the credit pack from database
      const supabase = getSupabaseClient();
      const { data: pack, error: packError } = await supabase
        .from("credit_packs")
        .select("id, name, credits, price_cents, stripe_price_id")
        .eq("id", packId)
        .eq("active", true)
        .single();

      if (packError || !pack) {
        res.status(404).json({ error: "Credit pack not found" });
        return;
      }

      // Validate the Stripe price ID is configured
      if (
        !pack.stripe_price_id ||
        pack.stripe_price_id.includes("placeholder")
      ) {
        res.status(503).json({
          error: "Payment system not configured",
          message:
            "Credit pack prices have not been configured in Stripe yet. Please contact support.",
          code: "stripe_pack_not_configured",
        });
        return;
      }

      const stripeConfig = getStripeClient();
      if ("error" in stripeConfig) {
        res.status(stripeConfig.error.status).json(stripeConfig.error);
        return;
      }

      const stripe = stripeConfig.client;
      const appUrl = process.env.APP_URL || "http://localhost:1420";

      // Create Stripe Checkout session
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price: pack.stripe_price_id,
              quantity: 1,
            },
          ],
          success_url: `${appUrl}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/purchase/cancel`,
          client_reference_id: req.userId,
          metadata: {
            packId: pack.id,
            userId: req.userId,
            credits: pack.credits.toString(),
            packName: pack.name,
            stripeMode: stripeConfig.mode,
          },
        });
      } catch (stripeError) {
        console.error("Stripe checkout session creation failed:", stripeError);
        res.status(502).json({
          error: "Payment provider unavailable",
          message: "Unable to start checkout right now. Please try again shortly.",
          code: "stripe_runtime_error",
        });
        return;
      }

      // Create pending purchase record
      const { error: purchaseError } = await supabase
        .from("purchases")
        .insert({
          user_id: req.userId,
          credit_pack_id: pack.id,
          stripe_session_id: session.id,
          amount_cents: pack.price_cents,
          credits_granted: pack.credits,
          status: "pending",
        });

      if (purchaseError) {
        console.error("Failed to create purchase record:", purchaseError);
        // Don't fail the request - the webhook will handle the purchase
      }

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error("Checkout session creation error:", error);
      res.status(500).json({
        error: "Failed to create checkout session",
        message: error instanceof Error ? error.message : "Unknown error",
        code: "checkout_internal_error",
      });
    }
  }
);

// POST /checkout/webhook - Stripe webhook handler
// Note: This route should be registered BEFORE express.json() middleware
// and use express.raw({ type: 'application/json' }) instead
export async function handleWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;

  try {
    const stripeConfig = getStripeClient();
    if ("error" in stripeConfig) {
      res.status(stripeConfig.error.status).json(stripeConfig.error);
      return;
    }
    event = stripeConfig.client.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).json({
      error: "Webhook signature verification failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({
      error: "Webhook handler failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = getSupabaseClient();

  // Check if already processed (idempotency)
  const { data: existingPurchase } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .single();

  if (existingPurchase?.status === "completed") {
    console.log(`Purchase ${session.id} already completed, skipping`);
    return;
  }

  const userId = session.client_reference_id;
  const credits = parseInt(session.metadata?.credits || "0", 10);
  const purchaseId = existingPurchase?.id;

  if (!userId || !credits) {
    console.error("Missing userId or credits in session metadata");
    return;
  }

  if (purchaseId) {
    // Use the database function to grant credits atomically
    const { error } = await supabase.rpc("grant_purchased_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_purchase_id: purchaseId,
    });

    if (error) {
      console.error("Failed to grant credits:", error);
      throw error;
    }
  } else {
    // Purchase record doesn't exist yet, create it and grant credits
    // This can happen if the create-session call failed to create the record
    const { data: newPurchase, error: insertError } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        amount_cents: session.amount_total || 0,
        credits_granted: credits,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create purchase record:", insertError);
      throw insertError;
    }

    const { error } = await supabase.rpc("grant_purchased_credits", {
      p_user_id: userId,
      p_amount: credits,
      p_purchase_id: newPurchase.id,
    });

    if (error) {
      console.error("Failed to grant credits:", error);
      throw error;
    }
  }

  console.log(`Granted ${credits} credits to user ${userId}`);
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session
): Promise<void> {
  const supabase = getSupabaseClient();

  // Mark the purchase as failed
  const { error } = await supabase
    .from("purchases")
    .update({ status: "failed" })
    .eq("stripe_session_id", session.id)
    .eq("status", "pending");

  if (error) {
    console.error("Failed to update expired purchase:", error);
  }
}

// GET /checkout/purchases - Get user's purchase history
router.get("/purchases", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const supabase = getSupabaseClient();
    const { data: purchases, error } = await supabase
      .from("purchases")
      .select(
        `
        id,
        amount_cents,
        credits_granted,
        status,
        created_at,
        completed_at,
        credit_packs (
          name
        )
      `
      )
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch purchases: ${error.message}`);
    }

    res.json({
      success: true,
      purchases: purchases || [],
    });
  } catch (error) {
    console.error("Purchases fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch purchases",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
