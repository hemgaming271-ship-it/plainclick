import Link from "next/link";
import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Thank you", robots: { index: false } };

// Return page after checkout. It deliberately shows no key and unlocks nothing: the licence is issued only when the
// payment provider's signed webhook confirms the payment, and it is sent by email.
export default function Page() {
  return (
    <>
      <PageHeader title="Thank you" intro="If your payment went through, your licence key is on its way by email." />
      <Prose>
        <ul>
          <li>The email usually arrives within a few minutes. Please check your spam or promotions folder too.</li>
          <li>
            Haven&apos;t got it after an hour? Use <Link href="/recover">Recover licence</Link> with the email you used at
            checkout, or write to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
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
