import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendFolio",
  description: "Sprint 0 foundation for the LendFolio MVP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
