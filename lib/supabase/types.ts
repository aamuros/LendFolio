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
export type BorrowerVerificationStatus = "pending" | "approved" | "rejected";
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
export type LenderVerificationStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "pending" | "accepted" | "declined" | "expired";
export type PreferredTerm = "1_month" | "3_months" | "6_months" | "12_months";
export type ProfileStatus = "active" | "pending" | "suspended";
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
          organization_name: string;
          contact_person: string;
          phone_number: string;
          business_address: string;
          operating_area: string;
          business_registration_number: string | null;
          min_loan_amount: number;
          max_loan_amount: number;
          typical_repayment_terms: string;
          lender_description: string;
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
          organization_name: string;
          contact_person: string;
          phone_number: string;
          business_address: string;
          operating_area: string;
          business_registration_number?: string | null;
          min_loan_amount: number;
          max_loan_amount: number;
          typical_repayment_terms: string;
          lender_description: string;
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
          organization_name?: string;
          contact_person?: string;
          phone_number?: string;
          business_address?: string;
          operating_area?: string;
          business_registration_number?: string | null;
          min_loan_amount?: number;
          max_loan_amount?: number;
          typical_repayment_terms?: string;
          lender_description?: string;
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
    };
    Views: Record<string, never>;
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
      review_borrower_verification_document: {
        Args: {
          p_document_id: string;
          p_decision: string;
          p_review_notes?: string | null;
        };
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
      borrower_verification_status: BorrowerVerificationStatus;
      borrower_verification_document_status: BorrowerVerificationDocumentStatus;
      borrower_verification_document_type: BorrowerVerificationDocumentType;
      lender_verification_status: LenderVerificationStatus;
      offer_status: OfferStatus;
      preferred_term: PreferredTerm;
      profile_status: ProfileStatus;
      repayment_proof_status: RepaymentProofStatus;
      repayment_status: RepaymentStatus;
      user_consent_type: UserConsentType;
    };
    CompositeTypes: Record<string, never>;
  };
};
