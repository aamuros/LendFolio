import Image from "next/image";

import { cn } from "@/lib/utils";

const fullSizeClasses = {
  sm: "h-10 w-[200px]",
  md: "h-12 w-[240px]",
  lg: "h-14 w-[280px]",
};

const wordmarkSizeClasses = {
  sm: "h-10 w-[200px]",
  md: "h-12 w-[240px]",
  lg: "h-14 w-[280px]",
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
      <Image
        src="/brand/favicon_io/favicon-32x32.png"
        alt="LendFolio"
        width={36}
        height={36}
        priority={priority}
        className={cn("block rounded-full object-contain", iconSizeClasses[size], className)}
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
