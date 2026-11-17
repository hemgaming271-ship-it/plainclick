import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

type BtnProps = { href: string; children: ReactNode; variant?: "primary" | "secondary" };
export function ButtonLink({ href, children, variant = "primary" }: BtnProps) {
  const base = "inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-base font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:opacity-90"
      : "border-2 border-ink/80 text-ink hover:bg-surface";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <header className="border-b border-line py-10 sm:py-14">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      </Container>
    </header>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      role="note"
      className={`rounded-md border-l-4 bg-surface p-4 text-base ${tone === "warn" ? "border-[var(--focus)]" : "border-accent"}`}
    >
      {children}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10">
      <div className="prose-plain max-w-3xl">{children}</div>
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
