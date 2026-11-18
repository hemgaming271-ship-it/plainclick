import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ButtonLink, Container, Notice, PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Pricing" };

const checkoutMessages: Record<string, string> = {
  error: "Checkout couldn't start. Nothing was charged. Please try again in a minute, or contact support.",
  busy: "Too many checkout attempts from this connection. Please wait a little and try again.",
  closed: "Checkout isn't open right now.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const checkoutMessage = checkout ? checkoutMessages[checkout] : undefined;
  return (
    <>
      <PageHeader title="Pricing" intro="One price, one time. A 7-day free trial first." />
      <Container className="py-10">
        <div className="max-w-xl rounded-lg border-2 border-line bg-surface p-6">
          <p className="text-4xl font-bold">US$5.99</p>
          <p className="mt-1 text-muted">one time · no subscription</p>
          <p className="mt-4 text-lg">{site.licenceSummary}</p>
          <p className="mt-3 text-muted">
            Sales tax or VAT may be added at checkout depending on where you live. The total is shown before you pay.
          </p>
          <div className="mt-6">
            {checkoutMessage && (
              <div className="mb-4" role="alert">
                <Notice>{checkoutMessage}</Notice>
              </div>
            )}
            {site.checkoutEnabled && site.checkoutProvider === "dodo" ? (
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
            ) : site.checkoutEnabled ? (
              <CheckoutButton clientToken={site.paddle.clientToken} priceId={site.paddle.priceId} env={site.paddle.env} />
            ) : (
              <>
                <Notice>Checkout isn&apos;t open yet. PlainClick will go on sale only once the download is released and tested.</Notice>
                <div className="mt-4">
                  <ButtonLink href="/#beta">Join the beta</ButtonLink>
                </div>
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">
            Before you buy, please read the <Link href="/terms" className="underline">licence terms</Link> and{" "}
            <Link href="/refunds" className="underline">refund policy</Link>.
          </p>
        </div>
      </Container>
      <Prose>
        <h2>What &ldquo;lifetime&rdquo; means here</h2>
        <ul>
          <li>Your licence for PlainClick v1 never expires and has no subscription.</li>
          <li>It includes every v1.x update. A future v2, if there is one, would be optional and sold separately.</li>
          <li>It covers up to two Macs you own. Move it by deactivating it on the old Mac. If a Mac is lost or broken, you can <Link href="/recover">reset your activations</Link> yourself.</li>
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
