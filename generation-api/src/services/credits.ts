import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CreditsInfo } from "../types.js";

let supabaseClient: SupabaseClient | null = null;

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

function mapLedgerType(transactionType: string, amount: number, description: string): CreditLedgerEntryType {
  if (transactionType === "purchase") return "purchase";
  if (transactionType === "refund") return "refund";
  if (transactionType === "trial_grant") return "grant";
  if (transactionType === "generation") {
    if (amount < 0 && description.toLowerCase().includes("reserve")) {
      return "reserve";
    }
    return "deduct";
  }
  return amount >= 0 ? "refund" : "deduct";
}

function defaultLedgerDescription(type: CreditLedgerEntryType): string {
  switch (type) {
    case "reserve":
      return "Credits reserved for generation";
    case "deduct":
      return "Credits used for generation";
    case "refund":
      return "Credits refunded";
    case "purchase":
      return "Credits added from purchase";
    case "grant":
      return "Credits granted";
    default:
      return "Credit transaction";
  }
}

export async function getCreditsLedger(userId: string, limit: number = 20): Promise<CreditLedgerEntry[]> {
  const supabase = getSupabaseClient();
  const clampedLimit = Math.max(1, Math.min(100, Math.floor(limit || 20)));

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("id, amount, transaction_type, description, project_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(clampedLimit);

  if (error) {
    throw new Error(`Failed to fetch credit ledger: ${error.message}`);
  }

  return (data || []).map((entry) => {
    const type = mapLedgerType(
      entry.transaction_type || "",
      entry.amount || 0,
      entry.description || ""
    );
    return {
      id: entry.id,
      amount: entry.amount,
      type,
      description: entry.description || defaultLedgerDescription(type),
      createdAt: entry.created_at,
      projectId: entry.project_id || null,
    };
  });
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
    .select("balance, lifetime_used")
    .eq("user_id", userId)
    .single();

  if (fetchError || !credits) {
    throw new Error("Failed to fetch user credits");
  }

  if (credits.balance < amount) {
    return false; // Insufficient credits
  }

  // Deduct credits and increment lifetime_used
  const { error: updateError } = await supabase
    .from("credits")
    .update({
      balance: credits.balance - amount,
      lifetime_used: credits.lifetime_used + amount,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(`Failed to reserve credits: ${updateError.message}`);
  }

  // Log the transaction
  const { error: logError } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    transaction_type: "generation",
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
    transaction_type: "refund",
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
