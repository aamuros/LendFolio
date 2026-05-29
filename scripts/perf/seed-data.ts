import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_SERVICE_ROLE_KEY. Find it with: supabase status -o env",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type DatasetSize = "medium" | "large";

const SIZES: Record<DatasetSize, {
  borrowers: number;
  lenders: number;
  applications: number;
  offers: number;
  proofs: number;
  schedules: number;
}> = {
  medium: {
    borrowers: 100,
    lenders: 25,
    applications: 500,
    offers: 1000,
    proofs: 1000,
    schedules: 1000,
  },
  large: {
    borrowers: 1000,
    lenders: 100,
    applications: 5000,
    offers: 10000,
    proofs: 10000,
    schedules: 10000,
  },
};

const BUSINESS_TYPES = [
  "sari_sari_store",
  "food_vendor",
  "market_vendor",
  "transport_operator",
  "home_based_food",
  "personal_services",
  "agriculture",
  "retail",
  "other",
] as const;

const APPLICATION_STATUSES = ["submitted", "open", "accepted", "declined", "withdrawn"] as const;
const OFFER_STATUSES = ["pending", "accepted", "declined", "expired"] as const;
const LOAN_STATUSES = ["active", "paid", "overdue", "defaulted", "closed"] as const;
const REPAYMENT_STATUSES = ["due", "submitted", "verified", "rejected", "late"] as const;
const PROOF_STATUSES = ["submitted", "verified", "rejected"] as const;
const PREFERRED_TERMS = ["1_month", "3_months", "6_months", "12_months"] as const;
const PROFILE_STATUSES = ["active", "pending", "suspended"] as const;

function uuid(): string {
  return crypto.randomUUID();
}

function randomFrom<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return d.toISOString();
}

