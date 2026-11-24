import Link from "next/link";
import type { ReactNode } from "react";
import { FilmCard } from "@/components/FilmCard";
import { LogoMark } from "@/components/Logo";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { compatibility } from "@/lib/compatibility";
import { dodoBuyUrl } from "@/lib/dodoLink";
import { site } from "@/lib/site";

const price = site.price.replace("US", "");

function buyHref() {
  if (!site.checkoutEnabled) return "/pricing";
  return (site.mode === "static" && dodoBuyUrl(site.dodo.paymentLink, site.url)) || "/pricing";
}

/** Text on one side, real product media on the other; alternates sides on wide screens. */
function FeatureRow({ title, body, media, flip = false, caption }: { title: string; body: ReactNode; media: ReactNode; flip?: boolean; caption?: string }) {
  return (
    <div className="reveal grid items-center gap-8 py-12 md:grid-cols-2 md:gap-14 md:py-16">
      <div className={flip ? "md:order-2" : ""}>
        <h3 className="text-[28px] font-semibold leading-tight tracking-[-0.015em] sm:text-[34px]">{title}</h3>
        <div className="mt-3 max-w-md text-[17px] leading-relaxed text-muted sm:text-[19px]">{body}</div>
      </div>
      <figure className={flip ? "md:order-1" : ""}>
        {media}
        {caption && <figcaption className="mt-3 text-center text-[12px] text-muted">{caption}</figcaption>}
      </figure>
    </div>
  );
}

/** A real 3× render of the app's own panel, on a soft stage. */
function PanelShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="stage shadow-float grid place-items-center rounded-[28px] px-6 py-10 sm:px-12 sm:py-14">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={780} height={486} className="w-full max-w-[340px] rounded-2xl bg-white shadow-soft ring-1 ring-black/5" loading="lazy" />
    </div>
  );
}

const appIcons: Record<string, ReactNode> = {
  TextEdit: <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />,
  Finder: <path d="M4 7h6l2 2h8v10H4zM4 7V5h6l2 2" />,
  Safari: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z" />,
  Calculator: <path d="M6 3h12v18H6zM9 7h6M9 12h1M12 12h1M15 12h0M9 16h1M12 16h1M15 16h1" />,
};

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Does PlainClick change how my apps look?",
    a: "No. It adds a separate panel next to the app. The app's own toolbar, buttons and macOS appearance stay exactly as they are.",
  },
  {
    q: "Which apps does it work with?",
    a: (
      <>
        TextEdit, Finder, Safari and Calculator, with the actions listed on the{" "}
        <Link href="/compatibility" className="text-link hover:underline">compatibility page</Link>. Every other app gets an honest
        &ldquo;not supported yet&rdquo; message instead of guesses.
      </>
    ),
  },
  {
    q: "Why does it need Accessibility access?",
    a: "macOS only lets one app press another app's menu commands with this permission. PlainClick uses it on your Mac only, and you can switch it off any time in System Settings → Privacy & Security → Accessibility.",
  },
  {
    q: "Is it a subscription?",
    a: `No. It's ${site.price} once, for PlainClick v1 and every 1.x update, on up to two Macs you own. There's a 7-day free trial first.`,
  },
  {
    q: "What if it isn't for me?",
    a: (
      <>
        Ask for a refund within 14 days, no reason needed. See the <Link href="/refunds" className="text-link hover:underline">refund policy</Link>.
      </>
    ),
  },
  {
    q: "Will macOS ask before opening it?",
    a: site.releaseNotarized ? (
      "PlainClick is signed and notarized by Apple, so it opens like any other downloaded app."
    ) : (
      <>
        Builds are signed with PlainClick&apos;s own certificate but not yet notarized by Apple, so macOS asks you to allow it once, when you first install it, in
        System Settings → Privacy &amp; Security → Open Anyway. The <Link href="/download#open-anyway" className="text-link hover:underline">download page</Link> shows how.
        You never need to turn off Gatekeeper.
      </>
    ),
  },
];

