import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  maxWidth?: string;
};

export function AuthShell({
  children,
  maxWidth = "max-w-md",
}: AuthShellProps) {
  return (
    <main className="theme-lendfolio relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#F6F5F2] px-5 py-8 text-[#161616] sm:px-6 md:px-10">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(to_right,rgba(22,22,22,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(22,22,22,0.03)_1px,transparent_1px)] bg-[size:5rem_5rem]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(51,66,60,0.16),transparent_64%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,252,0.78),transparent_34%),radial-gradient(circle_at_18%_72%,rgba(51,66,60,0.08),transparent_28%),radial-gradient(circle_at_82%_72%,rgba(226,218,198,0.36),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-[#0E1A12]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(to_bottom,rgba(14,26,18,0.96)_0%,rgba(14,26,18,0.82)_48%,rgba(246,245,242,0)_100%)]" />

      <div className={`grid w-full ${maxWidth} gap-4`}>
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#E6DDCB]/20 bg-[#FFFFFC]/10 px-3 py-2 text-sm font-semibold text-[#F6F0DF] shadow-[0_14px_35px_rgba(14,26,18,0.14)] backdrop-blur-md transition-colors hover:border-[#E6DDCB]/35 hover:bg-[#FFFFFC]/16 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6DDCB]"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
        {children}
      </div>
    </main>
  );
}

