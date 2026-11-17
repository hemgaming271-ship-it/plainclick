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
          Payments are handled by our payment provider, which acts as the reseller. It collects your payment details,
          billing country and email, and we never see your card details. We receive your email, the order ID, price,
          currency and refund status, so we can deliver and support your licence.
        </p>
        <h2>When you activate</h2>
        <p>
          The app sends your licence key, a random installation ID created by the app (not a hardware serial number), the
          app version, and an optional device name you can see. We use these to enforce the two-Mac limit and let you
          move your licence. When online, the app checks occasionally whether the licence is still valid.
        </p>
        <h2>Website</h2>
        <ul>
          <li>No advertising or cross-site tracking cookies.</li>
          <li>If you join the beta list, we store your email address only to tell you when the beta opens.</li>
          <li>To limit abuse, our servers keep short-lived, hashed records of IP addresses that call the licence endpoints.</li>
        </ul>
        <h2>Service providers</h2>
        <p>Payment provider, transactional email provider, website host and database host. Each processes data only to provide its service to us. [List the named providers before launch.]</p>
        <h2>Keeping and deleting data</h2>
        <p>
          Purchase records are kept as long as tax and accounting law requires. You can ask us to delete your beta-list
          entry, or to remove activation records, at any time.
        </p>
        <h2>Contact</h2>
        <p>{site.sellerName} · <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p>
      </Prose>
    </>
  );
}
