import { PageHeader, Prose } from "@/components/ui";
import { RecoverRequestForm } from "./RecoverRequestForm";

export const metadata = { title: "Recover your licence" };

export default function Page() {
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
