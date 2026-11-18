import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1100px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

type BtnProps = { href: string; children: ReactNode; variant?: "primary" | "secondary" | "link"; size?: "md" | "lg" };
export function ButtonLink({ href, children, variant = "primary", size = "md" }: BtnProps) {
  const pad = size === "lg" ? "px-6 py-3 text-[17px]" : "px-5 py-2.5 text-[15px]";
  if (variant === "link") {
    return (
      <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-[17px] text-link hover:underline">
        {children} <span aria-hidden="true">›</span>
      </Link>
    );
  }
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-[var(--accent-hover)]"
      : "border border-line bg-white text-ink hover:bg-surface";
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center justify-center rounded-full font-semibold transition ${pad} ${styles}`}>
      {children}
    </Link>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</p>;
}

export function PageHeader({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <header className="pb-6 pt-16 sm:pt-20">
      <Container>
        <h1 className="text-[40px] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[56px]">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[19px] leading-relaxed text-muted sm:text-[21px]">{intro}</p>}
      </Container>
    </header>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      role="note"
      className={`rounded-2xl border p-4 text-[15px] leading-relaxed sm:p-5 ${
        tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <Container className="py-8">
      <div className="prose-plain max-w-3xl text-[17px]">{children}</div>
    </Container>
  );
}

export function DraftLegalNotice() {
  return (
    <Notice tone="warn">
      <strong>Draft.</strong> This text is a working draft prepared before launch and has not been reviewed by a lawyer.
      Nothing here limits rights you have under the consumer law where you live.
    </Notice>
  );
}
