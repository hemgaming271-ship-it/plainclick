"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { nav } from "@/lib/site";

/** Small-screen menu. A native <details> element, so it opens without JavaScript; closes on navigation and Escape. */
export function MobileNav() {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <details ref={ref} className="mobile-nav md:hidden">
      <summary
        aria-label="Menu"
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path className="icon-open" d="M4 7h16M4 12h16M4 17h16" />
          <path className="icon-close" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </summary>
      <div className="absolute inset-x-0 top-12 border-t border-white/10 bg-[#161617] shadow-2xl">
        <ul className="mx-auto max-w-[1100px] px-4 py-2 sm:px-6">
          {nav.map((n) => (
            <li key={n.href} className="border-b border-white/10 last:border-0">
              <Link href={n.href} className="block py-3 text-[17px] text-white/90 hover:text-white">
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
