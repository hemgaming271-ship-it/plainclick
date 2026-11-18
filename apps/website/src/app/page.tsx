import Link from "next/link";
import { CompatTable } from "@/components/CompatTable";
import { PanelConcept } from "@/components/PanelConcept";
import { ButtonLink, Container, Notice } from "@/components/ui";
import { WaitlistForm } from "@/components/WaitlistForm";
import { anyVerified } from "@/lib/compatibility";
import { site } from "@/lib/site";

const benefits = [
  { title: "Clearly labelled controls", body: "Every button says what it does in words, with solid edges and readable text." },
  { title: "Your most-used actions together", body: "Keep the few commands you use all day in one small panel." },
  { title: "A layout you can customise", body: "Pin, reorder, and choose a compact or comfortable size." },
  { title: "App control stays on your Mac", body: "PlainClick presses commands locally. It never uploads screen contents, documents or browsing history." },
];

const steps = ["Download", "Install", "Allow Accessibility access (only if you turn on app control)", "Choose your actions", "Open the panel with a shortcut"];

export default function Home() {
  return (
    <>
      <section className="border-b border-line py-14 sm:py-20">
        <Container className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="fade-in">
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Your everyday Mac actions, made clearer.</h1>
            <p className="mt-4 max-w-xl text-xl text-muted">A simple, customizable control panel for supported Mac apps.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {site.releaseAvailable ? (
                <ButtonLink href="/download">Try PlainClick</ButtonLink>
              ) : (
                <ButtonLink href="#beta">Join the beta</ButtonLink>
              )}
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </div>
          <PanelConcept />
        </Container>
      </section>

      <section className="py-14" aria-labelledby="what">
        <Container className="max-w-3xl">
          <h2 id="what" className="text-2xl font-bold">What it does — and what it doesn&apos;t</h2>
          <p className="mt-3 text-lg">
            PlainClick shows a separate, plainly labelled panel next to the app you&apos;re using. Click a button and
            PlainClick runs that app&apos;s own menu command.
          </p>
          <p className="mt-3 text-lg">
            It does <strong>not</strong> restyle or shrink the app&apos;s toolbar, change macOS appearance, or work with
            every app. If you mainly want toolbars to take up less space, PlainClick won&apos;t help with that.
          </p>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-14" aria-labelledby="benefits">
        <Container>
          <h2 id="benefits" className="text-2xl font-bold">Why people want it</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <li key={b.title}>
                <h3 className="text-lg font-semibold">{b.title}</h3>
                <p className="mt-1 text-muted">{b.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-14" aria-labelledby="apps">
        <Container>
          <h2 id="apps" className="text-2xl font-bold">Supported apps</h2>
          {!anyVerified && (
            <div className="mt-4">
              <Notice>
                Nine actions in four apps (TextEdit, Finder, Safari and Calculator) have passed our automated tests with
                the real Apple apps on macOS 15 and macOS 26 (Tahoe),
                running on test machines. We haven&apos;t confirmed them by hand on a physical Mac yet. Back and Forward
                didn&apos;t pass, so PlainClick doesn&apos;t offer them.
              </Notice>
            </div>
          )}
          <div className="mt-6">
            <CompatTable />
          </div>
          <p className="mt-4">
            <Link href="/compatibility" className="text-accent underline underline-offset-2">
              Full compatibility details and known limitations
            </Link>
          </p>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-14" aria-labelledby="setup">
        <Container>
          <h2 id="setup" className="text-2xl font-bold">Setup</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-5">
            {steps.map((s, i) => (
              <li key={s} className="rounded-md border border-line bg-paper p-4">
                <span className="block text-sm font-semibold text-muted">Step {i + 1}</span>
                <span className="mt-1 block">{s}</span>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-14" aria-labelledby="price">
        <Container className="max-w-3xl">
          <h2 id="price" className="text-2xl font-bold">Pricing</h2>
          <p className="mt-3 text-3xl font-bold">US$5.99 one time</p>
          <p className="mt-2 text-lg">{site.licenceSummary}</p>
          <p className="mt-2 text-muted">
            Sales tax or VAT may be added at checkout depending on where you live. You&apos;ll see the total before you pay.
            A 7-day free trial comes first.
          </p>
          <p className="mt-4">
            <Link href="/pricing" className="text-accent underline underline-offset-2">Licence details</Link>
          </p>
        </Container>
      </section>

      {!site.releaseAvailable && (
        <section id="beta" className="border-t border-line bg-surface py-14" aria-labelledby="beta-h">
          <Container className="max-w-3xl">
            <h2 id="beta-h" className="text-2xl font-bold">Join the beta</h2>
            {site.mode === "server" ? (
              <>
                <p className="mt-3 mb-6 text-lg">PlainClick isn&apos;t available yet. Leave your email and we&apos;ll write once, when the beta opens.</p>
                <WaitlistForm />
              </>
            ) : (
              <>
                <p className="mt-3 mb-6 text-lg">
                  PlainClick isn&apos;t available yet. New builds are published on our releases page. To be told when one
                  appears, use &ldquo;Watch → Custom → Releases&rdquo; there (needs a free GitHub account). We don&apos;t
                  collect email addresses on this site.
                </p>
                <ButtonLink href={site.releasesUrl}>See releases</ButtonLink>
              </>
            )}
          </Container>
        </section>
      )}

      <section className="py-14" aria-labelledby="faq">
        <Container className="max-w-3xl">
          <h2 id="faq" className="text-2xl font-bold">Questions</h2>
          <p className="mt-3">
            Before buying anything, try the free Apple settings <strong>Reduce transparency</strong> and{" "}
            <strong>Increase contrast</strong>. Our <Link href="/help#appearance" className="text-accent underline">free guide</Link>{" "}
            explains where to find them. More answers are in <Link href="/help" className="text-accent underline">Help &amp; FAQ</Link>,
            or <Link href="/contact" className="text-accent underline">contact support</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
