import { PageHeader, Prose } from "@/components/ui";

export const metadata = { title: "Changelog" };

export default function Page() {
  return (
    <>
      <PageHeader title="Changelog" />
      <Prose>
        <h2>Unreleased</h2>
        <p>No public version has been released yet. Each release will be listed here with its version, date, SHA-256 checksum, and the macOS versions it was tested on.</p>
      </Prose>
    </>
  );
}
