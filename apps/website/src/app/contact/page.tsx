import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Contact & support" };

export default function Page() {
  return (
    <>
      <PageHeader title="Contact & support" />
      <Prose>
        <p>
          Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We&apos;re a small team and aim to reply
          within two working days.
        </p>
        <h2>To help us help you, include</h2>
        <ul>
          <li>Your macOS version (Apple menu → About This Mac).</li>
          <li>The PlainClick version and the app you were using.</li>
          <li>What you expected and what happened.</li>
        </ul>
        <p>
          <strong>Never send your licence key or card details by email.</strong> For lost keys, see{" "}
          <a href="/recover">{site.mode === "server" ? "licence recovery" : "Find your licence key"}</a>.
        </p>
        <p>{site.sellerName}</p>
      </Prose>
    </>
  );
}
