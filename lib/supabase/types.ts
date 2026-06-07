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
  | "small_retail_shop"
  | "laundry_service"
  | "beauty_barber_service"
  | "repair_service"
  | "transport_delivery_operator"
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
  | "physical_store"
  | "mobile_delivery_based"
  | "online_only"
  | "mixed_online_physical"
  | "fixed_store"
  | "market_stall"
  | "home_based"
  | "online"
  | "mobile"
  | "mixed"
  | "other";
export type BorrowerPrimarySalesChannel =
  | "walk_in_customers"
  | "online_orders"
  | "facebook_marketplace"
  | "ecommerce_platform"
  | "regular_clients"
  | "walk_in"
  | "online_marketplace"
  | "social_media"
  | "delivery_apps"
  | "wholesale"
  | "mixed"
  | "other";
export type BorrowerRevenuePeriod =
  | "last_7_days"
  | "last_30_days"
  | "last_3_months_average"
  | "last_6_months_average"
  | "self_estimated_normal_month"
  | "average_monthly_last_3_months"
  | "average_monthly_last_6_months"
  | "seasonal_estimate";
export type BorrowerRevenueConfidence =
  | "sales_records"
  | "bank_ewallet_proof"
  | "supplier_receipts"
  | "self_declared_only"
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
export type BorrowerOwnershipType =
  | "sole_proprietor"
  | "family_owned"
  | "partnership"
  | "informal_unregistered"
  | "other";
export type BorrowerRole =
  | "owner_proprietor"
  | "co_owner"
  | "manager"
  | "family_operator";
export type BorrowerBusinessSchedule =
  | "daily"
  | "weekdays_only"
  | "weekends_only"
  | "seasonal"
  | "irregular";
export type BorrowerBusinessRegistrationType =
  | "barangay_permit"
  | "dti"
  | "mayors_permit"
  | "bir"
  | "sec"
  | "other";
export type BorrowerAverageCollectionPeriod =
  | "daily"
  | "weekly"
  | "every_payday"
  | "monthly"
  | "irregular";
export type LenderVerificationDocumentType =
  | "business_registration"
  | "authorized_representative_id"
  | "authorization_letter"
  | "lending_license"
  | "proof_of_address"
  | "collection_policy"
  | "sample_loan_terms"
  | "other";
