import Image from "next/image";
import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

const fullSizeClasses = {
  sm: "h-[clamp(1.45rem,2vw,2.1rem)] w-[clamp(7.25rem,10vw,10.5rem)]",
  md: "h-[clamp(1.55rem,2.2vw,2.1rem)] w-[clamp(7.75rem,11vw,10.5rem)]",
  lg: "h-[clamp(1.65rem,2.4vw,2.1rem)] w-[clamp(8.25rem,12vw,10.5rem)]",
};

const wordmarkSizeClasses = {
  sm: "h-[clamp(1.45rem,2vw,2.1rem)] w-[clamp(7.25rem,10vw,10.5rem)]",
  md: "h-[clamp(1.55rem,2.2vw,2.1rem)] w-[clamp(7.75rem,11vw,10.5rem)]",
  lg: "h-[clamp(1.65rem,2.4vw,2.1rem)] w-[clamp(8.25rem,12vw,10.5rem)]",
};

const iconSizeClasses = {
  sm: "size-7",
  md: "size-8",
  lg: "size-9",
};

type LogoVariant = "full" | "wordmark" | "icon";
type LogoSize = "sm" | "md" | "lg";

type LogoProps = {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  priority?: boolean;
};

export function Logo({
  variant = "full",
  size = "md",
  className,
  priority = false,
}: LogoProps) {
  if (variant === "icon") {
    return (
      <LendFolioMark
        aria-label="LendFolio"
        role="img"
        className={cn("block shrink-0", iconSizeClasses[size], className)}
      />
    );
  }

  const isWordmark = variant === "wordmark";
  const dimensions = isWordmark
    ? { width: 700, height: 140, src: "/brand/favicon_io/lendfolio-logo.svg" }
    : { width: 700, height: 140, src: "/brand/favicon_io/lendfolio-logo.svg" };

  return (
    <Image
      src={dimensions.src}
      alt="LendFolio"
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={cn(
        "block shrink-0 object-contain",
        isWordmark ? wordmarkSizeClasses[size] : fullSizeClasses[size],
        className,
      )}
    />
  );
}

function LendFolioMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="36" height="36" rx="18" fill="#161616" />
      <path
        d="M10.5 9.25H15V24.1H25.5V27.75H10.5V9.25Z"
        fill="#FFFFFC"
      />
      <path
        d="M18.25 9.25H27V12.85H22.75V16.65H26.25V20.1H22.75V27.75H18.25V9.25Z"
        fill="#EFF3EA"
      />
      <path d="M14.95 20.1H22.75V23.65H14.95V20.1Z" fill="#CFC8B9" />
    </svg>
  );
}
