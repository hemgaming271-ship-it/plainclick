import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";
import { RecoverRequestForm } from "./RecoverRequestForm";

export const metadata = { title: "Recover your licence" };

export default function Page() {
  if (site.mode === "static") {
    return (
      <>
        <PageHeader title="Find your licence key" intro="Lost your key, or need to free up a Mac you no longer have?" />
        <Prose>
          <h2>Your key is in your purchase email</h2>
          <p>
            Our payment provider, Dodo Payments, emails your licence key right after you pay. Search your inbox (and
            spam folder) for <strong>Dodo Payments</strong> or <strong>PlainClick</strong>, using the email address you
            entered at checkout.
          </p>
          <h2>Still can&apos;t find it, or a Mac is lost or broken?</h2>
          <p>
            Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> from the address you bought with, and
            include the order or payment ID from your receipt if you have it. We&apos;ll resend your key or free the lost
            Mac&apos;s activation. <strong>Never send us your card details.</strong>
          </p>
          <h2>Moving to a new Mac</h2>
          <p>
            On the old Mac, open PlainClick › Settings › Licence › Deactivate this Mac, then paste the key on the new one.
          </p>
        </Prose>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Recover your licence" intro="Lost your key, or need to free up a Mac you no longer have?" />
      <Prose>
        <p>
          Enter the email address you used at checkout. If it matches a purchase, we&apos;ll send a link that works once
          and expires after 30 minutes. From that page you can see your key and, if you need to, reset your activations.
        </p>
        <RecoverRequestForm />
      </Prose>
    </>
  );
}
