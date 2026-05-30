import { redirect } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";
import { getCurrentUserProfile } from "@/lib/access-control";
import { LenderOnboardingForm } from "@/app/lender/onboarding/lender-onboarding-form";

export const dynamic = "force-dynamic";

export default async function LenderOnboardingPage() {
  const access = await getCurrentUserProfile();

  if (!access.ok) {
    redirect("/login");
  }

  if (access.profile.role !== "lender") {
    redirect(
      access.profile.role === "borrower" ? "/borrower" : "/",
    );
  }

  if (access.profile.lenderProfile?.verification_status === "approved") {
    redirect("/lender");
  }

  if (access.profile.lenderProfile?.verification_status === "pending") {
    redirect("/lender");
  }

  const lenderProfile = access.profile.lenderProfile;

  const defaultValues = {
    organizationName: lenderProfile?.organization_name ?? "",
    contactPerson: lenderProfile?.contact_person ?? "",
    phoneNumber: lenderProfile?.phone_number ?? "",
    businessAddress: lenderProfile?.business_address ?? "",
    operatingArea: lenderProfile?.operating_area ?? "",
    businessRegistrationNumber:
      lenderProfile?.business_registration_number ?? "",
    minLoanAmount:
      lenderProfile?.min_loan_amount != null
        ? String(lenderProfile.min_loan_amount)
        : "",
    maxLoanAmount:
      lenderProfile?.max_loan_amount != null
        ? String(lenderProfile.max_loan_amount)
        : "",
    typicalRepaymentTerms: lenderProfile?.typical_repayment_terms ?? "",
    lenderDescription: lenderProfile?.lender_description ?? "",
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
          LendFolio
        </Link>
        <LenderOnboardingForm
          verificationStatus={
            lenderProfile?.verification_status ?? "incomplete"
          }
          rejectionReason={lenderProfile?.rejection_reason ?? null}
          managerReviewNotes={lenderProfile?.manager_review_notes ?? null}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}
