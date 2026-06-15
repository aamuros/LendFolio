"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { saveLenderDetailsAction, type LenderDetailsSaveState } from "@/app/lender/actions";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BorrowerCard, StatusPill } from "@/components/borrower/ui";
import { getLenderProfileCompletion } from "@/lib/lender-profile-completion";

type LenderDetailsProfile = {
  contact_person: string | null;
  phone_number: string | null;
  operating_area: string | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
};

const initialState: LenderDetailsSaveState = {
  status: "idle",
  message: "",
};

export function LenderDetailsCompletionForm({
  lenderProfile,
}: {
  lenderProfile: LenderDetailsProfile;
}) {
  const [state, formAction, pending] = useActionState(
    saveLenderDetailsAction,
    initialState,
  );
  const completion = getLenderProfileCompletion(lenderProfile);

  return (
    <BorrowerCard>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Complete lender details
            </CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">
              Add the details managers need before approval.
            </CardDescription>
          </div>
          <StatusPill tone={completion.complete ? "success" : "attention"}>
            {completion.complete ? "Complete" : "Action needed"}
          </StatusPill>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {!completion.complete ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              Action needed: Complete lender details before manager review.
              Missing: {completion.missingFields.join(", ")}.
            </p>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
              Lender details submitted.
            </p>
          )}

          {state.message ? (
            <p
              className={
                state.status === "success"
                  ? "text-sm font-medium text-emerald-700"
                  : "text-sm font-medium text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="contactPerson"
              label="Contact person"
              error={state.fieldErrors?.contactPerson?.[0]}
            >
              <Input
                id="contactPerson"
                name="contactPerson"
                defaultValue={lenderProfile.contact_person ?? ""}
                maxLength={120}
                placeholder="Authorized contact"
              />
            </Field>
            <Field
              id="phoneNumber"
              label="Phone number"
              error={state.fieldErrors?.phoneNumber?.[0]}
            >
              <Input
                id="phoneNumber"
                name="phoneNumber"
                defaultValue={lenderProfile.phone_number ?? ""}
                maxLength={30}
                placeholder="+63 9XX XXX XXXX"
                required
              />
            </Field>
            <Field
              id="operatingArea"
              label="Lending area"
              error={state.fieldErrors?.operatingArea?.[0]}
            >
              <Input
                id="operatingArea"
                name="operatingArea"
                defaultValue={lenderProfile.operating_area ?? ""}
                maxLength={160}
                placeholder="NCR, Cebu, Davao"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="minLoanAmount"
                label="Minimum loan"
                error={state.fieldErrors?.minLoanAmount?.[0]}
              >
                <Input
                  id="minLoanAmount"
                  name="minLoanAmount"
                  type="number"
                  min={1}
                  step="0.01"
                  defaultValue={lenderProfile.min_loan_amount ?? ""}
                  required
                />
              </Field>
              <Field
                id="maxLoanAmount"
                label="Maximum loan"
                error={state.fieldErrors?.maxLoanAmount?.[0]}
              >
                <Input
                  id="maxLoanAmount"
                  name="maxLoanAmount"
                  type="number"
                  min={1}
                  step="0.01"
                  defaultValue={lenderProfile.max_loan_amount ?? ""}
                  required
                />
              </Field>
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-full font-semibold sm:w-fit"
            disabled={pending}
          >
            {pending ? "Saving..." : "Save lender details"}
          </Button>
        </form>
      </CardContent>
    </BorrowerCard>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
