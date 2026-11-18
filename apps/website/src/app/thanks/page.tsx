import Link from "next/link";
import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";
import { LicenceFromReturn } from "./LicenceFromReturn";

export const metadata = { title: "Thank you", robots: { index: false }, referrer: "no-referrer" };

// Return page after checkout. It unlocks nothing: the key comes from the payment provider (shown here if Dodo passed
// it back, and always sent by email), and the app checks it with the provider when activating.
export default function Page() {
  return (
    <>
      <PageHeader title="Thank you" intro="If your payment went through, your licence key is on its way by email." />
      <Prose>
        <LicenceFromReturn />
        <ul>
          <li>The email usually arrives within a few minutes. Please check your spam or promotions folder too.</li>
          <li>
            Haven&apos;t got it after an hour? See <Link href="/recover">Find your licence key</Link>, or write to{" "}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
          </li>
          <li>
            Download PlainClick from the <Link href="/download">download page</Link>, then paste the key in PlainClick &rsaquo;
            Settings &rsaquo; Licence.
          </li>
        </ul>
        <p>If the payment was cancelled or failed, nothing was charged for PlainClick and no key will be sent.</p>
      </Prose>
    </>
  );
}