export default function Home() {
  const apps = ["TextEdit", "Finder", "Safari", "Calculator"].map((app) => ({
    app,
    actions: compatibility.filter((r) => r.app === app && r.status !== "dropped" && r.status !== "candidate").map((r) => r.action),
  }));

  return (
    <>
      {/* Hero */}
      <section className="hero-glow pb-10 pt-16 text-center sm:pt-24">
        <Container>
          <div className="reveal">
            <LogoMark size={76} className="mx-auto drop-shadow-[0_10px_20px_rgba(0,113,227,0.35)]" />
            <p className="mt-6">
              <Link href="/changelog" className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-[13px] text-muted shadow-soft transition hover:text-ink">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
                Quick keys ⌃⌥1–9 and launch at login <span aria-hidden="true">›</span>
              </Link>
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl text-[44px] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[72px]">
              Clear controls. <span className="text-gradient">Less clutter.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[19px] leading-relaxed text-muted sm:text-[22px]">
              The commands you use every day, as plain labelled buttons in a small panel beside your Mac apps. One shortcut away.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {site.checkoutEnabled ? (
                <ButtonLink href={buyHref()} size="lg">Buy PlainClick · {price}</ButtonLink>
              ) : (
                <ButtonLink href="#film" size="lg">Watch the film</ButtonLink>
              )}
              <ButtonLink href="/how-it-works" variant="link">See how it works</ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-muted">
              {price} one time · 7-day free trial · 14-day refund · macOS 14 or later · Apple silicon and Intel
            </p>
          </div>
        </Container>
      </section>

      {/* Film */}
      <section id="film" className="pb-8">
        <Container>
          <div className="reveal">
            <FilmCard src="/video/plainclick-launch.mp4" poster="/video/plainclick-launch-poster.jpg" duration="0:52" />
            <p className="mt-3 text-center text-[12px] text-muted">
              The windows and panels in the film are real screenshots of the pre-release build on a macOS 26 test machine, put together with motion graphics.
            </p>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section id="features" className="pt-20">
        <Container>
          <div className="reveal max-w-3xl">
            <h2 className="text-[36px] font-bold leading-tight tracking-[-0.02em] sm:text-[48px]">Everything, one shortcut away.</h2>
            <p className="mt-3 text-[19px] text-muted sm:text-[21px]">
              Press ⌃⌥P and PlainClick shows the commands that matter for the app in front. Click one, and the app does it.
            </p>
          </div>

          <FeatureRow
            title="A plain panel, right beside your work."
            body="PlainClick opens next to the app you're using and names it at the top, so you always know what a click will do. The app itself stays exactly as it is."
            media={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/shot-textedit-find.png"
                alt="TextEdit with its find bar open after clicking Find in the PlainClick panel beside it"
                width={940}
                height={470}
                className="shadow-float w-full rounded-[20px] border border-line"
                loading="lazy"
              />
            }
            caption="Real screenshot · pre-release build on macOS 26"
          />
          <FeatureRow
            flip
            title="Words, not mystery icons."
            body="Every button says what it does: Save, Find, Reload, New Tab. Big targets, solid edges and readable text, so there's nothing to guess."
            media={<PanelShot src="/images/panel-safari.png" alt="PlainClick panel for Safari with Reload and New Tab buttons" />}
            caption="The actual PlainClick panel for Safari, rendered by the app"
          />
          <FeatureRow
            title="Your typing stays where it was."
            body="Clicking the panel doesn't steal your place. PlainClick confirms the command and you keep typing in your document straight away. That's checked in our automated tests on macOS 15 and 26."
            media={<PanelShot src="/images/panel-save.png" alt="PlainClick panel for TextEdit confirming: Save sent to TextEdit" />}
            caption="TextEdit, right after clicking Save"
          />
          <FeatureRow
            flip
            title="Calculator modes, one click away."
            body="Switch Calculator to Basic, Scientific or Programmer, or copy the result, without hunting through the View menu."
            media={<PanelShot src="/images/panel-calculator.png" alt="PlainClick panel for Calculator with Basic, Scientific, Programmer and Copy Result buttons" />}
            caption="Calculator: four tested actions"
          />
          <FeatureRow
            title="Honest about the rest."
            body={
              <>
                If an app isn&apos;t supported, PlainClick says so instead of guessing. Back and Forward didn&apos;t pass our
                reliability tests, so they aren&apos;t offered. Only actions that passed are shown.
              </>
            }
            media={<PanelShot src="/images/panel-unsupported.png" alt="PlainClick panel saying Stickies isn't supported yet" />}
            caption="The real message for an app that isn't supported"
          />

          <div className="reveal mt-8 max-w-3xl">
            <h3 className="text-[28px] font-semibold tracking-[-0.015em] sm:text-[34px]">Made to fit how you work.</h3>
            <p className="mt-2 text-[17px] text-muted sm:text-[19px]">All of this is in PlainClick&apos;s Settings today.</p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["⌃⌥P", "One shortcut, every app", "Press Control-Option-P to show or hide the panel from whichever supported app is in front."],
              ["📌", "Pin and reorder", "Choose which tested actions appear for each app, unpin the rest, and move them up or down."],
              ["Aa", "Compact or comfortable", "Two panel sizes with big, readable buttons. Show icons next to the words, or hide them."],
              ["⏸", "Lives in the menu bar", "No Dock icon. Open the panel, pause PlainClick, or reach Settings from the menu bar."],
              ["✓", "Checks before every click", "PlainClick confirms the app in front is still the one it names. If you've switched apps, nothing is sent."],
              ["⏻", "Turn it off per app", "Switch PlainClick off for any supported app in Settings → Apps, and back on whenever you like."],
              ["☁︎", "Works offline", "After a one-time activation, the panel keeps working without an internet connection for up to 30 days at a time."],
              ["◐", "Free appearance guide", "A built-in guide to Apple's own Reduce transparency and Increase contrast settings. Free for everyone."],
              ["↻", "Updates included", "Every 1.x update is part of your licence, on up to two Macs you own."],
            ].map(([icon, t, b]) => (
              <div key={t} className="reveal rounded-3xl border border-line bg-card p-6 shadow-soft">
                <span className="grid h-11 min-w-11 place-items-center justify-self-start rounded-xl bg-surface px-2 text-[17px] font-semibold text-ink" aria-hidden="true">
                  {icon}
                </span>
                <h4 className="mt-4 text-[19px] font-semibold">{t}</h4>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Supported apps */}
      <section className="mt-12 bg-surface py-20">
        <Container>
          <div className="reveal max-w-3xl">
            <Eyebrow>Works with</Eyebrow>
            <h2 className="mt-2 text-[36px] font-bold leading-tight tracking-[-0.02em] sm:text-[48px]">Nine tested actions. Four apps.</h2>
            <p className="mt-3 text-[19px] text-muted">
              Each action ran 20 times in a row with the real Apple app on macOS 15 and macOS 26 test machines, including while switching apps.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {apps.map((a) => (
              <div key={a.app} className="reveal rounded-3xl border border-line bg-card p-6 shadow-soft">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-ink">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {appIcons[a.app]}
                  </svg>
                </span>
                <h3 className="mt-4 text-[19px] font-semibold">{a.app}</h3>
                <ul className="mt-3 space-y-1.5 text-[15px] text-muted">
                  {a.actions.map((x) => (
                    <li key={x} className="flex items-center gap-2">
                      <span className="text-ok" aria-hidden="true">✓</span> {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="reveal mt-8">
            <ButtonLink href="/compatibility" variant="link">Full compatibility details</ButtonLink>
          </p>
        </Container>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-24">
        <Container>
          <div className="reveal max-w-3xl">
            <h2 className="text-[36px] font-bold leading-tight tracking-[-0.02em] sm:text-[48px]">Private by design.</h2>
            <p className="mt-3 text-[19px] text-muted sm:text-[21px]">
              PlainClick does its work on your Mac, with one permission you can see and switch off.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Runs on your Mac", "It reads only the menu commands of supported apps, locally. Documents, screen contents and browsing history never leave your Mac."],
              ["One clear permission", "Accessibility, asked only when you turn on app control, with an explanation first. Revoke it any time."],
              ["No system changes", "No admin password, no code injection, no changes to system files, and you never turn off Gatekeeper or SIP."],
              ["No tracking", "No analytics and no ads in the app. Licensing sends only your key and your Mac's model name."],
            ].map(([t, b]) => (
              <div key={t} className="reveal rounded-3xl bg-surface p-6">
                <h3 className="text-[19px] font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
          <div className="reveal mt-10 grid overflow-hidden rounded-[28px] border border-line md:grid-cols-2">
            <div className="bg-card p-7 sm:p-9">
              <h3 className="text-[21px] font-semibold">What leaves your Mac</h3>
              <p className="mt-1 text-[15px] text-muted">Only when you activate or the app checks your licence.</p>
              <ul className="mt-5 space-y-3 text-[15px]">
                {[
                  "Your licence key",
                  "Your Mac's model identifier, like “Mac14,2” (not its name or serial number)",
                  "Sent to Dodo Payments, which sells PlainClick and checks licences",
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="mt-0.5 text-link" aria-hidden="true">→</span> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line bg-surface p-7 sm:p-9 md:border-l md:border-t-0">
              <h3 className="text-[21px] font-semibold">What never leaves your Mac</h3>
              <p className="mt-1 text-[15px] text-muted">PlainClick has no way to upload these.</p>
              <ul className="mt-5 space-y-3 text-[15px]">
                {[
                  "Your documents and what you type",
                  "Screen contents, window and document names",
                  "Browsing history and the pages you visit",
                  "Which buttons you click, and when",
                ].map((x) => (
                  <li key={x} className="flex gap-3">
                    <span className="mt-0.5 font-semibold text-muted" aria-hidden="true">✕</span> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="reveal mt-8">
            <ButtonLink href="/privacy" variant="link">Read the privacy policy</ButtonLink>
          </p>
        </Container>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-surface py-20">
        <Container>
          <div className="reveal overflow-hidden rounded-[28px] border border-line bg-card shadow-soft md:grid md:grid-cols-[1.15fr_1fr]">
            <div className="p-8 sm:p-12">
              <Eyebrow>One price</Eyebrow>
              <p className="mt-3 flex items-baseline gap-3">
                <span className="text-[64px] font-bold leading-none tracking-[-0.03em] sm:text-[80px]">{price}</span>
                <span className="text-[17px] text-muted">one time</span>
              </p>
              <p className="mt-4 max-w-md text-[17px] leading-relaxed">
                A perpetual personal licence for PlainClick v1 and every 1.x update, on up to two Macs you own. No subscription.
              </p>
              <div className="mt-7">
                {site.checkoutEnabled ? (
                  <ButtonLink href={buyHref()} size="lg">Buy PlainClick · {price}</ButtonLink>
                ) : (
                  <span className="inline-flex min-h-11 items-center rounded-full bg-surface px-6 py-3 text-[17px] font-semibold text-muted">
                    Checkout opens at launch
                  </span>
                )}
              </div>
              <p className="mt-3 text-[13px] text-muted">
                Price in US dollars, before tax. Checkout shows the final total. Your licence key arrives by email right after you pay.
              </p>
            </div>
            <dl className="grid grid-cols-2 border-t border-line md:border-l md:border-t-0">
              {[
                ["2 Macs", "you own"],
                ["All 1.x", "updates included"],
                ["7 days", "free trial first"],
                ["14 days", "to ask for a refund"],
              ].map(([big, small], i) => (
                <div key={big} className={`p-7 sm:p-9 ${i % 2 === 0 ? "border-r border-line" : ""} ${i < 2 ? "border-b border-line" : ""}`}>
                  <dt className="text-[28px] font-semibold tracking-[-0.01em] sm:text-[32px]">{big}</dt>
                  <dd className="text-[15px] text-muted">{small}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-24">
        <Container className="max-w-[820px]">
          <h2 className="reveal text-center text-[36px] font-bold tracking-[-0.02em] sm:text-[48px]">Good questions.</h2>
          <div className="reveal mt-10 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-6 text-[19px] font-semibold">
                  {f.q}
                  <span className="chev text-[26px] font-light leading-none text-muted" aria-hidden="true">+</span>
                </summary>
                <div className="mt-3 text-[17px] leading-relaxed text-muted">{f.a}</div>
              </details>
            ))}
          </div>
          <p className="reveal mt-8 text-center">
            <ButtonLink href="/help" variant="link">More in Help &amp; FAQ</ButtonLink>
          </p>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="pb-8 pt-4 text-center">
        <Container className="reveal">
          <LogoMark size={64} className="mx-auto" />
          <h2 className="mt-6 text-[44px] font-bold tracking-[-0.03em] sm:text-[64px]">Click with confidence.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[19px] text-muted sm:text-[22px]">Plain words on every button, right beside the app you&apos;re using.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {site.checkoutEnabled ? (
              <ButtonLink href={buyHref()} size="lg">Buy PlainClick · {price}</ButtonLink>
            ) : (
              <ButtonLink href="/pricing" size="lg">See pricing</ButtonLink>
            )}
            <ButtonLink href="/download" variant="link">{site.releaseAvailable ? "Have a licence? Download" : "Download & install"}</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