export type LenderVerificationDocumentStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "superseded";
export type LenderProfileChangeRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

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
          repayment_channel: string | null;
          repayment_account_name: string | null;
          repayment_account_number: string | null;
          repayment_instructions: string | null;
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
          repayment_channel?: string | null;
          repayment_account_name?: string | null;
          repayment_account_number?: string | null;
          repayment_instructions?: string | null;
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
          repayment_channel?: string | null;
          repayment_account_name?: string | null;
          repayment_account_number?: string | null;
          repayment_instructions?: string | null;
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
          mobile_number?: string | null;
          home_address?: string | null;
          years_at_current_address?: number;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          emergency_contact_relationship?: string | null;
          business_name: string | null;
          business_description: string | null;
          business_type: BusinessType | null;
          started_operating_at: string | null;
          business_address: string | null;
          barangay: string | null;
          city_or_municipality: string | null;
          province: string | null;
          region: string | null;
          zip_code: string | null;
          location: string | null;
          is_business_address_same_as_home?: boolean;
          ownership_type?: BorrowerOwnershipType | null;
          borrower_role?: BorrowerRole | null;
          operating_model: BorrowerOperatingModel | null;
          primary_sales_channel: BorrowerPrimarySalesChannel | null;
          business_schedule?: BorrowerBusinessSchedule | null;
          number_of_employees?: number;
          main_products_or_services?: string | null;
          main_suppliers?: string | null;
          keeps_sales_records?: boolean;
          uses_bank_or_ewallet?: boolean;
          offers_customer_credit?: boolean;
          has_business_registration?: boolean;
          business_registration_type?: BorrowerBusinessRegistrationType | null;
          registration_number?: string | null;
          registration_date?: string | null;
          unregistered_reason?: string | null;
          average_daily_sales?: number;
          average_weekly_sales?: number;
          revenue_period: BorrowerRevenuePeriod | null;
          revenue_confidence: BorrowerRevenueConfidence | null;
          best_month_sales?: number;
          worst_month_sales?: number;
          monthly_gross_revenue: number | null;
          monthly_inventory_cost?: number;
          monthly_business_rent?: number;
          monthly_business_electricity?: number;
          monthly_business_water?: number;
          monthly_helper_salary?: number;
          monthly_transportation_delivery?: number;
          monthly_packaging_cost?: number;
          monthly_platform_fees?: number;
          monthly_maintenance_repairs?: number;
          monthly_supplier_credit_payment?: number;
          other_business_expenses?: number;
          monthly_expenses: number | null;
          monthly_rent_or_mortgage?: number;
          monthly_electricity_bill?: number;
          monthly_water_bill?: number;
          monthly_internet_phone_bill?: number;
          monthly_food_groceries?: number;
          monthly_transportation?: number;
          monthly_tuition_education?: number;
          monthly_medical_expenses?: number;
          monthly_insurance?: number;
          monthly_family_support?: number;
          other_household_expenses?: number;
          number_of_dependents?: number;
          number_of_earning_household_members?: number;
          household_expenses_completed?: boolean;
          has_existing_debts?: boolean;
          personal_loan_payments?: number;
          business_loan_payments?: number;
          vehicle_loan_payments?: number;
          home_loan_payments?: number;
          lending_app_payments?: number;
          informal_loan_payments?: number;
          buy_now_pay_later_payments?: number;
          credit_card_payments?: number;
          co_maker_guaranteed_loan_payments?: number;
          other_debt_payments?: number;
          existing_loan_payments: number | null;
          existing_debt_declaration_completed?: boolean;
          cash_on_hand?: number;
          bank_savings?: number;
          ewallet_balance?: number;
          inventory_value?: number;
          business_equipment_value?: number;
          vehicle_value?: number;
          property_land_value?: number;
          other_assets_value?: number;
          estimated_customer_credit_amount?: number;
          average_collection_period?: BorrowerAverageCollectionPeriod | null;
          keeps_customer_debt_list?: boolean | null;
          years_in_operation: number | null;
          expense_breakdown: Json;
          debt_obligation_summary: Json;
          loan_purpose_context: string | null;
          has_overdue_loans?: boolean;
          missed_payments_last_12_months?: boolean;
          has_unpaid_lending_app_loans?: boolean;
          has_bounced_checks?: boolean;
          is_co_maker_or_guarantor?: boolean;
          has_debt_related_legal_case?: boolean;
          has_repossession_history?: boolean;
          has_tax_arrears?: boolean;
          business_temporarily_stopped?: boolean;
          confirms_business_operating?: boolean;
          confirms_information_true?: boolean;
          consents_to_data_processing?: boolean;
          consents_to_credit_check?: boolean;
          profile_last_confirmed_at: string | null;
          profile_review_status: BorrowerProfileReviewStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          borrower_id: string;
          mobile_number?: string | null;
          home_address?: string | null;
          years_at_current_address?: number;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          emergency_contact_relationship?: string | null;
          business_name?: string | null;
          business_description?: string | null;
          business_type?: BusinessType | null;
          started_operating_at?: string | null;
          business_address?: string | null;
          barangay?: string | null;
          city_or_municipality?: string | null;
          province?: string | null;
          region?: string | null;
          zip_code?: string | null;
          location?: string | null;
          is_business_address_same_as_home?: boolean;
          ownership_type?: BorrowerOwnershipType | null;
          borrower_role?: BorrowerRole | null;
          operating_model?: BorrowerOperatingModel | null;
          primary_sales_channel?: BorrowerPrimarySalesChannel | null;
          business_schedule?: BorrowerBusinessSchedule | null;
          number_of_employees?: number;
          main_products_or_services?: string | null;
          main_suppliers?: string | null;
          keeps_sales_records?: boolean;
          uses_bank_or_ewallet?: boolean;
          offers_customer_credit?: boolean;
          has_business_registration?: boolean;
          business_registration_type?: BorrowerBusinessRegistrationType | null;
          registration_number?: string | null;
          registration_date?: string | null;
          unregistered_reason?: string | null;
          average_daily_sales?: number;
          average_weekly_sales?: number;
          revenue_period?: BorrowerRevenuePeriod | null;
          revenue_confidence?: BorrowerRevenueConfidence | null;
          best_month_sales?: number;
          worst_month_sales?: number;
          monthly_gross_revenue?: number | null;
          monthly_inventory_cost?: number;
          monthly_business_rent?: number;
          monthly_business_electricity?: number;
          monthly_business_water?: number;
          monthly_helper_salary?: number;
          monthly_transportation_delivery?: number;
          monthly_packaging_cost?: number;
          monthly_platform_fees?: number;
          monthly_maintenance_repairs?: number;
          monthly_supplier_credit_payment?: number;
          other_business_expenses?: number;
          monthly_expenses?: number | null;
          monthly_rent_or_mortgage?: number;
          monthly_electricity_bill?: number;
          monthly_water_bill?: number;
          monthly_internet_phone_bill?: number;
          monthly_food_groceries?: number;
          monthly_transportation?: number;
          monthly_tuition_education?: number;
          monthly_medical_expenses?: number;
          monthly_insurance?: number;
          monthly_family_support?: number;
          other_household_expenses?: number;
          number_of_dependents?: number;
          number_of_earning_household_members?: number;
          household_expenses_completed?: boolean;
          has_existing_debts?: boolean;
          personal_loan_payments?: number;
          business_loan_payments?: number;
          vehicle_loan_payments?: number;
          home_loan_payments?: number;
          lending_app_payments?: number;
          informal_loan_payments?: number;
          buy_now_pay_later_payments?: number;
          credit_card_payments?: number;
          co_maker_guaranteed_loan_payments?: number;
          other_debt_payments?: number;
          existing_loan_payments?: number | null;
          existing_debt_declaration_completed?: boolean;
          cash_on_hand?: number;
          bank_savings?: number;
          ewallet_balance?: number;
          inventory_value?: number;
          business_equipment_value?: number;
          vehicle_value?: number;
          property_land_value?: number;
          other_assets_value?: number;
          estimated_customer_credit_amount?: number;
          average_collection_period?: BorrowerAverageCollectionPeriod | null;
          keeps_customer_debt_list?: boolean | null;
          years_in_operation?: number | null;
          expense_breakdown?: Json;
          debt_obligation_summary?: Json;
          loan_purpose_context?: string | null;
          has_overdue_loans?: boolean;
          missed_payments_last_12_months?: boolean;
          has_unpaid_lending_app_loans?: boolean;
          has_bounced_checks?: boolean;
          is_co_maker_or_guarantor?: boolean;
          has_debt_related_legal_case?: boolean;
          has_repossession_history?: boolean;
          has_tax_arrears?: boolean;
          business_temporarily_stopped?: boolean;
          confirms_business_operating?: boolean;
          confirms_information_true?: boolean;
          consents_to_data_processing?: boolean;
          consents_to_credit_check?: boolean;
          profile_last_confirmed_at?: string | null;
          profile_review_status?: BorrowerProfileReviewStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          borrower_id?: string;
          mobile_number?: string | null;
          home_address?: string | null;
          years_at_current_address?: number;
          emergency_contact_name?: string | null;
          emergency_contact_number?: string | null;
          emergency_contact_relationship?: string | null;
          business_name?: string | null;
          business_description?: string | null;
          business_type?: BusinessType | null;
          started_operating_at?: string | null;
          business_address?: string | null;
          barangay?: string | null;
          city_or_municipality?: string | null;
          province?: string | null;
          region?: string | null;
          zip_code?: string | null;
          location?: string | null;
          is_business_address_same_as_home?: boolean;
          ownership_type?: BorrowerOwnershipType | null;
          borrower_role?: BorrowerRole | null;
          operating_model?: BorrowerOperatingModel | null;
          primary_sales_channel?: BorrowerPrimarySalesChannel | null;
          business_schedule?: BorrowerBusinessSchedule | null;
          number_of_employees?: number;
          main_products_or_services?: string | null;
          main_suppliers?: string | null;
          keeps_sales_records?: boolean;
          uses_bank_or_ewallet?: boolean;
          offers_customer_credit?: boolean;
          has_business_registration?: boolean;
          business_registration_type?: BorrowerBusinessRegistrationType | null;
          registration_number?: string | null;
          registration_date?: string | null;
          unregistered_reason?: string | null;
          average_daily_sales?: number;
          average_weekly_sales?: number;
          revenue_period?: BorrowerRevenuePeriod | null;
          revenue_confidence?: BorrowerRevenueConfidence | null;
          best_month_sales?: number;
          worst_month_sales?: number;
          monthly_gross_revenue?: number | null;
          monthly_inventory_cost?: number;
          monthly_business_rent?: number;
          monthly_business_electricity?: number;
          monthly_business_water?: number;
          monthly_helper_salary?: number;
          monthly_transportation_delivery?: number;
          monthly_packaging_cost?: number;
          monthly_platform_fees?: number;
          monthly_maintenance_repairs?: number;
          monthly_supplier_credit_payment?: number;
          other_business_expenses?: number;
          monthly_expenses?: number | null;
          monthly_rent_or_mortgage?: number;
          monthly_electricity_bill?: number;
          monthly_water_bill?: number;
          monthly_internet_phone_bill?: number;
          monthly_food_groceries?: number;
          monthly_transportation?: number;
          monthly_tuition_education?: number;
          monthly_medical_expenses?: number;
          monthly_insurance?: number;
          monthly_family_support?: number;
          other_household_expenses?: number;
          number_of_dependents?: number;
          number_of_earning_household_members?: number;
          household_expenses_completed?: boolean;
          has_existing_debts?: boolean;
          personal_loan_payments?: number;
          business_loan_payments?: number;
          vehicle_loan_payments?: number;
          home_loan_payments?: number;
          lending_app_payments?: number;
          informal_loan_payments?: number;
          buy_now_pay_later_payments?: number;
          credit_card_payments?: number;
          co_maker_guaranteed_loan_payments?: number;
          other_debt_payments?: number;
          existing_loan_payments?: number | null;
          existing_debt_declaration_completed?: boolean;
          cash_on_hand?: number;
          bank_savings?: number;
          ewallet_balance?: number;
          inventory_value?: number;
          business_equipment_value?: number;
          vehicle_value?: number;
          property_land_value?: number;
          other_assets_value?: number;
          estimated_customer_credit_amount?: number;
          average_collection_period?: BorrowerAverageCollectionPeriod | null;
          keeps_customer_debt_list?: boolean | null;
          years_in_operation?: number | null;
          expense_breakdown?: Json;
          debt_obligation_summary?: Json;
          loan_purpose_context?: string | null;
          has_overdue_loans?: boolean;
          missed_payments_last_12_months?: boolean;
          has_unpaid_lending_app_loans?: boolean;
          has_bounced_checks?: boolean;
          is_co_maker_or_guarantor?: boolean;
          has_debt_related_legal_case?: boolean;
          has_repossession_history?: boolean;
          has_tax_arrears?: boolean;
          business_temporarily_stopped?: boolean;
          confirms_business_operating?: boolean;
          confirms_information_true?: boolean;
          consents_to_data_processing?: boolean;
          consents_to_credit_check?: boolean;
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
          borrower_credit_profile_grade: string | null;
          borrower_credit_profile_assessment: Json | null;
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
          borrower_credit_profile_grade?: string | null;
          borrower_credit_profile_assessment?: Json | null;
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
          borrower_credit_profile_grade?: string | null;
          borrower_credit_profile_assessment?: Json | null;
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
          repayment_channel: string | null;
          repayment_account_name: string | null;
          repayment_account_number: string | null;
          repayment_instructions: string | null;
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
          repayment_channel?: string | null;
          repayment_account_name?: string | null;
          repayment_account_number?: string | null;
          repayment_instructions?: string | null;
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
          repayment_channel?: string | null;
          repayment_account_name?: string | null;
          repayment_account_number?: string | null;
          repayment_instructions?: string | null;
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
      repayment_channels: {
        Row: {
          id: string;
          active_loan_id: string;
          lender_id: string;
          channel: string;
          account_name: string;
          account_number: string;
          instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          active_loan_id: string;
          lender_id: string;
          channel: string;
          account_name: string;
          account_number: string;
          instructions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          active_loan_id?: string;
          lender_id?: string;
          channel?: string;
          account_name?: string;
          account_number?: string;
          instructions?: string | null;
          created_at?: string;
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
          address_region: string | null;
          address_city_or_municipality: string | null;
          address_barangay: string | null;
          address_zip_code: string | null;
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
          address_region?: string | null;
          address_city_or_municipality?: string | null;
          address_barangay?: string | null;
          address_zip_code?: string | null;
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
          address_region?: string | null;
          address_city_or_municipality?: string | null;
          address_barangay?: string | null;
          address_zip_code?: string | null;
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
      lender_verification_documents: {
        Row: {
          id: string;
          lender_id: string;
          lender_profile_id: string;
          storage_bucket: string;
          storage_path: string;
          document_type: LenderVerificationDocumentType;
          file_name: string;
          file_type: string;
          file_size: number;
          status: LenderVerificationDocumentStatus;
          uploaded_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lender_id: string;
          lender_profile_id: string;
          storage_bucket?: string;
          storage_path: string;
          document_type: LenderVerificationDocumentType;
          file_name: string;
          file_type: string;
          file_size: number;
          status?: LenderVerificationDocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lender_id?: string;
          lender_profile_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          document_type?: LenderVerificationDocumentType;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          status?: LenderVerificationDocumentStatus;
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lender_profile_change_requests: {
        Row: {
          id: string;
          lender_id: string;
          lender_profile_id: string;
          proposed_organization_name: string | null;
          proposed_business_registration_number: string | null;
          proposed_business_address: string | null;
          proposed_operating_area: string | null;
          proposed_min_loan_amount: number | null;
          proposed_max_loan_amount: number | null;
          proposed_typical_repayment_terms: string | null;
          proposed_lender_description: string | null;
          proposed_contact_person: string | null;
          proposed_address_region: string | null;
          proposed_address_city: string | null;
          proposed_address_barangay: string | null;
          proposed_address_zip_code: string | null;
          proposed_values: Json;
          status: LenderProfileChangeRequestStatus;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          manager_review_notes: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lender_id: string;
          lender_profile_id: string;
          proposed_organization_name?: string | null;
          proposed_business_registration_number?: string | null;
          proposed_business_address?: string | null;
          proposed_operating_area?: string | null;
          proposed_min_loan_amount?: number | null;
          proposed_max_loan_amount?: number | null;
          proposed_typical_repayment_terms?: string | null;
          proposed_lender_description?: string | null;
          proposed_contact_person?: string | null;
          proposed_address_region?: string | null;
          proposed_address_city?: string | null;
          proposed_address_barangay?: string | null;
          proposed_address_zip_code?: string | null;
          proposed_values?: Json;
          status?: LenderProfileChangeRequestStatus;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lender_id?: string;
          lender_profile_id?: string;
          proposed_organization_name?: string | null;
          proposed_business_registration_number?: string | null;
          proposed_business_address?: string | null;
          proposed_operating_area?: string | null;
          proposed_min_loan_amount?: number | null;
          proposed_max_loan_amount?: number | null;
          proposed_typical_repayment_terms?: string | null;
          proposed_lender_description?: string | null;
          proposed_contact_person?: string | null;
          proposed_address_region?: string | null;
          proposed_address_city?: string | null;
          proposed_address_barangay?: string | null;
          proposed_address_zip_code?: string | null;
          proposed_values?: Json;
          status?: LenderProfileChangeRequestStatus;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          manager_review_notes?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          additional_roles: AppRole[];
          display_name: string;
          status: ProfileStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: AppRole;
          additional_roles?: AppRole[];
          display_name: string;
          status?: ProfileStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: AppRole;
          additional_roles?: AppRole[];
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
          p_repayment_channel?: string | null;
          p_repayment_account_name?: string | null;
          p_repayment_account_number?: string | null;
          p_repayment_instructions?: string | null;
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
          p_lender_description?: string | null;
          p_address_region?: string | null;
          p_address_city?: string | null;
          p_address_barangay?: string | null;
          p_address_zip_code?: string | null;
        };
        Returns: Json;
      };
      submit_lender_verification_document: {
        Args: {
          p_lender_profile_id: string;
          p_storage_path: string;
          p_document_type: LenderVerificationDocumentType;
          p_file_name: string;
          p_file_type: string;
          p_file_size: number;
        };
        Returns: Json;
      };
      review_lender_verification_document: {
        Args: {
          p_document_id: string;
          p_decision: string;
          p_review_notes?: string | null;
        };
        Returns: Json;
      };
      submit_lender_profile_change_request: {
        Args: {
          p_lender_profile_id: string;
          p_proposed_organization_name?: string | null;
          p_proposed_contact_person?: string | null;
          p_proposed_business_address?: string | null;
          p_proposed_operating_area?: string | null;
          p_proposed_business_registration_number?: string | null;
          p_proposed_min_loan_amount?: number | null;
          p_proposed_max_loan_amount?: number | null;
          p_proposed_typical_repayment_terms?: string | null;
          p_proposed_lender_description?: string | null;
          p_proposed_address_region?: string | null;
          p_proposed_address_city?: string | null;
          p_proposed_address_barangay?: string | null;
          p_proposed_address_zip_code?: string | null;
        };
        Returns: Json;
      };
      cancel_lender_profile_change_request: {
        Args: {
          p_request_id: string;
        };
        Returns: Json;
      };
      review_lender_profile_change_request: {
        Args: {
          p_request_id: string;
          p_decision: string;
          p_manager_review_notes?: string | null;
          p_rejection_reason?: string | null;
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
      manager_dashboard_monthly_headcount: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month_key: string;
          active_count: number;
          pending_count: number;
          suspended_count: number;
          total_count: number;
        }[];
      };
      manager_dashboard_status_distribution: {
        Args: Record<PropertyKey, never>;
        Returns: {
          status: string;
          count: number;
        }[];
      };
      manager_dashboard_monthly_activity: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month_key: string;
          applications: number;
          offers: number;
          loans: number;
        }[];
      };
      manager_dashboard_pending_action_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          pending_borrower_verifications: number;
          pending_lender_reviews: number;
          open_applications: number;
          pending_repayment_reviews: number;
        }[];
      };
      manager_dashboard_lender_performance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          lender_id: string;
          display_name: string;
          active_loan_count: number;
          accepted_offer_count: number;
          business_type: string;
          business_type_active_loans: number;
          business_type_accepted_offers: number;
        }[];
      };
      manager_dashboard_borrower_performance: {
        Args: Record<PropertyKey, never>;
        Returns: {
          borrower_id: string;
          display_name: string;
          status: string;
          accepted_application_count: number;
          verified_repayment_count: number;
          active_loan_count: number;
          paid_loan_count: number;
          rejected_proof_count: number;
          overdue_defaulted_loan_count: number;
          credit_profile_grade: string;
        }[];
      };
      add_repayment_channel: {
        Args: {
          p_active_loan_id: string;
          p_channel: string;
          p_account_name: string;
          p_account_number: string;
          p_instructions?: string | null;
        };
        Returns: Json;
      };
      remove_repayment_channel: {
        Args: {
          p_channel_id: string;
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
      borrower_ownership_type: BorrowerOwnershipType;
      borrower_role: BorrowerRole;
      borrower_business_schedule: BorrowerBusinessSchedule;
      borrower_business_registration_type: BorrowerBusinessRegistrationType;
      borrower_average_collection_period: BorrowerAverageCollectionPeriod;
      borrower_verification_status: BorrowerVerificationStatus;
      borrower_verification_document_status: BorrowerVerificationDocumentStatus;
      borrower_verification_document_type: BorrowerVerificationDocumentType;
      lender_verification_status: LenderVerificationStatus;
      lender_verification_document_type: LenderVerificationDocumentType;
      lender_verification_document_status: LenderVerificationDocumentStatus;
      lender_profile_change_request_status: LenderProfileChangeRequestStatus;
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
