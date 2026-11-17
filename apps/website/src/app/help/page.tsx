import { PageHeader, Prose } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata = { title: "Help & FAQ" };

export default function Page() {
  return (
    <>
      <PageHeader title="Help & FAQ" />
      <Prose>
        <h2 id="appearance">Free guide: make macOS easier to read</h2>
        <p>
          These are Apple&apos;s own settings. They&apos;re free, they need nothing from PlainClick, and they apply to the{" "}
          <strong>whole system</strong>, not to one app.
        </p>
        <ol>
          <li>Open the Apple menu (top-left corner) →<strong>System Settings</strong>.</li>
          <li>Choose <strong>Accessibility</strong> in the sidebar, then <strong>Display</strong>.</li>
          <li>Turn on <strong>Reduce transparency</strong> to replace translucent backgrounds with solid ones.</li>
          <li>Turn on <strong>Increase contrast</strong> to make borders and controls stand out more.</li>
        </ol>
        <p>
          Wording and placement can vary between macOS versions. If you can&apos;t find a setting, type its name into the
          search field at the top of System Settings. To undo, switch the same settings off.
        </p>

        <h2>Frequently asked questions</h2>
        <h3>Does PlainClick change how my apps look?</h3>
        <p>No. It adds a separate panel. The app&apos;s toolbar and buttons stay exactly as they are.</p>
        <h3>Which apps work?</h3>
        <p>Only the combinations on the <a href="/compatibility">compatibility page</a>. Other apps show a &ldquo;not supported&rdquo; message.</p>
        <h3>Why does it need Accessibility access?</h3>
        <p>
          macOS only lets one app press another app&apos;s commands with this permission. PlainClick uses it to find and
          press the supported menu commands, on your Mac only. To turn it off, go to System Settings → Privacy &amp;
          Security → Accessibility.
        </p>
        <h3>Does it send anything about what I&apos;m doing to you?</h3>
        <p>
          No. Screen contents, window and document names, document text and browsing history never leave your Mac.
          Licensing uses a small amount of data, described in the <a href="/privacy">privacy policy</a>.
        </p>
        <h3>A button is greyed out.</h3>
        <p>The app reports that command as unavailable right now. For example, Back is greyed out when there&apos;s no page to go back to.</p>
        <h3>How do I move my licence to a new Mac?</h3>
        <p>
          On the old Mac, open PlainClick → Manage Licence → Deactivate this Mac, then activate on the new one. If the
          old Mac is lost or broken, use <a href="/recover">licence recovery</a> and choose to reset your activations.
        </p>
        <h3>How is the trial limited?</h3>
        <p>
          The 7-day trial is tracked on your Mac. It isn&apos;t tamper-proof, and we chose not to add invasive copy
          protection. If PlainClick is useful to you, please buy a licence.
        </p>
        <h3>How do I uninstall?</h3>
        <ol>
          <li>Choose Quit from the PlainClick menu-bar icon.</li>
          <li>Move PlainClick from Applications to the Bin.</li>
          <li>Remove PlainClick from System Settings → Privacy &amp; Security → Accessibility.</li>
          <li>Optionally delete <code>~/Library/Preferences/</code> files whose names start with the PlainClick bundle identifier.</li>
        </ol>
        <h3>Still stuck?</h3>
        <p>Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. Include your macOS version and the app you were using, but never your licence key.</p>
      </Prose>
    </>
  );
}
