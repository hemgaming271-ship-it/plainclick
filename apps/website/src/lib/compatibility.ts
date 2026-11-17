/**
 * Single source of truth for the public compatibility page. Mirror of docs/compatibility.md.
 * "automated" = passed the automated feasibility suite on GitHub-hosted macOS VMs with the real Apple apps.
 * "verified"  = additionally confirmed by hand on a physical Mac. Never promote a row without a recorded run.
 */
export type Status = "candidate" | "automated" | "verified" | "limited" | "dropped";

export interface CompatRow {
  app: string;
  action: string;
  status: Status;
  macOS?: string;
  appVersion?: string;
  note?: string;
}

const tested = "15.8.2 (24H232), 26.7.2 (25G332)";
const backForwardNote =
  "macOS doesn't reliably report whether Back/Forward is available until the menu is opened, and pressing it was unreliable in tests.";

export const compatibility: CompatRow[] = [
  { app: "TextEdit", action: "Save", status: "automated", macOS: tested, appVersion: "1.20" },
  { app: "TextEdit", action: "Find", status: "automated", macOS: tested, appVersion: "1.20" },
  { app: "Finder", action: "New Folder", status: "automated", macOS: tested, appVersion: "15.5 / 26.4" },
  { app: "Safari", action: "Reload", status: "automated", macOS: tested, appVersion: "27.2" },
  { app: "Safari", action: "New Tab", status: "automated", macOS: tested, appVersion: "27.2" },
  { app: "Safari", action: "Back", status: "dropped", macOS: tested, appVersion: "27.2", note: backForwardNote },
  { app: "Safari", action: "Forward", status: "dropped", macOS: tested, appVersion: "27.2", note: backForwardNote },
  { app: "Finder", action: "Back", status: "dropped", macOS: tested, appVersion: "15.5 / 26.4", note: backForwardNote },
  { app: "Finder", action: "Forward", status: "dropped", macOS: tested, appVersion: "15.5 / 26.4", note: backForwardNote },
];

export const anyVerified = compatibility.some((r) => r.status === "verified" || r.status === "limited");
export const anyAutomated = compatibility.some((r) => r.status === "automated");

export const statusLabel: Record<Status, string> = {
  candidate: "Being tested",
  automated: "Passed automated tests",
  verified: "Verified on a Mac",
  limited: "Works with limits",
  dropped: "Not supported",
};
