import Link from "next/link";
import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";
import { RecoverConfirm } from "./RecoverConfirm";

export const metadata = { title: "Your licence", robots: { index: false } };

export default function Page() {
  return (
    <>
      <PageHeader title="Your licence" />
      <Prose>
        {site.mode === "server" ? (
          <RecoverConfirm />
        ) : (
          <p>
            Licence recovery links aren&apos;t used any more. See <Link href="/recover">Find your licence key</Link>.
          </p>
        )}
      </Prose>
    </>
  );
}
