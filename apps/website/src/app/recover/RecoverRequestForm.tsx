"use client";

import { useState, type FormEvent } from "react";

export function RecoverRequestForm() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const email = new FormData(e.currentTarget).get("email");
    const res = await fetch("/api/licences/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setMsg(data?.message ?? "Please enter a valid email address and try again.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="not-prose max-w-md space-y-3">
      <label htmlFor="rec-email" className="block font-semibold">Purchase email</label>
      <input id="rec-email" name="email" type="email" required autoComplete="email"
        className="min-h-11 w-full rounded-md border-2 border-line bg-surface px-3 text-base text-ink" />
      <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60">
        {busy ? "Sending…" : "Send recovery link"}
      </button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
