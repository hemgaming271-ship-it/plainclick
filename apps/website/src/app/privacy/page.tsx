import { DraftLegalNotice, PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy" };

export default function Page() {
  return (
    <>
      <PageHeader title="Privacy policy" intro="PlainClick does its work on your Mac. Selling and licensing it needs a small amount of data, described here." />
      <Prose>
        <DraftLegalNotice />
        <h2>On your Mac</h2>
        <ul>
          <li>PlainClick reads the menu commands of supported apps through macOS Accessibility, so it can press them.</li>
          <li>It does <strong>not</strong> upload screen contents, accessibility trees, window or document names, document text, or browsing history.</li>
          <li>Your settings and pinned actions are stored locally. Your licence is stored in your Mac&apos;s Keychain.</li>
          <li>There are no analytics and no automatic crash uploads. If you choose to send a diagnostic report, you&apos;ll see what it contains first, with personal details removed.</li>
        </ul>
        <h2>When you buy</h2>
        <p>
          Payments are handled by {site.mode === "static" ? "Dodo Payments" : "our payment provider"}, which acts as the
          reseller (merchant of record). It collects your payment details, billing country and email, and we never see
          your card details. We can see your email, the order ID, price, currency and refund status in its dashboard, so
          we can support your licence.
        </p>
        <h2>When you activate</h2>
        {site.mode === "static" ? (
          <p>
            The app sends your licence key and your Mac&apos;s model identifier (like &ldquo;Mac14,2&rdquo;, not your
            computer&apos;s name or serial number) to Dodo Payments, which issues the keys and enforces the two-Mac limit.
            When online, the app occasionally asks Dodo whether the key is still valid on this Mac.
          </p>
        ) : (
          <p>
            The app sends your licence key, a random installation ID created by the app (not a hardware serial number), the
            app version, and an optional device name you can see. We use these to enforce the two-Mac limit and let you
            move your licence. When online, the app checks occasionally whether the licence is still valid.
          </p>
        )}
        <h2>Website</h2>
        <ul>
          <li>No advertising or cross-site tracking cookies, and no analytics.</li>
          {site.mode === "server" ? (
            <>
              <li>If you join the beta list, we store your email address only to tell you when the beta opens.</li>
              <li>To limit abuse, our servers keep short-lived, hashed records of IP addresses that call the licence endpoints.</li>
            </>
          ) : (
            <li>This site is static: it has no forms and stores nothing about you. The host may keep standard access logs.</li>
          )}
        </ul>
        <h2>Service providers</h2>
        {site.mode === "static" ? (
          <p>
            Dodo Payments (payments, licence keys and receipt emails), GitHub (download hosting) and our website host.
            Each processes data only to provide its service.
          </p>
        ) : (
          <p>Payment provider, transactional email provider, website host and database host. Each processes data only to provide its service to us. [List the named providers before launch.]</p>
        )}
        <h2>Keeping and deleting data</h2>
        <p>
          Purchase records are kept as long as tax and accounting law requires. You can ask us to remove activation
          records{site.mode === "server" ? " or your beta-list entry" : ""} at any time.
        </p>
        <h2>Contact</h2>
        <p>{site.sellerName} · <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p>
      </Prose>
    </>
  );
}
