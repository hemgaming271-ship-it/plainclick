import { PageHeader, Prose } from "@/components/ui";

export const metadata = { title: "Changelog" };

export default function Page() {
  return (
    <>
      <PageHeader title="Changelog" />
      <Prose>
        <h2>Unreleased</h2>
        <p>No public version has been released yet. Each release will be listed here with its version, date, SHA-256 checksum, and the macOS versions it was tested on.</p>
        <p>In the pre-release build so far:</p>
        <ul>
          <li>Quick keys: Control-Option-1 to 9 press the panel&apos;s actions in order, with the same safety checks as clicking. You can turn them off in Settings → General.</li>
          <li>Launch at login, from the menu-bar menu or Settings → General.</li>
          <li>A redesigned panel showing the target app&apos;s icon, a ready indicator, and shortcut hints. Status messages now clear after a few seconds, and you can drag the panel by its background.</li>
          <li>Reordering actions in Settings → Apps now updates the open panel straight away.</li>
          <li>Installing an update no longer makes macOS ask for your login password before PlainClick can read its licence.</li>
          <li>Settings → General now shows the app version.</li>
          <li>New: PlainClick › Check for Updates… installs new versions in place. Each update is signature-checked, and macOS doesn&apos;t ask you to approve it again with Open Anyway.</li>
          <li>The local trial log can no longer be read as spreadsheet formulas.</li>
        </ul>
      </Prose>
    </>
  );
}
