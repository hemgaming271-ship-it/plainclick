"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Adds "is-visible" to every .reveal element as it scrolls into view. The hidden starting state only applies once
 * the <html> element has the "js" class, so pages read fine with JavaScript off or in reduced-motion mode.
 *
 * Re-runs on every route change and watches for elements added later, so content that arrives through in-site
 * navigation (e.g. /pricing → /#features) is never left hidden. A short fallback reveals anything still hidden.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const show = (el: Element) => el.classList.add("is-visible");
    const pending = () => Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)"));

    if (!("IntersectionObserver" in window)) {
      pending().forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    const observeAll = () => pending().forEach((el) => io.observe(el));
    observeAll();

    // New .reveal elements (client-side navigation, streamed content).
    const mo = new MutationObserver(() => observeAll());
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: anything already scrolled into or past the viewport that is still hidden gets shown.
    const fallback = window.setTimeout(
      () => pending().filter((el) => el.getBoundingClientRect().top < window.innerHeight).forEach(show),
      1200,
    );

    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(fallback);
    };
  }, [pathname]);

  return null;
}
