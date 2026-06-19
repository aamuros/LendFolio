import { redirect, RedirectType } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LenderEditProfilePage() {
  redirect("/lender/edit-profile/organization", RedirectType.replace);
}
