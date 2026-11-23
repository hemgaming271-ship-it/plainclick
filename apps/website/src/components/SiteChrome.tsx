import Link from "next/link";
import { footerGroups, nav, site } from "@/lib/site";
import { LogoMark } from "./Logo";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { Container } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[var(--nav)] text-white backdrop-blur-md backdrop-saturate-150">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <Container className="flex h-12 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
          <LogoMark size={22} />
          {site.name}
        </Link>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-2">
          <ul className="mr-3 hidden items-center gap-6 text-[13px] text-white/85 md:flex">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
          <Link href="/pricing" className="ml-1 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-hover)]">
            {site.checkoutEnabled ? `Buy · ${site.price.replace("US", "")}` : `${site.price.replace("US", "")} · Pricing`}
          </Link>
          <MobileNav />
        </nav>
      </Container>
    </header>
  );
}

export function PreReleaseBar() {
  if (site.releaseAvailable) return null;
  return (
    <div className="border-b border-line bg-surface">
      <Container className="py-2 text-center text-[13px] text-muted">
        Pre-release: PlainClick is finishing testing and isn&apos;t on sale yet. Everything shown here comes from the real
        pre-release build.
      </Container>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-surface text-[13px] text-muted">
      <Container className="py-10">
        <div className="space-y-2 border-b border-line pb-6">
          <p>
            PlainClick is an independent Mac app. It is not affiliated with, or endorsed by, Apple Inc. Mac, macOS, Safari,
            Finder and TextEdit are trademarks of Apple Inc.
          </p>
          <p>
            Screens on this site come from the PlainClick pre-release build running on macOS 26 test machines. It works
            only with the apps and actions listed on the <Link href="/compatibility" className="text-link hover:underline">compatibility page</Link>.
          </p>
        </div>
        <div className="grid gap-8 pt-8 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <LogoMark size={20} /> {site.name}
            </p>
            <p className="max-w-xs">{site.tagline} A plain, labelled panel for the Mac apps you use every day.</p>
            <p>Sold by {site.sellerName}.</p>
          </div>
          {footerGroups.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="mb-3 font-semibold text-ink">{g.title}</p>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-ink hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-10">© {new Date().getFullYear()} {site.sellerName}. All rights reserved.</p>
      </Container>
    </footer>
  );
}
