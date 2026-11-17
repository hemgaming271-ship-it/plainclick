import { PageHeader, Prose } from "@/components/ui";
import { RecoverConfirm } from "./RecoverConfirm";

export const metadata = { title: "Your licence", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PageHeader title="Your licence" />
      <Prose>
        <RecoverConfirm />
      </Prose>
    </>
  );
}
