import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthSparkleBackground } from "@/components/auth/auth-sparkle-background";

type AuthShellProps = {
  children: ReactNode;
  maxWidth?: string;
};

export function AuthShell({
  children,
  maxWidth = "max-w-md",
}: AuthShellProps) {
  return (
    <main className="theme-lendfolio relative isolate flex min-h-svh flex-col items-center justify-center overflow-x-hidden bg-[#F6F5F2] px-5 py-8 text-[#161616] sm:px-6 sm:py-10 md:px-10">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(22,22,22,0.014)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,22,22,0.012)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,252,0.86),transparent_36%),radial-gradient(circle_at_18%_78%,rgba(31,122,77,0.045),transparent_28%),radial-gradient(circle_at_82%_74%,rgba(226,218,198,0.18),transparent_30%)]" />
      <AuthSparkleBackground />

      <div className={`relative z-10 grid w-full ${maxWidth} gap-3 sm:gap-4`}>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D9D7D1] bg-[#FFFFFC]/74 px-3.5 py-2 text-sm font-semibold text-[#33423C] shadow-[0_12px_30px_rgba(14,26,18,0.06)] backdrop-blur-md transition-colors duration-200 hover:border-[#C7C4BC] hover:bg-[#FFFFFC] hover:text-[#161616] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        {children}
      </div>
    </main>
  );
}
