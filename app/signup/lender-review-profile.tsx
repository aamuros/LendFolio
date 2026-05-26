import type { ReactNode } from "react";
import { TextAreaField, TextField } from "@/app/signup/form-fields";
import type { SignupState } from "@/app/signup/actions";

export function LenderReviewProfile({ state }: { state: SignupState }) {
  return (
    <section
      className="grid gap-5 border-y border-[var(--border)] bg-[var(--muted)]/10 py-5"
      aria-labelledby="lender-review-profile-heading"
    >
      <div className="grid gap-1">
        <h2
          id="lender-review-profile-heading"
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          Lender review profile
        </h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          This profile helps managers review your organization before lender
          access is approved.
        </p>
      </div>

      <LenderFieldGroup title="Organization">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Organization"
            name="organizationName"
            autoComplete="organization"
            defaultValue={state.values?.organizationName}
            error={state.fieldErrors?.organizationName}
          />
          <TextField
            label="Contact person"
            name="contactPerson"
            autoComplete="name"
            defaultValue={state.values?.contactPerson}
            error={state.fieldErrors?.contactPerson}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            defaultValue={state.values?.phoneNumber}
            error={state.fieldErrors?.phoneNumber}
          />
          <TextField
            label="Registration number"
            name="businessRegistrationNumber"
            required={false}
            defaultValue={state.values?.businessRegistrationNumber}
            error={state.fieldErrors?.businessRegistrationNumber}
          />
        </div>
        <TextField
          label="Business address"
          name="businessAddress"
          autoComplete="street-address"
          defaultValue={state.values?.businessAddress}
          error={state.fieldErrors?.businessAddress}
        />
      </LenderFieldGroup>

      <LenderFieldGroup title="Lending scope">
        <TextField
          label="Operating area"
          name="operatingArea"
          defaultValue={state.values?.operatingArea}
          error={state.fieldErrors?.operatingArea}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Minimum loan amount"
            name="minLoanAmount"
            type="number"
            min="1"
            step="1"
            defaultValue={state.values?.minLoanAmount}
            error={state.fieldErrors?.minLoanAmount}
          />
          <TextField
            label="Maximum loan amount"
            name="maxLoanAmount"
            type="number"
            min="1"
            step="1"
            defaultValue={state.values?.maxLoanAmount}
            error={state.fieldErrors?.maxLoanAmount}
          />
        </div>
        <TextField
          label="Typical repayment terms"
          name="typicalRepaymentTerms"
          defaultValue={state.values?.typicalRepaymentTerms}
          error={state.fieldErrors?.typicalRepaymentTerms}
        />
      </LenderFieldGroup>

      <LenderFieldGroup title="Review note">
        <TextAreaField
          label="Lender description"
          name="lenderDescription"
          helperText="Describe the borrowers, loans, or regions you typically support."
          defaultValue={state.values?.lenderDescription}
          error={state.fieldErrors?.lenderDescription}
        />
      </LenderFieldGroup>
    </section>
  );
}

function LenderFieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-[var(--subtle-foreground)] uppercase">
        {title}
      </h3>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}
