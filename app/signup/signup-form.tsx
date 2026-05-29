"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction, type SignupState } from "@/app/signup/actions";
import type { SignupRole } from "@/lib/signup";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

const initialState: SignupState = {
  message: "",
  status: "idle",
};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<SignupRole>("borrower");
  const isSuccess = state.status === "success";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription>
          Borrowers can start a profile. Lenders enter review before workspace access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup>
            <Field>
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">
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
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm font-semibold transition-all",
                        "hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                      )}
                    >
                      Borrower
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="lender" id="role-lender" className="peer sr-only" />
                    <Label
                      htmlFor="role-lender"
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background text-sm font-semibold transition-all",
                        "hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                      )}
                    >
                      Lender
                    </Label>
                  </div>
                </RadioGroup>
                <FieldErrorHelper messages={state.fieldErrors?.role} />
              </fieldset>
            </Field>

            <Field>
              <FieldLabel htmlFor="displayName">Full name</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.displayName} />
            </Field>

            {role === "lender" ? (
              <div className="grid gap-4 rounded-md border border-border bg-muted/30 px-4 py-4">
                <div className="grid gap-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    Lender review profile
                  </h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Managers use this information to review lender access.
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor="organizationName">Organization</FieldLabel>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    autoComplete="organization"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.organizationName} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="contactPerson">Contact person</FieldLabel>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    autoComplete="name"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.contactPerson} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.phoneNumber} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="businessAddress">Business address</FieldLabel>
                  <Input
                    id="businessAddress"
                    name="businessAddress"
                    autoComplete="street-address"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.businessAddress} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="operatingArea">Operating area</FieldLabel>
                  <Input
                    id="operatingArea"
                    name="operatingArea"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.operatingArea} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="businessRegistrationNumber">Business registration number</FieldLabel>
                  <Input
                    id="businessRegistrationNumber"
                    name="businessRegistrationNumber"
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.businessRegistrationNumber} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="minLoanAmount">Minimum loan amount</FieldLabel>
                    <Input
                      id="minLoanAmount"
                      name="minLoanAmount"
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                    <FieldErrorHelper messages={state.fieldErrors?.minLoanAmount} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="maxLoanAmount">Maximum loan amount</FieldLabel>
                    <Input
                      id="maxLoanAmount"
                      name="maxLoanAmount"
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                    <FieldErrorHelper messages={state.fieldErrors?.maxLoanAmount} />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="typicalRepaymentTerms">Typical repayment terms</FieldLabel>
                  <Input
                    id="typicalRepaymentTerms"
                    name="typicalRepaymentTerms"
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.typicalRepaymentTerms} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="lenderDescription">Lender description</FieldLabel>
                  <Textarea
                    id="lenderDescription"
                    name="lenderDescription"
                    rows={4}
                    required
                  />
                  <FieldErrorHelper messages={state.fieldErrors?.lenderDescription} />
                </Field>
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.email} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.password} />
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
              <FieldErrorHelper messages={state.fieldErrors?.confirmPassword} />
            </Field>

            <fieldset className="grid gap-2">
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
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <SubmitButton />
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
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
    <div className="grid gap-1">
      <div className="flex items-center space-x-2">
        <Checkbox id={id} name={name} value="on" required />
        <Label htmlFor={id} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      </div>
      <FieldErrorHelper messages={error} />
    </div>
  );
}

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}
