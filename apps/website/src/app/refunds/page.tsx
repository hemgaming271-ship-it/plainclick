import { DraftLegalNotice, PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Refund policy" };

export default function Page() {
  return (
    <>
      <PageHeader title="Refund policy" />
      <Prose>
        <DraftLegalNotice />
        <ul>
          <li>If PlainClick isn&apos;t right for you, ask for a refund within <strong>14 days</strong> of purchase. You don&apos;t need to give a reason.</li>
          <li>Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> with your order ID, or use the refund link in your receipt from our payment provider.</li>
          <li>Refunds go back to the original payment method. How long that takes depends on your bank.</li>
          <li>A refund revokes the licence. A Mac that stays offline may keep working until it next checks in.</li>
          <li>This policy is in addition to your rights under consumer law. It doesn&apos;t replace or limit them, and our payment provider&apos;s own refund terms may also apply.</li>
        </ul>
      </Prose>
    </>
  );
}
