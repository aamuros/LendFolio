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
export type ApplicationStatus =
  | "submitted"
  | "open"
  | "accepted"
  | "declined"
  | "withdrawn";
export type BorrowerVerificationStatus =
  | "not_started"
  | "pending"
  | "pending_documents"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_resubmission";
export type BorrowerVerificationDocumentStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "superseded";
export type BorrowerVerificationDocumentType =
  | "valid_id"
  | "business_proof"
  | "address_proof"
  | "business_registration"
  | "other";
export type LenderVerificationStatus = "incomplete" | "pending" | "approved" | "rejected";
export type OfferStatus = "pending" | "accepted" | "declined" | "expired";
export type PreferredTerm = "1_month" | "3_months" | "6_months" | "12_months";
export type ProfileStatus = "active" | "pending" | "suspended";
export type ProvisioningEventStatus = "attempted" | "succeeded" | "failed";
export type ActiveLoanStatus =
  | "active"
  | "paid"
  | "overdue"
  | "defaulted"
  | "closed";
export type RepaymentStatus =
  | "due"
  | "submitted"
  | "verified"
  | "rejected"
  | "late";
export type RepaymentProofStatus = "submitted" | "verified" | "rejected";
export type UserConsentType =
  | "terms_of_service"
  | "privacy_notice"
  | "credit_review_authorization"
  | "document_processing_consent"
  | "lender_review_consent";
export type BorrowerOperatingModel =
  | "fixed_store"
  | "market_stall"
  | "home_based"
  | "online"
  | "mobile"
  | "mixed"
  | "other";
export type BorrowerPrimarySalesChannel =
  | "walk_in"
  | "online_marketplace"
  | "social_media"
  | "delivery_apps"
  | "wholesale"
  | "mixed"
  | "other";
export type BorrowerRevenuePeriod =
  | "last_30_days"
  | "average_monthly_last_3_months"
  | "average_monthly_last_6_months"
  | "seasonal_estimate";
export type BorrowerRevenueConfidence =
  | "self_declared"
  | "partially_documented"
  | "document_supported"
  | "manager_reviewed";
export type BorrowerProfileReviewStatus =
  | "self_declared"
  | "needs_review"
  | "reviewed"
  | "rejected"
  | "stale";
export type BorrowerCreditReadinessStatus =
  | "incomplete"
  | "complete"
  | "needs_review"
  | "not_eligible"
  | "eligible_to_apply";

