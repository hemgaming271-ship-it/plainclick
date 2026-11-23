import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { CheckoutNotice } from "@/components/CheckoutNotice";
import { ButtonLink, Container, Notice, PageHeader, Prose } from "@/components/ui";
import { dodoBuyUrl } from "@/lib/dodoLink";
import { site } from "@/lib/site";

export const metadata = { title: "Pricing" };

const buyClass = "inline-flex min-h-11 items-center rounded-full bg-accent px-6 py-3 text-[17px] font-semibold text-white no-underline transition hover:bg-[var(--accent-hover)]";

export default function Page() {
  const staticBuyUrl = site.mode === "static" ? dodoBuyUrl(site.dodo.paymentLink, site.url) : null;
  return (
    <>
      <PageHeader title="Pricing" intro="One price, one time. A 7-day free trial first." />
      <Container className="py-6">
        <div className="max-w-2xl rounded-[28px] border border-line bg-card p-8 shadow-soft sm:p-10">
          <p className="flex items-baseline gap-3">
            <span className="text-[64px] font-bold leading-none tracking-[-0.03em]">{site.price.replace("US", "")}</span>
            <span className="text-[17px] text-muted">one time · no subscription</span>
          </p>
          <p className="mt-5 text-[17px] leading-relaxed">{site.licenceSummary}</p>
          <ul className="mt-5 grid gap-2 text-[15px] sm:grid-cols-2">
            {["Up to 2 Macs you own", "Every 1.x update", "7-day free trial first", "14 days to ask for a refund"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="text-ok" aria-hidden="true">✓</span> {x}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[13px] text-muted">
            Price in US dollars. Sales tax or VAT may be added at checkout depending on where you live. The total is shown before you pay.
          </p>
          <div className="mt-7">
            <CheckoutNotice />
            {site.checkoutEnabled && site.mode === "static" && staticBuyUrl ? (
              // Dodo's hosted checkout. Dodo emails the licence key; nothing is unlocked on our side.
              <div>
                <a href={staticBuyUrl} className={buyClass} rel="noopener">
                  Buy PlainClick — US$5.99
                </a>
                <p className="mt-2 text-sm text-muted">
                  You&apos;ll pay on Dodo Payments&apos; secure checkout page. Your licence key arrives by email right after.
                </p>
              </div>
            ) : site.checkoutEnabled && site.mode === "server" && site.checkoutProvider === "dodo" ? (
              // Plain form POST: works without JavaScript. The server creates a single-use Dodo checkout session.
              <form action="/api/checkout" method="post">
                <button
                  type="submit"
                  className="min-h-11 rounded-md bg-accent px-6 py-2.5 text-base font-semibold text-accent-ink"
                >
                  Buy PlainClick — US$5.99
                </button>
                <p className="mt-2 text-sm text-muted">You&apos;ll pay on Dodo Payments&apos; secure checkout page.</p>
              </form>
            ) : site.checkoutEnabled && site.mode === "server" ? (
              <CheckoutButton clientToken={site.paddle.clientToken} priceId={site.paddle.priceId} env={site.paddle.env} />
            ) : (
              <>
                <span className="inline-flex min-h-11 items-center rounded-full bg-surface px-6 py-3 text-[17px] font-semibold text-muted">
                  Checkout opens at launch
                </span>
                <p className="mt-3 text-[15px] text-muted">
                  PlainClick goes on sale once the download is released and tested. Until then, see it in the{" "}
                  <Link href="/#film" className="text-link hover:underline">launch film</Link>.
                </p>
              </>
            )}
          </div>
          <p className="mt-6 text-[13px] text-muted">
            Before you buy, please read the <Link href="/terms" className="text-link hover:underline">licence terms</Link> and{" "}
            <Link href="/refunds" className="text-link hover:underline">refund policy</Link>.
          </p>
        </div>
      </Container>
      <Prose>
        <h2>What &ldquo;lifetime&rdquo; means here</h2>
        <ul>
          <li>Your licence for PlainClick v1 never expires and has no subscription.</li>
          <li>It includes every v1.x update. A future v2, if there is one, would be optional and sold separately.</li>
          <li>
            It covers up to two Macs you own. Move it by deactivating it on the old Mac. If a Mac is lost or broken,{" "}
            {site.mode === "server" ? (
              <>you can <Link href="/recover">reset your activations</Link> yourself.</>
            ) : (
              <>email <a href={`mailto:${site.supportEmail}`}>support</a> and we&apos;ll free its slot.</>
            )}
          </li>
          <li>The first activation needs an internet connection. After that the panel works offline.</li>
          <li>It is not a promise that v1 will keep working with every future macOS release, and it doesn&apos;t include unlimited custom development or support forever.</li>
        </ul>
        <h2>Offline use and refunds</h2>
        <p>
          Because an activated copy works offline, a refunded copy can&apos;t be switched off straight away while that Mac
          stays offline. The licence is revoked on our side, and the app stops being licensed the next time it checks in.
        </p>
        <h2>If PlainClick ever closes</h2>
        <p>
          Copies that are already activated keep working, because the licence check is stored on your Mac. Before
          shutting down, we would publish a final build or instructions that don&apos;t need our activation server.
        </p>
      </Prose>
    </>
  );
}
