import { AppHeader } from "@/components/app-header";

const navItems = [
  { id: "home", label: "Home", href: "/borrower" },
  { id: "apply", label: "Apply", href: "/borrower?tab=apply" },
  { id: "offers", label: "Offers", href: "/borrower?tab=offers" },
  { id: "loans", label: "Loans", href: "/borrower?tab=loans" },
  { id: "lenders", label: "Lenders", href: "/borrower/lenders" },
];

export function LenderDirectoryHeader({ email }: { email: string }) {
  return (
    <AppHeader
      navItems={navItems}
      activeNavId="lenders"
      accountEmail={email}
      accountHref="/borrower?tab=profile"
      accountLabel="Profile"
      lenderDirectoryHref="/borrower/lenders"
    />
  );
}
