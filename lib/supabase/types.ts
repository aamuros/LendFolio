export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "borrower" | "lender" | "manager";
export type BusinessType =
  | "sari_sari_store"
  | "food_stall"
  | "online_seller"
  | "market_vendor"
  | "service_provider"
  | "other";
export type ApplicationStatus = "submitted" | "open";
export type OfferStatus = "pending" | "accepted" | "declined";
export type PreferredTerm = "1_month" | "3_months" | "6_months" | "12_months";

export type Database = {
  public: {
    Tables: {
      borrower_portfolios: {
        Row: {
          id: string;
          borrower_id: string;
          business_type: BusinessType;
          location: string;
          monthly_gross_revenue: number;
          monthly_expenses: number;
          existing_loan_payments: number;
          years_in_operation: number;
          loan_purpose_context: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          business_type: BusinessType;
          location: string;
          monthly_gross_revenue: number;
          monthly_expenses: number;
          existing_loan_payments: number;
          years_in_operation: number;
          loan_purpose_context: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          business_type?: BusinessType;
          location?: string;
          monthly_gross_revenue?: number;
          monthly_expenses?: number;
          existing_loan_payments?: number;
          years_in_operation?: number;
          loan_purpose_context?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loan_applications: {
        Row: {
          id: string;
          borrower_id: string;
          borrower_portfolio_id: string;
          requested_amount: number;
          purpose: string;
          preferred_term: PreferredTerm;
          remarks: string | null;
          status: ApplicationStatus;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          borrower_portfolio_id: string;
          requested_amount: number;
          purpose: string;
          preferred_term: PreferredTerm;
          remarks?: string | null;
          status?: ApplicationStatus;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          borrower_portfolio_id?: string;
          requested_amount?: number;
          purpose?: string;
          preferred_term?: PreferredTerm;
          remarks?: string | null;
          status?: ApplicationStatus;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      loan_offers: {
        Row: {
          id: string;
          loan_application_id: string;
          borrower_id: string;
          lender_id: string;
          lender_name: string;
          approved_amount: number;
          repayment_amount: number;
          fees: number;
          due_date: string;
          remarks: string | null;
          status: OfferStatus;
          sent_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loan_application_id: string;
          borrower_id: string;
          lender_id: string;
          lender_name?: string;
          approved_amount: number;
          repayment_amount: number;
          fees?: number;
          due_date: string;
          remarks?: string | null;
          status?: OfferStatus;
          sent_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loan_application_id?: string;
          borrower_id?: string;
          lender_id?: string;
          lender_name?: string;
          approved_amount?: number;
          repayment_amount?: number;
          fees?: number;
          due_date?: string;
          remarks?: string | null;
          status?: OfferStatus;
          sent_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      application_status: ApplicationStatus;
      business_type: BusinessType;
      offer_status: OfferStatus;
      preferred_term: PreferredTerm;
    };
    CompositeTypes: Record<string, never>;
  };
};
