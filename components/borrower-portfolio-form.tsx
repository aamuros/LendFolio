"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegisterReturn,
} from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolioStep,
} from "@/app/borrower/actions";
import { AddressSelect } from "@/components/address/address-select";
import { CurrencyInput } from "@/components/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import {
  averageCollectionPeriodLabels,
  averageCollectionPeriodOptions,
  copyHomeAddressToBusinessAddress,
  borrowerPortfolioSchema,
  borrowerPortfolioStepIds,
  borrowerPortfolioStepLabels,
  borrowerRoleLabels,
  borrowerRoleOptions,
  businessRegistrationTypeLabels,
  businessRegistrationTypeOptions,
  businessScheduleLabels,
  businessScheduleOptions,
  businessTypeLabels,
  businessTypeOptions,
  calculateDisposableIncome,
  calculateNetMonthlyBusinessIncome,
  calculateTotalBusinessExpenses,
  calculateTotalDeclaredAssets,
  calculateTotalExistingDebtPayments,
  calculateTotalHouseholdExpenses,
  formatHomeAddress,
  getBorrowerPortfolioDefaultValues,
  getCompletedBorrowerPortfolioSteps,
  getNextIncompleteBorrowerPortfolioStep,
  isPhysicalBusinessAddressRequired,
  loanPurposeCategoryLabels,
  loanPurposeCategoryOptions,
  mainProductsOrServicesCategoryLabels,
  mainProductsOrServicesCategoryOptions,
  operatingModelLabels,
  operatingModelOptions,
  ownershipTypeLabels,
  ownershipTypeOptions,
  primarySalesChannelLabels,
  primarySalesChannelOptions,
  revenueConfidenceLabels,
  revenueConfidenceOptions,
  revenuePeriodLabels,
  revenuePeriodOptions,
  type BorrowerPortfolioFormInput,
  type BorrowerPortfolioInput,
  type BorrowerPortfolioStep,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { getBarangaysByCity } from "@/lib/philippine-addresses";
import { parseMoneyInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";

const defaultValues = getBorrowerPortfolioDefaultValues();
type LoadState = "loading" | "empty" | "ready" | "error";

type BorrowerPortfolioFormProps = {
  initialStep?: BorrowerPortfolioStep;
  onCancel?: () => void;
  onSaved?: (portfolio: BorrowerPortfolioInput) => void;
};

export function BorrowerPortfolioForm({
  initialStep,
  onCancel,
  onSaved,
}: BorrowerPortfolioFormProps = {}) {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sameAsHomeMessage, setSameAsHomeMessage] = useState("");
  const [completedSteps, setCompletedSteps] = useState<BorrowerPortfolioStep[]>(
    [],
  );
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<keyof BorrowerPortfolioInput, string[]>>
  >({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<BorrowerPortfolioFormInput, unknown, BorrowerPortfolioInput>({
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(() =>
    getStepIndex(initialStep),
  );
  const currentValues = useWatch({ control }) as BorrowerPortfolioFormInput;
  const isBusinessAddressSameAsHome = useWatch({
    control,
    name: "isBusinessAddressSameAsHome",
  });
  const operatingModel = useWatch({
    control,
    name: "operatingModel",
  });
  const homeAddressSelection = useWatch({
    control,
    name: "homeAddressSelection",
  });
  const homeStreetAddress = useWatch({
    control,
    name: "homeStreetAddress",
  });
  const businessAddress = useWatch({
    control,
    name: "address",
  });
  const mainProductsOrServicesCategory = useWatch({
    control,
    name: "mainProductsOrServicesCategory",
  });
  const hasExistingDebts = useWatch({
    control,
    name: "hasExistingDebts",
  });
  const shouldShowBusinessAddress =
    isPhysicalBusinessAddressRequired(operatingModel);
  const isHomeAddressComplete = Boolean(
    homeAddressSelection?.regionCode &&
      homeAddressSelection?.cityOrMunicipality &&
      homeAddressSelection?.barangay &&
      homeAddressSelection?.zipCode &&
      homeStreetAddress?.trim(),
  );
  const parsedCurrent = borrowerPortfolioSchema.safeParse({
    ...defaultValues,
    ...currentValues,
  });
  const currentPortfolio = parsedCurrent.success
    ? parsedCurrent.data
    : defaultValues;
  const readiness = evaluateBorrowerReadiness(currentPortfolio);
  const currentStep = profileSteps[currentStepIndex];
  const progressValue =
    currentStep.id === "review"
      ? 100
      : ((currentStepIndex + 1) / (profileSteps.length - 1)) * 100;
  const isFinalStep = currentStepIndex === profileSteps.length - 1;

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) return;

        if (result.ok && result.data) {
          reset(result.data);
          const savedCompletedSteps = getCompletedBorrowerPortfolioSteps(
            result.data,
          );
          setCompletedSteps(savedCompletedSteps);
          setCurrentStepIndex(
            getStepIndex(
              initialStep ?? getNextIncompleteBorrowerPortfolioStep(result.data),
            ),
          );
          setLoadState("ready");
          setStatusMessage("");
          setSuccessMessage("");
          return;
        }

        setCurrentStepIndex(getStepIndex(initialStep));
        setCompletedSteps([]);
        setLoadState(result.ok ? "empty" : "error");
        setStatusMessage(result.message);
        setSuccessMessage("");
      });
    });

    return () => {
      isActive = false;
    };
  }, [initialStep, reset, startTransition]);

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => setSuccessMessage(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!isBusinessAddressSameAsHome) return;

    const copiedAddress = copyHomeAddressToBusinessAddress(
      homeAddressSelection,
      homeStreetAddress,
    );

    setValue("address.regionCode", copiedAddress.regionCode, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("address.regionName", copiedAddress.regionName, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("address.cityOrMunicipality", copiedAddress.cityOrMunicipality, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("address.zipCode", copiedAddress.zipCode, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("streetAddress", copiedAddress.streetAddress, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setValue("address.barangay", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [
    homeAddressSelection,
    homeStreetAddress,
    isBusinessAddressSameAsHome,
    setValue,
  ]);

  useEffect(() => {
    if (!isBusinessAddressSameAsHome) return;

    const copiedBarangay = homeAddressSelection?.barangay ?? "";
    const businessBarangays =
      businessAddress?.regionCode && businessAddress.cityOrMunicipality
        ? getBarangaysByCity(
            businessAddress.regionCode,
            businessAddress.cityOrMunicipality,
          )
        : [];
    if (!copiedBarangay) return;
    if (!businessAddress?.regionCode || !businessAddress?.cityOrMunicipality) {
      return;
    }
    if (!businessBarangays.includes(copiedBarangay)) return;
    if (businessAddress.barangay === copiedBarangay) return;

    setValue("address.barangay", copiedBarangay, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [
    businessAddress?.barangay,
    businessAddress?.cityOrMunicipality,
    businessAddress?.regionCode,
    homeAddressSelection?.barangay,
    isBusinessAddressSameAsHome,
    setValue,
  ]);

  useEffect(() => {
    if (hasExistingDebts) return;

    debtFields.forEach(([name]) => {
      setValue(name, 0, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    });
    setValue("existingLoanPayments", 0, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }, [hasExistingDebts, setValue]);

  function onSubmit(values: BorrowerPortfolioInput) {
    void saveCurrentStep(values);
  }

  async function saveCurrentStep(values: BorrowerPortfolioInput) {
    setStatusMessage(`Saving ${currentStep.title.toLowerCase()}...`);
    setSuccessMessage("");
    setServerErrors({});

    startTransition(async () => {
      const result = await saveBorrowerPortfolioStep(currentStep.id, values);
      setLoadState(result.ok ? "ready" : "error");
      if (result.ok) {
        setStatusMessage("");
        setSuccessMessage(result.message);
        setCompletedSteps(result.completedSteps);
        reset(result.portfolio);
        if (isFinalStep) {
          onSaved?.(result.portfolio);
        } else {
          setCurrentStepIndex((index) =>
            Math.min(index + 1, profileSteps.length - 1),
          );
        }
        window.dispatchEvent(new Event(borrowerPortfolioSavedEvent));
      } else {
        setStatusMessage(result.message);
        if (result.fieldErrors) {
          setServerErrors(result.fieldErrors);
        }
      }
    });
  }

  if (loadState === "loading") {
    return <BorrowerPortfolioFormSkeleton />;
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          onChange={() => {
            if (successMessage) setSuccessMessage("");
            if (Object.keys(serverErrors).length > 0) setServerErrors({});
          }}
          className="grid gap-6"
          aria-describedby="portfolio-save-state"
        >
          {loadState === "error" ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          <WizardHeader
            stepNumber={currentStepIndex + 1}
            totalSteps={profileSteps.length - 1}
            title={currentStep.title}
            progressValue={progressValue}
            completedSteps={completedSteps}
          />

          {currentStep.id === "homeAddress" ? (
            <FormSection title="Personal / Home address">
              <SelectField
                control={control}
                name="country"
                label="Country"
                options={["Philippines"] as const}
                labels={{ Philippines: "Philippines" }}
                error={errors.country?.message}
              />
              <TextField
                id="mobileNumber"
                label="Mobile number"
                error={errors.mobileNumber?.message}
                register={register("mobileNumber")}
              />
              <NumberField
                id="yearsAtCurrentAddress"
                label="Years at current address"
                error={errors.yearsAtCurrentAddress?.message}
                register={register("yearsAtCurrentAddress", {
                  setValueAs: parseMoneyInput,
                })}
                step="0.5"
              />
              <div className="sm:col-span-2">
                <Controller
                  control={control}
                  name="homeAddressSelection"
                  render={({ field }) => (
                    <AddressSelect
                      value={field.value}
                      onChange={field.onChange}
                      idPrefix="borrower-home-address"
                      required
                      errors={{
                        regionCode: errors.homeAddressSelection?.regionCode?.message,
                        cityOrMunicipality:
                          errors.homeAddressSelection?.cityOrMunicipality
                            ?.message,
                        barangay: errors.homeAddressSelection?.barangay?.message,
                        zipCode: errors.homeAddressSelection?.zipCode?.message,
                      }}
                      showZipCode={false}
                      legacyAddress={currentValues.homeAddress}
                    />
                  )}
                />
              </div>
              <TextField
                id="homeStreetAddress"
                label="Street / house no. / unit / landmark / specific address"
                error={errors.homeStreetAddress?.message}
                register={register("homeStreetAddress")}
                className="sm:col-span-2"
              />
              <TextField
                id="emergencyContactName"
                label="Emergency contact name"
                error={errors.emergencyContactName?.message}
                register={register("emergencyContactName")}
              />
              <TextField
                id="emergencyContactNumber"
                label="Emergency contact number"
                error={errors.emergencyContactNumber?.message}
                register={register("emergencyContactNumber")}
              />
              <TextField
                id="emergencyContactRelationship"
                label="Emergency contact relationship"
                error={errors.emergencyContactRelationship?.message}
                register={register("emergencyContactRelationship")}
              />
            </FormSection>
          ) : null}

          {currentStep.id === "businessBasics" ? (
            <FormSection title="Business basics">
              <TextField
                id="businessName"
                label="Business name"
                error={errors.businessName?.message}
                register={register("businessName")}
              />
              <SelectField
                control={control}
                name="businessType"
                label="Business type"
                options={businessTypeOptions}
                labels={businessTypeLabels}
                error={errors.businessType?.message}
              />
              <SelectField
                control={control}
                name="ownershipType"
                label="Ownership type"
                options={ownershipTypeOptions}
                labels={ownershipTypeLabels}
                error={errors.ownershipType?.message}
              />
              <SelectField
                control={control}
                name="borrowerRole"
                label="Your role"
                options={borrowerRoleOptions}
                labels={borrowerRoleLabels}
                error={errors.borrowerRole?.message}
              />
              <NumberField
                id="yearsInOperation"
                label="Years in operation"
                error={errors.yearsInOperation?.message}
                register={register("yearsInOperation", {
                  setValueAs: parseMoneyInput,
                })}
                step="0.5"
              />
              <SelectField
                control={control}
                name="operatingModel"
                label="Operating model"
                options={operatingModelOptions}
                labels={operatingModelLabels}
                error={errors.operatingModel?.message}
              />
              <SelectField
                control={control}
                name="primarySalesChannel"
                label="Primary sales channel"
                options={primarySalesChannelOptions}
                labels={primarySalesChannelLabels}
                error={errors.primarySalesChannel?.message}
              />
              <SelectField
                control={control}
                name="businessSchedule"
                label="Business schedule"
                options={businessScheduleOptions}
                labels={businessScheduleLabels}
                error={errors.businessSchedule?.message}
              />
              <NumberField
                id="numberOfEmployees"
                label="Number of employees"
                error={errors.numberOfEmployees?.message}
                register={register("numberOfEmployees", {
                  setValueAs: parseMoneyInput,
                })}
                step="1"
              />
              <SelectField
                control={control}
                name="mainProductsOrServicesCategory"
                label="Main products or services"
                options={mainProductsOrServicesCategoryOptions}
                labels={mainProductsOrServicesCategoryLabels}
                error={errors.mainProductsOrServicesCategory?.message}
              />
              {mainProductsOrServicesCategory === "other" ? (
                <TextField
                  id="mainProductsOrServicesOther"
                  label="Please specify"
                  error={errors.mainProductsOrServicesOther?.message}
                  register={register("mainProductsOrServicesOther")}
                />
              ) : null}
              <TextField
                id="mainSuppliers"
                label="Main suppliers"
                error={errors.mainSuppliers?.message}
                register={register("mainSuppliers")}
              />
              <CheckboxField
                control={control}
                name="keepsSalesRecords"
                label="Keeps sales records"
              />
              <CheckboxField
                control={control}
                name="usesBankOrEwallet"
                label="Uses bank or e-wallet"
              />
            </FormSection>
          ) : null}

          {currentStep.id === "businessAddress" ? (
            <FormSection title="Business address">
              {shouldShowBusinessAddress ? (
                <>
                  <Controller
                    control={control}
                    name="isBusinessAddressSameAsHome"
                    render={({ field }) => {
                      const checkboxDisabled =
                        !isBusinessAddressSameAsHome && !isHomeAddressComplete;

                      return (
                        <div className="grid gap-2 sm:col-span-2">
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-xl bg-muted/25 px-4 py-3 transition-colors",
                              checkboxDisabled
                                ? "cursor-not-allowed opacity-80"
                                : "hover:bg-muted/40",
                            )}
                            onClick={() => {
                              if (checkboxDisabled) {
                                setSameAsHomeMessage(
                                  "Complete your home address first before copying it to business address.",
                                );
                              }
                            }}
                          >
                            <Checkbox
                              id="isBusinessAddressSameAsHome"
                              checked={Boolean(field.value)}
                              disabled={checkboxDisabled}
                              onCheckedChange={(checked) => {
                                const nextValue = Boolean(checked);

                                if (nextValue && !isHomeAddressComplete) {
                                  setSameAsHomeMessage(
                                    "Complete your home address first before copying it to business address.",
                                  );
                                  return;
                                }

                                setSameAsHomeMessage("");
                                field.onChange(nextValue);
                              }}
                            />
                            <Label
                              htmlFor="isBusinessAddressSameAsHome"
                              className="cursor-pointer text-sm leading-5"
                            >
                              Business address is the same as home address
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Copy your completed home address into the business
                            address fields.
                          </p>
                          {sameAsHomeMessage ? (
                            <p className="text-sm text-destructive">
                              {sameAsHomeMessage}
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  {isBusinessAddressSameAsHome ? (
                    <Alert className="sm:col-span-2">
                      <AlertDescription>
                        Business address is being copied from your home address
                        and will stay in sync while this option is selected.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="sm:col-span-2">
                    <Controller
                      control={control}
                      name="address"
                      render={({ field }) => (
                        <AddressSelect
                          value={field.value}
                          onChange={field.onChange}
                          idPrefix="borrower-business-address"
                          required
                          disabled={Boolean(isBusinessAddressSameAsHome)}
                          errors={{
                            regionCode: errors.address?.regionCode?.message,
                            cityOrMunicipality:
                              errors.address?.cityOrMunicipality?.message,
                            barangay: errors.address?.barangay?.message,
                            zipCode: errors.address?.zipCode?.message,
                          }}
                          showZipCode={false}
                        />
                      )}
                    />
                  </div>
                  <TextField
                    id="streetAddress"
                    label="Street / house no. / unit / landmark / specific address"
                    error={errors.streetAddress?.message}
                    register={register("streetAddress")}
                    className="sm:col-span-2"
                    disabled={Boolean(isBusinessAddressSameAsHome)}
                  />
                </>
              ) : (
                <Alert className="sm:col-span-2">
                  <AlertDescription>
                    Online-only business selected.
                  </AlertDescription>
                </Alert>
              )}
            </FormSection>
          ) : null}

          {currentStep.id === "businessOperations" ? (
            <FormSection title="Business operations">
              <CheckboxField
                control={control}
                name="hasBusinessRegistration"
                label="Has business registration"
              />
              <SelectField
                control={control}
                name="businessRegistrationType"
                label="Registration type"
                options={businessRegistrationTypeOptions}
                labels={businessRegistrationTypeLabels}
                error={errors.businessRegistrationType?.message}
                optional
              />
              <TextField
                id="registrationNumber"
                label="Registration number"
                error={errors.registrationNumber?.message}
                register={register("registrationNumber")}
              />
              <TextField
                id="registrationDate"
                label="Registration date"
                error={errors.registrationDate?.message}
                register={register("registrationDate")}
                type="date"
              />
              <TextField
                id="unregisteredReason"
                label="If unregistered, reason"
                error={errors.unregisteredReason?.message}
                register={register("unregisteredReason")}
                className="sm:col-span-2"
              />
            </FormSection>
          ) : null}

          {currentStep.id === "financials" ? (
            <FormSection title="Financials">
              <MoneyField
                id="averageDailySales"
                label="Average daily sales"
                error={errors.averageDailySales?.message}
                register={register("averageDailySales", {
                  setValueAs: parseMoneyInput,
                })}
              />
              <MoneyField
                id="averageWeeklySales"
                label="Average weekly sales"
                error={errors.averageWeeklySales?.message}
                register={register("averageWeeklySales", {
                  setValueAs: parseMoneyInput,
                })}
              />
              <MoneyField
                id="monthlyGrossRevenue"
                label="Monthly gross sales"
                error={errors.monthlyGrossRevenue?.message}
                register={register("monthlyGrossRevenue", {
                  setValueAs: parseMoneyInput,
                })}
              />
              <SelectField
                control={control}
                name="revenuePeriod"
                label="Revenue period"
                options={revenuePeriodOptions}
                labels={revenuePeriodLabels}
                error={errors.revenuePeriod?.message}
              />
              <SelectField
                control={control}
                name="revenueConfidence"
                label="Revenue basis"
                options={revenueConfidenceOptions}
                labels={revenueConfidenceLabels}
                error={errors.revenueConfidence?.message}
              />
              <MoneyField
                id="bestMonthSales"
                label="Best month sales"
                error={errors.bestMonthSales?.message}
                register={register("bestMonthSales", {
                  setValueAs: parseMoneyInput,
                })}
              />
              <MoneyField
                id="worstMonthSales"
                label="Worst month sales"
                error={errors.worstMonthSales?.message}
                register={register("worstMonthSales", {
                  setValueAs: parseMoneyInput,
                })}
              />
            </FormSection>
          ) : null}

          {currentStep.id === "businessExpenses" ? (
            <FormSection title="Business expenses">
              {businessExpenseFields.map(([name, label]) => (
                <MoneyField
                  key={name}
                  id={name}
                  label={label}
                  error={fieldError(errors, name)}
                  register={register(name, { setValueAs: parseMoneyInput })}
                />
              ))}
            </FormSection>
          ) : null}

          {currentStep.id === "householdExpenses" ? (
            <FormSection title="Household expenses">
              {householdExpenseFields.map(([name, label]) => (
                <MoneyField
                  key={name}
                  id={name}
                  label={label}
                  error={fieldError(errors, name)}
                  register={register(name, { setValueAs: parseMoneyInput })}
                />
              ))}
              <NumberField
                id="numberOfDependents"
                label="Number of dependents"
                error={errors.numberOfDependents?.message}
                register={register("numberOfDependents", {
                  setValueAs: parseMoneyInput,
                })}
                step="1"
              />
              <NumberField
                id="numberOfEarningHouseholdMembers"
                label="Earning household members"
                error={errors.numberOfEarningHouseholdMembers?.message}
                register={register("numberOfEarningHouseholdMembers", {
                  setValueAs: parseMoneyInput,
                })}
                step="1"
              />
            </FormSection>
          ) : null}

          {currentStep.id === "existingDebtsAndAssets" ? (
            <FormSection
              title="Existing loans/installments and assets"
              description="Add monthly debt payments only if you currently have active debts or installment plans."
            >
              <CheckboxField
                control={control}
                name="hasExistingDebts"
                label="Has existing debts or installments"
                error={errors.hasExistingDebts?.message}
              />
              {hasExistingDebts ? (
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  {debtFields.map(([name, label]) => (
                    <MoneyField
                      key={name}
                      id={name}
                      label={label}
                      error={fieldError(errors, name)}
                      register={register(name, {
                        setValueAs: parseMoneyInput,
                      })}
                    />
                  ))}
                </div>
              ) : null}
              {assetFields.map(([name, label]) => (
                <MoneyField
                  key={name}
                  id={name}
                  label={label}
                  error={fieldError(errors, name)}
                  register={register(name, { setValueAs: parseMoneyInput })}
                />
              ))}
            </FormSection>
          ) : null}

          {currentStep.id === "loanUse" ? (
            <FormSection title="Loan use">
              <SelectField
                control={control}
                name="loanPurposeCategory"
                label="Loan purpose"
                options={loanPurposeCategoryOptions}
                labels={loanPurposeCategoryLabels}
                error={errors.loanPurposeCategory?.message}
              />
              {currentValues.loanPurposeCategory === "other" ? (
                <TextField
                  id="loanPurposeOther"
                  label="Short purpose"
                  error={errors.loanPurposeOther?.message}
                  register={register("loanPurposeOther")}
                />
              ) : null}
              <TextField
                id="loanPurposeDetails"
                label="Additional details (optional)"
                error={errors.loanPurposeDetails?.message}
                register={register("loanPurposeDetails")}
                className="sm:col-span-2"
              />
              <CheckboxField
                control={control}
                name="offersCustomerCredit"
                label="Offers customer credit"
              />
              <MoneyField
                id="estimatedCustomerCreditAmount"
                label="Estimated customer credit amount"
                error={errors.estimatedCustomerCreditAmount?.message}
                register={register("estimatedCustomerCreditAmount", {
                  setValueAs: parseMoneyInput,
                })}
              />
              <SelectField
                control={control}
                name="averageCollectionPeriod"
                label="Average collection period"
                options={averageCollectionPeriodOptions}
                labels={averageCollectionPeriodLabels}
                error={errors.averageCollectionPeriod?.message}
                optional
              />
              <CheckboxField
                control={control}
                name="keepsCustomerDebtList"
                label="Keeps a customer debt list"
              />
              {riskDeclarationFields.map(([name, label]) => (
                <CheckboxField
                  key={name}
                  control={control}
                  name={name}
                  label={label}
                />
              ))}
            </FormSection>
          ) : null}

          {currentStep.id === "review" ? (
            <FormSection title="Review and submit">
              <Alert className="sm:col-span-2">
                <AlertDescription>
                  Home address on file:{" "}
                  {formatHomeAddress(currentPortfolio) || "Not provided yet."}
                </AlertDescription>
              </Alert>
              <CheckboxField
                control={control}
                name="confirmsInformationTrue"
                label="I confirm this information is true and complete."
              />
              <CheckboxField
                control={control}
                name="consentsToDataProcessing"
                label="I consent to profile data processing."
              />
              <CheckboxField
                control={control}
                name="consentsToCreditCheck"
                label="I consent to credit review checks."
              />
              <Alert className="sm:col-span-2">
                <AlertDescription>
                  Upload valid ID, selfie with ID, proof of address, and
                  business proof in borrower verification. Business proof can
                  include store photos, inventory photos, sales records,
                  supplier receipts, e-wallet history, permits, leases, or
                  platform sales screenshots.
                </AlertDescription>
              </Alert>
              <div className="sm:col-span-2">
                <ReadinessPanel
                  portfolio={currentPortfolio}
                  readiness={readiness}
                />
              </div>
            </FormSection>
          ) : null}

          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="grid gap-2">
              <p
                id="portfolio-save-state"
                className="text-sm leading-6 text-muted-foreground"
                aria-live="polite"
              >
                {statusMessage}
              </p>
              {successMessage ? (
                <Alert role="status">
                  <AlertDescription className="font-semibold">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCurrentStepIndex((index) => Math.max(index - 1, 0))
                }
                disabled={currentStepIndex === 0 || isPending}
                className="h-11 rounded-full font-semibold"
              >
                Previous
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 rounded-full font-semibold"
              >
                {isPending
                  ? "Saving..."
                  : isFinalStep
                    ? "Save and continue to verification"
                    : "Save and continue"}
              </Button>
            </div>
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-11 rounded-full font-semibold sm:order-first"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const businessExpenseFields = [
  ["monthlyInventoryCost", "Inventory cost"],
  ["monthlyBusinessRent", "Business rent"],
  ["monthlyBusinessElectricity", "Business electricity"],
  ["monthlyBusinessWater", "Business water"],
  ["monthlyHelperSalary", "Helper salary"],
  ["monthlyTransportationDelivery", "Transport / delivery"],
  ["monthlyPackagingCost", "Packaging"],
  ["monthlyPlatformFees", "Platform fees"],
  ["monthlyMaintenanceRepairs", "Maintenance / repairs"],
  ["monthlySupplierCreditPayment", "Supplier credit payment"],
  ["otherBusinessExpenses", "Other business expenses"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const householdExpenseFields = [
  ["monthlyRentOrMortgage", "Rent or mortgage"],
  ["monthlyElectricityBill", "Electricity"],
  ["monthlyWaterBill", "Water"],
  ["monthlyInternetPhoneBill", "Internet / phone"],
  ["monthlyFoodGroceries", "Food / groceries"],
  ["monthlyTransportation", "Household transportation"],
  ["monthlyTuitionEducation", "Tuition / education"],
  ["monthlyMedicalExpenses", "Medical expenses"],
  ["monthlyInsurance", "Insurance"],
  ["monthlyFamilySupport", "Family support"],
  ["otherHouseholdExpenses", "Other household expenses"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const debtFields = [
  ["personalLoanPayments", "Personal loans"],
  ["businessLoanPayments", "Business loans"],
  ["vehicleLoanPayments", "Vehicle loans"],
  ["homeLoanPayments", "Home loans"],
  ["lendingAppPayments", "Lending apps"],
  ["informalLoanPayments", "Informal loans"],
  ["buyNowPayLaterPayments", "Buy now, pay later"],
  ["creditCardPayments", "Credit card"],
  ["coMakerGuaranteedLoanPayments", "Co-maker guaranteed loans"],
  ["otherDebtPayments", "Other debt payments"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const assetFields = [
  ["cashOnHand", "Cash on hand"],
  ["bankSavings", "Bank savings"],
  ["ewalletBalance", "E-wallet balance"],
  ["inventoryValue", "Inventory value"],
  ["businessEquipmentValue", "Business equipment"],
  ["vehicleValue", "Vehicle value"],
  ["propertyLandValue", "Property / land"],
  ["otherAssetsValue", "Other assets"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const riskDeclarationFields = [
  ["hasOverdueLoans", "Has overdue loans"],
  ["missedPaymentsLast12Months", "Missed payments in the last 12 months"],
  ["hasUnpaidLendingAppLoans", "Has unpaid lending app loans"],
  ["hasBouncedChecks", "Has bounced checks"],
  ["isCoMakerOrGuarantor", "Is a co-maker or guarantor"],
  ["hasDebtRelatedLegalCase", "Has a debt-related legal case"],
  ["hasRepossessionHistory", "Has repossession history"],
  ["hasTaxArrears", "Has tax arrears"],
  ["businessTemporarilyStopped", "Business is temporarily stopped"],
  ["confirmsBusinessOperating", "Business is currently operating"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const profileSteps = [
  {
    id: "homeAddress",
    title: borrowerPortfolioStepLabels.homeAddress,
    fields: [
      "country",
      "mobileNumber",
      "yearsAtCurrentAddress",
      "homeAddressSelection",
      "homeStreetAddress",
      "emergencyContactName",
      "emergencyContactNumber",
      "emergencyContactRelationship",
    ],
  },
  {
    id: "businessBasics",
    title: borrowerPortfolioStepLabels.businessBasics,
    fields: [
      "businessName",
      "businessType",
      "ownershipType",
      "borrowerRole",
      "yearsInOperation",
      "operatingModel",
      "primarySalesChannel",
      "businessSchedule",
      "numberOfEmployees",
      "mainProductsOrServicesCategory",
      "mainProductsOrServicesOther",
      "mainSuppliers",
      "keepsSalesRecords",
      "usesBankOrEwallet",
    ],
  },
  {
    id: "businessAddress",
    title: borrowerPortfolioStepLabels.businessAddress,
    fields: [
      "address",
      "streetAddress",
      "isBusinessAddressSameAsHome",
      "homeAddressSelection",
      "homeStreetAddress",
    ],
  },
  {
    id: "businessOperations",
    title: borrowerPortfolioStepLabels.businessOperations,
    fields: [
      "hasBusinessRegistration",
      "businessRegistrationType",
      "registrationNumber",
      "registrationDate",
      "unregisteredReason",
    ],
  },
  {
    id: "financials",
    title: borrowerPortfolioStepLabels.financials,
    fields: [
      "averageDailySales",
      "averageWeeklySales",
      "monthlyGrossRevenue",
      "revenuePeriod",
      "revenueConfidence",
      "bestMonthSales",
      "worstMonthSales",
    ],
  },
  {
    id: "businessExpenses",
    title: borrowerPortfolioStepLabels.businessExpenses,
    fields: [
      ...businessExpenseFields.map(([name]) => name),
    ],
  },
  {
    id: "householdExpenses",
    title: borrowerPortfolioStepLabels.householdExpenses,
    fields: [
      ...householdExpenseFields.map(([name]) => name),
      "numberOfDependents",
      "numberOfEarningHouseholdMembers",
    ],
  },
  {
    id: "existingDebtsAndAssets",
    title: borrowerPortfolioStepLabels.existingDebtsAndAssets,
    fields: [
      "hasExistingDebts",
      ...debtFields.map(([name]) => name),
      ...assetFields.map(([name]) => name),
    ],
  },
  {
    id: "loanUse",
    title: borrowerPortfolioStepLabels.loanUse,
    fields: [
      "loanPurposeCategory",
      "loanPurposeOther",
      "loanPurposeDetails",
      "offersCustomerCredit",
      "estimatedCustomerCreditAmount",
      "averageCollectionPeriod",
      "keepsCustomerDebtList",
      ...riskDeclarationFields.map(([name]) => name),
    ],
  },
  {
    id: "review",
    title: borrowerPortfolioStepLabels.review,
    fields: [
      "confirmsInformationTrue",
      "consentsToDataProcessing",
      "consentsToCreditCheck",
    ],
  },
] as const satisfies ReadonlyArray<{
  id: BorrowerPortfolioStep;
  title: string;
  fields: readonly (keyof BorrowerPortfolioFormInput)[];
}>;

function getStepIndex(step?: BorrowerPortfolioStep) {
  if (!step) return 0;

  const index = profileSteps.findIndex((profileStep) => profileStep.id === step);
  return index >= 0 ? index : 0;
}

function WizardHeader({
  stepNumber,
  totalSteps,
  title,
  progressValue,
  completedSteps,
}: {
  stepNumber: number;
  totalSteps: number;
  title: string;
  progressValue: number;
  completedSteps: BorrowerPortfolioStep[];
}) {
  const isReview = stepNumber > totalSteps;

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            {isReview ? "Review" : `Part ${stepNumber} of ${totalSteps}`}
          </p>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <Progress value={progressValue} aria-label="Profile progress" />
      <div className="flex flex-wrap gap-2">
        {borrowerPortfolioStepIds
          .filter((step) => step !== "review")
          .map((step) => (
            <span
              key={step}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                completedSteps.includes(step)
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              {borrowerPortfolioStepLabels[step]}
            </span>
          ))}
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SelectField<
  TName extends keyof BorrowerPortfolioFormInput,
  TOption extends string,
>({
  control,
  name,
  label,
  options,
  labels,
  error,
  optional = false,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
  options: readonly TOption[];
  labels: Record<TOption, string>;
  error?: string;
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} error={error} id={String(name)}>
          <Select
            onValueChange={(value) =>
              field.onChange(optional ? value || null : value)
            }
            value={(field.value as string | null | undefined) ?? ""}
          >
            <SelectTrigger
              id={String(name)}
              className="w-full"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${String(name)}-error` : undefined}
            >
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function CheckboxField<TName extends keyof BorrowerPortfolioFormInput>({
  control,
  name,
  label,
  error,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
  error?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="grid gap-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted/25 px-4 py-3 transition-colors hover:bg-muted/40">
            <Checkbox
              id={String(name)}
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${String(name)}-error` : undefined}
            />
            <Label
              htmlFor={String(name)}
              className="cursor-pointer text-sm leading-5"
            >
              {label}
            </Label>
          </div>
          {error ? (
            <p id={`${String(name)}-error`} className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

function TextField({
  id,
  label,
  error,
  register,
  className,
  type = "text",
  disabled = false,
}: FieldControlProps & { type?: string; disabled?: boolean }) {
  return (
    <Field label={label} error={error} id={id} className={className}>
      <Input
        id={id}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        {...register}
      />
    </Field>
  );
}

function MoneyField({ id, label, error, register }: FieldControlProps) {
  return (
    <Field label={label} error={error} id={id}>
      <CurrencyInput
        id={id}
        aria-invalid={Boolean(error)}
        registration={register}
        emptyValue={0}
      />
    </Field>
  );
}

function NumberField({
  id,
  label,
  error,
  register,
  step,
}: FieldControlProps & { step: string }) {
  return (
    <Field label={label} error={error} id={id}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        {...register}
      />
    </Field>
  );
}

type FieldControlProps = {
  id: string;
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
  className?: string;
};

function ReadinessPanel({
  portfolio,
  readiness,
}: {
  portfolio: BorrowerPortfolioInput;
  readiness: ReturnType<typeof evaluateBorrowerReadiness>;
}) {
  const totalBusinessExpenses = calculateTotalBusinessExpenses(portfolio);
  const netBusinessIncome = calculateNetMonthlyBusinessIncome(portfolio);
  const totalHouseholdExpenses = calculateTotalHouseholdExpenses(portfolio);
  const totalDebtPayments = calculateTotalExistingDebtPayments(portfolio);
  const disposableIncome = calculateDisposableIncome(portfolio);
  const totalAssets = calculateTotalDeclaredAssets(portfolio);
  const cashBankEwallet =
    portfolio.cashOnHand + portfolio.bankSavings + portfolio.ewalletBalance;

  return (
    <Card className="rounded-xl bg-muted/30">
      <CardContent className="grid gap-4 p-4 text-sm leading-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Readiness</p>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
            {readiness.readinessStatus.replaceAll("_", " ")}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Summary
            label="Business type"
            value={
              portfolio.businessType
                ? businessTypeLabels[portfolio.businessType]
                : "Not provided"
            }
          />
          <Summary
            label="Business name"
            value={portfolio.businessName || "Not provided"}
          />
          <Summary
            label="Years operating"
            value={formatPlain(portfolio.yearsInOperation)}
          />
          <Summary
            label="Monthly gross sales"
            value={formatMoney(portfolio.monthlyGrossRevenue)}
          />
          <Summary
            label="Business expenses"
            value={formatMoney(totalBusinessExpenses)}
          />
          <Summary
            label="Net business income"
            value={formatMoney(netBusinessIncome)}
          />
          <Summary
            label="Household expenses"
            value={formatMoney(totalHouseholdExpenses)}
          />
          <Summary
            label="Debt payments"
            value={formatMoney(totalDebtPayments)}
          />
          <Summary
            label="Disposable income"
            value={formatMoney(disposableIncome)}
          />
          <Summary
            label="Inventory value"
            value={formatMoney(portfolio.inventoryValue)}
          />
          <Summary
            label="Cash / bank / e-wallet"
            value={formatMoney(cashBankEwallet)}
          />
          <Summary
            label="Declared assets"
            value={formatMoney(totalAssets)}
          />
        </div>
        {readiness.missingFields.length ? (
          <p className="text-muted-foreground">
            Missing: {readiness.missingFields.join(", ")}
          </p>
        ) : null}
        {readiness.riskFlags.length ? (
          <p className="text-muted-foreground">
            Flags:{" "}
            {readiness.riskFlags
              .map((flag) => flag.replaceAll("_", " "))
              .join(", ")}
          </p>
        ) : null}
        <p className="font-medium">{readiness.nextActions[0]}</p>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function BorrowerPortfolioFormSkeleton() {
  return (
    <section
      className="grid gap-4"
      aria-busy="true"
      aria-label="Loading business profile"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardContent className="grid gap-4 p-5">
            <Skeleton className="h-4 w-36" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function Field({
  label,
  error,
  id,
  children,
  className,
}: {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="text-sm leading-5 text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function fieldError(
  errors: FieldErrors<BorrowerPortfolioFormInput>,
  field: keyof BorrowerPortfolioFormInput,
) {
  const error = errors[field];
  return typeof error?.message === "string" ? error.message : undefined;
}

function formatMoney(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPlain(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}
