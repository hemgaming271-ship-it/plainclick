"use client";

import { useEffect, useState } from "react";

/**
 * Dodo appends payment_id, status, email and license_key to the return URL. Show the key once for convenience, then
 * remove all of it from the address bar so it isn't left in history or shared by accident. Nothing is sent anywhere.
 */
export function LicenceFromReturn() {
  const [info, setInfo] = useState<{ key?: string; status?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const key = p.get("license_key") ?? undefined;
    const status = p.get("status") ?? undefined;
    if (key || status) {
      setInfo({ key: key?.split(",")[0]?.trim() || undefined, status });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!info) return null;
  if (info.status && info.status !== "succeeded") {
    return (
      <p role="alert">
        The payment status is <strong>{info.status}</strong>. If it didn&apos;t go through, nothing was charged and no
        key will be sent.
      </p>
    );
  }
  if (!info.key) return null;
  return (
    <div className="my-6 rounded-lg border-2 border-line bg-surface p-4">
      <p className="font-semibold">Your licence key</p>
      <p className="mt-2 break-all font-mono text-lg" aria-label="Licence key">{info.key}</p>
      <button
        type="button"
        className="mt-3 min-h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(info.key!);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy key"}
      </button>
      <p className="mt-2 text-sm text-muted">It&apos;s also in your purchase email. Keep it private.</p>
    </div>
  );
}
