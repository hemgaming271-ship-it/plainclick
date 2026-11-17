import { CompatTable } from "@/components/CompatTable";
import { Container, Notice, PageHeader, Prose } from "@/components/ui";
import { anyVerified } from "@/lib/compatibility";

export const metadata = { title: "Compatibility" };

export default function Page() {
  return (
    <>
      <PageHeader title="Compatibility" intro="Only combinations that passed testing on a stated macOS version are marked Verified." />
      <Container className="pt-10">
        {!anyVerified && (
          <div className="mb-6">
            <Notice>
              <strong>Nothing is verified yet.</strong> PlainClick is pre-release. The rows below are the first actions
              being tested, not a promise that they will work.
            </Notice>
          </div>
        )}
        <CompatTable />
      </Container>
      <Prose>
        <h2>What the statuses mean</h2>
        <ul>
          <li><strong>Verified</strong>: passed repeated tests, including app and window switching, on the listed macOS and app versions.</li>
          <li><strong>Works with limits</strong>: works, with a caveat listed next to it.</li>
          <li><strong>Being tested</strong>: a candidate. Not yet confirmed.</li>
          <li><strong>Not supported</strong>: tried and dropped because it wasn&apos;t reliable.</li>
        </ul>
        <h2>Known limitations</h2>
        <ul>
          <li>If you change a command&apos;s keyboard shortcut in System Settings → Keyboard → Keyboard Shortcuts, PlainClick may stop finding that command.</li>
          <li>Apps can change their menus in updates. We re-test after major macOS and app releases, but there may be a delay.</li>
          <li>Tested UI languages will be listed here. Until then, assume English only.</li>
          <li>PlainClick never changes the app&apos;s own toolbar.</li>
        </ul>
      </Prose>
    </>
  );
}
