import { ButtonLink, Container, Notice, PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Download" };

export default function Page() {
  const r = site.release;
  const ready = site.releaseAvailable && r.downloadUrl && r.version && r.sha256;
  return (
    <>
      <PageHeader title="Download" />
      {!ready ? (
        <Container className="py-10">
          <div className="max-w-2xl space-y-4">
            <Notice>
              <strong>There is no public download yet.</strong> PlainClick is still being built and tested. We won&apos;t
              post a download link until a signed, notarized build has passed testing on a clean Mac.
            </Notice>
            <ButtonLink href="/#beta">Join the beta</ButtonLink>
          </div>
        </Container>
      ) : (
        <Prose>
          <p>
            <a href={r.downloadUrl} className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-ink no-underline">
              Download PlainClick {r.version}
            </a>
          </p>
          <ul>
            <li>Requires {r.minimumMacOS} or later.</li>
            <li>SHA-256: <code>{r.sha256}</code></li>
            <li>Signed with an Apple Developer ID and notarized by Apple. Notarization is Apple&apos;s automated malware check. It isn&apos;t an Apple endorsement.</li>
          </ul>
          <h2>Install</h2>
          <ol>
            <li>Open the downloaded disk image and drag PlainClick to Applications.</li>
            <li>Open PlainClick from Applications. It appears in the menu bar.</li>
            <li>Turn on app control when you&apos;re ready, and allow Accessibility access when macOS asks.</li>
          </ol>
          <p>You never need to turn off Gatekeeper or any other macOS security setting to install PlainClick.</p>
        </Prose>
      )}
    </>
  );
}
