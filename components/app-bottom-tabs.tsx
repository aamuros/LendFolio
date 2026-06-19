"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type AppTabIcon =
  | "home"
  | "profile"
  | "apply"
  | "offers"
  | "loans"
  | "applications"
  | "account"
  | "proofs"
  | "lookup"
  | "others";

export type AppBottomTab<T extends string> = {
  id: T;
  label: string;
  icon: AppTabIcon;
  href?: string;
};

type AppBottomTabsProps<T extends string> = {
  tabs: AppBottomTab<T>[];
  activeTab: T | null;
  ariaLabel: string;
  onTabChange?: (tab: T) => void;
  onAnyTabPress?: (tab: T) => void;
  floatingMenu?: React.ReactNode;
  isFloatingMenuOpen?: boolean;
  onFloatingMenuClose?: () => void;
};

export function AppBottomTabs<T extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  onAnyTabPress,
  floatingMenu,
  isFloatingMenuOpen = false,
  onFloatingMenuClose,
}: AppBottomTabsProps<T>) {
  const [isVisible, setIsVisible] = useState(true);
  const navRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const downDistanceRef = useRef(0);
  const upDistanceRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const hideDelta = 24;
    const showDelta = 8;
    const hideAfterScrollY = 80;

    function showTabs() {
      downDistanceRef.current = 0;
      upDistanceRef.current = 0;
      setIsVisible(true);
    }

    function updateForScroll() {
      animationFrameRef.current = null;
      const nextScrollY = window.scrollY;
      const scrollDelta = nextScrollY - lastScrollYRef.current;

      if (scrollDelta === 0) {
        return;
      }

      if (scrollDelta > 0) {
        downDistanceRef.current += scrollDelta;
        upDistanceRef.current = 0;

        if (
          nextScrollY > hideAfterScrollY &&
          downDistanceRef.current >= hideDelta
        ) {
          setIsVisible(false);
        }
      } else {
        upDistanceRef.current += Math.abs(scrollDelta);
        downDistanceRef.current = 0;

        if (upDistanceRef.current >= showDelta) {
          setIsVisible(true);
        }
      }

      lastScrollYRef.current = nextScrollY;
    }

    function onScroll() {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(updateForScroll);
      }
    }

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", showTabs, { passive: true });

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", showTabs);
    };
  }, []);

  useEffect(() => {
    if (!isVisible && isFloatingMenuOpen) {
      onFloatingMenuClose?.();
    }
  }, [isVisible, isFloatingMenuOpen, onFloatingMenuClose]);

  useEffect(() => {
    if (!isFloatingMenuOpen || !onFloatingMenuClose) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onFloatingMenuClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFloatingMenuOpen, onFloatingMenuClose]);

  useEffect(() => {
    if (!isFloatingMenuOpen || !onFloatingMenuClose) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!navRef.current?.contains(target)) {
        onFloatingMenuClose?.();
      }
    }

    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isFloatingMenuOpen, onFloatingMenuClose]);

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      onFocusCapture={() => setIsVisible(true)}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] will-change-transform motion-reduce:transform-none motion-reduce:transition-none sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{
        transform: isVisible
          ? "translateY(0)"
          : "translateY(calc(100% + 20px + env(safe-area-inset-bottom)))",
        transition:
          "transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease",
      }}
    >
      <div
        className={`mx-auto mb-3 max-w-lg transform-gpu px-2 transition-all duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          isFloatingMenuOpen && floatingMenu
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-6 opacity-0"
        }`}
        aria-hidden={isFloatingMenuOpen ? undefined : true}
      >
        {floatingMenu}
      </div>
      <div
        className="mx-auto flex max-w-lg transform-gpu items-center justify-between rounded-full border border-border/80 bg-card/95 p-2 shadow-[0_18px_50px_rgba(14,26,18,0.12)] backdrop-blur"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabClassName = cn(
            "flex h-[3.25rem] min-w-0 flex-1 transform-gpu items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.97] touch-manipulation motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-[#0E1A12] active:bg-[#0E1A12] [&>span]:text-primary-foreground [&_svg]:text-primary-foreground [&_svg]:stroke-current"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent [&_svg]:text-current [&_svg]:stroke-current",
          );
          const content = (
            <>
              <TabIcon name={tab.icon} />
              <span>{tab.label}</span>
            </>
          );

          if (tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onAnyTabPress?.(tab.id)}
                className={tabClassName}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-expanded={isFloatingMenuOpen ? true : undefined}
              onClick={() => {
                onAnyTabPress?.(tab.id);
                onTabChange?.(tab.id);
              }}
              className={tabClassName}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({ name }: { name: AppTabIcon }) {
  if (name === "home") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (name === "profile") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    );
  }

  if (name === "applications") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M8 6h8M6 10h12M6 14h12M6 18h8" />
      </svg>
    );
  }

  if (name === "loans") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h10" />
      </svg>
    );
  }

  if (name === "proofs") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M9 14h6" />
        <path d="M9 18h4" />
      </svg>
    );
  }

  if (name === "lookup") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4.5-4.5" />
      </svg>
    );
  }

  if (name === "others") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </svg>
    );
  }

  if (name === "apply") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M12 11v6" />
        <path d="M9 14h6" />
      </svg>
    );
  }

  if (name === "account") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M4 7h16v12H4z" />
      <path d="M4 10h16" />
      <path d="M8 15h4" />
    </svg>
  );
}
