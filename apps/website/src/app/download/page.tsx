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
              post a download link until a build has passed testing.
            </Notice>
            <ButtonLink href="/#film">Watch the launch film</ButtonLink>
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
            <li>Requires {r.minimumMacOS} or later. Runs on Apple silicon and Intel Macs.</li>
            <li>SHA-256: <code>{r.sha256}</code></li>
            {site.releaseNotarized ? (
              <li>Signed with an Apple Developer ID and notarized by Apple. Notarization is Apple&apos;s automated malware check. It isn&apos;t an Apple endorsement.</li>
            ) : (
              <li>
                Signed with PlainClick&apos;s own certificate, but <strong>not notarized by Apple</strong>. Apple charges
                developers a yearly fee for notarization, and we haven&apos;t paid it yet. That&apos;s why macOS asks you to
                confirm it, below. It doesn&apos;t mean Apple checked and rejected the app.
              </li>
            )}
          </ul>

          <h2>Install</h2>
          <ol>
            <li>Open the downloaded <code>PlainClick.zip</code>. Your Mac unzips it into <strong>PlainClick</strong>.</li>
            <li>Drag PlainClick into your <strong>Applications</strong> folder.</li>
            <li>Open PlainClick from Applications.</li>
          </ol>

          {!site.releaseNotarized && (
            <>
              <h2 id="open-anyway">The first time you open it</h2>
              <p>
                macOS shows a message like &ldquo;Apple could not verify &lsquo;PlainClick&rsquo; is free of malware&rdquo;
                and won&apos;t open it. That&apos;s expected for apps that aren&apos;t notarized. Click <strong>Done</strong>, then:
              </p>
              <ol>
                <li>Open the Apple menu → <strong>System Settings</strong> → <strong>Privacy &amp; Security</strong>.</li>
                <li>Scroll down to <strong>Security</strong>. You&apos;ll see &ldquo;PlainClick was blocked…&rdquo;.</li>
                <li>Click <strong>Open Anyway</strong>, confirm with your password or Touch ID, then click <strong>Open Anyway</strong> again.</li>
              </ol>
              <p>
                You do this the first time, and again after you install an update. It allows <strong>only PlainClick</strong>. Keep Gatekeeper and every other
                security setting switched on. You never need to turn them off for PlainClick. If you&apos;d rather not
                do this, don&apos;t install it.
              </p>
              <p>
                Optional check before opening: in Terminal, run <code>shasum -a 256 ~/Downloads/PlainClick.zip</code> and
                compare the result with the SHA-256 above.
              </p>
            </>
          )}

          <h2>Then</h2>
          <ol>
            <li>PlainClick appears in the menu bar.</li>
            <li>Turn on app control when you&apos;re ready, and allow Accessibility access when macOS asks.</li>
            <li>Press ⌃⌥P (Control-Option-P) to show or hide the panel.</li>
          </ol>
          <p>
            Older versions and release notes are on the <a href={site.releasesUrl}>releases page</a>.
          </p>
        </Prose>
      )}
    </>
  );
}
