import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LenderDirectoryHeader } from "@/components/borrower/lenders/lender-directory-header";
import { getBorrowerAccess } from "@/lib/borrower-access";
import { loadBorrowerLenders } from "@/lib/borrower-lenders";
import { ArrowRight, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BorrowerLendersPage() {
  const access = await getBorrowerAccess();
  if (!access.ok) return <AccessError message={access.message} />;

  const user = (await access.supabase.auth.getSession()).data.session?.user;
  const result = await loadBorrowerLenders(access.supabase);

  return (
    <main className="theme-lendfolio min-h-svh bg-background text-foreground">
      <LenderDirectoryHeader email={user?.email ?? ""} />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verified lenders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse lenders approved to offer financing on LendFolio.</p>
        </div>
        {result.error ? <Alert variant="destructive"><AlertDescription>{result.error}</AlertDescription></Alert> : null}
        {!result.error && result.data.length === 0 ? (
          <Card><CardContent className="grid justify-items-center gap-2 py-10 text-center"><Building2 className="size-8 text-muted-foreground" /><p className="font-medium">No lenders available</p><p className="text-sm text-muted-foreground">Approved lenders will appear here.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((lender) => (
              <Card key={lender.id}>
                <CardHeader><div className="flex items-start justify-between gap-3"><CardTitle>{lender.organizationName}</CardTitle><Badge variant="secondary">Verified</Badge></div><CardDescription>{lender.operatingArea || "Service area not specified"}</CardDescription></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{formatRange(lender.minLoanAmount, lender.maxLoanAmount)}</CardContent>
                <CardFooter><Button asChild variant="ghost" className="w-full justify-between"><Link href={`/borrower/lenders/${lender.id}`}>View lender details<ArrowRight className="size-4" /></Link></Button></CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AccessError({ message }: { message: string }) { return <main className="theme-lendfolio min-h-svh bg-background px-4 py-8"><Alert variant="destructive" className="mx-auto max-w-xl"><AlertDescription>{message}</AlertDescription></Alert></main>; }
function formatRange(min: number | null, max: number | null) { const money = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value); return min !== null && max !== null ? `${money(min)} – ${money(max)}` : "Loan range available with an offer"; }
