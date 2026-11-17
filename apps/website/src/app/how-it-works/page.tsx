import { PageHeader, Prose } from "@/components/ui";

export const metadata = { title: "How it works" };

export default function Page() {
  return (
    <>
      <PageHeader title="How it works" intro="A separate panel that runs a supported app's own commands. Nothing about the app itself changes." />
      <Prose>
        <h2>The short version</h2>
        <ol>
          <li>Open a supported app, for example Safari.</li>
          <li>Press your PlainClick shortcut (⌃⌥P by default).</li>
          <li>A small panel appears, naming the app it will control and showing clearly labelled buttons.</li>
          <li>Click a button. PlainClick asks that app to run the matching command from its own menu bar.</li>
        </ol>

        <h2>What&apos;s happening underneath</h2>
        <p>
          PlainClick uses the macOS Accessibility interface, the same documented system that assistive tools use. It
          finds the app&apos;s own menu command and checks whether the app says the command is enabled. Then it asks
          the app to perform it. It does not move your mouse, type keystrokes, inject code, or change system files. It
          doesn&apos;t need administrator access.
        </p>
        <p>
          Before every click, PlainClick checks that the app shown in the panel is still the app in front. If you&apos;ve
          switched apps, nothing is sent.
        </p>

        <h2>What it can&apos;t do</h2>
        <ul>
          <li>Change, shrink, hide, or restyle any app&apos;s own toolbar or buttons.</li>
          <li>Remove transparency or &ldquo;glass&rdquo; effects anywhere in macOS.</li>
          <li>Work with apps we haven&apos;t tested. Other apps get an honest &ldquo;not supported&rdquo; message.</li>
          <li>Reclaim screen space. The panel is an extra window, so you can move it or hide it.</li>
        </ul>

        <h2>Permission</h2>
        <p>
          To press commands in other apps, macOS requires you to allow PlainClick under System Settings → Privacy &amp;
          Security → Accessibility. PlainClick asks only when you turn on app control. It explains why first, and you
          can turn the permission off there at any time. PlainClick doesn&apos;t ask for Screen Recording or Full Disk
          Access.
        </p>

        <h2>Free alternatives worth trying first</h2>
        <p>
          macOS includes <strong>Reduce transparency</strong> and <strong>Increase contrast</strong> under System
          Settings → Accessibility → Display. They&apos;re free, built in, and change the look of the whole system. See
          our <a href="/help#appearance">appearance guide</a>.
        </p>
      </Prose>
    </>
  );
}
