import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type BorrowerLender = {
  id: string;
  organizationName: string;
  operatingArea: string | null;
  minLoanAmount: number | null;
  maxLoanAmount: number | null;
  typicalRepaymentTerms: string | null;
  description: string | null;
};

type LenderDirectoryRow = {
  id: string;
  organization_name: string;
  operating_area: string | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  typical_repayment_terms: string | null;
  lender_description: string | null;
};

export async function loadBorrowerLenders(
  supabase: SupabaseClient<Database>,
): Promise<{ data: BorrowerLender[]; error: string | null }> {
  const { data, error } = await supabase.rpc("list_approved_lenders_for_borrowers");

  if (error) return { data: [], error: "We couldn't load lenders right now." };

  return {
    data: ((data ?? []) as LenderDirectoryRow[]).map((row) => ({
      id: row.id,
      organizationName: row.organization_name,
      operatingArea: row.operating_area,
      minLoanAmount: row.min_loan_amount,
      maxLoanAmount: row.max_loan_amount,
      typicalRepaymentTerms: row.typical_repayment_terms,
      description: row.lender_description,
    })),
    error: null,
  };
}
