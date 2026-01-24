import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CreditsInfo } from "../types.js";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      );
    }

    supabaseClient = createClient(url, serviceKey);
  }
  return supabaseClient;
}

export async function getCredits(userId: string): Promise<CreditsInfo> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("credits")
    .select("balance, lifetime_granted, lifetime_used")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch credits: ${error.message}`);
  }

  if (!data) {
    throw new Error("No credits record found for user");
  }

  return {
    balance: data.balance,
    lifetimeGranted: data.lifetime_granted,
    lifetimeUsed: data.lifetime_used,
  };
}

export async function reserveCredits(
  userId: string,
  amount: number,
  projectId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Use a transaction to atomically check and deduct credits
  const { data: credits, error: fetchError } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (fetchError || !credits) {
    throw new Error("Failed to fetch user credits");
  }

  if (credits.balance < amount) {
    return false; // Insufficient credits
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from("credits")
    .update({
      balance: credits.balance - amount,
      lifetime_used: supabase.rpc("increment_lifetime_used", { amount }),
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to reserve credits: ${updateError.message}`);
  }

  // Log the transaction
  const { error: logError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type: "generation",
    project_id: projectId,
    description: `Credits reserved for project generation`,
  });

  if (logError) {
    console.error("Failed to log credit transaction:", logError);
    // Don't throw - the reservation was successful
  }

  return true;
}

export async function refundCredits(
  userId: string,
  amount: number,
  projectId: string,
  reason: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Refund credits
  const { error: updateError } = await supabase.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_project_id: projectId,
  });

  if (updateError) {
    throw new Error(`Failed to refund credits: ${updateError.message}`);
  }

  // Log the refund
  const { error: logError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: amount,
    type: "refund",
    project_id: projectId,
    description: reason,
  });

  if (logError) {
    console.error("Failed to log refund transaction:", logError);
  }
}

export async function deductCredits(
  userId: string,
  amount: number,
  projectId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Update the credits
  const { error } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    throw new Error(`Failed to deduct credits: ${error.message}`);
  }

  // Update project with credits used
  await supabase
    .from("projects")
    .update({ credits_used: amount })
    .eq("id", projectId);
}

// For testing: reset client
export function resetClient(): void {
  supabaseClient = null;
}