export type Database = {
  public: {
    Tables: {
      active_loans: {
        Row: {
          id: string;
          loan_application_id: string;
          accepted_offer_id: string;
          borrower_id: string;
          lender_id: string;
          principal_amount: number;
          repayment_amount: number;
          fees: number;
          outstanding_balance: number;
          status: ActiveLoanStatus;
          started_at: string;
          due_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          loan_application_id: string;
          accepted_offer_id: string;
          borrower_id: string;
          lender_id: string;
          principal_amount: number;
          repayment_amount: number;
          fees?: number;
          outstanding_balance: number;
          status?: ActiveLoanStatus;
          started_at?: string;
          due_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          loan_application_id?: string;
          accepted_offer_id?: string;
          borrower_id?: string;
          lender_id?: string;
          principal_amount?: number;
          repayment_amount?: number;
          fees?: number;
          outstanding_balance?: number;
          status?: ActiveLoanStatus;
          started_at?: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_table: string;
          target_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_table: string;
          target_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_table?: string;
          target_id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_type: UserConsentType;
          version: string;
          accepted_at: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_type: UserConsentType;
          version: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          consent_type?: UserConsentType;
          version?: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      legal_documents: {
        Row: {
          id: string;
          consent_type: UserConsentType;
          version: string;
          title: string;
          document_url: string | null;
          published_at: string;
          retired_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          consent_type: UserConsentType;
          version: string;
          title: string;
          document_url?: string | null;
          published_at?: string;
          retired_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          consent_type?: UserConsentType;
          version?: string;
          title?: string;
          document_url?: string | null;
          published_at?: string;
          retired_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      borrower_portfolios: {
        Row: {
          id: string;
          borrower_id: string;
          business_name: string | null;
          business_description: string | null;
          business_type: BusinessType;
          started_operating_at: string | null;
          business_address: string | null;
          barangay: string | null;
          city_or_municipality: string | null;
          province: string | null;
          location: string;
          operating_model: BorrowerOperatingModel | null;
          primary_sales_channel: BorrowerPrimarySalesChannel | null;
          revenue_period: BorrowerRevenuePeriod | null;
          revenue_confidence: BorrowerRevenueConfidence | null;
          monthly_gross_revenue: number;
          monthly_expenses: number;
          existing_loan_payments: number;
          years_in_operation: number;
          expense_breakdown: Json;
          debt_obligation_summary: Json;
          loan_purpose_context: string;
          profile_last_confirmed_at: string | null;
          profile_review_status: BorrowerProfileReviewStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          business_name?: string | null;
          business_description?: string | null;
          business_type: BusinessType;
          started_operating_at?: string | null;
          business_address?: string | null;
          barangay?: string | null;
          city_or_municipality?: string | null;
          province?: string | null;
          location: string;
          operating_model?: BorrowerOperatingModel | null;
          primary_sales_channel?: BorrowerPrimarySalesChannel | null;
          revenue_period?: BorrowerRevenuePeriod | null;
          revenue_confidence?: BorrowerRevenueConfidence | null;
          monthly_gross_revenue: number;
          monthly_expenses: number;
          existing_loan_payments: number;
          years_in_operation: number;
          expense_breakdown?: Json;
          debt_obligation_summary?: Json;
          loan_purpose_context: string;
          profile_last_confirmed_at?: string | null;
          profile_review_status?: BorrowerProfileReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          business_name?: string | null;
          business_description?: string | null;
          business_type?: BusinessType;
          started_operating_at?: string | null;
          business_address?: string | null;
          barangay?: string | null;
          city_or_municipality?: string | null;
          province?: string | null;
          location?: string;
          operating_model?: BorrowerOperatingModel | null;
          primary_sales_channel?: BorrowerPrimarySalesChannel | null;
          revenue_period?: BorrowerRevenuePeriod | null;
          revenue_confidence?: BorrowerRevenueConfidence | null;
          monthly_gross_revenue?: number;
          monthly_expenses?: number;
          existing_loan_payments?: number;
          years_in_operation?: number;
          expense_breakdown?: Json;
          debt_obligation_summary?: Json;
          loan_purpose_context?: string;
          profile_last_confirmed_at?: string | null;
          profile_review_status?: BorrowerProfileReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      borrower_verifications: {
        Row: {
          id: string;
          borrower_id: string;
          verification_status: BorrowerVerificationStatus;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          manager_review_notes: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          verification_status?: BorrowerVerificationStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          verification_status?: BorrowerVerificationStatus;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      borrower_verification_documents: {
        Row: {
          id: string;
          borrower_verification_id: string;
          borrower_id: string;
          storage_bucket: string;
          storage_path: string;
          document_type: BorrowerVerificationDocumentType;
          file_name: string;
          file_type: string;
          file_size: number;
          status: BorrowerVerificationDocumentStatus;
          uploaded_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_verification_id: string;
          borrower_id: string;
          storage_bucket?: string;
          storage_path: string;
          document_type: BorrowerVerificationDocumentType;
          file_name: string;
          file_type: string;
          file_size: number;
          status?: BorrowerVerificationDocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_verification_id?: string;
          borrower_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          document_type?: BorrowerVerificationDocumentType;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          status?: BorrowerVerificationDocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
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
          credit_limit_at_submission: number | null;
          used_credit_at_submission: number | null;
          available_credit_at_submission: number | null;
          monthly_net_cash_flow_at_submission: number | null;
          credit_readiness_status: BorrowerCreditReadinessStatus | null;
          borrower_profile_snapshot: Json | null;
          borrower_readiness_snapshot: Json | null;
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
          credit_limit_at_submission?: number | null;
          used_credit_at_submission?: number | null;
          available_credit_at_submission?: number | null;
          monthly_net_cash_flow_at_submission?: number | null;
          credit_readiness_status?: BorrowerCreditReadinessStatus | null;
          borrower_profile_snapshot?: Json | null;
          borrower_readiness_snapshot?: Json | null;
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
          credit_limit_at_submission?: number | null;
          used_credit_at_submission?: number | null;
          available_credit_at_submission?: number | null;
          monthly_net_cash_flow_at_submission?: number | null;
          credit_readiness_status?: BorrowerCreditReadinessStatus | null;
          borrower_profile_snapshot?: Json | null;
          borrower_readiness_snapshot?: Json | null;
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
      loan_repayment_schedules: {
        Row: {
          id: string;
          active_loan_id: string;
          borrower_id: string;
          lender_id: string;
          installment_number: number;
          amount_due: number;
          due_date: string;
          status: RepaymentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          active_loan_id: string;
          borrower_id: string;
          lender_id: string;
          installment_number: number;
          amount_due: number;
          due_date: string;
          status?: RepaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          active_loan_id?: string;
          borrower_id?: string;
          lender_id?: string;
          installment_number?: number;
          amount_due?: number;
          due_date?: string;
          status?: RepaymentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          href?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      repayment_proofs: {
        Row: {
          id: string;
          repayment_schedule_id: string;
          active_loan_id: string;
          borrower_id: string;
          lender_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size: number;
          status: RepaymentProofStatus;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repayment_schedule_id: string;
          active_loan_id: string;
          borrower_id: string;
          lender_id: string;
          storage_bucket?: string;
          storage_path: string;
          file_name: string;
          file_type: string;
          file_size: number;
          status?: RepaymentProofStatus;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repayment_schedule_id?: string;
          active_loan_id?: string;
          borrower_id?: string;
          lender_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          status?: RepaymentProofStatus;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lender_profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_name: string | null;
          contact_person: string | null;
          phone_number: string | null;
          business_address: string | null;
          operating_area: string | null;
          business_registration_number: string | null;
          min_loan_amount: number | null;
          max_loan_amount: number | null;
          typical_repayment_terms: string | null;
          lender_description: string | null;
          verification_status: LenderVerificationStatus;
          approved_at: string | null;
          approved_by: string | null;
          manager_review_notes: string | null;
          rejection_reason: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_name?: string | null;
          contact_person?: string | null;
          phone_number?: string | null;
          business_address?: string | null;
          operating_area?: string | null;
          business_registration_number?: string | null;
          min_loan_amount?: number | null;
          max_loan_amount?: number | null;
          typical_repayment_terms?: string | null;
          lender_description?: string | null;
          verification_status?: LenderVerificationStatus;
          approved_at?: string | null;
          approved_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_name?: string | null;
          contact_person?: string | null;
          phone_number?: string | null;
          business_address?: string | null;
          operating_area?: string | null;
          business_registration_number?: string | null;
          min_loan_amount?: number | null;
          max_loan_amount?: number | null;
          typical_repayment_terms?: string | null;
          lender_description?: string | null;
          verification_status?: LenderVerificationStatus;
          approved_at?: string | null;
          approved_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          display_name: string;
          status: ProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: AppRole;
          display_name: string;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          display_name?: string;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provisioning_events: {
        Row: {
          id: string;
          user_id: string;
          event_status: ProvisioningEventStatus;
          requested_role: string | null;
          source: string;
          message: string;
          metadata: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_status: ProvisioningEventStatus;
          requested_role?: string | null;
          source: string;
          message: string;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_status?: ProvisioningEventStatus;
          requested_role?: string | null;
          source?: string;
          message?: string;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      account_onboarding_states: {
        Row: {
          user_id: string;
          role: AppRole;
          profile_status: ProfileStatus;
          borrower_verification_status: BorrowerVerificationStatus | null;
          lender_verification_status: LenderVerificationStatus | null;
          provisioning_state: string;
          onboarding_state: string;
          created_at: string;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_user_consents: {
        Args: {
          p_consents: Json;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: Json;
      };
      accept_loan_offer: {
        Args: {
          p_offer_id: string;
        };
        Returns: Json;
      };
      create_loan_offer: {
        Args: {
          p_loan_application_id: string;
          p_approved_amount: number;
          p_repayment_amount: number;
          p_fees: number;
          p_due_date: string;
          p_remarks?: string | null;
        };
        Returns: Json;
      };
      get_lender_application_offer_flags: {
        Args: {
          p_loan_application_ids: string[];
        };
        Returns: {
          loan_application_id: string;
          has_accepted_offer: boolean;
        }[];
      };
      review_repayment_proof: {
        Args: {
          p_proof_id: string;
          p_decision: string;
          p_review_notes?: string | null;
        };
        Returns: Json;
      };
      refresh_overdue_repayment_statuses: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      review_lender_verification: {
        Args: {
          p_lender_profile_id: string;
          p_decision: string;
          p_manager_review_notes?: string | null;
          p_rejection_reason?: string | null;
        };
        Returns: Json;
      };
      review_borrower_verification: {
        Args: {
          p_borrower_id: string;
          p_decision: string;
          p_manager_review_notes?: string | null;
          p_rejection_reason?: string | null;
        };
        Returns: Json;
      };
      repair_user_provisioning: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      review_borrower_verification_document: {
        Args: {
          p_document_id: string;
          p_decision: string;
          p_review_notes?: string | null;
        };
        Returns: Json;
      };
      get_borrower_application_readiness: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      submit_borrower_verification_document: {
        Args: {
          p_borrower_verification_id: string;
          p_storage_path: string;
          p_document_type: BorrowerVerificationDocumentType;
          p_file_name: string;
          p_file_type: string;
          p_file_size: number;
        };
        Returns: Json;
      };
      submit_repayment_proof: {
        Args: {
          p_repayment_schedule_id: string;
          p_storage_path: string;
          p_file_name: string;
          p_file_type: string;
          p_file_size: number;
        };
        Returns: Json;
      };
      submit_lender_onboarding: {
        Args: {
          p_organization_name: string;
          p_contact_person: string;
          p_phone_number: string;
          p_business_address: string;
          p_operating_area: string;
          p_business_registration_number?: string | null;
          p_min_loan_amount: number;
          p_max_loan_amount: number;
          p_typical_repayment_terms: string;
          p_lender_description: string;
        };
        Returns: Json;
      };
      submit_loan_application: {
        Args: {
          p_requested_amount: number;
          p_purpose: string;
          p_preferred_term: PreferredTerm;
          p_remarks?: string | null;
        };
        Returns: Json;
      };
      decline_loan_offer: {
        Args: {
          p_offer_id: string;
        };
        Returns: Json;
      };
      update_loan_application: {
        Args: {
          p_application_id: string;
          p_requested_amount: number;
          p_purpose: string;
          p_preferred_term: PreferredTerm;
          p_remarks: string;
        };
        Returns: Json;
      };
      withdraw_loan_application: {
        Args: {
          p_application_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      active_loan_status: ActiveLoanStatus;
      app_role: AppRole;
      application_status: ApplicationStatus;
      business_type: BusinessType;
      borrower_operating_model: BorrowerOperatingModel;
      borrower_primary_sales_channel: BorrowerPrimarySalesChannel;
      borrower_revenue_period: BorrowerRevenuePeriod;
      borrower_revenue_confidence: BorrowerRevenueConfidence;
      borrower_profile_review_status: BorrowerProfileReviewStatus;
      borrower_credit_readiness_status: BorrowerCreditReadinessStatus;
      borrower_verification_status: BorrowerVerificationStatus;
      borrower_verification_document_status: BorrowerVerificationDocumentStatus;
      borrower_verification_document_type: BorrowerVerificationDocumentType;
      lender_verification_status: LenderVerificationStatus;
      offer_status: OfferStatus;
      preferred_term: PreferredTerm;
      profile_status: ProfileStatus;
      provisioning_event_status: ProvisioningEventStatus;
      repayment_proof_status: RepaymentProofStatus;
      repayment_status: RepaymentStatus;
      user_consent_type: UserConsentType;
    };
    CompositeTypes: Record<string, never>;
  };
};
