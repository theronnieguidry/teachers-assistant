export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Grade = "K" | "1" | "2" | "3" | "4" | "5" | "6";

export type ProjectStatus = "pending" | "generating" | "completed" | "failed";

export type TransactionType =
  | "trial_grant"
  | "purchase"
  | "generation"
  | "refund";

export type InspirationType = "url" | "pdf" | "image" | "text";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credits: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          lifetime_granted: number;
          lifetime_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          lifetime_granted?: number;
          lifetime_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          lifetime_granted?: number;
          lifetime_used?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          transaction_type: TransactionType;
          description: string | null;
          project_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          transaction_type: TransactionType;
          description?: string | null;
          project_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          transaction_type?: TransactionType;
          description?: string | null;
          project_id?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          prompt: string;
          grade: Grade;
          subject: string;
          options: Json;
          inspiration: Json;
          output_path: string | null;
          status: ProjectStatus;
          error_message: string | null;
          credits_used: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          prompt: string;
          grade: Grade;
          subject: string;
          options?: Json;
          inspiration?: Json;
          output_path?: string | null;
          status?: ProjectStatus;
          error_message?: string | null;
          credits_used?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          prompt?: string;
          grade?: Grade;
          subject?: string;
          options?: Json;
          inspiration?: Json;
          output_path?: string | null;
          status?: ProjectStatus;
          error_message?: string | null;
          credits_used?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      project_versions: {
        Row: {
          id: string;
          project_id: string;
          version_number: number;
          worksheet_html: string | null;
          lesson_plan_html: string | null;
          answer_key_html: string | null;
          ai_provider: string | null;
          ai_model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          version_number: number;
          worksheet_html?: string | null;
          lesson_plan_html?: string | null;
          answer_key_html?: string | null;
          ai_provider?: string | null;
          ai_model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          version_number?: number;
          worksheet_html?: string | null;
          lesson_plan_html?: string | null;
          answer_key_html?: string | null;
          ai_provider?: string | null;
          ai_model?: string | null;
          created_at?: string;
        };
      };
      inspiration_items: {
        Row: {
          id: string;
          user_id: string;
          type: InspirationType;
          title: string | null;
          source_url: string | null;
          content: string | null;
          storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: InspirationType;
          title?: string | null;
          source_url?: string | null;
          content?: string | null;
          storage_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: InspirationType;
          title?: string | null;
          source_url?: string | null;
          content?: string | null;
          storage_path?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      reserve_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_project_id?: string | null;
        };
        Returns: boolean;
      };
      refund_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_project_id?: string | null;
        };
        Returns: void;
      };
    };
  };
}
