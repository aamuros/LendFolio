import Link from "next/link";
import { notFound } from "next/navigation";
import { LenderDirectoryHeader } from "@/components/borrower/lenders/lender-directory-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getBorrowerAccess } from "@/lib/borrower-access";
import { loadBorrowerLenders } from "@/lib/borrower-lenders";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BorrowerLenderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getBorrowerAccess();
  if (!access.ok) return <main className="theme-lendfolio min-h-svh px-4 py-8"><Alert variant="destructive"><AlertDescription>{access.message}</AlertDescription></Alert></main>;
  const user = (await access.supabase.auth.getSession()).data.session?.user;
  const result = await loadBorrowerLenders(access.supabase);
  if (result.error) return <main className="theme-lendfolio min-h-svh px-4 py-8"><Alert variant="destructive"><AlertDescription>{result.error}</AlertDescription></Alert></main>;
  const lender = result.data.find((item) => item.id === id);
  if (!lender) notFound();

  return <main className="theme-lendfolio min-h-svh bg-background text-foreground"><LenderDirectoryHeader email={user?.email ?? ""} /><div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 sm:px-6 sm:py-8"><Button asChild variant="ghost" className="w-fit px-0 hover:bg-transparent"><Link href="/borrower/lenders"><ArrowLeft className="mr-2 size-4" />Back to lenders</Link></Button><Card><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl">{lender.organizationName}</CardTitle><Badge variant="secondary">Verified</Badge></div><CardDescription>{lender.operatingArea || "Service area not specified"}</CardDescription></CardHeader><CardContent className="grid gap-5"><p className="leading-6 text-muted-foreground">{lender.description || "This lender has not added a description yet."}</p><Separator /><dl className="grid gap-4 sm:grid-cols-2"><Detail label="Minimum loan" value={money(lender.minLoanAmount)} /><Detail label="Maximum loan" value={money(lender.maxLoanAmount)} /><Detail label="Typical repayment terms" value={lender.typicalRepaymentTerms || "Discussed with each offer"} /><Detail label="Operating area" value={lender.operatingArea || "Not specified"} /></dl></CardContent></Card></div></main>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function money(value: number | null) { return value === null ? "Not specified" : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value); }
