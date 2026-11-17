/**
 * Single source of truth for the public compatibility page. Mirror of docs/compatibility.md.
 * ONLY change a status to "verified" with a real macOS build + app version from a recorded test run.
 */
export type Status = "candidate" | "verified" | "limited" | "dropped";

export interface CompatRow {
  app: string;
  action: string;
  status: Status;
  macOS?: string;
  appVersion?: string;
  note?: string;
}

export const compatibility: CompatRow[] = [
  { app: "Safari", action: "Back", status: "candidate" },
  { app: "Safari", action: "Forward", status: "candidate" },
  { app: "Safari", action: "Reload", status: "candidate" },
  { app: "Safari", action: "New Tab", status: "candidate" },
  { app: "Finder", action: "Back", status: "candidate" },
  { app: "Finder", action: "Forward", status: "candidate" },
  { app: "Finder", action: "New Folder", status: "candidate" },
  { app: "TextEdit", action: "Save", status: "candidate" },
  { app: "TextEdit", action: "Find", status: "candidate" },
];

export const anyVerified = compatibility.some((r) => r.status === "verified" || r.status === "limited");

export const statusLabel: Record<Status, string> = {
  candidate: "Being tested",
  verified: "Verified",
  limited: "Works with limits",
  dropped: "Not supported",
};
