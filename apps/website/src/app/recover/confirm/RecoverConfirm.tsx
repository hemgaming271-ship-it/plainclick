"use client";

import { useEffect, useState } from "react";

type Result = {
  status: "ok";
  reset: boolean;
  licences: { key: string; state: string; activations: { deviceLabel: string | null; activatedAt: string }[] }[];
};

/**
 * The token is in the URL fragment (#token=...), which browsers never send to servers, so it doesn't appear in
 * access logs, and link scanners that only GET the page can't use it up. It is consumed only by the button POST.
 */
export function RecoverConfirm() {
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.slice(1)).get("token");
    setToken(t);
    if (t) history.replaceState(null, "", window.location.pathname);
  }, []);

  async function go(resetActivations: boolean) {
    if (!token) return;
    setBusy(true);
    const res = await fetch("/api/licences/recover/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, resetActivations }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.status === "ok") setResult(data);
    else setError(data?.message ?? "Something went wrong. Please request a new link.");
    setBusy(false);
  }

  if (result)
    return (
      <div>
        {result.reset && <p role="status"><strong>Your activations were reset.</strong> You can now activate on any two Macs you own.</p>}
        {result.licences.map((l) => (
          <div key={l.key} className="mb-6 rounded-md border border-line bg-surface p-4">
            <p className="text-sm text-muted">Licence key{l.state !== "active" ? ` (${l.state})` : ""}</p>
            <p className="font-mono text-lg break-all">{l.key}</p>
            <p className="mt-2 text-sm">Active Macs: {l.activations.length === 0 ? "none" : l.activations.map((a) => a.deviceLabel ?? "Unnamed Mac").join(", ")}</p>
          </div>
        ))}
        <p>This link has now been used. Save your key somewhere safe.</p>
      </div>
    );

  if (token === null) return <p>Loading…</p>;
  if (!token || error) return <p role="alert">{error || "This page needs the link from your recovery email."} <a href="/recover">Request a new link</a>.</p>;

  return (
    <div>
      <p>This link works once. Choose what you need:</p>
      <div className="not-prose flex flex-col gap-3 sm:flex-row">
        <button disabled={busy} onClick={() => go(false)} className="min-h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60">
          Show my licence key
        </button>
        <button disabled={busy} onClick={() => go(true)} className="min-h-11 rounded-md border-2 border-ink/80 px-5 font-semibold disabled:opacity-60">
          Show key and reset all my Macs
        </button>
      </div>
      <p className="mt-4 text-sm text-muted">
        Resetting signs PlainClick out on every Mac where it&apos;s activated. Use it if a Mac was lost, sold or broken.
        Your other Macs can activate again with the same key.
      </p>
    </div>
  );
}