function randomAmount(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function main() {
  const size = (process.argv[2] ?? "medium") as DatasetSize;
  const config = SIZES[size];

  if (!config) {
    console.error(`Unknown size: ${size}. Use "medium" or "large".`);
    process.exit(1);
  }

  console.log(`Seeding ${size} dataset...`);
  console.log(`  Borrowers: ${config.borrowers}`);
  console.log(`  Lenders: ${config.lenders}`);
  console.log(`  Applications: ${config.applications}`);
  console.log(`  Offers: ${config.offers}`);
  console.log(`  Proofs/Schedules: ${config.proofs}/${config.schedules}`);

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Step 1: Create borrower profiles
  console.log("\n[1/8] Creating borrower profiles...");
  const borrowerIds: string[] = [];
  const borrowerProfiles: Array<{
    id: string;
    role: string;
    display_name: string;
    status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < config.borrowers; i++) {
    const id = uuid();
    borrowerIds.push(id);
    borrowerProfiles.push({
      id,
      role: "borrower",
      display_name: `Test Borrower ${i + 1}`,
      status: randomFrom(PROFILE_STATUSES),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  // Insert in batches of 500
  for (let i = 0; i < borrowerProfiles.length; i += 500) {
    const batch = borrowerProfiles.slice(i, i + 500);
    const { error } = await supabase.from("profiles").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting borrower profiles batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${borrowerIds.length} borrower profiles`);

  // Step 2: Create lender profiles
  console.log("\n[2/8] Creating lender profiles...");
  const lenderUserIds: string[] = [];
  const lenderProfiles: Array<{
    id: string;
    role: string;
    display_name: string;
    status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < config.lenders; i++) {
    const id = uuid();
    lenderUserIds.push(id);
    lenderProfiles.push({
      id,
      role: "lender",
      display_name: `Test Lender ${i + 1}`,
      status: randomFrom(PROFILE_STATUSES),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < lenderProfiles.length; i += 500) {
    const batch = lenderProfiles.slice(i, i + 500);
    const { error } = await supabase.from("profiles").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting lender profiles batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${lenderUserIds.length} lender profiles`);

  // Step 3: Create lender_profile rows
  console.log("\n[3/8] Creating lender profile details...");
  const lenderProfileRows: Array<{
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
    verification_status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < lenderUserIds.length; i++) {
    lenderProfileRows.push({
      id: uuid(),
      user_id: lenderUserIds[i],
      organization_name: `Lender Org ${i + 1}`,
      contact_person: `Contact ${i + 1}`,
      phone_number: `+639${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
      business_address: `${i + 1} Test Street, Manila`,
      operating_area: "Metro Manila",
      business_registration_number: Math.random() > 0.3 ? `BN-${String(i + 1).padStart(6, "0")}` : null,
      min_loan_amount: randomAmount(5000, 20000),
      max_loan_amount: randomAmount(50000, 500000),
      typical_repayment_terms: randomFrom(PREFERRED_TERMS),
      lender_description: `Micro-lending organization ${i + 1}`,
      verification_status: Math.random() > 0.2 ? "approved" : "pending",
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < lenderProfileRows.length; i += 500) {
    const batch = lenderProfileRows.slice(i, i + 500);
    const { error } = await supabase.from("lender_profiles").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting lender profile details batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${lenderProfileRows.length} lender profile details`);

  // Step 4: Create borrower portfolios
  console.log("\n[4/8] Creating borrower portfolios...");
  const portfolioIds: string[] = [];
  const portfolioRows: Array<{
    id: string;
    borrower_id: string;
    business_name: string;
    business_description: string;
    business_type: string;
    location: string;
    monthly_gross_revenue: number;
    monthly_expenses: number;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < borrowerIds.length; i++) {
    const id = uuid();
    portfolioIds.push(id);
    portfolioRows.push({
      id,
      borrower_id: borrowerIds[i],
      business_name: `Business ${i + 1}`,
      business_description: `A test micro-business ${i + 1}`,
      business_type: randomFrom(BUSINESS_TYPES),
      location: `City ${i % 50 + 1}, Province ${i % 10 + 1}`,
      monthly_gross_revenue: randomAmount(10000, 200000),
      monthly_expenses: randomAmount(5000, 150000),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < portfolioRows.length; i += 500) {
    const batch = portfolioRows.slice(i, i + 500);
    const { error } = await supabase.from("borrower_portfolios").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting portfolios batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${portfolioIds.length} portfolios`);

  // Step 5: Create loan applications
  console.log("\n[5/8] Creating loan applications...");
  const applicationIds: string[] = [];
  const applicationRows: Array<{
    id: string;
    borrower_id: string;
    borrower_portfolio_id: string;
    requested_amount: number;
    purpose: string;
    preferred_term: string;
    status: string;
    submitted_at: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < config.applications; i++) {
    const id = uuid();
    const borrowerIndex = i % borrowerIds.length;
    applicationIds.push(id);
    applicationRows.push({
      id,
      borrower_id: borrowerIds[borrowerIndex],
      borrower_portfolio_id: portfolioIds[borrowerIndex],
      requested_amount: randomAmount(5000, 200000),
      purpose: `Business expansion ${i + 1}`,
      preferred_term: randomFrom(PREFERRED_TERMS),
      status: randomFrom(APPLICATION_STATUSES),
      submitted_at: randomDate(sixMonthsAgo, now),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < applicationRows.length; i += 500) {
    const batch = applicationRows.slice(i, i + 500);
    const { error } = await supabase.from("loan_applications").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting applications batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${applicationIds.length} applications`);

  // Step 6: Create loan offers
  console.log("\n[6/8] Creating loan offers...");
  const offerRows: Array<{
    id: string;
    loan_application_id: string;
    borrower_id: string;
    lender_id: string;
    lender_name: string;
    approved_amount: number;
    repayment_amount: number;
    due_date: string;
    status: string;
    sent_at: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < config.offers; i++) {
    const appIndex = i % applicationIds.length;
    const lenderIndex = i % lenderUserIds.length;
    const app = applicationRows[appIndex];
    const approvedAmount = Math.round(app.requested_amount * (0.7 + Math.random() * 0.3));

    offerRows.push({
      id: uuid(),
      loan_application_id: applicationIds[appIndex],
      borrower_id: app.borrower_id,
      lender_id: lenderUserIds[lenderIndex],
      lender_name: `Lender Org ${lenderIndex + 1}`,
      approved_amount: approvedAmount,
      repayment_amount: Math.round(approvedAmount * 1.1),
      due_date: randomDate(now, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)),
      status: randomFrom(OFFER_STATUSES),
      sent_at: randomDate(sixMonthsAgo, now),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < offerRows.length; i += 500) {
    const batch = offerRows.slice(i, i + 500);
    const { error } = await supabase.from("loan_offers").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting offers batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${offerRows.length} offers`);

  // Step 7: Create active loans (subset of accepted applications)
  console.log("\n[7/8] Creating active loans and repayment schedules...");
  const acceptedApplications = applicationRows.filter((a) => a.status === "accepted");
  const loanRows: Array<{
    id: string;
    loan_application_id: string;
    borrower_id: string;
    lender_id: string;
    principal_amount: number;
    repayment_amount: number;
    outstanding_balance: number;
    status: string;
    started_at: string;
    due_date: string;
    created_at: string;
    updated_at: string;
  }> = [];

  for (let i = 0; i < acceptedApplications.length; i++) {
    const app = acceptedApplications[i];
    const lenderIndex = i % lenderUserIds.length;
    const principal = randomAmount(5000, 100000);

    loanRows.push({
      id: uuid(),
      loan_application_id: app.id,
      borrower_id: app.borrower_id,
      lender_id: lenderUserIds[lenderIndex],
      principal_amount: principal,
      repayment_amount: Math.round(principal * 1.1),
      outstanding_balance: Math.round(principal * (0.3 + Math.random() * 0.7)),
      status: randomFrom(LOAN_STATUSES),
      started_at: randomDate(sixMonthsAgo, now),
      due_date: randomDate(now, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)),
      created_at: randomDate(sixMonthsAgo, now),
      updated_at: now.toISOString(),
    });
  }

  for (let i = 0; i < loanRows.length; i += 500) {
    const batch = loanRows.slice(i, i + 500);
    const { error } = await supabase.from("active_loans").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting loans batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${loanRows.length} active loans`);

  // Step 8: Create repayment schedules and proofs
  console.log("\n[8/8] Creating repayment schedules and proofs...");
  const scheduleRows: Array<{
    id: string;
    active_loan_id: string;
    borrower_id: string;
    lender_id: string;
    installment_number: number;
    amount_due: number;
    due_date: string;
    status: string;
    created_at: string;
    updated_at: string;
  }> = [];

  const proofRows: Array<{
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
    status: string;
    submitted_at: string;
    created_at: string;
    updated_at: string;
  }> = [];

  const schedulesPerLoan = Math.ceil(config.schedules / Math.max(loanRows.length, 1));

  for (let i = 0; i < loanRows.length; i++) {
    const loan = loanRows[i];
    const numSchedules = Math.min(schedulesPerLoan, 12);

    for (let j = 0; j < numSchedules; j++) {
      const scheduleId = uuid();
      const dueDate = new Date(now.getTime() + (j + 1) * 30 * 24 * 60 * 60 * 1000);

      scheduleRows.push({
        id: scheduleId,
        active_loan_id: loan.id,
        borrower_id: loan.borrower_id,
        lender_id: loan.lender_id,
        installment_number: j + 1,
        amount_due: Math.round(loan.repayment_amount / numSchedules),
        due_date: dueDate.toISOString().split("T")[0],
        status: randomFrom(REPAYMENT_STATUSES),
        created_at: loan.created_at,
        updated_at: now.toISOString(),
      });

      if (proofRows.length < config.proofs && Math.random() > 0.5) {
        proofRows.push({
          id: uuid(),
          repayment_schedule_id: scheduleId,
          active_loan_id: loan.id,
          borrower_id: loan.borrower_id,
          lender_id: loan.lender_id,
          storage_bucket: "repayment-proofs",
          storage_path: `proofs/${scheduleId}/receipt.jpg`,
          file_name: "receipt.jpg",
          file_type: "image/jpeg",
          file_size: randomAmount(50000, 500000),
          status: randomFrom(PROOF_STATUSES),
          submitted_at: randomDate(sixMonthsAgo, now),
          created_at: randomDate(sixMonthsAgo, now),
          updated_at: now.toISOString(),
        });
      }
    }

    if (scheduleRows.length >= config.schedules) break;
  }

  for (let i = 0; i < scheduleRows.length; i += 500) {
    const batch = scheduleRows.slice(i, i + 500);
    const { error } = await supabase
      .from("loan_repayment_schedules")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: false });
    if (error) {
      console.error(`  Error inserting schedules batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${scheduleRows.length} repayment schedules`);

  for (let i = 0; i < proofRows.length; i += 500) {
    const batch = proofRows.slice(i, i + 500);
    const { error } = await supabase.from("repayment_proofs").upsert(batch, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error(`  Error inserting proofs batch ${i}:`, error.message);
    }
  }
  console.log(`  Created ${proofRows.length} repayment proofs`);

  console.log(`\n${size} dataset seeded successfully.`);
  console.log(`Total rows:`);
  console.log(`  Profiles: ${borrowerProfiles.length + lenderProfiles.length}`);
  console.log(`  Lender profiles: ${lenderProfileRows.length}`);
  console.log(`  Portfolios: ${portfolioRows.length}`);
  console.log(`  Applications: ${applicationRows.length}`);
  console.log(`  Offers: ${offerRows.length}`);
  console.log(`  Active loans: ${loanRows.length}`);
  console.log(`  Schedules: ${scheduleRows.length}`);
  console.log(`  Proofs: ${proofRows.length}`);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
