"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
  type UseFormRegisterReturn,
} from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerBusinessProfileSection,
  saveBorrowerPortfolioStep,
} from "@/app/borrower/actions";
import { AddressSelect } from "@/components/address/address-select";
import { CurrencyInput } from "@/components/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check } from "lucide-react";
import {
  averageCollectionPeriodLabels,
  averageCollectionPeriodOptions,
  copyHomeAddressToBusinessAddress,
  borrowerPortfolioSchema,
  borrowerRoleLabels,
  borrowerRoleOptions,
  businessRegistrationTypeLabels,
  businessRegistrationTypeOptions,
  businessProfileSectionLabels,
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
  normalizeBorrowerBusinessAddressFields,
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
  type BusinessProfileSection,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { getBarangaysByCity } from "@/lib/philippine-addresses";
import { parseMoneyInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";

const defaultValues = getBorrowerPortfolioDefaultValues();
type LoadState = "loading" | "empty" | "ready" | "error";
const formSyncOptions = {
  shouldDirty: true,
  shouldTouch: true,
  shouldValidate: true,
} as const;

type BorrowerPortfolioFormProps = {
  initialStep?: BorrowerPortfolioStep;
  businessSection?: BusinessProfileSection;
  mode?: "completion" | "edit";
  onCancel?: () => void;
  onSaved?: (portfolio: BorrowerPortfolioInput) => void;
};

type BorrowerPortfolioMilestone = {
  id: "personal" | "business" | "financials" | "loanRequest" | "review";
  title: string;
  shortLabel: string;
  legacySteps: readonly BorrowerPortfolioStep[];
};

type BorrowerPortfolioMilestoneId = BorrowerPortfolioMilestone["id"];

export function BorrowerPortfolioForm({
  businessSection,
  initialStep,
  mode = "completion",
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
  const hasBusinessRegistration = useWatch({
    control,
    name: "hasBusinessRegistration",
  });
  const mainProductsOrServicesCategory = useWatch({
    control,
    name: "mainProductsOrServicesCategory",
  });
  const hasExistingDebts = useWatch({
    control,
    name: "hasExistingDebts",
  });
  const hasInventory = useWatch({
    control,
    name: "hasInventory",
  });
  const offersCustomerCredit = useWatch({
    control,
    name: "offersCustomerCredit",
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
  const currentStep = milestoneSteps[currentStepIndex];
  const isEditMode = mode === "edit";
  const activeLegacySteps = isEditMode
    ? ([initialStep ?? currentStep.legacySteps[0]] as const)
    : currentStep.legacySteps;
  const progressValue = (currentStepIndex / (milestoneSteps.length - 1)) * 100;
  const isFinalStep = currentStepIndex === milestoneSteps.length - 1;
  const editTitle =
    isEditMode && businessSection
      ? businessProfileSectionLabels[businessSection]
      : currentStep.title;
  const visibleStepIndex = currentStepIndex;
  const visibleStepTotal = milestoneSteps.length;
  const previousBusinessRegistration = useRef<boolean | undefined>(undefined);

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

    const copiedBarangay = homeAddressSelection?.barangay ?? "";
    const copiedCity = homeAddressSelection?.cityOrMunicipality ?? "";
    const copiedRegion = homeAddressSelection?.regionCode ?? "";
    const businessBarangays = copiedRegion && copiedCity
      ? getBarangaysByCity(copiedRegion, copiedCity)
      : [];

    syncBusinessAddressFromHome({
      homeAddressSelection,
      homeStreetAddress,
      setValue,
      syncedBarangay:
        copiedBarangay && businessBarangays.includes(copiedBarangay)
          ? copiedBarangay
          : "",
    });

    if (!copiedBarangay) return;
    if (!businessBarangays.includes(copiedBarangay)) return;
    if (businessAddress?.barangay === copiedBarangay) return;

    setValue("address.barangay", copiedBarangay, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [
    businessAddress?.barangay,
    homeAddressSelection,
    homeAddressSelection?.barangay,
    homeAddressSelection?.cityOrMunicipality,
    homeAddressSelection?.regionCode,
    homeStreetAddress,
    isBusinessAddressSameAsHome,
    setValue,
  ]);

  useEffect(() => {
    if (hasExistingDebts) return;

    const hasDebtValues =
      Number(currentValues.existingLoanPayments ?? 0) > 0 ||
      debtFields.some(([name]) => Number(currentValues[name] ?? 0) > 0);

    if (!hasDebtValues) return;

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
  }, [currentValues, hasExistingDebts, setValue]);

  useEffect(() => {
    const currentValue = Boolean(hasBusinessRegistration);

    if (previousBusinessRegistration.current === undefined) {
      previousBusinessRegistration.current = currentValue;
      return;
    }

    if (previousBusinessRegistration.current === currentValue) {
      return;
    }

    previousBusinessRegistration.current = currentValue;

    if (currentValue) {
      return;
    }

    setValue("businessRegistrationType", null, formSyncOptions);
    setValue("registrationNumber", "", formSyncOptions);
    setValue("registrationDate", "", formSyncOptions);
  }, [hasBusinessRegistration, setValue]);

  useEffect(() => {
    if (hasInventory !== false) return;

    setValue("inventoryValue", 0, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }, [hasInventory, setValue]);

  function onSubmit(values: BorrowerPortfolioInput) {
    void saveCurrentStep(values);
  }

  async function saveCurrentStep(values: BorrowerPortfolioInput) {
    setStatusMessage(`Saving ${currentStep.title.toLowerCase()}...`);
    setSuccessMessage("");
    setServerErrors({});

    startTransition(async () => {
      const result =
        isEditMode && businessSection
          ? await saveBorrowerBusinessProfileSection(
              businessSection,
              normalizeBorrowerBusinessAddressFields(values),
            )
          : await saveBorrowerPortfolioMilestone(currentStep, values);
      setLoadState(result.ok ? "ready" : "error");
      if (result.ok) {
        setStatusMessage("");
        setSuccessMessage(result.message);
        setCompletedSteps(result.completedSteps);
        reset(result.portfolio);
        if (isEditMode || isFinalStep) {
          onSaved?.(result.portfolio);
        } else {
          setCurrentStepIndex((index) => {
            const nextIndex = Math.min(index + 1, milestoneSteps.length - 1);
            return nextIndex;
          });
        }
        window.dispatchEvent(new Event(borrowerPortfolioSavedEvent));
      } else {
        if (result.debugMessage) {
          console.error("[borrower-profile-step-save]", result.debugMessage);
        }

        setStatusMessage(
          result.message,
        );
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
    <Card className="mx-auto w-full max-w-[960px] rounded-2xl">
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
            activeStep={currentStep.id}
            stepNumber={visibleStepIndex + 1}
            totalSteps={visibleStepTotal}
            title={editTitle}
            progressValue={isEditMode ? 100 : progressValue}
            completedSteps={completedSteps}
          />

          {activeLegacySteps.includes("homeAddress") ? (
            <FormSection title="Personal / Home address">
              <TextField
                id="mobileNumber"
                label="Mobile number"
                error={errors.mobileNumber?.message}
                register={register("mobileNumber")}
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
              <AdditionalDetails className="sm:col-span-2">
                <SelectField
                  control={control}
                  name="country"
                  label="Country"
                  options={["Philippines"] as const}
                  labels={{ Philippines: "Philippines" }}
                  error={errors.country?.message}
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
                <TextField
                  id="emergencyContactRelationship"
                  label="Emergency contact relationship"
                  error={errors.emergencyContactRelationship?.message}
                  register={register("emergencyContactRelationship")}
                />
                <NumberField
                  id="numberOfDependents"
                  label="Number of dependents"
                  error={errors.numberOfDependents?.message}
                  register={register("numberOfDependents", {
                    setValueAs: parseMoneyInput,
                  })}
                  step="1"
                />
                {householdExpenseFields.map(([name, label]) => (
                  <MoneyField
                    key={name}
                    id={name}
                    label={label}
                    error={fieldError(errors, name)}
                    register={register(name, { setValueAs: parseMoneyInput })}
                  />
                ))}
              </AdditionalDetails>
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("businessBasics") &&
          (!isEditMode || !businessSection || businessSection === "basic") ? (
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
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("businessBasics") &&
          (!isEditMode || !businessSection || businessSection === "operations") ? (
            <FormSection title="Operations and sales">
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
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("businessBasics") &&
          (!isEditMode || !businessSection || businessSection === "products") ? (
            <FormSection title="Products, services, and suppliers">
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
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("businessBasics") &&
          (!isEditMode || !businessSection || businessSection === "records") ? (
            <FormSection title="Records and payment channels">
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

          {activeLegacySteps.includes("businessAddress") ? (
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
                          readOnly={Boolean(isBusinessAddressSameAsHome)}
                          errors={{
                            regionCode:
                              errors.address?.regionCode?.message ??
                              firstServerError(serverErrors, "address"),
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
                    error={
                      errors.streetAddress?.message ??
                      firstServerError(
                        serverErrors,
                        "streetAddress",
                        "businessAddress",
                        "address",
                      )
                    }
                    register={register("streetAddress")}
                    className="sm:col-span-2"
                    readOnly={Boolean(isBusinessAddressSameAsHome)}
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

          {activeLegacySteps.includes("businessOperations") ? (
            <FormSection title="Business operations">
              <CheckboxField
                control={control}
                name="hasBusinessRegistration"
                label="Has business registration"
              />
              {hasBusinessRegistration && (
                <div className="contents">
                  <SelectField
                    control={control}
                    name="businessRegistrationType"
                    label="Registration type"
                    options={businessRegistrationTypeOptions}
                    labels={businessRegistrationTypeLabels}
                    error={errors.businessRegistrationType?.message}
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
                </div>
              )}
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("financials") ? (
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

          {activeLegacySteps.includes("businessExpenses") ? (
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

          {activeLegacySteps.includes("householdExpenses") &&
          !activeLegacySteps.includes("homeAddress") ? (
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
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("existingDebts") ? (
            <FormSection
              title="Existing loans / debts"
              description="Declare active loans, debts, or installment payments only if you currently have them."
            >
              <CheckboxField
                control={control}
                name="hasExistingDebts"
                label="Do you currently have any existing loans, debts, or installment payments?"
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
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("assets") ? (
            <FormSection
              title="Assets"
              description="Declare cash, savings, equipment, property, and other assets owned by the borrower or business."
            >
              <RadioBooleanField
                control={control}
                name="hasInventory"
                label="Do you keep products or stocks for sale?"
                error={errors.hasInventory?.message}
                className="sm:col-span-2"
              />
              {hasInventory === true ? (
                <MoneyField
                  id="inventoryValue"
                  label="Estimated value of current unsold stock/products"
                  error={fieldError(errors, "inventoryValue")}
                  register={register("inventoryValue", {
                    setValueAs: parseMoneyInput,
                  })}
                  description="Use the purchase/cost price of your remaining stocks, not the selling price. Inventory means products or materials you still have and plan to sell. Do not include equipment, tools, vehicles, or cash here."
                />
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

          {activeLegacySteps.includes("loanUse") ? (
            <FormSection
              title="Loan purpose"
              description="Tell lenders how you plan to use the loan. Keep it specific and practical."
            >
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
                label="Additional details"
                error={errors.loanPurposeDetails?.message}
                register={register("loanPurposeDetails")}
                className="sm:col-span-2"
              />
              <Alert className="sm:col-span-2">
                <AlertDescription>
                  A clear loan purpose helps lenders understand what the funds
                  will support, such as inventory, equipment, rent, or working
                  capital.
                </AlertDescription>
              </Alert>
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("customerCredit") ? (
            <FormSection
              title="Customer credit / utang practices"
              description="Share whether customers buy from you now and pay later."
            >
              <CheckboxField
                control={control}
                name="offersCustomerCredit"
                label="Do you allow customers to buy now and pay later / utang?"
                className="sm:col-span-2"
              />
              {offersCustomerCredit ? (
                <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="grid gap-1 sm:col-span-2">
                    <h4 className="text-sm font-semibold">
                      Customer credit details
                    </h4>
                    <p className="text-sm leading-5 text-muted-foreground">
                      Estimate the amount customers currently owe and how you
                      track collections.
                    </p>
                  </div>
                  <MoneyField
                    id="estimatedCustomerCreditAmount"
                    label="Estimated amount customers owe"
                    error={errors.estimatedCustomerCreditAmount?.message}
                    register={register("estimatedCustomerCreditAmount", {
                      setValueAs: parseMoneyInput,
                    })}
                    emptyValue={undefined}
                  />
                  <SelectField
                    control={control}
                    name="averageCollectionPeriod"
                    label="Usual collection period"
                    options={averageCollectionPeriodOptions}
                    labels={averageCollectionPeriodLabels}
                    error={errors.averageCollectionPeriod?.message}
                    optional
                  />
                  <CheckboxField
                    control={control}
                    name="keepsCustomerDebtList"
                    label="I keep a list of customers who still owe money."
                    className="sm:col-span-2"
                  />
                </div>
              ) : null}
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("repaymentHistory") ? (
            <FormSection
              title="Existing loans, debts, and repayment history"
              description="Answer only based on your current situation and the last 12 months."
            >
              {repaymentHistoryFields.map(([name, label, description]) => (
                <CheckboxField
                  key={name}
                  control={control}
                  name={name}
                  label={label}
                  description={description}
                  className="sm:col-span-2"
                />
              ))}
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("businessStatus") ? (
            <FormSection
              title="Business status"
              description="Confirm whether the business is operating now."
            >
              <CheckboxField
                control={control}
                name="confirmsBusinessOperating"
                label="My business is currently operating."
                className="sm:col-span-2"
              />
              <CheckboxField
                control={control}
                name="businessTemporarilyStopped"
                label="My business is temporarily stopped."
                description="Use this if operations are paused but you plan to resume."
                className="sm:col-span-2"
              />
            </FormSection>
          ) : null}

          {activeLegacySteps.includes("review") ? (
            <FormSection title="Review and submit">
              <div className="sm:col-span-2">
                <MilestoneSummary
                  portfolio={currentPortfolio}
                  onEdit={(stepId) =>
                    setCurrentStepIndex(getMilestoneIndex(stepId))
                  }
                />
              </div>
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
              {!isEditMode ? (
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
              ) : null}
              {isEditMode ? (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 rounded-full font-semibold"
                >
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 rounded-full font-semibold"
                >
                  {isPending
                    ? "Saving..."
                    : isFinalStep
                      ? "Save and continue to verification"
                      : "Save and Continue"}
                </Button>
              )}
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
  ["monthlyRentOrMortgage", "Monthly rent / housing fee"],
  ["monthlyInternetPhoneBill", "Monthly utilities"],
  ["monthlyFoodGroceries", "Food / groceries"],
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
  ["businessEquipmentValue", "Business equipment"],
  ["vehicleValue", "Vehicle value"],
  ["propertyLandValue", "Property / land"],
  ["otherAssetsValue", "Other assets"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const repaymentHistoryFields = [
  ["hasOverdueLoans", "I currently have overdue loan payments.", undefined],
  [
    "missedPaymentsLast12Months",
    "I missed a loan payment in the last 12 months.",
    undefined,
  ],
  ["hasUnpaidLendingAppLoans", "I still have unpaid lending app loans.", undefined],
  ["hasBouncedChecks", "I have had a bounced check.", undefined],
  [
    "isCoMakerOrGuarantor",
    "I am a co-maker or guarantor for someone else's loan.",
    undefined,
  ],
  ["hasDebtRelatedLegalCase", "I have a debt-related legal case.", undefined],
  [
    "hasRepossessionHistory",
    "I have had an item repossessed because of unpaid debt.",
    undefined,
  ],
  ["hasTaxArrears", "I have unpaid tax obligations.", undefined],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string, string?]
>;

const milestoneSteps: readonly BorrowerPortfolioMilestone[] = [
  {
    id: "personal",
    title: "Personal",
    shortLabel: "Personal",
    legacySteps: ["homeAddress", "householdExpenses"],
  },
  {
    id: "business",
    title: "Business",
    shortLabel: "Business",
    legacySteps: [
      "businessBasics",
      "businessAddress",
      "businessOperations",
      "businessStatus",
    ],
  },
  {
    id: "financials",
    title: "Financials",
    shortLabel: "Financials",
    legacySteps: [
      "financials",
      "businessExpenses",
      "assets",
      "existingDebts",
      "customerCredit",
      "repaymentHistory",
    ],
  },
  {
    id: "loanRequest",
    title: "Loan request",
    shortLabel: "Loan request",
    legacySteps: ["loanUse"],
  },
  {
    id: "review",
    title: "Review",
    shortLabel: "Review",
    legacySteps: ["review"],
  },
];

function getStepIndex(step?: BorrowerPortfolioStep) {
  if (!step) return 0;

  const index = milestoneSteps.findIndex((milestone) =>
    milestone.legacySteps.includes(step),
  );
  return index >= 0 ? index : 0;
}

function getMilestoneIndex(stepId: BorrowerPortfolioMilestoneId) {
  const index = milestoneSteps.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

async function saveBorrowerPortfolioMilestone(
  milestone: BorrowerPortfolioMilestone,
  values: BorrowerPortfolioInput,
) {
  let latestPortfolio = normalizeMilestoneValues(milestone, values);
  let latestCompletedSteps: BorrowerPortfolioStep[] = [];

  for (const legacyStep of milestone.legacySteps) {
    const result = await saveBorrowerPortfolioStep(
      legacyStep,
      normalizeBorrowerBusinessAddressFields(latestPortfolio),
    );

    if (!result.ok) {
      return result;
    }

    latestPortfolio = result.portfolio;
    latestCompletedSteps = result.completedSteps;
  }

  return {
    ok: true,
    mode: "supabase",
    message: `${milestone.title} saved.`,
    portfolio: latestPortfolio,
    completedSteps: latestCompletedSteps,
    nextIncompleteStep: latestCompletedSteps.length
      ? undefined
      : milestone.legacySteps[0],
  } as const;
}

function normalizeMilestoneValues(
  milestone: BorrowerPortfolioMilestone,
  values: BorrowerPortfolioInput,
): BorrowerPortfolioInput {
  return {
    ...values,
    ...normalizeBorrowerBusinessAddressFields(values),
    country: "Philippines",
    monthlyElectricityBill:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyElectricityBill,
    monthlyWaterBill:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyWaterBill,
    monthlyTransportation:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyTransportation,
    monthlyTuitionEducation:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyTuitionEducation,
    monthlyMedicalExpenses:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyMedicalExpenses,
    monthlyInsurance:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyInsurance,
    monthlyFamilySupport:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.monthlyFamilySupport,
    numberOfEarningHouseholdMembers:
      milestone.legacySteps.includes("householdExpenses") ||
      milestone.legacySteps.includes("homeAddress")
        ? 0
        : values.numberOfEarningHouseholdMembers,
    numberOfDependents: Number.isFinite(values.numberOfDependents)
      ? values.numberOfDependents
      : 0,
    householdExpensesCompleted:
      milestone.legacySteps.includes("householdExpenses") ||
      values.householdExpensesCompleted,
  };
}

function syncBusinessAddressFromHome({
  homeAddressSelection,
  homeStreetAddress,
  setValue,
  syncedBarangay,
}: {
  homeAddressSelection: BorrowerPortfolioFormInput["homeAddressSelection"];
  homeStreetAddress: BorrowerPortfolioFormInput["homeStreetAddress"];
  setValue: UseFormSetValue<BorrowerPortfolioFormInput>;
  syncedBarangay: string;
}) {
  const copiedAddress = copyHomeAddressToBusinessAddress(
    homeAddressSelection,
    homeStreetAddress,
  );

  setValue("address.regionCode", copiedAddress.regionCode, formSyncOptions);
  setValue("address.regionName", copiedAddress.regionName, formSyncOptions);
  setValue(
    "address.cityOrMunicipality",
    copiedAddress.cityOrMunicipality,
    formSyncOptions,
  );
  setValue("address.zipCode", copiedAddress.zipCode, formSyncOptions);
  setValue("streetAddress", copiedAddress.streetAddress, formSyncOptions);
  setValue("businessAddress", copiedAddress.streetAddress, formSyncOptions);
  setValue("address.barangay", syncedBarangay, formSyncOptions);
}

function WizardHeader({
  activeStep,
  stepNumber,
  totalSteps,
  title,
  progressValue,
  completedSteps,
}: {
  activeStep: BorrowerPortfolioMilestoneId;
  stepNumber: number;
  totalSteps: number;
  title: string;
  progressValue: number;
  completedSteps: BorrowerPortfolioStep[];
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted-foreground">
            Step {stepNumber} of {totalSteps}
          </p>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      <Progress value={progressValue} aria-label="Profile progress" />
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {milestoneSteps.map((step, index) => {
          const isComplete = step.legacySteps.every((legacyStep) =>
            completedSteps.includes(legacyStep),
          );
          const isActive = step.id === activeStep;

          return (
            <div
              key={step.id}
              className={cn(
                "grid min-w-0 gap-1 rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-4 sm:px-3 sm:text-xs",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isComplete
                  ? "border-[#C9D7C6] bg-[#EFF3EA] text-[#33423C]"
                  : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-[10px] text-foreground">
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="truncate">{step.shortLabel}</span>
            </div>
          );
        })}
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

function AdditionalDetails({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Collapsible className={cn("grid gap-3", className)}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-fit rounded-full px-4 text-sm font-semibold"
        >
          Additional details
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4 rounded-xl border bg-muted/10 p-4 sm:grid-cols-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MilestoneSummary({
  portfolio,
  onEdit,
}: {
  portfolio: BorrowerPortfolioInput;
  onEdit: (stepId: BorrowerPortfolioMilestoneId) => void;
}) {
  const totalBusinessExpenses = calculateTotalBusinessExpenses(portfolio);
  const totalHouseholdExpenses = calculateTotalHouseholdExpenses(portfolio);
  const totalDebtPayments = calculateTotalExistingDebtPayments(portfolio);
  const totalAssets = calculateTotalDeclaredAssets(portfolio);

  const groups = [
    {
      id: "personal",
      title: "Personal",
      rows: [
        ["Mobile number", portfolio.mobileNumber || "Not provided"],
        ["Home address", formatHomeAddress(portfolio) || "Not provided"],
        [
          "Emergency contact",
          portfolio.emergencyContactName && portfolio.emergencyContactNumber
            ? `${portfolio.emergencyContactName} · ${portfolio.emergencyContactNumber}`
            : "Not provided",
        ],
        ["Household expenses", formatMoney(totalHouseholdExpenses)],
      ],
    },
    {
      id: "business",
      title: "Business",
      rows: [
        ["Business name", portfolio.businessName || "Not provided"],
        [
          "Business type",
          portfolio.businessType
            ? businessTypeLabels[portfolio.businessType]
            : "Not provided",
        ],
        ["Years operating", formatPlain(portfolio.yearsInOperation)],
        [
          "Operating model",
          operatingModelLabels[portfolio.operatingModel] ?? "Not provided",
        ],
      ],
    },
    {
      id: "financials",
      title: "Financials",
      rows: [
        ["Monthly gross sales", formatMoney(portfolio.monthlyGrossRevenue)],
        ["Business expenses", formatMoney(totalBusinessExpenses)],
        ["Debt payments", formatMoney(totalDebtPayments)],
        ["Declared assets", formatMoney(totalAssets)],
      ],
    },
    {
      id: "loanRequest",
      title: "Loan request",
      rows: [
        [
          "Loan purpose",
          loanPurposeCategoryLabels[portfolio.loanPurposeCategory] ??
            "Not provided",
        ],
        [
          "Details",
          portfolio.loanPurposeDetails?.trim() || "Not provided",
        ],
      ],
    },
  ] as const satisfies readonly {
    id: BorrowerPortfolioMilestoneId;
    title: string;
    rows: readonly (readonly [string, string])[];
  }[];

  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <Card key={group.id} className="rounded-xl bg-muted/20">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold">{group.title}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full"
                onClick={() => onEdit(group.id)}
              >
                Edit
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.rows.map(([label, value]) => (
                <Summary key={label} label={label} value={value} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
  description,
  error,
  className,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
  description?: string;
  error?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("grid gap-2", className)}>
          <div className="flex items-start gap-3 rounded-xl bg-muted/25 px-4 py-3 transition-colors hover:bg-muted/40">
            <Checkbox
              id={String(name)}
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${String(name)}-error` : undefined}
              className="mt-0.5"
            />
            <div className="grid gap-1">
              <Label
                htmlFor={String(name)}
                className="cursor-pointer text-sm leading-5"
              >
                {label}
              </Label>
              {description ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
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

function RadioBooleanField<TName extends keyof BorrowerPortfolioFormInput>({
  control,
  name,
  label,
  error,
  className,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
  error?: string;
  className?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("grid gap-2", className)}>
          <Label className="text-sm font-medium">{label}</Label>
          <RadioGroup
            value={
              field.value === true
                ? "yes"
                : field.value === false
                  ? "no"
                  : undefined
            }
            onValueChange={(value) => field.onChange(value === "yes")}
            className="grid gap-2 sm:grid-cols-2"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${String(name)}-error` : undefined}
          >
            {[
              ["yes", "Yes"],
              ["no", "No"],
            ].map(([value, optionLabel]) => (
              <Label
                key={value}
                htmlFor={`${String(name)}-${value}`}
                className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted/25 px-4 py-3 text-sm leading-5 transition-colors hover:bg-muted/40"
              >
                <RadioGroupItem
                  id={`${String(name)}-${value}`}
                  value={value}
                />
                {optionLabel}
              </Label>
            ))}
          </RadioGroup>
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
  readOnly = false,
}: FieldControlProps & {
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <Field label={label} error={error} id={id} className={className}>
      <Input
        id={id}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        aria-disabled={readOnly || undefined}
        aria-invalid={Boolean(error)}
        {...register}
      />
    </Field>
  );
}

function MoneyField({
  id,
  label,
  error,
  register,
  emptyValue = 0,
  description,
}: FieldControlProps & { emptyValue?: number; description?: string }) {
  return (
    <Field label={label} error={error} id={id} description={description}>
      <CurrencyInput
        id={id}
        aria-invalid={Boolean(error)}
        registration={register}
        emptyValue={emptyValue}
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
  const inventorySummary =
    portfolio.hasInventory === null || portfolio.hasInventory === undefined
      ? "Not provided"
      : formatMoney(portfolio.inventoryValue);

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
            value={inventorySummary}
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
  description,
}: {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      ) : null}
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

function firstServerError(
  errors: Partial<Record<keyof BorrowerPortfolioInput, string[]>>,
  ...fields: (keyof BorrowerPortfolioInput)[]
) {
  for (const field of fields) {
    const message = errors[field]?.[0];
    if (message) return message;
  }

  return undefined;
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
