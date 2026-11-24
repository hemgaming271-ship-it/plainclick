"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const order: Theme[] = ["system", "light", "dark"];
const labels: Record<Theme, string> = { system: "Theme: match system", light: "Theme: light", dark: "Theme: dark" };

/** Cycles system → light → dark. The choice is stored only in this browser (localStorage). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  function next() {
    const t = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(t);
    const root = document.documentElement;
    try {
      if (t === "system") {
        localStorage.removeItem("theme");
        delete root.dataset.theme;
      } else {
        localStorage.setItem("theme", t);
        root.dataset.theme = t;
      }
    } catch {
      if (t === "system") delete root.dataset.theme;
      else root.dataset.theme = t;
    }
  }

  return (
    <button
      type="button"
      onClick={next}
      aria-label={`${labels[theme]}. Change theme`}
      title={labels[theme]}
      className="grid h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "light" && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {theme === "dark" && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
        {theme === "system" && (
          <>
            <rect x="3" y="4" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </>
        )}
      </svg>
    </button>
  );
}
