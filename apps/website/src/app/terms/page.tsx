import { DraftLegalNotice, PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Terms & licence" };

export default function Page() {
  return (
    <>
      <PageHeader title="Terms and licence" />
      <Prose>
        <DraftLegalNotice />
        <h2>The licence in one paragraph</h2>
        <p>{site.licenceSummary}</p>
        <h2>What you get</h2>
        <ul>
          <li>A personal, non-transferable-to-others, perpetual licence to use PlainClick version 1.x.</li>
          <li>Use on up to two Macs you own or personally control, at the same time.</li>
          <li>All 1.x updates we publish. A later major version, if there is one, may be sold separately, and buying it is optional.</li>
          <li>The first activation needs an internet connection. After that, the paid panel works offline.</li>
        </ul>
        <h2>Moving or resetting activations</h2>
        <p>
          Deactivate a Mac from inside the app to free its slot. If a Mac is lost or broken,{" "}
          {site.mode === "server"
            ? "use the licence recovery page, which confirms you own the purchase email, to reset your activations."
            : "email support from your purchase email address and we'll free that Mac's slot."}
        </p>
        <h2>What it isn&apos;t</h2>
        <ul>
          <li>No promise that v1 will stay compatible with every future macOS or app update.</li>
          <li>No promise of unlimited custom development or perpetual support. We provide reasonable email support for current v1 releases.</li>
          <li>PlainClick works only with the apps and actions listed on the compatibility page.</li>
        </ul>
        <h2>Trial</h2>
        <p>The free trial lasts 7 days from first use of the paid panel. The appearance guide is always free.</p>
        <h2>Acceptable use</h2>
        <p>Don&apos;t share, resell or publish licence keys, or try to get around licensing.</p>
        <h2>Refunds</h2>
        <p>See the <a href="/refunds">refund policy</a>. A refund revokes the licence.</p>
        <h2>Liability</h2>
        <p>[To be completed with legal review for the seller&apos;s jurisdiction. This will not exclude rights that cannot be excluded by law.]</p>
        <h2>Seller</h2>
        <p>
          {site.sellerName}. Orders are processed by {site.mode === "static" ? "Dodo Payments" : "our payment provider"},
          which acts as the reseller and merchant of record.
        </p>
        {!site.releaseNotarized && (
          <>
            <h2>Not notarized</h2>
            <p>
              Current builds are signed with our own certificate but not notarized by Apple, so macOS asks you to allow
              PlainClick when you first install it (see the <a href="/download#open-anyway">download page</a>). This is not an Apple
              review or endorsement.
            </p>
          </>
        )}
      </Prose>
    </>
  );
}
