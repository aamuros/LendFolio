"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  floatingMenu?: React.ReactNode;
  isFloatingMenuOpen?: boolean;
  onFloatingMenuClose?: () => void;
};

export function AppBottomTabs<T extends string>({
  tabs,
  activeTab,
  ariaLabel,
  onTabChange,
  floatingMenu,
  isFloatingMenuOpen = false,
  onFloatingMenuClose,
}: AppBottomTabsProps<T>) {
  const [isVisible, setIsVisible] = useState(true);
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
    window.addEventListener("click", showTabs, { passive: true });
    window.addEventListener("touchstart", showTabs, { passive: true });

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", showTabs);
      window.removeEventListener("click", showTabs);
      window.removeEventListener("touchstart", showTabs);
    };
  }, []);

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

  return (
    <nav
      aria-label={ariaLabel}
      onFocusCapture={() => setIsVisible(true)}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] will-change-transform sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{
        transform: isVisible
          ? "translateY(0)"
          : "translateY(calc(100% + 20px + env(safe-area-inset-bottom)))",
        transition:
          "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease",
      }}
    >
      {isFloatingMenuOpen && floatingMenu ? (
        <div className="mx-auto mb-3 max-w-lg px-2">{floatingMenu}</div>
      ) : null}
      <div
        className="mx-auto flex max-w-lg transform-gpu items-center justify-between rounded-full border border-[var(--border)] bg-white/95 p-2 shadow-[0_18px_45px_rgba(22,22,22,0.16)] backdrop-blur"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const className = `flex h-[3.25rem] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
            isActive
              ? "bg-[var(--primary)] !text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/70 hover:text-[var(--foreground)]"
          }`;
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
                className={className}
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
              onClick={() => onTabChange?.(tab.id)}
              className={className}
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
        stroke="currentColor"
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

  if (name === "profile" || name === "applications") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
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

  if (name === "loans") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
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
        stroke="currentColor"
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
        stroke="currentColor"
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
        stroke="currentColor"
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
        stroke="currentColor"
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
        stroke="currentColor"
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
      stroke="currentColor"
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
