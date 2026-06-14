"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Borrowers", href: "#borrowers" },
  { label: "Lenders", href: "#lenders" },
  { label: "Managers", href: "#managers" },
  { label: "Security", href: "#security" },
];

export function FloatingLandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Main navigation"
        data-state={menuOpen ? "active" : "inactive"}
        className={cn(
          "group mx-auto transition-all duration-300 ease-out",
          isScrolled ? "max-w-5xl" : "max-w-7xl",
        )}
      >
        <div
          className={cn(
            "relative flex min-h-16 items-center justify-between gap-3 border px-4 transition-all duration-300 ease-out sm:min-h-[4.5rem] sm:gap-4 sm:px-6",
            isScrolled
              ? "rounded-2xl border-[#D9D7D1]/80 bg-[#FFFFFC]/85 shadow-[0_18px_50px_rgba(14,26,18,0.12)] backdrop-blur-xl"
              : "rounded-none border-transparent bg-transparent shadow-none backdrop-blur-0",
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
            aria-label="LendFolio home"
            onClick={() => setMenuOpen(false)}
          >
            <Logo size="sm" priority />
          </Link>

          <div className="absolute inset-0 m-auto hidden h-fit w-fit xl:block">
            <div className="flex items-center gap-6 text-sm text-[#55534F]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-200 hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className={cn(
                "px-2 py-2 text-sm font-medium whitespace-nowrap text-[#1F1F1F] transition-all hover:text-[#5F5F5F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]",
                isScrolled && "hidden",
              )}
            >
              Sign in
            </Link>

            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#161616] bg-[#161616] px-4 text-sm font-semibold whitespace-nowrap !text-white transition-colors hover:bg-[#0E1A12] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
            >
              Create account
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="relative z-20 -mr-2 grid h-10 w-10 place-items-center rounded-xl text-[#161616] transition-colors hover:bg-[#FFFFFC]/70 hover:text-[#5F5F5F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616] lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="mt-2 rounded-2xl border border-[#D9D7D1]/80 bg-[#FFFFFC]/95 p-5 shadow-[0_18px_50px_rgba(14,26,18,0.12)] backdrop-blur-xl lg:hidden">
            <div className="grid gap-4 text-sm text-[#55534F]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="font-medium transition-colors duration-200 hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#C7C4BC] bg-[#FFFFFC] px-4 text-sm font-semibold text-[#161616] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#161616] bg-[#161616] px-4 text-sm font-semibold !text-white transition-colors hover:bg-[#0E1A12] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#161616]"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
