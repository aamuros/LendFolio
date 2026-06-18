import Image from "next/image";

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
      <Image
        src="/brand/favicon_io/apple-touch-icon.png"
        alt="LendFolio"
        width={180}
        height={180}
        priority={priority}
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
