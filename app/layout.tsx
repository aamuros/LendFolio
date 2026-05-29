import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendFolio",
  description: "Financing workflows for micro-businesses and lenders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
