import Link from "next/link";
import { footerNav, nav, site } from "@/lib/site";
import { Container } from "./ui";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-surface focus:p-3">
        Skip to content
      </a>
      <Container className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-base">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="py-2 text-ink underline-offset-4 hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      {!site.releaseAvailable && (
        <div className="border-t border-line bg-surface">
          <Container className="py-2 text-sm text-muted">
            Pre-release: PlainClick is in development and not yet available to buy or download.
          </Container>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <Container className="grid gap-6 py-10 text-sm text-muted sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-semibold text-ink">{site.name}</p>
          <p>{site.tagline}</p>
          <p>
            PlainClick is an independent product. It is not made, approved, or endorsed by Apple. Mac, macOS, Safari and
            Finder are trademarks of Apple Inc.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
            {footerNav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-block py-1 underline-offset-4 hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
