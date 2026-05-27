"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, type SignupState } from "@/app/signup/actions";
import type { SignupRole } from "@/lib/signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: SignupState = {
  message: "",
  status: "idle",
};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<SignupRole>("borrower");
  const isSuccess = state.status === "success";

  return (
    <Card className="shadow-form">
      <CardHeader>
        <CardTitle className="text-3xl font-semibold tracking-[-0.01em]">Create account</CardTitle>
        <CardDescription>Borrowers can start a profile. Lenders enter review before workspace access.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5">
          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium text-foreground">
              Account type
            </legend>
            <RadioGroup
              defaultValue="borrower"
              value={role}
              onValueChange={(val) => setRole(val as SignupRole)}
              name="role"
              className="grid grid-cols-2 gap-2"
            >
              <div>
                <RadioGroupItem value="borrower" id="role-borrower" className="peer sr-only" />
                <Label
                  htmlFor="role-borrower"
                  className="flex h-12 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm font-semibold hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-all"
                >
                  Borrower
                </Label>
              </div>
              <div>
                <RadioGroupItem value="lender" id="role-lender" className="peer sr-only" />
                <Label
                  htmlFor="role-lender"
                  className="flex h-12 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm font-semibold hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-all"
                >
                  Lender
                </Label>
              </div>
            </RadioGroup>
            <FieldError messages={state.fieldErrors?.role} />
          </fieldset>

          <TextField
            label="Full name"
            name="displayName"
            autoComplete="name"
            error={state.fieldErrors?.displayName}
          />

          {role === "lender" ? (
            <section className="grid gap-4 rounded-md border border-border bg-muted/30 px-4 py-4">
              <div className="grid gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  Lender review profile
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Managers use this information to review lender access.
                </p>
              </div>

              <TextField
                label="Organization"
                name="organizationName"
                autoComplete="organization"
                error={state.fieldErrors?.organizationName}
              />
              <TextField
                label="Contact person"
                name="contactPerson"
                autoComplete="name"
                error={state.fieldErrors?.contactPerson}
              />
              <TextField
                label="Phone number"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                error={state.fieldErrors?.phoneNumber}
              />
              <TextField
                label="Business address"
                name="businessAddress"
                autoComplete="street-address"
                error={state.fieldErrors?.businessAddress}
              />
              <TextField
                label="Operating area"
                name="operatingArea"
                error={state.fieldErrors?.operatingArea}
              />
              <TextField
                label="Business registration number"
                name="businessRegistrationNumber"
                required={false}
                error={state.fieldErrors?.businessRegistrationNumber}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Minimum loan amount"
                  name="minLoanAmount"
                  type="number"
                  min="1"
                  step="1"
                  error={state.fieldErrors?.minLoanAmount}
                />
                <TextField
                  label="Maximum loan amount"
                  name="maxLoanAmount"
                  type="number"
                  min="1"
                  step="1"
                  error={state.fieldErrors?.maxLoanAmount}
                />
              </div>
              <TextField
                label="Typical repayment terms"
                name="typicalRepaymentTerms"
                error={state.fieldErrors?.typicalRepaymentTerms}
              />
              <TextAreaField
                label="Lender description"
                name="lenderDescription"
                error={state.fieldErrors?.lenderDescription}
              />
            </section>
          ) : null}

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={state.fieldErrors?.email}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            error={state.fieldErrors?.password}
          />

          <TextField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={state.fieldErrors?.confirmPassword}
          />

          <fieldset className="grid gap-3">
            <legend className="sr-only">Required disclosures</legend>
            <ConsentCheckbox
              name="termsAccepted"
              id="termsAccepted"
              label="I agree to the LendFolio Terms of Service."
              error={state.fieldErrors?.termsAccepted}
            />
            <ConsentCheckbox
              name="privacyAccepted"
              id="privacyAccepted"
              label="I acknowledge the LendFolio Privacy Notice."
              error={state.fieldErrors?.privacyAccepted}
            />
          </fieldset>

          {state.message ? (
            <p
              className={`border-l-2 px-4 py-3 text-sm leading-6 ${isSuccess
                  ? "border-[var(--primary)] bg-[#edf5f1] text-[#244a3c]"
                  : "border-[var(--accent)] bg-[var(--background)] text-[var(--muted-foreground)]"
                }`}
              role={isSuccess ? "status" : "alert"}
            >
              {state.message}
            </p>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function ConsentCheckbox({
  name,
  id,
  label,
  error,
}: {
  name: string;
  id: string;
  label: string;
  error?: string[];
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center space-x-2">
        <Checkbox id={id} name={name} value="on" required />
        <Label htmlFor={id} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      </div>
      <FieldError messages={error} />
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  min,
  step,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  min?: string;
  step?: string;
  error?: string[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        min={min}
        step={step}
        autoComplete={autoComplete}
        required={required}
      />
      <FieldError messages={error} />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  error,
}: {
  label: string;
  name: string;
  error?: string[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
      </Label>
      <Textarea
        id={name}
        name={name}
        rows={5}
        required
      />
      <FieldError messages={error} />
    </div>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-red-700" role="alert">
      {messages[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full mt-1">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}
